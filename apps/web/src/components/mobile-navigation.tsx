'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { brand, publicRoutes } from '@stormfiber/config';
import { AuthLinks } from './auth-links';

interface NavLink {
  label: string;
  href: string;
}

export function MobileNavigation({
  productLinks,
  supportLinks,
}: {
  productLinks: NavLink[];
  supportLinks: NavLink[];
}) {
  const [open, setOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="md:hidden">
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center text-[#0C2340]"
        aria-expanded={open}
        aria-controls="mobile-nav"
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? (
          <span className="text-2xl leading-none">×</span>
        ) : (
          <span className="flex flex-col gap-1.5">
            <span className="block h-0.5 w-5 bg-current" />
            <span className="block h-0.5 w-5 bg-current" />
            <span className="block h-0.5 w-5 bg-current" />
          </span>
        )}
      </button>
      {open ? (
        <div
          id="mobile-nav"
          className="fixed inset-x-0 top-[4.75rem] z-50 h-[calc(100vh-4.75rem)] overflow-y-auto border-t border-[#E6EEF6] bg-white px-5 py-6 text-[#0C2340]"
        >
          <nav className="flex flex-col gap-1 text-base font-semibold" aria-label="Mobile">
            <Link href={publicRoutes.plans} className="py-3" onClick={() => setOpen(false)}>
              Plans
            </Link>
            <button type="button" className="flex items-center justify-between py-3" onClick={() => setProductsOpen((v) => !v)}>
              Products
              <span>{productsOpen ? '−' : '+'}</span>
            </button>
            {productsOpen
              ? productLinks.map((link) => (
                  <Link key={link.href} href={link.href} className="py-2 pl-4 text-[#4B5563]" onClick={() => setOpen(false)}>
                    {link.label}
                  </Link>
                ))
              : null}
            <button type="button" className="flex items-center justify-between py-3" onClick={() => setSupportOpen((v) => !v)}>
              Support
              <span>{supportOpen ? '−' : '+'}</span>
            </button>
            {supportOpen
              ? supportLinks.map((link) => (
                  <Link key={link.href} href={link.href} className="py-2 pl-4 text-[#4B5563]" onClick={() => setOpen(false)}>
                    {link.label}
                  </Link>
                ))
              : null}
            <Link href={publicRoutes.getConnection} className="py-3" onClick={() => setOpen(false)}>
              Get Majawar X
            </Link>
            <Link href={publicRoutes.checkAvailability} className="py-3" onClick={() => setOpen(false)}>
              Check Availability
            </Link>
            <div className="py-3" onClick={() => setOpen(false)}>
              <AuthLinks />
            </div>
            <a href={`tel:${brand.supportPhoneE164}`} className="py-3 text-[#145DA0]" onClick={() => setOpen(false)}>
              {brand.supportPhoneDisplay}
            </a>
            <a href={brand.whatsappUrl} className="py-3 text-[#25D366]" onClick={() => setOpen(false)} target="_blank" rel="noreferrer">
              WhatsApp {brand.whatsappDisplay}
            </a>
            <Link
              href={publicRoutes.checkAvailability}
              onClick={() => setOpen(false)}
              className="mt-3 inline-flex h-11 w-full items-center justify-center rounded-full bg-[#2E86DE] font-bold text-white"
            >
              Check Availability
            </Link>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
