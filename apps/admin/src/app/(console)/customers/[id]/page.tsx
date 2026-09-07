'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { adminRoutes } from '@stormfiber/config';
import { formatCurrency, formatDate } from '@stormfiber/config';
import type { CustomerDto, Paginated, PlanDto, SubscriptionDto } from '@stormfiber/types';
import { Field, FormError, FormSuccess, SelectInput, TextInput } from '@/components/form-field';
import { apiDelete, apiGet, apiSend, readItems } from '@/lib/api';

const DESTRUCTIVE_CUSTOMER = new Set(['SUSPENDED', 'CHURNED']);
const DESTRUCTIVE_SUB = new Set(['SUSPENDED', 'CANCELLED']);

export default function AdminCustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerDto | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionDto[]>([]);
  const [plans, setPlans] = useState<PlanDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState<{ title: string; body: string; run: () => Promise<void> } | null>(null);

  const load = useCallback(async (id: string) => {
    const [nextCustomer, nextSubs, nextPlans] = await Promise.all([
      apiGet<CustomerDto>(`/admin/customers/${id}`),
      apiGet<SubscriptionDto[]>(`/admin/customers/${id}/subscriptions`),
      apiGet<Paginated<PlanDto>>('/plans?pageSize=50'),
    ]);
    setCustomer(nextCustomer);
    setSubscriptions(nextSubs);
    setPlans(readItems(nextPlans));
  }, []);

  useEffect(() => {
    if (!params.id) return;
    load(params.id).catch((caught: unknown) =>
      setError(caught instanceof Error ? caught.message : 'Customer not found'),
    );
  }, [load, params.id]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customer) return;
    const form = new FormData(event.currentTarget);
    const nextStatus = String(form.get('status') ?? customer.status);
    const payload = {
      firstName: String(form.get('firstName') ?? customer.firstName),
      lastName: String(form.get('lastName') ?? customer.lastName),
      email: String(form.get('email') ?? customer.email),
      mobile: String(form.get('mobile') ?? customer.mobile),
      addressLine: String(form.get('addressLine') ?? customer.addressLine),
      status: nextStatus,
    };

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const updated = await apiSend<CustomerDto>(`/admin/customers/${customer.id}`, payload, { method: 'PUT' });
        setCustomer(updated);
        setMessage('Customer profile updated');
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Could not update customer');
      } finally {
        setLoading(false);
        setConfirm(null);
      }
    };

    if (DESTRUCTIVE_CUSTOMER.has(nextStatus) && nextStatus !== customer.status) {
      setConfirm({
        title: 'Change account status?',
        body: `This will set ${customer.fullName} to ${nextStatus === 'CHURNED' ? 'terminated' : 'suspended'}.`,
        run,
      });
      return;
    }

    await run();
  }

  async function saveSubscription(event: FormEvent<HTMLFormElement>, subscription: SubscriptionDto) {
    event.preventDefault();
    if (!customer) return;
    const form = new FormData(event.currentTarget);
    const status = String(form.get('status') ?? subscription.status);
    const payload = {
      subscriptionId: subscription.id,
      planId: String(form.get('planId') ?? subscription.planId),
      status,
      startedAt: String(form.get('startedAt') ?? '') || null,
      currentPeriodEnd: String(form.get('currentPeriodEnd') ?? '') || null,
    };

    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const updated = await apiSend<SubscriptionDto>(`/admin/customers/${customer.id}/subscription`, payload, {
          method: 'PUT',
        });
        setSubscriptions((current) => current.map((row) => (row.id === updated.id ? updated : row)));
        setMessage('Subscription updated — the customer My Account view reads this same row');
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Could not update subscription');
      } finally {
        setLoading(false);
        setConfirm(null);
      }
    };

    if (DESTRUCTIVE_SUB.has(status) && status !== subscription.status) {
      setConfirm({
        title: 'Change this subscription?',
        body: `Set ${subscription.planName} to ${status.toLowerCase()}?`,
        run,
      });
      return;
    }

    await run();
  }

  async function addSubscription(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customer) return;
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError(null);
    try {
      const created = await apiSend<SubscriptionDto>(`/admin/customers/${customer.id}/subscriptions`, {
        planId: String(form.get('planId')),
        status: String(form.get('status') ?? 'PENDING'),
      });
      setSubscriptions((current) => [created, ...current]);
      setMessage('Subscription added');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not add subscription');
    } finally {
      setLoading(false);
    }
  }

  if (!customer) return <p className="text-sm text-slate-400">Loading customer…</p>;

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">{customer.fullName}</h1>
      <p className="mt-2 text-sm text-slate-400">
        {customer.accountNumber} · {customer.cityName} · created {formatDate(customer.createdAt)}
      </p>
      <p className="mt-4 text-lg font-semibold">
        Balance {formatCurrency(customer.balance, { currency: customer.currency })}
      </p>

      <button
        type="button"
        className="mt-4 text-sm font-semibold text-red-400"
        onClick={() =>
          setConfirm({
            title: 'Delete this customer?',
            body: `This permanently removes ${customer.fullName} and their login.`,
            run: async () => {
              await apiDelete(`/admin/customers/${customer.id}`);
              router.replace(adminRoutes.customers);
            },
          })
        }
      >
        Delete customer
      </button>

      <form onSubmit={saveProfile} className="mt-8 grid max-w-2xl gap-4 sm:grid-cols-2">
        <Field label="First name">
          <TextInput name="firstName" required defaultValue={customer.firstName} />
        </Field>
        <Field label="Last name">
          <TextInput name="lastName" required defaultValue={customer.lastName} />
        </Field>
        <Field label="Email">
          <TextInput name="email" type="email" required defaultValue={customer.email} />
        </Field>
        <Field label="Mobile">
          <TextInput name="mobile" required defaultValue={customer.mobile} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Installation address">
            <TextInput name="addressLine" required defaultValue={customer.addressLine} />
          </Field>
        </div>
        <Field label="Status">
          <SelectInput name="status" defaultValue={customer.status}>
            <option value="PROSPECT">Pending</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="CHURNED">Terminated</option>
          </SelectInput>
        </Field>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 items-center rounded-lg bg-cyan-500 px-5 text-sm font-semibold text-slate-950 disabled:opacity-60"
          >
            {loading ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>

      <h2 className="mt-12 font-display text-2xl font-semibold">Subscriptions</h2>
      <div className="mt-4 space-y-6">
        {subscriptions.map((item) => (
          <form
            key={item.id}
            onSubmit={(event) => void saveSubscription(event, item)}
            className="grid max-w-2xl gap-4 rounded-2xl border border-white/10 p-5 sm:grid-cols-2"
          >
            <p className="sm:col-span-2 text-sm text-slate-400">{item.reference}</p>
            <Field label="Plan">
              <SelectInput name="planId" defaultValue={item.planId}>
                {plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Status">
              <SelectInput name="status" defaultValue={item.status}>
                <option value="PENDING">Pending install</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Paused</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="EXPIRED">Expired</option>
              </SelectInput>
            </Field>
            <Field label="Start date">
              <TextInput name="startedAt" type="date" defaultValue={item.startedAt?.slice(0, 10) ?? ''} />
            </Field>
            <Field label="Period end">
              <TextInput name="currentPeriodEnd" type="date" defaultValue={item.currentPeriodEnd?.slice(0, 10) ?? ''} />
            </Field>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-11 items-center rounded-lg bg-cyan-500 px-5 text-sm font-semibold text-slate-950 disabled:opacity-60"
              >
                Save subscription
              </button>
            </div>
          </form>
        ))}
      </div>

      <form onSubmit={(event) => void addSubscription(event)} className="mt-8 grid max-w-2xl gap-4 rounded-2xl border border-dashed border-white/20 p-5 sm:grid-cols-2">
        <p className="sm:col-span-2 font-semibold">Add another subscription</p>
        <Field label="Plan">
          <SelectInput name="planId" required>
            <option value="">Select a plan</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Status">
          <SelectInput name="status" defaultValue="PENDING">
            <option value="PENDING">Pending install</option>
            <option value="ACTIVE">Active</option>
          </SelectInput>
        </Field>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-11 items-center rounded-lg border border-white/20 px-5 text-sm font-semibold disabled:opacity-60"
          >
            Add subscription
          </button>
        </div>
      </form>

      <FormError message={error} />
      <FormSuccess message={message} />

      {confirm ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 p-6">
            <h3 className="font-display text-xl font-semibold">{confirm.title}</h3>
            <p className="mt-2 text-sm text-slate-300">{confirm.body}</p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="inline-flex h-11 items-center justify-center rounded-lg border border-white/20 px-4 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void confirm.run()}
                className="inline-flex h-11 items-center justify-center rounded-lg bg-red-500 px-4 text-sm font-semibold text-white"
              >
                Yes, continue
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
