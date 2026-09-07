import { publicRoutes } from '@stormfiber/config';
import type { ProductDto } from '@stormfiber/types';
import { PageHero } from '@/components/page-hero';
import { OptimizedImage } from '@/components/optimized-image';
import { ProductServiceIcon, uniqueIconKeys } from '@/components/product-service-icon';
import { apiGet } from '@/lib/api';
import { heroImages, uniqueProductImages } from '@/lib/hero-images';

export default async function ProductsPage() {
  const products = await apiGet<ProductDto[]>('/products').catch(() => [] as ProductDto[]);
  const iconKeys = uniqueIconKeys(products);
  const productImages = uniqueProductImages(products);

  return (
    <>
      <PageHero
        heading="One fibre."
        accent="Three services."
        subheading="Internet, television and extras published from the catalogue — not invented here."
        image={heroImages.products}
      />
      <div className="sf-container py-12">
        {products.length === 0 ? (
          <p className="rounded-2xl border border-[#E6EEF6] bg-white px-6 py-12 text-center text-[#6B7280]">
            No published products yet. Add them in the admin catalogue.
          </p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product, index) => (
              <a
                key={product.id}
                href={`/products/${product.slug}`}
                className="group overflow-hidden rounded-2xl border border-[#E6EEF6] bg-white shadow-[0_8px_32px_rgb(12_35_64/0.08)] transition-transform hover:-translate-y-1"
              >
                <div className="relative h-44 overflow-hidden">
                  <OptimizedImage
                    src={productImages[index]}
                    alt={product.name}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    className="h-44 object-cover"
                  />
                  <span className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#2E86DE] shadow-md">
                    <ProductServiceIcon iconKey={iconKeys[index]} slug={product.slug} name={product.name} />
                  </span>
                </div>
                <div className="p-6">
                  <h2 className="flex items-center gap-2.5 font-display text-xl font-extrabold text-[#0C2340]">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E8F3FC] text-[#2E86DE]">
                      <ProductServiceIcon iconKey={iconKeys[index]} slug={product.slug} name={product.name} className="h-5 w-5" />
                    </span>
                    {product.name}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#4B5563]">{product.tagline || product.description}</p>
                  <span className="mt-4 inline-block text-sm font-bold text-[#2E86DE] group-hover:underline">Learn more →</span>
                </div>
              </a>
            ))}
          </div>
        )}
        <p className="mt-10 text-center">
          <a href={publicRoutes.plans} className="sf-btn sf-btn-primary">
            View plans
          </a>
        </p>
      </div>
    </>
  );
}
