'use client';

import { type FormEvent, Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { brand, dashboardRoutes, publicRoutes } from '@stormfiber/config';
import { loginSchema } from '@stormfiber/validation';
import { BrandLogo } from '@/components/brand-logo';
import { PasswordInput } from '@/components/password-input';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-[#6B7280]">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { login, user, ready } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next') || dashboardRoutes.root;
  const isDev = process.env.NODE_ENV !== 'production';
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [unlockId, setUnlockId] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace(nextPath);
  }, [ready, user, router, nextPath]);

  useEffect(() => {
    const clearAutofill = window.setTimeout(() => {
      setIdentifier('');
      setPassword('');
    }, 80);
    return () => window.clearTimeout(clearAutofill);
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const parsed = loginSchema.safeParse({ identifier, password, rememberMe });
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'identifier');
        if (!nextErrors[key]) nextErrors[key] = issue.message;
      }
      setFieldErrors(nextErrors);
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      await login(parsed.data.identifier, parsed.data.password, parsed.data.rememberMe);
      router.replace(nextPath);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not sign in');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-[#0C2340] px-12 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <BrandLogo variant="light" />
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#7FD1F0]">{brand.tagline}</p>
          <h1 className="mt-4 font-display text-4xl font-extrabold leading-tight">
            Your {brand.shortName} account
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-white/65">
            Pay bills, track tickets and manage the fibre line from one portal. Staff use the admin console.
          </p>
        </div>
        <p className="text-xs text-white/40">{brand.supportPhoneDisplay} · {brand.supportEmail}</p>
      </aside>

      <div className="flex items-center justify-center bg-[#F3F7FC] px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-[#E6EEF6] bg-white p-8 shadow-[0_16px_64px_rgb(12_35_64/0.08)] sm:p-10">
          <div className="mb-8 lg:hidden">
            <BrandLogo variant="dark" compact />
          </div>
          <h2 className="font-display text-2xl font-extrabold text-[#0C2340]">Welcome back</h2>
          <p className="mt-1 text-sm text-[#6B7280]">
            {nextPath.includes('/dashboard/order/')
              ? 'Sign in to place this order. If you do not have an account yet, create one first — we will bring you back here.'
              : 'Sign in with email or mobile number'}
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5" autoComplete="off" noValidate>
            <div aria-hidden className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <input type="text" name="username" tabIndex={-1} autoComplete="username" />
              <input type="password" name="password" tabIndex={-1} autoComplete="current-password" />
            </div>
            <div>
              <label className="sf-label" htmlFor="identifier">Email or mobile</label>
              <input
                id="identifier"
                name="sf-login-id"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                data-1p-ignore
                data-lpignore="true"
                readOnly={!unlockId}
                onFocus={() => setUnlockId(true)}
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                placeholder="you@example.com or 03030002291"
                className="sf-input mt-1"
                required
              />
              {fieldErrors.identifier ? <p className="mt-1 text-xs text-red-600">{fieldErrors.identifier}</p> : null}
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="sf-label" htmlFor="password">Password</label>
                <Link href={publicRoutes.forgotPassword} className="text-xs font-semibold text-[#2E86DE]">
                  Forgot password?
                </Link>
              </div>
              <div className="mt-1">
                <PasswordInput
                  id="password"
                  disableAutofill
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </div>
              {fieldErrors.password ? <p className="mt-1 text-xs text-red-600">{fieldErrors.password}</p> : null}
            </div>

            <label className="flex items-center gap-2 text-sm text-[#4B5563]">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="h-4 w-4 rounded"
              />
              Remember me on this device
            </label>

            {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

            <button type="submit" disabled={loading} className="sf-btn sf-btn-primary w-full justify-center py-3.5 text-base disabled:opacity-60">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {isDev ? (
            <p className="mt-4 text-center text-xs text-[#6B7280]">
              Staff use the admin console on <span className="font-medium">localhost:3001</span>.
            </p>
          ) : null}

          <p className="mt-6 text-center text-sm text-[#6B7280]">
            New here?{' '}
            <Link
              href={`${publicRoutes.register}${nextPath && nextPath !== dashboardRoutes.root ? `?next=${encodeURIComponent(nextPath)}` : ''}`}
              className="font-bold text-[#2E86DE]"
            >
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
