'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminRoutes } from '@stormfiber/config';
import type { CityDto, CoverageLeadDto, CoverageZoneDto, Paginated } from '@stormfiber/types';
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
import { apiDelete, apiGet, apiSend, readItems } from '@/lib/api';

export default function AdminCoveragePage() {
  const [zones, setZones] = useState<CoverageZoneDto[]>([]);
  const [leads, setLeads] = useState<CoverageLeadDto[]>([]);
  const [cities, setCities] = useState<CityDto[]>([]);
  const [editing, setEditing] = useState<CoverageZoneDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function reload() {
    apiGet<Paginated<CoverageZoneDto>>('/admin/coverage?pageSize=50')
      .then((result) => setZones(readItems(result)))
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Could not load coverage'));
    apiGet<Paginated<CoverageLeadDto>>('/admin/coverage/leads?pageSize=30')
      .then((result) => setLeads(readItems(result)))
      .catch(() => setLeads([]));
    apiGet<CityDto[]>('/admin/cities').then(setCities).catch(() => setCities([]));
  }

  useEffect(() => {
    reload();
  }, []);

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    try {
      const status = String(form.get('status') ?? 'AVAILABLE');
      const expected = String(form.get('expectedLiveDate') ?? '');
      await apiSend<CoverageZoneDto>(
        editing ? `/admin/coverage/${editing.id}` : '/admin/coverage',
        {
          name: String(form.get('name') ?? ''),
          cityId: String(form.get('cityId') ?? ''),
          status,
          expectedLiveDate: expected || undefined,
          capacityNote: String(form.get('capacityNote') ?? '') || undefined,
          isActive: true,
        },
        { method: editing ? 'PATCH' : 'POST' },
      );
      setMessage(editing ? 'Zone updated' : 'Zone created');
      setEditing(null);
      event.currentTarget.reset();
      reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save zone');
    }
  }

  async function remove(zone: CoverageZoneDto) {
    if (!window.confirm(`Remove zone “${zone.name}”?`)) return;
    try {
      await apiDelete(`/admin/coverage/${zone.id}`);
      setMessage('Zone removed');
      reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not remove zone');
    }
  }

  async function updateLead(lead: CoverageLeadDto, status: string) {
    try {
      await apiSend<CoverageLeadDto>(`/admin/coverage/leads/${lead.id}`, { status }, { method: 'PATCH' });
      setMessage('Lead updated');
      reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update lead');
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Coverage</h1>
          <p className="mt-2 text-sm text-slate-400">Zones feed the public availability checker.</p>
        </div>
        <Link href={adminRoutes.waitlist} className="text-sm font-semibold text-cyan-300">
          City waitlist →
        </Link>
      </div>
      <FormError message={error} />
      <FormSuccess message={message} />
      <table className="mt-6 w-full text-left text-sm">
        <thead className="text-slate-400">
          <tr>
            <th className="py-2">Zone</th>
            <th>City</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {zones.map((zone) => (
            <tr key={zone.id} className="border-t border-white/10">
              <td className="py-3">{zone.name}</td>
              <td>{zone.cityName}</td>
              <td>{zone.status}</td>
              <td className="text-right">
                <div className="flex justify-end gap-2">
                  <button type="button" className={ghostBtn} onClick={() => setEditing(zone)}>
                    Edit
                  </button>
                  <button type="button" className={dangerBtn} onClick={() => remove(zone)}>
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <form key={editing?.id ?? 'zone-new'} onSubmit={onSave} className="mt-8 max-w-xl space-y-3">
        <h2 className="font-semibold">{editing ? `Edit ${editing.name}` : 'Create zone'}</h2>
        <Field label="Name">
          <TextInput name="name" required defaultValue={editing?.name} />
        </Field>
        <Field label="City">
          <SelectInput name="cityId" required defaultValue={editing?.cityId}>
            <option value="">Select city</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Status">
          <SelectInput name="status" defaultValue={editing?.status ?? 'AVAILABLE'}>
            <option value="AVAILABLE">Available</option>
            <option value="COMING_SOON">Coming soon</option>
            <option value="NOT_AVAILABLE">Not available</option>
          </SelectInput>
        </Field>
        <Field label="Expected live date">
          <TextInput name="expectedLiveDate" type="date" defaultValue={editing?.expectedLiveDate?.slice(0, 10) ?? ''} />
        </Field>
        <Field label="Capacity note">
          <TextInput name="capacityNote" defaultValue={editing?.capacityNote ?? ''} />
        </Field>
        <div className="flex gap-3">
          <button type="submit" className={primaryBtn}>
            {editing ? 'Update zone' : 'Create zone'}
          </button>
          {editing ? (
            <button type="button" className={ghostBtn} onClick={() => setEditing(null)}>
              Cancel
            </button>
          ) : null}
        </div>
      </form>
      <h2 className="mt-12 font-semibold">Coverage leads</h2>
      <table className="mt-4 w-full text-left text-sm">
        <thead className="text-slate-400">
          <tr>
            <th className="py-2">Name</th>
            <th>City</th>
            <th>Result</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-t border-white/10">
              <td className="py-3">
                {lead.name}
                <div className="text-xs text-slate-500">{lead.mobile}</div>
              </td>
              <td>{lead.cityName}</td>
              <td>{lead.coverageResult}</td>
              <td>
                <select
                  className="rounded-lg border border-white/10 bg-[#0f1c36] px-2 py-1 text-xs"
                  value={lead.status}
                  onChange={(event) => updateLead(lead, event.target.value)}
                >
                  <option value="NEW">New</option>
                  <option value="CONTACTED">Contacted</option>
                  <option value="QUALIFIED">Qualified</option>
                  <option value="CONVERTED">Converted</option>
                  <option value="LOST">Lost</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
