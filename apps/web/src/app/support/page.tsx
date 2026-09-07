'use client';

import { type FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { brand, publicRoutes } from '@stormfiber/config';
import type { FaqDto, Paginated } from '@stormfiber/types';
import { apiGet, readItems } from '@/lib/api';
import { heroImages } from '@/lib/hero-images';

const categories = [
  { icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', label: 'Account', href: `${publicRoutes.faqs}?category=account`, color: '#2E86DE', bg: '#E8F3FC' },
  { icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z', label: 'Billing', href: publicRoutes.supportBilling, color: '#6C63FF', bg: '#F0EEFF' },
  { icon: 'M13 10V3L4 14h7v7l9-11h-7z', label: 'Products & Services', href: publicRoutes.plans, color: '#059669', bg: '#D1FAE5' },
  { icon: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z', label: 'Troubleshooting', href: publicRoutes.helpCenter, color: '#D97706', bg: '#FEF3C7' },
];

export default function SupportPage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [popular, setPopular] = useState<FaqDto[]>([]);

  useEffect(() => {
    apiGet<Paginated<FaqDto>>('/faqs?page=1&pageSize=6')
      .then((page) => setPopular(readItems(page)))
      .catch(() => setPopular([]));
  }, []);

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = query.trim();
    router.push(next ? `${publicRoutes.faqs}?q=${encodeURIComponent(next)}` : publicRoutes.faqs);
  }

  return (
    <>
      <section className="relative overflow-hidden bg-[#0C2340] py-24 text-white">
        <img src={heroImages.support} alt="" loading="lazy" decoding="async" className="hero-kenburns is-loop pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25" aria-hidden />
        <div className="hero-light-streak" aria-hidden />
        <div className="absolute inset-0 bg-[#0C2340]/70" />
        <div className="sf-container relative z-[2] text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#7FD1F0]/30 bg-[#7FD1F0]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#7FD1F0]">
            Support / Help Center
          </span>
          <h1 className="mt-5 font-display text-[clamp(2rem,4vw,3.5rem)] font-extrabold">
            How can we <span className="text-[#7FD1F0]">help you?</span>
          </h1>
          <form onSubmit={onSearch} className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row">
            <label htmlFor="support-search" className="sr-only">Search help</label>
            <input
              id="support-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search published help articles…"
              className="min-h-11 flex-1 rounded-xl border border-white/20 bg-white/10 px-4 text-sm text-white placeholder-white/40"
            />
            <button type="submit" className="min-h-11 rounded-xl bg-[#2E86DE] px-6 text-sm font-bold text-white">
              Search
            </button>
          </form>
        </div>
      </section>

      <section className="bg-[#F3F7FC] py-16">
        <div className="sf-container">
          <h2 className="text-center font-display text-2xl font-extrabold text-[#0C2340]">Help categories</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <Link key={category.label} href={category.href} className="group flex items-center gap-4 rounded-2xl border border-[#E6EEF6] bg-white p-6">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl" style={{ background: category.bg, color: category.color }}>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={category.icon} />
                  </svg>
                </div>
                <p className="font-display text-lg font-bold text-[#0C2340]">{category.label}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[#E6EEF6] bg-white py-16">
        <div className="sf-container max-w-3xl">
          <h2 className="font-display text-2xl font-extrabold text-[#0C2340]">Published articles</h2>
          {popular.length === 0 ? (
            <p className="mt-6 text-sm text-[#6B7280]">No FAQs are published yet.</p>
          ) : (
            <div className="mt-6 divide-y divide-[#E6EEF6]">
              {popular.map((faq) => (
                <Link key={faq.id} href={`${publicRoutes.faqs}?q=${encodeURIComponent(faq.question)}`} className="block py-4 text-sm font-medium text-[#0C2340] hover:text-[#2E86DE]">
                  {faq.question}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="bg-[#F3F7FC] py-16">
        <div className="sf-container">
          <h2 className="text-center font-display text-2xl font-extrabold text-[#0C2340]">Visit a branch</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {[brand.offices.head, brand.offices.branch].map((office) => (
              <article key={office.label} className="rounded-2xl border border-[#E6EEF6] bg-white p-6">
                <h3 className="text-sm font-bold uppercase tracking-wide text-[#2E86DE]">{office.label}</h3>
                <p className="mt-2 text-sm leading-6 text-[#4B5563]">{office.address}</p>
                <a href={`tel:${brand.supportPhoneE164}`} className="mt-4 inline-block text-sm font-semibold text-[#145DA0]">{brand.supportPhoneDisplay}</a>
              </article>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <a href={`tel:${brand.supportPhoneE164}`} className="sf-btn sf-btn-primary px-6">Call {brand.supportPhoneDisplay}</a>
            <a href={brand.whatsappUrl} target="_blank" rel="noreferrer" className="sf-btn bg-[#25D366] px-6 text-white hover:bg-[#1dae54]">
              WhatsApp {brand.whatsappDisplay}
            </a>
            <Link href={publicRoutes.contact} className="sf-btn border border-[#E6EEF6] bg-white px-6 text-[#0C2340]">Send a message</Link>
          </div>
        </div>
      </section>
    </>
  );
}
