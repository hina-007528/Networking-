import Link from 'next/link';
import { dashboardRoutes, formatMonthlyPrice, publicRoutes, SERVICE_CITY } from '@stormfiber/config';
import type {
  CmsSectionDto,
  CoverageSummaryDto,
  HomepageDto,
  Paginated,
  PlanDto,
  ProductDto,
  PromotionDto,
} from '@stormfiber/types';
import { FiberBanner } from '@/components/fiber-banner';
import { HeroSlider } from '@/components/hero-slider';
import { OptimizedImage } from '@/components/optimized-image';
import { ProductServiceIcon, uniqueIconKeys } from '@/components/product-service-icon';
import { apiGet, readItems } from '@/lib/api';
import { heroImages, uniqueProductImages } from '@/lib/hero-images';

const HERO_BACKGROUNDS = [...heroImages.home];
const PREVIOUS_HERO_IMAGES = ['/images/hero/bg5.png', '/images/hero/bg8.png', '/images/products/hdtv.png'] as const;

function slidesFromCms(slides: HomepageDto['slides']): HomepageDto['slides'] {
  return slides.map((slide, index) => ({
    ...slide,
    desktopImageUrl:
      index < PREVIOUS_HERO_IMAGES.length
        ? PREVIOUS_HERO_IMAGES[index]
        : slide.desktopImageUrl || slide.mobileImageUrl || HERO_BACKGROUNDS[index % HERO_BACKGROUNDS.length],
    mobileImageUrl:
      index < PREVIOUS_HERO_IMAGES.length ? PREVIOUS_HERO_IMAGES[index] : (slide.mobileImageUrl ?? slide.desktopImageUrl),
  }));
}

const fallbackSlides: HomepageDto['slides'] = [
  {
    id: 'slide-1',
    eyebrow: `${SERVICE_CITY} fibre`,
    headline: 'MORE SPEED.',
    headlineAccent: 'MORE FREEDOM.',
    subheadline: `Symmetric internet, HD television and a home number on one ${SERVICE_CITY} line.`,
    desktopImageUrl: PREVIOUS_HERO_IMAGES[0],
    mobileImageUrl: null,
    videoUrl: null,
    imageAlt: 'Majawar X Network freedom offer',
    primaryCtaLabel: 'Check Availability',
    primaryCtaHref: publicRoutes.checkAvailability,
    secondaryCtaLabel: 'View plans',
    secondaryCtaHref: publicRoutes.plans,
    theme: 'DARK',
    status: 'PUBLISHED',
    displayOrder: 0,
    publishedAt: null,
    expiresAt: null,
  },
  {
    id: 'slide-2',
    eyebrow: 'Fibre broadband',
    headline: 'A line that keeps up',
    headlineAccent: 'with the house.',
    subheadline: 'Symmetric speeds for classes, streams and late-night work.',
    desktopImageUrl: PREVIOUS_HERO_IMAGES[1],
    mobileImageUrl: null,
    videoUrl: null,
    imageAlt: 'Majawar X Network speed',
    primaryCtaLabel: 'See Internet Plans',
    primaryCtaHref: publicRoutes.internet,
    secondaryCtaLabel: null,
    secondaryCtaHref: null,
    theme: 'DARK',
    status: 'PUBLISHED',
    displayOrder: 1,
    publishedAt: null,
    expiresAt: null,
  },
  {
    id: 'slide-3',
    eyebrow: 'Triple play',
    headline: 'One fibre.',
    headlineAccent: 'Three services.',
    subheadline: 'Broadband, television and landline on one monthly bill.',
    desktopImageUrl: PREVIOUS_HERO_IMAGES[2],
    mobileImageUrl: null,
    videoUrl: null,
    imageAlt: 'Majawar X Network bundle',
    primaryCtaLabel: 'View Bundle Plans',
    primaryCtaHref: publicRoutes.plans,
    secondaryCtaLabel: null,
    secondaryCtaHref: null,
    theme: 'DARK',
    status: 'PUBLISHED',
    displayOrder: 2,
    publishedAt: null,
    expiresAt: null,
  },
];

const usps = [
  { icon: 'bolt', title: 'Fibre at your doorstep', body: 'Full FTTH — no copper patch from cabinet to home.' },
  { icon: 'shield', title: 'Power cut? No problem', body: 'Battery-backed gear keeps you online through load-shedding.' },
  { icon: 'mesh', title: 'Scaled for the future', body: 'Grow devices, screens and cameras without degradation.' },
  { icon: 'chip', title: 'Technology you can count on', body: 'Symmetric broadband, HD TV and home voice on one drop.' },
];

function cmsSection(sections: CmsSectionDto[], key: string): CmsSectionDto | undefined {
  return sections.find((section) => section.key === key);
}

function benefitsFromCms(section: CmsSectionDto | undefined): Array<{ icon: string; title: string; body: string }> {
  const raw = section?.content.items;
  if (!Array.isArray(raw)) return usps;
  const cards = raw.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const row = item as Record<string, unknown>;
    const title = typeof row.title === 'string' ? row.title : '';
    const body = typeof row.description === 'string' ? row.description : typeof row.body === 'string' ? row.body : '';
    if (!title || !body) return [];
    return [{ icon: typeof row.iconKey === 'string' ? row.iconKey : 'bolt', title, body }];
  });
  return cards.length ? cards : usps;
}

const productCards = [
  {
    title: 'Internet',
    description: 'Symmetric fibre for homes that stream, study and work on the same connection.',
    href: publicRoutes.internet,
    img: '/hero-fiber-bg.png',
    icon: 'M4 12h16M12 4v16',
  },
  {
    title: 'TV',
    description: 'HD channels and a programme guide on the same fibre that carries your broadband.',
    href: publicRoutes.tv,
    img: '/images/products/hdtv.png',
    icon: 'M3 7h18v11H3zM8 21h8',
  },
  {
    title: 'Voice',
    description: 'A home number that stays reachable even when the mobile network is busy.',
    href: publicRoutes.phone,
    img: '/fiber-optic.png',
    icon: 'M6.6 3.8h2.2l1.1 4.2-1.8 1.1a12.8 12.8 0 006.8 6.8l1.1-1.8 4.2 1.1v2.2c0 .8-.7 1.5-1.5 1.5C9.8 19 5 14.2 5 8.3c0-.8.7-1.5 1.6-1.5Z',
  },
];

type Quote = { quote: string; name: string; area?: string; rating?: number };

function testimonialsFromCms(sections: CmsSectionDto[]): Quote[] {
  const quotes: Quote[] = [];
  for (const section of sections) {
    const raw = section.content.testimonials ?? section.content.quotes ?? section.content.items;
    if (!Array.isArray(raw)) continue;
    for (const item of raw) {
      if (!item || typeof item !== 'object') continue;
      const row = item as Record<string, unknown>;
      const quote = typeof row.quote === 'string' ? row.quote : typeof row.body === 'string' ? row.body : '';
      const name = typeof row.name === 'string' ? row.name : typeof row.author === 'string' ? row.author : '';
      if (!quote || !name) continue;
      quotes.push({
        quote,
        name,
        area: typeof row.area === 'string' ? row.area : undefined,
        rating: typeof row.rating === 'number' ? row.rating : 5,
      });
    }
  }
  return quotes;
}

function logosFromCms(sections: CmsSectionDto[]): string[] {
  for (const section of sections) {
    const raw = section.content.logos ?? section.content.partners;
    if (!Array.isArray(raw)) continue;
    return raw.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }
  return [];
}

async function safeGet<T>(path: string): Promise<T | null> {
  try {
    return await apiGet<T>(path);
  } catch {
    return null;
  }
}

function Stars({ n }: { n: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: n }).map((_, i) => (
        <svg key={i} className="h-4 w-4 text-[#F59E0B]" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

export default async function HomePage() {
  const [home, products, offers, planPage, coverage] = await Promise.all([
    safeGet<HomepageDto>('/cms/home'),
    safeGet<ProductDto[]>('/products'),
    safeGet<PromotionDto[]>('/offers'),
    safeGet<Paginated<PlanDto>>('/plans?page=1&pageSize=6'),
    safeGet<CoverageSummaryDto>('/coverage/summary'),
  ]);

  const slides = slidesFromCms(home?.slides?.length ? home.slides : fallbackSlides);
  const livePlans = readItems(planPage);
  const featuredPlans = (livePlans.filter((plan) => plan.featured).length ? livePlans.filter((plan) => plan.featured) : livePlans).slice(0, 3);
  const liveProductCards = products?.length
    ? products.slice(0, 6).map((product) => ({
      title: product.name,
      description: product.tagline || product.description,
      href: `/products/${product.slug}`,
      iconKey: product.iconKey,
      slug: product.slug,
      imageUrl: product.imageUrl,
    }))
    : productCards.map((card) => ({
      title: card.title,
      description: card.description,
      href: card.href,
      iconKey: null as string | null,
      slug: card.href.split('/').pop() ?? null,
      imageUrl: card.img,
    }));
  const productImages = uniqueProductImages(liveProductCards);
  const productIconKeys = uniqueIconKeys(liveProductCards.map((card) => ({ slug: card.slug, iconKey: card.iconKey, name: card.title })));
  const cards = liveProductCards;
  const benefitsSection = cmsSection(home?.sections ?? [], 'home.benefits');
  const productsSection = cmsSection(home?.sections ?? [], 'home.products');
  const ctaSection = cmsSection(home?.sections ?? [], 'home.cta');
  const benefitCards = benefitsFromCms(benefitsSection);
  const offerCards = offers ?? [];
  const testimonials = testimonialsFromCms(home?.sections ?? []);
  const logos = logosFromCms(home?.sections ?? []);
  const lahoreCoverage = coverage?.cities.find((city) => city.citySlug === 'lahore' || city.cityName.toLowerCase() === 'lahore');
  const stats = [
    lahoreCoverage ? { value: String(lahoreCoverage.availableAreas), label: `${SERVICE_CITY} neighbourhoods live` } : null,
    coverage ? { value: String(coverage.totalAreasCovered), label: 'Areas on the map' } : null,
    livePlans.length ? { value: String(livePlans.length), label: 'Published plans' } : null,
  ].filter((row): row is { value: string; label: string } => Boolean(row));

  return (
    <>
      <HeroSlider slides={slides} />

      {featuredPlans.length > 0 ? (
        <section className="relative bg-gradient-to-b from-[#0C2340] to-[#081628] pb-0 pt-0">
          <div className="sf-container">
            <div className="relative z-10 -mt-8 grid gap-4 sm:grid-cols-3">
              {featuredPlans.map((plan) => (
                <Link
                  key={plan.id}
                  href={dashboardRoutes.orderReview(plan.id)}
                  className={`group rounded-2xl border p-5 text-center transition-all duration-300 hover:-translate-y-1 ${plan.featured
                      ? 'border-[#7FD1F0]/60 bg-[#7FD1F0]/10 shadow-[0_0_40px_rgba(127,209,240,0.2)]'
                      : 'border-white/10 bg-white/5 hover:border-white/25'
                    }`}
                >
                  {plan.badgeText || plan.featured ? (
                    <span className="mb-2 inline-block rounded-full bg-[#7FD1F0] px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#0C2340]">
                      {plan.badgeText ?? 'Featured'}
                    </span>
                  ) : null}
                  <p className="font-display text-3xl font-extrabold text-white">
                    {plan.speedMbps ? `${plan.speedMbps} Mbps` : plan.name}
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-white/50">{plan.name}</p>
                  <p className={`mt-3 font-display text-xl font-bold ${plan.featured ? 'text-[#7FD1F0]' : 'text-[#2E86DE]'}`}>
                    {formatMonthlyPrice(plan.monthlyPrice, plan.currency)}
                    <span className="text-xs font-normal text-white/40">/mo</span>
                  </p>
                  <div className="mt-4 rounded-lg bg-white/8 py-2 text-xs font-bold text-white/70 group-hover:bg-white/15">
                    Order now →
                  </div>
                </Link>
              ))}
            </div>
          </div>
          <div className="h-16 bg-gradient-to-b from-[#081628] to-white" />
        </section>
      ) : null}

      <section className="bg-white py-20 lg:py-24">
        <div className="sf-container">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="rounded-full border border-[#2E86DE]/30 bg-[#E8F3FC] px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#2E86DE]">
                {benefitsSection?.eyebrow ?? 'Why Majawar X'}
              </span>
              <h2 className="mt-4 font-display text-[clamp(1.9rem,4vw,3rem)] font-extrabold leading-tight text-[#0C2340]">
                {benefitsSection?.heading ?? 'Digital life at the'}{' '}
                <span className="text-[#2E86DE]">{benefitsSection?.headingAccent ?? 'speed of light'}</span>
              </h2>
              <p className="mt-4 leading-relaxed text-[#4B5563]">
                {benefitsSection?.subheading ?? `${SERVICE_CITY}'s fibre backbone — built for households that need a line they can leave running all day.`}
              </p>
              <Link href={publicRoutes.checkAvailability} className="sf-btn sf-btn-primary mt-8 inline-flex items-center gap-2 px-7">
                Check Coverage →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {benefitCards.slice(0, 4).map((usp) => (
                <div key={usp.title} className="usp-card group rounded-2xl border border-[#E6EEF6] bg-white p-6 shadow-[0_4px_20px_rgb(12_35_64/0.06)] hover:-translate-y-1 hover:border-[#2E86DE]/30">
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#E8F3FC] text-[#2E86DE] group-hover:bg-[#2E86DE] group-hover:text-white">
                    <ProductServiceIcon iconKey={usp.icon} name={usp.title} className="h-5 w-5" />
                  </div>
                  <h3 className="font-display text-[0.95rem] font-bold text-[#0C2340]">{usp.title}</h3>
                  <p className="mt-1.5 text-xs leading-5 text-[#4B5563]">{usp.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#F3F7FC] py-20 lg:py-24">
        <div className="sf-container">
          <div className="mb-4 flex justify-center">
            <span className="rounded-full border border-[#2E86DE]/30 bg-white px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#2E86DE]">{productsSection?.eyebrow ?? 'Our Products'}</span>
          </div>
          <h2 className="text-center font-display text-[clamp(1.9rem,4vw,3rem)] font-extrabold leading-tight text-[#0C2340]">
            {productsSection?.heading ?? 'Everything your home needs'}
            {productsSection?.headingAccent ? (
              <>
                {' '}
                <span className="text-[#2E86DE]">{productsSection.headingAccent}</span>
              </>
            ) : null}
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {cards.map((product, index) => (
              <article key={product.href} className="product-card group overflow-hidden rounded-2xl border border-[#E6EEF6] bg-white shadow-[0_8px_32px_rgb(12_35_64/0.08)] transition-all duration-300 hover:-translate-y-1.5">
                <div className="img-shine relative h-52 overflow-hidden">
                  <OptimizedImage
                    src={productImages[index]}
                    alt={product.title}
                    fill
                    sizes="(min-width: 768px) 33vw, 100vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0C2340]/60 to-transparent" />
                  <span className="absolute left-4 top-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#2E86DE] shadow-md">
                    <ProductServiceIcon iconKey={productIconKeys[index]} slug={product.slug} name={product.title} />
                  </span>
                  <div className="absolute bottom-4 left-4">
                    <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-[#0C2340]">{product.title}</span>
                  </div>
                </div>
                <div className="p-7">
                  <h3 className="flex items-center gap-2.5 font-display text-xl font-extrabold text-[#0C2340]">
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#E8F3FC] text-[#2E86DE]">
                      <ProductServiceIcon
                        iconKey={productIconKeys[index]}
                        slug={product.slug}
                        name={product.title}
                        className="h-5 w-5"
                      />
                    </span>
                    {product.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-[#4B5563]">{product.description}</p>
                  <Link href={product.href} className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-[#2E86DE]">
                    Learn More →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <FiberBanner />

      {testimonials.length > 0 || logos.length > 0 || offerCards.length > 0 ? (
        <section className="bg-white py-20 lg:py-24">
          <div className="sf-container">
            {testimonials.length > 0 ? (
              <>
                <div className="mb-4 flex justify-center">
                  <span className="rounded-full border border-[#2E86DE]/30 bg-[#E8F3FC] px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#2E86DE]">Testimonials</span>
                </div>
                <h2 className="text-center font-display text-[clamp(1.9rem,4vw,3rem)] font-extrabold leading-tight text-[#0C2340]">
                  Neighbours already on the line
                </h2>
                <div className="mt-10 grid gap-6 md:grid-cols-3">
                  {testimonials.slice(0, 3).map((item) => (
                    <blockquote key={`${item.name}-${item.quote.slice(0, 12)}`} className="flex flex-col justify-between rounded-2xl border border-[#E6EEF6] bg-[#F3F7FC] p-8">
                      <div>
                        <Stars n={item.rating ?? 5} />
                        <p className="mt-4 text-sm leading-relaxed text-[#0C2340]">&ldquo;{item.quote}&rdquo;</p>
                      </div>
                      <footer className="mt-6">
                        <p className="text-sm font-bold text-[#145DA0]">{item.name}</p>
                        {item.area ? <p className="text-xs text-[#6B7280]">{item.area}</p> : null}
                      </footer>
                    </blockquote>
                  ))}
                </div>
              </>
            ) : null}

            {logos.length > 0 ? (
              <div className="mt-14 border-t border-[#E6EEF6] pt-10">
                <p className="text-center text-xs font-bold uppercase tracking-widest text-[#6B7280]">Trusted by</p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-8">
                  {logos.map((logo) => (
                    <div key={logo} className="flex h-10 min-w-[80px] items-center justify-center rounded-lg border border-[#E6EEF6] bg-[#F3F7FC] px-5">
                      <span className="text-sm font-bold text-[#4B5563]">{logo}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {offerCards.length > 0 ? (
              <div className="mt-14 grid gap-6 md:grid-cols-3">
                {offerCards.slice(0, 3).map((offer) => (
                  <Link key={offer.id} href={`${publicRoutes.offers}/${offer.slug}`} className="group rounded-2xl border border-[#E6EEF6] bg-gradient-to-br from-[#0C2340] to-[#145DA0] p-7">
                    {offer.badgeText ? <span className="text-xs font-bold uppercase tracking-wider text-[#7FD1F0]">{offer.badgeText}</span> : null}
                    <h3 className="mt-2 font-display text-xl font-extrabold text-white">{offer.name}</h3>
                    <p className="mt-2 text-sm text-white/65">{offer.description}</p>
                    <span className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-[#7FD1F0]">View Offer →</span>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {stats.length > 0 ? (
        <section className="border-t border-[#E6EEF6] bg-[#F3F7FC] py-12">
          <div className="sf-container">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="flex flex-col items-center justify-center rounded-2xl border border-[#E6EEF6] bg-white p-6 text-center shadow-[0_4px_20px_rgb(12_35_64/0.05)]">
                  <span className="font-display text-[2.2rem] font-extrabold leading-none text-[#2E86DE]">{stat.value}</span>
                  <span className="mt-2 text-[0.7rem] font-bold uppercase tracking-widest text-[#6B7280]">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="relative overflow-hidden bg-gradient-to-br from-[#0C2340] via-[#145DA0] to-[#0C2340] py-20">
        <div className="sf-container relative text-center">
          <h2 className="font-display text-[clamp(2rem,4.5vw,3.5rem)] font-extrabold leading-tight text-white">
            {ctaSection?.heading ?? 'Ready to join the fibre revolution?'}
            {ctaSection?.headingAccent ? (
              <>
                {' '}
                <span className="text-[#7FD1F0]">{ctaSection.headingAccent}</span>
              </>
            ) : null}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-white/65">
            {ctaSection?.subheading ?? 'Check if Majawar X is live on your street — the result comes from the coverage API.'}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link href={ctaSection?.ctaHref ?? publicRoutes.checkAvailability} className="sf-btn sf-btn-primary inline-flex items-center gap-2 px-9 py-4 text-base">
              {ctaSection?.ctaLabel ?? 'Check Availability'}
            </Link>
            <Link href={publicRoutes.plans} className="sf-btn border border-white/30 px-9 py-4 text-base text-white hover:bg-white/10">
              Browse Plans
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
