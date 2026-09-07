import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  OfferDetailDto,
  Paginated,
  PlanAddonDto,
  PlanCategoryDto,
  PlanDto,
  PlanPriceDto,
  PromotionDto,
  TaxRuleDto,
} from '@stormfiber/types';
import type {
  adminPlanListQuerySchema,
  planCompareSchema,
  planFilterSchema,
  upsertPlanAddonSchema,
  upsertPlanCategorySchema,
  upsertPlanPriceSchema,
  upsertPlanSchema,
  upsertPromotionSchema,
  upsertTaxRuleSchema,
} from '@stormfiber/validation';
import type { z } from 'zod';
import { AuditAction, AuditService } from '../../common/audit/audit.service';
import { CacheKeys, CacheNamespaces, CacheService } from '../../common/cache/cache.service';
import type { RequestContext } from '../../common/decorators/auth.decorators';
import { AppException } from '../../common/errors/app.exception';
import { PrismaService } from '../../common/prisma/prisma.service';
import { money, toNumber } from '../../common/utils/money';
import { buildPaginationMeta, toPrismaPagination } from '../../common/utils/pagination';
import { throwIfUniqueConflict } from '../../common/utils/prisma-errors';
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
export type AdminPlanListQuery = z.output<typeof adminPlanListQuerySchema>;
export type UpsertPlanPayload = z.output<typeof upsertPlanSchema>;
export type UpsertPlanPricePayload = z.output<typeof upsertPlanPriceSchema>;
export type UpsertPlanAddonPayload = z.output<typeof upsertPlanAddonSchema>;
export type UpsertPlanCategoryPayload = z.output<typeof upsertPlanCategorySchema>;
export type UpsertPromotionPayload = z.output<typeof upsertPromotionSchema>;
export type UpsertTaxRulePayload = z.output<typeof upsertTaxRuleSchema>;

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
    private readonly audit: AuditService,
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

  // ---------------------------------------------------------------------------
  // Admin writes
  // ---------------------------------------------------------------------------

  async listAdmin(query: AdminPlanListQuery): Promise<Paginated<PlanDto>> {
    const { skip, take } = toPrismaPagination(query);
    const where: Prisma.PlanWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.kind ? { kind: query.kind } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { slug: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.plan.findMany({
        where,
        include: planInclude,
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        skip,
        take,
      }),
      this.prisma.plan.count({ where }),
    ]);

    return {
      items: rows.map((row) => toPlanDto(row, null)),
      pagination: buildPaginationMeta(query, total),
    };
  }

  async getById(id: string): Promise<PlanDto> {
    const plan = await this.prisma.plan.findFirst({
      where: { id, deletedAt: null },
      include: planInclude,
    });

    if (!plan) {
      throw AppException.notFound('Plan');
    }

    return toPlanDto(plan, null);
  }

  async createPlan(input: UpsertPlanPayload, actorId: string, context: RequestContext): Promise<PlanDto> {
    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const plan = await tx.plan.create({
          data: this.planWriteData(input),
        });
        await this.replacePlanRelations(tx, plan.id, input);
        return plan.id;
      });

      await this.afterCatalogWrite(actorId, context, created, AuditAction.PLAN_CREATED, input);
      return this.getById(created);
    } catch (error) {
      throwIfUniqueConflict(error, 'A plan with that slug already exists');
    }
  }

  async updatePlan(
    id: string,
    input: UpsertPlanPayload,
    actorId: string,
    context: RequestContext,
  ): Promise<PlanDto> {
    const existing = await this.prisma.plan.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, status: true },
    });

    if (!existing) {
      throw AppException.notFound('Plan');
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.plan.update({ where: { id }, data: this.planWriteData(input) });
        await this.replacePlanRelations(tx, id, input);
      });
    } catch (error) {
      throwIfUniqueConflict(error, 'A plan with that slug already exists');
    }

    const published = existing.status !== 'PUBLISHED' && input.status === 'PUBLISHED';
    await this.afterCatalogWrite(
      actorId,
      context,
      id,
      published ? AuditAction.PLAN_PUBLISHED : AuditAction.PLAN_UPDATED,
      input,
    );
    return this.getById(id);
  }

  async archivePlan(id: string, actorId: string, context: RequestContext): Promise<void> {
    const existing = await this.prisma.plan.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) {
      throw AppException.notFound('Plan');
    }

    await this.prisma.plan.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'ARCHIVED' },
    });
    await this.afterCatalogWrite(actorId, context, id, AuditAction.PLAN_UPDATED, { archived: true });
  }

  async listPrices(planId: string): Promise<PlanPriceDto[]> {
    const rows = await this.prisma.planPrice.findMany({
      where: { planId },
      include: { city: { select: { name: true, slug: true } } },
      orderBy: { city: { name: 'asc' } },
    });

    return rows.map((row) => ({
      id: row.id,
      planId: row.planId,
      cityId: row.cityId,
      cityName: row.city.name,
      citySlug: row.city.slug,
      monthlyPrice: toNumber(row.monthlyPrice),
      installationPrice: toNumber(row.installationPrice),
      currency: row.currency,
      isActive: row.isActive,
    }));
  }

  async upsertPrice(
    input: UpsertPlanPricePayload,
    actorId: string,
    context: RequestContext,
  ): Promise<PlanPriceDto> {
    const row = await this.prisma.planPrice.upsert({
      where: { planId_cityId: { planId: input.planId, cityId: input.cityId } },
      create: {
        planId: input.planId,
        cityId: input.cityId,
        monthlyPrice: money(input.monthlyPrice),
        installationPrice: money(input.installationPrice),
        currency: input.currency,
        isActive: input.isActive,
      },
      update: {
        monthlyPrice: money(input.monthlyPrice),
        installationPrice: money(input.installationPrice),
        currency: input.currency,
        isActive: input.isActive,
      },
      include: { city: { select: { name: true, slug: true } } },
    });

    await this.afterCatalogWrite(actorId, context, input.planId, AuditAction.PLAN_PRICE_CHANGED, input);
    return {
      id: row.id,
      planId: row.planId,
      cityId: row.cityId,
      cityName: row.city.name,
      citySlug: row.city.slug,
      monthlyPrice: toNumber(row.monthlyPrice),
      installationPrice: toNumber(row.installationPrice),
      currency: row.currency,
      isActive: row.isActive,
    };
  }

  async listAllAddons(): Promise<PlanAddonDto[]> {
    const rows = await this.prisma.planAddon.findMany({
      where: { deletedAt: null },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });
    return rows.map(toPlanAddonDto);
  }

  async upsertAddon(
    input: UpsertPlanAddonPayload,
    actorId: string,
    context: RequestContext,
    id?: string,
  ): Promise<PlanAddonDto> {
    try {
      const row = id
        ? await this.prisma.planAddon.update({
            where: { id },
            data: {
              name: input.name,
              slug: input.slug,
              description: input.description ?? null,
              serviceType: input.serviceType,
              monthlyPrice: money(input.monthlyPrice),
              oneTimePrice: money(input.oneTimePrice),
              currency: input.currency,
              isActive: input.isActive,
              displayOrder: input.displayOrder,
            },
          })
        : await this.prisma.planAddon.create({
            data: {
              name: input.name,
              slug: input.slug,
              description: input.description ?? null,
              serviceType: input.serviceType,
              monthlyPrice: money(input.monthlyPrice),
              oneTimePrice: money(input.oneTimePrice),
              currency: input.currency,
              isActive: input.isActive,
              displayOrder: input.displayOrder,
            },
          });

      await this.afterCatalogWrite(actorId, context, row.id, AuditAction.PLAN_UPDATED, input);
      return toPlanAddonDto(row);
    } catch (error) {
      throwIfUniqueConflict(error, 'An add-on with that slug already exists');
    }
  }

  async upsertCategory(
    input: UpsertPlanCategoryPayload,
    actorId: string,
    context: RequestContext,
    id?: string,
  ): Promise<PlanCategoryDto> {
    try {
      const row = id
        ? await this.prisma.planCategory.update({
            where: { id },
            data: input,
          })
        : await this.prisma.planCategory.create({ data: input });

      await this.afterCatalogWrite(actorId, context, row.id, AuditAction.PLAN_UPDATED, input);
      return toPlanCategoryDto(row);
    } catch (error) {
      throwIfUniqueConflict(error, 'A category with that slug already exists');
    }
  }

  async listAllPromotions(): Promise<PromotionDto[]> {
    const rows = await this.prisma.promotion.findMany({
      where: { deletedAt: null },
      orderBy: [{ startsAt: 'desc' }, { name: 'asc' }],
    });
    return rows.map(toPromotionDto);
  }

  async upsertPromotion(
    input: UpsertPromotionPayload,
    actorId: string,
    context: RequestContext,
    id?: string,
  ): Promise<PromotionDto> {
    try {
      const row = id
        ? await this.prisma.promotion.update({
            where: { id },
            data: {
              name: input.name,
              slug: input.slug,
              description: input.description ?? null,
              discountKind: input.discountKind,
              discountValue: money(input.discountValue),
              durationMonths: input.durationMonths ?? null,
              badgeText: input.badgeText ?? null,
              code: input.code ?? null,
              status: input.status,
              startsAt: input.startsAt ?? null,
              endsAt: input.endsAt ?? null,
              imageUrl: input.imageUrl ?? null,
            },
          })
        : await this.prisma.promotion.create({
            data: {
              name: input.name,
              slug: input.slug,
              description: input.description ?? null,
              discountKind: input.discountKind,
              discountValue: money(input.discountValue),
              durationMonths: input.durationMonths ?? null,
              badgeText: input.badgeText ?? null,
              code: input.code ?? null,
              status: input.status,
              startsAt: input.startsAt ?? null,
              endsAt: input.endsAt ?? null,
              imageUrl: input.imageUrl ?? null,
            },
          });

      await this.afterCatalogWrite(actorId, context, row.id, AuditAction.PROMOTION_UPDATED, input);
      return toPromotionDto(row);
    } catch (error) {
      throwIfUniqueConflict(error, 'A promotion with that slug or code already exists');
    }
  }

  async listTaxRules(): Promise<TaxRuleDto[]> {
    const rows = await this.prisma.taxRule.findMany({ orderBy: { code: 'asc' } });
    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      label: row.label,
      kind: row.kind,
      rate: toNumber(row.rate),
      fixedAmount: toNumber(row.fixedAmount),
      appliesTo: row.appliesTo,
      isActive: row.isActive,
      effectiveFrom: row.effectiveFrom?.toISOString() ?? null,
      effectiveTo: row.effectiveTo?.toISOString() ?? null,
    }));
  }

  async upsertTaxRule(
    input: UpsertTaxRulePayload,
    actorId: string,
    context: RequestContext,
    id?: string,
  ): Promise<TaxRuleDto> {
    try {
      const row = id
        ? await this.prisma.taxRule.update({
            where: { id },
            data: {
              code: input.code,
              label: input.label,
              kind: input.kind,
              rate: money(input.rate),
              fixedAmount: money(input.fixedAmount),
              appliesTo: input.appliesTo,
              isActive: input.isActive,
              effectiveFrom: input.effectiveFrom ?? null,
              effectiveTo: input.effectiveTo ?? null,
            },
          })
        : await this.prisma.taxRule.create({
            data: {
              code: input.code,
              label: input.label,
              kind: input.kind,
              rate: money(input.rate),
              fixedAmount: money(input.fixedAmount),
              appliesTo: input.appliesTo,
              isActive: input.isActive,
              effectiveFrom: input.effectiveFrom ?? null,
              effectiveTo: input.effectiveTo ?? null,
            },
          });

      await this.afterCatalogWrite(actorId, context, row.id, AuditAction.PLAN_PRICE_CHANGED, input);
      return (await this.listTaxRules()).find((rule) => rule.id === row.id)!;
    } catch (error) {
      throwIfUniqueConflict(error, 'A tax rule with that code already exists');
    }
  }

  private planWriteData(input: UpsertPlanPayload): Prisma.PlanUncheckedCreateInput {
    return {
      name: input.name,
      slug: input.slug,
      description: input.description,
      shortDescription: input.shortDescription ?? null,
      kind: input.kind,
      categoryId: input.categoryId ?? null,
      promotionId: input.promotionId ?? null,
      services: input.services,
      speedMbps: input.speedMbps ?? null,
      uploadMbps: input.uploadMbps ?? null,
      tvChannels: input.tvChannels ?? null,
      voiceMinutes: input.voiceMinutes ?? null,
      monthlyPrice: money(input.monthlyPrice),
      installationPrice: money(input.installationPrice),
      currency: input.currency,
      status: input.status,
      featured: input.featured,
      displayOrder: input.displayOrder,
      badgeText: input.badgeText ?? null,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      seoTitle: input.seoTitle ?? null,
      seoDescription: input.seoDescription ?? null,
      publishedAt: input.status === 'PUBLISHED' ? (input.publishedAt ?? new Date()) : (input.publishedAt ?? null),
      expiresAt: input.expiresAt ?? null,
    };
  }

  private async replacePlanRelations(
    tx: Prisma.TransactionClient,
    planId: string,
    input: UpsertPlanPayload,
  ): Promise<void> {
    await tx.planFeature.deleteMany({ where: { planId } });
    if (input.features.length > 0) {
      await tx.planFeature.createMany({
        data: input.features.map((feature) => ({
          planId,
          label: feature.label,
          value: feature.value ?? null,
          iconKey: feature.iconKey ?? null,
          highlighted: feature.highlighted,
          displayOrder: feature.displayOrder,
        })),
      });
    }

    await tx.planAddonLink.deleteMany({ where: { planId } });
    if (input.addonIds.length > 0) {
      await tx.planAddonLink.createMany({
        data: input.addonIds.map((addonId) => ({ planId, addonId })),
      });
    }

    if (input.cityIds.length > 0) {
      for (const cityId of input.cityIds) {
        await tx.planPrice.upsert({
          where: { planId_cityId: { planId, cityId } },
          create: {
            planId,
            cityId,
            monthlyPrice: money(input.monthlyPrice),
            installationPrice: money(input.installationPrice),
            currency: input.currency,
          },
          update: {},
        });
      }
    }
  }

  private async afterCatalogWrite(
    actorId: string,
    context: RequestContext,
    entityId: string,
    action: AuditAction,
    newValue: unknown,
  ): Promise<void> {
    await this.cache.invalidateNamespace(CacheNamespaces.catalog);
    await this.audit.record({
      userId: actorId,
      action,
      entity: 'Plan',
      entityId,
      newValue,
      context,
    });
  }
}
