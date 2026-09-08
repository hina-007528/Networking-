'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { formatCurrency, formatDateTime } from '@stormfiber/config';
import type { PaymentDto, RefundDto } from '@stormfiber/types';
import { Field, FormError, FormSuccess, TextArea, TextInput, primaryBtn } from '@/components/form-field';
import { apiGet, apiSend } from '@/lib/api';

export default function AdminPaymentDetailPage() {
  const params = useParams<{ id: string }>();
  const [payment, setPayment] = useState<PaymentDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!params.id) return;
    apiGet<PaymentDto>(`/admin/payments/${params.id}`)
      .then(setPayment)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Payment not found'));
  }, [params.id]);

  async function refund(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!payment) return;
    const form = new FormData(event.currentTarget);
    setError(null);
    try {
      await apiSend<RefundDto>('/admin/refunds', {
        paymentId: payment.id,
        amount: Number(form.get('amount') ?? payment.amount),
        reason: String(form.get('reason') ?? ''),
      });
      setMessage('Refund issued');
      apiGet<PaymentDto>(`/admin/payments/${payment.id}`).then(setPayment);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not refund');
    }
  }

  if (!payment && !error) return <p className="text-sm text-slate-400">Loading payment…</p>;
  if (!payment) return <FormError message={error} />;

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">{payment.reference}</h1>
      <p className="mt-2 text-sm text-slate-400">
        {payment.status} · {payment.method} · {formatDateTime(payment.createdAt)}
      </p>
      <p className="mt-4 text-lg font-semibold">{formatCurrency(payment.amount, { currency: payment.currency })}</p>
      {payment.invoiceNumber ? <p className="mt-2 text-sm text-slate-400">Invoice {payment.invoiceNumber}</p> : null}
      <FormError message={error} />
      <FormSuccess message={message} />
      {payment.status === 'SUCCEEDED' || payment.status === 'PARTIALLY_REFUNDED' ? (
        <form onSubmit={refund} className="mt-8 max-w-md space-y-3">
          <h2 className="font-semibold">Refund</h2>
          <Field label="Amount">
            <TextInput name="amount" type="number" step="0.01" required defaultValue={payment.amount} />
          </Field>
          <Field label="Reason">
            <TextArea name="reason" required />
          </Field>
          <button type="submit" className={primaryBtn}>
            Issue refund
          </button>
        </form>
      ) : null}
    </div>
  );
}
