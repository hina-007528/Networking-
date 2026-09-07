'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { formatCurrency } from '@stormfiber/config';
import type { ApplicationDto } from '@stormfiber/types';
import { Field, FormError, FormSuccess, SelectInput, TextInput } from '@/components/form-field';
import { apiGet, apiSend } from '@/lib/api';

const STATUSES = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'PAYMENT_PENDING',
  'PAYMENT_RECEIVED',
  'APPROVED',
  'INSTALLATION_SCHEDULED',
  'INSTALLATION_IN_PROGRESS',
  'ACTIVE',
  'REJECTED',
  'CANCELLED',
] as const;

export default function AdminApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const [application, setApplication] = useState<ApplicationDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    apiGet<ApplicationDto>(`/admin/applications/${params.id}`)
      .then(setApplication)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Application not found'));
  }, [params.id]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!application) return;
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError(null);
    try {
      const updated = await apiSend<ApplicationDto>(
        `/admin/applications/${application.id}/status`,
        {
          status: String(form.get('status') ?? ''),
          reason: String(form.get('reason') ?? '') || undefined,
          scheduledInstallationDate: String(form.get('scheduledInstallationDate') ?? '') || undefined,
        },
        { method: 'PATCH' },
      );
      setApplication(updated);
      setMessage(`Moved to ${updated.status}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Transition rejected');
    } finally {
      setLoading(false);
    }
  }

  if (!application) return <p className="text-sm text-slate-400">Loading application…</p>;

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">{application.reference}</h1>
      <p className="mt-2 text-sm text-slate-400">
        {application.firstName} {application.lastName} · {application.cityName} · {application.status}
      </p>
      {application.quote ? (
        <p className="mt-4 text-sm">
          Monthly {formatCurrency(application.quote.monthlyTotal, { currency: application.quote.currency })} · due now{' '}
          {formatCurrency(application.quote.dueNowTotal, { currency: application.quote.currency })}
        </p>
      ) : null}
      <ol className="mt-6 space-y-2 text-sm">
        {application.statusHistory.map((entry) => (
          <li key={entry.id}>
            {entry.fromStatus ?? '—'} → {entry.toStatus}
            {entry.reason ? ` · ${entry.reason}` : ''}
          </li>
        ))}
      </ol>
      <form onSubmit={onSubmit} className="mt-8 max-w-lg space-y-4">
        <Field label="Next status">
          <SelectInput name="status" defaultValue={application.status}>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Reason">
          <TextInput name="reason" />
        </Field>
        <Field label="Installation date">
          <TextInput name="scheduledInstallationDate" type="date" />
        </Field>
        <FormError message={error} />
        <FormSuccess message={message} />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-11 items-center rounded-lg bg-cyan-500 px-5 text-sm font-semibold text-slate-950 disabled:opacity-60"
        >
          {loading ? 'Updating…' : 'Change status'}
        </button>
      </form>
    </div>
  );
}
