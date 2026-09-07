'use client';

import Link from 'next/link';
import { dashboardRoutes, publicRoutes } from '@stormfiber/config';
import { useAuth } from '@/lib/auth';

export function AuthLinks({ className = '' }: { className?: string }) {
  const { user, ready } = useAuth();

  if (!ready) {
    return <span className={`inline-flex h-11 items-center text-sm leading-none text-current/50 ${className}`}>…</span>;
  }

  if (user) {
    return (
      <Link href={dashboardRoutes.root} className={`inline-flex h-11 items-center text-sm font-bold leading-none hover:text-[#2E86DE] ${className}`}>
        {user.firstName}&apos;s account
      </Link>
    );
  }

  return (
    <Link href={publicRoutes.login} className={`inline-flex h-11 items-center text-sm font-bold leading-none hover:text-[#2E86DE] ${className}`}>
      Sign In
    </Link>
  );
}
