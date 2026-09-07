import { PlanKind, PublishStatus, ServiceType } from '@prisma/client';

/**
 * Plan catalog used for development and demos.
 *
 * All plan names, prices and copy are our own. They are shaped like a real Pakistani FTTH
 * catalogue — internet-only tiers, Double Play (internet + voice), Triple Play (internet + TV +
 * voice), stand-alone TV and voice, plus limited-time promotional tiers — so every filter, tab and
 * comparison view in the UI has meaningful data to work with.
 */

export interface SeedPlanFeature {
  label: string;
  value?: string;
  iconKey?: string;
  highlighted?: boolean;
}

export interface SeedPlan {
  name: string;
  slug: string;
  kind: PlanKind;
  categorySlug: string;
  services: ServiceType[];
  speedMbps?: number;
  uploadMbps?: number;
  tvChannels?: number;
  voiceMinutes?: number;
  monthlyPrice: number;
  installationPrice: number;
  shortDescription: string;
  description: string;
  featured?: boolean;
  badgeText?: string;
  promotionSlug?: string;
  status?: PublishStatus;
  addonSlugs?: string[];
  features: SeedPlanFeature[];
  metadata?: Record<string, unknown>;
}

export const seedPlanCategories = [
  {
    name: 'Triple Play Promos',
    slug: 'triple-play-promos',
    kind: PlanKind.TRIPLE_PLAY,
    description: 'Limited-period pricing on internet, HD TV and voice together.',
    displayOrder: 1,
  },
  {
    name: 'Triple Play Standard',
    slug: 'triple-play-standard',
    kind: PlanKind.TRIPLE_PLAY,
    description: 'Our everyday internet, HD TV and voice bundles.',
    displayOrder: 2,
  },
  {
    name: 'Double Play Promos',
    slug: 'double-play-promos',
    kind: PlanKind.DOUBLE_PLAY,
    description: 'Internet and voice at promotional pricing.',
    displayOrder: 3,
  },
  {
    name: 'Double Play Standard',
    slug: 'double-play-standard',
    kind: PlanKind.DOUBLE_PLAY,
    description: 'Internet with a landline on the same fibre.',
    displayOrder: 4,
  },
  {
    name: 'Internet Standard',
    slug: 'internet-standard',
    kind: PlanKind.INTERNET,
    description: 'Pure fibre internet with symmetric upload.',
    displayOrder: 5,
  },
  {
    name: 'Limited Time Offers',
    slug: 'limited-time-offers',
    kind: PlanKind.INTERNET,
    description: 'Seasonal pricing available for a short window.',
    displayOrder: 6,
  },
  {
    name: 'TV',
    slug: 'tv',
    kind: PlanKind.TV,
    description: 'Stand-alone HD television service.',
    displayOrder: 7,
  },
  {
    name: 'Phone',
    slug: 'phone',
    kind: PlanKind.PHONE,
    description: 'Stand-alone voice service.',
    displayOrder: 8,
  },
];

export const seedAddons = [
  {
    name: 'Additional HD Box',
    slug: 'additional-hd-box',
    serviceType: ServiceType.TV,
    monthlyPrice: 500,
    oneTimePrice: 0,
    description: 'A second set-top box so another television gets the full HD channel line-up.',
    displayOrder: 1,
  },
  {
    name: 'Sports Pack',
    slug: 'sports-pack',
    serviceType: ServiceType.TV,
    monthlyPrice: 600,
    oneTimePrice: 0,
    description: 'Premium sports channels added to your existing TV line-up.',
    displayOrder: 2,
  },
  {
    name: 'Mesh Wi-Fi Extender',
    slug: 'mesh-wifi-extender',
    serviceType: ServiceType.INTERNET,
    monthlyPrice: 750,
    oneTimePrice: 0,
    description: 'A managed mesh node that removes dead spots in larger homes.',
    displayOrder: 3,
  },
  {
    name: 'Static IP Address',
    slug: 'static-ip',
    serviceType: ServiceType.INTERNET,
    monthlyPrice: 1000,
    oneTimePrice: 0,
    description: 'A dedicated public IPv4 address for remote access and self-hosting.',
    displayOrder: 4,
  },
  {
    name: 'Voice Bundle 500',
    slug: 'voice-bundle-500',
    serviceType: ServiceType.PHONE,
    monthlyPrice: 350,
    oneTimePrice: 0,
    description: '500 minutes to any mobile or landline network in Pakistan each month.',
    displayOrder: 5,
  },
  {
    name: 'Additional TV Point',
    slug: 'additional-tv-point',
    serviceType: ServiceType.TV,
    monthlyPrice: 400,
    oneTimePrice: 2500,
    description: 'Cabling and activation for one more television point in your home.',
    displayOrder: 6,
  },
];

export const seedPromotions = [
  {
    name: 'Monsoon Surge',
    slug: 'monsoon-surge',
    code: 'MONSOON',
    description:
      'Twenty percent off your monthly bill for the first three months on selected internet plans.',
    discountKind: 'PERCENTAGE' as const,
    discountValue: 20,
    durationMonths: 3,
    badgeText: 'Save 20%',
    status: PublishStatus.PUBLISHED,
    startsAt: '2026-06-01T00:00:00.000Z',
    endsAt: '2026-12-31T23:59:59.000Z',
  },
  {
    name: 'Free Installation',
    slug: 'free-installation',
    code: 'FREEINSTALL',
    description: 'We waive the one-time installation charge on annual Triple Play bundles.',
    discountKind: 'FIXED' as const,
    discountValue: 7500,
    durationMonths: 1,
    badgeText: 'Free setup',
    status: PublishStatus.PUBLISHED,
    startsAt: '2026-01-01T00:00:00.000Z',
    endsAt: '2027-01-31T23:59:59.000Z',
  },
  {
    name: 'Switch and Save',
    slug: 'switch-and-save',
    code: 'SWITCH',
    description:
      'Moving from another provider? Take Rs 1,000 off each of your first six invoices.',
    discountKind: 'FIXED' as const,
    discountValue: 1000,
    durationMonths: 6,
    badgeText: 'Rs 1,000 off',
    status: PublishStatus.PUBLISHED,
    startsAt: '2026-03-01T00:00:00.000Z',
    endsAt: '2026-12-31T23:59:59.000Z',
  },
];

const internetFeatures = (speed: number): SeedPlanFeature[] => [
  { label: 'Download speed', value: `${speed} Mbps`, iconKey: 'download', highlighted: true },
  { label: 'Upload speed', value: `${speed} Mbps`, iconKey: 'upload', highlighted: true },
  { label: 'Data allowance', value: 'Unlimited, fair-usage applies', iconKey: 'infinity' },
  { label: 'Connection', value: '100% fibre to the home', iconKey: 'cable' },
  { label: 'Managed Wi-Fi router', value: 'Included', iconKey: 'wifi' },
  { label: 'Support', value: '24/7 helpline', iconKey: 'headset' },
];

const tvFeatures: SeedPlanFeature[] = [
  { label: 'HD channels', value: '120+', iconKey: 'tv', highlighted: true },
  { label: 'Electronic programming guide', value: 'Included', iconKey: 'calendar' },
  { label: 'Fast channel change', value: 'Included', iconKey: 'zap' },
  { label: 'Learning remote', value: 'One remote for TV and box', iconKey: 'remote' },
];

const voiceFeatures: SeedPlanFeature[] = [
  { label: 'Landline number', value: 'Included', iconKey: 'phone', highlighted: true },
  { label: 'On-net calls', value: 'Free between StormFiber lines', iconKey: 'phone-call' },
  { label: 'Billing', value: 'Postpaid — no top-ups', iconKey: 'receipt' },
  { label: 'Works without mobile signal', value: 'Yes', iconKey: 'signal' },
];

const STANDARD_INSTALLATION = 7500;

export const seedPlans: SeedPlan[] = [
  /* ----------------------------- internet only ----------------------------- */
  {
    name: 'Zephyr 20',
    slug: 'zephyr-20',
    kind: PlanKind.INTERNET,
    categorySlug: 'internet-standard',
    services: [ServiceType.INTERNET],
    speedMbps: 20,
    uploadMbps: 20,
    monthlyPrice: 2999,
    installationPrice: STANDARD_INSTALLATION,
    shortDescription: 'Symmetric 20 Mbps for browsing, video calls and one 4K stream.',
    description:
      'Our entry fibre tier. Twenty megabits in both directions is enough for a small household to browse, work from home and stream in high definition without contention.',
    addonSlugs: ['mesh-wifi-extender', 'static-ip'],
    features: internetFeatures(20),
  },
  {
    name: 'Gale 30',
    slug: 'gale-30',
    kind: PlanKind.INTERNET,
    categorySlug: 'internet-standard',
    services: [ServiceType.INTERNET],
    speedMbps: 30,
    uploadMbps: 30,
    monthlyPrice: 3999,
    installationPrice: STANDARD_INSTALLATION,
    shortDescription: 'Symmetric 30 Mbps for a busy family of four.',
    description:
      'Thirty megabits symmetric handles simultaneous video calls, cloud backups and multiple HD streams. A good default for a family that works and studies from home.',
    addonSlugs: ['mesh-wifi-extender', 'static-ip'],
    features: internetFeatures(30),
  },
  {
    name: 'Squall 50',
    slug: 'squall-50',
    kind: PlanKind.INTERNET,
    categorySlug: 'internet-standard',
    services: [ServiceType.INTERNET],
    speedMbps: 50,
    uploadMbps: 50,
    monthlyPrice: 5499,
    installationPrice: STANDARD_INSTALLATION,
    shortDescription: 'Symmetric 50 Mbps with headroom for large uploads.',
    description:
      'Fifty megabits up and down suits households that move large files: photographers, editors and anyone pushing work to the cloud all day.',
    featured: true,
    addonSlugs: ['mesh-wifi-extender', 'static-ip'],
    features: internetFeatures(50),
  },
  {
    name: 'Tempest 100',
    slug: 'tempest-100',
    kind: PlanKind.INTERNET,
    categorySlug: 'internet-standard',
    services: [ServiceType.INTERNET],
    speedMbps: 100,
    uploadMbps: 100,
    monthlyPrice: 8499,
    installationPrice: STANDARD_INSTALLATION,
    shortDescription: 'Symmetric 100 Mbps for heavy, simultaneous use.',
    description:
      'A hundred megabits in both directions keeps a full house of 4K streams, console downloads and video meetings running at once without anyone noticing the others.',
    featured: true,
    badgeText: 'Most popular',
    addonSlugs: ['mesh-wifi-extender', 'static-ip'],
    features: internetFeatures(100),
  },
  {
    name: 'Cyclone 150',
    slug: 'cyclone-150',
    kind: PlanKind.INTERNET,
    categorySlug: 'internet-standard',
    services: [ServiceType.INTERNET],
    speedMbps: 150,
    uploadMbps: 150,
    monthlyPrice: 11499,
    installationPrice: STANDARD_INSTALLATION,
    shortDescription: 'Symmetric 150 Mbps for large homes and home offices.',
    description:
      'Built for large households and small home offices where a dozen devices are active at the same time and latency matters as much as throughput.',
    addonSlugs: ['mesh-wifi-extender', 'static-ip'],
    features: internetFeatures(150),
  },
  {
    name: 'Maelstrom 275',
    slug: 'maelstrom-275',
    kind: PlanKind.INTERNET,
    categorySlug: 'internet-standard',
    services: [ServiceType.INTERNET],
    speedMbps: 275,
    uploadMbps: 275,
    monthlyPrice: 15999,
    installationPrice: STANDARD_INSTALLATION,
    shortDescription: 'Our fastest residential tier: symmetric 275 Mbps.',
    description:
      'The top of our residential range. Symmetric 275 Mbps for competitive gaming, 8K streaming, and households that simply do not want to think about bandwidth again.',
    badgeText: 'Fastest',
    addonSlugs: ['mesh-wifi-extender', 'static-ip'],
    features: internetFeatures(275),
  },

  /* ------------------------------ double play ------------------------------ */
  {
    name: 'Gale 30 Duo',
    slug: 'gale-30-duo',
    kind: PlanKind.DOUBLE_PLAY,
    categorySlug: 'double-play-standard',
    services: [ServiceType.INTERNET, ServiceType.PHONE],
    speedMbps: 30,
    uploadMbps: 30,
    voiceMinutes: 200,
    monthlyPrice: 4499,
    installationPrice: STANDARD_INSTALLATION,
    shortDescription: '30 Mbps fibre plus a landline with 200 free minutes.',
    description:
      'Internet and voice arrive on the same fibre, so the landline keeps working through a mobile-network outage and there is only one bill to pay.',
    addonSlugs: ['voice-bundle-500', 'mesh-wifi-extender'],
    features: [...internetFeatures(30), ...voiceFeatures],
  },
  {
    name: 'Squall 50 Duo',
    slug: 'squall-50-duo',
    kind: PlanKind.DOUBLE_PLAY,
    categorySlug: 'double-play-standard',
    services: [ServiceType.INTERNET, ServiceType.PHONE],
    speedMbps: 50,
    uploadMbps: 50,
    voiceMinutes: 300,
    monthlyPrice: 5999,
    installationPrice: STANDARD_INSTALLATION,
    shortDescription: '50 Mbps fibre plus a landline with 300 free minutes.',
    description:
      'The most common Double Play choice: enough speed for a working household, with a clear, always-on landline included.',
    featured: true,
    addonSlugs: ['voice-bundle-500', 'mesh-wifi-extender'],
    features: [...internetFeatures(50), ...voiceFeatures],
  },
  {
    name: 'Tempest 100 Duo',
    slug: 'tempest-100-duo',
    kind: PlanKind.DOUBLE_PLAY,
    categorySlug: 'double-play-standard',
    services: [ServiceType.INTERNET, ServiceType.PHONE],
    speedMbps: 100,
    uploadMbps: 100,
    voiceMinutes: 500,
    monthlyPrice: 8999,
    installationPrice: STANDARD_INSTALLATION,
    shortDescription: '100 Mbps fibre plus a landline with 500 free minutes.',
    description:
      'For homes that need serious bandwidth and still want a reliable landline for family and business calls.',
    addonSlugs: ['voice-bundle-500', 'mesh-wifi-extender', 'static-ip'],
    features: [...internetFeatures(100), ...voiceFeatures],
  },
  {
    name: 'Switcher 50 Duo',
    slug: 'switcher-50-duo',
    kind: PlanKind.DOUBLE_PLAY,
    categorySlug: 'double-play-promos',
    services: [ServiceType.INTERNET, ServiceType.PHONE],
    speedMbps: 50,
    uploadMbps: 50,
    voiceMinutes: 300,
    monthlyPrice: 5999,
    installationPrice: STANDARD_INSTALLATION,
    promotionSlug: 'switch-and-save',
    shortDescription: 'Our 50 Mbps Double Play with Rs 1,000 off for six months.',
    description:
      'Exactly the same service as Squall 50 Duo, with a switching credit applied to each of your first six invoices.',
    badgeText: 'Switcher offer',
    addonSlugs: ['voice-bundle-500'],
    features: [...internetFeatures(50), ...voiceFeatures],
  },

  /* ------------------------------ triple play ------------------------------ */
  {
    name: 'Gale 30 Trio',
    slug: 'gale-30-trio',
    kind: PlanKind.TRIPLE_PLAY,
    categorySlug: 'triple-play-standard',
    services: [ServiceType.INTERNET, ServiceType.TV, ServiceType.PHONE],
    speedMbps: 30,
    uploadMbps: 30,
    tvChannels: 120,
    voiceMinutes: 200,
    monthlyPrice: 5299,
    installationPrice: STANDARD_INSTALLATION,
    shortDescription: '30 Mbps, 120+ HD channels and a landline on one fibre.',
    description:
      'Everything a household needs on a single line and a single bill: fibre internet, high-definition television and a clear landline.',
    addonSlugs: ['additional-hd-box', 'sports-pack', 'voice-bundle-500', 'additional-tv-point'],
    features: [...internetFeatures(30), ...tvFeatures, ...voiceFeatures],
  },
  {
    name: 'Squall 50 Trio',
    slug: 'squall-50-trio',
    kind: PlanKind.TRIPLE_PLAY,
    categorySlug: 'triple-play-standard',
    services: [ServiceType.INTERNET, ServiceType.TV, ServiceType.PHONE],
    speedMbps: 50,
    uploadMbps: 50,
    tvChannels: 140,
    voiceMinutes: 300,
    monthlyPrice: 6999,
    installationPrice: STANDARD_INSTALLATION,
    shortDescription: '50 Mbps, 140+ HD channels and a landline with 300 minutes.',
    description:
      'Our best-selling Triple Play. Enough bandwidth for the whole family, a full HD channel line-up and voice included.',
    featured: true,
    badgeText: 'Best value',
    addonSlugs: ['additional-hd-box', 'sports-pack', 'voice-bundle-500', 'additional-tv-point'],
    features: [...internetFeatures(50), ...tvFeatures, ...voiceFeatures],
  },
  {
    name: 'Tempest 100 Trio',
    slug: 'tempest-100-trio',
    kind: PlanKind.TRIPLE_PLAY,
    categorySlug: 'triple-play-standard',
    services: [ServiceType.INTERNET, ServiceType.TV, ServiceType.PHONE],
    speedMbps: 100,
    uploadMbps: 100,
    tvChannels: 160,
    voiceMinutes: 500,
    monthlyPrice: 10499,
    installationPrice: STANDARD_INSTALLATION,
    shortDescription: '100 Mbps, 160+ HD channels and 500 voice minutes.',
    description:
      'A full-house bundle: symmetric gigabit-class fibre, the extended channel line-up and a landline with a generous minute allowance.',
    featured: true,
    addonSlugs: ['additional-hd-box', 'sports-pack', 'voice-bundle-500', 'additional-tv-point', 'static-ip'],
    features: [...internetFeatures(100), ...tvFeatures, ...voiceFeatures],
  },
  {
    name: 'Cyclone 150 Trio',
    slug: 'cyclone-150-trio',
    kind: PlanKind.TRIPLE_PLAY,
    categorySlug: 'triple-play-standard',
    services: [ServiceType.INTERNET, ServiceType.TV, ServiceType.PHONE],
    speedMbps: 150,
    uploadMbps: 150,
    tvChannels: 180,
    voiceMinutes: 750,
    monthlyPrice: 13999,
    installationPrice: STANDARD_INSTALLATION,
    shortDescription: '150 Mbps, 180+ HD channels and 750 voice minutes.',
    description:
      'For large homes: high symmetric throughput, the widest channel package and plenty of included calling.',
    addonSlugs: ['additional-hd-box', 'sports-pack', 'voice-bundle-500', 'additional-tv-point', 'static-ip'],
    features: [...internetFeatures(150), ...tvFeatures, ...voiceFeatures],
  },
  {
    name: 'Maelstrom 275 Trio',
    slug: 'maelstrom-275-trio',
    kind: PlanKind.TRIPLE_PLAY,
    categorySlug: 'triple-play-standard',
    services: [ServiceType.INTERNET, ServiceType.TV, ServiceType.PHONE],
    speedMbps: 275,
    uploadMbps: 275,
    tvChannels: 180,
    voiceMinutes: 1000,
    monthlyPrice: 18499,
    installationPrice: STANDARD_INSTALLATION,
    shortDescription: 'Our flagship: 275 Mbps, every channel, 1,000 voice minutes.',
    description:
      'The complete package at our fastest residential speed, with the full channel line-up and a thousand included minutes.',
    badgeText: 'Flagship',
    addonSlugs: ['additional-hd-box', 'sports-pack', 'voice-bundle-500', 'additional-tv-point', 'static-ip'],
    features: [...internetFeatures(275), ...tvFeatures, ...voiceFeatures],
  },
  {
    name: 'Monsoon 100 Trio',
    slug: 'monsoon-100-trio',
    kind: PlanKind.TRIPLE_PLAY,
    categorySlug: 'triple-play-promos',
    services: [ServiceType.INTERNET, ServiceType.TV, ServiceType.PHONE],
    speedMbps: 100,
    uploadMbps: 100,
    tvChannels: 160,
    voiceMinutes: 500,
    monthlyPrice: 10499,
    installationPrice: 0,
    promotionSlug: 'free-installation',
    shortDescription: '100 Mbps Triple Play with the installation charge waived.',
    description:
      'Our 100 Mbps Triple Play bundle with no one-time installation charge when you sign up for twelve months.',
    featured: true,
    badgeText: 'Free installation',
    addonSlugs: ['additional-hd-box', 'sports-pack'],
    features: [...internetFeatures(100), ...tvFeatures, ...voiceFeatures],
  },

  /* --------------------------- limited time offers -------------------------- */
  {
    name: 'Monsoon Surge 100',
    slug: 'monsoon-surge-100',
    kind: PlanKind.INTERNET,
    categorySlug: 'limited-time-offers',
    services: [ServiceType.INTERNET],
    speedMbps: 100,
    uploadMbps: 100,
    monthlyPrice: 8499,
    installationPrice: 4999,
    promotionSlug: 'monsoon-surge',
    shortDescription: '100 Mbps with 20% off for three months and reduced setup.',
    description:
      'A seasonal offer on our 100 Mbps tier: twenty percent off the monthly charge for the first three billing cycles and a reduced one-time installation charge.',
    featured: true,
    badgeText: 'Limited time',
    addonSlugs: ['mesh-wifi-extender'],
    features: internetFeatures(100),
  },
  {
    name: 'Monsoon Surge 50',
    slug: 'monsoon-surge-50',
    kind: PlanKind.INTERNET,
    categorySlug: 'limited-time-offers',
    services: [ServiceType.INTERNET],
    speedMbps: 50,
    uploadMbps: 50,
    monthlyPrice: 5499,
    installationPrice: 4999,
    promotionSlug: 'monsoon-surge',
    shortDescription: '50 Mbps with 20% off for three months and reduced setup.',
    description:
      'The same seasonal discount applied to our 50 Mbps symmetric tier, for households that do not need a hundred megabits.',
    badgeText: 'Limited time',
    addonSlugs: ['mesh-wifi-extender'],
    features: internetFeatures(50),
  },

  /* ----------------------------- single service ---------------------------- */
  {
    name: 'Vista HD',
    slug: 'vista-hd',
    kind: PlanKind.TV,
    categorySlug: 'tv',
    services: [ServiceType.TV],
    tvChannels: 140,
    monthlyPrice: 1499,
    installationPrice: 3500,
    shortDescription: '140+ high-definition channels with a programming guide.',
    description:
      'Stand-alone digital television over fibre. Instant channel changes, a seven-day programming guide and one remote for both your TV and the box.',
    addonSlugs: ['additional-hd-box', 'sports-pack', 'additional-tv-point'],
    features: tvFeatures,
  },
  {
    name: 'Clearline Voice',
    slug: 'clearline-voice',
    kind: PlanKind.PHONE,
    categorySlug: 'phone',
    services: [ServiceType.PHONE],
    voiceMinutes: 200,
    monthlyPrice: 799,
    installationPrice: 2500,
    shortDescription: 'A postpaid landline on fibre with 200 free minutes.',
    description:
      'A landline that does not depend on mobile coverage. Calls between StormFiber lines are free, and you pay monthly instead of topping up.',
    addonSlugs: ['voice-bundle-500'],
    features: voiceFeatures,
  },
];

export const seedProducts = [
  {
    name: 'Ultra-Fast Internet',
    slug: 'internet',
    serviceType: ServiceType.INTERNET,
    tagline: 'Symmetric fibre speeds up to 275 Mbps',
    heroHeadline: 'Ace the pace.',
    heroSubheadline: 'Speeds that hold up when the whole house is online.',
    description:
      'Our network is 100% fibre from the exchange to the socket in your wall — no copper in the last mile, no shared coaxial segment. That is why the upload speed matches the download speed and why the connection behaves the same at 9pm as it does at 9am.',
    iconKey: 'wifi',
    imageUrl: '/heroes/hero-internet.png',
    displayOrder: 1,
    seoTitle: 'Ultra-Fast Fibre Internet',
    seoDescription:
      'Symmetric fibre internet up to 275 Mbps with unlimited usage, a managed Wi-Fi router and 24/7 support.',
    features: [
      {
        title: 'Symmetric by design',
        description:
          'Upload matches download on every tier, because fibre does not force the compromise that copper and coaxial networks do.',
        iconKey: 'arrow-up-down',
      },
      {
        title: 'No volume cap',
        description:
          'Stream, back up and download without a data counter. A fair-usage policy applies in line with regulatory requirements.',
        iconKey: 'infinity',
      },
      {
        title: 'Latency that holds',
        description:
          'A dedicated fibre path to your home keeps ping times low and stable, which is what competitive gaming and video calls actually need.',
        iconKey: 'activity',
      },
      {
        title: 'Managed Wi-Fi',
        description:
          'The router is included, monitored and replaced under warranty. Add mesh nodes if your home needs more coverage.',
        iconKey: 'router',
      },
    ],
  },
  {
    name: 'HD TV',
    slug: 'tv',
    serviceType: ServiceType.TV,
    tagline: 'One box. Every channel in high definition.',
    heroHeadline: 'One box. Diverse features. Unlimited entertainment.',
    heroSubheadline: 'Your HD television deserves a genuine HD service.',
    description:
      'Digital television delivered over the same fibre as your internet, with a set-top box that changes channels instantly and a programming guide that actually stays up to date.',
    iconKey: 'tv',
    imageUrl: '/images/products/hdtv.png',
    displayOrder: 2,
    seoTitle: 'HD Television over Fibre',
    seoDescription:
      'Over 180 high-definition channels with an electronic programming guide, fast channel change and a learning remote.',
    features: [
      {
        title: 'Electronic programming guide',
        description:
          'Seven days of listings, browsable by category, so you can see what is on without cycling through channels.',
        iconKey: 'calendar',
      },
      {
        title: 'Fast channel change',
        description:
          'Channels switch as quickly as you can press the button — no multi-second buffering pause between them.',
        iconKey: 'zap',
      },
      {
        title: 'Learning remote',
        description:
          'One remote controls both the set-top box and the main functions of your television.',
        iconKey: 'remote',
      },
      {
        title: 'Conditional access',
        description:
          'Channel packages and parental restrictions are managed centrally and applied to your box securely.',
        iconKey: 'shield',
      },
    ],
  },
  {
    name: 'Crystal Clear Voice',
    slug: 'phone',
    serviceType: ServiceType.PHONE,
    tagline: 'A landline that works when the mobile network does not',
    heroHeadline: 'Voice so clear, it is music to your ears.',
    heroSubheadline: 'Voice clarity redefined by 100% fibre.',
    description:
      'A postpaid landline carried over fibre. Because it does not depend on mobile coverage, it keeps working when the cellular network is congested or down.',
    iconKey: 'phone',
    imageUrl: '/heroes/hero-voice.png',
    displayOrder: 3,
    seoTitle: 'Crystal Clear Voice — Home Phone on Fibre',
    seoDescription:
      'A clear, reliable postpaid landline on fibre, with free calls between StormFiber lines and no top-ups.',
    features: [
      {
        title: 'No mobile signal, no problem',
        description:
          'Your landline runs on our fibre, so it stays available through mobile network congestion and outages.',
        iconKey: 'signal',
      },
      {
        title: 'No distortion',
        description:
          'Fibre carries the call end to end, which removes the buzz and dropouts that copper lines are prone to.',
        iconKey: 'audio-lines',
      },
      {
        title: 'Use now, pay later',
        description: 'Postpaid billing on the same invoice as your internet. No cards to top up.',
        iconKey: 'receipt',
      },
      {
        title: 'Free on-net calls',
        description: 'Calls between any two StormFiber voice lines are free, with no minute limit.',
        iconKey: 'phone-call',
      },
    ],
  },
  {
    name: 'Home Mesh Wi-Fi',
    slug: 'home-mesh-wifi',
    serviceType: ServiceType.INTERNET,
    tagline: 'Whole-home coverage on the same Majawar X drop',
    heroHeadline: 'Dead zones, gone.',
    heroSubheadline: 'Mesh nodes that follow the fibre into every floor.',
    description:
      'Add managed mesh nodes so upstairs rooms, courtyards and back offices stay on the same Majawar X line without a second broadband account.',
    iconKey: 'router',
    imageUrl: '/images/products/mesh-wifi.png',
    displayOrder: 4,
    seoTitle: 'Home Mesh Wi-Fi',
    seoDescription: 'Whole-home mesh coverage on a Majawar X fibre line.',
    features: [
      { title: 'One network name', description: 'Phones roam between nodes without dropping the call or the stream.', iconKey: 'wifi' },
      { title: 'Installed with the drop', description: 'Nodes are placed during installation or on a follow-up visit.', iconKey: 'home' },
      { title: 'Replaced under warranty', description: 'A failed node is swapped, not billed as a new device.', iconKey: 'shield' },
    ],
  },
  {
    name: 'Night Watch Cameras',
    slug: 'night-watch-cameras',
    serviceType: ServiceType.INTERNET,
    tagline: 'Keep an eye on the gate on a line that stays up',
    heroHeadline: 'The gate, from the sofa.',
    heroSubheadline: 'Cameras that ride the same fibre as the household internet.',
    description:
      'A small camera pack for the gate and driveway, recorded locally and viewable on the Majawar X app — useful when the mobile network is busy.',
    iconKey: 'camera',
    imageUrl: '/heroes/hero-cameras.png',
    displayOrder: 5,
    seoTitle: 'Night Watch Cameras',
    seoDescription: 'Home cameras on a Majawar X fibre line.',
    features: [
      { title: 'Local recording', description: 'Clips stay on a box in the house, not only in a foreign cloud.', iconKey: 'hard-drive' },
      { title: 'Night picture', description: 'Infrared on the gate camera so the number plate is still readable.', iconKey: 'moon' },
      { title: 'Same bill', description: 'Camera rental appears as a line on the monthly fibre invoice.', iconKey: 'receipt' },
    ],
  },
  {
    name: 'Weekend Sports Pack',
    slug: 'weekend-sports-pack',
    serviceType: ServiceType.TV,
    tagline: 'Match days without buffering the living room',
    heroHeadline: 'The match, in the house.',
    heroSubheadline: 'Sports channels on the same fibre as your broadband.',
    description:
      'A television add-on for households that want the weekend fixtures in HD without opening a second streaming subscription.',
    iconKey: 'sports',
    imageUrl: '/tv-bundle.png',
    displayOrder: 6,
    seoTitle: 'Weekend Sports Pack',
    seoDescription: 'HD sports channels on Majawar X television.',
    features: [
      { title: 'HD fixtures', description: 'Main cricket and football channels delivered over the fibre set-top box.', iconKey: 'tv' },
      { title: 'Guide that stays current', description: 'Kick-off times appear in the on-screen programme guide.', iconKey: 'calendar' },
      { title: 'No extra dish', description: 'The pack rides the existing fibre drop and decoder.', iconKey: 'wifi' },
    ],
  },
  {
    name: 'Study Line',
    slug: 'study-line',
    serviceType: ServiceType.INTERNET,
    tagline: 'A quieter lane for classes and homework',
    heroHeadline: 'Classes first.',
    heroSubheadline: 'A profile that keeps video lessons ahead of evening downloads.',
    description:
      'A household profile that reserves a slice of the Majawar X line for school portals and video classes during the afternoon.',
    iconKey: 'book',
    imageUrl: '/heroes/hero-study.png',
    displayOrder: 7,
    seoTitle: 'Study Line',
    seoDescription: 'A Majawar X profile that keeps homework and classes moving.',
    features: [
      { title: 'Afternoon priority', description: 'Class traffic is preferred between 1pm and 6pm on school days.', iconKey: 'clock' },
      { title: 'Same socket', description: 'No second router — it is a profile on the existing fibre gateway.', iconKey: 'router' },
      { title: 'Parent view', description: 'A simple usage summary on the customer portal after you sign in.', iconKey: 'bar-chart' },
    ],
  },
];

/** Tax rules. Rates reflect the kind of telecom taxation an operator in Pakistan applies. */
export const seedTaxRules = [
  {
    code: 'GST_TELECOM',
    label: 'Sales tax on telecommunication services',
    kind: 'PERCENTAGE' as const,
    rate: 19.5,
    appliesTo: ['SUBSCRIPTION', 'ADDON', 'INSTALLATION'] as const,
  },
  {
    code: 'AIT',
    label: 'Advance income tax',
    kind: 'PERCENTAGE' as const,
    rate: 15,
    appliesTo: ['SUBSCRIPTION'] as const,
  },
];

/**
 * Cities where the capital-territory rate differs from the provincial rate. The pricing engine
 * reads the override rather than hard-coding any city.
 */
export const seedCityTaxOverrides: { citySlug: string; taxCode: string; rate: number }[] = [];

/** Percentage adjustment applied to the national list price to derive city pricing. */
export const seedCityPriceAdjustments: { citySlug: string; adjustmentPercent: number }[] = [
  { citySlug: 'lahore', adjustmentPercent: 0 },
];
