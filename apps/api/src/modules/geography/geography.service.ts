import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { AreaDto, CityDto, SubAreaDto } from '@stormfiber/types';
import { formatCityHelpline, isServiceCity } from '@stormfiber/config';
import type { upsertAreaSchema, upsertCitySchema, upsertSubAreaSchema } from '@stormfiber/validation';
import type { z } from 'zod';
import { AuditAction, AuditService } from '../../common/audit/audit.service';
import { CacheKeys, CacheNamespaces, CacheService } from '../../common/cache/cache.service';
import type { RequestContext } from '../../common/decorators/auth.decorators';
import { AppException } from '../../common/errors/app.exception';
import { PrismaService } from '../../common/prisma/prisma.service';
import { throwIfUniqueConflict } from '../../common/utils/prisma-errors';

export type UpsertCityPayload = z.output<typeof upsertCitySchema>;
export type UpsertAreaPayload = z.output<typeof upsertAreaSchema>;
export type UpsertSubAreaPayload = z.output<typeof upsertSubAreaSchema>;

/** Cities and areas change rarely, so the public read path is cached for an hour. */
const GEOGRAPHY_TTL_SECONDS = 3600;

type CityRow = Prisma.CityGetPayload<{ include: { _count: { select: { areas: true } } } }>;
type AreaRow = Prisma.AreaGetPayload<{ include: { _count: { select: { subAreas: true } } } }>;

/**
 * Read model for the geography tree.
 *
 * Only active, non-deleted rows are visible on the public path; the admin module passes
 * `includeInactive` to see everything. Coverage *status* lives here for display purposes, but the
 * authoritative availability decision is made by `CoverageService` against `CoverageZone`.
 */
@Injectable()
export class GeographyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly audit: AuditService,
  ) {}

  async listCities(includeInactive = false): Promise<CityDto[]> {
    if (includeInactive) {
      return this.loadCities(true);
    }

    return this.cache.remember(CacheKeys.cities, GEOGRAPHY_TTL_SECONDS, () =>
      this.loadCities(false),
    );
  }

  private async loadCities(includeInactive: boolean): Promise<CityDto[]> {
    const rows = await this.prisma.city.findMany({
      where: includeInactive ? { deletedAt: null } : { isActive: true, deletedAt: null },
      include: { _count: { select: { areas: true } } },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });

    const visible = includeInactive ? rows : rows.filter((row) => isServiceCity(row.name));
    return visible.map((row) => this.toCityDto(row));
  }

  async getCityBySlug(slug: string): Promise<CityDto> {
    const cities = await this.listCities();
    const city = cities.find((candidate) => candidate.slug === slug);

    if (!city) {
      throw AppException.notFound('City');
    }

    return city;
  }

  /** Resolves a slug to an id without serialising the whole city. */
  async requireCityIdBySlug(slug: string, includeInactive = false): Promise<string> {
    const city = await this.prisma.city.findFirst({
      where: { slug, deletedAt: null, ...(includeInactive ? {} : { isActive: true }) },
      select: { id: true },
    });

    if (!city) {
      throw AppException.notFound('City');
    }

    return city.id;
  }

  async listAreasByCitySlug(slug: string, includeInactive = false): Promise<AreaDto[]> {
    if (includeInactive) {
      const cityId = await this.requireCityIdBySlug(slug, true);
      return this.loadAreas(cityId, true);
    }

    return this.cache.remember(CacheKeys.cityAreas(slug), GEOGRAPHY_TTL_SECONDS, async () => {
      const cityId = await this.requireCityIdBySlug(slug);
      return this.loadAreas(cityId, false);
    });
  }

  async listAreasByCityId(cityId: string, includeInactive = false): Promise<AreaDto[]> {
    return this.loadAreas(cityId, includeInactive);
  }

  private async loadAreas(cityId: string, includeInactive: boolean): Promise<AreaDto[]> {
    const rows = await this.prisma.area.findMany({
      where: { cityId, ...(includeInactive ? {} : { isActive: true, deletedAt: null }) },
      include: { _count: { select: { subAreas: true } } },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });

    return rows.map((row) => this.toAreaDto(row));
  }

  async listSubAreas(areaId: string, includeInactive = false): Promise<SubAreaDto[]> {
    const load = async (): Promise<SubAreaDto[]> => {
      const area = await this.prisma.area.findFirst({
        where: { id: areaId, ...(includeInactive ? {} : { isActive: true, deletedAt: null }) },
        select: { id: true },
      });

      if (!area) {
        throw AppException.notFound('Area');
      }

      const rows = await this.prisma.subArea.findMany({
        where: { areaId, ...(includeInactive ? {} : { isActive: true, deletedAt: null }) },
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      });

      return rows.map((row) => this.toSubAreaDto(row));
    };

    if (includeInactive) {
      return load();
    }

    return this.cache.remember(CacheKeys.areaSubAreas(areaId), GEOGRAPHY_TTL_SECONDS, load);
  }

  toCityDto(row: CityRow): CityDto {
    return {
      id: row.id,
      name: row.name,
      slug: row.slug,
      code: row.code,
      dialCode: row.dialCode,
      province: row.province,
      isActive: row.isActive,
      isLive: row.isLive,
      latitude: row.latitude ? Number(row.latitude) : null,
      longitude: row.longitude ? Number(row.longitude) : null,
      areaCount: row._count.areas,
      supportPhone: formatCityHelpline(row.dialCode),
      branchAddress: row.branchAddress,
      mapUrl: row.mapUrl,
      displayOrder: row.displayOrder,
    };
  }

  toAreaDto(row: AreaRow): AreaDto {
    return {
      id: row.id,
      cityId: row.cityId,
      name: row.name,
      slug: row.slug,
      coverageStatus: row.coverageStatus,
      expectedLiveDate: row.expectedLiveDate?.toISOString() ?? null,
      isActive: row.isActive,
      subAreaCount: row._count.subAreas,
    };
  }

  toSubAreaDto(row: {
    id: string;
    areaId: string;
    name: string;
    slug: string;
    coverageStatus: SubAreaDto['coverageStatus'];
    expectedLiveDate: Date | null;
    isActive: boolean;
  }): SubAreaDto {
    return {
      id: row.id,
      areaId: row.areaId,
      name: row.name,
      slug: row.slug,
      coverageStatus: row.coverageStatus,
      expectedLiveDate: row.expectedLiveDate?.toISOString() ?? null,
      isActive: row.isActive,
    };
  }

  async upsertCity(
    input: UpsertCityPayload,
    actorId: string,
    context: RequestContext,
    id?: string,
  ): Promise<CityDto> {
    try {
      const row = id
        ? await this.prisma.city.update({
            where: { id },
            data: {
              name: input.name,
              slug: input.slug,
              code: input.code,
              dialCode: input.dialCode,
              province: input.province,
              isActive: input.isActive,
              isLive: input.isLive,
              latitude: input.latitude ?? null,
              longitude: input.longitude ?? null,
              branchAddress: input.branchAddress ?? null,
              mapUrl: input.mapUrl ?? null,
              displayOrder: input.displayOrder,
            },
            include: { _count: { select: { areas: true } } },
          })
        : await this.prisma.city.create({
            data: {
              name: input.name,
              slug: input.slug,
              code: input.code,
              dialCode: input.dialCode,
              province: input.province,
              isActive: input.isActive,
              isLive: input.isLive,
              latitude: input.latitude ?? null,
              longitude: input.longitude ?? null,
              branchAddress: input.branchAddress ?? null,
              mapUrl: input.mapUrl ?? null,
              displayOrder: input.displayOrder,
            },
            include: { _count: { select: { areas: true } } },
          });

      await this.afterGeoWrite(actorId, context, row.id, 'City', input);
      return this.toCityDto(row);
    } catch (error) {
      throwIfUniqueConflict(error, 'A city with that slug or code already exists');
    }
  }

  async archiveArea(id: string, actorId: string, context: RequestContext): Promise<void> {
    const existing = await this.prisma.area.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) {
      throw AppException.notFound('Area');
    }
    await this.prisma.area.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await this.afterGeoWrite(actorId, context, id, 'Area', { archived: true });
  }

  async archiveSubArea(id: string, actorId: string, context: RequestContext): Promise<void> {
    const existing = await this.prisma.subArea.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) {
      throw AppException.notFound('Sub-area');
    }
    await this.prisma.subArea.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await this.afterGeoWrite(actorId, context, id, 'SubArea', { archived: true });
  }

  async archiveCity(id: string, actorId: string, context: RequestContext): Promise<void> {
    const existing = await this.prisma.city.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) {
      throw AppException.notFound('City');
    }

    await this.prisma.city.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await this.afterGeoWrite(actorId, context, id, 'City', { archived: true });
  }

  async upsertArea(
    input: UpsertAreaPayload,
    actorId: string,
    context: RequestContext,
    id?: string,
  ): Promise<AreaDto> {
    try {
      const row = id
        ? await this.prisma.area.update({
            where: { id },
            data: {
              cityId: input.cityId,
              name: input.name,
              slug: input.slug,
              coverageStatus: input.coverageStatus,
              expectedLiveDate: input.expectedLiveDate ?? null,
              isActive: input.isActive,
              displayOrder: input.displayOrder,
            },
            include: { _count: { select: { subAreas: true } } },
          })
        : await this.prisma.area.create({
            data: {
              cityId: input.cityId,
              name: input.name,
              slug: input.slug,
              coverageStatus: input.coverageStatus,
              expectedLiveDate: input.expectedLiveDate ?? null,
              isActive: input.isActive,
              displayOrder: input.displayOrder,
            },
            include: { _count: { select: { subAreas: true } } },
          });

      await this.afterGeoWrite(actorId, context, row.id, 'Area', input);
      return this.toAreaDto(row);
    } catch (error) {
      throwIfUniqueConflict(error, 'An area with that slug already exists in this city');
    }
  }

  async upsertSubArea(
    input: UpsertSubAreaPayload,
    actorId: string,
    context: RequestContext,
    id?: string,
  ): Promise<SubAreaDto> {
    try {
      const row = id
        ? await this.prisma.subArea.update({
            where: { id },
            data: {
              areaId: input.areaId,
              name: input.name,
              slug: input.slug,
              coverageStatus: input.coverageStatus,
              expectedLiveDate: input.expectedLiveDate ?? null,
              isActive: input.isActive,
            },
          })
        : await this.prisma.subArea.create({
            data: {
              areaId: input.areaId,
              name: input.name,
              slug: input.slug,
              coverageStatus: input.coverageStatus,
              expectedLiveDate: input.expectedLiveDate ?? null,
              isActive: input.isActive,
            },
          });

      await this.afterGeoWrite(actorId, context, row.id, 'SubArea', input);
      return this.toSubAreaDto(row);
    } catch (error) {
      throwIfUniqueConflict(error, 'A sub-area with that slug already exists in this area');
    }
  }

  private async afterGeoWrite(
    actorId: string,
    context: RequestContext,
    entityId: string,
    entity: string,
    newValue: unknown,
  ): Promise<void> {
    await this.cache.invalidateNamespace(CacheNamespaces.catalog);
    await this.cache.invalidateNamespace(CacheNamespaces.coverage);
    await this.audit.record({
      userId: actorId,
      action: AuditAction.COVERAGE_UPDATED,
      entity,
      entityId,
      newValue,
      context,
    });
  }
}
