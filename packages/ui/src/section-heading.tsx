import type { ReactNode } from 'react';
import { cn } from './cn';

export interface SectionHeadingProps {
  eyebrow?: string;
  heading: ReactNode;
  accent?: string;
  subheading?: string;
  align?: 'left' | 'center';
  invert?: boolean;
}

export function SectionHeading({
  eyebrow,
  heading,
  accent,
  subheading,
  align = 'center',
  invert = false,
}: SectionHeadingProps) {
  return (
    <div className={cn('max-w-3xl', align === 'center' && 'mx-auto text-center')}>
      {eyebrow ? (
        <span
          className={cn(
            'text-xs font-bold uppercase tracking-[0.18em]',
            invert ? 'text-[#7FD1F0]' : 'text-[var(--sf-orange,#2E86DE)]',
          )}
        >
          {eyebrow}
        </span>
      ) : null}
      <h2
        className={cn(
          'font-display text-[clamp(1.75rem,3.4vw,2.75rem)] font-extrabold tracking-tight',
          eyebrow && 'mt-2',
          invert ? 'text-white' : 'text-[#1b2430]',
        )}
      >
        {heading}
        {accent ? (
          <>
            {' '}
            <span className={invert ? 'text-[#7FD1F0]' : 'text-[#2E86DE]'}>{accent}</span>
          </>
        ) : null}
      </h2>
      {subheading ? (
        <p className={cn('mt-3 text-base leading-7 md:text-lg', invert ? 'text-slate-200' : 'text-[#5d6b7a]')}>
          {subheading}
        </p>
      ) : null}
    </div>
  );
}
