import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'promo' | 'dark';
type Size = 'sm' | 'md' | 'lg';

const variants: Record<Variant, string> = {
  primary: 'bg-[#2E86DE] text-white font-bold hover:bg-[#145DA0]',
  secondary: 'bg-white text-[#0C2340] font-semibold border border-[#0C2340] hover:bg-[#0C2340] hover:text-white',
  ghost: 'bg-transparent text-[#0C2340] hover:text-[#2E86DE]',
  promo: 'bg-[#2E86DE] text-white font-extrabold hover:bg-[#145DA0]',
  dark: 'bg-[#0C2340] text-white font-bold hover:bg-[#081628]',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-xs rounded-md',
  md: 'h-11 px-5 text-sm rounded-md',
  lg: 'h-12 px-7 text-base rounded-md',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E86DE] disabled:cursor-not-allowed disabled:opacity-60',
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <svg className="h-4 w-4 animate-spin text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : null}
      {children}
    </button>
  );
}
