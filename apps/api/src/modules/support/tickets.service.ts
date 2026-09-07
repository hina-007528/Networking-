import { Injectable, Logger } from '@nestjs/common';
import { TicketAuthorType, TicketStatus, type Prisma } from '@prisma/client';
import type {
  Paginated,
  SupportCategoryDto,
  TicketAttachmentDto,
  TicketDto,
  TicketMessageDto,
  TicketStatusHistoryDto,
} from '@stormfiber/types';
import { NotificationChannel, NotificationEvent } from '@stormfiber/types';
import type {
  createTicketMessageSchema,
  createTicketSchema,
  customerTicketQuerySchema,
  ticketListQuerySchema,
  updateTicketSchema,
} from '@stormfiber/validation';
import type { z } from 'zod';
import { AuditAction, AuditService } from '../../common/audit/audit.service';
import { CacheKeys, CacheService } from '../../common/cache/cache.service';
import type { RequestContext } from '../../common/decorators/auth.decorators';
import { AppException } from '../../common/errors/app.exception';
import { PrismaService } from '../../common/prisma/prisma.service';
import { buildPaginationMeta, toPrismaPagination } from '../../common/utils/pagination';
import { ticketReference } from '../../common/utils/references';
import { FilesService } from '../storage/files.service';
import { NotificationsService } from '../notifications/notifications.service';

export type CreateTicketPayload = z.output<typeof createTicketSchema>;
export type CreateTicketMessagePayload = z.output<typeof createTicketMessageSchema>;
export type CustomerTicketQuery = z.output<typeof customerTicketQuerySchema>;
export type AdminTicketListQuery = z.output<typeof ticketListQuerySchema>;
export type UpdateTicketPayload = z.output<typeof updateTicketSchema>;

const ticketInclude = {
  category: { select: { name: true } },
  customer: { select: { firstName: true, lastName: true, userId: true } },
  assignedTo: { select: { firstName: true, lastName: true } },
  messages: {
    orderBy: { createdAt: 'asc' },
    include: {
      attachments: { include: { media: true } },
    },
  },
  attachments: { include: { media: true } },
  statusHistory: {
    orderBy: { createdAt: 'asc' },
    include: { changedBy: { select: { firstName: true, lastName: true } } },
  },
} satisfies Prisma.TicketInclude;

type TicketRow = Prisma.TicketGetPayload<{ include: typeof ticketInclude }>;

const CATEGORY_TTL_SECONDS = 600;

/**
 * Customer-facing tickets.
 *
 * Ownership is always taken from the access token. Internal notes are stripped before a customer
 * sees the thread, and a customer reply cannot be flagged as internal even if the client tries.
 */
@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly files: FilesService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    private readonly cache: CacheService,
  ) {}

  listCategories(): Promise<SupportCategoryDto[]> {
    return this.cache.remember(CacheKeys.supportCategories, CATEGORY_TTL_SECONDS, async () => {
      const rows = await this.prisma.supportCategory.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' },
      });

      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        iconKey: row.iconKey,
        displayOrder: row.displayOrder,
      }));
    });
  }

  async create(
    customerId: string,
    userId: string,
    authorName: string,
    input: CreateTicketPayload,
    context: RequestContext,
  ): Promise<TicketDto> {
    const category = await this.prisma.supportCategory.findFirst({
      where: { id: input.categoryId, isActive: true },
      select: { id: true, name: true },
    });

    if (!category) {
      throw AppException.notFound('Support category');
    }

    await this.files.readOwned(input.attachmentIds, userId);

    const created = await this.prisma.$transaction(async (tx) => {
      const ticket = await tx.ticket.create({
        data: {
          reference: ticketReference(),
          subject: input.subject,
          description: input.description,
          priority: input.priority,
          categoryId: category.id,
          customerId,
          messages: {
            create: {
              body: input.description,
              authorId: userId,
              authorName,
              authorType: TicketAuthorType.CUSTOMER,
              isInternal: false,
            },
          },
          statusHistory: {
            create: {
              fromStatus: null,
              toStatus: TicketStatus.OPEN,
              changedById: userId,
              note: 'Ticket opened',
            },
          },
        },
      });

      if (input.attachmentIds.length > 0) {
        await tx.ticketAttachment.createMany({
          data: input.attachmentIds.map((mediaId) => ({
            ticketId: ticket.id,
            mediaId,
          })),
        });
      }

      return ticket;
    });

    await this.audit.record({
      userId,
      action: AuditAction.TICKET_STATUS_CHANGED,
      entity: 'Ticket',
      entityId: created.id,
      newValue: { reference: created.reference, status: TicketStatus.OPEN, subject: created.subject },
      context,
    });

    const full = await this.loadOwned(created.id, customerId);
    await this.notify(full, NotificationEvent.TICKET_CREATED);
    this.logger.log(`Ticket ${full.reference} opened by customer ${customerId}`);
    return this.toDto(full, false);
  }

  async listForCustomer(
    customerId: string,
    query: CustomerTicketQuery,
  ): Promise<Paginated<TicketDto>> {
    const { skip, take } = toPrismaPagination(query);
    const where: Prisma.TicketWhereInput = {
      customerId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        include: ticketInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toDto(row, false)),
      pagination: buildPaginationMeta(query, total),
    };
  }

  async findForCustomer(ticketId: string, customerId: string): Promise<TicketDto> {
    const row = await this.loadOwned(ticketId, customerId);
    return this.toDto(row, false);
  }

  async listForAdmin(query: AdminTicketListQuery): Promise<Paginated<TicketDto>> {
    const { skip, take } = toPrismaPagination(query);
    const search = query.search?.trim();
    const where: Prisma.TicketWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.assignedToId ? { assignedToId: query.assignedToId } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(search
        ? {
            OR: [
              { reference: { contains: search, mode: 'insensitive' } },
              { subject: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        include: ticketInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toDto(row, true)),
      pagination: buildPaginationMeta(query, total),
    };
  }

  async findForAdmin(ticketId: string): Promise<TicketDto> {
    const row = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: ticketInclude,
    });

    if (!row) {
      throw AppException.notFound('Ticket');
    }

    return this.toDto(row, true);
  }

  async updateForAdmin(
    ticketId: string,
    input: UpdateTicketPayload,
    actorId: string,
    context: RequestContext,
  ): Promise<TicketDto> {
    const current = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, status: true, assignedToId: true, firstResponseAt: true },
    });

    if (!current) {
      throw AppException.notFound('Ticket');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.ticket.update({
        where: { id: ticketId },
        data: {
          ...(input.status ? { status: input.status } : {}),
          ...(input.priority ? { priority: input.priority } : {}),
          ...(input.assignedToId !== undefined ? { assignedToId: input.assignedToId } : {}),
          ...(input.status === TicketStatus.RESOLVED ? { resolvedAt: new Date() } : {}),
          ...(input.status === TicketStatus.CLOSED ? { closedAt: new Date() } : {}),
          ...(!current.firstResponseAt && input.status && input.status !== TicketStatus.OPEN
            ? { firstResponseAt: new Date() }
            : {}),
        },
      });

      if (input.status && input.status !== current.status) {
        await tx.ticketStatusHistory.create({
          data: {
            ticketId,
            fromStatus: current.status,
            toStatus: input.status,
            changedById: actorId,
            note: input.note ?? null,
          },
        });
      }
    });

    await this.audit.record({
      userId: actorId,
      action:
        input.assignedToId !== undefined && input.assignedToId !== current.assignedToId
          ? AuditAction.TICKET_ASSIGNED
          : AuditAction.TICKET_STATUS_CHANGED,
      entity: 'Ticket',
      entityId: ticketId,
      oldValue: { status: current.status, assignedToId: current.assignedToId },
      newValue: input,
      context,
    });

    return this.findForAdmin(ticketId);
  }

  async addMessage(
    ticketId: string,
    customerId: string,
    userId: string,
    authorName: string,
    input: CreateTicketMessagePayload,
  ): Promise<TicketDto> {
    const ticket = await this.loadOwned(ticketId, customerId);

    if (ticket.status === TicketStatus.CLOSED) {
      throw AppException.conflict('This ticket is closed');
    }

    await this.files.readOwned(input.attachmentIds, userId);

    const nextStatus =
      ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.WAITING_FOR_CUSTOMER
        ? TicketStatus.OPEN
        : ticket.status;

    await this.prisma.$transaction(async (tx) => {
      const message = await tx.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          body: input.body,
          authorId: userId,
          authorName,
          authorType: TicketAuthorType.CUSTOMER,
          isInternal: false,
        },
      });

      if (input.attachmentIds.length > 0) {
        await tx.ticketAttachment.createMany({
          data: input.attachmentIds.map((mediaId) => ({
            ticketId: ticket.id,
            messageId: message.id,
            mediaId,
          })),
        });
      }

      if (nextStatus !== ticket.status) {
        await tx.ticket.update({
          where: { id: ticket.id },
          data: { status: nextStatus, resolvedAt: null, closedAt: null },
        });
        await tx.ticketStatusHistory.create({
          data: {
            ticketId: ticket.id,
            fromStatus: ticket.status,
            toStatus: nextStatus,
            changedById: userId,
            note: 'Customer replied',
          },
        });
      }
    });

    const full = await this.loadOwned(ticketId, customerId);
    if (nextStatus !== ticket.status) {
      await this.notify(full, NotificationEvent.TICKET_UPDATED);
    }
    return this.toDto(full, false);
  }

  private async loadOwned(ticketId: string, customerId: string): Promise<TicketRow> {
    const row = await this.prisma.ticket.findFirst({
      where: { id: ticketId, customerId },
      include: ticketInclude,
    });

    if (!row) {
      throw AppException.notFound('Ticket');
    }

    return row;
  }

  private async notify(ticket: TicketRow, event: string): Promise<void> {
    await this.notifications.dispatch({
      userId: ticket.customer.userId,
      event,
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      data: {
        firstName: ticket.customer.firstName,
        ticketNumber: ticket.reference,
        ticketSubject: ticket.subject,
        ticketStatus: ticket.status,
        href: `/dashboard/tickets/${ticket.id}`,
      },
    });
  }

  private toDto(row: TicketRow, includeInternal: boolean): TicketDto {
    const messages = includeInternal
      ? row.messages
      : row.messages.filter((message) => !message.isInternal);

    return {
      id: row.id,
      reference: row.reference,
      subject: row.subject,
      description: row.description,
      status: row.status,
      priority: row.priority,
      categoryId: row.categoryId,
      categoryName: row.category?.name ?? null,
      customerId: row.customerId,
      customerName: `${row.customer.firstName} ${row.customer.lastName}`,
      assignedToId: row.assignedToId,
      assignedToName: row.assignedTo
        ? `${row.assignedTo.firstName} ${row.assignedTo.lastName}`
        : null,
      firstResponseAt: row.firstResponseAt?.toISOString() ?? null,
      resolvedAt: row.resolvedAt?.toISOString() ?? null,
      closedAt: row.closedAt?.toISOString() ?? null,
      messages: messages.map((message) => this.toMessageDto(message)),
      attachments: row.attachments.map((attachment) => this.toAttachmentDto(attachment)),
      statusHistory: row.statusHistory.map((entry) => this.toHistoryDto(entry)),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toMessageDto(
    message: TicketRow['messages'][number],
  ): TicketMessageDto {
    return {
      id: message.id,
      ticketId: message.ticketId,
      body: message.body,
      authorId: message.authorId,
      authorName: message.authorName,
      authorType: message.authorType,
      isInternal: message.isInternal,
      attachments: message.attachments.map((attachment) => this.toAttachmentDto(attachment)),
      createdAt: message.createdAt.toISOString(),
    };
  }

  private toAttachmentDto(
    attachment: TicketRow['attachments'][number],
  ): TicketAttachmentDto {
    return {
      id: attachment.id,
      fileName: attachment.media.fileName,
      mimeType: attachment.media.mimeType,
      sizeBytes: attachment.media.sizeBytes,
      url: this.files.urlFor(attachment.media.id),
      createdAt: attachment.createdAt.toISOString(),
    };
  }

  private toHistoryDto(entry: TicketRow['statusHistory'][number]): TicketStatusHistoryDto {
    return {
      id: entry.id,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      changedById: entry.changedById,
      changedByName: entry.changedBy
        ? `${entry.changedBy.firstName} ${entry.changedBy.lastName}`
        : null,
      note: entry.note,
      createdAt: entry.createdAt.toISOString(),
    };
  }
}
