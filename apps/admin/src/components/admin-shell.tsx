'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { adminRoutes, brand } from '@stormfiber/config';
import { Permission, RoleName } from '@stormfiber/types';
import { useAuth } from '@/lib/auth';

const NAV_SECTIONS: Array<{
  label: string;
  items: Array<{ label: string; href: string; icon: string; permission?: Permission }>;
}> = [
  {
    label: 'Main',
    items: [
      { label: 'Overview', href: adminRoutes.dashboard, icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', permission: Permission.ANALYTICS_READ },
      { label: 'Customers', href: adminRoutes.customers, icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', permission: Permission.CUSTOMERS_READ },
      { label: 'Applications', href: adminRoutes.applications, icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', permission: Permission.APPLICATIONS_READ },
      { label: 'Subscriptions', href: adminRoutes.subscriptions, icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', permission: Permission.SUBSCRIPTIONS_READ },
      { label: 'Orders', href: adminRoutes.orders, icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', permission: Permission.CUSTOMERS_READ },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Invoices', href: adminRoutes.invoices, icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z', permission: Permission.INVOICES_READ },
      { label: 'Payments', href: adminRoutes.payments, icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', permission: Permission.PAYMENTS_READ },
    ],
  },
  {
    label: 'Catalogue',
    items: [
      { label: 'Plans', href: adminRoutes.plans, icon: 'M13 10V3L4 14h7v7l9-11h-7z', permission: Permission.PLANS_READ },
      { label: 'Products', href: adminRoutes.products, icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10', permission: Permission.PLANS_READ },
    ],
  },
  {
    label: 'Network',
    items: [
      { label: 'Cities', href: adminRoutes.cities, icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4', permission: Permission.COVERAGE_READ },
      { label: 'Coverage', href: adminRoutes.coverage, icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7', permission: Permission.COVERAGE_READ },
      { label: 'Waitlist', href: adminRoutes.waitlist, icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01', permission: Permission.COVERAGE_READ },
    ],
  },
  {
    label: 'Support',
    items: [
      { label: 'Tickets', href: adminRoutes.tickets, icon: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z', permission: Permission.TICKETS_READ },
      { label: 'Callbacks', href: adminRoutes.callbacks, icon: 'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z', permission: Permission.CALLBACKS_READ },
      { label: 'FAQs', href: adminRoutes.faqs, icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', permission: Permission.CONTENT_READ },
    ],
  },
  {
    label: 'Content',
    items: [
      { label: 'CMS Content', href: adminRoutes.content, icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z', permission: Permission.CONTENT_READ },
      { label: 'Offers', href: adminRoutes.offers, icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z', permission: Permission.CONTENT_READ },
    ],
  },
  {
    label: 'System',
    items: [
      { label: 'Users', href: adminRoutes.users, icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', permission: Permission.USERS_MANAGE },
      { label: 'Roles', href: adminRoutes.roles, icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', permission: Permission.ROLES_MANAGE },
      { label: 'Settings', href: adminRoutes.settings, icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', permission: Permission.SETTINGS_MANAGE },
      { label: 'Audit Logs', href: adminRoutes.auditLogs, icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', permission: Permission.AUDIT_LOGS_READ },
    ],
  },
];

function canSeeNav(permissions: string[], roles: string[], permission?: Permission): boolean {
  if (!permission) return true;
  if (roles.includes(RoleName.SUPER_ADMIN)) return true;
  return permissions.includes(permission);
}

function NavIcon({ d }: { d: string }) {
  return (
    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden">
      <svg width="16" height="16" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d={d} />
      </svg>
    </span>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, ready, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (ready && !user) router.replace(adminRoutes.login);
  }, [ready, user, router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060d1b]">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#2E86DE]/30 border-t-[#2E86DE]" />
          <p className="mt-4 text-sm text-slate-400">Checking staff session…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#060d1b] px-4">
        <div className="text-center">
          <p className="font-display text-2xl font-bold text-white">Staff sign-in required</p>
          <Link href={adminRoutes.login} className="mt-6 inline-flex h-11 items-center rounded-xl bg-[#2E86DE] px-6 text-sm font-bold text-white">
            Go to Staff Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#060d1b] text-slate-100">
      {navOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
        />
      ) : null}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[min(16.5rem,88vw)] shrink-0 flex-col overflow-hidden border-r border-white/6 bg-[#091225] transition-transform lg:static ${navOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center gap-2.5 border-b border-white/6 px-4">
          <svg width="28" height="28" viewBox="0 0 60 60" fill="none" className="shrink-0" aria-hidden>
            <circle cx="30" cy="30" r="26" stroke="#2E86DE" strokeWidth="2" fill="none" />
            <ellipse cx="30" cy="30" rx="13" ry="26" stroke="#2E86DE" strokeWidth="1.5" fill="none" opacity="0.5" />
            <line x1="4" y1="30" x2="56" y2="30" stroke="#2E86DE" strokeWidth="1.5" opacity="0.4" />
            <circle cx="30" cy="4" r="3" fill="#2E86DE" />
            <circle cx="56" cy="30" r="3" fill="#7FD1F0" />
            <circle cx="30" cy="56" r="3" fill="#2E86DE" />
            <circle cx="4" cy="30" r="3" fill="#7FD1F0" />
          </svg>
          <div className="min-w-0 leading-none">
            <p className="truncate font-display text-[11px] font-extrabold tracking-tight text-white">
              MAJAWAR<span className="text-[#7FD1F0]">X</span>NETWORK
            </p>
            <p className="mt-0.5 text-[10px] font-semibold text-[#7FD1F0] uppercase tracking-widest">Admin Console</p>
          </div>
        </div>

        {/* User badge */}
        <div className="flex shrink-0 items-center gap-2.5 border-b border-white/6 px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2E86DE] to-[#7FD1F0] text-xs font-bold text-white">
            {user.fullName?.[0] ?? 'A'}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-white">{user.fullName}</p>
            <p className="truncate text-[11px] text-slate-400">{user.email}</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5" aria-label="Admin navigation">
          {NAV_SECTIONS.map((section) => {
            const items = section.items.filter((item) => canSeeNav(user.permissions, user.roles, item.permission));
            if (items.length === 0) return null;
            return (
            <div key={section.label}>
              <p className="mb-1.5 px-2 text-[9px] font-extrabold uppercase tracking-[0.15em] text-slate-500">{section.label}</p>
              {items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex min-w-0 items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] leading-none transition-colors ${
                      active
                        ? 'bg-[#2E86DE]/15 font-semibold text-[#7FD1F0]'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                    }`}
                  >
                    <NavIcon d={item.icon} />
                    <span className="min-w-0 truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="border-t border-white/6 px-5 py-4">
          <button
            type="button"
            onClick={() => void logout().then(() => router.push(adminRoutes.login))}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex h-16 items-center justify-between border-b border-white/6 bg-[#091225]/80 px-4 backdrop-blur-sm sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/5 text-white lg:hidden"
              aria-expanded={navOpen}
              aria-label="Open navigation"
              onClick={() => setNavOpen(true)}
            >
              <span className="flex flex-col gap-1.5">
                <span className="block h-0.5 w-5 bg-current" />
                <span className="block h-0.5 w-5 bg-current" />
                <span className="block h-0.5 w-5 bg-current" />
              </span>
            </button>
          <p className="text-sm text-slate-400">
            {brand.name} <span className="mx-1.5 text-white/20">›</span>
            <span className="text-white capitalize">{pathname?.split('/')[1] ?? 'Dashboard'}</span>
          </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Notifications bell */}
            <button type="button" className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[#2E86DE]" />
            </button>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[#2E86DE] to-[#7FD1F0] text-sm font-bold text-white">
              {user.fullName?.[0] ?? 'A'}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
