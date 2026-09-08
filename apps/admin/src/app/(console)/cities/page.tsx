'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import type { AreaDto, CityDto, SubAreaDto } from '@stormfiber/types';
import {
  Field,
  FormError,
  FormSuccess,
  SelectInput,
  TextInput,
  dangerBtn,
  ghostBtn,
  primaryBtn,
} from '@/components/form-field';
import { apiDelete, apiGet, apiSend } from '@/lib/api';

export default function AdminCitiesPage() {
  const [cities, setCities] = useState<CityDto[]>([]);
  const [areas, setAreas] = useState<AreaDto[]>([]);
  const [subAreas, setSubAreas] = useState<SubAreaDto[]>([]);
  const [selectedSlug, setSelectedSlug] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [cityEdit, setCityEdit] = useState<CityDto | null>(null);
  const [areaEdit, setAreaEdit] = useState<AreaDto | null>(null);
  const [subEdit, setSubEdit] = useState<SubAreaDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function reload() {
    apiGet<CityDto[]>('/admin/cities?includeInactive=true')
      .then(setCities)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Could not load cities'));
  }

  useEffect(() => {
    reload();
  }, []);

  useEffect(() => {
    if (!selectedSlug) {
      setAreas([]);
      setSelectedAreaId('');
      return;
    }
    apiGet<AreaDto[]>(`/admin/cities/${selectedSlug}/areas`).then(setAreas).catch(() => setAreas([]));
  }, [selectedSlug]);

  useEffect(() => {
    if (!selectedAreaId) {
      setSubAreas([]);
      return;
    }
    apiGet<SubAreaDto[]>(`/admin/areas/${selectedAreaId}/subareas`).then(setSubAreas).catch(() => setSubAreas([]));
  }, [selectedAreaId]);

  async function onSaveCity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    try {
      const payload = {
        name: String(form.get('name') ?? ''),
        slug: String(form.get('slug') ?? ''),
        code: String(form.get('code') ?? ''),
        dialCode: String(form.get('dialCode') ?? ''),
        province: String(form.get('province') ?? ''),
        isActive: form.get('isActive') === 'on',
        isLive: form.get('isLive') === 'on',
        branchAddress: String(form.get('branchAddress') ?? '') || undefined,
      };
      await apiSend<CityDto>(cityEdit ? `/admin/cities/${cityEdit.id}` : '/admin/cities', payload, {
        method: cityEdit ? 'PATCH' : 'POST',
      });
      setMessage(cityEdit ? 'City updated' : 'City created');
      setCityEdit(null);
      event.currentTarget.reset();
      reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save city');
    }
  }

  async function onSaveArea(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const city = cities.find((item) => item.slug === selectedSlug);
    if (!city) return;
    const form = new FormData(event.currentTarget);
    setError(null);
    try {
      await apiSend<AreaDto>(
        areaEdit ? `/admin/areas/${areaEdit.id}` : '/admin/areas',
        {
          cityId: city.id,
          name: String(form.get('name') ?? ''),
          slug: String(form.get('slug') ?? ''),
          coverageStatus: String(form.get('coverageStatus') ?? 'NOT_AVAILABLE'),
          isActive: true,
        },
        { method: areaEdit ? 'PATCH' : 'POST' },
      );
      setMessage(areaEdit ? 'Area updated' : 'Area created');
      setAreaEdit(null);
      event.currentTarget.reset();
      apiGet<AreaDto[]>(`/admin/cities/${selectedSlug}/areas`).then(setAreas);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save area');
    }
  }

  async function archiveCity(city: CityDto) {
    if (!window.confirm(`Archive ${city.name}? Coverage checks will stop listing it.`)) return;
    try {
      await apiDelete(`/admin/cities/${city.id}`);
      setMessage('City archived');
      if (selectedSlug === city.slug) setSelectedSlug('');
      if (cityEdit?.id === city.id) setCityEdit(null);
      reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not archive city');
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Cities & areas</h1>
      <FormError message={error} />
      <FormSuccess message={message} />
      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="font-semibold">Cities</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {cities.map((city) => (
              <li key={city.id} className="flex items-center justify-between gap-2">
                <button type="button" className="text-left text-cyan-300" onClick={() => setSelectedSlug(city.slug)}>
                  {city.name}{' '}
                  <span className="text-slate-400">
                    · {city.province} · {city.isLive ? 'live' : 'announced'}
                    {!city.isActive ? ' · inactive' : ''}
                  </span>
                </button>
                <span className="flex gap-2">
                  <button type="button" className={ghostBtn} onClick={() => setCityEdit(city)}>
                    Edit
                  </button>
                  <button type="button" className={dangerBtn} onClick={() => archiveCity(city)}>
                    Archive
                  </button>
                </span>
              </li>
            ))}
          </ul>
          <form key={cityEdit?.id ?? 'city-new'} onSubmit={onSaveCity} className="mt-6 space-y-3">
            <h3 className="text-sm font-semibold">{cityEdit ? `Edit ${cityEdit.name}` : 'Create city'}</h3>
            <Field label="Name">
              <TextInput name="name" required defaultValue={cityEdit?.name} />
            </Field>
            <Field label="Slug">
              <TextInput name="slug" required defaultValue={cityEdit?.slug} />
            </Field>
            <Field label="Code">
              <TextInput name="code" required defaultValue={cityEdit?.code} />
            </Field>
            <Field label="Dial code">
              <TextInput name="dialCode" required placeholder="042" defaultValue={cityEdit?.dialCode} />
            </Field>
            <Field label="Province">
              <TextInput name="province" required defaultValue={cityEdit?.province} />
            </Field>
            <Field label="Branch address">
              <TextInput name="branchAddress" defaultValue={cityEdit?.branchAddress ?? ''} />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isLive" defaultChecked={cityEdit?.isLive ?? true} />
              Live
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="isActive" defaultChecked={cityEdit?.isActive ?? true} />
              Active
            </label>
            <div className="flex gap-3">
              <button type="submit" className={primaryBtn}>
                {cityEdit ? 'Update city' : 'Create city'}
              </button>
              {cityEdit ? (
                <button type="button" className={ghostBtn} onClick={() => setCityEdit(null)}>
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </div>
        <div>
          <h2 className="font-semibold">Areas {selectedSlug ? `in ${selectedSlug}` : ''}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {areas.map((area) => (
              <li key={area.id} className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  className={`text-left ${selectedAreaId === area.id ? 'text-cyan-300' : ''}`}
                  onClick={() => setSelectedAreaId(area.id)}
                >
                  {area.name} · {area.coverageStatus}
                </button>
                <span className="flex gap-2">
                  <button type="button" className={ghostBtn} onClick={() => setAreaEdit(area)}>
                    Edit
                  </button>
                  <button
                    type="button"
                    className={dangerBtn}
                    onClick={async () => {
                      if (!window.confirm(`Archive ${area.name}?`)) return;
                      try {
                        await apiDelete(`/admin/areas/${area.id}`);
                        setAreas((current) => current.filter((row) => row.id !== area.id));
                        if (selectedAreaId === area.id) setSelectedAreaId('');
                        setMessage('Area archived');
                      } catch (caught) {
                        setError(caught instanceof Error ? caught.message : 'Could not archive area');
                      }
                    }}
                  >
                    Archive
                  </button>
                </span>
              </li>
            ))}
          </ul>
          {selectedSlug ? (
            <form key={areaEdit?.id ?? 'area-new'} onSubmit={onSaveArea} className="mt-6 space-y-3">
              <h3 className="text-sm font-semibold">{areaEdit ? `Edit ${areaEdit.name}` : 'Create area'}</h3>
              <Field label="Area name">
                <TextInput name="name" required defaultValue={areaEdit?.name} />
              </Field>
              <Field label="Slug">
                <TextInput name="slug" required defaultValue={areaEdit?.slug} />
              </Field>
              <Field label="Coverage">
                <SelectInput name="coverageStatus" defaultValue={areaEdit?.coverageStatus ?? 'NOT_AVAILABLE'}>
                  <option value="AVAILABLE">Available</option>
                  <option value="COMING_SOON">Coming soon</option>
                  <option value="NOT_AVAILABLE">Not available</option>
                </SelectInput>
              </Field>
              <div className="flex gap-3">
                <button type="submit" className={primaryBtn}>
                  {areaEdit ? 'Update area' : 'Create area'}
                </button>
                {areaEdit ? (
                  <button type="button" className={ghostBtn} onClick={() => setAreaEdit(null)}>
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>
          ) : (
            <p className="mt-4 text-sm text-slate-400">Select a city to manage its areas.</p>
          )}

          {selectedAreaId ? (
            <div className="mt-10">
              <h2 className="font-semibold">Sub-areas</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {subAreas.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-2">
                    <span>
                      {item.name} · {item.coverageStatus}
                    </span>
                    <span className="flex gap-2">
                      <button type="button" className={ghostBtn} onClick={() => setSubEdit(item)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        className={dangerBtn}
                        onClick={async () => {
                          if (!window.confirm(`Archive ${item.name}?`)) return;
                          try {
                            await apiDelete(`/admin/subareas/${item.id}`);
                            setSubAreas((current) => current.filter((row) => row.id !== item.id));
                            setMessage('Sub-area archived');
                          } catch (caught) {
                            setError(caught instanceof Error ? caught.message : 'Could not archive sub-area');
                          }
                        }}
                      >
                        Archive
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
              <form
                key={subEdit?.id ?? 'sub-new'}
                className="mt-6 space-y-3"
                onSubmit={async (event) => {
                  event.preventDefault();
                  const form = new FormData(event.currentTarget);
                  setError(null);
                  try {
                    await apiSend<SubAreaDto>(
                      subEdit ? `/admin/subareas/${subEdit.id}` : '/admin/subareas',
                      {
                        areaId: selectedAreaId,
                        name: String(form.get('name') ?? ''),
                        slug: String(form.get('slug') ?? ''),
                        coverageStatus: String(form.get('coverageStatus') ?? 'NOT_AVAILABLE'),
                        isActive: true,
                      },
                      { method: subEdit ? 'PATCH' : 'POST' },
                    );
                    setMessage(subEdit ? 'Sub-area updated' : 'Sub-area created');
                    setSubEdit(null);
                    event.currentTarget.reset();
                    apiGet<SubAreaDto[]>(`/admin/areas/${selectedAreaId}/subareas`).then(setSubAreas);
                  } catch (caught) {
                    setError(caught instanceof Error ? caught.message : 'Could not save sub-area');
                  }
                }}
              >
                <h3 className="text-sm font-semibold">{subEdit ? `Edit ${subEdit.name}` : 'Create sub-area'}</h3>
                <Field label="Name">
                  <TextInput name="name" required defaultValue={subEdit?.name} />
                </Field>
                <Field label="Slug">
                  <TextInput name="slug" required defaultValue={subEdit?.slug} />
                </Field>
                <Field label="Coverage">
                  <SelectInput name="coverageStatus" defaultValue={subEdit?.coverageStatus ?? 'NOT_AVAILABLE'}>
                    <option value="AVAILABLE">Available</option>
                    <option value="COMING_SOON">Coming soon</option>
                    <option value="NOT_AVAILABLE">Not available</option>
                  </SelectInput>
                </Field>
                <div className="flex gap-3">
                  <button type="submit" className={primaryBtn}>
                    {subEdit ? 'Update sub-area' : 'Create sub-area'}
                  </button>
                  {subEdit ? (
                    <button type="button" className={ghostBtn} onClick={() => setSubEdit(null)}>
                      Cancel
                    </button>
                  ) : null}
                </div>
              </form>
            </div>
          ) : selectedSlug ? (
            <p className="mt-6 text-sm text-slate-400">Select an area to manage its sub-areas.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
