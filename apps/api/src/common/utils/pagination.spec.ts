import { describe, expect, it } from 'vitest';
import { buildOrderBy, buildPaginationMeta, toPrismaPagination } from './pagination';

describe('pagination', () => {
  it('converts a 1-based page into a skip/take pair', () => {
    expect(toPrismaPagination({ page: 3, pageSize: 20 })).toEqual({ skip: 40, take: 20 });
  });

  it('reports the last page correctly', () => {
    const meta = buildPaginationMeta({ page: 5, pageSize: 20 }, 100);
    expect(meta.totalPages).toBe(5);
    expect(meta.hasNextPage).toBe(false);
    expect(meta.hasPreviousPage).toBe(true);
  });

  it('ignores an untrusted sort column', () => {
    expect(buildOrderBy('passwordHash', 'asc', ['createdAt', 'name'], 'createdAt')).toEqual({
      createdAt: 'asc',
    });
  });
});
