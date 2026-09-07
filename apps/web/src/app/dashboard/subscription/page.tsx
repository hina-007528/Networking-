'use client';

import { type FormEvent, useEffect, useState } from 'react';
import { formatCurrency, formatDate } from '@stormfiber/config';
import type { Paginated, PlanDto, SubscriptionChangeRequestDto, SubscriptionDto } from '@stormfiber/types';
import { subscriptionChangeRequestSchema } from '@stormfiber/validation';
import { EmptyState, SectionHeading } from '@stormfiber/ui';
import { Field, FormError, FormSuccess, SelectInput, TextArea } from '@/components/form-field';
import { apiGet, apiSend } from '@/lib/api';

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<SubscriptionDto | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionDto[]>([]);
  const [requests, setRequests] = useState<SubscriptionChangeRequestDto[]>([]);
  const [plans, setPlans] = useState<PlanDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      apiGet<SubscriptionDto[]>('/customer/subscription/all'),
      apiGet<SubscriptionChangeRequestDto[]>('/customer/subscription/change-requests'),
      apiGet<Paginated<PlanDto>>('/plans?pageSize=24'),
    ])
      .then(([nextSubscriptions, nextRequests, nextPlans]) => {
        setSubscription(nextSubscriptions[0] ?? null);
        setSubscriptions(nextSubscriptions);
        setRequests(nextRequests);
        setPlans(nextPlans.items);
      })
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Could not load subscription'));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = subscriptionChangeRequestSchema.safeParse({
      changeType: String(form.get('changeType') ?? 'UPGRADE'),
      requestedPlanId: String(form.get('requestedPlanId') ?? '') || undefined,
      customerNote: String(form.get('customerNote') ?? '') || undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the request');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const created = await apiSend<SubscriptionChangeRequestDto>('/customer/subscription/change-requests', parsed.data);
      setRequests((current) => [created, ...current]);
      setMessage(`Request ${created.id.slice(0, 8)} sent for review`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not send the request');
    } finally {
      setLoading(false);
    }
  }

  if (!subscription) {
    return <EmptyState title="No subscription yet" body="Order a plan and confirm the emailed code. The same subscription row appears here and in the admin console." />;
  }

  return (
    <div>
      <SectionHeading heading="Your services" subheading="These are the same subscription records staff can edit." />
      <ul className="mt-6 grid gap-4">
        {subscriptions.map((item) => (
          <li key={item.id} className="rounded-2xl border border-ink-100 p-5">
            <p className="font-display text-xl font-semibold">{item.planName}</p>
            <p className="mt-1 text-sm text-ink-600">
              {item.status} · {item.reference}
            </p>
            <p className="mt-2 text-sm text-ink-700">
              {formatCurrency(item.monthlyAmount, { currency: item.currency })} / month
              {item.nextBillingDate ? ` · next bill ${formatDate(item.nextBillingDate)}` : ''}
            </p>
          </li>
        ))}
      </ul>
      <form onSubmit={onSubmit} className="mt-8 max-w-lg space-y-4 rounded-2xl border border-ink-100 p-6">
        <Field label="Request type">
          <SelectInput name="changeType" defaultValue="UPGRADE">
            <option value="UPGRADE">Upgrade</option>
            <option value="DOWNGRADE">Downgrade</option>
            <option value="CANCELLED">Cancel</option>
          </SelectInput>
        </Field>
        <Field label="Requested plan">
          <SelectInput name="requestedPlanId">
            <option value="">Select if changing plan</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Note">
          <TextArea name="customerNote" rows={3} />
        </Field>
        <FormError message={error} />
        <FormSuccess message={message} />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-11 items-center rounded-lg bg-surge-600 px-5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? 'Sending…' : 'Send for review'}
        </button>
      </form>
      <h2 className="mt-10 font-display text-xl font-semibold">Change requests</h2>
      <ul className="mt-4 space-y-3 text-sm">
        {requests.map((request) => (
          <li key={request.id} className="rounded-xl border border-ink-100 px-4 py-3">
            {request.changeType} · {request.status}
            {request.requestedPlanName ? ` · ${request.requestedPlanName}` : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}
