import type { ReactNode } from 'react';
import { cn } from './cn';

export interface PlanCardProps {
  name: string;
  speedLabel?: string | null;
  description?: string | null;
  priceLabel: string;
  periodLabel?: string;
  featured?: boolean;
  href: string;
  features?: string[];
  cta?: ReactNode;
  installationLabel?: string | null;
  services?: string[];
  addons?: string[];
  badge?: string | null;
}

export function PlanCard({
  name,
  speedLabel,
  description,
  priceLabel,
  periodLabel = 'Monthly cost',
  featured = false,
  href,
  features = [],
  cta,
  installationLabel,
  services = [],
  addons = [],
  badge,
}: PlanCardProps) {
  return (
    <article
      className={cn(
        'relative flex h-full flex-col rounded-xl border bg-white p-6 shadow-[0_8px_24px_rgb(16_32_51/0.06)]',
        featured ? 'border-[#2E86DE]' : 'border-[#E6EEF6]',
      )}
    >
      {badge ? (
        <span className="absolute -top-3 left-5 inline-flex rounded-sm bg-[#2E86DE] px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wide text-white">
          {badge}
        </span>
      ) : null}

      <h3 className="font-display text-xl font-extrabold text-[#1b2430]">{name}</h3>
      {speedLabel ? <p className="mt-2 font-display text-3xl font-extrabold text-[#2E86DE]">{speedLabel}</p> : null}
      {description ? <p className="mt-3 text-sm leading-6 text-[#5d6b7a]">{description}</p> : null}

      {services.length > 0 ? (
        <p className="mt-4 text-xs font-bold uppercase tracking-wider text-[#8a96a3]">{services.join(' · ')}</p>
      ) : null}

      <div className="mt-5 space-y-1 border-y border-[#e4e9ef] py-4 text-sm">
        <p className="flex justify-between text-[#5d6b7a]">
          <span>{periodLabel}</span>
          <strong className="text-[#1b2430]">{priceLabel}</strong>
        </p>
        {installationLabel ? (
          <p className="flex justify-between text-[#5d6b7a]">
            <span>One-time cost</span>
            <strong className="text-[#1b2430]">{installationLabel}</strong>
          </p>
        ) : null}
      </div>

      {addons.length > 0 ? (
        <ul className="mt-4 space-y-1.5 text-sm text-[#5d6b7a]">
          {addons.map((addon) => (
            <li key={addon}>Add {addon}</li>
          ))}
        </ul>
      ) : features.length > 0 ? (
        <ul className="mt-4 space-y-2 text-sm text-[#5d6b7a]">
          {features.map((feature) => (
            <li key={feature} className="flex gap-2">
              <span className="text-[#2E86DE]">✓</span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-auto pt-6">
        {cta ?? (
          <a
            href={href}
            className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[#2E86DE] text-sm font-bold text-white hover:bg-[#145DA0]"
          >
            Order Now
          </a>
        )}
      </div>
    </article>
  );
}
