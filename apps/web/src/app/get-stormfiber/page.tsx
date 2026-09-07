'use client';

import { type FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { formatCurrency, formatMonthlyPrice, publicRoutes } from '@stormfiber/config';
import type {
  ApplicationDto,
  AreaDto,
  CityDto,
  OtpRequestResult,
  OtpVerifyResult,
  Paginated,
  PlanAddonDto,
  PlanDto,
  PriceQuoteDto,
  ServiceType,
  SubAreaDto,
} from '@stormfiber/types';
import { Field, FormError, FormSuccess, SelectInput, TextArea, TextInput } from '@/components/form-field';
import { apiGet, apiSend } from '@/lib/api';

const STEPS = ['Personal', 'Verify', 'Location', 'Services', 'Plan', 'Add-ons', 'Submit'] as const;

const SERVICE_OPTIONS = [
  { id: 'INTERNET', label: 'Internet Broadband' },
  { id: 'TV', label: 'Digital HD Television' },
  { id: 'PHONE', label: 'Crystal Clear Voice Phone' },
] as const;


interface WizardState {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  cnicLast4: string;
  requestId: string;
  verificationToken: string;
  cityId: string;
  areaId: string;
  subAreaId: string;
  addressLine: string;
  nearestLandmark: string;
  services: ServiceType[];
  planId: string;
  addonIds: string[];
  preferredInstallationDate: string;
  notes: string;
}

const emptyState: WizardState = {
  firstName: '',
  lastName: '',
  email: '',
  mobile: '',
  cnicLast4: '',
  requestId: '',
  verificationToken: '',
  cityId: '',
  areaId: '',
  subAreaId: '',
  addressLine: '',
  nearestLandmark: '',
  services: ['INTERNET'],
  planId: '',
  addonIds: [],
  preferredInstallationDate: '',
  notes: '',
};

export default function GetConnectionPage() {
  const [step, setStep] = useState(0);
  const [state, setState] = useState<WizardState>(emptyState);
  const [error, setError] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cities, setCities] = useState<CityDto[]>([]);
  const [areas, setAreas] = useState<AreaDto[]>([]);
  const [subAreas, setSubAreas] = useState<SubAreaDto[]>([]);
  const [plans, setPlans] = useState<PlanDto[]>([]);
  const [addons, setAddons] = useState<PlanAddonDto[]>([]);
  const [quote, setQuote] = useState<PriceQuoteDto | null>(null);
  const [submitted, setSubmitted] = useState<ApplicationDto | null>(null);

  useEffect(() => {
    apiGet<CityDto[]>('/cities')
      .then((data) => {
        if (data && data.length > 0) setCities(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const city = cities.find((item) => item.id === state.cityId);
    if (!city) {
      setAreas([]);
      return;
    }
    apiGet<AreaDto[]>(`/cities/${city.slug}/areas`)
      .then(setAreas)
      .catch(() => setAreas([]));
  }, [state.cityId, cities]);

  useEffect(() => {
    if (!state.areaId) {
      setSubAreas([]);
      return;
    }
    apiGet<SubAreaDto[]>(`/areas/${state.areaId}/subareas`)
      .then(setSubAreas)
      .catch(() => setSubAreas([]));
  }, [state.areaId]);

  useEffect(() => {
    if (step < 4) return;
    const params = new URLSearchParams({ pageSize: '24' });
    if (state.services[0]) params.set('service', state.services[0]);
    apiGet<Paginated<PlanDto>>(`/plans?${params.toString()}`)
      .then((result) => setPlans(result.items))
      .catch(() => setPlans([]));
  }, [step, state.services]);

  useEffect(() => {
    if (step < 5 || !state.planId) return;
    const plan = plans.find((item) => item.id === state.planId);
    if (!plan) return;
    apiGet<PlanAddonDto[]>(`/plans/addons?plan=${plan.slug}`)
      .then(setAddons)
      .catch(() => setAddons([]));
  }, [step, state.planId, plans]);

  const selectedPlan = useMemo(
    () => plans.find((plan) => plan.id === state.planId) ?? null,
    [plans, state.planId],
  );

  function patch(partial: Partial<WizardState>) {
    setState((current) => ({ ...current, ...partial }));
  }

  function next() {
    setError(null);
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  }

  async function requestOtp() {
    setLoading(true);
    setError(null);
    try {
      const otp = await apiSend<OtpRequestResult>('/auth/otp/request', {
        mobile: state.mobile,
        purpose: 'APPLICATION',
        email: state.email,
      });
      patch({ requestId: otp.requestId });
      setHint(state.email ? `A 6-digit code was emailed to ${state.email}.` : 'A 6-digit code was sent. Check your email.');
      next();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not send the verification code');
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError(null);
    try {
      const verified = await apiSend<OtpVerifyResult>('/auth/otp/verify', {
        requestId: state.requestId,
        code: String(form.get('code') ?? ''),
      });
      patch({ verificationToken: verified.verificationToken });
      next();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That code is not valid');
    } finally {
      setLoading(false);
    }
  }

  async function refreshQuote() {
    if (!state.planId || !state.cityId) return;
    setLoading(true);
    setError(null);
    try {
      const nextQuote = await apiSend<PriceQuoteDto>('/pricing/quote', {
        planId: state.planId,
        cityId: state.cityId,
        addonIds: state.addonIds,
        includeInstallation: true,
      });
      setQuote(nextQuote);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not price this selection');
      setQuote(null);
    } finally {
      setLoading(false);
    }
  }

  async function submitApplication(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!form.get('acceptedTerms')) {
      setError('You must accept the terms and conditions');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const created = await apiSend<ApplicationDto>('/applications', {
        firstName: state.firstName,
        lastName: state.lastName,
        email: state.email,
        mobile: state.mobile,
        cnicLast4: state.cnicLast4 || undefined,
        cityId: state.cityId,
        areaId: state.areaId || undefined,
        subAreaId: state.subAreaId || undefined,
        addressLine: state.addressLine,
        nearestLandmark: state.nearestLandmark || undefined,
        services: state.services,
        planId: state.planId,
        addonIds: state.addonIds,
        preferredInstallationDate: state.preferredInstallationDate || undefined,
        notes: state.notes || undefined,
        acceptedTerms: true,
        verificationToken: state.verificationToken,
      });
      setSubmitted(created);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not submit the application');
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="sf-card p-8 text-center">
          <h2 className="sf-h2">Thank you</h2>
          <p className="mt-2 text-sm text-[#5d6b7a]">
            Application reference: <strong className="font-mono text-[#2E86DE]">{submitted.reference}</strong>
          </p>
          <div className="mt-6 space-y-2 rounded-lg bg-[#f3f5f8] p-5 text-left text-sm text-[#5d6b7a]">
            <p>Status: <strong className="text-[#1b2430]">{submitted.status}</strong></p>
            {submitted.quote ? (
              <p>
                Monthly cost: <strong className="text-[#1b2430]">{formatMonthlyPrice(submitted.quote.monthlyTotal, submitted.quote.currency)}</strong>
                <br />
                Due at installation: <strong>{formatCurrency(submitted.quote.dueNowTotal, { currency: submitted.quote.currency })}</strong>
              </p>
            ) : null}
          </div>
          <Link href={publicRoutes.home} className="sf-btn sf-btn-primary mt-8">
            Return to homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="sf-h1">
        Get <span className="sf-accent">Majawar X Network</span> at your door
      </h1>
      <p className="sf-lead mt-3">Apply for fibre internet, HD TV and a home number on one Lahore-built line.</p>
      <p className="mt-6 text-sm font-semibold text-[#1b2430]">Please fill in the details below:</p>

      <ol className="mt-8 flex flex-wrap gap-2 text-xs font-extrabold uppercase tracking-wider">
        {STEPS.map((label, index) => (
          <li
            key={label}
            className={`rounded-md px-3 py-1.5 ${
              index === step
                ? 'bg-[#2E86DE] text-white'
                : index < step
                ? 'bg-[#E8F3FC] text-[#2E86DE]'
                : 'bg-[#f3f5f8] text-[#8a96a3]'
            }`}
          >
            {index + 1}. {label}
          </li>
        ))}
      </ol>

      <div className="sf-card mt-8 p-6 sm:p-8">
        {step === 0 ? (
          <form
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              next();
            }}
          >
            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="First Name">
                <TextInput required value={state.firstName} onChange={(event) => patch({ firstName: event.target.value })} />
              </Field>
              <Field label="Last Name">
                <TextInput required value={state.lastName} onChange={(event) => patch({ lastName: event.target.value })} />
              </Field>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="Email Address">
                <TextInput type="email" required value={state.email} onChange={(event) => patch({ email: event.target.value })} />
              </Field>
              <Field label="Mobile Phone Number">
                <TextInput required placeholder="03001234567" value={state.mobile} onChange={(event) => patch({ mobile: event.target.value })} />
              </Field>
            </div>
            <Field label="Last 4 Digits of CNIC (Optional)">
              <TextInput maxLength={4} value={state.cnicLast4} onChange={(event) => patch({ cnicLast4: event.target.value })} />
            </Field>
            <WizardActions loading={loading} />
          </form>
        ) : null}

        {step === 1 ? (
          <form className="space-y-6" onSubmit={state.verificationToken ? (event) => { event.preventDefault(); next(); } : verifyOtp}>
            {!state.requestId ? (
              <div className="text-center py-6">
                <p className="mb-6 text-sm text-[#5d6b7a]">We will email a 6-digit verification code to <strong className="text-[#1b2430]">{state.email}</strong>.</p>
                <button type="button" onClick={requestOtp} disabled={loading} className="sf-btn sf-btn-primary">
                  {loading ? 'Sending Verification Code…' : 'Send Verification Code'}
                </button>
              </div>
            ) : (
              <>
                <FormSuccess message={hint} />
                <Field label="6-Digit Verification Code">
                  <TextInput name="code" required inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="123456" />
                </Field>
                <WizardActions loading={loading} onBack={() => setStep(0)} />
              </>
            )}
          </form>
        ) : null}

        {step === 2 ? (
          <form
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              next();
            }}
          >
            <div className="grid gap-6 sm:grid-cols-2">
              <Field label="City">
                <SelectInput required value={state.cityId} onChange={(event) => patch({ cityId: event.target.value, areaId: '', subAreaId: '' })}>
                  <option value="">Select a city</option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Area / Town">
                <SelectInput value={state.areaId} onChange={(event) => patch({ areaId: event.target.value, subAreaId: '' })}>
                  <option value="">Choose Area</option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            </div>
            <Field label="Sub-Area / Sector">
              <SelectInput value={state.subAreaId} onChange={(event) => patch({ subAreaId: event.target.value })}>
                <option value="">Optional Sub-Area</option>
                {subAreas.map((subArea) => (
                  <option key={subArea.id} value={subArea.id}>
                    {subArea.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Complete Installation Address">
              <TextInput required minLength={10} placeholder="House / Plot / Apartment Number, Street, Sector" value={state.addressLine} onChange={(event) => patch({ addressLine: event.target.value })} />
            </Field>
            <Field label="Nearest Landmark">
              <TextInput placeholder="e.g. Near City Mosque or Main Market" value={state.nearestLandmark} onChange={(event) => patch({ nearestLandmark: event.target.value })} />
            </Field>
            <WizardActions loading={loading} onBack={() => setStep(1)} />
          </form>
        ) : null}

        {step === 3 ? (
          <form
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              if (state.services.length === 0) {
                setError('Choose at least one service');
                return;
              }
              next();
            }}
          >
            <p className="mb-4 text-sm font-bold text-[#1b2430]">Select services you wish to activate:</p>
            <div className="space-y-3">
              {SERVICE_OPTIONS.map((service) => (
                <label key={service.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-[#e4e9ef] bg-white p-4 text-sm font-semibold text-[#1b2430]">
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded"
                    checked={state.services.includes(service.id)}
                    onChange={(event) => {
                      const nextServices: ServiceType[] = event.target.checked
                        ? [...state.services, service.id]
                        : state.services.filter((item) => item !== service.id);
                      patch({ services: nextServices, planId: '' });
                    }}
                  />
                  <span>{service.label}</span>
                </label>
              ))}
            </div>
            <WizardActions loading={loading} onBack={() => setStep(2)} />
          </form>
        ) : null}

        {step === 4 ? (
          <form
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              if (!state.planId) {
                setError('Choose a plan');
                return;
              }
              next();
            }}
          >
            <p className="mb-4 text-sm font-bold text-[#1b2430]">Choose your preferred broadband package:</p>
            {plans.length === 0 ? <p className="text-sm text-[#5d6b7a]">No published plans are available from the catalogue yet.</p> : null}
            <div className="space-y-4">
              {plans.map((plan) => (
                <label key={plan.id} className="flex cursor-pointer items-start gap-4 rounded-lg border border-[#e4e9ef] bg-white p-5 text-[#1b2430]">
                  <input
                    type="radio"
                    name="planId"
                    className="mt-1 h-5 w-5"
                    checked={state.planId === plan.id}
                    onChange={() => patch({ planId: plan.id, addonIds: [] })}
                  />
                  <div>
                    <span className="block font-display text-lg font-bold">{plan.name}</span>
                    <span className="mt-1 block text-sm text-[#5d6b7a]">
                      {plan.speedMbps ? `${plan.speedMbps} Mbps · ` : ''}
                      <strong className="text-[#2E86DE]">{formatMonthlyPrice(plan.monthlyPrice, plan.currency)}</strong>
                    </span>
                  </div>
                </label>
              ))}
            </div>
            <WizardActions loading={loading} onBack={() => setStep(3)} />
          </form>
        ) : null}

        {step === 5 ? (
          <div className="space-y-6">
            <p className="text-sm font-bold text-[#1b2430]">Select optional add-on services:</p>
            {addons.length === 0 ? <p className="text-sm text-[#5d6b7a]">No add-ons for this plan.</p> : null}
            {addons.map((addon) => (
              <label key={addon.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#e4e9ef] bg-white p-4 text-sm text-[#1b2430]">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 rounded"
                  checked={state.addonIds.includes(addon.id)}
                  onChange={(event) => {
                    const nextIds = event.target.checked
                      ? [...state.addonIds, addon.id]
                      : state.addonIds.filter((id) => id !== addon.id);
                    patch({ addonIds: nextIds });
                    setQuote(null);
                  }}
                />
                <span>
                  <span className="block font-bold text-white">{addon.name}</span>
                  <span className="text-slate-400 text-xs">{addon.description}</span>
                </span>
              </label>
            ))}

            <button
              type="button"
              onClick={() => void refreshQuote()}
              disabled={loading}
              className="sf-btn sf-btn-outline"
            >
              {loading ? 'Calculating Tariff Quote…' : 'Calculate Server Price Quote'}
            </button>

            {quote ? (
              <div className="rounded-lg border border-[#e4e9ef] bg-[#f3f5f8] p-6 text-sm">
                <p className="font-bold text-[#1b2430]">{selectedPlan?.name || 'Selected Package'}</p>
                <ul className="mt-3 space-y-2 text-[#5d6b7a]">
                  {quote.lines.map((line) => (
                    <li key={`${line.label}-${line.amount}`} className="flex justify-between border-b border-[#e4e9ef] pb-2">
                      <span>{line.label}</span>
                      <strong className="text-[#1b2430]">{formatCurrency(line.amount, { currency: quote.currency })}</strong>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex justify-between pt-2 text-base font-bold text-[#1b2430]">
                  <span>Monthly total:</span>
                  <span className="text-[#2E86DE]">{formatMonthlyPrice(quote.monthlyTotal, quote.currency)}</span>
                </div>
              </div>
            ) : null}

            <WizardActions
              loading={loading}
              onBack={() => setStep(4)}
              onContinue={() => {
                if (!quote) {
                  setError('Request a server quote before continuing');
                  return;
                }
                next();
              }}
            />
          </div>
        ) : null}

        {step === 6 ? (
          <form className="space-y-6" onSubmit={submitApplication}>
            <Field label="Preferred Installation Date">
              <TextInput
                type="date"
                value={state.preferredInstallationDate}
                onChange={(event) => patch({ preferredInstallationDate: event.target.value })}
              />
            </Field>
            <Field label="Additional Notes / Special Instructions">
              <TextArea rows={3} placeholder="Provide any additional landmark notes or gate entry instructions..." value={state.notes} onChange={(event) => patch({ notes: event.target.value })} />
            </Field>
            <label className="flex items-start gap-3 text-sm text-[#5d6b7a]">
              <input name="acceptedTerms" type="checkbox" required className="mt-1 h-5 w-5 rounded" />
              <span>
                I agree to the{' '}
                <Link href={publicRoutes.terms} className="font-bold text-[#2E86DE] hover:underline">
                  Terms & Conditions
                </Link>{' '}
                and Fair Usage Policy.
              </span>
            </label>
            <WizardActions loading={loading} onBack={() => setStep(5)} submitLabel="Submit Connection Request" />
          </form>
        ) : null}

        <FormError message={error} />
      </div>
    </div>
  );
}

function WizardActions({
  loading,
  onBack,
  onContinue,
  submitLabel = 'Continue',
}: {
  loading: boolean;
  onBack?: () => void;
  onContinue?: () => void;
  submitLabel?: string;
}) {
  return (
    <div className="flex gap-4 pt-4">
      {onBack ? (
        <button type="button" onClick={onBack} className="sf-btn sf-btn-outline">
          Back
        </button>
      ) : null}
      <button type={onContinue ? 'button' : 'submit'} onClick={onContinue} disabled={loading} className="sf-btn sf-btn-primary">
        {loading ? 'Working…' : submitLabel}
      </button>
    </div>
  );
}

