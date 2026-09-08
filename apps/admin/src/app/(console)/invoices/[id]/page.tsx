'use client';

import type { FormEvent } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { formatCurrency, formatDate } from '@stormfiber/config';
import type { InvoiceDto } from '@stormfiber/types';
import { Field, FormError, FormSuccess, SelectInput } from '@/components/form-field';
import { apiGet, apiSend } from '@/lib/api';

export default function AdminInvoiceDetailPage() {
  const params = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<InvoiceDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    if (!params.id) return;
    apiGet<InvoiceDto>(`/admin/invoices/${params.id}`)
      .then(setInvoice)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Invoice not found'));
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function markPaid(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!invoice) return;
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError(null);
    try {
      const updated = await apiSend<InvoiceDto>(
        `/admin/invoices/${invoice.id}/mark-paid`,
        { method: String(form.get('method') ?? 'cash') },
        { method: 'PUT' },
      );
      setInvoice(updated);
      setMessage('Invoice marked paid');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not mark paid');
    } finally {
      setLoading(false);
    }
  }

  if (error && !invoice) return <FormError message={error} />;
  if (!invoice) return <p className="text-sm text-slate-400">Loading invoice…</p>;

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">{invoice.invoiceNumber}</h1>
      <p className="mt-2 text-sm text-slate-400">
        {invoice.customerName} · {invoice.status} · due {formatDate(invoice.dueDate)}
      </p>
      <p className="mt-4 text-lg font-semibold">
        Due {formatCurrency(invoice.amountDue, { currency: invoice.currency })} of{' '}
        {formatCurrency(invoice.total, { currency: invoice.currency })}
      </p>
      {invoice.paidMethod ? (
        <p className="mt-2 text-sm text-slate-300">
          Marked paid by {invoice.paidByAdminName ?? 'staff'} via {invoice.paidMethod.replace('_', ' ')}
        </p>
      ) : null}
      <table className="mt-6 w-full text-left text-sm">
        <thead className="text-slate-400">
          <tr>
            <th className="py-2">Line</th>
            <th>Qty</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item) => (
            <tr key={item.id} className="border-t border-white/10">
              <td className="py-3">{item.description}</td>
              <td>{item.quantity}</td>
              <td>{formatCurrency(item.amount, { currency: invoice.currency })}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {invoice.amountDue > 0 ? (
        <form onSubmit={(event) => void markPaid(event)} className="mt-8 max-w-sm space-y-4">
          <Field label="Payment method">
            <SelectInput name="method" defaultValue="cash">
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank transfer</option>
              <option value="office">Paid at office</option>
            </SelectInput>
          </Field>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 items-center rounded-lg bg-cyan-500 px-5 text-sm font-semibold text-slate-950 disabled:opacity-60"
          >
            {loading ? 'Saving…' : 'Mark paid'}
          </button>
        </form>
      ) : null}
      <FormError message={error} />
      <FormSuccess message={message} />
    </div>
  );
}
