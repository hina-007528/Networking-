'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminRoutes, formatCurrency } from '@stormfiber/config';
import type { Paginated, SubscriptionDto } from '@stormfiber/types';
import { apiGet, readItems } from '@/lib/api';

export default function AdminSubscriptionsPage() {
  const [rows, setRows] = useState<SubscriptionDto[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams({ pageSize: '40' });
    if (search) params.set('search', search);
    apiGet<Paginated<SubscriptionDto>>(`/admin/subscriptions?${params.toString()}`)
      .then((result) => setRows(readItems(result)))
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Could not load subscriptions'));
  }, [search]);

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Subscriptions</h1>
      <input
        className="mt-6 w-full max-w-md rounded-lg border border-white/10 bg-[#0f1c36] px-3 py-2 text-sm"
        placeholder="Search reference or customer"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
      <table className="mt-6 w-full text-left text-sm">
        <thead className="text-slate-400">
          <tr>
            <th className="py-2">Reference</th>
            <th>Customer</th>
            <th>Plan</th>
            <th>Status</th>
            <th>Monthly</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-white/10">
              <td className="py-3">
                <Link href={adminRoutes.subscriptionDetail(row.id)} className="font-semibold text-cyan-300">
                  {row.reference}
                </Link>
              </td>
              <td>{row.customerName ?? row.customerAccountNumber ?? row.customerId}</td>
              <td>{row.planName}</td>
              <td>{row.status}</td>
              <td>{formatCurrency(row.monthlyAmount, { currency: row.currency })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
