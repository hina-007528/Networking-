'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { adminRoutes, formatDateTime } from '@stormfiber/config';
import type { OrderDto, Paginated } from '@stormfiber/types';
import { apiGet, readItems } from '@/lib/api';

export default function AdminOrdersPage() {
  const [rows, setRows] = useState<OrderDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    apiGet<Paginated<OrderDto>>('/admin/orders?pageSize=40')
      .then((result) => setRows(readItems(result)))
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Could not load orders'));
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 15000);
    return () => window.clearInterval(timer);
  }, [load]);

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Orders</h1>
      <p className="mt-2 text-sm text-slate-400">
        Every order appears here immediately, including ones abandoned before the OTP was entered.
      </p>
      {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="text-slate-400">
            <tr>
              <th className="py-2">Customer</th>
              <th>Plan</th>
              <th>OTP status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-white/10">
                <td className="py-3">
                  <Link href={adminRoutes.orderDetail(row.id)} className="font-semibold text-cyan-300">
                    {row.customerName}
                  </Link>
                  <p className="text-xs text-slate-500">
                    <Link href={adminRoutes.customerDetail(row.customerId)} className="hover:text-cyan-300">
                      {row.customerEmail}
                    </Link>
                    {' · '}
                    {row.customerMobile}
                  </p>
                </td>
                <td>{row.planName}</td>
                <td>{row.status.replace('_', ' ')}</td>
                <td>{formatDateTime(row.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
