import type { MetadataRoute } from 'next';
import { publicRoutes } from '@stormfiber/config';

export default function sitemap(): MetadataRoute.Sitemap {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const paths = [
    publicRoutes.home,
    publicRoutes.plans,
    publicRoutes.products,
    publicRoutes.internet,
    publicRoutes.tv,
    publicRoutes.phone,
    publicRoutes.checkAvailability,
    publicRoutes.getConnection,
    publicRoutes.support,
    publicRoutes.faqs,
    publicRoutes.offers,
    publicRoutes.terms,
    publicRoutes.privacy,
    publicRoutes.fairUsage,
    publicRoutes.compare,
    publicRoutes.contact,
    publicRoutes.about,
    publicRoutes.helpCenter,
  ];

  return paths.map((path) => ({
    url: `${site}${path}`,
    changeFrequency: 'weekly',
    priority: path === '/' ? 1 : 0.7,
  }));
}
