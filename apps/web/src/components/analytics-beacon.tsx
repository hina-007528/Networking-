'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AnalyticsEventName } from '@stormfiber/types';
import { apiSend } from '@/lib/api';

function sessionId(): string {
  const key = 'sf.analyticsSession';
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.sessionStorage.setItem(key, created);
  return created;
}

export function AnalyticsBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    apiSend('/analytics/events', {
      name: AnalyticsEventName.PAGE_VIEW,
      path: pathname,
      sessionId: sessionId(),
    }).catch(() => undefined);
  }, [pathname]);

  return null;
}
