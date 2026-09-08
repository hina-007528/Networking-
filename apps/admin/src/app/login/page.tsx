'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminRoutes } from '@stormfiber/config';
import { BrandLogo } from '@/components/brand-logo';
import { Field, FormError, TextInput } from '@/components/form-field';
import { PasswordInput } from '@/components/password-input';
import { useAuth } from '@/lib/auth';

const isDev = process.env.NODE_ENV !== 'production';

export default function AdminLoginPage() {
  const { login, user, ready } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && user) {
      router.replace(adminRoutes.dashboard);
    }
  }, [ready, user, router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError(null);
    try {
      await login(String(form.get('identifier') ?? ''), String(form.get('password') ?? ''));
      router.replace(adminRoutes.dashboard);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not sign in');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <div className="mb-6">
        <BrandLogo variant="light" />
      </div>
      <h1 className="mt-2 font-display text-3xl font-semibold">Staff console</h1>
      <p className="mt-2 text-sm text-slate-400">
        Use a staff account. Customer website logins are rejected here.
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <Field label="Email or mobile">
          <TextInput
            name="identifier"
            required
            autoComplete="username"
            defaultValue={isDev ? 'superadmin@stormfiber.local' : undefined}
          />
        </Field>
        <Field label="Password">
          <PasswordInput
            name="password"
            required
            autoComplete="current-password"
            defaultValue={isDev ? 'ChangeMe!2026' : undefined}
          />
        </Field>
        <FormError message={error} />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#2E86DE] text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      {isDev ? (
        <p className="mt-6 text-xs text-slate-500">
          Development seed: superadmin@stormfiber.local / ChangeMe!2026. Run <code>pnpm db:seed</code> if
          this account does not exist.
        </p>
      ) : null}
    </div>
  );
}
