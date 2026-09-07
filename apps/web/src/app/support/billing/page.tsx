'use client';

import { type FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { dashboardRoutes, publicRoutes } from '@stormfiber/config';
import { mobileSchema } from '@stormfiber/validation';
import { useAuth } from '@/lib/auth';

export default function BillPaymentPage() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && user) router.replace(dashboardRoutes.billing);
  }, [ready, user, router]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = identifier.trim();
    const mobile = mobileSchema.safeParse(value);
    const accountOk = /^[A-Za-z0-9-]{4,20}$/.test(value);
    if (!mobile.success && !accountOk) {
      setError('Enter a Pakistani mobile number or your account number');
      return;
    }
    router.push(`${publicRoutes.login}?next=${encodeURIComponent(dashboardRoutes.billing)}`);
  }

  return (
    <section className="bg-[#F3F7FC] py-16">
      <div className="sf-container max-w-xl">
        <h1 className="font-display text-3xl font-extrabold text-[#0C2340]">Bill payment</h1>
        <p className="mt-2 text-sm text-[#4B5563]">
          Invoices and wallet payments are only shown after you sign in. We do not invent a bill amount on this page.
        </p>
        <form onSubmit={onSubmit} className="sf-card mt-8 space-y-4 p-6">
          <label className="sf-label" htmlFor="lookup">Account number or mobile</label>
          <input
            id="lookup"
            className="sf-input"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="MX-1001 or 03XXXXXXXXX"
            required
          />
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button type="submit" className="sf-btn sf-btn-primary w-full justify-center">
            Continue to sign in
          </button>
        </form>
        <p className="mt-6 text-sm text-[#6B7280]">
          Bills are paid offline — cash on delivery, bank transfer, or at either Lahore office. There is no online Pay Now checkout.
        </p>
        <Link href={publicRoutes.login} className="mt-4 inline-block text-sm font-semibold text-[#2E86DE]">
          I already have an account →
        </Link>
      </div>
    </section>
  );
}
