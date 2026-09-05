import { Injectable, Logger } from '@nestjs/common';
import { InvoiceItemType, InvoiceStatus, type Prisma, SubscriptionStatus } from '@prisma/client';
import { billingPolicy } from '@stormfiber/config';
import type {
  InvoiceDto,
  InvoiceItemDto,
  Paginated,
  PriceBreakdownLine,
  PriceQuoteDto,
} from '@stormfiber/types';
import { NotificationChannel, NotificationEvent } from '@stormfiber/types';
import type { PaginationQuery } from '@stormfiber/validation';
import { AuditAction, type AuditService } from '../../common/audit/audit.service';
import { AppException } from '../../common/errors/app.exception';
import { type Db, type PrismaService } from '../../common/prisma/prisma.service';
import { type SequenceService } from '../../common/sequence/sequence.service';
import { buildPaginationMeta, toPrismaPagination } from '../../common/utils/pagination';
import { money, roundMoney, sum, toNumber, ZERO, type Money } from '../../common/utils/money';
import { invoiceNumber } from '../../common/utils/references';
import { type PricingService } from '../catalog/pricing.service';
import { type NotificationsService } from '../notifications/notifications.service';

export const invoiceInclude = {
  customer: { select: { firstName: true, lastName: true, userId: true } },
  items: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.InvoiceInclude;

export type InvoiceRow = Prisma.InvoiceGetPayload<{ include: typeof invoiceInclude }>;

export interface GenerateInvoiceInput {
  subscriptionId: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  dueDate?: Date;
  /** Charged on the first invoice only, once the connection has been installed. */
  includeInstallation?: boolean;
}

/** Statuses from which an invoice can still be paid. */
const PAYABLE: InvoiceStatus[] = [
  InvoiceStatus.GENERATED,
  InvoiceStatus.PENDING,
  InvoiceStatus.PARTIALLY_PAID,
  InvoiceStatus.OVERDUE,
];

const INVOICE_SEQUENCE_PREFIX = 'billing.invoice_sequence';

/**
 * Invoice generation and lifecycle.
 *
 * Lines are built from a fresh `PricingService` quote rather than from amounts copied at signup, so
 * a bill always reconciles with the published tariff for the customer's city and the same
 * arithmetic produces both the quote a visitor sees and the invoice they later receive.
 *
 * Invoice money is only ever changed here: the payment module moves `amountPaid` through
 * `applyPayment` and `reversePayment`, and nothing else writes these columns.
 */
@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pricing: PricingService,
    private readonly sequence: SequenceService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Issues the invoice for one subscription and billing period.
   *
   * Idempotent through the `(subscriptionId, billingPeriodStart)` unique constraint, so a retried
   * billing run — or a manual generation that overlaps one — returns the invoice that already
   * exists instead of billing the customer twice.
   */
  async generate(input: GenerateInvoiceInput): Promise<InvoiceDto> {
    const periodStart = this.startOfDay(input.billingPeriodStart);

    const existing = await this.prisma.invoice.findUnique({
      where: {
        subscriptionId_billingPeriodStart: {
          subscriptionId: input.subscriptionId,
          billingPeriodStart: periodStart,
        },
      },
      include: invoiceInclude,
    });

    if (existing) {
      return this.toDto(existing);
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { id: input.subscriptionId },
      select: {
        id: true,
        customerId: true,
        planId: true,
        cityId: true,
        status: true,
        items: { where: { isActive: true }, select: { addonId: true } },
      },
    });

    if (!subscription) {
      throw AppException.notFound('Subscription');
    }

    if (subscription.status === SubscriptionStatus.CANCELLED) {
      throw AppException.conflict('A cancelled subscription cannot be invoiced');
    }

    const quote = await this.pricing.quote({
      planId: subscription.planId,
      cityId: subscription.cityId,
      addonIds: subscription.items
        .map((item) => item.addonId)
        .filter((id): id is string => id !== null),
      includeInstallation: input.includeInstallation ?? false,
    });

    const totals = this.totalsFrom(quote);
    const dueDate = input.dueDate ?? this.dueDateFor(periodStart);

    const created = await this.prisma.$transaction(async (tx) => {
      const number = await this.nextInvoiceNumber(periodStart, tx);

      return tx.invoice.create({
        data: {
          invoiceNumber: number,
          customerId: subscription.customerId,
          subscriptionId: subscription.id,
          status: InvoiceStatus.GENERATED,
          billingPeriodStart: periodStart,
          billingPeriodEnd: this.startOfDay(input.billingPeriodEnd),
          issuedAt: new Date(),
          dueDate: this.startOfDay(dueDate),
          subtotal: totals.subtotal,
          discountTotal: totals.discountTotal,
          taxTotal: totals.taxTotal,
          total: totals.total,
          currency: quote.currency,
          items: { create: totals.items },
        },
        include: invoiceInclude,
      });
    });

    this.logger.log(`Invoice ${created.invoiceNumber} issued for subscription ${subscription.id}`);

    await this.audit.record({
      action: AuditAction.INVOICE_CREATED,
      entity: 'Invoice',
      entityId: created.id,
      newValue: {
        invoiceNumber: created.invoiceNumber,
        total: toNumber(created.total),
        billingPeriodStart: periodStart.toISOString(),
      },
    });

    await this.notifyCustomer(created, NotificationEvent.INVOICE_GENERATED);

    return this.toDto(created);
  }

  /**
   * Translates a price quote into invoice lines.
   *
   * Tax becomes the invoice's `taxTotal` rather than a line of its own, and each charge carries its
   * share of that tax so a customer can see how a line reaches its amount. The share is
   * proportional because tax is levied on the discounted subtotal, not on individual lines.
   */
  private totalsFrom(quote: PriceQuoteDto): {
    items: Prisma.InvoiceItemCreateWithoutInvoiceInput[];
    subtotal: Money;
    discountTotal: Money;
    taxTotal: Money;
    total: Money;
  } {
    const charges = quote.lines.filter((line) => line.kind !== 'TAX' && line.kind !== 'DISCOUNT');
    const discounts = quote.lines.filter((line) => line.kind === 'DISCOUNT');
    const taxes = quote.lines.filter((line) => line.kind === 'TAX');

    const subtotal = roundMoney(sum(charges.map((line) => money(line.amount))));
    // Discounts are negative in a quote; an invoice records the reduction as a positive total.
    const discountTotal = roundMoney(sum(discounts.map((line) => money(-line.amount))));
    const taxTotal = roundMoney(sum(taxes.map((line) => money(line.amount))));
    const total = roundMoney(subtotal.minus(discountTotal).plus(taxTotal));

    const effectiveRate = subtotal.isZero()
      ? ZERO()
      : roundMoney(taxTotal.dividedBy(subtotal).times(100));

    const items: Prisma.InvoiceItemCreateWithoutInvoiceInput[] = charges.map((line) => ({
      type: this.itemTypeFor(line),
      description: line.label,
      unitPrice: money(line.amount),
      amount: money(line.amount),
      taxRate: effectiveRate,
      taxAmount: subtotal.isZero()
        ? ZERO()
        : roundMoney(taxTotal.times(money(line.amount)).dividedBy(subtotal)),
      metadata: (line.meta ?? {}) as Prisma.InputJsonObject,
    }));

    for (const line of discounts) {
      items.push({
        type: InvoiceItemType.DISCOUNT,
        description: line.label,
        unitPrice: money(line.amount),
        amount: money(line.amount),
        metadata: (line.meta ?? {}) as Prisma.InputJsonObject,
      });
    }

    return { items, subtotal, discountTotal, taxTotal, total };
  }

  private itemTypeFor(line: PriceBreakdownLine): InvoiceItemType {
    switch (line.kind) {
      case 'BASE':
        return InvoiceItemType.SUBSCRIPTION;
      case 'ADDON':
        return InvoiceItemType.ADDON;
      case 'INSTALLATION':
        return InvoiceItemType.INSTALLATION;
      default:
        return InvoiceItemType.ADJUSTMENT;
    }
  }

  /** Invoice numbers restart each month, so the counter is keyed by billing period. */
  private async nextInvoiceNumber(periodStart: Date, db: Db): Promise<string> {
    const period = `${periodStart.getUTCFullYear()}${String(periodStart.getUTCMonth() + 1).padStart(2, '0')}`;

    const next = await this.sequence.next(`${INVOICE_SEQUENCE_PREFIX}.${period}`, {
      description: `Invoice counter for billing period ${period}`,
      db,
    });

    return invoiceNumber(periodStart, next);
  }

  /**
   * Runs the monthly cycle for every active subscription that is due.
   *
   * Subscriptions are billed independently: a failure on one account is logged and skipped rather
   * than aborting the run, because one broken tariff must not stop everybody else's bill.
   */
  async runBillingCycle(now = new Date()): Promise<{ generated: number; failed: number }> {
    const due = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        nextBillingDate: { not: null, lte: this.startOfDay(now) },
      },
      select: { id: true, reference: true, currentPeriodEnd: true },
      take: 500,
    });

    let generated = 0;
    let failed = 0;

    for (const subscription of due) {
      const period = this.periodAfter(subscription.currentPeriodEnd ?? now);

      try {
        await this.generate({
          subscriptionId: subscription.id,
          billingPeriodStart: period.start,
          billingPeriodEnd: period.end,
        });

        await this.prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            currentPeriodStart: period.start,
            currentPeriodEnd: period.end,
            nextBillingDate: this.nextBillingDate(period.end),
          },
        });

        generated += 1;
      } catch (error) {
        failed += 1;
        this.logger.error(
          `Billing failed for subscription ${subscription.reference}: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      }
    }

    if (generated > 0 || failed > 0) {
      this.logger.log(`Billing cycle complete: ${generated} generated, ${failed} failed`);
    }

    return { generated, failed };
  }

  /**
   * Moves unpaid invoices past their grace period to OVERDUE and tells the customer. Safe to run
   * repeatedly, because an invoice already marked overdue is no longer a candidate.
   */
  async markOverdue(now = new Date()): Promise<{ marked: number }> {
    const cutoff = new Date(now);
    cutoff.setUTCDate(cutoff.getUTCDate() - billingPolicy.overdueGraceDays);

    const candidates = await this.prisma.invoice.findMany({
      where: {
        status: {
          in: [InvoiceStatus.GENERATED, InvoiceStatus.PENDING, InvoiceStatus.PARTIALLY_PAID],
        },
        dueDate: { lt: this.startOfDay(cutoff) },
      },
      include: invoiceInclude,
      take: 500,
    });

    for (const invoice of candidates) {
      await this.prisma.invoice.update({
        where: { id: invoice.id },
        data: { status: InvoiceStatus.OVERDUE },
      });

      await this.notifyCustomer(invoice, NotificationEvent.INVOICE_OVERDUE);
    }

    if (candidates.length > 0) {
      this.logger.log(`Marked ${candidates.length} invoice(s) overdue`);
    }

    return { marked: candidates.length };
  }

  /**
   * Applies a settled payment and derives the resulting status.
   *
   * Runs inside the payment's transaction, so an invoice can never be marked paid without the
   * matching payment row — or the reverse.
   */
  async applyPayment(
    db: Db,
    invoiceId: string,
    amount: Money,
  ): Promise<{ status: InvoiceStatus; amountDue: Money }> {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      select: { total: true, amountPaid: true, status: true },
    });

    if (!invoice) {
      throw AppException.notFound('Invoice');
    }

    const amountPaid = roundMoney(money(invoice.amountPaid).plus(amount));
    const amountDue = roundMoney(money(invoice.total).minus(amountPaid));

    const status = amountDue.lessThanOrEqualTo(0)
      ? InvoiceStatus.PAID
      : amountPaid.greaterThan(0)
        ? InvoiceStatus.PARTIALLY_PAID
        : invoice.status;

    await db.invoice.update({ where: { id: invoiceId }, data: { status, amountPaid } });

    return { status, amountDue: amountDue.lessThan(0) ? ZERO() : amountDue };
  }

  /** Reverses a refunded amount, returning the invoice to an unpaid state where appropriate. */
  async reversePayment(db: Db, invoiceId: string, amount: Money): Promise<void> {
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      select: { amountPaid: true, dueDate: true },
    });

    if (!invoice) return;

    const remaining = roundMoney(money(invoice.amountPaid).minus(amount));
    const amountPaid = remaining.lessThan(0) ? ZERO() : remaining;
    const overdue = invoice.dueDate.getTime() < Date.now();

    await db.invoice.update({
      where: { id: invoiceId },
      data: {
        amountPaid,
        status: amountPaid.isZero()
          ? overdue
            ? InvoiceStatus.OVERDUE
            : InvoiceStatus.PENDING
          : InvoiceStatus.PARTIALLY_PAID,
      },
    });
  }

  /**
   * Loads an invoice for payment, refusing anything that is not currently payable.
   *
   * The amount comes from the invoice, never from the request: the browser says which invoice to
   * settle, the server decides how much that costs.
   */
  async loadPayable(
    invoiceId: string,
    customerId: string,
  ): Promise<{ id: string; invoiceNumber: string; amountDue: Money; currency: string }> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, customerId },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        total: true,
        amountPaid: true,
        currency: true,
      },
    });

    if (!invoice) {
      throw AppException.notFound('Invoice');
    }

    if (!PAYABLE.includes(invoice.status)) {
      throw AppException.of(
        'INVOICE_NOT_PAYABLE',
        invoice.status === InvoiceStatus.PAID
          ? 'This invoice has already been paid'
          : 'This invoice cannot be paid',
        409,
      );
    }

    const amountDue = roundMoney(money(invoice.total).minus(money(invoice.amountPaid)));

    if (amountDue.lessThanOrEqualTo(0)) {
      throw AppException.of('INVOICE_NOT_PAYABLE', 'There is nothing left to pay', 409);
    }

    return {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amountDue,
      currency: invoice.currency,
    };
  }

  async listForCustomer(
    customerId: string,
    query: PaginationQuery & { status?: InvoiceStatus },
  ): Promise<Paginated<InvoiceDto>> {
    const { skip, take } = toPrismaPagination(query);
    const where: Prisma.InvoiceWhereInput = {
      customerId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        include: invoiceInclude,
        orderBy: { billingPeriodStart: 'desc' },
        skip,
        take,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toDto(row)),
      pagination: buildPaginationMeta(query, total),
    };
  }

  /** Ownership is part of the query, so one customer cannot read another's invoice by id. */
  async findForCustomer(invoiceId: string, customerId: string): Promise<InvoiceDto> {
    const row = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, customerId },
      include: invoiceInclude,
    });

    if (!row) {
      throw AppException.notFound('Invoice');
    }

    return this.toDto(row);
  }

  /** The full row, used by the PDF renderer and the admin module. */
  async loadRow(invoiceId: string, customerId?: string): Promise<InvoiceRow> {
    const row = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, ...(customerId ? { customerId } : {}) },
      include: invoiceInclude,
    });

    if (!row) {
      throw AppException.notFound('Invoice');
    }

    return row;
  }

  private async notifyCustomer(invoice: InvoiceRow, event: string): Promise<void> {
    await this.notifications.dispatch({
      userId: invoice.customer.userId,
      event,
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL, NotificationChannel.SMS],
      data: {
        firstName: invoice.customer.firstName,
        invoiceNumber: invoice.invoiceNumber,
        amount: toNumber(money(invoice.total).minus(money(invoice.amountPaid))),
        currency: invoice.currency,
        dueDate: invoice.dueDate,
      },
    });
  }

  /** Billing dates are `@db.Date`; normalising to UTC midnight keeps comparisons exact. */
  private startOfDay(date: Date): Date {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  }

  private periodAfter(previousEnd: Date): { start: Date; end: Date } {
    const start = new Date(Date.UTC(previousEnd.getUTCFullYear(), previousEnd.getUTCMonth() + 1, 1));
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0));
    return { start, end };
  }

  private dueDateFor(periodStart: Date): Date {
    return new Date(
      Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth(), billingPolicy.dueDayOfMonth),
    );
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

  toDto(row: InvoiceRow): InvoiceDto {
    const outstanding = roundMoney(money(row.total).minus(money(row.amountPaid)));
    const amountDue = outstanding.lessThan(0) ? ZERO() : outstanding;

    return {
      id: row.id,
      invoiceNumber: row.invoiceNumber,
      customerId: row.customerId,
      customerName: `${row.customer.firstName} ${row.customer.lastName}`,
      subscriptionId: row.subscriptionId,
      status: row.status,
      billingPeriodStart: row.billingPeriodStart.toISOString(),
      billingPeriodEnd: row.billingPeriodEnd.toISOString(),
      issuedAt: row.issuedAt?.toISOString() ?? null,
      dueDate: row.dueDate.toISOString(),
      subtotal: toNumber(row.subtotal),
      discountTotal: toNumber(row.discountTotal),
      taxTotal: toNumber(row.taxTotal),
      total: toNumber(row.total),
      amountPaid: toNumber(row.amountPaid),
      amountDue: toNumber(amountDue),
      currency: row.currency,
      items: row.items.map((item) => this.toItemDto(item)),
      notes: row.notes,
      // Rendered on demand from the stored items, so there is never a stale copy to serve.
      pdfUrl: `/customer/invoices/${row.id}/pdf`,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toItemDto(item: InvoiceRow['items'][number]): InvoiceItemDto {
    return {
      id: item.id,
      type: item.type,
      description: item.description,
      quantity: item.quantity,
      unitPrice: toNumber(item.unitPrice),
      amount: toNumber(item.amount),
      taxRate: toNumber(item.taxRate),
      taxAmount: toNumber(item.taxAmount),
    };
  }
}
