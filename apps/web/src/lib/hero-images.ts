/** Unique professional backgrounds used only on page heroes. */

export const heroImages = {
  home: ['/images/hero/bg1.png', '/images/hero/bg2.png', '/images/hero/bg3.png'] as const,
  plans: '/heroes/hero-plans.png',
  planDetail: '/heroes/hero-plan-detail.png',
  products: '/heroes/hero-products.png',
  offers: '/heroes/hero-offers.png',
  offerDetail: '/hero-main.png',
  about: '/heroes/hero-about.png',
  faqs: '/heroes/hero-faqs.png',
  support: '/heroes/hero-support.png',
  help: '/heroes/hero-help.png',
  contact: '/heroes/hero-contact.png',
  coverage: '/heroes/hero-coverage.png',
  privacy: '/heroes/hero-legal.png',
  terms: '/plans-section-bg.png',
  fairUsage: '/speed-dashboard.png',
} as const;

const PRODUCT_HEROES: Record<string, string> = {
  internet: '/heroes/hero-internet.png',
  tv: '/images/products/hdtv.png',
  phone: '/heroes/hero-voice.png',
  'home-mesh-wifi': '/images/products/mesh-wifi.png',
  'night-watch-cameras': '/heroes/hero-cameras.png',
  'weekend-sports-pack': '/tv-bundle.png',
  'study-line': '/heroes/hero-study.png',
};

const PRODUCT_IMAGE_POOL = [
  '/heroes/hero-internet.png',
  '/images/products/hdtv.png',
  '/heroes/hero-voice.png',
  '/images/products/mesh-wifi.png',
  '/heroes/hero-cameras.png',
  '/tv-bundle.png',
  '/heroes/hero-study.png',
  '/family-internet.png',
  '/fiber-optic.png',
  '/hero-speed.png',
  '/city-coverage.png',
  '/images/internet/bg1.png',
  '/images/internet/bg2.png',
  '/images/internet/bg3.png',
];

export function productHeroImage(slug: string): string {
  if (PRODUCT_HEROES[slug]) return PRODUCT_HEROES[slug];
  let hash = 0;
  for (let index = 0; index < slug.length; index += 1) {
    hash = (hash + slug.charCodeAt(index)) % PRODUCT_IMAGE_POOL.length;
  }
  return PRODUCT_IMAGE_POOL[hash];
}

export function uniqueProductImages(
  items: Array<{ slug?: string | null; imageUrl?: string | null }>,
): string[] {
  const taken = new Set<string>();
  return items.map((item) => {
    const slug = item.slug?.trim() ?? '';
    let image = item.imageUrl || PRODUCT_HEROES[slug] || productHeroImage(slug || 'product');
    if (taken.has(image)) {
      image =
        PRODUCT_IMAGE_POOL.find((candidate) => !taken.has(candidate)) ??
        PRODUCT_IMAGE_POOL[taken.size % PRODUCT_IMAGE_POOL.length];
    }
    taken.add(image);
    return image;
  });
}
