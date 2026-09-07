import { Suspense } from 'react';
import Link from 'next/link';
import { dashboardRoutes, formatMonthlyPrice, publicRoutes, SERVICE_CITY_SLUG } from '@stormfiber/config';
import type { CityDto, Paginated, PlanDto } from '@stormfiber/types';
import { apiGet, readItems } from '@/lib/api';
import { heroImages } from '@/lib/hero-images';
import { PlansCityFilter } from './city-filter';

export const metadata = { title: 'Plans & Packages' };

async function loadPlans(city?: string): Promise<PlanDto[]> {
  try {
    const params = new URLSearchParams({ page: '1', pageSize: '24' });
    if (city) params.set('city', city);
    const data = await apiGet<Paginated<PlanDto> | PlanDto[]>(`/plans?${params}`);
    return readItems(data);
  } catch {
    return [];
  }
}

function PlanCard({ plan }: { plan: PlanDto }) {
  const href = dashboardRoutes.orderReview(plan.id);
  return (
    <div className={`relative flex flex-col rounded-2xl border p-8 transition-all duration-300 hover:-translate-y-1 ${
      plan.featured
        ? 'border-[#2E86DE]/60 bg-white shadow-[0_8px_48px_rgba(46,134,222,0.2)]'
        : 'border-[#E6EEF6] bg-white hover:border-[#2E86DE]/30 hover:shadow-[0_12px_40px_rgb(12_35_64/0.1)]'
    }`}>
      {plan.featured || plan.badgeText ? (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-[#2E86DE] px-5 py-1 text-xs font-extrabold uppercase tracking-widest text-white">
            {plan.badgeText ?? 'Featured'}
          </span>
        </div>
      ) : null}

      <div>
        <p className="text-sm font-bold uppercase tracking-widest text-[#2E86DE]">{plan.name}</p>
        <p className="mt-2 font-display text-4xl font-extrabold text-[#0C2340]">
          {plan.speedMbps ? `${plan.speedMbps} Mbps` : plan.kind}
        </p>
        <p className="mt-1 text-xs text-[#6B7280]">{plan.shortDescription || plan.description}</p>
      </div>

      <div className="my-6 flex items-baseline gap-1">
        <span className="font-display text-3xl font-extrabold text-[#0C2340]">
          {formatMonthlyPrice(plan.monthlyPrice, plan.currency)}
        </span>
        <span className="text-sm text-[#6B7280]">/month</span>
      </div>

      <ul className="flex-1 space-y-3">
        {plan.features.slice(0, 6).map((feature) => (
          <li key={feature.id ?? feature.label} className="flex items-center gap-2.5 text-sm text-[#4B5563]">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E8F3FC] text-[10px] font-bold text-[#2E86DE]">✓</span>
            {feature.label}
          </li>
        ))}
      </ul>

      <Link
        href={href}
        className={`mt-8 flex min-h-11 w-full items-center justify-center rounded-xl py-3.5 text-sm font-bold ${
          plan.featured
            ? 'bg-[#2E86DE] text-white hover:bg-[#145DA0]'
            : 'border-2 border-[#0C2340] text-[#0C2340] hover:bg-[#0C2340] hover:text-white'
        }`}
      >
        Order Now →
      </Link>
      <Link href={publicRoutes.planDetail(plan.slug)} className="mt-3 text-center text-xs font-semibold text-[#2E86DE]">
        Full terms
      </Link>
    </div>
  );
}

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const params = await searchParams;
  const city = params.city ?? SERVICE_CITY_SLUG;
  const [plans, cities] = await Promise.all([
    loadPlans(city),
    apiGet<CityDto[]>('/cities').catch(() => [] as CityDto[]),
  ]);
  const kinds = Array.from(new Set(plans.map((plan) => plan.kind)));

  return (
    <>
      <section className="relative overflow-hidden bg-[#0C2340] py-24 text-white">
        <img src={heroImages.plans} alt="" loading="lazy" decoding="async" className="hero-kenburns is-loop pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30" aria-hidden />
        <div className="hero-light-streak" aria-hidden />
        <div className="absolute inset-0 bg-[#0C2340]/65" />
        <div className="sf-container relative z-[2] text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#7FD1F0]/30 bg-[#7FD1F0]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#7FD1F0]">
            Plans / Products
          </span>
          <h1 className="mt-5 font-display text-[clamp(2.2rem,5vw,4rem)] font-extrabold leading-tight">
            Pick the speed that fits <span className="text-[#7FD1F0]">your life</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/65">
            Prices and features below are loaded from the catalogue — nothing is invented on this page.
          </p>
        </div>
      </section>

      <section className="bg-[#F3F7FC] py-20">
        <div className="sf-container">
          <Suspense fallback={null}>
            <PlansCityFilter
              currentCity={city}
              cities={cities.filter((item) => item.isActive).map((item) => ({ name: item.name, slug: item.slug }))}
            />
          </Suspense>
          {kinds.length > 1 ? (
            <p className="mb-8 text-center text-sm text-[#6B7280]">
              Showing {kinds.join(', ')} plans published by operations.
            </p>
          ) : null}
          {plans.length === 0 ? (
            <p className="rounded-2xl border border-[#E6EEF6] bg-white px-6 py-12 text-center text-[#6B7280]">
              No published plans yet. Add them in the admin catalogue.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => <PlanCard key={plan.id} plan={plan} />)}
            </div>
          )}
          <div className="mt-12 text-center">
            <Link href={publicRoutes.compare} className="sf-btn border-2 border-[#0C2340] px-8 text-[#0C2340] hover:bg-[#0C2340] hover:text-white">
              Compare All Plans →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
