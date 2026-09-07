import Link from 'next/link';
import { dashboardRoutes, formatCurrency } from '@stormfiber/config';
import type { PlanDto } from '@stormfiber/types';
import { PageHero } from '@/components/page-hero';
import { apiGet } from '@/lib/api';
import { heroImages } from '@/lib/hero-images';

export default async function PlanDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const plan = await apiGet<PlanDto>(`/plans/${slug}`).catch(() => null);

  if (!plan) {
    return (
      <div className="sf-container py-16">
        <p>This plan is not published.</p>
      </div>
    );
  }

  return (
    <>
      <PageHero heading={plan.name} accent={plan.speedMbps ? `${plan.speedMbps} Mbps` : undefined} subheading={plan.shortDescription ?? plan.description} image={heroImages.planDetail} />
      <div className="sf-container grid gap-8 py-12 lg:grid-cols-[1fr_20rem]">
        <div className="sf-card p-6 sm:p-8">
          <h2 className="sf-h3">What’s included</h2>
          <ul className="mt-5 space-y-3 text-sm text-[#5d6b7a]">
            {plan.features.map((feature) => (
              <li key={feature.id} className="flex gap-2">
                <span className="text-[#2E86DE]">✓</span>
                <span>{feature.label}</span>
              </li>
            ))}
          </ul>
          {plan.addons.length > 0 ? (
            <>
              <h3 className="mt-8 font-display text-lg font-extrabold">Add-ons</h3>
              <ul className="mt-3 space-y-2 text-sm text-[#5d6b7a]">
                {plan.addons.map((addon) => (
                  <li key={addon.id}>
                    {addon.name} for {formatCurrency(addon.oneTimePrice || addon.monthlyPrice, { currency: addon.currency })}*
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
        <aside className="sf-card h-fit p-6">
          <p className="text-xs font-bold uppercase tracking-wider text-[#8a96a3]">Monthly cost</p>
          <p className="mt-1 font-display text-3xl font-extrabold text-[#1b2430]">{formatCurrency(plan.monthlyPrice, { currency: plan.currency })}</p>
          <p className="mt-3 text-sm text-[#5d6b7a]">One-time cost {formatCurrency(plan.installationPrice, { currency: plan.currency })}*</p>
          <Link href={dashboardRoutes.orderReview(plan.id)} className="sf-btn sf-btn-primary mt-6 w-full">
            Order Now
          </Link>
          <p className="mt-4 text-xs text-[#8a96a3]">*All prices are exclusive of taxes.</p>
        </aside>
      </div>
    </>
  );
}
