'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { formatCurrency, formatDate } from '@stormfiber/config';
import type { InvoiceDto } from '@stormfiber/types';
import { SectionHeading } from '@stormfiber/ui';
import { FormError } from '@/components/form-field';
import { PaymentInstructions } from '@/components/payment-instructions';
import { apiBlob, apiGet } from '@/lib/api';

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<InvoiceDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    apiGet<InvoiceDto>(`/customer/invoices/${params.id}`)
      .then(setInvoice)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Invoice not found'));
  }, [params.id]);

  async function downloadPdf() {
    if (!invoice) return;
    const blob = await apiBlob(`/customer/invoices/${invoice.id}/pdf`);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${invoice.invoiceNumber}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!invoice) return <p className="text-sm text-ink-600">Loading invoice…</p>;

  const paidLabel =
    invoice.status === 'PAID'
      ? invoice.paidMethod
        ? `Paid (${invoice.paidMethod.replace('_', ' ')})`
        : 'Paid'
      : 'Unpaid';

  return (
    <div>
      <SectionHeading heading={invoice.invoiceNumber} subheading={`${paidLabel} · due ${formatDate(invoice.dueDate)}`} />
      <ul className="mt-6 space-y-2 text-sm">
        {invoice.items.map((item) => (
          <li key={item.id} className="flex justify-between gap-4">
            <span>{item.description}</span>
            <span>{formatCurrency(item.amount, { currency: invoice.currency })}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-lg font-semibold">
        Amount due {formatCurrency(invoice.amountDue, { currency: invoice.currency })}
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button type="button" onClick={() => void downloadPdf()} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-ink-200 px-5 text-sm font-semibold">
          Download PDF
        </button>
      </div>
      {invoice.amountDue > 0 ? (
        <div className="mt-6">
          <PaymentInstructions compact />
        </div>
      ) : null}
      <FormError message={error} />
    </div>
  );
}
