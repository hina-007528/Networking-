import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PublishStatus } from '@prisma/client';
import type { FaqCategoryDto, FaqDto, Paginated } from '@stormfiber/types';
import type {
  adminFaqListQuerySchema,
  faqSearchSchema,
  upsertFaqCategorySchema,
  upsertFaqSchema,
} from '@stormfiber/validation';
import type { z } from 'zod';
import { AuditAction, AuditService } from '../../common/audit/audit.service';
import { CacheKeys, CacheNamespaces, CacheService } from '../../common/cache/cache.service';
import type { RequestContext } from '../../common/decorators/auth.decorators';
import { AppException } from '../../common/errors/app.exception';
import { PrismaService } from '../../common/prisma/prisma.service';
import { buildPaginationMeta, toPrismaPagination } from '../../common/utils/pagination';
import { throwIfUniqueConflict } from '../../common/utils/prisma-errors';

export type AdminFaqListQuery = z.output<typeof adminFaqListQuerySchema>;
export type UpsertFaqPayload = z.output<typeof upsertFaqSchema>;
export type UpsertFaqCategoryPayload = z.output<typeof upsertFaqCategorySchema>;

export type FaqSearchPayload = z.output<typeof faqSearchSchema>;

const FAQ_TTL_SECONDS = 300;

const publishedWhere: Prisma.FaqWhereInput = {
  status: PublishStatus.PUBLISHED,
  deletedAt: null,
};

/**
 * Public FAQ catalogue.
 *
 * Answers are cached because they change rarely and are hit by every visitor on /faqs. Admin
 * writes invalidate the `support:` namespace so a published edit is visible on the next request.
 */
@Injectable()
export class FaqsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly audit: AuditService,
  ) {}

  listCategories(): Promise<FaqCategoryDto[]> {
    return this.cache.remember(CacheKeys.faqCategories, FAQ_TTL_SECONDS, async () => {
      const rows = await this.prisma.faqCategory.findMany({
        orderBy: { displayOrder: 'asc' },
        include: { _count: { select: { faqs: { where: publishedWhere } } } },
      });

      return rows.map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        iconKey: row.iconKey,
        displayOrder: row.displayOrder,
        faqCount: row._count.faqs,
      }));
    });
  }

  async search(query: FaqSearchPayload): Promise<Paginated<FaqDto>> {
    const cacheKey = CacheKeys.faqs(JSON.stringify(query));
    return this.cache.remember(cacheKey, FAQ_TTL_SECONDS, async () => {
      const { skip, take } = toPrismaPagination(query);
      const where: Prisma.FaqWhereInput = {
        ...publishedWhere,
        ...(query.category ? { category: { slug: query.category } } : {}),
        ...(query.search
          ? {
              OR: [
                { question: { contains: query.search, mode: 'insensitive' } },
                { answer: { contains: query.search, mode: 'insensitive' } },
                { tags: { has: query.search.toLowerCase() } },
              ],
            }
          : {}),
      };

      const [rows, total] = await this.prisma.$transaction([
        this.prisma.faq.findMany({
          where,
          include: { category: { select: { name: true, slug: true } } },
          orderBy: [{ displayOrder: 'asc' }, { question: 'asc' }],
          skip,
          take,
        }),
        this.prisma.faq.count({ where }),
      ]);

      return {
        items: rows.map((row) => this.toDto(row)),
        pagination: buildPaginationMeta(query, total),
      };
    });
  }

  async getBySlug(slug: string): Promise<FaqDto & { related: FaqDto[] }> {
    const row = await this.prisma.faq.findFirst({
      where: { slug, ...publishedWhere },
      include: { category: { select: { name: true, slug: true } } },
    });

    if (!row) {
      throw AppException.notFound('FAQ');
    }

    await this.prisma.faq.update({
      where: { id: row.id },
      data: { viewCount: { increment: 1 } },
    });

    const related = row.categoryId
      ? await this.prisma.faq.findMany({
          where: { ...publishedWhere, categoryId: row.categoryId, id: { not: row.id } },
          include: { category: { select: { name: true, slug: true } } },
          orderBy: { displayOrder: 'asc' },
          take: 5,
        })
      : [];

    return { ...this.toDto(row), related: related.map((item) => this.toDto(item)) };
  }

  async markHelpful(id: string): Promise<{ helpfulCount: number }> {
    const row = await this.prisma.faq.findFirst({
      where: { id, ...publishedWhere },
      select: { id: true },
    });

    if (!row) {
      throw AppException.notFound('FAQ');
    }

    const updated = await this.prisma.faq.update({
      where: { id },
      data: { helpfulCount: { increment: 1 } },
      select: { helpfulCount: true },
    });

    await this.cache.invalidateNamespace('support:faqs:');
    return updated;
  }

  private toDto(row: {
    id: string;
    question: string;
    slug: string;
    answer: string;
    categoryId: string | null;
    tags: string[];
    displayOrder: number;
    helpfulCount: number;
    updatedAt: Date;
    category: { name: string; slug: string } | null;
    status?: PublishStatus;
  }): FaqDto {
    return {
      id: row.id,
      question: row.question,
      slug: row.slug,
      answer: row.answer,
      categoryId: row.categoryId,
      categoryName: row.category?.name ?? null,
      categorySlug: row.category?.slug ?? null,
      tags: row.tags,
      status: row.status,
      displayOrder: row.displayOrder,
      helpfulCount: row.helpfulCount,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async listAdmin(query: AdminFaqListQuery): Promise<Paginated<FaqDto>> {
    const { skip, take } = toPrismaPagination(query);
    const where: Prisma.FaqWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.search
        ? {
            OR: [
              { question: { contains: query.search, mode: 'insensitive' } },
              { answer: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.faq.findMany({
        where,
        include: { category: { select: { name: true, slug: true } } },
        orderBy: [{ displayOrder: 'asc' }, { question: 'asc' }],
        skip,
        take,
      }),
      this.prisma.faq.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toDto(row)),
      pagination: buildPaginationMeta(query, total),
    };
  }

  async upsertFaq(
    input: UpsertFaqPayload,
    actorId: string,
    context: RequestContext,
    id?: string,
  ): Promise<FaqDto> {
    try {
      const row = id
        ? await this.prisma.faq.update({
            where: { id },
            data: {
              question: input.question,
              slug: input.slug,
              answer: input.answer,
              categoryId: input.categoryId ?? null,
              tags: input.tags,
              displayOrder: input.displayOrder,
              status: input.status,
            },
            include: { category: { select: { name: true, slug: true } } },
          })
        : await this.prisma.faq.create({
            data: {
              question: input.question,
              slug: input.slug,
              answer: input.answer,
              categoryId: input.categoryId ?? null,
              tags: input.tags,
              displayOrder: input.displayOrder,
              status: input.status,
            },
            include: { category: { select: { name: true, slug: true } } },
          });

      await this.cache.invalidateNamespace(CacheNamespaces.support);
      await this.audit.record({
        userId: actorId,
        action: input.status === 'PUBLISHED' ? AuditAction.CONTENT_PUBLISHED : AuditAction.CONTENT_UPDATED,
        entity: 'Faq',
        entityId: row.id,
        newValue: input,
        context,
      });
      return this.toDto(row);
    } catch (error) {
      throwIfUniqueConflict(error, 'An FAQ with that slug already exists');
    }
  }

  async archiveFaq(id: string, actorId: string, context: RequestContext): Promise<void> {
    const existing = await this.prisma.faq.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) {
      throw AppException.notFound('FAQ');
    }

    await this.prisma.faq.update({
      where: { id },
      data: { deletedAt: new Date(), status: PublishStatus.ARCHIVED },
    });
    await this.cache.invalidateNamespace(CacheNamespaces.support);
    await this.audit.record({
      userId: actorId,
      action: AuditAction.CONTENT_UPDATED,
      entity: 'Faq',
      entityId: id,
      newValue: { archived: true },
      context,
    });
  }

  async upsertCategory(
    input: UpsertFaqCategoryPayload,
    actorId: string,
    context: RequestContext,
    id?: string,
  ): Promise<FaqCategoryDto> {
    try {
      const row = id
        ? await this.prisma.faqCategory.update({
            where: { id },
            data: input,
            include: { _count: { select: { faqs: { where: publishedWhere } } } },
          })
        : await this.prisma.faqCategory.create({
            data: input,
            include: { _count: { select: { faqs: { where: publishedWhere } } } },
          });

      await this.cache.invalidateNamespace(CacheNamespaces.support);
      await this.audit.record({
        userId: actorId,
        action: AuditAction.CONTENT_UPDATED,
        entity: 'FaqCategory',
        entityId: row.id,
        newValue: input,
        context,
      });
      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        iconKey: row.iconKey,
        displayOrder: row.displayOrder,
        faqCount: row._count.faqs,
      };
    } catch (error) {
      throwIfUniqueConflict(error, 'A category with that slug already exists');
    }
  }
}
