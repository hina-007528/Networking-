import type { ReactNode } from 'react';

export interface FeatureCardProps {
  title: string;
  description: string;
  icon?: ReactNode;
}

export function FeatureCard({ title, description, icon }: FeatureCardProps) {
  return (
    <article className="h-full rounded-xl border border-[#e4e9ef] bg-white p-7 text-center shadow-[0_8px_24px_rgb(16_32_51/0.05)]">
      {icon ? (
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#E8F3FC] text-[#2E86DE]">
          {icon}
        </div>
      ) : null}
      <h3 className="font-display text-xl font-extrabold text-[#1b2430]">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-[#5d6b7a]">{description}</p>
    </article>
  );
}
