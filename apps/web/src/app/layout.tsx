/**
 * Route map (keep the existing monorepo split — do not flatten into one Next app):
 *   apps/web/src/app/*              → marketing site
 *   apps/web/src/app/dashboard/*    → customer portal (also aliased as /portal)
 *   apps/admin/src/app/*            → staff console
 *   apps/api                        → NestJS + Prisma (existing schema kept)
 */
import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { Inter, Montserrat } from 'next/font/google';
import { brand, seo } from '@stormfiber/config';
import type { SiteSettingsDto } from '@stormfiber/types';
import { Providers } from '@/components/providers';
import { SiteChrome } from '@/components/site-chrome';
import { SiteFooter } from '@/components/site-footer';
import { apiGet } from '@/lib/api';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: seo.defaultTitle, template: seo.titleTemplate },
  description: seo.defaultDescription,
  keywords: [...seo.keywords],
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? brand.website),
  icons: {
    icon: '/brand/icon.svg',
    apple: '/brand/icon.svg',
  },
  openGraph: {
    title: seo.defaultTitle,
    description: seo.defaultDescription,
    images: ['/brand/logo.svg'],
    siteName: brand.name,
  },
};

const loadSettings = unstable_cache(
  async (): Promise<SiteSettingsDto | null> => {
    try {
      return await apiGet<SiteSettingsDto>('/cms/settings');
    } catch {
      return null;
    }
  },
  ['cms-site-settings'],
  { revalidate: 60 },
);

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await loadSettings();

  return (
    <html lang="en" className={`${inter.variable} ${montserrat.variable}`}>
      <body className="font-sans antialiased">
        <Providers>
          <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2">
            Skip to content
          </a>
          <SiteChrome settings={settings} footer={<SiteFooter settings={settings} />}>
            <main id="main">{children}</main>
          </SiteChrome>
        </Providers>
      </body>
    </html>
  );
}

export const revalidate = 60;
