import { Injectable, Logger } from '@nestjs/common';
import { CallbackStatus, type Prisma } from '@prisma/client';
import type { CallbackRequestDto, Paginated } from '@stormfiber/types';
import { AnalyticsEventName } from '@stormfiber/types';
import type {
  adminCallbackListQuerySchema,
  callbackRequestSchema,
  updateCallbackSchema,
} from '@stormfiber/validation';
import type { z } from 'zod';
import type { RequestContext } from '../../common/decorators/auth.decorators';
import { AppException } from '../../common/errors/app.exception';
import { PrismaService } from '../../common/prisma/prisma.service';
import { buildPaginationMeta, toPrismaPagination } from '../../common/utils/pagination';
import { callbackReference } from '../../common/utils/references';
import { AnalyticsService } from '../analytics/analytics.service';

export type CallbackPayload = z.output<typeof callbackRequestSchema>;
export type AdminCallbackListQuery = z.output<typeof adminCallbackListQuerySchema>;
export type UpdateCallbackPayload = z.output<typeof updateCallbackSchema>;

const callbackInclude = {
  city: { select: { name: true } },
  area: { select: { name: true } },
  assignedTo: { select: { firstName: true, lastName: true } },
} satisfies Prisma.CallbackRequestInclude;

/**
 * Public callback / contact requests.
 *
 * Anyone can submit one; assignment and status changes live in the admin module. The public
 * response never includes the internal note.
 */
@Injectable()
export class CallbacksService {
  private readonly logger = new Logger(CallbacksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly analytics: AnalyticsService,
  ) {}

  async create(input: CallbackPayload, context: RequestContext): Promise<CallbackRequestDto> {
    if (input.cityId) {
      const city = await this.prisma.city.findFirst({
        where: { id: input.cityId, isActive: true },
        select: { id: true },
      });
      if (!city) {
        throw AppException.notFound('City');
      }
    }

    if (input.areaId) {
      const area = await this.prisma.area.findFirst({
        where: { id: input.areaId, isActive: true, ...(input.cityId ? { cityId: input.cityId } : {}) },
        select: { id: true },
      });
      if (!area) {
        throw AppException.notFound('Area');
      }
    }

    const created = await this.prisma.callbackRequest.create({
      data: {
        reference: callbackReference(),
        name: input.name,
        phone: input.phone,
        email: input.email ?? null,
        cityId: input.cityId ?? null,
        areaId: input.areaId ?? null,
        preferredTime: input.preferredTime ?? null,
        subject: input.subject,
        message: input.message ?? null,
        ipAddress: context.ipAddress,
      },
      include: {
        city: { select: { name: true } },
        area: { select: { name: true } },
        assignedTo: { select: { firstName: true, lastName: true } },
      },
    });

    await this.analytics.record({
      name: AnalyticsEventName.CALLBACK_REQUESTED,
      cityId: created.cityId ?? undefined,
      properties: { reference: created.reference },
      context,
    });

    this.logger.log(`Callback ${created.reference} received`);
    return this.toDto(created);
  }

  async list(query: AdminCallbackListQuery): Promise<Paginated<CallbackRequestDto>> {
    const { skip, take } = toPrismaPagination(query);
    const search = query.search?.trim();
    const where: Prisma.CallbackRequestWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(search
        ? {
            OR: [
              { reference: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search } },
              { subject: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.callbackRequest.findMany({
        where,
        include: callbackInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.callbackRequest.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toDto(row)),
      pagination: buildPaginationMeta(query, total),
    };
  }

  async findById(id: string): Promise<CallbackRequestDto> {
    const row = await this.prisma.callbackRequest.findUnique({
      where: { id },
      include: callbackInclude,
    });

    if (!row) {
      throw AppException.notFound('Callback request');
    }

    return this.toDto(row);
  }

  async update(
    id: string,
    input: UpdateCallbackPayload,
    actorId: string,
  ): Promise<CallbackRequestDto> {
    const current = await this.prisma.callbackRequest.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!current) {
      throw AppException.notFound('Callback request');
    }

    const updated = await this.prisma.callbackRequest.update({
      where: { id },
      data: {
        ...(input.status ? { status: input.status } : {}),
        ...(input.assignedToId !== undefined ? { assignedToId: input.assignedToId } : {}),
        ...(input.note !== undefined ? { internalNote: input.note } : {}),
        ...(input.status === CallbackStatus.CONTACTED ? { contactedAt: new Date() } : {}),
        ...(input.status === CallbackStatus.COMPLETED ? { completedAt: new Date() } : {}),
        ...(input.assignedToId === undefined && input.status === CallbackStatus.IN_PROGRESS
          ? { assignedToId: actorId }
          : {}),
      },
      include: callbackInclude,
    });

    return this.toDto(updated);
  }

  toDto(row: {
    id: string;
    reference: string;
    name: string;
    phone: string;
    email: string | null;
    cityId: string | null;
    areaId: string | null;
    preferredTime: string | null;
    subject: string;
    message: string | null;
    status: string;
    assignedToId: string | null;
    createdAt: Date;
    updatedAt: Date;
    city: { name: string } | null;
    area: { name: string } | null;
    assignedTo: { firstName: string; lastName: string } | null;
  }): CallbackRequestDto {
    return {
      id: row.id,
      reference: row.reference,
      name: row.name,
      phone: row.phone,
      email: row.email,
      cityId: row.cityId,
      cityName: row.city?.name ?? null,
      areaId: row.areaId,
      areaName: row.area?.name ?? null,
      preferredTime: row.preferredTime,
      subject: row.subject,
      message: row.message,
      status: row.status,
      assignedToId: row.assignedToId,
      assignedToName: row.assignedTo
        ? `${row.assignedTo.firstName} ${row.assignedTo.lastName}`
        : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
