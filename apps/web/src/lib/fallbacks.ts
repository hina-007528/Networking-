import type { AreaDto, CityDto, PlanDto, PlanFeatureDto } from '@stormfiber/types';

export function fallbackCity(
  id: string,
  name: string,
  slug: string,
  code: string,
  dialCode: string,
  displayOrder: number,
): CityDto {
  return {
    id,
    name,
    slug,
    code,
    dialCode,
    province: 'Sindh',
    isActive: true,
    isLive: true,
    latitude: null,
    longitude: null,
    areaCount: 0,
    supportPhone: '',
    branchAddress: null,
    mapUrl: null,
    displayOrder,
  };
}

export const FALLBACK_CITIES: CityDto[] = [
  fallbackCity('c-1', 'Karachi', 'karachi', 'KHI', '021', 1),
  fallbackCity('c-2', 'Lahore', 'lahore', 'LHE', '042', 2),
  fallbackCity('c-3', 'Islamabad', 'islamabad', 'ISB', '051', 3),
  fallbackCity('c-4', 'Rawalpindi', 'rawalpindi', 'RWP', '051', 4),
  fallbackCity('c-5', 'Faisalabad', 'faisalabad', 'FSD', '041', 5),
  fallbackCity('c-6', 'Multan', 'multan', 'MUX', '061', 6),
  fallbackCity('c-7', 'Peshawar', 'peshawar', 'PEW', '091', 7),
  fallbackCity('c-8', 'Quetta', 'quetta', 'UET', '081', 8),
];

export function fallbackArea(id: string, cityId: string, name: string, slug: string): AreaDto {
  return {
    id,
    cityId,
    name,
    slug,
    coverageStatus: 'AVAILABLE',
    expectedLiveDate: null,
    isActive: true,
    subAreaCount: 0,
  };
}

function feature(id: string, label: string, displayOrder: number): PlanFeatureDto {
  return { id, label, value: null, iconKey: null, highlighted: false, displayOrder };
}

export function fallbackPlan(
  id: string,
  name: string,
  slug: string,
  speedMbps: number,
  monthlyPrice: number,
  featured: boolean,
  labels: string[],
): PlanDto {
  const now = new Date().toISOString();
  return {
    id,
    name,
    slug,
    description: name,
    shortDescription: name,
    kind: 'TRIPLE_PLAY',
    services: ['INTERNET', 'TV', 'PHONE'],
    speedMbps,
    uploadMbps: speedMbps,
    tvChannels: 200,
    voiceMinutes: null,
    category: {
      id: 'cat-triple',
      name: 'Triple Play',
      slug: 'triple-play',
      kind: 'TRIPLE_PLAY',
      description: null,
      displayOrder: 0,
    },
    monthlyPrice,
    installationPrice: 4000,
    currency: 'PKR',
    status: 'PUBLISHED',
    featured,
    displayOrder: 0,
    badgeText: featured ? 'Popular' : null,
    features: labels.map((label, index) => feature(`${id}-f-${index}`, label, index)),
    addons: [],
    promotion: null,
    metadata: {},
    cityId: null,
    citySlug: null,
    seoTitle: null,
    seoDescription: null,
    createdAt: now,
    updatedAt: now,
  };
}

export const FALLBACK_PLANS: PlanDto[] = [
  fallbackPlan('plan-1', 'Cyclone 30 Mbps', 'cyclone-30-mbps', 30, 2999, false, [
    'Symmetric 30 Mbps Upload & Download',
    'Unlimited Data Allowance',
    '200+ Digital HD TV Channels',
    'Free On-Net Landline Calls',
  ]),
  fallbackPlan('plan-2', 'Tornado 50 Mbps', 'tornado-50-mbps', 50, 3999, true, [
    'Symmetric 50 Mbps Upload & Download',
    'Triple Play: Internet + TV + Phone',
    'Zero Latency Gaming Optimization',
    'Free Wi-Fi Optical Router Included',
    '24/7 Priority Support Helpline',
  ]),
  fallbackPlan('plan-3', 'Typhoon 100 Mbps', 'typhoon-100-mbps', 100, 5499, false, [
    'Symmetric 100 Mbps Ultra Broadband',
    'Full HD TV Channels Package',
    'Unlimited Free Landline Minutes',
    'Static IP Address Available',
  ]),
];
