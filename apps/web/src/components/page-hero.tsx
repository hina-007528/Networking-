import type { ReactNode } from 'react';
import { OptimizedImage } from '@/components/optimized-image';
import { heroImages } from '@/lib/hero-images';

export function PageHero({
  heading,
  accent,
  subheading,
  image = heroImages.products,
  children,
}: {
  heading: ReactNode;
  accent?: string;
  subheading?: string;
  image?: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-[#0C2340] text-white">
      <OptimizedImage
        src={image}
        alt=""
        fill
        priority
        sizes="100vw"
        className="hero-kenburns is-loop pointer-events-none object-cover opacity-30"
      />
      <div className="hero-light-streak" aria-hidden />
      <div className="absolute inset-0 bg-[#0C2340]/70" />
      <div className="sf-container relative z-[2] py-16 text-center sm:py-20">
        <h1 className="font-display text-[clamp(2rem,4.5vw,3.6rem)] font-extrabold leading-tight">
          {heading}
          {accent ? (
            <>
              {' '}
              <span className="text-[#7FD1F0]">{accent}</span>
            </>
          ) : null}
        </h1>
        {subheading ? <p className="mx-auto mt-4 max-w-2xl text-lg text-white/70">{subheading}</p> : null}
        {children}
      </div>
    </section>
  );
}
