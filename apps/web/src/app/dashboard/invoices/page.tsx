'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { dashboardRoutes, formatCurrency, formatDate } from '@stormfiber/config';
import type { InvoiceDto, Paginated } from '@stormfiber/types';
import { EmptyState, SectionHeading } from '@stormfiber/ui';
import { apiGet } from '@/lib/api';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Paginated<InvoiceDto>>('/customer/invoices?pageSize=20')
      .then((result) => setInvoices(result.items))
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Could not load invoices'));
  }, []);

  return (
    <div>
      <SectionHeading heading="Invoices" subheading="Issued bills for this account." />
      {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
      {invoices.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No invoices yet" body="The first bill appears after your connection is activated." />
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-ink-100 rounded-2xl border border-ink-100">
          {invoices.map((invoice) => (
            <li key={invoice.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
              <div>
                <p className="font-semibold">{invoice.invoiceNumber}</p>
                <p className="text-sm text-ink-600">
                  {invoice.status === 'PAID'
                    ? `Paid${invoice.paidMethod ? ` (${invoice.paidMethod.replace('_', ' ')})` : ''}`
                    : 'Unpaid'}{' '}
                  · due {formatDate(invoice.dueDate)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatCurrency(invoice.amountDue, { currency: invoice.currency })}</p>
                <Link href={dashboardRoutes.invoiceDetail(invoice.id)} className="text-sm font-semibold text-storm-700">
                  View
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
