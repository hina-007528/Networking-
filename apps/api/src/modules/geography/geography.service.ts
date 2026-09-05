import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { AreaDto, CityDto, SubAreaDto } from '@stormfiber/types';
import { formatCityHelpline } from '@stormfiber/config';
import { type PrismaService } from '../../common/prisma/prisma.service';
import { CacheKeys, type CacheService } from '../../common/cache/cache.service';
import { AppException } from '../../common/errors/app.exception';

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
      where: includeInactive ? {} : { isActive: true, deletedAt: null },
      include: { _count: { select: { areas: true } } },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
    });

    return rows.map((row) => this.toCityDto(row));
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
  async requireCityIdBySlug(slug: string): Promise<string> {
    const city = await this.prisma.city.findFirst({
      where: { slug, isActive: true, deletedAt: null },
      select: { id: true },
    });

    if (!city) {
      throw AppException.notFound('City');
    }

    return city.id;
  }

  async listAreasByCitySlug(slug: string, includeInactive = false): Promise<AreaDto[]> {
    if (includeInactive) {
      const cityId = await this.requireCityIdBySlug(slug);
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
}
