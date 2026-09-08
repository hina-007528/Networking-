'use client';

import { useEffect, useState } from 'react';
import { formatDateTime } from '@stormfiber/config';
import type { CityWaitlistDto } from '@stormfiber/types';
import { FormError } from '@/components/form-field';
import { apiGet } from '@/lib/api';

export default function AdminWaitlistPage() {
  const [rows, setRows] = useState<CityWaitlistDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<CityWaitlistDto[]>('/admin/coverage/waitlist')
      .then(setRows)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Could not load waitlist'));
  }, []);

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">City waitlist</h1>
      <p className="mt-2 text-sm text-slate-400">People who asked to be notified when we expand beyond the live service city.</p>
      <FormError message={error} />
      <table className="mt-6 w-full text-left text-sm">
        <thead className="text-slate-400">
          <tr>
            <th className="py-2">Name</th>
            <th>Phone</th>
            <th>City</th>
            <th>Requested</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="py-6 text-slate-400" colSpan={4}>
                No waitlist entries yet.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="border-t border-white/10">
                <td className="py-3">{row.name}</td>
                <td>{row.phone}</td>
                <td>{row.city}</td>
                <td>{formatDateTime(row.createdAt)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
