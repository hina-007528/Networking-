'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { publicRoutes } from '@stormfiber/config';
import type { HeroSlideDto } from '@stormfiber/types';

function CampaignArt({ index }: { index: number }) {
  const palettes = [
    { bg1: '#0C2340', bg2: '#145DA0', accent: '#7FD1F0', accent2: '#6C63FF' },
    { bg1: '#081628', bg2: '#0C2340', accent: '#2E86DE', accent2: '#7FD1F0' },
    { bg1: '#0a1628', bg2: '#1a0a3c', accent: '#6C63FF', accent2: '#2E86DE' },
    { bg1: '#0C2340', bg2: '#103a60', accent: '#7FD1F0', accent2: '#6C63FF' },
  ][index % 4];

  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1440 720" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <radialGradient id={`bg${index}`} cx="30%" cy="55%" r="75%">
          <stop offset="0%" stopColor={palettes.bg2} />
          <stop offset="100%" stopColor={palettes.bg1} />
        </radialGradient>
        <radialGradient id={`orb1${index}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={palettes.accent} stopOpacity="0.3" />
          <stop offset="100%" stopColor={palettes.accent} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`orb2${index}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={palettes.accent2} stopOpacity="0.22" />
          <stop offset="100%" stopColor={palettes.accent2} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1440" height="720" fill={`url(#bg${index})`} />
      <ellipse cx="1100" cy="200" rx="340" ry="340" fill={`url(#orb1${index})`} />
      <ellipse cx="260" cy="540" rx="250" ry="250" fill={`url(#orb2${index})`} />
    </svg>
  );
}

export function HeroSlider({ slides }: { slides: HeroSlideDto[] }) {
  const [index, setIndex] = useState(0);
  const current = slides[index];

  const advance = useCallback(
    (dir: 1 | -1) => {
      setIndex((value) => (value + dir + slides.length) % slides.length);
    },
    [slides.length],
  );

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = window.setInterval(() => advance(1), 7000);
    return () => window.clearInterval(timer);
  }, [slides.length, advance]);

  if (!current) return null;

  return (
    <section
      className="relative overflow-hidden bg-[#0C2340]"
      aria-roledescription="carousel"
      aria-label="Campaign highlights"
    >
      <div className="relative min-h-[28rem] sm:min-h-[36rem] lg:min-h-[46rem]">
        {slides.map((slide, slideIndex) => {
          const active = slideIndex === index;
          return (
            <div
              key={slide.id}
              className={`absolute inset-0 transition-opacity duration-[1100ms] ease-out ${active ? 'opacity-100' : 'opacity-0'}`}
              aria-hidden={!active}
            >
              {slide.desktopImageUrl ? (
                <img
                  src={slide.desktopImageUrl}
                  alt={active ? slide.imageAlt || slide.headline : ''}
                  fetchPriority={slideIndex === 0 ? 'high' : 'low'}
                  loading={slideIndex === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                  className={`hero-kenburns absolute inset-0 h-full w-full object-cover opacity-50 ${active ? 'is-active' : ''}`}
                />
              ) : (
                <CampaignArt index={slideIndex} />
              )}
            </div>
          );
        })}

        <div className="hero-light-streak" aria-hidden />
        <div className="hero-particles absolute inset-0 pointer-events-none" aria-hidden />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0C2340]/88 via-[#0C2340]/45 to-[#0C2340]/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0C2340]/75 via-transparent to-[#0C2340]/20" />

        <div key={current.id} className="sf-container relative z-[2] flex min-h-[28rem] flex-col justify-center py-20 sm:min-h-[36rem] lg:min-h-[46rem]">
          <div className="hero-copy-in">
            {current.eyebrow ? (
              <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#7FD1F0]/40 bg-[#7FD1F0]/10 px-4 py-1.5 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-[#7FD1F0] backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-[#7FD1F0] animate-pulse" />
                {current.eyebrow}
              </span>
            ) : null}
          </div>

          <h1 className="hero-copy-in hero-copy-in-delay-1 font-display text-[clamp(2.2rem,5.5vw,4.5rem)] font-extrabold leading-[1.07] tracking-tight text-white max-w-2xl drop-shadow-sm">
            {current.headline}
            {current.headlineAccent ? (
              <>
                {' '}
                <span className="hero-text-glow">{current.headlineAccent}</span>
              </>
            ) : null}
          </h1>

          {current.subheadline ? (
            <p className="hero-copy-in hero-copy-in-delay-2 mt-5 max-w-lg text-[1.05rem] leading-relaxed text-white/75">
              {current.subheadline}
            </p>
          ) : null}

          <div className="hero-copy-in hero-copy-in-delay-3 mt-9 flex flex-wrap gap-4">
            <Link
              href={current.primaryCtaHref || publicRoutes.checkAvailability}
              className="sf-btn sf-btn-primary hero-cta group inline-flex items-center gap-2 px-7 py-3.5 text-[0.92rem] shadow-[0_4px_24px_rgba(46,134,222,0.45)]"
            >
              {current.primaryCtaLabel || 'Check Availability'}
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
            {current.secondaryCtaHref ? (
              <Link
                href={current.secondaryCtaHref}
                className="sf-btn inline-flex items-center border border-white/35 px-7 py-3.5 text-[0.92rem] text-white backdrop-blur-sm hover:bg-white hover:text-[#0C2340]"
              >
                {current.secondaryCtaLabel || 'View plans'}
              </Link>
            ) : null}
          </div>
        </div>

        {slides.length > 1 ? (
          <>
            <button
              type="button"
              onClick={() => advance(-1)}
              aria-label="Previous slide"
              className="absolute left-4 top-1/2 z-[3] hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 sm:flex"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => advance(1)}
              aria-label="Next slide"
              className="absolute right-4 top-1/2 z-[3] hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition hover:bg-white/20 sm:flex"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <div className="absolute bottom-7 left-1/2 flex -translate-x-1/2 items-center gap-2">
              {slides.map((slide, slideIndex) => (
                <button
                  key={slide.id}
                  type="button"
                  aria-label={`Show slide ${slideIndex + 1}`}
                  onClick={() => setIndex(slideIndex)}
                  className={`rounded-full transition-all duration-300 ${slideIndex === index
                      ? 'h-2 w-8 bg-[#7FD1F0] shadow-[0_0_8px_#7FD1F0]'
                      : 'h-2 w-2 bg-white/35 hover:bg-white/60'
                    }`}
                />
              ))}
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10">
              <div key={index} className="hero-progress-bar h-full bg-[#7FD1F0]" />
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
