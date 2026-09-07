'use client';

import { type FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { brand, publicRoutes, SERVICE_CITY, SERVICE_CITY_BOUNDS } from '@stormfiber/config';
import type { AreaDto, CityDto, CityWaitlistDto, CoverageCheckResult, CoverageLeadDto } from '@stormfiber/types';
import { emailSchema, mobileSchema, nameSchema } from '@stormfiber/validation';
import { apiGet, apiSend } from '@/lib/api';
import { heroImages } from '@/lib/hero-images';

export default function CheckAvailabilityPage() {
  const [cities, setCities] = useState<CityDto[]>([]);
  const [areas, setAreas] = useState<AreaDto[]>([]);
  const [cityId, setCityId] = useState('');
  const [cityName, setCityName] = useState('');
  const [areaId, setAreaId] = useState('');
  const [address, setAddress] = useState('');
  const [mobile, setMobile] = useState('');
  const [result, setResult] = useState<CoverageCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [leadDone, setLeadDone] = useState<string | null>(null);

  const selectedCity = cities.find((city) => city.id === cityId);

  useEffect(() => {
    apiGet<CityDto[]>('/cities')
      .then(setCities)
      .catch(() => setCities([]));
  }, []);

  useEffect(() => {
    if (!selectedCity) {
      setAreas([]);
      return;
    }
    apiGet<AreaDto[]>(`/cities/${selectedCity.slug}/areas`)
      .then(setAreas)
      .catch(() => setAreas([]));
  }, [selectedCity]);

  async function onCheck(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setLeadDone(null);
    try {
      const payload = await apiSend<CoverageCheckResult>('/coverage/check', {
        cityId: cityId || undefined,
        cityName: cityName || selectedCity?.name || undefined,
        areaId: areaId || undefined,
        address: address || undefined,
        mobile: mobile ? mobileSchema.parse(mobile) : undefined,
      });
      setResult(payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not check coverage');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  async function onWaitlist(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError(null);
    try {
      const created = await apiSend<CityWaitlistDto>('/coverage/waitlist', {
        name: nameSchema.parse(String(form.get('name') ?? '')),
        phone: mobileSchema.parse(String(form.get('phone') ?? '')),
        city: String(form.get('city') ?? result?.locationLabel ?? cityName),
      });
      setLeadDone(`You are on the waitlist for ${created.city}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not join the waitlist');
    } finally {
      setLoading(false);
    }
  }

  async function onLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!result?.city?.id) {
      setError('Check coverage first so we know which city to attach the lead to');
      return;
    }
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError(null);
    try {
      const created = await apiSend<CoverageLeadDto>('/coverage/leads', {
        checkId: result.checkId ?? undefined,
        name: nameSchema.parse(String(form.get('name') ?? '')),
        mobile: mobileSchema.parse(String(form.get('phone') ?? '')),
        email: String(form.get('email') ?? '') ? emailSchema.parse(String(form.get('email'))) : undefined,
        cityId: result.city.id,
        areaId: result.area?.id ?? (areaId || undefined),
        address: address || undefined,
      });
      setLeadDone(`Interest recorded for ${created.cityName}. An agent will call ${created.mobile}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save the request');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <section className="relative overflow-hidden bg-[#0C2340] py-16 text-white">
        <img src={heroImages.coverage} alt="" loading="lazy" decoding="async" className="hero-kenburns is-loop pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30" aria-hidden />
        <div className="hero-light-streak" aria-hidden />
        <div className="absolute inset-0 bg-[#0C2340]/70" />
        <div className="sf-container relative z-[2] text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#7FD1F0]/30 bg-[#7FD1F0]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#7FD1F0]">
            Check Availability
          </span>
          <h1 className="mt-5 font-display text-[clamp(2rem,4.5vw,3.5rem)] font-extrabold">
            Is Majawar X available <span className="text-[#7FD1F0]">near you?</span>
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-white/65">
            Coverage is decided by the live zone map for {SERVICE_CITY}. Other cities go on the expansion waitlist.
          </p>
        </div>
      </section>

      <section className="bg-[#F3F7FC] py-10 lg:py-16">
        <div className="sf-container grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="overflow-hidden rounded-3xl border border-[#E6EEF6] bg-white shadow-[0_16px_48px_rgb(12_35_64/0.08)]">
            <iframe
              title={`${SERVICE_CITY} coverage map`}
              className="h-[420px] w-full border-0 lg:h-full min-h-[420px]"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${SERVICE_CITY_BOUNDS.minLng}%2C${SERVICE_CITY_BOUNDS.minLat}%2C${SERVICE_CITY_BOUNDS.maxLng}%2C${SERVICE_CITY_BOUNDS.maxLat}&layer=mapnik&marker=${SERVICE_CITY_BOUNDS.centerLat}%2C${SERVICE_CITY_BOUNDS.centerLng}`}
            />
          </div>

          <div className="rounded-3xl border border-[#E6EEF6] bg-white p-6 shadow-[0_16px_48px_rgb(12_35_64/0.08)] sm:p-8">
            <form onSubmit={onCheck} className="space-y-4">
              <div>
                <label className="sf-label" htmlFor="city">City</label>
                <select
                  id="city"
                  className="sf-input mt-1"
                  value={cityId}
                  onChange={(event) => {
                    const next = cities.find((city) => city.id === event.target.value);
                    setCityId(event.target.value);
                    setCityName(next?.name ?? '');
                    setAreaId('');
                    setResult(null);
                  }}
                >
                  <option value="">Select a city</option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>{city.name}</option>
                  ))}
                </select>
                {!cities.length ? (
                  <input
                    className="sf-input mt-2"
                    placeholder="Or type your city"
                    value={cityName}
                    onChange={(event) => setCityName(event.target.value)}
                  />
                ) : null}
              </div>

              {areas.length > 0 ? (
                <div>
                  <label className="sf-label" htmlFor="area">Neighbourhood</label>
                  <select id="area" className="sf-input mt-1" value={areaId} onChange={(event) => { setAreaId(event.target.value); setResult(null); }}>
                    <option value="">Select area</option>
                    {areas.map((area) => (
                      <option key={area.id} value={area.id}>{area.name}</option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div>
                <label className="sf-label" htmlFor="address">Street / house (optional)</label>
                <input id="address" className="sf-input mt-1" value={address} onChange={(event) => setAddress(event.target.value)} />
              </div>
              <div>
                <label className="sf-label" htmlFor="mobile">Mobile (optional)</label>
                <input id="mobile" className="sf-input mt-1" placeholder="03XXXXXXXXX" value={mobile} onChange={(event) => setMobile(event.target.value)} />
              </div>
              <button type="submit" disabled={loading || (!cityId && !cityName)} className="sf-btn sf-btn-primary w-full justify-center py-3.5 disabled:opacity-60">
                {loading ? 'Checking…' : 'Check'}
              </button>
            </form>

            {error ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

            {result ? (
              <div className={`mt-6 rounded-2xl border p-5 ${result.serviceable ? 'border-green-200 bg-green-50' : 'border-amber-200 bg-amber-50'}`}>
                <p className="font-display text-lg font-extrabold text-[#0C2340]">{result.locationLabel}</p>
                <p className="mt-2 text-sm text-[#4B5563]">{result.message}</p>
                {result.serviceable ? (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link href={publicRoutes.plans} className="sf-btn sf-btn-primary">View {result.availablePlanCount} plans</Link>
                    <Link href={publicRoutes.register} className="sf-btn sf-btn-outline">Create account</Link>
                  </div>
                ) : null}
              </div>
            ) : null}

            {result && !result.serviceable && result.outsideServiceCity && !leadDone ? (
              <form onSubmit={onWaitlist} className="mt-6 space-y-3 border-t border-[#E6EEF6] pt-6">
                <p className="text-sm font-semibold text-[#0C2340]">Join the expansion waitlist</p>
                <input name="name" required className="sf-input" placeholder="Full name" />
                <input name="phone" required className="sf-input" placeholder="03XXXXXXXXX" />
                <input name="city" className="sf-input" defaultValue={result.locationLabel} />
                <p className="text-xs text-[#6B7280]">We currently serve {SERVICE_CITY} only. Leave your details if you want to be contacted later.</p>
                <button type="submit" disabled={loading} className="sf-btn sf-btn-primary w-full justify-center">Join waitlist</button>
              </form>
            ) : null}

            {result && !result.serviceable && !result.outsideServiceCity && result.city && !leadDone ? (
              <form onSubmit={onLead} className="mt-6 space-y-3 border-t border-[#E6EEF6] pt-6">
                <p className="text-sm font-semibold text-[#0C2340]">Register interest for this street</p>
                <input name="name" required className="sf-input" placeholder="Full name" />
                <input name="phone" required className="sf-input" placeholder="03XXXXXXXXX" />
                <input name="email" type="email" className="sf-input" placeholder="Email (optional)" />
                <button type="submit" disabled={loading} className="sf-btn sf-btn-primary w-full justify-center">Send request</button>
              </form>
            ) : null}

            {leadDone ? <p className="mt-4 rounded-xl bg-[#E8F3FC] px-3 py-2 text-sm text-[#145DA0]">{leadDone}</p> : null}

            <p className="mt-6 text-xs text-[#6B7280]">
              Helpline {brand.supportPhoneDisplay}. Head office and branch addresses are on the contact page.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
