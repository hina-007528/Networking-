'use client';

import type { ReactNode } from 'react';
import type { SiteSettingsDto } from '@stormfiber/types';
import { usePathname } from 'next/navigation';
import { SiteHeader } from './site-header';

const HIDE_CHROME = ['/login', '/register', '/forgot-password', '/reset-password', '/dashboard', '/portal'];

export function SiteChrome({
  children,
  footer,
  settings,
}: {
  children: ReactNode;
  footer: ReactNode;
  settings?: SiteSettingsDto | null;
}) {
  const pathname = usePathname();
  const hide = HIDE_CHROME.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  if (hide) {
    return <>{children}</>;
  }

  return (
    <>
      <SiteHeader settings={settings} />
      {children}
      {footer}
    </>
  );
}
