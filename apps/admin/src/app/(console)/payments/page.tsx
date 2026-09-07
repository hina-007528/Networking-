'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminRoutes, formatCurrency, formatDateTime } from '@stormfiber/config';
import type { Paginated, PaymentDto } from '@stormfiber/types';
import { apiGet, readItems } from '@/lib/api';

export default function AdminPaymentsPage() {
  const [rows, setRows] = useState<PaymentDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Paginated<PaymentDto>>('/admin/payments?pageSize=30')
      .then((result) => setRows(readItems(result)))
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Could not load payments'));
  }, []);

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Payments</h1>
      {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
      <table className="mt-6 w-full text-left text-sm">
        <thead className="text-slate-400">
          <tr>
            <th className="py-2">Reference</th>
            <th>Status</th>
            <th>Method</th>
            <th>Amount</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-white/10">
              <td className="py-3 font-semibold">
                <Link href={adminRoutes.paymentDetail(row.id)} className="text-cyan-300">
                  {row.reference}
                </Link>
              </td>
              <td>{row.status}</td>
              <td>{row.method}</td>
              <td>{formatCurrency(row.amount, { currency: row.currency })}</td>
              <td>{formatDateTime(row.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
