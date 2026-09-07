import { publicRoutes } from '@stormfiber/config';
import type { PromotionDto } from '@stormfiber/types';
import { EmptyState, OfferCard } from '@stormfiber/ui';
import { PageHero } from '@/components/page-hero';
import { apiGet } from '@/lib/api';
import { heroImages } from '@/lib/hero-images';

export default async function OffersPage() {
  const offers = await apiGet<PromotionDto[]>('/offers').catch(() => []);

  return (
    <>
      <PageHero heading="Offers you" accent="cannot resist!" subheading="We got some great broadband deals in store for you. Check them out!" image={heroImages.offers} />
      <div className="sf-container py-12">
        <div className="grid gap-6 md:grid-cols-2">
          {offers.length ? (
            offers.map((offer) => (
              <OfferCard
                key={offer.id}
                title={offer.name}
                description={offer.description ?? ''}
                href={`${publicRoutes.offers}/${offer.slug}`}
                badge={offer.badgeText ?? undefined}
              />
            ))
          ) : (
            <EmptyState title="No live promotions" body="Published promotions from the catalogue will appear here." />
          )}
        </div>
      </div>
    </>
  );
}
