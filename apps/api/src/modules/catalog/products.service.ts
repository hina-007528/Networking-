import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { Paginated, ProductDto } from '@stormfiber/types';
import type { adminProductListQuerySchema, upsertProductSchema } from '@stormfiber/validation';
import type { z } from 'zod';
import { AuditAction, AuditService } from '../../common/audit/audit.service';
import { CacheKeys, CacheNamespaces, CacheService } from '../../common/cache/cache.service';
import type { RequestContext } from '../../common/decorators/auth.decorators';
import { AppException } from '../../common/errors/app.exception';
import { PrismaService } from '../../common/prisma/prisma.service';
import { buildPaginationMeta, toPrismaPagination } from '../../common/utils/pagination';
import { throwIfUniqueConflict } from '../../common/utils/prisma-errors';

export type AdminProductListQuery = z.output<typeof adminProductListQuerySchema>;
export type UpsertProductPayload = z.output<typeof upsertProductSchema>;

const PRODUCT_TTL_SECONDS = 900;

const productInclude = {
  features: { orderBy: [{ displayOrder: 'asc' }, { title: 'asc' }] },
} satisfies Prisma.ProductInclude;

type ProductRow = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

/** Read model for the three marketing product pages (internet, TV, phone). */
@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly audit: AuditService,
  ) {}

  async list(): Promise<ProductDto[]> {
    return this.cache.remember(CacheKeys.products, PRODUCT_TTL_SECONDS, async () => {
      const rows = await this.prisma.product.findMany({
        where: { status: 'PUBLISHED', deletedAt: null },
        include: productInclude,
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      });

      return rows.map((row) => this.toDto(row));
    });
  }

  async getBySlug(slug: string): Promise<ProductDto> {
    return this.cache.remember(CacheKeys.productBySlug(slug), PRODUCT_TTL_SECONDS, async () => {
      const row = await this.prisma.product.findFirst({
        where: { slug, status: 'PUBLISHED', deletedAt: null },
        include: productInclude,
      });

      if (!row) {
        throw AppException.notFound('Product');
      }

      return this.toDto(row);
    });
  }

  private toDto(row: ProductRow): ProductDto {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      serviceType: row.serviceType,
      tagline: row.tagline,
      description: row.description,
      heroHeadline: row.heroHeadline,
      heroSubheadline: row.heroSubheadline,
      imageUrl: row.imageUrl,
      iconKey: row.iconKey,
      features: row.features.map((feature) => ({
        id: feature.id,
        title: feature.title,
        description: feature.description,
        iconKey: feature.iconKey,
        imageUrl: feature.imageUrl,
        displayOrder: feature.displayOrder,
      })),
      displayOrder: row.displayOrder,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      status: row.status,
    };
  }

  async listAdmin(query: AdminProductListQuery): Promise<Paginated<ProductDto>> {
    const { skip, take } = toPrismaPagination(query);
    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(query.serviceType ? { serviceType: query.serviceType } : {}),
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
      this.prisma.product.findMany({
        where,
        include: productInclude,
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
        skip,
        take,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toDto(row)),
      pagination: buildPaginationMeta(query, total),
    };
  }

  async getById(id: string): Promise<ProductDto> {
    const row = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      include: productInclude,
    });
    if (!row) {
      throw AppException.notFound('Product');
    }
    return this.toDto(row);
  }

  async upsert(
    input: UpsertProductPayload,
    actorId: string,
    context: RequestContext,
    id?: string,
  ): Promise<ProductDto> {
    try {
      const productId = await this.prisma.$transaction(async (tx) => {
        const data = {
          name: input.name,
          slug: input.slug,
          serviceType: input.serviceType,
          categoryId: input.categoryId ?? null,
          tagline: input.tagline,
          description: input.description,
          heroHeadline: input.heroHeadline,
          heroSubheadline: input.heroSubheadline ?? null,
          imageUrl: input.imageUrl ?? null,
          iconKey: input.iconKey ?? null,
          status: input.status,
          displayOrder: input.displayOrder,
          seoTitle: input.seoTitle ?? null,
          seoDescription: input.seoDescription ?? null,
        };

        const product = id
          ? await tx.product.update({ where: { id }, data })
          : await tx.product.create({ data });

        await tx.productFeature.deleteMany({ where: { productId: product.id } });
        if (input.features.length > 0) {
          await tx.productFeature.createMany({
            data: input.features.map((feature) => ({
              productId: product.id,
              title: feature.title,
              description: feature.description,
              iconKey: feature.iconKey ?? null,
              imageUrl: feature.imageUrl ?? null,
              displayOrder: feature.displayOrder,
            })),
          });
        }

        return product.id;
      });

      await this.cache.invalidateNamespace(CacheNamespaces.catalog);
      await this.audit.record({
        userId: actorId,
        action: AuditAction.CONTENT_UPDATED,
        entity: 'Product',
        entityId: productId,
        newValue: input,
        context,
      });
      return this.getById(productId);
    } catch (error) {
      throwIfUniqueConflict(error, 'A product with that slug already exists');
    }
  }

  async archive(id: string, actorId: string, context: RequestContext): Promise<void> {
    const existing = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) {
      throw AppException.notFound('Product');
    }

    await this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'ARCHIVED' },
    });
    await this.cache.invalidateNamespace(CacheNamespaces.catalog);
    await this.audit.record({
      userId: actorId,
      action: AuditAction.CONTENT_UPDATED,
      entity: 'Product',
      entityId: id,
      newValue: { archived: true },
      context,
    });
  }
}
