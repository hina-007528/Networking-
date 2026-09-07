'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { adminRoutes, formatCurrency, formatDate } from '@stormfiber/config';
import type { InvoiceDto, Paginated } from '@stormfiber/types';
import { apiGet, readItems } from '@/lib/api';

function paidLabel(row: InvoiceDto): string {
  if (row.status !== 'PAID') return row.status;
  const method = row.paidMethod ? row.paidMethod.replace('_', ' ') : 'offline';
  return row.paidByAdminName ? `Paid · ${method} · ${row.paidByAdminName}` : `Paid · ${method}`;
}

export default function AdminInvoicesPage() {
  const [rows, setRows] = useState<InvoiceDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    apiGet<Paginated<InvoiceDto>>('/admin/invoices?pageSize=30')
      .then((result) => setRows(readItems(result)))
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Could not load invoices'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Billing</h1>
      {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="text-slate-400">
            <tr>
              <th className="py-2">Number</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Marked paid by / method</th>
              <th>Due</th>
              <th>Amount due</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-white/10">
                <td className="py-3 font-semibold">
                  <Link href={adminRoutes.invoiceDetail(row.id)} className="text-cyan-300">
                    {row.invoiceNumber}
                  </Link>
                </td>
                <td>{row.customerName}</td>
                <td>{row.status}</td>
                <td>{row.status === 'PAID' ? paidLabel(row) : '—'}</td>
                <td>{formatDate(row.dueDate)}</td>
                <td>{formatCurrency(row.amountDue, { currency: row.currency })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
