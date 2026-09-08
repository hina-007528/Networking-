'use client';

import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import type { CallbackRequestDto, Paginated } from '@stormfiber/types';
import { FormError, FormSuccess, SelectInput } from '@/components/form-field';
import { apiGet, apiSend, readItems } from '@/lib/api';

export default function AdminCallbacksPage() {
  const [rows, setRows] = useState<CallbackRequestDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const result = await apiGet<Paginated<CallbackRequestDto>>('/admin/callbacks?pageSize=30');
    setRows(readItems(result));
  }

  useEffect(() => {
    load().catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Could not load callbacks'));
  }, []);

  async function update(event: FormEvent<HTMLFormElement>, id: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError(null);
    try {
      await apiSend(`/admin/callbacks/${id}`, { status: String(form.get('status') ?? '') }, { method: 'PATCH' });
      setMessage('Callback updated');
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update callback');
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">Callbacks</h1>
      <FormError message={error} />
      <FormSuccess message={message} />
      <ul className="mt-6 space-y-4">
        {rows.map((row) => (
          <li key={row.id} className="rounded-2xl border border-white/10 p-4 text-sm">
            <p className="font-semibold">
              {row.reference} · {row.name} · {row.phone}
            </p>
            <p className="mt-1 text-slate-400">{row.subject}</p>
            <form onSubmit={(event) => void update(event, row.id)} className="mt-3 flex flex-wrap items-center gap-3">
              <SelectInput name="status" defaultValue={row.status}>
                <option value="NEW">New</option>
                <option value="CONTACTED">Contacted</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </SelectInput>
              <button type="submit" className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950">
                Save
              </button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
