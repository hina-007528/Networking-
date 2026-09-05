import { z } from 'zod';
import { booleanQuerySchema } from './primitives';

/** Server-side pagination contract used by every admin list endpoint. */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional(),
  sort: z
    .string()
    .trim()
    .regex(/^[a-zA-Z][a-zA-Z0-9_.]*$/, 'Invalid sort field')
    .max(60)
    .optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationQueryInput = z.input<typeof paginationQuerySchema>;
export type PaginationQuery = z.output<typeof paginationQuerySchema>;

export const idParamSchema = z.object({ id: z.string().uuid('Invalid identifier') });

export const slugParamSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug'),
});

export const publishStatusSchema = z.enum([
  'DRAFT',
  'PUBLISHED',
  'SCHEDULED',
  'EXPIRED',
  'ARCHIVED',
]);

export const serviceTypeSchema = z.enum(['INTERNET', 'TV', 'PHONE']);

export const planKindSchema = z.enum([
  'INTERNET',
  'TV',
  'PHONE',
  'DOUBLE_PLAY',
  'TRIPLE_PLAY',
]);

export const coverageStatusSchema = z.enum(['AVAILABLE', 'NOT_AVAILABLE', 'COMING_SOON']);

export const includeInactiveQuerySchema = z.object({
  includeInactive: booleanQuerySchema.default(false),
});

export const dateRangeQuerySchema = z
  .object({
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .refine((value) => !value.from || !value.to || value.from <= value.to, {
    message: '`from` must be before `to`',
    path: ['from'],
  });
