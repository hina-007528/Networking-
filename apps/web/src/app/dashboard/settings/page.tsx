'use client';

import { type FormEvent, useState } from 'react';
import { changePasswordSchema } from '@stormfiber/validation';
import { SectionHeading } from '@stormfiber/ui';
import { Field, FormError, FormSuccess } from '@/components/form-field';
import { PasswordInput } from '@/components/password-input';
import { apiSend } from '@/lib/api';

export default function SettingsPage() {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = changePasswordSchema.safeParse({
      currentPassword: String(form.get('currentPassword') ?? ''),
      newPassword: String(form.get('newPassword') ?? ''),
      confirmPassword: String(form.get('confirmPassword') ?? ''),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check the passwords');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiSend('/auth/change-password', {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
      });
      setMessage('Password changed');
      event.currentTarget.reset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not change password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <SectionHeading heading="Settings" subheading="Change the password for this login. The API stores a hash — never the plaintext." />
      <form onSubmit={onSubmit} className="mt-8 max-w-lg space-y-4 rounded-2xl border border-[#E6EEF6] bg-white p-6">
        <Field label="Current password">
          <PasswordInput name="currentPassword" required autoComplete="current-password" />
        </Field>
        <Field label="New password">
          <PasswordInput name="newPassword" required autoComplete="new-password" />
        </Field>
        <Field label="Confirm new password">
          <PasswordInput name="confirmPassword" required autoComplete="new-password" />
        </Field>
        <p className="text-xs text-[#6B7280]">
          At least 8 characters with an uppercase letter, a lowercase letter, a number and a special character.
        </p>
        <FormError message={error} />
        <FormSuccess message={message} />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-11 items-center rounded-lg bg-[#2E86DE] px-5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? 'Saving…' : 'Update password'}
        </button>
      </form>
    </div>
  );
}
