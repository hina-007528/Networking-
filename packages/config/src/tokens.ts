/**
 * Design tokens for the StormFiber platform.
 *
 * These are the single source of truth for colour, type, spacing, radius, elevation and motion.
 * The Tailwind preset in `tailwind-preset.ts` is generated from this file, and CSS custom
 * properties are emitted from it too, so a token can never drift between the two systems.
 *
 * The palette is our own: a deep "storm" blue for structure and trust, an electric "surge" cyan
 * for actions and speed, and a warm amber reserved exclusively for promotional emphasis.
 */

export const colorTokens = {
  /** Primary brand colour. Used for structure, links and primary emphasis. */
  storm: {
    50: '#F0F6FF',
    100: '#DEEBFF',
    200: '#BFD8FF',
    300: '#94BCFF',
    400: '#5F97FB',
    500: '#3573EF',
    600: '#1F55D4',
    700: '#1943A9',
    800: '#1A3B85',
    900: '#1B3469',
    950: '#12203F',
  },
  /** Action colour. Reserved for CTAs, active states and speed messaging. */
  surge: {
    50: '#ECFDFF',
    100: '#D0F7FF',
    200: '#A6EEFF',
    300: '#6EE0FA',
    400: '#2FCAEC',
    500: '#12AACD',
    600: '#0B87A8',
    700: '#0E6B87',
    800: '#12586E',
    900: '#14495C',
    950: '#062F3D',
  },
  /** Promotional accent. Only used for offers, badges and limited-time messaging. */
  ember: {
    50: '#FFF8EB',
    100: '#FFEDC7',
    200: '#FFD98A',
    300: '#FFC14D',
    400: '#FFAB24',
    500: '#F98A0B',
    600: '#DD6506',
    700: '#B74609',
    800: '#94360E',
    900: '#7A2D0F',
    950: '#461604',
  },
  /** Neutral scale. Dark values double as page surfaces in the header and footer. */
  ink: {
    50: '#F6F8FB',
    100: '#ECF0F6',
    200: '#D6DEE9',
    300: '#B2C0D2',
    400: '#879BB5',
    500: '#667C9B',
    600: '#4F6381',
    700: '#415069',
    800: '#394458',
    900: '#242C3B',
    950: '#0C1220',
  },
  success: {
    50: '#ECFDF3',
    100: '#D1FADF',
    500: '#12B76A',
    600: '#039855',
    700: '#027A48',
  },
  warning: {
    50: '#FFFAEB',
    100: '#FEF0C7',
    500: '#F79009',
    600: '#DC6803',
    700: '#B54708',
  },
  danger: {
    50: '#FEF3F2',
    100: '#FEE4E2',
    500: '#F04438',
    600: '#D92D20',
    700: '#B42318',
  },
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const typographyTokens = {
  fontFamily: {
    /** Display face: used for hero and section headings only. */
    display: ['var(--font-display)', 'Sora', 'Segoe UI', 'system-ui', 'sans-serif'],
    /** Body face: everything else. */
    sans: ['var(--font-sans)', 'Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
    mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
  },
  fontSize: {
    '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.04em' }],
    xs: ['0.75rem', { lineHeight: '1.125rem' }],
    sm: ['0.875rem', { lineHeight: '1.375rem' }],
    base: ['1rem', { lineHeight: '1.625rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.875rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.01em' }],
    '3xl': ['1.875rem', { lineHeight: '2.375rem', letterSpacing: '-0.015em' }],
    '4xl': ['2.25rem', { lineHeight: '2.75rem', letterSpacing: '-0.02em' }],
    '5xl': ['2.875rem', { lineHeight: '3.25rem', letterSpacing: '-0.025em' }],
    '6xl': ['3.5rem', { lineHeight: '3.875rem', letterSpacing: '-0.03em' }],
    '7xl': ['4.25rem', { lineHeight: '4.5rem', letterSpacing: '-0.032em' }],
  },
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
} as const;

/** 4px base scale, extended with the vertical rhythm used between marketing sections. */
export const spacingTokens = {
  px: '1px',
  0: '0',
  0.5: '0.125rem',
  1: '0.25rem',
  1.5: '0.375rem',
  2: '0.5rem',
  2.5: '0.625rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '1.75rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  14: '3.5rem',
  16: '4rem',
  20: '5rem',
  24: '6rem',
  28: '7rem',
  32: '8rem',
  /** Vertical padding for a standard marketing section on small screens. */
  'section-sm': '3.5rem',
  /** Vertical padding for a standard marketing section on large screens. */
  'section-lg': '6rem',
} as const;

export const radiusTokens = {
  none: '0',
  sm: '0.375rem',
  md: '0.625rem',
  lg: '1rem',
  xl: '1.5rem',
  '2xl': '2rem',
  full: '9999px',
} as const;

export const shadowTokens = {
  xs: '0 1px 2px 0 rgb(12 18 32 / 0.05)',
  sm: '0 1px 3px 0 rgb(12 18 32 / 0.08), 0 1px 2px -1px rgb(12 18 32 / 0.08)',
  card: '0 4px 16px -2px rgb(12 18 32 / 0.08), 0 2px 6px -2px rgb(12 18 32 / 0.05)',
  'card-hover': '0 16px 32px -8px rgb(18 32 63 / 0.16), 0 4px 12px -4px rgb(18 32 63 / 0.08)',
  overlay: '0 24px 48px -12px rgb(12 18 32 / 0.28)',
  'focus-ring': '0 0 0 3px rgb(47 202 236 / 0.45)',
  none: 'none',
} as const;

export const breakpointTokens = {
  xs: '375px',
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1440px',
  '3xl': '1920px',
} as const;

export const containerTokens = {
  center: true,
  padding: {
    DEFAULT: '1.25rem',
    md: '2rem',
    lg: '2.5rem',
    xl: '3rem',
  },
  screens: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1200px',
    '2xl': '1320px',
  },
} as const;

export const motionTokens = {
  duration: {
    fast: '150ms',
    base: '220ms',
    slow: '400ms',
    slower: '700ms',
  },
  easing: {
    standard: 'cubic-bezier(0.32, 0.72, 0, 1)',
    out: 'cubic-bezier(0.16, 1, 0.3, 1)',
    in: 'cubic-bezier(0.7, 0, 0.84, 0)',
  },
} as const;

export const zIndexTokens = {
  base: '0',
  raised: '10',
  sticky: '30',
  header: '40',
  dropdown: '50',
  overlay: '60',
  modal: '70',
  toast: '80',
} as const;

export const designTokens = {
  colors: colorTokens,
  typography: typographyTokens,
  spacing: spacingTokens,
  radius: radiusTokens,
  shadows: shadowTokens,
  breakpoints: breakpointTokens,
  container: containerTokens,
  motion: motionTokens,
  zIndex: zIndexTokens,
} as const;

export type DesignTokens = typeof designTokens;
