'use client';

import { type FormEvent, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { publicRoutes } from '@stormfiber/config';
import { Field, FormError } from '@/components/form-field';
import { PasswordInput } from '@/components/password-input';
import { apiSend } from '@/lib/api';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-10 text-sm text-ink-600">Loading…</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get('token') ?? '';
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') ?? '');
    const confirmPassword = String(form.get('confirmPassword') ?? '');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiSend('/auth/reset-password', { token, password });
      router.push(publicRoutes.login);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not reset the password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <div className="sf-card p-8">
        <h1 className="sf-h2">Choose a new password</h1>
        <p className="mt-2 text-sm text-[#5d6b7a]">The reset token is single-use and expires quickly.</p>
        {!token ? (
          <div className="mt-6">
            <FormError message="This reset link is missing or invalid." />
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field label="New password">
              <PasswordInput name="password" required autoComplete="new-password" />
            </Field>
            <Field label="Confirm password">
              <PasswordInput name="confirmPassword" required autoComplete="new-password" />
            </Field>
            <FormError message={error} />
            <button type="submit" disabled={loading} className="sf-btn sf-btn-primary w-full">
              {loading ? 'Saving…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
