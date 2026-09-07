'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { dashboardNavigation, dashboardRoutes, publicRoutes } from '@stormfiber/config';
import { BrandLogo } from './brand-logo';
import { useAuth } from '@/lib/auth';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, ready, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (ready && (!user || !user.customerId)) {
      router.replace(`${publicRoutes.login}?next=${encodeURIComponent(pathname || dashboardRoutes.root)}`);
    }
  }, [ready, user, router, pathname]);

  if (!ready || !user?.customerId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F3F7FC]">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#2E86DE]/20 border-t-[#2E86DE]" />
          <p className="mt-4 text-sm text-[#4B5563]">Checking your session…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F7FC] lg:grid lg:grid-cols-[240px_1fr]">
      {navOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-[#0C2340]/40 lg:hidden"
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
        />
      ) : null}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(240px,86vw)] flex-col bg-[#0C2340] px-4 py-6 text-white transition-transform lg:static ${
          navOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <BrandLogo variant="light" compact />
        <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-[#7FD1F0]">Signed in</p>
        <p className="mt-1 font-display text-lg font-semibold">{user.fullName}</p>
        {user.accountNumber ? <p className="text-sm text-white/70">{user.accountNumber}</p> : null}
        <nav className="mt-6 flex flex-1 flex-col gap-1 overflow-y-auto text-sm" aria-label="Account">
          {dashboardNavigation.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-2 ${active ? 'bg-white/10 font-semibold text-[#7FD1F0]' : 'text-white/80 hover:bg-white/5'}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={() => {
            void logout().then(() => router.push(publicRoutes.home));
          }}
          className="mt-6 text-left text-sm font-semibold text-[#7FD1F0]"
        >
          Sign out
        </button>
      </aside>
      <div>
        <header className="flex items-center justify-between border-b border-[#E6EEF6] bg-white px-4 py-3 lg:hidden">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#F3F7FC] text-[#0C2340]"
            aria-expanded={navOpen}
            aria-label="Open account navigation"
            onClick={() => setNavOpen(true)}
          >
            <span className="flex flex-col gap-1.5">
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
              <span className="block h-0.5 w-5 bg-current" />
            </span>
          </button>
          <p className="text-sm font-semibold text-[#0C2340]">{user.fullName}</p>
        </header>
        <div className="px-4 py-8 sm:px-8">{children}</div>
      </div>
    </div>
  );
}
