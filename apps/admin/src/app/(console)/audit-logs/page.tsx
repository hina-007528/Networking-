'use client';

import { useEffect, useState } from 'react';
import { formatDateTime } from '@stormfiber/config';
import type { AuditLogDto, Paginated } from '@stormfiber/types';
import { apiGet, readItems } from '@/lib/api';

export default function AdminAuditLogsPage() {
  const [rows, setRows] = useState<AuditLogDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<Paginated<AuditLogDto>>('/admin/audit-logs?pageSize=40')
      .then((result) => setRows(readItems(result)))
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Could not load audit logs'));
  }, []);

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Audit logs</h1>
      {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}
      <ul className="mt-6 space-y-3 text-sm">
        {rows.map((row) => (
          <li key={row.id} className="rounded-xl border border-white/10 px-4 py-3">
            <p className="font-semibold">
              {row.action} · {row.entity}
              {row.entityId ? ` · ${row.entityId}` : ''}
            </p>
            <p className="mt-1 text-slate-400">
              {row.userName ?? 'System'} · {formatDateTime(row.createdAt)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
