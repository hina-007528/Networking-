'use client';

import { type FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { dashboardRoutes, formatCurrency } from '@stormfiber/config';
import type { CreateOrderResult } from '@stormfiber/types';
import { FormError } from '@/components/form-field';
import { apiGet, apiSend } from '@/lib/api';

interface OrderPreview {
  planId: string;
  planName: string;
  planMonthlyPrice: number;
  currency: string;
  installAddress: string;
  customerName: string;
  customerEmail: string;
}

export default function OrderReviewPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [preview, setPreview] = useState<OrderPreview | null>(null);
  const [address, setAddress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    apiGet<OrderPreview>(`/orders/preview/${params.id}`)
      .then((next) => {
        setPreview(next);
        setAddress(next.installAddress);
      })
      .catch((caught: unknown) =>
        setError(caught instanceof Error ? caught.message : 'Could not load this plan'),
      );
  }, [params.id]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!preview) return;
    setLoading(true);
    setError(null);
    try {
      const result = await apiSend<CreateOrderResult>('/orders', {
        planId: preview.planId,
        installAddress: address.trim(),
      });
      router.replace(dashboardRoutes.orderVerify(result.order.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not submit the order');
    } finally {
      setLoading(false);
    }
  }

  if (error && !preview) {
    return <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>;
  }

  if (!preview) {
    return <p className="text-sm text-[#6B7280]">Loading order review…</p>;
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-6 sm:px-0">
      <h1 className="font-display text-2xl font-extrabold text-[#0C2340] sm:text-3xl">Review your order</h1>
      <p className="mt-2 text-sm text-[#6B7280]">
        Confirm the plan and installation address. We will email a 6-digit code to {preview.customerEmail}.
      </p>
      <dl className="mt-6 space-y-3 rounded-2xl border border-[#E6EEF6] bg-white p-5 text-sm">
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-[#6B7280]">Customer</dt>
          <dd className="font-semibold text-[#0C2340]">{preview.customerName}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-[#6B7280]">Plan</dt>
          <dd className="font-semibold text-[#0C2340]">{preview.planName}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          <dt className="text-[#6B7280]">Monthly price</dt>
          <dd className="font-semibold text-[#0C2340]">
            {formatCurrency(preview.planMonthlyPrice, { currency: preview.currency })}
          </dd>
        </div>
      </dl>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block text-sm font-semibold text-[#0C2340]" htmlFor="installAddress">
          Installation address
        </label>
        <textarea
          id="installAddress"
          required
          minLength={10}
          rows={3}
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          className="sf-input min-h-24 w-full"
        />
        <FormError message={error} />
        <button
          type="submit"
          disabled={loading}
          className="sf-btn sf-btn-primary min-h-11 w-full justify-center disabled:opacity-60"
        >
          {loading ? 'Sending code…' : 'Email me a confirmation code'}
        </button>
      </form>
    </div>
  );
}
