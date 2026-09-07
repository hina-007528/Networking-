'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminRoutes } from '@stormfiber/config';
import type { Paginated, TicketDto } from '@stormfiber/types';
import { apiGet, readItems } from '@/lib/api';

export default function AdminTicketsPage() {
  const [rows, setRows] = useState<TicketDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Paginated<TicketDto>>('/admin/tickets?pageSize=30')
      .then((result) => setRows(readItems(result)))
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Could not load tickets'));
  }, []);

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Tickets</h1>
      {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
      <table className="mt-6 w-full text-left text-sm">
        <thead className="text-slate-400">
          <tr>
            <th className="py-2">Reference</th>
            <th>Subject</th>
            <th>Status</th>
            <th>Customer</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-white/10">
              <td className="py-3">
                <Link href={adminRoutes.ticketDetail(row.id)} className="font-semibold text-cyan-300">
                  {row.reference}
                </Link>
              </td>
              <td>{row.subject}</td>
              <td>{row.status}</td>
              <td>{row.customerName}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
