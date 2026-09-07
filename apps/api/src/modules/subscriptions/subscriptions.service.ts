import { Injectable, Logger } from '@nestjs/common';
import {
  ChangeRequestStatus,
  type Prisma,
  SubscriptionChangeType,
  SubscriptionStatus,
} from '@prisma/client';
import { billingPolicy, serviceLabels } from '@stormfiber/config';
import type {
  Paginated,
  SubscriptionChangeRequestDto,
  SubscriptionDto,
  SubscriptionHistoryDto,
  SubscriptionItemDto,
} from '@stormfiber/types';
import { NotificationChannel, NotificationEvent } from '@stormfiber/types';
import type {
  adminSubscriptionListQuerySchema,
  reviewChangeRequestSchema,
  subscriptionChangeRequestSchema,
} from '@stormfiber/validation';
import type { z } from 'zod';
import { AuditAction, AuditService } from '../../common/audit/audit.service';
import type { RequestContext } from '../../common/decorators/auth.decorators';
import { AppException } from '../../common/errors/app.exception';
import { PrismaService } from '../../common/prisma/prisma.service';
import { money, toNumber } from '../../common/utils/money';
import { buildPaginationMeta, toPrismaPagination } from '../../common/utils/pagination';
import { subscriptionReference } from '../../common/utils/references';
import { PricingService } from '../catalog/pricing.service';
import { CustomersService } from '../customers/customers.service';
import { NotificationsService } from '../notifications/notifications.service';

export type ChangeRequestPayload = z.output<typeof subscriptionChangeRequestSchema>;
export type ReviewChangeRequestPayload = z.output<typeof reviewChangeRequestSchema>;
export type AdminSubscriptionListQuery = z.output<typeof adminSubscriptionListQuerySchema>;

export const subscriptionInclude = {
  plan: { select: { id: true, name: true, speedMbps: true } },
  items: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.SubscriptionInclude;

export type SubscriptionRow = Prisma.SubscriptionGetPayload<{ include: typeof subscriptionInclude }>;

const changeRequestInclude = {
  requestedPlan: { select: { name: true } },
} satisfies Prisma.SubscriptionChangeRequestInclude;

type ChangeRequestRow = Prisma.SubscriptionChangeRequestGetPayload<{
  include: typeof changeRequestInclude;
}>;

/** Change types a customer may raise themselves. The rest are operator-initiated. */
const CUSTOMER_REQUESTABLE: SubscriptionChangeType[] = [
  SubscriptionChangeType.UPGRADE,
  SubscriptionChangeType.DOWNGRADE,
  SubscriptionChangeType.ADDON_ADDED,
  SubscriptionChangeType.ADDON_REMOVED,
  SubscriptionChangeType.CANCELLED,
];

/** Statuses that still represent a live relationship with the customer. */
const OPEN_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.PENDING,
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.SUSPENDED,
];

/**
 * Subscriptions and the changes made to them.
 *
 * Two rules hold throughout:
 *
 *   * Every mutation writes a `SubscriptionHistory` row in the same transaction, so the
 *     customer-facing timeline is read from recorded facts rather than reconstructed.
 *   * A change that alters money is re-priced through `PricingService` at the moment it is
 *     applied, never by adding a delta to the stored amount. An upgrade approved today is
 *     charged at today's price for the customer's city.
 */
@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    private readonly customers: CustomersService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Turns an approved application into a customer and a pending subscription.
   *
   * Idempotent: `Subscription.applicationId` is unique, so a repeated approval returns the
   * subscription that already exists instead of creating a second one.
   */
  async provisionFromApplication(applicationId: string): Promise<SubscriptionDto> {
    const existing = await this.prisma.subscription.findUnique({
      where: { applicationId },
      include: subscriptionInclude,
    });

    if (existing) {
      return this.toDto(existing);
    }

    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      select: { id: true, cityId: true, planId: true, addonIds: true, services: true },
    });

    if (!application) {
      throw AppException.notFound('Application');
    }

    if (!application.planId) {
      throw AppException.conflict(
        'This application has no plan selected, so a subscription cannot be created',
      );
    }

    const planId = application.planId;

    // Re-priced rather than read from the stored quote, so a tariff change since submission is
    // reflected in what the customer is actually billed.
    const quote = await this.pricing.quote({
      planId,
      cityId: application.cityId,
      addonIds: application.addonIds,
      includeInstallation: false,
    });

    const plan = await this.prisma.plan.findUniqueOrThrow({
      where: { id: planId },
      select: { name: true },
    });

    const addons = await this.loadAddons(application.addonIds);

    const { subscription, provision } = await this.prisma.$transaction(async (tx) => {
      const customer = await this.customers.ensureFromApplication(tx, application.id);

      const created = await tx.subscription.create({
        data: {
          reference: subscriptionReference(),
          customerId: customer.id,
          planId,
          applicationId: application.id,
          cityId: application.cityId,
          status: SubscriptionStatus.PENDING,
          services: application.services,
          monthlyAmount: money(quote.monthlyTotal),
          currency: quote.currency,
          items: {
            create: this.buildItems({
              planName: plan.name,
              services: application.services,
              basePrice: quote.basePrice,
              currency: quote.currency,
              addons,
            }),
          },
        },
        include: subscriptionInclude,
      });

      await tx.subscriptionHistory.create({
        data: {
          subscriptionId: created.id,
          changeType: SubscriptionChangeType.SERVICE_ACTIVATED,
          toValue: plan.name,
          reason: 'Provisioned from an approved application',
        },
      });

      return { subscription: created, provision: customer };
    });

    this.logger.log(
      `Provisioned subscription ${subscription.reference} for account ${provision.accountNumber}`,
    );

    // Sent only after the commit: an invite must never point at an account that was rolled back.
    if (provision.invite) {
      await this.notifications.sendTransient(
        NotificationEvent.ACCOUNT_INVITED,
        { firstName: provision.invite.firstName, resetUrl: provision.invite.inviteUrl },
        { email: provision.invite.email },
      );
    }

    await this.audit.record({
      action: AuditAction.SUBSCRIPTION_CHANGED,
      entity: 'Subscription',
      entityId: subscription.id,
      newValue: {
        reference: subscription.reference,
        applicationId,
        planId,
        status: SubscriptionStatus.PENDING,
      },
    });

    return this.toDto(subscription);
  }

  /**
   * Starts billing once the installation is complete. Sets the first billing period from the
   * published billing policy and marks the customer active.
   */
  async activate(subscriptionId: string, actorId: string | null): Promise<SubscriptionDto> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      select: { id: true, status: true, customerId: true },
    });

    if (!subscription) {
      throw AppException.notFound('Subscription');
    }

    if (subscription.status === SubscriptionStatus.ACTIVE) {
      return this.findById(subscriptionId);
    }

    if (subscription.status === SubscriptionStatus.CANCELLED) {
      throw AppException.conflict(
        'This subscription has been cancelled. Create a new connection instead.',
      );
    }

    const now = new Date();
    const period = this.periodContaining(now);

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: SubscriptionStatus.ACTIVE,
          startedAt: now,
          currentPeriodStart: period.start,
          currentPeriodEnd: period.end,
          nextBillingDate: this.nextBillingDate(period.end),
          suspendedAt: null,
        },
        include: subscriptionInclude,
      });

      await tx.subscriptionHistory.create({
        data: {
          subscriptionId,
          changeType: SubscriptionChangeType.SERVICE_ACTIVATED,
          fromValue: subscription.status,
          toValue: SubscriptionStatus.ACTIVE,
          changedById: actorId,
        },
      });

      await this.customers.activate(tx, subscription.customerId);

      return result;
    });

    this.logger.log(`Subscription ${updated.reference} is live`);

    return this.toDto(updated);
  }

  /** Provisions if necessary, then activates. Used when an application reaches ACTIVE. */
  async activateForApplication(
    applicationId: string,
    actorId: string | null,
  ): Promise<SubscriptionDto> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { applicationId },
      select: { id: true },
    });

    const id = subscription?.id ?? (await this.provisionFromApplication(applicationId)).id;

    return this.activate(id, actorId);
  }

  async suspend(
    subscriptionId: string,
    reason: string,
    actorId: string | null,
    context?: RequestContext,
  ): Promise<SubscriptionDto> {
    return this.transition(
      subscriptionId,
      SubscriptionStatus.SUSPENDED,
      SubscriptionChangeType.SERVICE_SUSPENDED,
      reason,
      actorId,
      context,
    );
  }

  async reactivate(
    subscriptionId: string,
    actorId: string | null,
    context?: RequestContext,
  ): Promise<SubscriptionDto> {
    return this.transition(
      subscriptionId,
      SubscriptionStatus.ACTIVE,
      SubscriptionChangeType.REACTIVATED,
      'Service restored',
      actorId,
      context,
    );
  }

  async cancel(
    subscriptionId: string,
    reason: string,
    actorId: string | null,
    context?: RequestContext,
  ): Promise<SubscriptionDto> {
    return this.transition(
      subscriptionId,
      SubscriptionStatus.CANCELLED,
      SubscriptionChangeType.CANCELLED,
      reason,
      actorId,
      context,
    );
  }

  private async transition(
    subscriptionId: string,
    to: SubscriptionStatus,
    changeType: SubscriptionChangeType,
    reason: string,
    actorId: string | null,
    context?: RequestContext,
  ): Promise<SubscriptionDto> {
    const current = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      select: { status: true },
    });

    if (!current) {
      throw AppException.notFound('Subscription');
    }

    if (current.status === to) {
      return this.findById(subscriptionId);
    }

    if (current.status === SubscriptionStatus.CANCELLED) {
      throw AppException.conflict('This subscription has already been cancelled');
    }

    if (to === SubscriptionStatus.ACTIVE && current.status === SubscriptionStatus.PENDING) {
      // A never-installed subscription is activated through `activate`, which sets the first
      // billing period. Reactivation is only meaningful for a suspended service.
      return this.activate(subscriptionId, actorId);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: to,
          ...(to === SubscriptionStatus.SUSPENDED ? { suspendedAt: new Date() } : {}),
          ...(to === SubscriptionStatus.ACTIVE ? { suspendedAt: null } : {}),
          ...(to === SubscriptionStatus.CANCELLED
            ? { cancelledAt: new Date(), nextBillingDate: null }
            : {}),
        },
        include: subscriptionInclude,
      });

      await tx.subscriptionHistory.create({
        data: {
          subscriptionId,
          changeType,
          fromValue: current.status,
          toValue: to,
          reason,
          changedById: actorId,
        },
      });

      return result;
    });

    await this.audit.record({
      userId: actorId,
      action: AuditAction.SUBSCRIPTION_CHANGED,
      entity: 'Subscription',
      entityId: subscriptionId,
      oldValue: { status: current.status },
      newValue: { status: to, reason },
      context: context ?? null,
    });

    return this.toDto(updated);
  }

  async listForAdmin(query: AdminSubscriptionListQuery): Promise<Paginated<SubscriptionDto>> {
    const { skip, take } = toPrismaPagination(query);
    const search = query.search?.trim();
    const where: Prisma.SubscriptionWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.cityId ? { cityId: query.cityId } : {}),
      ...(query.planId ? { planId: query.planId } : {}),
      ...(search
        ? {
            OR: [
              { reference: { contains: search, mode: 'insensitive' } },
              { customer: { accountNumber: { contains: search } } },
              { customer: { firstName: { contains: search, mode: 'insensitive' } } },
              { customer: { lastName: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.subscription.findMany({
        where,
        include: {
          ...subscriptionInclude,
          customer: { select: { firstName: true, lastName: true, accountNumber: true } },
          city: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return {
      items: rows.map((row) => ({
        ...this.toDto(row),
        customerName: `${row.customer.firstName} ${row.customer.lastName}`,
        customerAccountNumber: row.customer.accountNumber,
        cityName: row.city.name,
      })),
      pagination: buildPaginationMeta(query, total),
    };
  }

  async findById(id: string): Promise<SubscriptionDto> {
    const row = await this.prisma.subscription.findUnique({
      where: { id },
      include: subscriptionInclude,
    });

    if (!row) {
      throw AppException.notFound('Subscription');
    }

    return this.toDto(row);
  }

  async findByIdForAdmin(id: string): Promise<SubscriptionDto> {
    const row = await this.prisma.subscription.findUnique({
      where: { id },
      include: {
        ...subscriptionInclude,
        customer: { select: { firstName: true, lastName: true, accountNumber: true } },
        city: { select: { name: true } },
      },
    });

    if (!row) {
      throw AppException.notFound('Subscription');
    }

    return {
      ...this.toDto(row),
      customerName: `${row.customer.firstName} ${row.customer.lastName}`,
      customerAccountNumber: row.customer.accountNumber,
      cityName: row.city.name,
    };
  }

  async listChangeRequestsForAdmin(): Promise<SubscriptionChangeRequestDto[]> {
    const rows = await this.prisma.subscriptionChangeRequest.findMany({
      include: {
        ...changeRequestInclude,
        subscription: {
          select: {
            reference: true,
            customer: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 80,
    });

    return rows.map((row) => ({
      ...this.toChangeRequestDto(row),
      customerName: `${row.subscription.customer.firstName} ${row.subscription.customer.lastName}`,
      subscriptionReference: row.subscription.reference,
    }));
  }

  async listChangeRequestsForSubscription(subscriptionId: string): Promise<SubscriptionChangeRequestDto[]> {
    const rows = await this.prisma.subscriptionChangeRequest.findMany({
      where: { subscriptionId },
      include: changeRequestInclude,
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => this.toChangeRequestDto(row));
  }

  /** The customer's live subscription, or null while their application is still in flight. */
  async findForCustomer(customerId: string): Promise<SubscriptionDto | null> {
    const row = await this.prisma.subscription.findFirst({
      where: { customerId, status: { in: OPEN_STATUSES } },
      include: subscriptionInclude,
      orderBy: { createdAt: 'desc' },
    });

    return row ? this.toDto(row) : null;
  }

  async historyForCustomer(customerId: string): Promise<SubscriptionHistoryDto[]> {
    const rows = await this.prisma.subscriptionHistory.findMany({
      where: { subscription: { customerId } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return rows.map((row) => ({
      id: row.id,
      changeType: row.changeType,
      fromValue: row.fromValue,
      toValue: row.toValue,
      reason: row.reason,
      changedById: row.changedById,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  /**
   * Records a customer's request to change their plan or add-ons.
   *
   * Nothing is applied here. An upgrade or downgrade is reviewed by an operator because it can
   * require a field visit or different equipment, and a cancellation needs a retention call.
   */
  async createChangeRequest(
    customerId: string,
    input: ChangeRequestPayload,
    context: RequestContext,
  ): Promise<SubscriptionChangeRequestDto> {
    if (!CUSTOMER_REQUESTABLE.includes(input.changeType)) {
      throw AppException.forbidden('This change can only be made by our team');
    }

    const subscription = await this.prisma.subscription.findFirst({
      where: {
        customerId,
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.SUSPENDED] },
      },
      select: { id: true, planId: true, cityId: true },
    });

    if (!subscription) {
      throw AppException.conflict('You do not have an active subscription to change');
    }

    const pending = await this.prisma.subscriptionChangeRequest.count({
      where: { subscriptionId: subscription.id, status: ChangeRequestStatus.PENDING },
    });

    if (pending > 0) {
      throw AppException.conflict(
        'You already have a change request under review. We will be in touch shortly.',
      );
    }

    if (input.requestedPlanId) {
      if (input.requestedPlanId === subscription.planId) {
        throw AppException.badRequest('You are already on that plan');
      }

      await this.assertPlanSoldInCity(input.requestedPlanId, subscription.cityId);
    }

    if (input.requestedAddonId) {
      await this.assertAddonOfferedWithPlan(input.requestedAddonId, subscription.planId);
    }

    const created = await this.prisma.subscriptionChangeRequest.create({
      data: {
        subscriptionId: subscription.id,
        changeType: input.changeType,
        requestedPlanId: input.requestedPlanId ?? null,
        requestedAddonId: input.requestedAddonId ?? null,
        customerNote: input.customerNote ?? null,
      },
      include: changeRequestInclude,
    });

    await this.audit.record({
      action: AuditAction.SUBSCRIPTION_CHANGED,
      entity: 'SubscriptionChangeRequest',
      entityId: created.id,
      newValue: {
        changeType: input.changeType,
        requestedPlanId: input.requestedPlanId ?? null,
        requestedAddonId: input.requestedAddonId ?? null,
      },
      context,
    });

    return this.toChangeRequestDto(created);
  }

  async listChangeRequests(customerId: string): Promise<SubscriptionChangeRequestDto[]> {
    const rows = await this.prisma.subscriptionChangeRequest.findMany({
      where: { subscription: { customerId } },
      include: changeRequestInclude,
      orderBy: { createdAt: 'desc' },
    });

    return rows.map((row) => this.toChangeRequestDto(row));
  }

  async withdrawChangeRequest(
    customerId: string,
    requestId: string,
  ): Promise<SubscriptionChangeRequestDto> {
    const request = await this.prisma.subscriptionChangeRequest.findFirst({
      where: { id: requestId, subscription: { customerId } },
      select: { id: true, status: true },
    });

    if (!request) {
      throw AppException.notFound('Change request');
    }

    if (request.status !== ChangeRequestStatus.PENDING) {
      throw AppException.conflict('This request has already been reviewed');
    }

    const updated = await this.prisma.subscriptionChangeRequest.update({
      where: { id: requestId },
      data: { status: ChangeRequestStatus.CANCELLED, reviewedAt: new Date() },
      include: changeRequestInclude,
    });

    return this.toChangeRequestDto(updated);
  }

  /**
   * Operator decision on a change request.
   *
   * `APPLIED` performs the change immediately. `APPROVED` records the decision without touching
   * the subscription, which is what an operator uses when the change is scheduled for a later
   * date — the request is applied on `effectiveFrom` by the scheduled job.
   */
  async reviewChangeRequest(
    requestId: string,
    input: ReviewChangeRequestPayload,
    actorId: string,
    context: RequestContext,
  ): Promise<SubscriptionChangeRequestDto> {
    const request = await this.prisma.subscriptionChangeRequest.findUnique({
      where: { id: requestId },
      include: { subscription: { select: { id: true, customerId: true } } },
    });

    if (!request) {
      throw AppException.notFound('Change request');
    }

    const reviewable: ChangeRequestStatus[] = [
      ChangeRequestStatus.PENDING,
      ChangeRequestStatus.APPROVED,
    ];

    if (!reviewable.includes(request.status)) {
      throw AppException.conflict('This request has already been closed');
    }

    if (input.status === ChangeRequestStatus.APPLIED) {
      await this.applyChange(request.subscription.id, {
        changeType: request.changeType,
        requestedPlanId: request.requestedPlanId,
        requestedAddonId: request.requestedAddonId,
        actorId,
      });
    }

    const updated = await this.prisma.subscriptionChangeRequest.update({
      where: { id: requestId },
      data: {
        status: input.status,
        adminNote: input.adminNote ?? null,
        effectiveFrom: input.effectiveFrom ?? null,
        reviewedAt: new Date(),
      },
      include: changeRequestInclude,
    });

    await this.audit.record({
      userId: actorId,
      action: AuditAction.SUBSCRIPTION_CHANGED,
      entity: 'SubscriptionChangeRequest',
      entityId: requestId,
      oldValue: { status: request.status },
      newValue: { status: input.status, adminNote: input.adminNote ?? null },
      context,
    });

    await this.notifyCustomer(request.subscription.customerId, updated);

    return this.toChangeRequestDto(updated);
  }

  /**
   * Applies a change to the live subscription and re-prices it.
   *
   * Items are rebuilt from the new quote rather than patched, so `monthlyAmount` and the item rows
   * can never drift apart — the invoice is later built from those same items.
   */
  async applyChange(
    subscriptionId: string,
    change: {
      changeType: SubscriptionChangeType;
      requestedPlanId: string | null;
      requestedAddonId: string | null;
      actorId: string | null;
    },
  ): Promise<SubscriptionDto> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { items: true, plan: { select: { name: true } } },
    });

    if (!subscription) {
      throw AppException.notFound('Subscription');
    }

    if (change.changeType === SubscriptionChangeType.CANCELLED) {
      return this.cancel(subscriptionId, 'Cancelled at the customer’s request', change.actorId);
    }

    if (change.changeType === SubscriptionChangeType.SERVICE_SUSPENDED) {
      return this.suspend(subscriptionId, 'Suspended at the customer’s request', change.actorId);
    }

    if (change.changeType === SubscriptionChangeType.REACTIVATED) {
      return this.reactivate(subscriptionId, change.actorId);
    }

    const targetPlanId = change.requestedPlanId ?? subscription.planId;
    const nextAddonIds = this.nextAddonIds(subscription.items, change);

    const quote = await this.pricing.quote({
      planId: targetPlanId,
      cityId: subscription.cityId,
      addonIds: nextAddonIds,
      includeInstallation: false,
    });

    const [targetPlan, addons] = await Promise.all([
      this.prisma.plan.findUniqueOrThrow({
        where: { id: targetPlanId },
        select: { name: true, services: true },
      }),
      this.loadAddons(nextAddonIds),
    ]);

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.subscriptionItem.deleteMany({ where: { subscriptionId } });

      const result = await tx.subscription.update({
        where: { id: subscriptionId },
        data: {
          planId: targetPlanId,
          services: targetPlan.services,
          monthlyAmount: money(quote.monthlyTotal),
          currency: quote.currency,
          items: {
            create: this.buildItems({
              planName: targetPlan.name,
              services: targetPlan.services,
              basePrice: quote.basePrice,
              currency: quote.currency,
              addons,
            }),
          },
        },
        include: subscriptionInclude,
      });

      await tx.subscriptionHistory.create({
        data: {
          subscriptionId,
          changeType: change.changeType,
          fromValue: subscription.plan.name,
          toValue: targetPlan.name,
          changedById: change.actorId,
        },
      });

      return result;
    });

    this.logger.log(
      `Applied ${change.changeType} to subscription ${updated.reference} (${targetPlan.name})`,
    );

    return this.toDto(updated);
  }

  /**
   * Applies change requests whose `effectiveFrom` date has arrived. Called by the scheduled
   * subscription job, and safe to run repeatedly.
   */
  async applyDueChangeRequests(now = new Date()): Promise<{ applied: number }> {
    const due = await this.prisma.subscriptionChangeRequest.findMany({
      where: {
        status: ChangeRequestStatus.APPROVED,
        effectiveFrom: { not: null, lte: now },
      },
      select: {
        id: true,
        subscriptionId: true,
        changeType: true,
        requestedPlanId: true,
        requestedAddonId: true,
        subscription: { select: { customerId: true } },
      },
      take: 100,
    });

    let applied = 0;

    for (const request of due) {
      try {
        await this.applyChange(request.subscriptionId, {
          changeType: request.changeType,
          requestedPlanId: request.requestedPlanId,
          requestedAddonId: request.requestedAddonId,
          actorId: null,
        });

        const updated = await this.prisma.subscriptionChangeRequest.update({
          where: { id: request.id },
          data: { status: ChangeRequestStatus.APPLIED },
          include: changeRequestInclude,
        });

        await this.notifyCustomer(request.subscription.customerId, updated);
        applied += 1;
      } catch (error) {
        // One failing request must not stop the rest of the batch.
        this.logger.error(
          `Failed to apply scheduled change request ${request.id}: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      }
    }

    if (applied > 0) {
      this.logger.log(`Applied ${applied} scheduled subscription change(s)`);
    }

    return { applied };
  }

  private nextAddonIds(
    items: { addonId: string | null; isActive: boolean }[],
    change: { changeType: SubscriptionChangeType; requestedAddonId: string | null },
  ): string[] {
    const current = items
      .filter((item): item is { addonId: string; isActive: boolean } =>
        Boolean(item.addonId && item.isActive),
      )
      .map((item) => item.addonId);

    if (!change.requestedAddonId) return current;

    if (change.changeType === SubscriptionChangeType.ADDON_ADDED) {
      return [...new Set([...current, change.requestedAddonId])];
    }

    if (change.changeType === SubscriptionChangeType.ADDON_REMOVED) {
      return current.filter((id) => id !== change.requestedAddonId);
    }

    return current;
  }

  private async loadAddons(addonIds: string[]) {
    if (addonIds.length === 0) return [];

    return this.prisma.planAddon.findMany({
      where: { id: { in: addonIds } },
      select: { id: true, name: true, serviceType: true, monthlyPrice: true, currency: true },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Builds the item rows behind the monthly amount: one line for the plan, one per add-on.
   *
   * The plan line carries the whole base price and is tagged with the primary service, because a
   * bundled plan is sold and billed as a single product rather than as separable services.
   */
  private buildItems(input: {
    planName: string;
    services: SubscriptionRow['services'];
    basePrice: number;
    currency: string;
    addons: { id: string; name: string; serviceType: SubscriptionRow['services'][number]; monthlyPrice: Prisma.Decimal; currency: string }[];
  }): Prisma.SubscriptionItemCreateWithoutSubscriptionInput[] {
    const primary = input.services.at(0) ?? 'INTERNET';
    const label =
      input.services.length > 1
        ? `${input.planName} (${input.services.map((service) => serviceLabels[service]).join(' + ')})`
        : `${input.planName} — ${serviceLabels[primary]}`;

    return [
      {
        serviceType: primary,
        label,
        unitPrice: money(input.basePrice),
        currency: input.currency,
      },
      ...input.addons.map((addon) => ({
        serviceType: addon.serviceType,
        label: addon.name,
        addon: { connect: { id: addon.id } },
        unitPrice: addon.monthlyPrice,
        currency: addon.currency,
      })),
    ];
  }

  /** A `PlanPrice` row for the city is what makes a plan sellable there. */
  private async assertPlanSoldInCity(planId: string, cityId: string): Promise<void> {
    const sold = await this.prisma.planPrice.count({
      where: {
        planId,
        cityId,
        isActive: true,
        plan: { status: 'PUBLISHED', deletedAt: null },
      },
    });

    if (sold === 0) {
      throw AppException.of(
        'PLAN_UNAVAILABLE_IN_CITY',
        'That plan is not available at your address',
        409,
      );
    }
  }

  private async assertAddonOfferedWithPlan(addonId: string, planId: string): Promise<void> {
    const offered = await this.prisma.planAddonLink.count({
      where: { planId, addonId, addon: { isActive: true, deletedAt: null } },
    });

    if (offered === 0) {
      throw AppException.badRequest('That add-on is not available with your current plan');
    }
  }

  private async notifyCustomer(customerId: string, request: ChangeRequestRow): Promise<void> {
    // A rejected request still deserves an answer, but only decisions the customer can act on
    // are worth an SMS, so everything goes through the in-app feed and email.
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { userId: true, firstName: true },
    });

    if (!customer) return;

    await this.notifications.dispatch({
      userId: customer.userId,
      event: NotificationEvent.SUBSCRIPTION_CHANGED,
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      data: {
        firstName: customer.firstName,
        planName: request.requestedPlan?.name,
        reason: request.adminNote ?? undefined,
        scheduledFor: request.effectiveFrom ?? undefined,
      },
    });
  }

  /**
   * Creates a pending-install subscription when a customer confirms an order via OTP.
   * Uses the same Subscription row the customer dashboard reads.
   */
  async createFromOrder(input: {
    customerId: string;
    planId: string;
    cityId: string;
    reason: string;
  }): Promise<SubscriptionDto> {
    const quote = await this.pricing.quote({
      planId: input.planId,
      cityId: input.cityId,
      addonIds: [],
      includeInstallation: false,
    });

    const plan = await this.prisma.plan.findUniqueOrThrow({
      where: { id: input.planId },
      select: { name: true, services: true },
    });

    const created = await this.prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.create({
        data: {
          reference: subscriptionReference(),
          customerId: input.customerId,
          planId: input.planId,
          cityId: input.cityId,
          status: SubscriptionStatus.PENDING,
          services: plan.services,
          monthlyAmount: money(quote.monthlyTotal),
          currency: quote.currency,
          items: {
            create: this.buildItems({
              planName: plan.name,
              services: plan.services,
              basePrice: quote.basePrice,
              currency: quote.currency,
              addons: [],
            }),
          },
        },
        include: subscriptionInclude,
      });

      await tx.subscriptionHistory.create({
        data: {
          subscriptionId: subscription.id,
          changeType: SubscriptionChangeType.SERVICE_ACTIVATED,
          toValue: plan.name,
          reason: input.reason,
        },
      });

      return subscription;
    });

    return this.toDto(created);
  }

  async listForCustomer(customerId: string): Promise<SubscriptionDto[]> {
    const rows = await this.prisma.subscription.findMany({
      where: { customerId },
      include: subscriptionInclude,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.toDto(row));
  }

  async adminUpdateForCustomer(
    customerId: string,
    input: {
      subscriptionId: string;
      planId?: string;
      status?: SubscriptionStatus;
      startedAt?: Date | null;
      currentPeriodStart?: Date | null;
      currentPeriodEnd?: Date | null;
      nextBillingDate?: Date | null;
      reason?: string;
    },
    actorId: string,
    context: RequestContext,
  ): Promise<SubscriptionDto> {
    const existing = await this.prisma.subscription.findFirst({
      where: { id: input.subscriptionId, customerId },
      include: subscriptionInclude,
    });

    if (!existing) {
      throw AppException.notFound('Subscription');
    }

    let monthlyAmount = existing.monthlyAmount;
    let services = existing.services;
    let planName = existing.plan.name;

    if (input.planId && input.planId !== existing.planId) {
      const quote = await this.pricing.quote({
        planId: input.planId,
        cityId: existing.cityId,
        addonIds: [],
        includeInstallation: false,
      });
      const plan = await this.prisma.plan.findFirst({
        where: { id: input.planId, deletedAt: null },
        select: { name: true, services: true },
      });
      if (!plan) {
        throw AppException.notFound('Plan');
      }
      monthlyAmount = money(quote.monthlyTotal);
      services = plan.services;
      planName = plan.name;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const row = await tx.subscription.update({
        where: { id: existing.id },
        data: {
          ...(input.planId ? { planId: input.planId, monthlyAmount, services } : {}),
          ...(input.status
            ? {
                status: input.status,
                suspendedAt: input.status === SubscriptionStatus.SUSPENDED ? new Date() : existing.suspendedAt,
                cancelledAt: input.status === SubscriptionStatus.CANCELLED ? new Date() : existing.cancelledAt,
              }
            : {}),
          ...(input.startedAt !== undefined ? { startedAt: input.startedAt } : {}),
          ...(input.currentPeriodStart !== undefined ? { currentPeriodStart: input.currentPeriodStart } : {}),
          ...(input.currentPeriodEnd !== undefined ? { currentPeriodEnd: input.currentPeriodEnd } : {}),
          ...(input.nextBillingDate !== undefined ? { nextBillingDate: input.nextBillingDate } : {}),
        },
        include: subscriptionInclude,
      });

      await tx.subscriptionHistory.create({
        data: {
          subscriptionId: row.id,
          changeType:
            input.status === SubscriptionStatus.CANCELLED
              ? SubscriptionChangeType.CANCELLED
              : input.status === SubscriptionStatus.SUSPENDED
                ? SubscriptionChangeType.SERVICE_SUSPENDED
                : input.planId
                  ? SubscriptionChangeType.UPGRADE
                  : SubscriptionChangeType.REACTIVATED,
          fromValue: `${existing.plan.name} / ${existing.status}`,
          toValue: `${planName} / ${row.status}`,
          reason: input.reason ?? 'Updated by staff',
          changedById: actorId,
        },
      });

      return row;
    });

    await this.audit.record({
      userId: actorId,
      action: AuditAction.SUBSCRIPTION_CHANGED,
      entity: 'Customer',
      entityId: customerId,
      oldValue: { subscriptionId: existing.id, planId: existing.planId, status: existing.status },
      newValue: { subscriptionId: updated.id, planId: updated.planId, status: updated.status },
      context,
    });

    return this.toDto(updated);
  }

  async adminCreateForCustomer(
    customerId: string,
    input: { planId: string; status?: SubscriptionStatus; startedAt?: Date; reason?: string },
    actorId: string,
    context: RequestContext,
  ): Promise<SubscriptionDto> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, cityId: true },
    });

    if (!customer) {
      throw AppException.notFound('Customer');
    }

    const created = await this.createFromOrder({
      customerId,
      planId: input.planId,
      cityId: customer.cityId,
      reason: input.reason ?? 'Added by staff',
    });

    if (input.status && input.status !== SubscriptionStatus.PENDING) {
      return this.adminUpdateForCustomer(
        customerId,
        {
          subscriptionId: created.id,
          status: input.status,
          startedAt: input.startedAt ?? null,
          reason: input.reason,
        },
        actorId,
        context,
      );
    }

    await this.audit.record({
      userId: actorId,
      action: AuditAction.SUBSCRIPTION_CHANGED,
      entity: 'Customer',
      entityId: customerId,
      newValue: { action: 'created subscription', subscriptionId: created.id, planId: input.planId },
      context,
    });

    return created;
  }

  /** Billing runs on calendar months, which is what the published policy promises. */
  private periodContaining(date: Date): { start: Date; end: Date } {
    return {
      start: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)),
      end: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)),
    };
  }

  private nextBillingDate(periodEnd: Date): Date {
    return new Date(
      Date.UTC(
        periodEnd.getUTCFullYear(),
        periodEnd.getUTCMonth() + 1,
        billingPolicy.generationDayOfMonth,
      ),
    );
  }

  toDto(row: SubscriptionRow): SubscriptionDto {
    return {
      id: row.id,
      reference: row.reference,
      customerId: row.customerId,
      planId: row.planId,
      planName: row.plan.name,
      planSpeedMbps: row.plan.speedMbps,
      status: row.status,
      services: row.services,
      monthlyAmount: toNumber(row.monthlyAmount),
      currency: row.currency,
      cityId: row.cityId,
      startedAt: row.startedAt?.toISOString() ?? null,
      currentPeriodStart: row.currentPeriodStart?.toISOString() ?? null,
      currentPeriodEnd: row.currentPeriodEnd?.toISOString() ?? null,
      nextBillingDate: row.nextBillingDate?.toISOString() ?? null,
      suspendedAt: row.suspendedAt?.toISOString() ?? null,
      cancelledAt: row.cancelledAt?.toISOString() ?? null,
      items: row.items.map((item) => this.toItemDto(item)),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toItemDto(item: SubscriptionRow['items'][number]): SubscriptionItemDto {
    return {
      id: item.id,
      serviceType: item.serviceType,
      label: item.label,
      addonId: item.addonId,
      quantity: item.quantity,
      unitPrice: toNumber(item.unitPrice),
      currency: item.currency,
      isActive: item.isActive,
    };
  }

  private toChangeRequestDto(row: ChangeRequestRow): SubscriptionChangeRequestDto {
    return {
      id: row.id,
      subscriptionId: row.subscriptionId,
      changeType: row.changeType,
      requestedPlanId: row.requestedPlanId,
      requestedPlanName: row.requestedPlan?.name ?? null,
      requestedAddonId: row.requestedAddonId,
      status: row.status,
      customerNote: row.customerNote,
      adminNote: row.adminNote,
      effectiveFrom: row.effectiveFrom?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
