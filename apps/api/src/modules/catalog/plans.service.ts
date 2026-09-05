import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  OfferDetailDto,
  Paginated,
  PlanAddonDto,
  PlanCategoryDto,
  PlanDto,
  PromotionDto,
} from '@stormfiber/types';
import type { planCompareSchema, planFilterSchema } from '@stormfiber/validation';
import type { z } from 'zod';
import { CacheKeys, type CacheService } from '../../common/cache/cache.service';
import { AppException } from '../../common/errors/app.exception';
import { type PrismaService } from '../../common/prisma/prisma.service';
import { buildPaginationMeta, toPrismaPagination } from '../../common/utils/pagination';
import {
  isPromotionLive,
  planInclude,
  toPlanAddonDto,
  toPlanCategoryDto,
  toPlanDto,
  toPromotionDto,
} from './plan.mapper';

export type PlanFilterPayload = z.output<typeof planFilterSchema>;
export type PlanComparePayload = z.output<typeof planCompareSchema>;

const CATALOG_TTL_SECONDS = 600;

/** Sort keys a caller may use, mapped to the indexed columns they are allowed to touch. */
const SORT_COLUMNS: Record<PlanFilterPayload['sort'], keyof Prisma.PlanOrderByWithRelationInput> = {
  price: 'monthlyPrice',
  speed: 'speedMbps',
  name: 'name',
  order: 'displayOrder',
};

/**
 * Public read model for the plan catalogue.
 *
 * Filtering happens in PostgreSQL rather than in the browser, so a city with sixty plans sends
 * one page of results instead of the whole catalogue. Results are cached per filter combination
 * and invalidated wholesale whenever an admin publishes a catalogue change.
 */
@Injectable()
export class PlansService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async list(filter: PlanFilterPayload): Promise<Paginated<PlanDto>> {
    const cacheKey = CacheKeys.plans(this.fingerprint(filter));

    return this.cache.remember(cacheKey, CATALOG_TTL_SECONDS, async () => {
      const citySlug = filter.city ?? null;
      const where = this.buildWhere(filter);
      const { skip, take } = toPrismaPagination(filter);

      const orderBy: Prisma.PlanOrderByWithRelationInput[] = [
        { featured: 'desc' },
        { [SORT_COLUMNS[filter.sort]]: filter.order },
        { name: 'asc' },
      ];

      const [rows, total] = await this.prisma.$transaction([
        this.prisma.plan.findMany({ where, include: planInclude, orderBy, skip, take }),
        this.prisma.plan.count({ where }),
      ]);

      return {
        items: rows.map((row) => toPlanDto(row, citySlug)),
        pagination: buildPaginationMeta(filter, total),
      };
    });
  }

  async getBySlug(slug: string, citySlug: string | null): Promise<PlanDto> {
    return this.cache.remember(
      CacheKeys.planBySlug(slug, citySlug ?? 'default'),
      CATALOG_TTL_SECONDS,
      async () => {
        const plan = await this.prisma.plan.findFirst({
          where: { slug, status: 'PUBLISHED', deletedAt: null },
          include: planInclude,
        });

        if (!plan) {
          throw AppException.notFound('Plan');
        }

        // Asking for a city the plan is not sold in is a 404 for that URL, not a silent fallback
        // to the national price.
        if (citySlug && !plan.prices.some((price) => price.city.slug === citySlug)) {
          throw AppException.notFound('Plan in this city');
        }

        return toPlanDto(plan, citySlug);
      },
    );
  }

  /** Side-by-side comparison. Order follows the caller's list so the UI columns stay stable. */
  async compare(payload: PlanComparePayload): Promise<PlanDto[]> {
    const citySlug = payload.cityId ? await this.citySlugById(payload.cityId) : null;

    const rows = await this.prisma.plan.findMany({
      where: { id: { in: payload.planIds }, status: 'PUBLISHED', deletedAt: null },
      include: planInclude,
    });

    if (rows.length < 2) {
      throw AppException.badRequest('At least two published plans are needed for a comparison');
    }

    const byId = new Map(rows.map((row) => [row.id, row]));

    return payload.planIds
      .map((id) => byId.get(id))
      .filter((row): row is (typeof rows)[number] => row !== undefined)
      .map((row) => toPlanDto(row, citySlug));
  }

  async listCategories(): Promise<PlanCategoryDto[]> {
    return this.cache.remember(CacheKeys.planCategories, CATALOG_TTL_SECONDS, async () => {
      const rows = await this.prisma.planCategory.findMany({
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        include: {
          _count: { select: { plans: { where: { status: 'PUBLISHED', deletedAt: null } } } },
        },
      });

      return rows.map((row) => toPlanCategoryDto(row, row._count.plans));
    });
  }

  async listAddons(planSlug?: string): Promise<PlanAddonDto[]> {
    if (planSlug) {
      const plan = await this.prisma.plan.findFirst({
        where: { slug: planSlug, status: 'PUBLISHED', deletedAt: null },
        select: {
          addons: {
            where: { addon: { isActive: true, deletedAt: null } },
            include: { addon: true },
          },
        },
      });

      if (!plan) {
        throw AppException.notFound('Plan');
      }

      return plan.addons
        .map((link) => toPlanAddonDto(link.addon))
        .sort((left, right) => left.displayOrder - right.displayOrder);
    }

    return this.cache.remember(CacheKeys.addons, CATALOG_TTL_SECONDS, async () => {
      const rows = await this.prisma.planAddon.findMany({
        where: { isActive: true, deletedAt: null },
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      });

      return rows.map(toPlanAddonDto);
    });
  }

  async listPromotions(): Promise<PromotionDto[]> {
    return this.cache.remember(CacheKeys.promotions, CATALOG_TTL_SECONDS, async () => {
      const now = new Date();
      const rows = await this.prisma.promotion.findMany({
        where: {
          status: 'PUBLISHED',
          deletedAt: null,
          AND: [
            { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
            { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
          ],
        },
        orderBy: [{ endsAt: 'asc' }, { name: 'asc' }],
      });

      return rows.map(toPromotionDto);
    });
  }

  async getPromotionBySlug(slug: string): Promise<OfferDetailDto> {
    const promotion = await this.prisma.promotion.findFirst({
      where: { slug, deletedAt: null },
      include: { plans: { where: { status: 'PUBLISHED', deletedAt: null }, include: planInclude } },
    });

    if (!promotion || !isPromotionLive(promotion)) {
      throw AppException.notFound('Offer');
    }

    return {
      ...toPromotionDto(promotion),
      plans: promotion.plans.map((plan) => toPlanDto(plan, null)),
    };
  }

  private buildWhere(filter: PlanFilterPayload): Prisma.PlanWhereInput {
    const where: Prisma.PlanWhereInput = { status: 'PUBLISHED', deletedAt: null };

    if (filter.city) {
      // A plan is only offered in a city when an active price row links the two.
      where.prices = { some: { isActive: true, city: { slug: filter.city, isActive: true } } };
    }

    if (filter.service) {
      where.services = { has: filter.service };
    }

    if (filter.kind) {
      where.kind = filter.kind;
    }

    if (filter.category) {
      where.category = { slug: filter.category };
    }

    if (filter.minSpeed !== undefined || filter.maxSpeed !== undefined) {
      where.speedMbps = {
        ...(filter.minSpeed !== undefined ? { gte: filter.minSpeed } : {}),
        ...(filter.maxSpeed !== undefined ? { lte: filter.maxSpeed } : {}),
      };
    }

    if (filter.minPrice !== undefined || filter.maxPrice !== undefined) {
      where.monthlyPrice = {
        ...(filter.minPrice !== undefined ? { gte: filter.minPrice } : {}),
        ...(filter.maxPrice !== undefined ? { lte: filter.maxPrice } : {}),
      };
    }

    if (filter.featured) {
      where.featured = true;
    }

    if (filter.promotion) {
      where.promotionId = { not: null };
      where.promotion = { status: 'PUBLISHED', deletedAt: null };
    }

    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: 'insensitive' } },
        { shortDescription: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  /** Stable cache key for one filter combination. */
  private fingerprint(filter: PlanFilterPayload): string {
    return Object.entries(filter)
      .filter(([, value]) => value !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => `${key}=${String(value)}`)
      .join('&');
  }

  private async citySlugById(cityId: string): Promise<string> {
    const city = await this.prisma.city.findFirst({
      where: { id: cityId, isActive: true, deletedAt: null },
      select: { slug: true },
    });

    if (!city) {
      throw AppException.notFound('City');
    }

    return city.slug;
  }
}
