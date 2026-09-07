'use client';

import { type FormEvent, useState } from 'react';
import { Field, FormError, FormSuccess, TextInput } from '@/components/form-field';
import { apiSend } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError(null);
    try {
      await apiSend('/auth/forgot-password', { identifier: String(form.get('identifier') ?? '') });
      setDone(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not start a reset');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <div className="sf-card p-8">
        <h1 className="sf-h2">Reset your password</h1>
        <p className="mt-2 text-sm text-[#5d6b7a]">If an account exists for that email or mobile number, a reset link is sent.</p>
        {done ? (
          <div className="mt-6">
            <FormSuccess message="If that account exists, a reset link is on its way." />
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <Field label="Email or mobile">
              <TextInput name="identifier" required />
            </Field>
            <FormError message={error} />
            <button type="submit" disabled={loading} className="sf-btn sf-btn-primary w-full">
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
