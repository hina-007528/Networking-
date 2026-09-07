'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { dashboardRoutes } from '@stormfiber/config';
import type { Paginated, TicketDto } from '@stormfiber/types';
import { EmptyState, SectionHeading } from '@stormfiber/ui';
import { apiGet } from '@/lib/api';

export default function TicketsPage() {
  const [tickets, setTickets] = useState<TicketDto[]>([]);

  useEffect(() => {
    apiGet<Paginated<TicketDto>>('/tickets?pageSize=20')
      .then((result) => setTickets(result.items))
      .catch(() => setTickets([]));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <SectionHeading heading="Support tickets" subheading="Your conversations with support." />
        <Link
          href={dashboardRoutes.ticketNew}
          className="inline-flex h-11 items-center rounded-lg bg-surge-600 px-4 text-sm font-semibold text-white"
        >
          New ticket
        </Link>
      </div>
      {tickets.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No tickets yet" />
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-ink-100 rounded-2xl border border-ink-100">
          {tickets.map((ticket) => (
            <li key={ticket.id} className="px-4 py-4">
              <Link href={dashboardRoutes.ticketDetail(ticket.id)} className="block">
                <p className="font-semibold">{ticket.subject}</p>
                <p className="text-sm text-ink-600">
                  {ticket.reference} · {ticket.status}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
