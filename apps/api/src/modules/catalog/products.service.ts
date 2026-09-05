import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { ProductDto } from '@stormfiber/types';
import { CacheKeys, type CacheService } from '../../common/cache/cache.service';
import { AppException } from '../../common/errors/app.exception';
import { type PrismaService } from '../../common/prisma/prisma.service';

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
    };
  }
}
