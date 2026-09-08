import { Injectable } from '@nestjs/common';
import { CoverageStatus, type Prisma } from '@prisma/client';
import { isServiceCity, isWithinServiceBounds, SERVICE_CITY, SERVICE_CITY_SLUG } from '@stormfiber/config';
import type {
  CityWaitlistDto,
  CoverageCheckResult,
  CoverageLeadDto,
  CoverageSummaryDto,
  CoverageZoneDto,
  Paginated,
} from '@stormfiber/types';
import type {
  adminCoverageZoneListQuerySchema,
  adminLeadListQuerySchema,
  bulkCoverageImportSchema,
  cityWaitlistSchema,
  coverageCheckSchema,
  coverageLeadSchema,
  updateCoverageLeadSchema,
  upsertCoverageZoneSchema,
} from '@stormfiber/validation';
import type { z } from 'zod';
import { AuditAction, AuditService } from '../../common/audit/audit.service';
import type { RequestContext } from '../../common/decorators/auth.decorators';
import { AppException } from '../../common/errors/app.exception';
import { PrismaService } from '../../common/prisma/prisma.service';
import { slugify } from '../../common/utils/slug';
import { buildOrderBy, buildPaginationMeta, toPrismaPagination } from '../../common/utils/pagination';

export type CoverageCheckPayload = z.output<typeof coverageCheckSchema>;
export type CoverageLeadPayload = z.output<typeof coverageLeadSchema>;
export type CityWaitlistPayload = z.output<typeof cityWaitlistSchema>;
export type AdminCoverageZoneListQuery = z.output<typeof adminCoverageZoneListQuerySchema>;
export type AdminLeadListQuery = z.output<typeof adminLeadListQuerySchema>;
export type UpsertCoverageZonePayload = z.output<typeof upsertCoverageZoneSchema>;
export type UpdateCoverageLeadPayload = z.output<typeof updateCoverageLeadSchema>;
export type BulkCoverageImportPayload = z.output<typeof bulkCoverageImportSchema>;

const zoneInclude = {
  city: { select: { id: true, name: true, slug: true } },
  area: { select: { id: true, name: true, slug: true } },
  subArea: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.CoverageZoneInclude;

@Injectable()
export class CoverageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async check(input: CoverageCheckPayload, context: RequestContext): Promise<CoverageCheckResult> {
    const resolved = await this.resolveCity(input);

    if (!resolved || !isServiceCity(resolved.name)) {
      return {
        checkId: null,
        status: 'NOT_AVAILABLE',
        serviceable: false,
        outsideServiceCity: true,
        locationLabel: resolved?.name ?? input.cityName ?? 'Outside service area',
        city: resolved,
        area: null,
        subArea: null,
        expectedLiveDate: null,
        message: `We are not in ${resolved?.name ?? input.cityName ?? 'your city'} yet. Join the waitlist and we will write when ${SERVICE_CITY} expands.`,
        availablePlanCount: 0,
      };
    }

    if (!input.areaId && !input.subAreaId) {
      return {
        checkId: null,
        status: 'NOT_AVAILABLE',
        serviceable: false,
        outsideServiceCity: false,
        locationLabel: resolved.name,
        city: resolved,
        area: null,
        subArea: null,
        expectedLiveDate: null,
        message: `Pick a ${SERVICE_CITY} neighbourhood so we can check the street.`,
        availablePlanCount: 0,
      };
    }

    const zones = await this.prisma.coverageZone.findMany({
      where: {
        cityId: resolved.id,
        isActive: true,
        OR: [
          ...(input.subAreaId ? [{ subAreaId: input.subAreaId }] : []),
          ...(input.areaId ? [{ areaId: input.areaId, subAreaId: null }] : []),
          { areaId: null, subAreaId: null },
        ],
      },
      include: zoneInclude,
    });

    const match =
      zones.find((zone) => zone.subAreaId && zone.subAreaId === input.subAreaId) ??
      zones.find((zone) => zone.areaId && zone.areaId === input.areaId && !zone.subAreaId) ??
      zones.find((zone) => !zone.areaId && !zone.subAreaId);

    const status = match?.status ?? CoverageStatus.NOT_AVAILABLE;
    const area = match?.area ?? (input.areaId ? await this.prisma.area.findUnique({ where: { id: input.areaId }, select: { id: true, name: true, slug: true } }) : null);
    const subArea =
      match?.subArea ??
      (input.subAreaId
        ? await this.prisma.subArea.findUnique({ where: { id: input.subAreaId }, select: { id: true, name: true, slug: true } })
        : null);

    const locationLabel = [subArea?.name, area?.name, resolved.name].filter(Boolean).join(', ');
    const recorded = await this.prisma.coverageCheck.create({
      data: {
        cityId: resolved.id,
        areaId: input.areaId ?? null,
        subAreaId: input.subAreaId ?? null,
        address: input.address ?? null,
        mobile: input.mobile ?? null,
        result: status,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      },
    });

    const availablePlanCount =
      status === CoverageStatus.AVAILABLE
        ? await this.prisma.plan.count({ where: { status: 'PUBLISHED', deletedAt: null } })
        : 0;

    return {
      checkId: recorded.id,
      status,
      serviceable: status === CoverageStatus.AVAILABLE,
      outsideServiceCity: false,
      locationLabel,
      city: resolved,
      area,
      subArea,
      expectedLiveDate: match?.expectedLiveDate?.toISOString() ?? null,
      message:
        status === CoverageStatus.AVAILABLE
          ? `We can install on this ${SERVICE_CITY} street.`
          : status === CoverageStatus.COMING_SOON
            ? 'This neighbourhood is on the build list. Leave your number and we will call when the drop is ready.'
            : 'This street is not live yet. Register interest and we will come back when it is.',
      availablePlanCount,
    };
  }

  async createLead(input: CoverageLeadPayload, context: RequestContext): Promise<CoverageLeadDto> {
    const city = await this.prisma.city.findFirst({
      where: { id: input.cityId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!city) throw AppException.notFound('City');

    const created = await this.prisma.coverageLead.create({
      data: {
        checkId: input.checkId ?? null,
        name: input.name,
        mobile: input.mobile,
        email: input.email ?? null,
        cityId: input.cityId,
        areaId: input.areaId ?? null,
        subAreaId: input.subAreaId ?? null,
        address: input.address ?? null,
        notes: input.notes ?? null,
        coverageResult: CoverageStatus.NOT_AVAILABLE,
      },
      include: {
        city: { select: { name: true } },
        area: { select: { name: true } },
        assignedTo: { select: { firstName: true, lastName: true } },
      },
    });

    void context;
    return this.toLeadDto(created);
  }

  async joinWaitlist(input: CityWaitlistPayload): Promise<CityWaitlistDto> {
    if (isServiceCity(input.city)) {
      throw AppException.badRequest(`Use the coverage checker for ${SERVICE_CITY} streets.`);
    }

    const created = await this.prisma.cityWaitlist.create({
      data: { name: input.name, phone: input.phone, city: input.city.trim() },
    });

    return {
      id: created.id,
      name: created.name,
      phone: created.phone,
      city: created.city,
      createdAt: created.createdAt.toISOString(),
    };
  }

  async listWaitlist(): Promise<CityWaitlistDto[]> {
    const rows = await this.prisma.cityWaitlist.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      city: row.city,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async summary(): Promise<CoverageSummaryDto> {
    const cities = await this.prisma.city.findMany({
      where: { deletedAt: null, isActive: true },
      include: { _count: { select: { areas: true } }, areas: { select: { coverageStatus: true } } },
    });

    const mapped = cities.map((city) => ({
      cityId: city.id,
      cityName: city.name,
      citySlug: city.slug,
      province: city.province,
      isLive: isServiceCity(city.name) && city.isLive,
      availableAreas: city.areas.filter((area) => area.coverageStatus === CoverageStatus.AVAILABLE).length,
      comingSoonAreas: city.areas.filter((area) => area.coverageStatus === CoverageStatus.COMING_SOON).length,
      totalAreas: city._count.areas,
    }));

    return {
      cities: mapped.filter((city) => isServiceCity(city.cityName)),
      totalCities: 1,
      liveCities: mapped.some((city) => city.isLive) ? 1 : 0,
      totalAreasCovered: mapped.find((city) => isServiceCity(city.cityName))?.availableAreas ?? 0,
    };
  }

  async listZones(query: AdminCoverageZoneListQuery): Promise<Paginated<CoverageZoneDto>> {
    const { skip, take } = toPrismaPagination(query);
    const serviceCity = await this.prisma.city.findFirst({
      where: { slug: SERVICE_CITY_SLUG, deletedAt: null },
      select: { id: true },
    });
    const where: Prisma.CoverageZoneWhereInput = {
      cityId: query.cityId ?? serviceCity?.id,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' } }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.coverageZone.findMany({
        where,
        include: zoneInclude,
        orderBy: buildOrderBy(query.sort, query.order, ['updatedAt', 'name'], 'updatedAt'),
        skip,
        take,
      }),
      this.prisma.coverageZone.count({ where }),
    ]);
    return { items: rows.map((row) => this.toZoneDto(row)), pagination: buildPaginationMeta(query, total) };
  }

  async exportZones() {
    return this.prisma.coverageZone.findMany({
      where: { city: { slug: SERVICE_CITY_SLUG } },
      include: zoneInclude,
      orderBy: { name: 'asc' },
    });
  }

  async listLeads(query: AdminLeadListQuery): Promise<Paginated<CoverageLeadDto>> {
    const { skip, take } = toPrismaPagination(query);
    const where: Prisma.CoverageLeadWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.cityId ? { cityId: query.cityId } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { mobile: { contains: query.search } },
            ],
          }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.coverageLead.findMany({
        where,
        include: {
          city: { select: { name: true } },
          area: { select: { name: true } },
          assignedTo: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.coverageLead.count({ where }),
    ]);
    return { items: rows.map((row) => this.toLeadDto(row)), pagination: buildPaginationMeta(query, total) };
  }

  async upsertZone(
    body: UpsertCoverageZonePayload,
    actorId: string,
    context: RequestContext,
    id?: string,
  ): Promise<CoverageZoneDto> {
    await this.assertServiceCityId(body.cityId);
    const data = {
      name: body.name,
      cityId: body.cityId,
      areaId: body.areaId ?? null,
      subAreaId: body.subAreaId ?? null,
      status: body.status,
      expectedLiveDate: body.expectedLiveDate ?? null,
      capacityNote: body.capacityNote ?? null,
      isActive: body.isActive,
    };
    const row = id
      ? await this.prisma.coverageZone.update({ where: { id }, data, include: zoneInclude })
      : await this.prisma.coverageZone.create({ data, include: zoneInclude });
    await this.audit.record({
      userId: actorId,
      action: AuditAction.COVERAGE_UPDATED,
      entity: 'CoverageZone',
      entityId: row.id,
      context,
    });
    return this.toZoneDto(row);
  }

  async deleteZone(id: string, actorId: string, context: RequestContext): Promise<void> {
    await this.prisma.coverageZone.delete({ where: { id } });
    await this.audit.record({
      userId: actorId,
      action: AuditAction.COVERAGE_UPDATED,
      entity: 'CoverageZone',
      entityId: id,
      context,
    });
  }

  async importZones(
    body: BulkCoverageImportPayload,
    actorId: string,
    context: RequestContext,
  ): Promise<{ imported: number; createdAreas: number; createdSubAreas: number }> {
    let imported = 0;
    let createdAreas = 0;
    let createdSubAreas = 0;
    for (const row of body.rows) {
      if (row.citySlug !== SERVICE_CITY_SLUG) continue;
      const city = await this.prisma.city.findFirst({ where: { slug: row.citySlug, deletedAt: null } });
      if (!city) continue;
      const areaSlug = slugify(row.areaName);
      let area = await this.prisma.area.findFirst({ where: { cityId: city.id, slug: areaSlug } });
      if (!area) {
        area = await this.prisma.area.create({
          data: { cityId: city.id, name: row.areaName, slug: areaSlug, coverageStatus: row.status },
        });
        createdAreas += 1;
      }
      let subAreaId: string | null = null;
      if (row.subAreaName) {
        const subSlug = slugify(row.subAreaName);
        let sub = await this.prisma.subArea.findFirst({ where: { areaId: area.id, slug: subSlug } });
        if (!sub) {
          sub = await this.prisma.subArea.create({
            data: { areaId: area.id, name: row.subAreaName, slug: subSlug, coverageStatus: row.status },
          });
          createdSubAreas += 1;
        }
        subAreaId = sub.id;
      }
      await this.upsertZone(
        {
          name: row.subAreaName ? `${row.areaName} / ${row.subAreaName}` : row.areaName,
          cityId: city.id,
          areaId: area.id,
          subAreaId: subAreaId ?? undefined,
          status: row.status,
          expectedLiveDate: row.expectedLiveDate ? new Date(row.expectedLiveDate) : undefined,
          isActive: true,
        },
        actorId,
        context,
      );
      imported += 1;
    }
    return { imported, createdAreas, createdSubAreas };
  }

  async updateLead(
    id: string,
    body: UpdateCoverageLeadPayload,
    actorId: string,
    context: RequestContext,
  ): Promise<CoverageLeadDto> {
    const row = await this.prisma.coverageLead.update({
      where: { id },
      data: {
        status: body.status,
        assignedToId: body.assignedToId === undefined ? undefined : body.assignedToId,
        notes: body.notes,
      },
      include: {
        city: { select: { name: true } },
        area: { select: { name: true } },
        assignedTo: { select: { firstName: true, lastName: true } },
      },
    });
    await this.audit.record({
      userId: actorId,
      action: AuditAction.COVERAGE_UPDATED,
      entity: 'CoverageLead',
      entityId: id,
      context,
    });
    return this.toLeadDto(row);
  }

  private async resolveCity(input: CoverageCheckPayload): Promise<{ id: string; name: string; slug: string } | null> {
    if (input.lat != null && input.lng != null && !isWithinServiceBounds(input.lat, input.lng)) {
      return input.cityName && !isServiceCity(input.cityName)
        ? { id: '', name: input.cityName, slug: slugify(input.cityName) }
        : { id: '', name: input.cityName || 'Outside service area', slug: 'outside' };
    }

    if (input.cityId) {
      return this.prisma.city.findFirst({
        where: { id: input.cityId, deletedAt: null },
        select: { id: true, name: true, slug: true },
      });
    }

    if (input.cityName) {
      const slug = slugify(input.cityName);
      const city = await this.prisma.city.findFirst({
        where: { OR: [{ slug }, { name: { equals: input.cityName, mode: 'insensitive' } }], deletedAt: null },
        select: { id: true, name: true, slug: true },
      });
      return city ?? { id: '', name: input.cityName, slug };
    }

    if (input.lat != null && input.lng != null && isWithinServiceBounds(input.lat, input.lng)) {
      return this.prisma.city.findFirst({
        where: { slug: SERVICE_CITY_SLUG, deletedAt: null },
        select: { id: true, name: true, slug: true },
      });
    }

    return null;
  }

  private async assertServiceCityId(cityId: string): Promise<void> {
    const city = await this.prisma.city.findFirst({ where: { id: cityId }, select: { name: true } });
    if (!city || !isServiceCity(city.name)) {
      throw AppException.badRequest(`Coverage zones are limited to ${SERVICE_CITY}.`);
    }
  }

  private toZoneDto(row: Prisma.CoverageZoneGetPayload<{ include: typeof zoneInclude }>): CoverageZoneDto {
    return {
      id: row.id,
      name: row.name,
      cityId: row.cityId,
      cityName: row.city.name,
      areaId: row.areaId,
      areaName: row.area?.name ?? null,
      subAreaId: row.subAreaId,
      subAreaName: row.subArea?.name ?? null,
      status: row.status,
      expectedLiveDate: row.expectedLiveDate?.toISOString() ?? null,
      capacityNote: row.capacityNote,
      isActive: row.isActive,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toLeadDto(row: {
    id: string;
    name: string;
    mobile: string;
    email: string | null;
    cityId: string;
    areaId: string | null;
    subAreaId: string | null;
    address: string | null;
    notes: string | null;
    status: CoverageLeadDto['status'];
    coverageResult: CoverageLeadDto['coverageResult'];
    assignedToId: string | null;
    createdAt: Date;
    updatedAt: Date;
    city: { name: string };
    area: { name: string } | null;
    assignedTo: { firstName: string; lastName: string } | null;
  }): CoverageLeadDto {
    return {
      id: row.id,
      name: row.name,
      mobile: row.mobile,
      email: row.email,
      cityId: row.cityId,
      cityName: row.city.name,
      areaId: row.areaId,
      areaName: row.area?.name ?? null,
      subAreaId: row.subAreaId,
      address: row.address,
      notes: row.notes,
      status: row.status,
      coverageResult: row.coverageResult,
      assignedToId: row.assignedToId,
      assignedToName: row.assignedTo ? `${row.assignedTo.firstName} ${row.assignedTo.lastName}` : null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
