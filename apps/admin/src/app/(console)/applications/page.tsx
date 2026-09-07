'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminRoutes } from '@stormfiber/config';
import type { ApplicationDto, Paginated } from '@stormfiber/types';
import { apiGet, readItems } from '@/lib/api';

export default function AdminApplicationsPage() {
  const [rows, setRows] = useState<ApplicationDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Paginated<ApplicationDto>>('/admin/applications?pageSize=30')
      .then((result) => setRows(readItems(result)))
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Could not load applications'));
  }, []);

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Applications</h1>
      {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
      <table className="mt-6 w-full text-left text-sm">
        <thead className="text-slate-400">
          <tr>
            <th className="py-2">Reference</th>
            <th>Applicant</th>
            <th>Status</th>
            <th>City</th>
            <th>Plan</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-white/10">
              <td className="py-3">
                <Link href={adminRoutes.applicationDetail(row.id)} className="font-semibold text-cyan-300">
                  {row.reference}
                </Link>
              </td>
              <td>
                {row.firstName} {row.lastName}
              </td>
              <td>{row.status}</td>
              <td>{row.cityName}</td>
              <td>{row.planName ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
