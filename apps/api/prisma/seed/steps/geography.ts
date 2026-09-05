import { CoverageStatus, type PrismaClient } from '@prisma/client';
import { seedCities } from '../data/geography';
import { dateOnly, logStep, slugify } from '../utils';

export interface SeededGeography {
  cityIdBySlug: Map<string, string>;
  areaIdByKey: Map<string, string>;
  subAreaIdByKey: Map<string, string>;
}

/**
 * PostgreSQL treats NULLs in a unique index as distinct, so a compound unique on
 * (city, area, sub_area) cannot be used with `upsert` when the narrower columns are null.
 * Matching explicitly keeps the seed idempotent.
 */
async function upsertCoverageZone(
  prisma: PrismaClient,
  input: {
    name: string;
    cityId: string;
    areaId: string | null;
    subAreaId: string | null;
    status: CoverageStatus;
    expectedLiveDate: Date | null;
  },
): Promise<void> {
  const existing = await prisma.coverageZone.findFirst({
    where: { cityId: input.cityId, areaId: input.areaId, subAreaId: input.subAreaId },
    select: { id: true },
  });

  if (existing) {
    await prisma.coverageZone.update({
      where: { id: existing.id },
      data: {
        name: input.name,
        status: input.status,
        expectedLiveDate: input.expectedLiveDate,
        isActive: true,
      },
    });
    return;
  }

  await prisma.coverageZone.create({ data: { ...input, isActive: true } });
}

/**
 * Creates the city / area / sub-area tree and a matching coverage zone for every node.
 *
 * A coverage zone is written at the most specific level available so the resolver can answer a
 * sub-area query directly, then fall back to the area and finally the city.
 */
export async function seedGeography(prisma: PrismaClient): Promise<SeededGeography> {
  const cityIdBySlug = new Map<string, string>();
  const areaIdByKey = new Map<string, string>();
  const subAreaIdByKey = new Map<string, string>();

  for (const [cityIndex, cityData] of seedCities.entries()) {
    const citySlug = slugify(cityData.name);
    const city = await prisma.city.upsert({
      where: { slug: citySlug },
      update: {
        name: cityData.name,
        code: cityData.code,
        dialCode: cityData.dialCode,
        province: cityData.province,
        isLive: cityData.isLive,
        latitude: cityData.latitude ?? null,
        longitude: cityData.longitude ?? null,
        branchAddress: cityData.branchAddress ?? null,
        displayOrder: cityIndex,
      },
      create: {
        name: cityData.name,
        slug: citySlug,
        code: cityData.code,
        dialCode: cityData.dialCode,
        province: cityData.province,
        isActive: true,
        isLive: cityData.isLive,
        latitude: cityData.latitude ?? null,
        longitude: cityData.longitude ?? null,
        branchAddress: cityData.branchAddress ?? null,
        displayOrder: cityIndex,
      },
    });
    cityIdBySlug.set(citySlug, city.id);

    // A city-level zone is the final fallback for an address we cannot resolve more precisely.
    const cityHasCoverage = cityData.areas.some(
      (area) => area.status === CoverageStatus.AVAILABLE,
    );
    await upsertCoverageZone(prisma, {
      name: `${cityData.name} — city default`,
      cityId: city.id,
      areaId: null,
      subAreaId: null,
      status: cityHasCoverage ? CoverageStatus.AVAILABLE : CoverageStatus.NOT_AVAILABLE,
      expectedLiveDate: null,
    });

    for (const [areaIndex, areaData] of cityData.areas.entries()) {
      const areaSlug = slugify(areaData.name);
      const area = await prisma.area.upsert({
        where: { cityId_slug: { cityId: city.id, slug: areaSlug } },
        update: {
          name: areaData.name,
          coverageStatus: areaData.status,
          expectedLiveDate: areaData.expectedLiveDate ? dateOnly(areaData.expectedLiveDate) : null,
          displayOrder: areaIndex,
        },
        create: {
          cityId: city.id,
          name: areaData.name,
          slug: areaSlug,
          coverageStatus: areaData.status,
          expectedLiveDate: areaData.expectedLiveDate ? dateOnly(areaData.expectedLiveDate) : null,
          isActive: true,
          displayOrder: areaIndex,
        },
      });
      areaIdByKey.set(`${citySlug}/${areaSlug}`, area.id);

      await upsertCoverageZone(prisma, {
        name: `${areaData.name}, ${cityData.name}`,
        cityId: city.id,
        areaId: area.id,
        subAreaId: null,
        status: areaData.status,
        expectedLiveDate: areaData.expectedLiveDate ? dateOnly(areaData.expectedLiveDate) : null,
      });

      for (const [subIndex, subAreaData] of (areaData.subAreas ?? []).entries()) {
        const subAreaSlug = slugify(subAreaData.name);
        const status = subAreaData.status ?? areaData.status;
        const expectedLiveDate = subAreaData.expectedLiveDate ?? areaData.expectedLiveDate;

        const subArea = await prisma.subArea.upsert({
          where: { areaId_slug: { areaId: area.id, slug: subAreaSlug } },
          update: {
            name: subAreaData.name,
            coverageStatus: status,
            expectedLiveDate: expectedLiveDate ? dateOnly(expectedLiveDate) : null,
            displayOrder: subIndex,
          },
          create: {
            areaId: area.id,
            name: subAreaData.name,
            slug: subAreaSlug,
            coverageStatus: status,
            expectedLiveDate: expectedLiveDate ? dateOnly(expectedLiveDate) : null,
            isActive: true,
            displayOrder: subIndex,
          },
        });
        subAreaIdByKey.set(`${citySlug}/${areaSlug}/${subAreaSlug}`, subArea.id);

        await upsertCoverageZone(prisma, {
          name: `${subAreaData.name}, ${areaData.name}, ${cityData.name}`,
          cityId: city.id,
          areaId: area.id,
          subAreaId: subArea.id,
          status,
          expectedLiveDate: expectedLiveDate ? dateOnly(expectedLiveDate) : null,
        });
      }
    }
  }

  logStep(
    `${cityIdBySlug.size} cities, ${areaIdByKey.size} areas, ${subAreaIdByKey.size} sub-areas and their coverage zones`,
  );

  return { cityIdBySlug, areaIdByKey, subAreaIdByKey };
}
