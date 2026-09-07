'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { brand, publicRoutes } from '@stormfiber/config';
import type { FaqCategoryDto, FaqDto, Paginated } from '@stormfiber/types';
import { apiGet, readItems } from '@/lib/api';
import { heroImages } from '@/lib/hero-images';

const contacts = [
  { title: 'Call', href: `tel:${brand.supportPhoneE164}`, body: brand.supportPhoneDisplay },
  { title: 'WhatsApp', href: brand.whatsappUrl, body: brand.whatsappDisplay },
  { title: 'Email', href: `mailto:${brand.officeEmail}`, body: brand.officeEmail },
  { title: 'Visit a branch', href: publicRoutes.contact, body: 'Head Office and Branch Office in Lahore.' },
];

export default function HelpCenterPage() {
  const [query, setQuery] = useState('');
  const [faqs, setFaqs] = useState<FaqDto[]>([]);
  const [categories, setCategories] = useState<FaqCategoryDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiGet<FaqCategoryDto[]>('/faqs/categories').then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams({ page: '1', pageSize: '40' });
    if (query.trim()) params.set('search', query.trim());
    const handle = window.setTimeout(() => {
      apiGet<Paginated<FaqDto>>(`/faqs?${params}`)
        .then((page) => setFaqs(readItems(page)))
        .catch((caught) => setError(caught instanceof Error ? caught.message : 'Could not load help articles'));
    }, 250);
    return () => window.clearTimeout(handle);
  }, [query]);

  const filtered = useMemo(() => faqs, [faqs]);

  return (
    <div className="bg-[#F3F7FC] pb-16">
      <section className="relative overflow-hidden bg-[#0C2340] py-16 text-white">
        <img src={heroImages.help} alt="" loading="lazy" decoding="async" className="hero-kenburns is-loop pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25" aria-hidden />
        <div className="absolute inset-0 bg-[#0C2340]/70" />
        <div className="sf-container relative z-[2] text-center">
          <h1 className="sf-h1 text-white">How can we help?</h1>
          <label className="sr-only" htmlFor="help-search">Search help</label>
          <input
            id="help-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search published account, billing, or connection issues"
            className="sf-input mx-auto mt-8 max-w-2xl bg-white text-[#0C2340]"
          />
        </div>
      </section>

      <section className="bg-[#F3F7FC] pt-10">
        <div className="sf-container grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.length === 0 ? (
            <Link href={publicRoutes.faqs} className="sf-card p-6">
              <h2 className="font-display text-lg font-bold text-[#0C2340]">All FAQs</h2>
              <p className="mt-2 text-sm text-[#4B5563]">Published answers from the support catalogue.</p>
            </Link>
          ) : (
            categories.map((item) => (
              <Link key={item.id} href={`${publicRoutes.faqs}?category=${item.slug}`} className="sf-card p-6">
                <h2 className="font-display text-lg font-bold text-[#0C2340]">{item.name}</h2>
                <p className="mt-2 text-sm text-[#4B5563]">{item.description || `${item.faqCount} published answers`}</p>
              </Link>
            ))
          )}
        </div>
      </section>

      <div className="sf-container mt-12">
        <h2 className="sf-h3">Reach us</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {contacts.map((item) => (
            <a
              key={item.title}
              href={item.href}
              className="sf-card p-6"
              {...(item.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
            >
              <h3 className="font-display font-bold text-[#145DA0]">{item.title}</h3>
              <p className="mt-2 text-sm text-[#4B5563]">{item.body}</p>
            </a>
          ))}
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {[brand.offices.head, brand.offices.branch].map((office) => (
            <article key={office.label} className="sf-card p-6">
              <h3 className="text-sm font-bold uppercase text-[#2E86DE]">{office.label}</h3>
              <p className="mt-2 text-sm text-[#4B5563]">{office.address}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="sf-container mt-12 space-y-3">
        <h2 className="sf-h3">Published answers</h2>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {filtered.length === 0 ? <p className="text-sm text-[#6B7280]">No published articles match that search.</p> : null}
        {filtered.map((item) => (
          <details key={item.id} className="sf-card p-5">
            <summary className="cursor-pointer font-semibold text-[#0C2340]">
              {item.categoryName ? <span className="mr-2 text-xs font-bold uppercase text-[#2E86DE]">{item.categoryName}</span> : null}
              {item.question}
            </summary>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#4B5563]">{item.answer}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
