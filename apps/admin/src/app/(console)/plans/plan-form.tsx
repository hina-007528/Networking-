'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminRoutes } from '@stormfiber/config';
import type { CityDto, PlanAddonDto, PlanCategoryDto, PlanDto, PlanPriceDto } from '@stormfiber/types';
import { Field, FormError, FormSuccess, SelectInput, TextArea, TextInput } from '@/components/form-field';
import { apiGet, apiSend } from '@/lib/api';

const KINDS = ['INTERNET', 'TV', 'PHONE', 'DOUBLE_PLAY', 'TRIPLE_PLAY'] as const;
const STATUSES = ['DRAFT', 'PUBLISHED', 'SCHEDULED', 'EXPIRED', 'ARCHIVED'] as const;
const SERVICES = ['INTERNET', 'TV', 'PHONE'] as const;

export function PlanForm({ planId }: { planId?: string }) {
  const router = useRouter();
  const [plan, setPlan] = useState<PlanDto | null>(null);
  const [cities, setCities] = useState<CityDto[]>([]);
  const [categories, setCategories] = useState<PlanCategoryDto[]>([]);
  const [addons, setAddons] = useState<PlanAddonDto[]>([]);
  const [soldCityIds, setSoldCityIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    apiGet<CityDto[]>('/admin/cities').then(setCities).catch(() => setCities([]));
    apiGet<PlanCategoryDto[]>('/plans/categories').then(setCategories).catch(() => setCategories([]));
    apiGet<PlanAddonDto[]>('/admin/plans/addons').then(setAddons).catch(() => setAddons([]));
    if (!planId) return;
    apiGet<PlanDto>(`/admin/plans/${planId}`)
      .then(setPlan)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Plan not found'));
    apiGet<PlanPriceDto[]>(`/admin/plans/${planId}/prices`)
      .then((prices) => setSoldCityIds(prices.map((price) => price.cityId)))
      .catch(() => setSoldCityIds([]));
  }, [planId]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const services = SERVICES.filter((service) => form.get(`service-${service}`) === 'on');
    const addonIds = addons.filter((addon) => form.get(`addon-${addon.id}`) === 'on').map((addon) => addon.id);
    const cityIds = cities.filter((city) => form.get(`city-${city.id}`) === 'on').map((city) => city.id);
    const features = String(form.get('features') ?? '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((label, index) => ({ label, displayOrder: index }));

    setLoading(true);
    setError(null);
    try {
      const payload = {
        name: String(form.get('name') ?? ''),
        slug: String(form.get('slug') ?? ''),
        description: String(form.get('description') ?? ''),
        shortDescription: String(form.get('shortDescription') ?? '') || undefined,
        kind: String(form.get('kind') ?? 'INTERNET'),
        categoryId: String(form.get('categoryId') ?? '') || undefined,
        services,
        speedMbps: Number(form.get('speedMbps') || 0) || undefined,
        monthlyPrice: Number(form.get('monthlyPrice') ?? 0),
        installationPrice: Number(form.get('installationPrice') ?? 0),
        currency: 'PKR',
        status: String(form.get('status') ?? 'DRAFT'),
        featured: form.get('featured') === 'on',
        displayOrder: Number(form.get('displayOrder') ?? 0),
        badgeText: String(form.get('badgeText') ?? '') || undefined,
        features,
        addonIds,
        cityIds,
      };
      const saved = await apiSend<PlanDto>(
        planId ? `/admin/plans/${planId}` : '/admin/plans',
        payload,
        { method: planId ? 'PATCH' : 'POST' },
      );
      setPlan(saved);
      setMessage('Plan saved to the database');
      if (!planId) router.replace(adminRoutes.planEdit(saved.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save plan');
    } finally {
      setLoading(false);
    }
  }

  if (planId && !plan && !error) return <p className="text-sm text-slate-400">Loading plan…</p>;

  return (
    <form onSubmit={onSubmit} className="mt-8 max-w-3xl space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <TextInput name="name" required defaultValue={plan?.name} />
        </Field>
        <Field label="Slug">
          <TextInput name="slug" required defaultValue={plan?.slug} />
        </Field>
        <Field label="Kind">
          <SelectInput name="kind" defaultValue={plan?.kind ?? 'INTERNET'}>
            {KINDS.map((kind) => (
              <option key={kind} value={kind}>
                {kind}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Status">
          <SelectInput name="status" defaultValue={plan?.status ?? 'DRAFT'}>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Monthly price (PKR)">
          <TextInput name="monthlyPrice" type="number" step="0.01" required defaultValue={plan?.monthlyPrice} />
        </Field>
        <Field label="Installation (PKR)">
          <TextInput name="installationPrice" type="number" step="0.01" defaultValue={plan?.installationPrice ?? 0} />
        </Field>
        <Field label="Speed (Mbps)">
          <TextInput name="speedMbps" type="number" defaultValue={plan?.speedMbps ?? ''} />
        </Field>
        <Field label="Display order">
          <TextInput name="displayOrder" type="number" defaultValue={plan?.displayOrder ?? 0} />
        </Field>
        <Field label="Category">
          <SelectInput name="categoryId" defaultValue={plan?.category?.id ?? ''}>
            <option value="">None</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Badge">
          <TextInput name="badgeText" defaultValue={plan?.badgeText ?? ''} />
        </Field>
      </div>
      <Field label="Short description">
        <TextInput name="shortDescription" defaultValue={plan?.shortDescription ?? ''} />
      </Field>
      <Field label="Description">
        <TextArea name="description" required defaultValue={plan?.description} />
      </Field>
      <Field label="Features (one per line)">
        <TextArea name="features" defaultValue={plan?.features.map((feature) => feature.label).join('\n')} />
      </Field>
      <fieldset>
        <legend className="text-sm font-medium text-slate-200">Services</legend>
        <div className="mt-2 flex flex-wrap gap-4 text-sm">
          {SERVICES.map((service) => (
            <label key={service} className="flex items-center gap-2">
              <input type="checkbox" name={`service-${service}`} defaultChecked={plan?.services.includes(service) ?? service === 'INTERNET'} />
              {service}
            </label>
          ))}
          <label className="flex items-center gap-2">
            <input type="checkbox" name="featured" defaultChecked={plan?.featured} />
            Featured
          </label>
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-medium text-slate-200">Sold in cities</legend>
        <div key={soldCityIds.join(',')} className="mt-2 grid gap-2 sm:grid-cols-3">
          {cities.map((city) => (
            <label key={city.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name={`city-${city.id}`}
                defaultChecked={soldCityIds.includes(city.id) || plan?.cityId === city.id}
              />
              {city.name}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-medium text-slate-200">Add-ons</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {addons.map((addon) => (
            <label key={addon.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name={`addon-${addon.id}`}
                defaultChecked={plan?.addons.some((item) => item.id === addon.id)}
              />
              {addon.name}
            </label>
          ))}
        </div>
      </fieldset>
      <FormError message={error} />
      <FormSuccess message={message} />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-11 items-center rounded-lg bg-cyan-500 px-5 text-sm font-semibold text-slate-950 disabled:opacity-60"
        >
          {loading ? 'Saving…' : planId ? 'Update plan' : 'Create plan'}
        </button>
        <button
          type="button"
          className="inline-flex h-11 items-center rounded-lg border border-white/15 px-4 text-sm font-semibold text-slate-200 hover:bg-white/5"
          onClick={() => router.push(adminRoutes.plans)}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
