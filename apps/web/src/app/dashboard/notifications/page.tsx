'use client';

import { useEffect, useState } from 'react';
import { formatDateTime } from '@stormfiber/config';
import type { NotificationDto, Paginated } from '@stormfiber/types';
import { EmptyState, SectionHeading } from '@stormfiber/ui';
import { apiGet, apiSend } from '@/lib/api';

export default function NotificationsPage() {
  const [items, setItems] = useState<NotificationDto[]>([]);

  useEffect(() => {
    apiGet<Paginated<NotificationDto>>('/notifications?pageSize=30')
      .then((result) => setItems(result.items))
      .catch(() => setItems([]));
  }, []);

  async function markAll() {
    await apiSend('/notifications/read-all', {}, { method: 'PATCH' });
    setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <SectionHeading heading="Notifications" />
        <button type="button" onClick={() => void markAll()} className="text-sm font-semibold text-storm-700">
          Mark all read
        </button>
      </div>
      {items.length === 0 ? (
        <div className="mt-8">
          <EmptyState title="No notifications" />
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {items.map((item) => (
            <li key={item.id} className={`rounded-xl border px-4 py-3 text-sm ${item.readAt ? 'border-ink-100' : 'border-surge-200 bg-surge-50'}`}>
              <p className="font-semibold">{item.title}</p>
              <p className="mt-1 text-ink-700">{item.body}</p>
              <p className="mt-1 text-ink-500">{formatDateTime(item.createdAt)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
