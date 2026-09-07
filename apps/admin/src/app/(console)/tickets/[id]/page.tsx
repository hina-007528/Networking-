'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { TicketDto } from '@stormfiber/types';
import { Field, FormError, FormSuccess, SelectInput, TextInput } from '@/components/form-field';
import { apiGet, apiSend } from '@/lib/api';

export default function AdminTicketDetailPage() {
  const params = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<TicketDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    apiGet<TicketDto>(`/admin/tickets/${params.id}`)
      .then(setTicket)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Ticket not found'));
  }, [params.id]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ticket) return;
    const form = new FormData(event.currentTarget);
    setLoading(true);
    setError(null);
    try {
      const updated = await apiSend<TicketDto>(
        `/admin/tickets/${ticket.id}`,
        {
          status: String(form.get('status') ?? ticket.status),
          priority: String(form.get('priority') ?? ticket.priority),
          note: String(form.get('note') ?? '') || undefined,
        },
        { method: 'PATCH' },
      );
      setTicket(updated);
      setMessage('Ticket updated');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not update ticket');
    } finally {
      setLoading(false);
    }
  }

  if (!ticket) return <p className="text-sm text-slate-400">Loading ticket…</p>;

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">{ticket.subject}</h1>
      <p className="mt-2 text-sm text-slate-400">
        {ticket.reference} · {ticket.customerName} · {ticket.status}
      </p>
      <ol className="mt-6 space-y-3 text-sm">
        {ticket.messages.map((message) => (
          <li key={message.id} className="rounded-xl border border-white/10 p-4">
            <p className="font-semibold">
              {message.authorName} · {message.authorType}
              {message.isInternal ? ' · internal' : ''}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-slate-300">{message.body}</p>
          </li>
        ))}
      </ol>
      <form onSubmit={onSubmit} className="mt-8 max-w-lg space-y-4">
        <Field label="Status">
          <SelectInput name="status" defaultValue={ticket.status}>
            <option value="OPEN">Open</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="WAITING_FOR_CUSTOMER">Waiting for customer</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </SelectInput>
        </Field>
        <Field label="Priority">
          <SelectInput name="priority" defaultValue={ticket.priority}>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </SelectInput>
        </Field>
        <Field label="Note">
          <TextInput name="note" />
        </Field>
        <FormError message={error} />
        <FormSuccess message={message} />
        <button
          type="submit"
          disabled={loading}
          className="inline-flex h-11 items-center rounded-lg bg-cyan-500 px-5 text-sm font-semibold text-slate-950 disabled:opacity-60"
        >
          {loading ? 'Saving…' : 'Update ticket'}
        </button>
      </form>
    </div>
  );
}
