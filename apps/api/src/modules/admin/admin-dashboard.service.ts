import { Injectable } from '@nestjs/common';
import {
  ApplicationStatus,
  CustomerStatus,
  InvoiceStatus,
  PaymentStatus,
  SubscriptionStatus,
  TicketStatus,
} from '@prisma/client';
import type {
  DashboardChartsDto,
  DashboardMetricsDto,
  NamedCountPoint,
  TimeSeriesPoint,
} from '@stormfiber/types';
import { PrismaService } from '../../common/prisma/prisma.service';
import { toNumber } from '../../common/utils/money';

const PENDING_APPLICATION: ApplicationStatus[] = [
  ApplicationStatus.SUBMITTED,
  ApplicationStatus.UNDER_REVIEW,
  ApplicationStatus.PAYMENT_PENDING,
  ApplicationStatus.PAYMENT_RECEIVED,
  ApplicationStatus.APPROVED,
  ApplicationStatus.INSTALLATION_SCHEDULED,
  ApplicationStatus.INSTALLATION_IN_PROGRESS,
];

const OUTSTANDING_INVOICE: InvoiceStatus[] = [
  InvoiceStatus.GENERATED,
  InvoiceStatus.PENDING,
  InvoiceStatus.PARTIALLY_PAID,
  InvoiceStatus.OVERDUE,
];

const OPEN_TICKET: TicketStatus[] = [
  TicketStatus.OPEN,
  TicketStatus.IN_PROGRESS,
  TicketStatus.WAITING_FOR_CUSTOMER,
];

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async metrics(): Promise<DashboardMetricsDto> {
    const monthStart = startOfUtcMonth(new Date());

    const [
      totalCustomers,
      activeCustomers,
      newApplications,
      pendingApplications,
      activeSubscriptions,
      monthlyPaid,
      outstanding,
      paidInvoices,
      openTickets,
      resolvedTickets,
      newLeads,
      waitlistCount,
    ] = await Promise.all([
      this.prisma.customer.count(),
      this.prisma.customer.count({ where: { status: CustomerStatus.ACTIVE } }),
      this.prisma.application.count({ where: { createdAt: { gte: monthStart } } }),
      this.prisma.application.count({ where: { status: { in: PENDING_APPLICATION } } }),
      this.prisma.subscription.count({ where: { status: SubscriptionStatus.ACTIVE } }),
      this.prisma.payment.aggregate({
        where: { status: PaymentStatus.SUCCEEDED, paidAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
      this.prisma.invoice.aggregate({
        where: { status: { in: OUTSTANDING_INVOICE } },
        _sum: { total: true, amountPaid: true },
        _count: true,
      }),
      this.prisma.invoice.count({
        where: { status: InvoiceStatus.PAID, issuedAt: { gte: monthStart } },
      }),
      this.prisma.ticket.count({ where: { status: { in: OPEN_TICKET } } }),
      this.prisma.ticket.count({
        where: { status: TicketStatus.RESOLVED, resolvedAt: { gte: monthStart } },
      }),
      this.prisma.coverageLead.count({ where: { createdAt: { gte: monthStart } } }),
      this.prisma.cityWaitlist.count(),
    ]);

    const outstandingAmount = Math.max(
      0,
      toNumber(outstanding._sum.total ?? 0) - toNumber(outstanding._sum.amountPaid ?? 0),
    );

    return {
      totalCustomers,
      activeCustomers,
      newApplications,
      pendingApplications,
      activeSubscriptions,
      monthlyRevenue: toNumber(monthlyPaid._sum.amount ?? 0),
      outstandingInvoices: outstanding._count,
      outstandingAmount,
      paidInvoices,
      openTickets,
      resolvedTickets,
      newLeads,
      waitlistCount,
      currency: 'PKR',
    };
  }

  async charts(days: number): Promise<DashboardChartsDto> {
    const from = new Date();
    from.setUTCDate(from.getUTCDate() - days);

    const [payments, customers, applications, tickets, popular, coverage] = await Promise.all([
      this.prisma.payment.findMany({
        where: { status: PaymentStatus.SUCCEEDED, createdAt: { gte: from } },
        select: { createdAt: true, amount: true },
      }),
      this.prisma.customer.findMany({
        where: { createdAt: { gte: from } },
        select: { createdAt: true },
      }),
      this.prisma.application.findMany({
        where: { createdAt: { gte: from } },
        select: { createdAt: true },
      }),
      this.prisma.ticket.findMany({
        where: { createdAt: { gte: from } },
        select: { createdAt: true },
      }),
      this.prisma.subscription.groupBy({
        by: ['planId'],
        where: { status: SubscriptionStatus.ACTIVE },
        _count: { planId: true },
        orderBy: { _count: { planId: 'desc' } },
        take: 6,
      }),
      this.prisma.coverageCheck.groupBy({
        by: ['result'],
        _count: { result: true },
      }),
    ]);

    const planIds = popular.map((row) => row.planId);
    const plans = planIds.length
      ? await this.prisma.plan.findMany({
          where: { id: { in: planIds } },
          select: { id: true, name: true },
        })
      : [];
    const planNames = new Map(plans.map((plan) => [plan.id, plan.name]));

    return {
      revenue: bucketSums(payments, days, (row) => toNumber(row.amount)),
      customers: bucketCounts(customers, days),
      applications: bucketCounts(applications, days),
      payments: bucketCounts(payments, days),
      tickets: bucketCounts(tickets, days),
      popularPlans: popular.map(
        (row): NamedCountPoint => ({
          label: planNames.get(row.planId) ?? 'Unknown plan',
          value: row._count.planId,
        }),
      ),
      coverageOutcomes: coverage.map(
        (row): NamedCountPoint => ({
          label: row.result,
          value: row._count.result,
        }),
      ),
    };
  }
}

function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function emptySeries(days: number): TimeSeriesPoint[] {
  const points: TimeSeriesPoint[] = [];
  const cursor = new Date();
  cursor.setUTCHours(0, 0, 0, 0);
  cursor.setUTCDate(cursor.getUTCDate() - (days - 1));
  for (let index = 0; index < days; index += 1) {
    points.push({ date: dayKey(cursor), value: 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return points;
}

function bucketCounts(rows: Array<{ createdAt: Date }>, days: number): TimeSeriesPoint[] {
  return bucketSums(rows, days, () => 1);
}

function bucketSums<T extends { createdAt: Date }>(
  rows: T[],
  days: number,
  amountOf: (row: T) => number,
): TimeSeriesPoint[] {
  const series = emptySeries(days);
  const index = new Map(series.map((point, position) => [point.date, position]));
  for (const row of rows) {
    const key = dayKey(row.createdAt);
    const position = index.get(key);
    if (position !== undefined) {
      series[position].value += amountOf(row);
    }
  }
  return series;
}
