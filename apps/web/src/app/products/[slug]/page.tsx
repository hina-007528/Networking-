import Link from 'next/link';
import { publicRoutes } from '@stormfiber/config';
import type { ProductDto } from '@stormfiber/types';
import { FeatureCard } from '@stormfiber/ui';
import { PageHero } from '@/components/page-hero';
import { ProductServiceIcon, uniqueIconKeys } from '@/components/product-service-icon';
import { apiGet } from '@/lib/api';
import { productHeroImage } from '@/lib/hero-images';

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await apiGet<ProductDto>(`/products/${slug}`).catch(() => null);

  if (!product) {
    return (
      <div className="sf-container py-16">
        <p className="text-[#5d6b7a]">This product is not published yet.</p>
      </div>
    );
  }

  const featureIcons = uniqueIconKeys(
    product.features.map((item) => ({ slug: item.title, iconKey: item.iconKey, name: item.title })),
  );

  return (
    <>
      <PageHero
        heading={product.heroHeadline ?? product.name}
        accent={product.tagline ?? undefined}
        subheading={product.heroSubheadline ?? product.description}
        image={productHeroImage(product.slug)}
      />
      <div className="sf-container py-12">
        {product.features.length === 0 ? (
          <p className="rounded-2xl border border-[#E6EEF6] bg-white px-6 py-10 text-center text-[#6B7280]">
            Features for this product have not been published yet.
          </p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {product.features.map((feature, index) => (
              <FeatureCard
                key={feature.id ?? feature.title}
                title={feature.title}
                description={feature.description}
                icon={<ProductServiceIcon iconKey={featureIcons[index]} slug={feature.title} name={feature.title} />}
              />
            ))}
          </div>
        )}
        <div className="mt-12 flex flex-wrap gap-3">
          <Link href={publicRoutes.getConnection} className="sf-btn sf-btn-primary">
            Get Majawar X Network
          </Link>
          <Link href={publicRoutes.plans} className="sf-btn sf-btn-outline">
            Check plans
          </Link>
        </div>
      </div>
    </>
  );
}
