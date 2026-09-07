import type { DiscountKind, PlanKind, PublishStatus, ServiceType } from '../enums';

export interface ProductDto {
  id: string;
  name: string;
  slug: string;
  serviceType: ServiceType;
  tagline: string;
  description: string;
  heroHeadline: string;
  heroSubheadline: string | null;
  imageUrl: string | null;
  iconKey: string | null;
  features: ProductFeatureDto[];
  displayOrder: number;
  seoTitle: string | null;
  seoDescription: string | null;
  status?: PublishStatus;
}

export interface ProductFeatureDto {
  id: string;
  title: string;
  description: string;
  iconKey: string | null;
  imageUrl: string | null;
  displayOrder: number;
}

export interface PlanCategoryDto {
  id: string;
  name: string;
  slug: string;
  kind: PlanKind;
  description: string | null;
  displayOrder: number;
  planCount?: number;
}

export interface PlanFeatureDto {
  id: string;
  label: string;
  value: string | null;
  iconKey: string | null;
  highlighted: boolean;
  displayOrder: number;
}

export interface PlanAddonDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  serviceType: ServiceType;
  monthlyPrice: number;
  oneTimePrice: number;
  currency: string;
  isActive: boolean;
  displayOrder: number;
}

export interface PromotionDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  discountKind: DiscountKind;
  discountValue: number;
  /** Number of billing cycles the promotion applies to. `null` means indefinite. */
  durationMonths: number | null;
  badgeText: string | null;
  status: PublishStatus;
  startsAt: string | null;
  endsAt: string | null;
  imageUrl: string | null;
}

/** A plan as rendered on the public site, already resolved for one city. */
export interface PlanDto {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string | null;
  kind: PlanKind;
  services: ServiceType[];
  speedMbps: number | null;
  uploadMbps: number | null;
  tvChannels: number | null;
  voiceMinutes: number | null;
  category: PlanCategoryDto | null;
  monthlyPrice: number;
  installationPrice: number;
  currency: string;
  status: PublishStatus;
  featured: boolean;
  displayOrder: number;
  badgeText: string | null;
  features: PlanFeatureDto[];
  addons: PlanAddonDto[];
  promotion: PromotionDto | null;
  metadata: Record<string, unknown>;
  /** City this pricing was resolved for, when the request was city-scoped. */
  cityId: string | null;
  citySlug: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: string;
  updatedAt: string;
}

/** An offer landing page: the promotion plus the published plans it applies to. */
export interface OfferDetailDto extends PromotionDto {
  plans: PlanDto[];
}

export interface PlanFilterQuery {
  city?: string;
  service?: ServiceType;
  category?: string;
  kind?: PlanKind;
  minSpeed?: number;
  maxSpeed?: number;
  minPrice?: number;
  maxPrice?: number;
  featured?: boolean;
  promotion?: boolean;
  search?: string;
  sort?: 'price' | 'speed' | 'name' | 'order';
  order?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface PriceBreakdownLine {
  label: string;
  code: string;
  amount: number;
  /** Negative amounts are reductions (discounts). */
  kind: 'BASE' | 'ADDON' | 'DISCOUNT' | 'TAX' | 'INSTALLATION';
  meta?: Record<string, unknown>;
}

/**
 * The authoritative, server-computed price. The browser never calculates any of these numbers;
 * it only renders what the API returns.
 */
export interface PriceQuoteDto {
  planId: string;
  planName: string;
  cityId: string;
  cityName: string;
  currency: string;
  basePrice: number;
  addonsTotal: number;
  discountTotal: number;
  taxableAmount: number;
  taxTotal: number;
  installationPrice: number;
  monthlyTotal: number;
  dueNowTotal: number;
  lines: PriceBreakdownLine[];
  appliedPromotion: Pick<PromotionDto, 'id' | 'name' | 'discountKind' | 'discountValue'> | null;
  appliedTaxes: { code: string; label: string; rate: number; amount: number }[];
  quotedAt: string;
}

export interface PriceQuoteRequest {
  planId: string;
  cityId: string;
  addonIds?: string[];
  promotionCode?: string;
  includeInstallation?: boolean;
}

export interface PlanPriceDto {
  id: string;
  planId: string;
  cityId: string;
  cityName: string;
  citySlug: string;
  monthlyPrice: number;
  installationPrice: number;
  currency: string;
  isActive: boolean;
}

export interface TaxRuleDto {
  id: string;
  code: string;
  label: string;
  kind: 'PERCENTAGE' | 'FIXED';
  rate: number;
  fixedAmount: number;
  appliesTo: Array<'SUBSCRIPTION' | 'ADDON' | 'INSTALLATION'>;
  isActive: boolean;
  effectiveFrom: string | null;
  effectiveTo: string | null;
}
