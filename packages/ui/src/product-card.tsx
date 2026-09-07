import type { ReactNode } from 'react';

export interface ProductCardProps {
  title: string;
  description: string;
  href: string;
  icon?: ReactNode;
  ctaLabel?: string;
}

export function ProductCard({ title, description, href, icon, ctaLabel = 'Learn More' }: ProductCardProps) {
  return (
    <a
      href={href}
      className="group flex h-full flex-col rounded-xl border border-[#e4e9ef] bg-white p-8 shadow-[0_8px_24px_rgb(16_32_51/0.06)] transition-transform hover:-translate-y-0.5"
    >
      {icon ? (
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-lg bg-[#E8F3FC] text-[#2E86DE]">
          {icon}
        </div>
      ) : null}
      <h3 className="font-display text-2xl font-extrabold text-[#1b2430]">{title}</h3>
      <p className="mt-3 flex-1 text-sm leading-6 text-[#5d6b7a]">{description}</p>
      <span className="mt-6 text-sm font-bold text-[#2E86DE] group-hover:underline">{ctaLabel}</span>
    </a>
  );
}
