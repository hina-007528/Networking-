'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import type { SiteSettingsDto } from '@stormfiber/types';
import { Field, FormError, FormSuccess, TextInput } from '@/components/form-field';
import { apiGet, apiSend } from '@/lib/api';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SiteSettingsDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    apiGet<SiteSettingsDto>('/admin/settings')
      .then(setSettings)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Could not load settings'));
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    try {
      const updated = await apiSend<SiteSettingsDto>(
        '/admin/settings',
        {
          brandName: String(form.get('brandName') ?? ''),
          supportPhone: String(form.get('supportPhone') ?? ''),
          supportEmail: String(form.get('supportEmail') ?? ''),
          announcementMessage: String(form.get('announcementMessage') ?? '') || undefined,
          footerNote: String(form.get('footerNote') ?? '') || undefined,
        },
        { method: 'PATCH' },
      );
      setSettings(updated);
      setMessage('Settings saved');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save settings');
    }
  }

  if (!settings) return <p className="text-sm text-slate-400">Loading settings…</p>;

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Site settings</h1>
      <form onSubmit={onSubmit} className="mt-8 max-w-xl space-y-4">
        <Field label="Brand name">
          <TextInput name="brandName" defaultValue={settings.brandName} />
        </Field>
        <Field label="Support phone">
          <TextInput name="supportPhone" defaultValue={settings.supportPhone} />
        </Field>
        <Field label="Support email">
          <TextInput name="supportEmail" defaultValue={settings.supportEmail} />
        </Field>
        <Field label="Announcement">
          <TextInput name="announcementMessage" defaultValue={settings.announcement?.message ?? ''} />
        </Field>
        <Field label="Footer note">
          <TextInput name="footerNote" defaultValue={settings.footerNote} />
        </Field>
        <FormError message={error} />
        <FormSuccess message={message} />
        <button type="submit" className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950">
          Save settings
        </button>
      </form>
    </div>
  );
}
