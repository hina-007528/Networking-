'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { adminRoutes, formatDateTime } from '@stormfiber/config';
import type { OrderDto } from '@stormfiber/types';
import { FormError, FormSuccess, primaryBtn } from '@/components/form-field';
import { apiGet, apiSend } from '@/lib/api';

const NEXT_ACTIONS: Record<string, Array<{ status: 'CANCELLED' | 'SCHEDULED' | 'INSTALLED'; label: string }>> = {
  PENDING_OTP: [{ status: 'CANCELLED', label: 'Cancel order' }],
  EXPIRED: [{ status: 'CANCELLED', label: 'Cancel order' }],
  CONFIRMED: [
    { status: 'SCHEDULED', label: 'Mark scheduled' },
    { status: 'CANCELLED', label: 'Cancel order' },
  ],
  SCHEDULED: [
    { status: 'INSTALLED', label: 'Mark installed' },
    { status: 'CANCELLED', label: 'Cancel order' },
  ],
};

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!params.id) return;
    apiGet<OrderDto>(`/admin/orders/${params.id}`)
      .then(setOrder)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Order not found'));
  }, [params.id]);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 10000);
    return () => window.clearInterval(timer);
  }, [load]);

  async function updateStatus(status: 'CANCELLED' | 'SCHEDULED' | 'INSTALLED') {
    if (!order) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await apiSend<OrderDto>(`/admin/orders/${order.id}`, { status }, { method: 'PUT' });
      setOrder(updated);
      setMessage(`Order set to ${status.replace('_', ' ').toLowerCase()}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update this order');
    } finally {
      setSaving(false);
    }
  }

  if (error && !order) return <FormError message={error} />;
  if (!order) return <p className="text-sm text-slate-400">Loading order…</p>;

  const actions = NEXT_ACTIONS[order.status] ?? [];

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">{order.customerName}</h1>
      <p className="mt-2 text-sm text-slate-400">
        {order.planName} · {order.status.replace('_', ' ')} · {formatDateTime(order.createdAt)}
      </p>
      <p className="mt-3 flex flex-wrap gap-3 text-sm">
        <Link href={adminRoutes.customerDetail(order.customerId)} className="font-semibold text-cyan-300">
          Open customer account
        </Link>
        {order.subscriptionId ? (
          <Link href={adminRoutes.subscriptionDetail(order.subscriptionId)} className="font-semibold text-cyan-300">
            Open subscription
          </Link>
        ) : null}
      </p>
      <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-400">Phone</dt>
          <dd>{order.customerMobile}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Email</dt>
          <dd>{order.customerEmail}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-slate-400">Installation address</dt>
          <dd>{order.installAddress}</dd>
        </div>
        <div>
          <dt className="text-slate-400">OTP status</dt>
          <dd>{order.otpPending ? 'Awaiting code' : order.status.replace('_', ' ')}</dd>
        </div>
        <div>
          <dt className="text-slate-400">OTP attempts</dt>
          <dd>{order.otpAttempts}</dd>
        </div>
      </dl>
      {actions.length > 0 ? (
        <div className="mt-6 flex flex-wrap gap-3">
          {actions.map((action) => (
            <button
              key={action.status}
              type="button"
              disabled={saving}
              className={primaryBtn}
              onClick={() => void updateStatus(action.status)}
            >
              {saving ? 'Saving…' : action.label}
            </button>
          ))}
        </div>
      ) : null}
      <FormError message={error} />
      <FormSuccess message={message} />
      <h2 className="mt-10 font-display text-xl font-semibold">Notifications</h2>
      <ul className="mt-4 space-y-3 text-sm">
        {order.notifications.length === 0 ? (
          <li className="text-slate-400">No emails or WhatsApp messages logged for this order yet.</li>
        ) : (
          order.notifications.map((item) => (
            <li key={item.id} className="rounded-xl border border-white/10 px-4 py-3">
              <p className="font-semibold">
                {item.subjectOrTag} · {item.status}
              </p>
              <p className="mt-1 text-slate-400">{item.recipient}</p>
              <p className="mt-1 text-slate-300">{item.body}</p>
              {item.error ? <p className="mt-1 text-red-400">{item.error}</p> : null}
              <p className="mt-1 text-xs text-slate-500">{formatDateTime(item.createdAt)}</p>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
