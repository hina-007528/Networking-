/**
 * Brand-level copy defaults.
 *
 * Anything an operator would realistically want to change lives in the CMS (`site_settings`).
 * These values are only the fallbacks used before the CMS responds, or during static rendering of
 * error pages where an API round-trip is not possible.
 */
export const brand = {
  name: 'StormFiber',
  legalName: 'StormFiber Communications (Pvt) Ltd',
  tagline: '100% fibre to the home',
  description:
    'Ultra-fast fibre internet, high-definition television and crystal clear voice on a single fibre line.',
  supportPhoneDisplay: '111-1-78676',
  supportPhoneE164: '+92211111 78676',
  supportEmail: 'help@stormfiber.local',
  salesEmail: 'sales@stormfiber.local',
  currency: 'PKR',
  currencySymbol: 'Rs',
  locale: 'en-PK',
  timeZone: 'Asia/Karachi',
  social: [
    { platform: 'facebook', url: 'https://example.com/stormfiber' },
    { platform: 'instagram', url: 'https://example.com/stormfiber' },
    { platform: 'x', url: 'https://example.com/stormfiber' },
    { platform: 'linkedin', url: 'https://example.com/stormfiber' },
    { platform: 'youtube', url: 'https://example.com/stormfiber' },
  ],
} as const;

/** Billing rules that are visible to customers and therefore part of the product contract. */
export const billingPolicy = {
  /** Invoices are generated on this day of the month. */
  generationDayOfMonth: 1,
  /** Invoices are payable by this day of the same month. */
  dueDayOfMonth: 10,
  /** Grace period, in days after the due date, before an invoice is marked overdue. */
  overdueGraceDays: 0,
  /** Days after the due date at which service suspension is considered. */
  suspensionAfterDays: 20,
  lateFeePercentage: 0,
  advancePaymentDiscountPercentage: 5,
} as const;

export const seo = {
  titleTemplate: '%s | StormFiber',
  defaultTitle: 'StormFiber — Ultra-Fast Fibre Internet, HD TV and Voice',
  defaultDescription:
    'Get ultra-fast 100% fibre-optic internet, HD television and crystal clear voice on a single connection. Check coverage in your area and pick a plan built for your home.',
  keywords: [
    'fibre internet',
    'fiber internet Pakistan',
    'FTTH broadband',
    'HD TV',
    'landline voice',
    'triple play',
    'double play',
    'internet packages',
  ],
  ogImagePath: '/og/default.png',
  twitterHandle: '@stormfiber',
} as const;

export const preferredTimeOptions = [
  { value: 'MORNING', label: 'Morning (9am – 12pm)' },
  { value: 'AFTERNOON', label: 'Afternoon (12pm – 4pm)' },
  { value: 'EVENING', label: 'Evening (4pm – 8pm)' },
  { value: 'ANYTIME', label: 'Any time' },
] as const;
