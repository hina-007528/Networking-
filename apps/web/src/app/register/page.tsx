'use client';

import { type FormEvent, type ReactNode, Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { brand, dashboardRoutes, publicRoutes, SERVICE_CITY } from '@stormfiber/config';
import type { CityDto, OtpRequestResult, OtpVerifyResult, PlanDto } from '@stormfiber/types';
import { emailSchema, mobileSchema, nameSchema, passwordSchema, registerApiSchema } from '@stormfiber/validation';
import { BrandLogo } from '@/components/brand-logo';
import { PasswordInput } from '@/components/password-input';
import { apiGet, apiSend } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const STEPS = ['Personal', 'Verify contact', 'Credentials'] as const;

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-sm text-[#6B7280]">Loading…</div>}>
      <RegisterWizard />
    </Suspense>
  );
}

function RegisterWizard() {
  const { register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const planSlug = searchParams.get('plan') ?? undefined;
  const nextPath = searchParams.get('next') || dashboardRoutes.root;
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [resendAvailableAt, setResendAvailableAt] = useState(0);
  const [clock, setClock] = useState(() => Date.now());
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    dob: '',
    cnicLast4: '',
    occupation: '',
    email: '',
    mobile: '',
    cityName: SERVICE_CITY,
    cityId: '',
    requestId: '',
    verificationToken: '',
    password: '',
    confirmPassword: '',
    acceptedTerms: false,
  });

  function patch(partial: Partial<typeof form>) {
    setForm((current) => ({ ...current, ...partial }));
  }

  const [cities, setCities] = useState<CityDto[]>([]);

  useEffect(() => {
    let cancelled = false;
    apiGet<CityDto[]>('/cities')
      .then((rows) => {
        if (cancelled) return;
        const live = rows.filter((city) => city.isActive);
        setCities(live);
        const selected = live.find((city) => city.name === SERVICE_CITY) ?? live.find((city) => city.isLive) ?? live[0];
        if (selected) {
          setForm((current) =>
            current.cityId
              ? current
              : { ...current, cityName: selected.name, cityId: selected.id },
          );
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!resendAvailableAt) return;
    const timer = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [resendAvailableAt]);

  const resendWaitSeconds = Math.max(0, Math.ceil((resendAvailableAt - clock) / 1000));

  const progress = useMemo(() => ((step + 1) / STEPS.length) * 100, [step]);

  function validateStep1(): string | null {
    const first = nameSchema.safeParse(form.firstName);
    if (!first.success) return first.error.issues[0]?.message ?? 'Enter your first name';
    const last = nameSchema.safeParse(form.lastName);
    if (!last.success) return last.error.issues[0]?.message ?? 'Enter your last name';
    if (!form.dob) return 'Enter your date of birth';
    const born = new Date(form.dob);
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 18);
    if (Number.isNaN(born.getTime()) || born > cutoff) return 'You must be at least 18 years old';
    if (form.cnicLast4 && !/^\d{4}$/.test(form.cnicLast4)) return 'Enter the last 4 digits of your CNIC';
    return null;
  }

  function validateStep2Contact(): string | null {
    const email = emailSchema.safeParse(form.email);
    if (!email.success) return email.error.issues[0]?.message ?? 'Enter a valid email';
    const mobile = mobileSchema.safeParse(form.mobile);
    if (!mobile.success) return mobile.error.issues[0]?.message ?? 'Enter a valid mobile number';
    if (form.cityName.trim().length < 2) return 'Enter your city';
    return null;
  }

  async function requestOtp() {
    const problem = validateStep2Contact();
    if (problem) {
      setError(problem);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const mobile = mobileSchema.parse(form.mobile);
      patch({ mobile });
      const otp = await apiSend<OtpRequestResult>('/auth/otp/request', {
        mobile,
        purpose: 'REGISTRATION',
        email: emailSchema.parse(form.email),
      });
      patch({ requestId: otp.requestId });
      setResendAvailableAt(new Date(otp.resendAvailableAt).getTime());
      setHint(
        `A 6-digit code was emailed to ${form.email}. Check inbox and spam. If it is not there, wait a minute and tap Resend code.`,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not send the verification code');
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(code: string) {
    if (!form.requestId) {
      setError('Request a verification code first');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const verified = await apiSend<OtpVerifyResult>('/auth/otp/verify', {
        requestId: form.requestId,
        code,
      });
      patch({ verificationToken: verified.verificationToken });
      setHint('Email verified. Create a password to finish.');
      setStep(2);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That code is not valid');
    } finally {
      setLoading(false);
    }
  }

  async function finish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = passwordSchema.safeParse(form.password);
    if (!password.success) {
      setError(password.error.issues[0]?.message ?? 'Choose a stronger password');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!form.acceptedTerms) {
      setError('You must accept the terms and privacy policy');
      return;
    }
    if (!form.verificationToken) {
      setError('Verify your mobile number before creating the account');
      return;
    }
    const payload = registerApiSchema.safeParse({
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      mobile: form.mobile,
      password: form.password,
      acceptedTerms: true,
      cityName: form.cityName.trim() || SERVICE_CITY,
      cityId: form.cityId || undefined,
      verificationToken: form.verificationToken,
      planSlug: planSlug || undefined,
    });
    if (!payload.success) {
      setError(payload.error.issues[0]?.message ?? 'Check the details and try again');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await register(payload.data);
      if (nextPath !== dashboardRoutes.root) {
        router.replace(nextPath);
        return;
      }
      if (planSlug) {
        const plan = await apiGet<PlanDto>(`/plans/${encodeURIComponent(planSlug)}`);
        router.replace(dashboardRoutes.orderReview(plan.id));
        return;
      }
      router.replace(dashboardRoutes.root);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not create the account');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-[#0C2340] px-12 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <BrandLogo variant="light" />
        <div>
          <ol className="space-y-4">
            {STEPS.map((label, index) => (
              <li key={label} className="flex items-center gap-3">
                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${index === step ? 'bg-[#2E86DE] text-white' : index < step ? 'bg-[#7FD1F0] text-[#0C2340]' : 'bg-white/10 text-white/50'}`}>
                  {index + 1}
                </span>
                <span className={index === step ? 'font-semibold text-white' : 'text-white/60'}>{label}</span>
              </li>
            ))}
          </ol>
        </div>
        <p className="text-xs text-white/40">{brand.tagline}</p>
      </aside>

      <div className="flex items-center justify-center bg-[#F3F7FC] px-4 py-12">
        <div className="w-full max-w-lg rounded-3xl border border-[#E6EEF6] bg-white p-8 shadow-[0_16px_64px_rgb(12_35_64/0.08)] sm:p-10">
          <div className="mb-6 lg:hidden">
            <BrandLogo variant="dark" compact />
          </div>
          <h1 className="font-display text-2xl font-extrabold text-[#0C2340]">Create your account</h1>
          <p className="mt-1 text-sm text-[#6B7280]">
            Step {step + 1} of {STEPS.length} — {STEPS[step]}
          </p>
          <div className="mt-5 h-1.5 w-full rounded-full bg-[#E6EEF6]">
            <div className="h-full rounded-full bg-[#2E86DE] transition-all" style={{ width: `${progress}%` }} />
          </div>

          {step === 0 ? (
            <form
              className="mt-8 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                const problem = validateStep1();
                if (problem) {
                  setError(problem);
                  return;
                }
                setError(null);
                setStep(1);
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="First name" htmlFor="firstName">
                  <input id="firstName" className="sf-input" value={form.firstName} onChange={(e) => patch({ firstName: e.target.value })} required />
                </Field>
                <Field label="Last name" htmlFor="lastName">
                  <input id="lastName" className="sf-input" value={form.lastName} onChange={(e) => patch({ lastName: e.target.value })} required />
                </Field>
              </div>
              <Field label="Date of birth" htmlFor="dob">
                <input id="dob" type="date" className="sf-input" value={form.dob} onChange={(e) => patch({ dob: e.target.value })} required />
              </Field>
              <Field label="Last 4 digits of CNIC (optional)" htmlFor="cnic">
                <input id="cnic" inputMode="numeric" maxLength={4} className="sf-input" value={form.cnicLast4} onChange={(e) => patch({ cnicLast4: e.target.value })} />
              </Field>
              <Field label="Occupation (optional)" htmlFor="occupation">
                <input id="occupation" className="sf-input" value={form.occupation} onChange={(e) => patch({ occupation: e.target.value })} />
              </Field>
              <WizardError message={error} />
              <button type="submit" className="sf-btn sf-btn-primary w-full justify-center py-3.5">Continue →</button>
            </form>
          ) : null}

          {step === 1 ? (
            <form
              className="mt-8 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                const code = String(new FormData(event.currentTarget).get('code') ?? '');
                if (!form.requestId) {
                  void requestOtp();
                  return;
                }
                void verifyOtp(code);
              }}
            >
              <Field label="Email" htmlFor="email">
                <input id="email" type="email" className="sf-input" value={form.email} onChange={(e) => patch({ email: e.target.value, requestId: '', verificationToken: '' })} required />
              </Field>
              <Field label="Mobile" htmlFor="mobile">
                <input id="mobile" type="tel" className="sf-input" placeholder="03XXXXXXXXX" value={form.mobile} onChange={(e) => patch({ mobile: e.target.value, requestId: '', verificationToken: '' })} required />
              </Field>
              <Field label="City" htmlFor="city">
                <input id="city" className="sf-input bg-[#F3F7FC]" value={SERVICE_CITY} readOnly />
              </Field>
              {form.requestId ? (
                <Field label="One-time code" htmlFor="code">
                  <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="sf-input" placeholder="6-digit code" required />
                </Field>
              ) : null}
              {hint ? <p className="rounded-xl bg-[#E8F3FC] px-3 py-2 text-sm text-[#145DA0]">{hint}</p> : null}
              <WizardError message={error} />
              <div className="flex gap-3">
                <button type="button" className="sf-btn sf-btn-outline" onClick={() => { setError(null); setStep(0); }}>Back</button>
                <button type="submit" disabled={loading} className="sf-btn sf-btn-primary flex-1 justify-center">
                  {loading ? 'Working…' : form.requestId ? 'Verify code' : 'Send OTP'}
                </button>
              </div>
              {form.requestId ? (
                <button
                  type="button"
                  disabled={loading || resendWaitSeconds > 0}
                  className="w-full text-center text-sm font-semibold text-[#2E86DE] disabled:text-[#9CA3AF]"
                  onClick={() => void requestOtp()}
                >
                  {resendWaitSeconds > 0 ? `Resend code in ${resendWaitSeconds}s` : 'Resend code'}
                </button>
              ) : null}
            </form>
          ) : null}

          {step === 2 ? (
            <form className="mt-8 space-y-4" onSubmit={finish}>
              <Field label="Password" htmlFor="password">
                <PasswordInput id="password" autoComplete="new-password" value={form.password} onChange={(e) => patch({ password: e.target.value })} required />
              </Field>
              <Field label="Confirm password" htmlFor="confirm">
                <PasswordInput id="confirm" autoComplete="new-password" value={form.confirmPassword} onChange={(e) => patch({ confirmPassword: e.target.value })} required />
              </Field>
              <p className="text-xs text-[#6B7280]">
                Use 8+ characters with upper, lower, a number and a special character.
              </p>
              <label className="flex items-start gap-2 text-sm text-[#4B5563]">
                <input type="checkbox" className="mt-1 h-4 w-4" checked={form.acceptedTerms} onChange={(e) => patch({ acceptedTerms: e.target.checked })} />
                <span>
                  I accept the{' '}
                  <Link href={publicRoutes.terms} className="font-semibold text-[#2E86DE]">Terms</Link>
                  {' '}and{' '}
                  <Link href={publicRoutes.privacy} className="font-semibold text-[#2E86DE]">Privacy Policy</Link>.
                </span>
              </label>
              <WizardError message={error} />
              <div className="flex gap-3">
                <button type="button" className="sf-btn sf-btn-outline" onClick={() => { setError(null); setStep(1); }}>Back</button>
                <button type="submit" disabled={loading} className="sf-btn sf-btn-primary flex-1 justify-center">
                  {loading ? 'Creating account…' : 'Create account'}
                </button>
              </div>
            </form>
          ) : null}

          <p className="mt-6 text-center text-sm text-[#6B7280]">
            Already have an account?{' '}
            <Link href={`${publicRoutes.login}${nextPath && nextPath !== dashboardRoutes.root ? `?next=${encodeURIComponent(nextPath)}` : ''}`} className="font-bold text-[#2E86DE]">Sign In →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div>
      <label className="sf-label" htmlFor={htmlFor}>{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function WizardError({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>;
}
