/**
 * Brand-level copy defaults for Majawar X Network.
 * CMS site_settings can override display values at runtime.
 */
export const brand = {
  name: 'Majawar X Network',
  shortName: 'Majawar X',
  legalName: 'Majawar X Networks',
  tagline: 'Built for Speed – Made for You.',
  description:
    "Lahore's fibre network — high-speed internet, HD television and home voice, proudly serving Lahore.",
  supportPhoneDisplay: '0303 0002291',
  supportPhoneE164: '+923030002291',
  whatsappDisplay: '+92 325 7862291',
  whatsappE164: '+923257862291',
  whatsappUrl: 'https://wa.me/923257862291',
  officeEmail: 'infomajawarxnetworks@gmail.com',
  supportEmail: 'info@majawarxnetworks.online',
  salesEmail: 'ceo@majawarxnetworks.online',
  adminEmails: ['ceo@majawarxnetworks.online', 'info@majawarxnetworks.online'] as const,
  website: 'https://www.majawarxnetworks.online',
  currency: 'PKR',
  currencySymbol: 'Rs',
  locale: 'en-PK',
  timeZone: 'Asia/Karachi',
  offices: {
    head: {
      label: 'Head Office',
      address: 'H#A/1, Sheikh Hindi Manzil, Outside Bhatti Gate, Lahore.',
    },
    branch: {
      label: 'Branch Office',
      address: 'Chohan Tower, 16 Jail Rd, Shadman II, Shadman 2, Shadman, Lahore, 54000.',
    },
  },
  social: [
    { platform: 'whatsapp', url: 'https://wa.me/923257862291' },
    { platform: 'instagram', url: 'https://www.instagram.com/majawar_x_network?igsi=bDVhMmF1bmpkOGdo' },
    { platform: 'linkedin', url: 'https://www.linkedin.com/company/majawar-x-networks/' },
  ],
} as const;

export const billingPolicy = {
  generationDayOfMonth: 1,
  dueDayOfMonth: 10,
  overdueGraceDays: 0,
  suspensionAfterDays: 20,
  lateFeePercentage: 0,
  advancePaymentDiscountPercentage: 5,
} as const;

export const seo = {
  titleTemplate: '%s | Majawar X Network',
  defaultTitle: "Majawar X Network — Lahore's fiber network",
  defaultDescription:
    "Proudly serving Lahore with fibre internet, HD TV and voice. Check coverage, pick a plan, and manage your account.",
  keywords: [
    'Majawar X Network',
    'fibre internet Lahore',
    'FTTH broadband',
    'HD TV',
    'home phone',
    'internet packages Lahore',
  ],
  ogImagePath: '/brand/logo.svg',
  twitterHandle: '@majawar_x_network',
} as const;

export const preferredTimeOptions = [
  { value: 'MORNING', label: 'Morning (9am – 12pm)' },
  { value: 'AFTERNOON', label: 'Afternoon (12pm – 4pm)' },
  { value: 'EVENING', label: 'Evening (4pm – 8pm)' },
  { value: 'ANYTIME', label: 'Any time' },
] as const;
