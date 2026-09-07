import Link from 'next/link';
import { dashboardRoutes, formatCurrency, publicRoutes } from '@stormfiber/config';
import type { OfferDetailDto, PlanDto, PromotionDto } from '@stormfiber/types';
import { PlanCard } from '@stormfiber/ui';
import { PageHero } from '@/components/page-hero';
import { apiGet } from '@/lib/api';
import { heroImages } from '@/lib/hero-images';

function isOfferDetail(value: OfferDetailDto | PromotionDto): value is OfferDetailDto {
  return Array.isArray((value as OfferDetailDto).plans);
}

export default async function OfferDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const offer =
    (await apiGet<OfferDetailDto>(`/offers/${slug}`).catch(() => null)) ??
    (await apiGet<PromotionDto>(`/offers/${slug}`).catch(() => null));

  if (!offer) {
    return (
      <div className="sf-container py-16">
        <p>This offer is not published.</p>
      </div>
    );
  }

  const plans: PlanDto[] = isOfferDetail(offer) ? offer.plans : [];

  return (
    <>
      <PageHero heading={offer.name} accent={offer.badgeText ?? undefined} subheading={offer.description ?? undefined} image={heroImages.offerDetail} />
      <div className="sf-container py-12">
        {plans.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard
                key={plan.id}
                name={plan.name}
                speedLabel={plan.speedMbps ? `${plan.speedMbps} Mbps` : null}
                priceLabel={formatCurrency(plan.monthlyPrice, { currency: plan.currency })}
                installationLabel={formatCurrency(plan.installationPrice, { currency: plan.currency })}
                href={dashboardRoutes.orderReview(plan.id)}
                badge={plan.badgeText}
                services={plan.services}
              />
            ))}
          </div>
        ) : (
          <Link href={publicRoutes.plans} className="sf-btn sf-btn-primary">
            Check plans
          </Link>
        )}
      </div>
    </>
  );
}
