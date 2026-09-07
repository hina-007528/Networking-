'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatMonthlyPrice, formatSpeed } from '@stormfiber/config';
import type { Paginated, PlanDto } from '@stormfiber/types';
import { EmptyState } from '@stormfiber/ui';
import { FormError } from '@/components/form-field';
import { apiGet } from '@/lib/api';

export default function ComparePlansPage() {
  const [plans, setPlans] = useState<PlanDto[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [compared, setCompared] = useState<PlanDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Paginated<PlanDto>>('/plans?pageSize=24')
      .then((result) => setPlans(result.items))
      .catch(() => setPlans([]));
  }, []);

  const rows = useMemo(
    () => [
      { label: 'Monthly price', value: (plan: PlanDto) => formatMonthlyPrice(plan.monthlyPrice, plan.currency) },
      { label: 'Speed', value: (plan: PlanDto) => formatSpeed(plan.speedMbps) },
      { label: 'Upload', value: (plan: PlanDto) => formatSpeed(plan.uploadMbps) },
      { label: 'Services', value: (plan: PlanDto) => plan.services.join(', ') },
      { label: 'TV channels', value: (plan: PlanDto) => (plan.tvChannels ? String(plan.tvChannels) : '—') },
      { label: 'Installation', value: (plan: PlanDto) => formatMonthlyPrice(plan.installationPrice, plan.currency).replace('/mo', '') },
    ],
    [],
  );

  function toggle(id: string) {
    setSelected((current) => {
      if (current.includes(id)) return current.filter((item) => item !== id);
      if (current.length >= 4) return current;
      return [...current, id];
    });
  }

  async function compare() {
    setError(null);
    if (selected.length < 2) {
      setError('Select at least two plans');
      return;
    }
    try {
      const result = await apiGet<PlanDto[]>(`/plans/compare?planIds=${selected.join(',')}`);
      setCompared(result);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not compare plans');
    }
  }

  return (
    <div className="sf-container py-12">
      <h1 className="sf-h1">Compare plans</h1>
      <p className="sf-lead mt-3">Select up to four packages to compare speeds, monthly charges, and inclusions.</p>

      {plans.length === 0 ? (
        <div className="mt-10">
          <EmptyState title="No plans available" body="Unable to load the tariff catalogue for comparison." />
        </div>
      ) : (
        <div className="mt-10">
          <h3 className="font-display text-xl font-extrabold text-[#1b2430]">Select plans</h3>
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <label
                key={plan.id}
                className={`flex cursor-pointer items-start gap-4 rounded-xl border p-4 ${
                  selected.includes(plan.id) ? 'border-[#2E86DE] bg-[#E8F3FC]' : 'border-[#e4e9ef] bg-white'
                }`}
              >
                <input type="checkbox" className="mt-1" checked={selected.includes(plan.id)} onChange={() => toggle(plan.id)} />
                <div>
                  <span className="block font-bold text-[#1b2430]">{plan.name}</span>
                  <span className="mt-1 block text-sm font-semibold text-[#2E86DE]">
                    {formatMonthlyPrice(plan.monthlyPrice, plan.currency)}
                  </span>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8 flex items-center gap-4">
        <button type="button" onClick={() => void compare()} disabled={selected.length < 2} className="sf-btn sf-btn-primary">
          Compare selected packages
        </button>
        {selected.length < 2 ? <p className="text-sm text-[#5d6b7a]">Select at least {2 - selected.length} more plan(s)</p> : null}
      </div>
      
      <div className="mt-4 max-w-md">
        <FormError message={error} />
      </div>

      {compared.length > 0 ? (
        <div className="mt-12 overflow-hidden rounded-xl border border-[#e4e9ef] bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-[#5d6b7a]">
              <thead className="border-b border-[#e4e9ef] text-xs uppercase text-[#8a96a3]">
                <tr>
                  <th className="w-1/4 px-6 py-5 font-bold">Comparison</th>
                  {compared.map((plan) => (
                    <th key={plan.id} className="px-6 py-5 font-bold">
                      <span className="block text-lg text-[#1b2430]">{plan.name}</span>
                      <span className="mt-1 block text-[#2E86DE]">{plan.speedMbps ? `${plan.speedMbps} Mbps` : ''}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e4e9ef]">
                {rows.map((row) => (
                  <tr key={row.label}>
                    <td className="bg-[#f3f5f8] px-6 py-4 font-semibold text-[#1b2430]">{row.label}</td>
                    {compared.map((plan) => (
                      <td key={`${row.label}-${plan.id}`} className="px-6 py-4">
                        {row.value(plan)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
