'use client';

import Link from 'next/link';
import { brand, publicRoutes } from '@stormfiber/config';
import type { SiteSettingsDto } from '@stormfiber/types';
import { AuthLinks } from './auth-links';
import { BrandLogo } from './brand-logo';
import { MobileNavigation } from './mobile-navigation';

const productLinks = [
  { label: 'Ultra-Fast Internet', href: publicRoutes.internet, desc: 'Symmetric fibre — no volume cap' },
  { label: 'HD TV', href: publicRoutes.tv, desc: 'Hundreds of HD channels' },
  { label: 'Crystal Clear Voice', href: publicRoutes.phone, desc: 'Home landline on fibre' },
];

const supportLinks = [
  { label: 'Help Center', href: publicRoutes.helpCenter },
  { label: 'Billing', href: publicRoutes.supportBilling },
  { label: 'FAQs', href: publicRoutes.faqs },
  { label: 'Get in Touch', href: publicRoutes.contact },
];

function DropdownMenu({ links }: { links: { label: string; href: string; desc?: string }[] }) {
  return (
    <div className="invisible absolute left-0 top-full z-50 min-w-[240px] rounded-xl border border-[#E6EEF6] bg-white p-2 opacity-0 shadow-[0_16px_40px_rgb(12_35_64/0.12)] transition-all duration-200 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="block rounded-lg px-4 py-2.5 hover:bg-[#E8F3FC] transition-colors"
        >
          <span className="block text-sm font-semibold text-[#0C2340]">{link.label}</span>
          {link.desc ? <span className="mt-0.5 block text-xs text-[#6B7280]">{link.desc}</span> : null}
        </Link>
      ))}
    </div>
  );
}

export function SiteHeader({ settings }: { settings?: SiteSettingsDto | null }) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E6EEF6] bg-white/95 text-[#0C2340] backdrop-blur-md">
      <div className="sf-container flex h-[4.75rem] items-center justify-between gap-4">
        <BrandLogo variant="dark" compact />

        <nav className="hidden items-center gap-0.5 text-[14px] font-semibold md:flex" aria-label="Primary">
          <Link
            href={publicRoutes.plans}
            className="rounded-lg px-3 py-2 text-[#0C2340]/80 hover:bg-[#E8F3FC] hover:text-[#145DA0] transition-colors"
          >
            Plans
          </Link>

          <div className="group relative">
            <button
              type="button"
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-[#0C2340]/80 hover:bg-[#E8F3FC] hover:text-[#145DA0] transition-colors"
            >
              Products <span className="text-[10px] opacity-60">▾</span>
            </button>
            <DropdownMenu links={productLinks} />
          </div>

          <div className="group relative">
            <button
              type="button"
              className="flex items-center gap-1 rounded-lg px-3 py-2 text-[#0C2340]/80 hover:bg-[#E8F3FC] hover:text-[#145DA0] transition-colors"
            >
              Support <span className="text-[10px] opacity-60">▾</span>
            </button>
            <DropdownMenu links={supportLinks} />
          </div>

          <Link
            href={publicRoutes.getConnection}
            className="rounded-lg px-3 py-2 text-[#0C2340]/80 hover:bg-[#E8F3FC] hover:text-[#145DA0] transition-colors"
          >
            Get Majawar X
          </Link>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href={publicRoutes.checkAvailability}
            className="sf-btn h-11 bg-[#2E86DE] px-5 text-sm leading-none text-white shadow-[0_4px_20px_rgba(46,134,222,0.35)] hover:bg-[#145DA0]"
          >
            Check Availability
          </Link>
          <AuthLinks className="text-[#0C2340]" />
          <a
            href={`tel:${brand.supportPhoneE164}`}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#E8F3FC] text-[#145DA0] hover:bg-[#2E86DE] hover:text-white transition-colors"
            aria-label={`Call ${brand.supportPhoneDisplay}`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.6 3.8h2.2l1.1 4.2-1.8 1.1a12.8 12.8 0 0 0 6.8 6.8l1.1-1.8 4.2 1.1v2.2c0 .8-.7 1.5-1.5 1.5C9.8 19 5 14.2 5 8.3c0-.8.7-1.5 1.6-1.5Z" />
            </svg>
          </a>
          <a
            href={brand.whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#E8F8EF] text-[#25D366] hover:bg-[#25D366] hover:text-white transition-colors"
            aria-label={`WhatsApp ${brand.whatsappDisplay}`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.5 6.5A7.5 7.5 0 0 0 5.2 16.1L4 20l4-1.1A7.5 7.5 0 1 0 17.5 6.5Zm-5.5 11.4a6.2 6.2 0 0 1-3.2-.9l-.2-.1-2.4.6.6-2.3-.1-.2a6.2 6.2 0 1 1 5.3 2.9Zm3.4-4.6c.2.1.3.3.3.6 0 .8-.5 1.8-1.7 2.5-1 .6-2.3.8-3.7.5-1.8-.4-3.3-1.7-4-3.3-.3-.8-.4-1.6-.2-2.4.1-.7.5-1.3 1-1.7.2-.2.5-.1.6 0l.9 1.1c.1.2.1.4 0 .6l-.4.6c-.1.1 0 .3.1.5.3.6.8 1.2 1.4 1.5.2.1.4.1.5 0l.7-.5c.2-.1.4-.1.5 0l1.2.7c.2.1.3.4.2.6Z" />
            </svg>
          </a>
        </div>

        <MobileNavigation productLinks={productLinks} supportLinks={supportLinks} />
      </div>
    </header>
  );
}
