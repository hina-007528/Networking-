import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { OrderStatus, type Prisma } from '@prisma/client';
import type { CreateOrderResult, NotificationLogDto, OrderDto, Paginated } from '@stormfiber/types';
import { NotificationEvent } from '@stormfiber/types';
import type { adminOrderListQuerySchema, createOrderSchema, verifyOrderOtpSchema } from '@stormfiber/validation';
import type { z } from 'zod';
import { AuditAction, AuditService } from '../../common/audit/audit.service';
import type { RequestContext } from '../../common/decorators/auth.decorators';
import { AppException } from '../../common/errors/app.exception';
import { PrismaService } from '../../common/prisma/prisma.service';
import { toNumber } from '../../common/utils/money';
import { hashOtp, otpMatches } from '../../common/utils/otp-hash';
import { buildPaginationMeta, toPrismaPagination } from '../../common/utils/pagination';
import { APP_CONFIG, type AppConfig } from '../../config/configuration';
import { NotificationsService } from '../notifications/notifications.service';
import { renderNotification } from '../notifications/notification-templates';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

export type CreateOrderPayload = z.output<typeof createOrderSchema>;
export type VerifyOrderOtpPayload = z.output<typeof verifyOrderOtpSchema>;
export type AdminOrderListQuery = z.output<typeof adminOrderListQuerySchema>;

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_RESEND_WINDOW_MS = 10 * 60 * 1000;
const OTP_RESEND_MAX = 3;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

const orderInclude = {
  customer: {
    select: { id: true, firstName: true, lastName: true, email: true, mobile: true, cityId: true },
  },
  plan: { select: { id: true, name: true, monthlyPrice: true, currency: true } },
  notifications: { orderBy: { createdAt: 'desc' }, take: 20 },
} satisfies Prisma.OrderInclude;

type OrderRow = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly subscriptions: SubscriptionsService,
    private readonly audit: AuditService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async preview(customerId: string, planId: string): Promise<{
    planId: string;
    planName: string;
    planMonthlyPrice: number;
    currency: string;
    installAddress: string;
    customerName: string;
    customerEmail: string;
  }> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { firstName: true, lastName: true, email: true, addressLine: true },
    });
    if (!customer) {
      throw AppException.notFound('Customer');
    }

    const plan = await this.prisma.plan.findFirst({
      where: { id: planId, status: 'PUBLISHED', deletedAt: null },
      select: { id: true, name: true, monthlyPrice: true, currency: true },
    });
    if (!plan) {
      throw AppException.notFound('Plan');
    }

    return {
      planId: plan.id,
      planName: plan.name,
      planMonthlyPrice: toNumber(plan.monthlyPrice),
      currency: plan.currency,
      installAddress: customer.addressLine,
      customerName: `${customer.firstName} ${customer.lastName}`,
      customerEmail: customer.email,
    };
  }

  async create(customerId: string, input: CreateOrderPayload): Promise<CreateOrderResult> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        mobile: true,
        cityId: true,
        addressLine: true,
      },
    });

    if (!customer) {
      throw AppException.notFound('Customer');
    }

    const plan = await this.prisma.plan.findFirst({
      where: { id: input.planId, status: 'PUBLISHED', deletedAt: null },
      select: { id: true, name: true, monthlyPrice: true, currency: true },
    });

    if (!plan) {
      throw AppException.notFound('Plan');
    }

    const order = await this.prisma.order.create({
      data: {
        customerId,
        planId: plan.id,
        installAddress: input.installAddress,
        status: OrderStatus.PENDING_OTP,
      },
      include: orderInclude,
    });

    await this.issueOtp(order.id);

    const refreshed = await this.loadRow(order.id);
    return {
      order: this.toDto(refreshed),
      expiresAt: refreshed.otpExpiresAt?.toISOString() ?? new Date(Date.now() + OTP_TTL_MS).toISOString(),
      resendAvailableAt: new Date(Date.now() + OTP_RESEND_COOLDOWN_MS).toISOString(),
    };
  }

  async resendOtp(orderId: string, customerId: string): Promise<CreateOrderResult> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId },
    });

    if (!order) {
      throw AppException.notFound('Order');
    }

    if (order.status !== OrderStatus.PENDING_OTP && order.status !== OrderStatus.EXPIRED) {
      throw AppException.conflict('This order is no longer waiting for a confirmation code');
    }

    const since = new Date(Date.now() - OTP_RESEND_WINDOW_MS);
    const recent = await this.prisma.notificationLog.count({
      where: {
        relatedOrderId: order.id,
        subjectOrTag: 'ORDER_OTP',
        createdAt: { gte: since },
      },
    });

    if (recent >= OTP_RESEND_MAX) {
      throw AppException.rateLimited(
        'You can request at most 3 codes every 10 minutes. Please wait and try again.',
      );
    }

    if (order.otpExpiresAt) {
      const issuedAt = order.otpExpiresAt.getTime() - OTP_TTL_MS;
      const elapsed = Date.now() - issuedAt;
      if (elapsed < OTP_RESEND_COOLDOWN_MS) {
        throw AppException.of(
          'OTP_COOLDOWN',
          `Please wait ${Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000)} seconds before requesting another code`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    await this.issueOtp(order.id);

    const refreshed = await this.loadRow(order.id);
    return {
      order: this.toDto(refreshed),
      expiresAt: refreshed.otpExpiresAt?.toISOString() ?? new Date(Date.now() + OTP_TTL_MS).toISOString(),
      resendAvailableAt: new Date(Date.now() + OTP_RESEND_COOLDOWN_MS).toISOString(),
    };
  }

  async verifyOtp(
    orderId: string,
    customerId: string,
    input: VerifyOrderOtpPayload,
    context: RequestContext,
  ): Promise<OrderDto> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId },
      include: {
        customer: { select: { firstName: true, lastName: true, email: true, mobile: true, cityId: true } },
        plan: { select: { name: true } },
      },
    });

    if (!order) {
      throw AppException.notFound('Order');
    }

    if (order.status === OrderStatus.CONFIRMED) {
      return this.toDto(await this.loadRow(order.id));
    }

    if (order.status !== OrderStatus.PENDING_OTP && order.status !== OrderStatus.EXPIRED) {
      throw AppException.conflict('This order cannot be confirmed');
    }

    if (!order.otpCodeHash || !order.otpExpiresAt) {
      throw AppException.of('OTP_INVALID', 'Request a new confirmation code', HttpStatus.BAD_REQUEST);
    }

    if (order.otpExpiresAt.getTime() <= Date.now()) {
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.EXPIRED },
      });
      throw AppException.of(
        'OTP_EXPIRED',
        'This code has expired. Request a new one.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (order.otpAttempts >= OTP_MAX_ATTEMPTS) {
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.EXPIRED },
      });
      throw AppException.of(
        'OTP_ATTEMPTS_EXCEEDED',
        'Too many incorrect attempts. Request a new code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!this.matches(input.code, order.otpCodeHash)) {
      const updated = await this.prisma.order.update({
        where: { id: order.id },
        data: { otpAttempts: { increment: 1 } },
        select: { otpAttempts: true },
      });
      const remaining = Math.max(OTP_MAX_ATTEMPTS - updated.otpAttempts, 0);
      throw AppException.of(
        remaining === 0 ? 'OTP_ATTEMPTS_EXCEEDED' : 'OTP_INVALID',
        remaining === 0
          ? 'Too many incorrect attempts. Request a new code.'
          : `That code is incorrect. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const subscription = await this.subscriptions.createFromOrder({
      customerId: order.customerId,
      planId: order.planId,
      cityId: order.customer.cityId,
      reason: `Confirmed order ${order.id}`,
    });

    const confirmed = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.CONFIRMED,
        confirmedAt: new Date(),
        subscriptionId: subscription.id,
        otpCodeHash: null,
      },
    });

    await this.audit.record({
      userId: null,
      action: AuditAction.SUBSCRIPTION_CHANGED,
      entity: 'Order',
      entityId: confirmed.id,
      newValue: { status: OrderStatus.CONFIRMED, subscriptionId: subscription.id },
      context,
    });

    await this.notifyCustomer(order);
    await this.notifyAdmin(order);

    return this.toDto(await this.loadRow(order.id));
  }

  async adminUpdateStatus(
    orderId: string,
    status: 'CANCELLED' | 'SCHEDULED' | 'INSTALLED',
    actorId: string,
    context: RequestContext,
  ): Promise<OrderDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true },
    });
    if (!order) {
      throw AppException.notFound('Order');
    }

    const allowed: Record<string, string[]> = {
      PENDING_OTP: ['CANCELLED'],
      EXPIRED: ['CANCELLED'],
      CONFIRMED: ['SCHEDULED', 'CANCELLED'],
      SCHEDULED: ['INSTALLED', 'CANCELLED'],
    };
    const nextStatuses = allowed[order.status] ?? [];
    if (!nextStatuses.includes(status)) {
      throw AppException.conflict(`Cannot move an order from ${order.status} to ${status}`);
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: { status },
    });

    await this.audit.record({
      userId: actorId,
      action: AuditAction.SUBSCRIPTION_CHANGED,
      entity: 'Order',
      entityId: order.id,
      oldValue: { status: order.status },
      newValue: { status },
      context,
    });

    return this.toDto(await this.loadRow(order.id));
  }

  async findForCustomer(orderId: string, customerId: string): Promise<OrderDto> {
    const row = await this.prisma.order.findFirst({
      where: { id: orderId, customerId },
      include: orderInclude,
    });
    if (!row) {
      throw AppException.notFound('Order');
    }
    return this.toDto(row);
  }

  async listForAdmin(query: AdminOrderListQuery): Promise<Paginated<OrderDto>> {
    const { skip, take } = toPrismaPagination(query);
    const search = query.search?.trim();
    const where: Prisma.OrderWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(search
        ? {
            OR: [
              { customer: { lastName: { contains: search, mode: 'insensitive' } } },
              { customer: { firstName: { contains: search, mode: 'insensitive' } } },
              { customer: { email: { contains: search, mode: 'insensitive' } } },
              { customer: { mobile: { contains: search } } },
              { plan: { name: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: orderInclude,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toDto(row)),
      pagination: buildPaginationMeta(query, total),
    };
  }

  async findByIdForAdmin(orderId: string): Promise<OrderDto> {
    return this.toDto(await this.loadRow(orderId));
  }

  private async issueOtp(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: {
        customer: { select: { firstName: true, email: true } },
        plan: { select: { name: true } },
      },
    });

    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.PENDING_OTP,
        otpCodeHash: this.hash(code),
        otpExpiresAt: expiresAt,
        otpAttempts: 0,
      },
    });

    const rendered = renderNotification(NotificationEvent.ORDER_OTP, {
      firstName: order.customer.firstName,
      code,
      expiryMinutes: 10,
      planName: order.plan.name,
    });

    const result = await this.notifications.sendEmail({
      to: order.customer.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      tag: 'ORDER_OTP',
      relatedOrderId: order.id,
      logBody: `Order confirmation code emailed to ${order.customer.email} for ${order.plan.name}. Expires ${expiresAt.toISOString()}.`,
    });

    if (!result.delivered) {
      this.logger.warn(`Order OTP email for ${order.id} was not delivered`);
    }
  }

  private async notifyCustomer(order: {
    id: string;
    installAddress: string;
    customer: { firstName: string; email: string };
    plan: { name: string };
  }): Promise<void> {
    const rendered = renderNotification(NotificationEvent.ORDER_CONFIRMED, {
      firstName: order.customer.firstName,
      planName: order.plan.name,
      installAddress: order.installAddress,
    });

    await this.notifications.sendEmail({
      to: order.customer.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      tag: 'ORDER_CONFIRMED',
      relatedOrderId: order.id,
      logBody: `Customer confirmation emailed to ${order.customer.email} for ${order.plan.name}.`,
    });
  }

  private async notifyAdmin(order: {
    id: string;
    installAddress: string;
    customer: { firstName: string; lastName: string; email: string; mobile: string };
    plan: { name: string };
  }): Promise<void> {
    const rendered = renderNotification(NotificationEvent.ORDER_CONFIRMED_ADMIN, {
      customerName: `${order.customer.firstName} ${order.customer.lastName}`,
      firstName: order.customer.firstName,
      email: order.customer.email,
      phone: order.customer.mobile,
      planName: order.plan.name,
      installAddress: order.installAddress,
    });

    const logBody = `Admin alert: ${order.customer.firstName} ${order.customer.lastName} (${order.customer.email}, ${order.customer.mobile}) ordered ${order.plan.name} at ${order.installAddress}.`;
    for (const recipient of this.notifications.adminInboxes) {
      await this.notifications.sendEmail({
        to: recipient,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        tag: 'ORDER_CONFIRMED_ADMIN',
        relatedOrderId: order.id,
        logBody,
      });
    }

    for (const mobile of this.notifications.adminMobiles) {
      await this.notifications.sendWhatsApp({
        to: mobile,
        body: rendered.sms,
        tag: 'ORDER_CONFIRMED_WHATSAPP',
        relatedOrderId: order.id,
        logBody,
      });
    }
  }

  private async loadRow(orderId: string): Promise<OrderRow> {
    const row = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: orderInclude,
    });
    if (!row) {
      throw AppException.notFound('Order');
    }
    return row;
  }

  private hash(value: string): string {
    return hashOtp(value, this.config.auth.jwtSecret);
  }

  private matches(code: string, storedHash: string): boolean {
    return otpMatches(code, storedHash, this.config.auth.jwtSecret);
  }

  private toLogDto(row: OrderRow['notifications'][number]): NotificationLogDto {
    return {
      id: row.id,
      recipient: row.recipient,
      subjectOrTag: row.subjectOrTag,
      body: row.body,
      relatedOrderId: row.relatedOrderId,
      status: row.status,
      error: row.error,
      createdAt: row.createdAt.toISOString(),
    };
  }

  toDto(row: OrderRow): OrderDto {
    return {
      id: row.id,
      customerId: row.customerId,
      customerName: `${row.customer.firstName} ${row.customer.lastName}`,
      customerEmail: row.customer.email,
      customerMobile: row.customer.mobile,
      planId: row.planId,
      planName: row.plan.name,
      planMonthlyPrice: toNumber(row.plan.monthlyPrice),
      currency: row.plan.currency,
      installAddress: row.installAddress,
      status: row.status,
      otpPending: row.status === OrderStatus.PENDING_OTP,
      otpExpiresAt: row.otpExpiresAt?.toISOString() ?? null,
      otpAttempts: row.otpAttempts,
      confirmedAt: row.confirmedAt?.toISOString() ?? null,
      subscriptionId: row.subscriptionId,
      notifications: row.notifications.map((item) => this.toLogDto(item)),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
