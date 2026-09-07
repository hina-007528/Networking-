import { Injectable, Logger } from '@nestjs/common';
import { ApplicationStatus, type Prisma } from '@prisma/client';
import { isServiceCity, SERVICE_CITY } from '@stormfiber/config';
import type {
  ApplicationDto,
  ApplicationStatusHistoryDto,
  Paginated,
  PriceQuoteDto,
} from '@stormfiber/types';
import { NotificationChannel, NotificationEvent } from '@stormfiber/types';
import type {
  adminApplicationListQuerySchema,
  createApplicationSchema,
  updateApplicationStatusSchema,
} from '@stormfiber/validation';
import type { z } from 'zod';
import { AuditAction, AuditService } from '../../common/audit/audit.service';
import type { RequestContext } from '../../common/decorators/auth.decorators';
import { AppException } from '../../common/errors/app.exception';
import { PrismaService } from '../../common/prisma/prisma.service';
import { buildOrderBy, buildPaginationMeta, toPrismaPagination } from '../../common/utils/pagination';
import { applicationReference } from '../../common/utils/references';
import { PricingService } from '../catalog/pricing.service';
import { NotificationsService } from '../notifications/notifications.service';
import { OtpService } from '../auth/otp.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { assertTransition } from './application-state-machine';

export type CreateApplicationPayload = z.output<typeof createApplicationSchema>;
export type UpdateApplicationStatusPayload = z.output<typeof updateApplicationStatusSchema>;
export type AdminApplicationListQuery = z.output<typeof adminApplicationListQuerySchema>;

const applicationInclude = {
  city: { select: { name: true } },
  area: { select: { name: true } },
  subArea: { select: { name: true } },
  plan: { select: { name: true } },
  statusHistory: {
    orderBy: { createdAt: 'asc' },
    include: { changedBy: { select: { firstName: true, lastName: true } } },
  },
} satisfies Prisma.ApplicationInclude;

type ApplicationRow = Prisma.ApplicationGetPayload<{ include: typeof applicationInclude }>;

export interface StatusChangeOptions {
  reason?: string;
  scheduledInstallationDate?: string;
  changedById?: string | null;
  context?: RequestContext | null;
}

/**
 * New-connection applications.
 *
 * Two invariants drive the design:
 *
 *   1. The price is recomputed on the server at submission time and frozen onto the row. A quote
 *      that arrives from the browser is ignored entirely.
 *   2. Every status change goes through `changeStatus`, which validates the transition and writes
 *      an `ApplicationStatusHistory` row in the same transaction. There is no code path that can
 *      move an application without leaving a trail.
 */
@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    private readonly otp: OtpService,
    private readonly subscriptions: SubscriptionsService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  async create(input: CreateApplicationPayload, context: RequestContext): Promise<ApplicationDto> {
    // Binds the verification proof to the mobile number being applied for.
    await this.otp.consumeProof(input.verificationToken, input.mobile, 'APPLICATION');

    await this.assertLocationIsServiceable(input);

    // The authoritative quote. Anything the client calculated is discarded.
    const quote = await this.pricing.quote({
      planId: input.planId,
      cityId: input.cityId,
      addonIds: input.addonIds,
      includeInstallation: true,
    });

    const existingCustomer = await this.prisma.customer.findFirst({
      where: { mobile: input.mobile },
      select: { id: true },
    });

    const now = new Date();

    const created = await this.prisma.$transaction(async (tx) => {
      const application = await tx.application.create({
        data: {
          reference: applicationReference(),
          status: ApplicationStatus.SUBMITTED,
          firstName: input.firstName,
          lastName: input.lastName,
          email: input.email,
          mobile: input.mobile,
          cnicLast4: input.cnicLast4 ?? null,
          cityId: input.cityId,
          areaId: input.areaId ?? null,
          subAreaId: input.subAreaId ?? null,
          addressLine: input.addressLine,
          nearestLandmark: input.nearestLandmark ?? null,
          services: input.services,
          planId: input.planId,
          addonIds: input.addonIds,
          quote: quote as unknown as Prisma.InputJsonValue,
          preferredInstallationDate: input.preferredInstallationDate
            ? new Date(input.preferredInstallationDate)
            : null,
          notes: input.notes ?? null,
          termsAcceptedAt: now,
          mobileVerifiedAt: now,
          submittedAt: now,
          customerId: existingCustomer?.id ?? null,
          ipAddress: context.ipAddress,
        },
        select: { id: true, reference: true },
      });

      await tx.applicationStatusHistory.create({
        data: {
          applicationId: application.id,
          fromStatus: null,
          toStatus: ApplicationStatus.SUBMITTED,
          reason: 'Submitted through the website',
        },
      });

      return application;
    });

    this.logger.log(`Application ${created.reference} submitted`);

    await this.notifyApplicant(created.id, NotificationEvent.APPLICATION_SUBMITTED, {
      reference: created.reference,
      firstName: input.firstName,
    });

    await this.audit.record({
      action: AuditAction.APPLICATION_STATUS_CHANGED,
      entity: 'Application',
      entityId: created.id,
      newValue: { status: ApplicationStatus.SUBMITTED, reference: created.reference },
      context,
    });

    return this.findById(created.id);
  }

  /**
   * Refuses an application for an address we cannot serve. Doing this here as well as in the
   * coverage checker means a caller cannot skip the checker and apply anyway.
   */
  private async assertLocationIsServiceable(input: CreateApplicationPayload): Promise<void> {
    const city = await this.prisma.city.findFirst({
      where: { id: input.cityId, deletedAt: null },
      select: { name: true },
    });
    if (!city || !isServiceCity(city.name)) {
      throw AppException.of(
        'OUTSIDE_SERVICE_CITY',
        `New connections are only booked inside ${SERVICE_CITY}.`,
        422,
      );
    }

    const zones = await this.prisma.coverageZone.findMany({
      where: {
        cityId: input.cityId,
        isActive: true,
        OR: [
          ...(input.subAreaId ? [{ subAreaId: input.subAreaId }] : []),
          ...(input.areaId ? [{ areaId: input.areaId, subAreaId: null }] : []),
          { areaId: null, subAreaId: null },
        ],
      },
      select: { status: true, areaId: true, subAreaId: true },
    });

    const mostSpecific =
      zones.find((zone) => zone.subAreaId !== null) ??
      zones.find((zone) => zone.areaId !== null) ??
      zones.find((zone) => zone.areaId === null && zone.subAreaId === null);

    if (!mostSpecific || mostSpecific.status !== 'AVAILABLE') {
      throw AppException.of(
        'COVERAGE_UNAVAILABLE',
        'We are not able to install at this address yet. Register your interest and we will contact you when we are live in your area.',
        409,
      );
    }
  }

  async list(query: AdminApplicationListQuery): Promise<Paginated<ApplicationDto>> {
    const { skip, take } = toPrismaPagination(query);
    const search = query.search?.trim();
    const where: Prisma.ApplicationWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.cityId ? { cityId: query.cityId } : {}),
      ...(query.planId ? { planId: query.planId } : {}),
      ...(query.from || query.to
        ? {
            createdAt: {
              ...(query.from ? { gte: query.from } : {}),
              ...(query.to ? { lte: query.to } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { reference: { contains: search, mode: 'insensitive' } },
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { mobile: { contains: search } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.application.findMany({
        where,
        include: applicationInclude,
        orderBy: buildOrderBy(query.sort, query.order, ['createdAt', 'updatedAt', 'submittedAt'], 'createdAt'),
        skip,
        take,
      }),
      this.prisma.application.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toDto(row)),
      pagination: buildPaginationMeta(query, total),
    };
  }

  async findById(id: string): Promise<ApplicationDto> {
    const row = await this.prisma.application.findUnique({
      where: { id },
      include: applicationInclude,
    });

    if (!row) {
      throw AppException.notFound('Application');
    }

    return this.toDto(row);
  }

  /** Ownership is proven with the mobile number on the record, since there may be no account yet. */
  async findByIdForApplicant(id: string, mobile: string): Promise<ApplicationDto> {
    const row = await this.prisma.application.findUnique({
      where: { id },
      include: applicationInclude,
    });

    if (!row || row.mobile !== mobile) {
      throw AppException.notFound('Application');
    }

    return this.toDto(row);
  }

  async submitDraft(id: string, mobile: string, context: RequestContext): Promise<ApplicationDto> {
    const row = await this.prisma.application.findUnique({
      where: { id },
      select: { id: true, status: true, mobile: true, reference: true, firstName: true },
    });

    if (!row || row.mobile !== mobile) {
      throw AppException.notFound('Application');
    }

    await this.changeStatus(id, ApplicationStatus.SUBMITTED, {
      reason: 'Confirmed by the applicant',
      context,
    });

    await this.prisma.application.update({
      where: { id },
      data: { submittedAt: new Date(), termsAcceptedAt: new Date() },
    });

    await this.notifyApplicant(id, NotificationEvent.APPLICATION_SUBMITTED, {
      reference: row.reference,
      firstName: row.firstName,
    });

    return this.findById(id);
  }

  /**
   * The one entry point for a status change. Validates the transition, writes history and updates
   * the review fields in a single transaction so history can never disagree with the row.
   */
  async changeStatus(
    id: string,
    to: ApplicationStatus,
    options: StatusChangeOptions = {},
  ): Promise<ApplicationDto> {
    const current = await this.prisma.application.findUnique({
      where: { id },
      select: { id: true, status: true, reference: true },
    });

    if (!current) {
      throw AppException.notFound('Application');
    }

    assertTransition(current.status, to);

    const reviewStatuses: ApplicationStatus[] = [
      ApplicationStatus.APPROVED,
      ApplicationStatus.REJECTED,
      ApplicationStatus.UNDER_REVIEW,
    ];

    await this.prisma.$transaction(async (tx) => {
      await tx.application.update({
        where: { id },
        data: {
          status: to,
          ...(reviewStatuses.includes(to)
            ? { reviewedAt: new Date(), reviewedById: options.changedById ?? null }
            : {}),
          ...(to === ApplicationStatus.REJECTED ? { rejectionReason: options.reason ?? null } : {}),
          ...(options.scheduledInstallationDate
            ? { scheduledInstallationDate: new Date(options.scheduledInstallationDate) }
            : {}),
        },
      });

      await tx.applicationStatusHistory.create({
        data: {
          applicationId: id,
          fromStatus: current.status,
          toStatus: to,
          reason: options.reason ?? null,
          changedById: options.changedById ?? null,
        },
      });
    });

    await this.audit.record({
      userId: options.changedById ?? null,
      action:
        to === ApplicationStatus.APPROVED
          ? AuditAction.APPLICATION_APPROVED
          : to === ApplicationStatus.REJECTED
            ? AuditAction.APPLICATION_REJECTED
            : AuditAction.APPLICATION_STATUS_CHANGED,
      entity: 'Application',
      entityId: id,
      oldValue: { status: current.status },
      newValue: { status: to, reason: options.reason ?? null },
      context: options.context ?? null,
    });

    // Approval is what creates the customer, their login and a pending subscription; activation is
    // what starts billing. Both are idempotent, so a repeated transition is harmless.
    if (to === ApplicationStatus.APPROVED) {
      await this.subscriptions.provisionFromApplication(id);
    } else if (to === ApplicationStatus.ACTIVE) {
      await this.subscriptions.activateForApplication(id, options.changedById ?? null);
    }

    if (to === ApplicationStatus.APPROVED) {
      await this.notifyApplicant(id, NotificationEvent.APPLICATION_APPROVED, {
        reference: current.reference,
      });
    } else if (to === ApplicationStatus.REJECTED) {
      await this.notifyApplicant(id, NotificationEvent.APPLICATION_REJECTED, {
        reference: current.reference,
        reason: options.reason ?? 'Not serviceable',
      });
    }

    return this.findById(id);
  }

  /**
   * Notifies the applicant when their mobile number is already linked to a user account. Before
   * registration there is no `User` row to attach an in-app notification to, so only the
   * transactional channels are used in that case.
   */
  private async notifyApplicant(
    applicationId: string,
    event: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      select: { email: true, mobile: true, customer: { select: { userId: true } } },
    });

    if (!application) return;

    const userId = application.customer?.userId;

    if (userId) {
      await this.notifications.dispatch({
        userId,
        event,
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.SMS],
        data,
      });
      return;
    }

    await this.notifications.sendTransient(event, data, {
      email: application.email,
      mobile: application.mobile,
    });
  }

  toDto(row: ApplicationRow): ApplicationDto {
    return {
      id: row.id,
      reference: row.reference,
      status: row.status,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      mobile: row.mobile,
      cnicLast4: row.cnicLast4,
      cityId: row.cityId,
      cityName: row.city.name,
      areaId: row.areaId,
      areaName: row.area?.name ?? null,
      subAreaId: row.subAreaId,
      subAreaName: row.subArea?.name ?? null,
      addressLine: row.addressLine,
      nearestLandmark: row.nearestLandmark,
      services: row.services,
      planId: row.planId,
      planName: row.plan?.name ?? null,
      addonIds: row.addonIds,
      quote: (row.quote as unknown as PriceQuoteDto | null) ?? null,
      preferredInstallationDate: row.preferredInstallationDate?.toISOString() ?? null,
      notes: row.notes,
      termsAcceptedAt: row.termsAcceptedAt?.toISOString() ?? null,
      mobileVerifiedAt: row.mobileVerifiedAt?.toISOString() ?? null,
      submittedAt: row.submittedAt?.toISOString() ?? null,
      reviewedAt: row.reviewedAt?.toISOString() ?? null,
      reviewedById: row.reviewedById,
      rejectionReason: row.rejectionReason,
      customerId: row.customerId,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      statusHistory: row.statusHistory.map((entry) => this.toHistoryDto(entry)),
    };
  }

  private toHistoryDto(
    entry: ApplicationRow['statusHistory'][number],
  ): ApplicationStatusHistoryDto {
    return {
      id: entry.id,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      reason: entry.reason,
      changedById: entry.changedById,
      changedByName: entry.changedBy
        ? `${entry.changedBy.firstName} ${entry.changedBy.lastName}`
        : null,
      createdAt: entry.createdAt.toISOString(),
    };
  }
}

export { applicationInclude };
export type { ApplicationRow };
