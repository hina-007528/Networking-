import Link from 'next/link';
import { brand, publicRoutes } from '@stormfiber/config';
import type { SiteSettingsDto } from '@stormfiber/types';
import { BrandLogo } from './brand-logo';
import { PublicContact } from './public-contact';

const columns = [
  {
    title: 'General',
    links: [
      { label: 'About', href: publicRoutes.about },
      { label: 'How it works', href: publicRoutes.getConnection },
      { label: 'Offers', href: publicRoutes.offers },
      { label: 'Careers', href: publicRoutes.contact },
    ],
  },
  {
    title: 'Products',
    links: [
      { label: 'Internet', href: publicRoutes.internet },
      { label: 'TV', href: publicRoutes.tv },
      { label: 'Voice', href: publicRoutes.phone },
      { label: 'Bundles', href: publicRoutes.plans },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'FAQs', href: publicRoutes.faqs },
      { label: 'Help Center', href: publicRoutes.helpCenter },
      { label: 'Contact', href: publicRoutes.contact },
      { label: 'Store locator', href: publicRoutes.contact },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Terms', href: publicRoutes.terms },
      { label: 'Privacy', href: publicRoutes.privacy },
      { label: 'Fair usage', href: publicRoutes.fairUsage },
    ],
  },
];

export function SiteFooter({ settings }: { settings?: SiteSettingsDto | null }) {
  const cmsColumns = settings?.footerColumns?.length ? settings.footerColumns : columns;
  return (
    <footer className="bg-[#060F20] text-white">
      <div className="sf-container py-14">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <BrandLogo variant="light" />
            <p className="mt-5 max-w-xs text-sm leading-6 text-white/55">{brand.tagline}</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[brand.offices.head, brand.offices.branch].map((office) => (
                <article key={office.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#7FD1F0]">{office.label}</p>
                  <p className="mt-2 text-xs leading-5 text-white/65">{office.address}</p>
                </article>
              ))}
            </div>
            <PublicContact tone="dark" className="mt-6" />
          </div>

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {cmsColumns.map((col) => (
              <div key={col.title}>
                <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-white/40">{col.title}</h3>
                <ul className="space-y-2.5 text-sm text-white/65">
                  {col.links.map((link) => (
                    <li key={`${col.title}-${link.label}`}>
                      <Link href={link.href} className="hover:text-[#7FD1F0] transition-colors">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-end gap-4 border-t border-white/8 pt-6">
          <Link
            href={publicRoutes.checkAvailability}
            className="inline-flex min-h-11 items-center rounded-lg bg-[#2E86DE] px-5 text-sm font-bold text-white hover:bg-[#145DA0]"
          >
            Check Availability
          </Link>
        </div>
      </div>

      <div className="border-t border-white/8">
        <div className="sf-container flex flex-col items-center justify-between gap-3 py-5 text-xs text-white/35 sm:flex-row">
          <p>{settings?.footerNote ?? `© ${new Date().getFullYear()} ${brand.legalName}. All rights reserved.`}</p>
          <div className="flex gap-5">
            <Link href={publicRoutes.terms} className="hover:text-white/70">Terms</Link>
            <Link href={publicRoutes.privacy} className="hover:text-white/70">Privacy</Link>
            <Link href={publicRoutes.fairUsage} className="hover:text-white/70">Fair Usage</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
