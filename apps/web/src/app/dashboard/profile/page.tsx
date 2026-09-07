'use client';

import { type FormEvent, useEffect, useState } from 'react';
import type { CustomerDto } from '@stormfiber/types';
import { updateOwnProfileSchema } from '@stormfiber/validation';
import { SectionHeading } from '@stormfiber/ui';
import { Field, FormError, FormSuccess, TextInput } from '@/components/form-field';
import { apiGet, apiSend } from '@/lib/api';

export default function ProfilePage() {
  const [profile, setProfile] = useState<CustomerDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiGet<CustomerDto>('/customer/profile')
      .then(setProfile)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Could not load profile'));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = updateOwnProfileSchema.safeParse({
      email: String(form.get('email') ?? ''),
      alternatePhone: String(form.get('alternatePhone') ?? '') || undefined,
      addressLine: String(form.get('addressLine') ?? ''),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the form');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const updated = await apiSend<CustomerDto>('/customer/profile', parsed.data, { method: 'PATCH' });
      setProfile(updated);
      setMessage('Profile saved');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save');
    } finally {
      setLoading(false);
    }
  }

  if (!profile) return <p className="text-sm text-[#4B5563]">Loading profile…</p>;

  return (
    <div>
      <SectionHeading heading="Profile" subheading={`${profile.accountNumber} · ${profile.cityName}`} />
      <dl className="mt-6 grid gap-3 rounded-2xl border border-[#E6EEF6] bg-white p-5 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">Name</dt>
          <dd className="mt-1 font-semibold text-[#0C2340]">{profile.fullName}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">Mobile</dt>
          <dd className="mt-1 font-semibold text-[#0C2340]">{profile.mobile}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">Status</dt>
          <dd className="mt-1 font-semibold text-[#0C2340]">{profile.status}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">City</dt>
          <dd className="mt-1 font-semibold text-[#0C2340]">{profile.cityName}</dd>
        </div>
      </dl>
      <form onSubmit={onSubmit} className="mt-8 max-w-lg space-y-4 rounded-2xl border border-[#E6EEF6] bg-white p-6">
        <Field label="Email">
          <TextInput name="email" type="email" defaultValue={profile.email} required />
        </Field>
        <Field label="Alternate phone">
          <TextInput name="alternatePhone" defaultValue={profile.alternatePhone ?? ''} />
        </Field>
        <Field label="Service address">
          <TextInput name="addressLine" defaultValue={profile.addressLine} required minLength={10} />
        </Field>
        <FormError message={error} />
        <FormSuccess message={message} />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-11 items-center rounded-lg bg-[#2E86DE] px-5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
