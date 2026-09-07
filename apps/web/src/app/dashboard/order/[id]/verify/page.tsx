'use client';

import { type FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { dashboardRoutes } from '@stormfiber/config';
import type { CreateOrderResult, OrderDto } from '@stormfiber/types';
import { FormError, FormSuccess } from '@/components/form-field';
import { apiGet, apiSend } from '@/lib/api';

export default function OrderVerifyPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDto | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    apiGet<OrderDto>(`/orders/${params.id}`)
      .then((next) => {
        setOrder(next);
        if (next.status === 'CONFIRMED') {
          router.replace(dashboardRoutes.subscription);
        }
      })
      .catch((caught: unknown) =>
        setError(caught instanceof Error ? caught.message : 'Could not load this order'),
      );
  }, [params.id, router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!order) return;
    setLoading(true);
    setError(null);
    try {
      const confirmed = await apiSend<OrderDto>(`/orders/${order.id}/verify-otp`, { code: code.trim() });
      setOrder(confirmed);
      setMessage('Order confirmed. Your subscription is now on file.');
      router.replace(dashboardRoutes.subscription);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That code could not be verified');
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    if (!order) return;
    setResending(true);
    setError(null);
    setMessage(null);
    try {
      const result = await apiSend<CreateOrderResult>(`/orders/${order.id}/resend-otp`, {});
      setOrder(result.order);
      setMessage('A new code was emailed. It is valid for 10 minutes.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not resend the code');
    } finally {
      setResending(false);
    }
  }

  if (!order && !error) {
    return <p className="text-sm text-[#6B7280]">Loading confirmation…</p>;
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6 sm:px-0">
      <h1 className="font-display text-2xl font-extrabold text-[#0C2340] sm:text-3xl">
        Enter the code we emailed you
      </h1>
      <p className="mt-2 text-sm text-[#6B7280]">
        {order
          ? `A 6-digit code was sent to ${order.customerEmail} for ${order.planName}. It expires in 10 minutes.`
          : 'Check your inbox for the 6-digit confirmation code.'}
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block text-sm font-semibold text-[#0C2340]" htmlFor="otp">
          Confirmation code
        </label>
        <input
          id="otp"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
          className="sf-input w-full tracking-[0.4em] text-center text-xl"
          placeholder="••••••"
          required
        />
        <FormError message={error} />
        <FormSuccess message={message} />
        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="sf-btn sf-btn-primary min-h-11 w-full justify-center disabled:opacity-60"
        >
          {loading ? 'Confirming…' : 'Confirm order'}
        </button>
      </form>
      <button
        type="button"
        onClick={() => void resend()}
        disabled={resending}
        className="mt-4 min-h-11 w-full text-sm font-semibold text-[#2E86DE] disabled:opacity-60"
      >
        {resending ? 'Sending…' : 'Resend code'}
      </button>
      <p className="mt-6 text-center text-sm text-[#6B7280]">
        <Link href={dashboardRoutes.root} className="font-semibold text-[#2E86DE]">
          Back to My Account
        </Link>
      </p>
    </div>
  );
}
