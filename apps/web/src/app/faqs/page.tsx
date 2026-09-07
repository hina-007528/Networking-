'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { FaqCategoryDto, FaqDto, Paginated } from '@stormfiber/types';
import { apiGet, readItems } from '@/lib/api';
import { heroImages } from '@/lib/hero-images';

export default function FaqsPage() {
  return (
    <Suspense fallback={<p className="px-4 py-16 text-center text-sm text-[#6B7280]">Loading FAQs…</p>}>
      <FaqsContent />
    </Suspense>
  );
}

function FaqsContent() {
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<FaqCategoryDto[]>([]);
  const [faqs, setFaqs] = useState<FaqDto[]>([]);
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [active, setActive] = useState(searchParams.get('category') ?? 'all');
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({ page: '1', pageSize: '50' });
    if (search.trim()) params.set('search', search.trim());
    if (active !== 'all') params.set('category', active);
    Promise.all([
      apiGet<FaqCategoryDto[]>('/faqs/categories').catch(() => [] as FaqCategoryDto[]),
      apiGet<Paginated<FaqDto>>(`/faqs?${params}`),
    ])
      .then(([nextCategories, page]) => {
        if (cancelled) return;
        setCategories(nextCategories);
        setFaqs(readItems(page));
      })
      .catch((caught) => {
        if (!cancelled) setError(caught instanceof Error ? caught.message : 'Could not load FAQs');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search, active]);

  const labels = useMemo(() => [{ slug: 'all', name: 'All' }, ...categories], [categories]);

  return (
    <>
      <section className="relative overflow-hidden bg-[#0C2340] py-20 text-white">
        <img src={heroImages.faqs} alt="" loading="lazy" decoding="async" className="hero-kenburns is-loop pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25" aria-hidden />
        <div className="hero-light-streak" aria-hidden />
        <div className="absolute inset-0 bg-[#0C2340]/70" />
        <div className="sf-container relative z-[2] text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#7FD1F0]/30 bg-[#7FD1F0]/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#7FD1F0]">
            FAQs
          </span>
          <h1 className="mt-5 font-display text-[clamp(2rem,4vw,3.5rem)] font-extrabold">
            Frequently Asked <span className="text-[#7FD1F0]">Questions</span>
          </h1>
          <div className="mx-auto mt-8 max-w-lg">
            <label htmlFor="faq-search" className="sr-only">Search questions</label>
            <input
              id="faq-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search published answers…"
              className="w-full rounded-xl border border-white/20 bg-white/10 py-3.5 px-5 text-sm text-white placeholder-white/40"
            />
          </div>
        </div>
      </section>

      <section className="bg-[#F3F7FC] py-12">
        <div className="sf-container">
          <div className="mb-8 flex flex-wrap justify-center gap-2">
            {labels.map((category) => (
              <button
                key={category.slug}
                type="button"
                onClick={() => setActive(category.slug)}
                className={`min-h-11 rounded-full px-4 text-sm font-semibold ${
                  active === category.slug ? 'bg-[#2E86DE] text-white' : 'bg-white text-[#0C2340] border border-[#E6EEF6]'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          {error ? <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p> : null}
          {loading ? <p className="text-center text-sm text-[#6B7280]">Loading published FAQs…</p> : null}
          {!loading && faqs.length === 0 ? (
            <p className="rounded-2xl border border-[#E6EEF6] bg-white px-6 py-10 text-center text-[#6B7280]">
              No published FAQs match this search. Add articles in the admin console.
            </p>
          ) : (
            <div className="mx-auto max-w-3xl space-y-3">
              {faqs.map((faq) => (
                <article key={faq.id} className="rounded-2xl border border-[#E6EEF6] bg-white">
                  <button
                    type="button"
                    className="flex min-h-11 w-full items-center justify-between px-5 py-4 text-left font-semibold text-[#0C2340]"
                    onClick={() => setOpenId((current) => (current === faq.id ? null : faq.id))}
                    aria-expanded={openId === faq.id}
                  >
                    {faq.question}
                    <span>{openId === faq.id ? '−' : '+'}</span>
                  </button>
                  {openId === faq.id ? (
                    <p className="border-t border-[#E6EEF6] px-5 py-4 text-sm leading-6 text-[#4B5563] whitespace-pre-wrap">{faq.answer}</p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
