import type { Prisma } from '@prisma/client';
import type {
  PlanAddonDto,
  PlanCategoryDto,
  PlanDto,
  PlanFeatureDto,
  PromotionDto,
} from '@stormfiber/types';
import { toNumber } from '../../common/utils/money';

/**
 * The single Prisma selection used everywhere a plan is serialised.
 *
 * Keeping it in one constant is what prevents an N+1 query creeping in: any call site that maps a
 * plan is forced to have fetched exactly these relations.
 */
export const planInclude = {
  category: true,
  promotion: true,
  features: { orderBy: [{ displayOrder: 'asc' }, { label: 'asc' }] },
  addons: {
    where: { addon: { isActive: true, deletedAt: null } },
    include: { addon: true },
  },
  prices: { where: { isActive: true }, include: { city: { select: { id: true, slug: true } } } },
} satisfies Prisma.PlanInclude;

export type PlanWithRelations = Prisma.PlanGetPayload<{ include: typeof planInclude }>;

export function toPlanFeatureDto(row: Prisma.PlanFeatureGetPayload<object>): PlanFeatureDto {
  return {
    id: row.id,
    label: row.label,
    value: row.value,
    iconKey: row.iconKey,
    highlighted: row.highlighted,
    displayOrder: row.displayOrder,
  };
}

export function toPlanAddonDto(row: Prisma.PlanAddonGetPayload<object>): PlanAddonDto {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    serviceType: row.serviceType,
    monthlyPrice: toNumber(row.monthlyPrice),
    oneTimePrice: toNumber(row.oneTimePrice),
    currency: row.currency,
    isActive: row.isActive,
    displayOrder: row.displayOrder,
  };
}

export function toPlanCategoryDto(
  row: Prisma.PlanCategoryGetPayload<object>,
  planCount?: number,
): PlanCategoryDto {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    kind: row.kind,
    description: row.description,
    displayOrder: row.displayOrder,
    ...(planCount === undefined ? {} : { planCount }),
  };
}

export function toPromotionDto(row: Prisma.PromotionGetPayload<object>): PromotionDto {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    discountKind: row.discountKind,
    discountValue: toNumber(row.discountValue),
    durationMonths: row.durationMonths,
    badgeText: row.badgeText,
    status: row.status,
    startsAt: row.startsAt?.toISOString() ?? null,
    endsAt: row.endsAt?.toISOString() ?? null,
    imageUrl: row.imageUrl,
  };
}

/**
 * Serialises a plan, resolving its price for one city when a city was requested.
 *
 * When no city is given the plan's default nationwide price is used. The DTO therefore always
 * carries a single unambiguous price, which is what stops a card from having to pick between
 * several `prices` rows in the browser.
 */
export function toPlanDto(plan: PlanWithRelations, citySlug: string | null): PlanDto {
  const cityPrice = citySlug
    ? plan.prices.find((price) => price.city.slug === citySlug)
    : undefined;

  const promotionIsLive = plan.promotion !== null && isPromotionLive(plan.promotion);

  return {
    id: plan.id,
    name: plan.name,
    slug: plan.slug,
    description: plan.description,
    shortDescription: plan.shortDescription,
    kind: plan.kind,
    services: plan.services,
    speedMbps: plan.speedMbps,
    uploadMbps: plan.uploadMbps,
    tvChannels: plan.tvChannels,
    voiceMinutes: plan.voiceMinutes,
    category: plan.category ? toPlanCategoryDto(plan.category) : null,
    monthlyPrice: toNumber(cityPrice?.monthlyPrice ?? plan.monthlyPrice),
    installationPrice: toNumber(cityPrice?.installationPrice ?? plan.installationPrice),
    currency: cityPrice?.currency ?? plan.currency,
    status: plan.status,
    featured: plan.featured,
    displayOrder: plan.displayOrder,
    badgeText: plan.badgeText,
    features: plan.features.map(toPlanFeatureDto),
    addons: plan.addons.map((link) => toPlanAddonDto(link.addon)),
    promotion: promotionIsLive && plan.promotion ? toPromotionDto(plan.promotion) : null,
    metadata: (plan.metadata ?? {}) as Record<string, unknown>,
    cityId: cityPrice?.city.id ?? null,
    citySlug: cityPrice ? citySlug : null,
    seoTitle: plan.seoTitle,
    seoDescription: plan.seoDescription,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };
}

/** A promotion is only advertised while it is published and inside its window. */
export function isPromotionLive(
  promotion: Pick<Prisma.PromotionGetPayload<object>, 'status' | 'startsAt' | 'endsAt'>,
  now = new Date(),
): boolean {
  if (promotion.status !== 'PUBLISHED') return false;
  if (promotion.startsAt && promotion.startsAt > now) return false;
  if (promotion.endsAt && promotion.endsAt < now) return false;
  return true;
}
