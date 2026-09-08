'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { formatCurrency, formatDate } from '@stormfiber/config';
import type { SubscriptionChangeRequestDto, SubscriptionDto } from '@stormfiber/types';
import { Field, FormError, FormSuccess, SelectInput, TextArea, primaryBtn } from '@/components/form-field';
import { apiGet, apiSend } from '@/lib/api';

export default function AdminSubscriptionDetailPage() {
  const params = useParams<{ id: string }>();
  const [subscription, setSubscription] = useState<SubscriptionDto | null>(null);
  const [requests, setRequests] = useState<SubscriptionChangeRequestDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function reload() {
    if (!params.id) return;
    apiGet<SubscriptionDto>(`/admin/subscriptions/${params.id}`)
      .then(setSubscription)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Subscription not found'));
    apiGet<SubscriptionChangeRequestDto[]>(`/admin/subscriptions/${params.id}/change-requests`)
      .then(setRequests)
      .catch(() => setRequests([]));
  }

  useEffect(() => {
    reload();
  }, [params.id]);

  async function review(event: FormEvent<HTMLFormElement>, request: SubscriptionChangeRequestDto) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    try {
      await apiSend<SubscriptionChangeRequestDto>(
        `/admin/subscriptions/change-requests/${request.id}`,
        {
          status: String(form.get('status') ?? 'APPROVED'),
          adminNote: String(form.get('adminNote') ?? '') || undefined,
        },
        { method: 'PATCH' },
      );
      setMessage('Change request reviewed');
      reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not review request');
    }
  }

  if (!subscription) return <p className="text-sm text-slate-400">Loading subscription…</p>;

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">{subscription.reference}</h1>
      <p className="mt-2 text-sm text-slate-400">
        {subscription.customerName ?? subscription.customerId} · {subscription.planName} · {subscription.status}
      </p>
      <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-400">Monthly</dt>
          <dd>{formatCurrency(subscription.monthlyAmount, { currency: subscription.currency })}</dd>
        </div>
        <div>
          <dt className="text-slate-400">City</dt>
          <dd>{subscription.cityName ?? subscription.cityId}</dd>
        </div>
        <div>
          <dt className="text-slate-400">Period</dt>
          <dd>
            {subscription.currentPeriodStart ? formatDate(subscription.currentPeriodStart) : '—'} –{' '}
            {subscription.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-slate-400">Next bill</dt>
          <dd>{subscription.nextBillingDate ? formatDate(subscription.nextBillingDate) : '—'}</dd>
        </div>
      </dl>
      <ul className="mt-6 space-y-2 text-sm">
        {subscription.items.map((item) => (
          <li key={item.id} className="rounded-lg border border-white/10 px-3 py-2">
            {item.label} · {formatCurrency(item.unitPrice, { currency: item.currency })}
          </li>
        ))}
      </ul>
      <FormError message={error} />
      <FormSuccess message={message} />
      <h2 className="mt-10 font-semibold">Change requests</h2>
      {requests.length === 0 ? <p className="mt-3 text-sm text-slate-400">No change requests.</p> : null}
      <div className="mt-4 space-y-4">
        {requests.map((request) => (
          <article key={request.id} className="rounded-xl border border-white/10 p-4">
            <p className="text-sm">
              {request.changeType} · {request.status}
              {request.requestedPlanName ? ` · ${request.requestedPlanName}` : ''}
            </p>
            {request.customerNote ? <p className="mt-2 text-sm text-slate-300">{request.customerNote}</p> : null}
            {request.status === 'PENDING' || request.status === 'APPROVED' ? (
              <form onSubmit={(event) => review(event, request)} className="mt-4 max-w-md space-y-3">
                <Field label="Decision">
                  <SelectInput name="status" defaultValue="APPLIED">
                    <option value="APPLIED">Apply now</option>
                    <option value="APPROVED">Approve for later</option>
                    <option value="REJECTED">Reject</option>
                  </SelectInput>
                </Field>
                <Field label="Note to customer">
                  <TextArea name="adminNote" />
                </Field>
                <button type="submit" className={primaryBtn}>
                  Save decision
                </button>
              </form>
            ) : (
              <p className="mt-2 text-xs text-slate-500">{request.adminNote}</p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
