'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminRoutes, formatCurrency } from '@stormfiber/config';
import type { Paginated, PlanDto } from '@stormfiber/types';
import { dangerBtn, ghostBtn } from '@/components/form-field';
import { apiDelete, apiGet, readItems } from '@/lib/api';

export default function AdminPlansPage() {
  const [rows, setRows] = useState<PlanDto[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function reload() {
    const params = new URLSearchParams({ pageSize: '40' });
    if (search) params.set('search', search);
    apiGet<Paginated<PlanDto>>(`/admin/plans?${params.toString()}`)
      .then((result) => setRows(readItems(result)))
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Could not load plans'));
  }

  useEffect(() => {
    reload();
  }, [search]);

  async function archive(row: PlanDto) {
    if (!window.confirm(`Archive “${row.name}”? Customers will no longer see it.`)) return;
    setError(null);
    try {
      await apiDelete(`/admin/plans/${row.id}`);
      setMessage('Plan archived');
      reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not archive plan');
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Plans</h1>
          <p className="mt-2 text-sm text-slate-400">Prices and availability come from PostgreSQL, not the browser.</p>
        </div>
        <Link
          href={adminRoutes.planNew}
          className="inline-flex h-10 items-center rounded-lg bg-cyan-500 px-4 text-sm font-semibold text-slate-950"
        >
          New plan
        </Link>
      </div>
      <input
        className="mt-6 w-full max-w-md rounded-lg border border-white/10 bg-[#0f1c36] px-3 py-2 text-sm"
        placeholder="Search plans"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
      {message ? <p className="mt-4 text-sm text-emerald-400">{message}</p> : null}
      <table className="mt-6 w-full text-left text-sm">
        <thead className="text-slate-400">
          <tr>
            <th className="py-2">Name</th>
            <th>Kind</th>
            <th>Status</th>
            <th>Monthly</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-white/10">
              <td className="py-3">
                <Link href={adminRoutes.planEdit(row.id)} className="font-semibold text-cyan-300">
                  {row.name}
                </Link>
              </td>
              <td>{row.kind}</td>
              <td>{row.status}</td>
              <td>{formatCurrency(row.monthlyPrice, { currency: row.currency })}</td>
              <td className="text-right">
                <div className="flex justify-end gap-2">
                  <Link href={adminRoutes.planEdit(row.id)} className={ghostBtn}>
                    Edit
                  </Link>
                  <button type="button" className={dangerBtn} onClick={() => archive(row)}>
                    Archive
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
