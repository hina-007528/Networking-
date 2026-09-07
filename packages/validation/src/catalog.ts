import { z } from 'zod';
import { planKindSchema, publishStatusSchema, serviceTypeSchema } from './common';
import { moneySchema, percentageSchema, slugSchema, uuidSchema } from './primitives';

export const planFilterSchema = z.object({
  city: z.string().trim().toLowerCase().max(80).optional(),
  service: serviceTypeSchema.optional(),
  category: slugSchema.optional(),
  kind: planKindSchema.optional(),
  minSpeed: z.coerce.number().int().min(0).max(10_000).optional(),
  maxSpeed: z.coerce.number().int().min(0).max(10_000).optional(),
  minPrice: z.coerce.number().min(0).max(1_000_000).optional(),
  maxPrice: z.coerce.number().min(0).max(1_000_000).optional(),
  featured: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((value) => value === true || value === 'true')
    .optional(),
  promotion: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((value) => value === true || value === 'true')
    .optional(),
  search: z.string().trim().max(80).optional(),
  sort: z.enum(['price', 'speed', 'name', 'order']).default('order'),
  order: z.enum(['asc', 'desc']).default('asc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(60).default(24),
});

/** Optional city scope on a plan or product detail request. */
export const cityScopeQuerySchema = z.object({
  city: slugSchema.optional(),
});

export const addonScopeQuerySchema = z.object({
  plan: slugSchema.optional(),
});

export const priceQuoteSchema = z.object({
  planId: uuidSchema,
  cityId: uuidSchema,
  addonIds: z.array(uuidSchema).max(20).default([]),
  promotionCode: z.string().trim().max(40).optional(),
  includeInstallation: z.boolean().default(true),
});

export const planCompareSchema = z.object({
  planIds: z.preprocess((value) => {
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);
    }
    return value;
  }, z.array(uuidSchema).min(2, 'Select at least two plans').max(4, 'Compare up to 4 plans')),
  cityId: uuidSchema.optional(),
});

/* --------------------------------- admin write --------------------------------- */

export const upsertPlanCategorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: slugSchema,
  kind: planKindSchema,
  description: z.string().trim().max(500).optional(),
  displayOrder: z.coerce.number().int().min(0).default(0),
});

export const planFeatureInputSchema = z.object({
  label: z.string().trim().min(2).max(120),
  value: z.string().trim().max(120).optional(),
  iconKey: z.string().trim().max(60).optional(),
  highlighted: z.boolean().default(false),
  displayOrder: z.coerce.number().int().min(0).default(0),
});

export const upsertPlanSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: slugSchema,
  description: z.string().trim().min(10).max(2000),
  shortDescription: z.string().trim().max(240).optional(),
  kind: planKindSchema,
  categoryId: uuidSchema.optional(),
  services: z.array(serviceTypeSchema).min(1, 'Select at least one service'),
  speedMbps: z.coerce.number().int().min(1).max(10_000).optional(),
  uploadMbps: z.coerce.number().int().min(1).max(10_000).optional(),
  tvChannels: z.coerce.number().int().min(0).max(2000).optional(),
  voiceMinutes: z.coerce.number().int().min(0).max(100_000).optional(),
  monthlyPrice: moneySchema,
  installationPrice: moneySchema.default(0),
  currency: z.string().trim().length(3).default('PKR'),
  status: publishStatusSchema.default('DRAFT'),
  featured: z.boolean().default(false),
  displayOrder: z.coerce.number().int().min(0).default(0),
  badgeText: z.string().trim().max(40).optional(),
  promotionId: uuidSchema.optional(),
  features: z.array(planFeatureInputSchema).max(30).default([]),
  addonIds: z.array(uuidSchema).max(30).default([]),
  cityIds: z.array(uuidSchema).max(60).default([]),
  seoTitle: z.string().trim().max(70).optional(),
  seoDescription: z.string().trim().max(180).optional(),
  metadata: z.record(z.unknown()).default({}),
  publishedAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
});

export const upsertPlanPriceSchema = z.object({
  planId: uuidSchema,
  cityId: uuidSchema,
  monthlyPrice: moneySchema,
  installationPrice: moneySchema.default(0),
  currency: z.string().trim().length(3).default('PKR'),
  isActive: z.boolean().default(true),
});

export const upsertPlanAddonSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: slugSchema,
  description: z.string().trim().max(500).optional(),
  serviceType: serviceTypeSchema,
  monthlyPrice: moneySchema.default(0),
  oneTimePrice: moneySchema.default(0),
  currency: z.string().trim().length(3).default('PKR'),
  isActive: z.boolean().default(true),
  displayOrder: z.coerce.number().int().min(0).default(0),
});

export const upsertPromotionSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    slug: slugSchema,
    description: z.string().trim().max(1000).optional(),
    discountKind: z.enum(['PERCENTAGE', 'FIXED']),
    discountValue: z.coerce.number().min(0).max(1_000_000),
    durationMonths: z.coerce.number().int().min(1).max(60).optional(),
    badgeText: z.string().trim().max(40).optional(),
    code: z.string().trim().max(40).optional(),
    status: publishStatusSchema.default('DRAFT'),
    startsAt: z.coerce.date().optional(),
    endsAt: z.coerce.date().optional(),
    imageUrl: z.string().trim().max(500).optional(),
  })
  .refine(
    (value) => value.discountKind !== 'PERCENTAGE' || value.discountValue <= 100,
    { message: 'A percentage discount cannot exceed 100', path: ['discountValue'] },
  )
  .refine((value) => !value.startsAt || !value.endsAt || value.startsAt < value.endsAt, {
    message: 'The end date must be after the start date',
    path: ['endsAt'],
  });

export const upsertTaxRuleSchema = z.object({
  code: z.string().trim().min(2).max(30),
  label: z.string().trim().min(2).max(80),
  kind: z.enum(['PERCENTAGE', 'FIXED']),
  rate: percentageSchema,
  fixedAmount: moneySchema.default(0),
  appliesTo: z.array(z.enum(['SUBSCRIPTION', 'ADDON', 'INSTALLATION'])).min(1),
  isActive: z.boolean().default(true),
  effectiveFrom: z.coerce.date().optional(),
  effectiveTo: z.coerce.date().optional(),
});

export const upsertCityTaxRuleSchema = z.object({
  cityId: uuidSchema,
  taxRuleId: uuidSchema,
  /** Overrides the base rate for this city when provided. */
  rateOverride: percentageSchema.optional(),
  isActive: z.boolean().default(true),
});

export const upsertProductFeatureSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().min(4).max(500),
  iconKey: z.string().trim().max(60).optional(),
  imageUrl: z.string().trim().max(600).optional(),
  displayOrder: z.coerce.number().int().min(0).default(0),
});

export const upsertProductSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: slugSchema,
  serviceType: serviceTypeSchema,
  categoryId: uuidSchema.optional(),
  tagline: z.string().trim().min(4).max(160),
  description: z.string().trim().min(10).max(4000),
  heroHeadline: z.string().trim().min(4).max(160),
  heroSubheadline: z.string().trim().max(240).optional(),
  imageUrl: z.string().trim().max(600).optional(),
  iconKey: z.string().trim().max(60).optional(),
  status: publishStatusSchema.default('DRAFT'),
  displayOrder: z.coerce.number().int().min(0).default(0),
  seoTitle: z.string().trim().max(70).optional(),
  seoDescription: z.string().trim().max(180).optional(),
  features: z.array(upsertProductFeatureSchema).max(20).default([]),
});

export type PlanFilterInput = z.input<typeof planFilterSchema>;
export type PriceQuoteInput = z.input<typeof priceQuoteSchema>;
export type UpsertPlanInput = z.input<typeof upsertPlanSchema>;
export type UpsertPromotionInput = z.input<typeof upsertPromotionSchema>;
export type UpsertProductInput = z.input<typeof upsertProductSchema>;
