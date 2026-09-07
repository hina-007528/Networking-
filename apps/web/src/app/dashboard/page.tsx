'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { dashboardRoutes, formatCurrency, formatDate, publicRoutes } from '@stormfiber/config';
import type {
  BillingSummaryDto,
  CustomerDto,
  InvoiceDto,
  NotificationDto,
  Paginated,
  SubscriptionDto,
  TicketDto,
} from '@stormfiber/types';
import { EmptyState, ErrorState, LoadingSkeleton } from '@stormfiber/ui';
import { apiGet, readItems } from '@/lib/api';

export default function DashboardHomePage() {
  const [profile, setProfile] = useState<CustomerDto | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionDto | null>(null);
  const [billing, setBilling] = useState<BillingSummaryDto | null>(null);
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [tickets, setTickets] = useState<TicketDto[]>([]);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      apiGet<CustomerDto>('/customer/profile'),
      apiGet<SubscriptionDto | null>('/customer/subscription'),
      apiGet<BillingSummaryDto>('/customer/invoices/summary'),
      apiGet<Paginated<InvoiceDto>>('/customer/invoices?pageSize=4').catch(() => ({ items: [] as InvoiceDto[] })),
      apiGet<Paginated<TicketDto>>('/tickets?pageSize=4').catch(() => ({ items: [] as TicketDto[] })),
      apiGet<Paginated<NotificationDto>>('/notifications?pageSize=4').catch(() => ({ items: [] as NotificationDto[] })),
    ])
      .then(([nextProfile, nextSubscription, nextBilling, invoicePage, ticketPage, noticePage]) => {
        if (cancelled) return;
        setProfile(nextProfile);
        setSubscription(nextSubscription);
        setBilling(nextBilling);
        setInvoices(readItems(invoicePage));
        setTickets(readItems(ticketPage));
        setNotifications(readItems(noticePage));
      })
      .catch((caught: unknown) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : 'Could not load the dashboard');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <ErrorState body={error} />;
  if (!profile || !billing) return <LoadingSkeleton lines={8} />;

  const payHref = billing.latestInvoice
    ? dashboardRoutes.invoiceDetail(billing.latestInvoice.id)
    : dashboardRoutes.invoices;
  const unread = notifications.filter((item) => !item.readAt).length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#2E86DE]">Customer portal</p>
          <h1 className="mt-1 font-display text-3xl font-extrabold text-[#0C2340]">Hello, {profile.firstName}</h1>
          <p className="mt-1 text-sm text-[#4B5563]">
            {profile.accountNumber} · {profile.cityName}
            {profile.areaName ? ` · ${profile.areaName}` : ''} · {profile.status}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={payHref}
            className="inline-flex h-11 items-center rounded-xl bg-[#2E86DE] px-5 text-sm font-bold text-white hover:bg-[#145DA0]"
          >
            Pay bill
          </Link>
          <Link
            href={dashboardRoutes.ticketNew}
            className="inline-flex h-11 items-center rounded-xl border border-[#0C2340] px-5 text-sm font-bold text-[#0C2340]"
          >
            Open ticket
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Balance"
          value={formatCurrency(billing.currentBalance, { currency: billing.currency })}
          hint={billing.overdueInvoiceCount ? `${billing.overdueInvoiceCount} overdue` : 'From live invoices'}
        />
        <Stat
          label="Plan"
          value={subscription?.planName ?? 'Not activated'}
          hint={subscription ? subscription.status : 'Appears after installation'}
        />
        <Stat label="Next invoice" value={formatDate(billing.nextInvoiceDate)} hint={billing.autoPayEnabled ? 'Auto-pay on' : 'Auto-pay off'} />
        <Stat
          label="Notifications"
          value={String(unread || notifications.length)}
          hint={unread ? 'Unread messages' : 'All caught up'}
        />
      </div>

      {billing.overdueInvoiceCount > 0 ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {billing.overdueInvoiceCount} overdue invoice{billing.overdueInvoiceCount === 1 ? '' : 's'} totalling{' '}
          {formatCurrency(billing.overdueAmount, { currency: billing.currency })}.{' '}
          <Link href={dashboardRoutes.invoices} className="font-semibold underline">
            Review invoices
          </Link>
        </p>
      ) : null}

      {subscription ? (
        <div className="rounded-2xl border border-[#E6EEF6] bg-white p-6 shadow-[0_8px_30px_rgb(12_35_64/0.05)]">
          <p className="text-xs font-bold uppercase tracking-widest text-[#2E86DE]">Current subscription</p>
          <p className="mt-2 font-display text-2xl font-extrabold text-[#0C2340]">{subscription.planName}</p>
          <p className="mt-1 text-sm text-[#4B5563]">
            {subscription.status}
            {subscription.planSpeedMbps ? ` · ${subscription.planSpeedMbps} Mbps` : ''} ·{' '}
            {formatCurrency(subscription.monthlyAmount, { currency: subscription.currency })} / month
          </p>
          {subscription.services.length ? (
            <p className="mt-2 text-sm text-[#6B7280]">{subscription.services.join(' · ')}</p>
          ) : null}
          <Link href={dashboardRoutes.subscription} className="mt-4 inline-block text-sm font-semibold text-[#145DA0]">
            Manage subscription →
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-[#E6EEF6] bg-white p-6">
          <EmptyState
            title="No active subscription yet"
            body="Once installation is complete, your plan and billing cycle appear here."
          />
          <Link href={publicRoutes.checkAvailability} className="mt-4 inline-flex text-sm font-semibold text-[#145DA0]">
            Check coverage →
          </Link>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Recent invoices" href={dashboardRoutes.invoices} empty="No invoices yet.">
          {invoices.map((invoice) => (
            <Link
              key={invoice.id}
              href={dashboardRoutes.invoiceDetail(invoice.id)}
              className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 hover:bg-[#F3F7FC]"
            >
              <div>
                <p className="font-semibold text-[#0C2340]">{invoice.invoiceNumber}</p>
                <p className="text-xs text-[#6B7280]">
                  {invoice.status} · due {formatDate(invoice.dueDate)}
                </p>
              </div>
              <p className="text-sm font-semibold">{formatCurrency(invoice.amountDue, { currency: invoice.currency })}</p>
            </Link>
          ))}
        </Panel>
        <Panel title="Support tickets" href={dashboardRoutes.tickets} empty="No tickets yet.">
          {tickets.map((ticket) => (
            <Link
              key={ticket.id}
              href={dashboardRoutes.ticketDetail(ticket.id)}
              className="block rounded-xl px-3 py-3 hover:bg-[#F3F7FC]"
            >
              <p className="font-semibold text-[#0C2340]">{ticket.subject}</p>
              <p className="text-xs text-[#6B7280]">
                {ticket.reference} · {ticket.status} · {ticket.priority}
              </p>
            </Link>
          ))}
        </Panel>
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-[#E6EEF6] bg-white p-5 shadow-[0_8px_30px_rgb(12_35_64/0.04)]">
      <p className="text-xs font-bold uppercase tracking-widest text-[#6B7280]">{label}</p>
      <p className="mt-2 font-display text-2xl font-extrabold text-[#0C2340]">{value}</p>
      <p className="mt-1 text-xs text-[#2E86DE]">{hint}</p>
    </div>
  );
}

function Panel({
  title,
  href,
  empty,
  children,
}: {
  title: string;
  href: string;
  empty: string;
  children: React.ReactNode;
}) {
  const items = Array.isArray(children) ? children : [children];
  const hasItems = items.filter(Boolean).length > 0;

  return (
    <div className="rounded-2xl border border-[#E6EEF6] bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-display font-bold text-[#0C2340]">{title}</p>
        <Link href={href} className="text-xs font-bold text-[#145DA0]">
          View all
        </Link>
      </div>
      {hasItems ? <div className="divide-y divide-[#E6EEF6]">{children}</div> : <p className="py-8 text-center text-sm text-[#6B7280]">{empty}</p>}
    </div>
  );
}
