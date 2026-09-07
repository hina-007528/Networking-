import { z } from 'zod';
import { paginationQuerySchema, publishStatusSchema } from './common';
import { booleanQuerySchema, emailSchema, slugSchema, uuidSchema } from './primitives';

const optionalUrl = z
  .string()
  .trim()
  .max(600)
  .refine((value) => value === '' || /^(https?:\/\/|\/)/.test(value), {
    message: 'Enter an absolute URL or a path beginning with /',
  })
  .optional()
  .or(z.literal('').transform(() => undefined));

export const upsertHeroSlideSchema = z.object({
  eyebrow: z.string().trim().max(60).optional(),
  headline: z.string().trim().min(4, 'Add a headline').max(120),
  headlineAccent: z.string().trim().max(60).optional(),
  subheadline: z.string().trim().max(240).optional(),
  desktopImageUrl: optionalUrl,
  mobileImageUrl: optionalUrl,
  videoUrl: optionalUrl,
  imageAlt: z.string().trim().min(3, 'Alt text is required for accessibility').max(160),
  primaryCtaLabel: z.string().trim().max(40).optional(),
  primaryCtaHref: optionalUrl,
  secondaryCtaLabel: z.string().trim().max(40).optional(),
  secondaryCtaHref: optionalUrl,
  theme: z.enum(['DARK', 'LIGHT']).default('DARK'),
  status: publishStatusSchema.default('DRAFT'),
  displayOrder: z.coerce.number().int().min(0).default(0),
  publishedAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date().optional(),
});

export const cmsSectionKindSchema = z.enum([
  'HERO',
  'PRODUCT_TRIO',
  'BENEFITS',
  'FEATURED_PLANS',
  'PROMOTIONS',
  'COVERAGE',
  'FAQ',
  'CTA',
  'RICH_TEXT',
  'FEATURE_GRID',
  'PAYMENT_METHODS',
]);

export const upsertCmsSectionSchema = z.object({
  key: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:[-.][a-z0-9]+)*$/, 'Use lowercase words separated by - or .'),
  kind: cmsSectionKindSchema,
  eyebrow: z.string().trim().max(60).optional(),
  heading: z.string().trim().max(160).optional(),
  headingAccent: z.string().trim().max(60).optional(),
  subheading: z.string().trim().max(400).optional(),
  body: z.string().trim().max(20_000).optional(),
  ctaLabel: z.string().trim().max(40).optional(),
  ctaHref: optionalUrl,
  imageUrl: optionalUrl,
  content: z.record(z.unknown()).default({}),
  status: publishStatusSchema.default('DRAFT'),
  displayOrder: z.coerce.number().int().min(0).default(0),
  pageId: uuidSchema.optional(),
});

export const upsertCmsPageSchema = z.object({
  slug: slugSchema,
  title: z.string().trim().min(3).max(160),
  excerpt: z.string().trim().max(300).optional(),
  body: z.string().trim().max(200_000).optional(),
  status: publishStatusSchema.default('DRAFT'),
  seoTitle: z.string().trim().max(70).optional(),
  seoDescription: z.string().trim().max(180).optional(),
  ogImageUrl: optionalUrl,
  noIndex: z.boolean().default(false),
  publishedAt: z.coerce.date().optional(),
});

export const upsertCitySchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: slugSchema,
  code: z.string().trim().min(2).max(10).toUpperCase(),
  dialCode: z
    .string()
    .trim()
    .regex(/^0\d{2,4}$/, 'Enter a landline dial code such as 042'),
  province: z.string().trim().min(2).max(60),
  isActive: z.boolean().default(true),
  isLive: z.boolean().default(true),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  branchAddress: z.string().trim().max(300).optional(),
  mapUrl: optionalUrl,
  displayOrder: z.coerce.number().int().min(0).default(0),
});

export const upsertAreaSchema = z.object({
  cityId: uuidSchema,
  name: z.string().trim().min(2).max(120),
  slug: slugSchema,
  coverageStatus: z.enum(['AVAILABLE', 'NOT_AVAILABLE', 'COMING_SOON']).default('NOT_AVAILABLE'),
  expectedLiveDate: z.coerce.date().optional(),
  isActive: z.boolean().default(true),
  displayOrder: z.coerce.number().int().min(0).default(0),
});

export const upsertSubAreaSchema = z.object({
  areaId: uuidSchema,
  name: z.string().trim().min(2).max(120),
  slug: slugSchema,
  coverageStatus: z.enum(['AVAILABLE', 'NOT_AVAILABLE', 'COMING_SOON']).default('NOT_AVAILABLE'),
  expectedLiveDate: z.coerce.date().optional(),
  isActive: z.boolean().default(true),
});

export const upsertCoverageZoneSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    cityId: uuidSchema,
    areaId: uuidSchema.optional(),
    subAreaId: uuidSchema.optional(),
    status: z.enum(['AVAILABLE', 'NOT_AVAILABLE', 'COMING_SOON']),
    expectedLiveDate: z.coerce.date().optional(),
    capacityNote: z.string().trim().max(300).optional(),
    isActive: z.boolean().default(true),
  })
  .refine((value) => value.status !== 'COMING_SOON' || Boolean(value.expectedLiveDate), {
    message: 'Set an expected live date for a coming-soon zone',
    path: ['expectedLiveDate'],
  });

export const bulkCoverageImportSchema = z.object({
  rows: z
    .array(
      z.object({
        citySlug: slugSchema,
        areaName: z.string().trim().min(2).max(120),
        subAreaName: z.string().trim().max(120).optional(),
        status: z.enum(['AVAILABLE', 'NOT_AVAILABLE', 'COMING_SOON']),
        expectedLiveDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a YYYY-MM-DD date')
          .optional(),
      }),
    )
    .min(1, 'Provide at least one row')
    .max(5000, 'Import at most 5000 rows per request'),
});

export const updateSiteSettingsSchema = z.object({
  brandName: z.string().trim().min(2).max(60).optional(),
  logoUrl: optionalUrl,
  supportPhone: z.string().trim().max(40).optional(),
  supportEmail: emailSchema.optional(),
  announcementMessage: z.string().trim().max(240).optional(),
  announcementHref: optionalUrl,
  socialLinks: z
    .array(z.object({ platform: z.string().trim().min(2).max(40), url: z.string().url() }))
    .max(10)
    .optional(),
  footerColumns: z
    .array(
      z.object({
        title: z.string().trim().min(2).max(60),
        links: z
          .array(
            z.object({
              label: z.string().trim().min(1).max(60),
              href: z.string().trim().min(1).max(600),
              external: z.boolean().default(false),
            }),
          )
          .max(12),
      }),
    )
    .max(6)
    .optional(),
  footerNote: z.string().trim().max(300).optional(),
});

export const notificationListQuerySchema = paginationQuerySchema
  .omit({ search: true, sort: true })
  .extend({ unreadOnly: booleanQuerySchema.default(false) });

export const analyticsEventSchema = z.object({
  name: z.string().trim().min(2).max(60),
  path: z.string().trim().max(300).optional(),
  cityId: uuidSchema.optional(),
  planId: uuidSchema.optional(),
  sessionId: z.string().trim().max(80).optional(),
  properties: z.record(z.unknown()).default({}),
});

export const uploadMetaSchema = z.object({
  altText: z.string().trim().max(160).optional(),
});

export type UpsertHeroSlideInput = z.input<typeof upsertHeroSlideSchema>;
export type UpsertCmsPageInput = z.input<typeof upsertCmsPageSchema>;
export type UpsertCityInput = z.input<typeof upsertCitySchema>;
export type UpsertAreaInput = z.input<typeof upsertAreaSchema>;
export type UpsertCoverageZoneInput = z.input<typeof upsertCoverageZoneSchema>;
export type NotificationListQuery = z.output<typeof notificationListQuerySchema>;
