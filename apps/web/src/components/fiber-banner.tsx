import Link from 'next/link';
import { publicRoutes, SERVICE_CITY } from '@stormfiber/config';

export function FiberBanner() {
  return (
    <section className="relative overflow-hidden bg-[#0C2340] py-16 text-white lg:py-24">
      <img
        src="/hero-fiber-bg.png"
        alt=""
        loading="lazy"
        decoding="async"
        className="hero-kenburns is-loop pointer-events-none absolute inset-0 h-full w-full object-cover opacity-35"
        aria-hidden
      />
      <div className="absolute inset-0 bg-[#0C2340]/70" />
      <div className="fiber-stage" aria-hidden>
        <svg className="fiber-cable" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <defs>
            <linearGradient id="fiberGlow" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#145DA0" />
              <stop offset="0.5" stopColor="#7FD1F0" />
              <stop offset="1" stopColor="#6C63FF" />
            </linearGradient>
          </defs>
          <path className="fiber-path" d="M-40 180 C 180 40, 360 280, 560 160 S 920 40, 1120 180 S 1400 80, 1520 160" />
          <path className="fiber-path fiber-path-delay" d="M-40 220 C 240 80, 420 300, 680 200 S 1040 90, 1520 210" />
        </svg>
        <span className="fiber-particle" />
        <span className="fiber-particle fiber-particle-2" />
        <span className="fiber-particle fiber-particle-3" />
      </div>
      <div className="hero-light-streak" aria-hidden />
      <div className="sf-container relative z-[2] text-center">
        <h2 className="font-display text-[clamp(1.7rem,4vw,3rem)] font-extrabold leading-tight">
          One Fibre — <span className="text-[#7FD1F0]">Unlimited Possibilities</span>
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-white/75">
          Proudly serving {SERVICE_CITY} homes on a single drop: broadband, television and a landline.
        </p>
        <Link href={publicRoutes.plans} className="sf-btn sf-btn-primary mt-8 min-h-11">
          View our triple bundle plans
        </Link>
      </div>
    </section>
  );
}
