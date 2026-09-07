'use client';

import { type FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import type { TicketDto } from '@stormfiber/types';
import { createTicketMessageSchema } from '@stormfiber/validation';
import { SectionHeading } from '@stormfiber/ui';
import { Field, FormError, TextArea } from '@/components/form-field';
import { apiGet, apiSend } from '@/lib/api';

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<TicketDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!params.id) return;
    apiGet<TicketDto>(`/tickets/${params.id}`)
      .then(setTicket)
      .catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Ticket not found'));
  }, [params.id]);

  async function onReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ticket) return;
    const form = new FormData(event.currentTarget);
    const parsed = createTicketMessageSchema.safeParse({
      body: String(form.get('body') ?? ''),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Write a message');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const updated = await apiSend<TicketDto>(`/tickets/${ticket.id}/messages`, parsed.data);
      setTicket(updated);
      event.currentTarget.reset();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not send the reply');
    } finally {
      setLoading(false);
    }
  }

  if (!ticket) return <p className="text-sm text-ink-600">Loading ticket…</p>;

  return (
    <div>
      <SectionHeading heading={ticket.subject} subheading={`${ticket.reference} · ${ticket.status}`} />
      <ol className="mt-8 space-y-4">
        {ticket.messages.map((message) => (
          <li key={message.id} className="rounded-xl border border-ink-100 p-4 text-sm">
            <p className="font-semibold">
              {message.authorName} · {message.authorType}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-ink-700">{message.body}</p>
          </li>
        ))}
      </ol>
      <form onSubmit={onReply} className="mt-8 max-w-lg space-y-4">
        <Field label="Reply">
          <TextArea name="body" required minLength={1} rows={4} />
        </Field>
        <FormError message={error} />
        <button
          type="submit"
          disabled={loading || ticket.status === 'CLOSED'}
          className="inline-flex h-11 items-center rounded-lg bg-surge-600 px-5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? 'Sending…' : 'Send reply'}
        </button>
      </form>
    </div>
  );
}
