import {
  breakpointTokens,
  colorTokens,
  containerTokens,
  motionTokens,
  radiusTokens,
  shadowTokens,
  spacingTokens,
  typographyTokens,
  zIndexTokens,
} from './tokens';

/**
 * Tailwind preset generated from the design tokens. Both Next.js applications consume this so a
 * utility class such as `bg-surge-500` resolves to exactly the same value everywhere.
 *
 * Typed loosely on purpose: importing Tailwind's `Config` type here would make every consumer of
 * `@stormfiber/config` depend on Tailwind, including the API.
 */
export const tailwindPreset = {
  theme: {
    screens: breakpointTokens,
    container: containerTokens,
    extend: {
      colors: {
        ...colorTokens,
        /** Semantic aliases so components describe intent rather than a hue. */
        brand: colorTokens.storm,
        accent: colorTokens.surge,
        promo: colorTokens.ember,
        surface: {
          DEFAULT: colorTokens.white,
          muted: colorTokens.ink[50],
          subtle: colorTokens.ink[100],
          inverse: colorTokens.ink[950],
          'inverse-raised': '#141C2E',
        },
        content: {
          DEFAULT: colorTokens.ink[900],
          muted: colorTokens.ink[600],
          subtle: colorTokens.ink[500],
          inverse: colorTokens.white,
          'inverse-muted': colorTokens.ink[300],
        },
        border: {
          DEFAULT: colorTokens.ink[200],
          strong: colorTokens.ink[300],
          inverse: 'rgb(255 255 255 / 0.12)',
        },
      },
      fontFamily: typographyTokens.fontFamily,
      fontSize: typographyTokens.fontSize,
      fontWeight: typographyTokens.fontWeight,
      spacing: spacingTokens,
      borderRadius: radiusTokens,
      boxShadow: shadowTokens,
      zIndex: zIndexTokens,
      transitionDuration: motionTokens.duration,
      transitionTimingFunction: motionTokens.easing,
      backgroundImage: {
        'storm-gradient': `linear-gradient(135deg, ${colorTokens.ink[950]} 0%, ${colorTokens.storm[950]} 55%, ${colorTokens.storm[800]} 100%)`,
        'surge-gradient': `linear-gradient(120deg, ${colorTokens.surge[500]} 0%, ${colorTokens.storm[500]} 100%)`,
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-in-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(100%)' },
          to: { transform: 'translateX(0)' },
        },
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': `fade-in ${motionTokens.duration.base} ${motionTokens.easing.out} both`,
        'fade-in-up': `fade-in-up ${motionTokens.duration.slow} ${motionTokens.easing.out} both`,
        'scale-in': `scale-in ${motionTokens.duration.base} ${motionTokens.easing.out} both`,
        'slide-in-right': `slide-in-right ${motionTokens.duration.base} ${motionTokens.easing.out} both`,
        'accordion-down': `accordion-down ${motionTokens.duration.base} ${motionTokens.easing.standard}`,
        'accordion-up': `accordion-up ${motionTokens.duration.base} ${motionTokens.easing.standard}`,
      },
    },
  },
};

export default tailwindPreset;
