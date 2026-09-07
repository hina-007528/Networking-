'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { dashboardRoutes, formatCurrency, formatDate } from '@stormfiber/config';
import type { BillingSummaryDto, InvoiceDto, Paginated } from '@stormfiber/types';
import { SectionHeading } from '@stormfiber/ui';
import { FormError } from '@/components/form-field';
import { PaymentInstructions } from '@/components/payment-instructions';
import { apiGet } from '@/lib/api';

function invoiceLabel(invoice: InvoiceDto): string {
  if (invoice.status === 'PAID') {
    return invoice.paidMethod ? `Paid (${invoice.paidMethod.replace('_', ' ')})` : 'Paid';
  }
  return 'Unpaid';
}

export default function BillingPage() {
  const [summary, setSummary] = useState<BillingSummaryDto | null>(null);
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiGet<BillingSummaryDto>('/customer/invoices/summary'),
      apiGet<Paginated<InvoiceDto>>('/customer/invoices?pageSize=20'),
    ])
      .then(([nextSummary, nextInvoices]) => {
        setSummary(nextSummary);
        setInvoices(nextInvoices.items);
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Could not load billing'));
  }, []);

  if (!summary && !error) return <p className="text-sm text-ink-600">Loading billing…</p>;

  return (
    <div>
      <SectionHeading
        heading="Billing"
        subheading="Invoices stay on this account. Payment is collected offline — there is no Pay Now button."
      />
      {error ? <FormError message={error} /> : null}
      {summary ? (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-ink-100 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">Current balance</p>
            <p className="mt-2 font-display text-3xl font-semibold">
              {formatCurrency(summary.currentBalance, { currency: summary.currency })}
            </p>
          </div>
          <div className="rounded-2xl border border-ink-100 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">Next invoice</p>
            <p className="mt-2 font-display text-3xl font-semibold">{formatDate(summary.nextInvoiceDate)}</p>
          </div>
        </div>
      ) : null}
      <div className="mt-6">
        <PaymentInstructions compact />
      </div>
      <h2 className="mt-10 font-display text-xl font-semibold">Invoices</h2>
      <ul className="mt-4 divide-y divide-ink-100 rounded-2xl border border-ink-100">
        {invoices.length === 0 ? (
          <li className="px-4 py-6 text-sm text-ink-600">No invoices yet.</li>
        ) : (
          invoices.map((invoice) => (
            <li key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 text-sm">
              <div>
                <p className="font-semibold">{invoice.invoiceNumber}</p>
                <p className="text-ink-600">
                  {invoiceLabel(invoice)} · due {formatDate(invoice.dueDate)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatCurrency(invoice.amountDue, { currency: invoice.currency })}</p>
                <Link href={dashboardRoutes.invoiceDetail(invoice.id)} className="font-semibold text-storm-700">
                  View
                </Link>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
