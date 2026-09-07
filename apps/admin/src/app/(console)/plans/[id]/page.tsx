'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { adminRoutes } from '@stormfiber/config';
import { PlanForm } from '../plan-form';

export default function AdminEditPlanPage() {
  const params = useParams<{ id: string }>();
  return (
    <div>
      <Link href={adminRoutes.plans} className="text-sm font-semibold text-cyan-300 hover:underline">
        ← Plans
      </Link>
      <h1 className="mt-3 font-display text-3xl font-semibold">Edit plan</h1>
      <p className="mt-2 text-sm text-slate-400">
        Change name, price, status, cities and add-ons, then save. Published updates appear on the website.
      </p>
      {params.id ? <PlanForm planId={params.id} /> : null}
    </div>
  );
}
