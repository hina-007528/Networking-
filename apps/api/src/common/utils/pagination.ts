import type { Paginated, PaginationMeta } from '@stormfiber/types';

export interface PaginationInput {
  page: number;
  pageSize: number;
}

export interface PrismaPagination {
  skip: number;
  take: number;
}

export function toPrismaPagination({ page, pageSize }: PaginationInput): PrismaPagination {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

export function buildPaginationMeta(
  { page, pageSize }: PaginationInput,
  total: number,
): PaginationMeta {
  const totalPages = pageSize > 0 ? Math.ceil(total / pageSize) : 0;
  return {
    page,
    pageSize,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

export function paginate<TItem>(
  items: TItem[],
  input: PaginationInput,
  total: number,
): Paginated<TItem> {
  return { items, pagination: buildPaginationMeta(input, total) };
}

/**
 * Builds a Prisma `orderBy` from untrusted query input.
 *
 * Only fields present in `allowed` are honoured, which is what stops a caller from ordering by a
 * column that would leak information or force an unindexed scan.
 */
export function buildOrderBy<TField extends string>(
  sort: string | undefined,
  order: 'asc' | 'desc',
  allowed: readonly TField[],
  fallback: TField,
): Record<string, 'asc' | 'desc'> {
  const field = allowed.includes(sort as TField) ? (sort as TField) : fallback;
  return { [field]: order };
}
