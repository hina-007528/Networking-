import { PrismaClient } from '@prisma/client';
import { seedRbac } from './seed/steps/rbac';
import { seedGeography } from './seed/steps/geography';
import { seedCatalog } from './seed/steps/catalog';
import { seedContent } from './seed/steps/content';
import { seedSupport } from './seed/steps/support';
import { seedDemoData } from './seed/steps/demo';

/**
 * Development seed.
 *
 * Every step is idempotent, so the script can be re-run against an existing database without
 * duplicating rows. Credentials come from the environment — no password is hard-coded here.
 */
const prisma = new PrismaClient();

async function main(): Promise<void> {
  const startedAt = Date.now();
  console.log('Seeding StormFiber development data\n');

  console.log('Access control');
  const staff = await seedRbac(prisma);

  console.log('\nGeography and coverage');
  const geography = await seedGeography(prisma);

  console.log('\nCatalog');
  const catalog = await seedCatalog(prisma, geography.cityIdBySlug);

  console.log('\nContent');
  await seedContent(prisma);

  console.log('\nSupport');
  const support = await seedSupport(prisma);

  if (process.env.SEED_DEMO_CUSTOMER === 'true') {
    console.log('\nDemo account and activity');
    await seedDemoData(prisma, {
      cityIdBySlug: geography.cityIdBySlug,
      areaIdByKey: geography.areaIdByKey,
      subAreaIdByKey: geography.subAreaIdByKey,
      planIdBySlug: catalog.planIdBySlug,
      addonIdBySlug: catalog.addonIdBySlug,
      supportCategoryIdBySlug: support.supportCategoryIdBySlug,
      staff,
    });
  } else {
    console.log('\nSkipping demo customer seed');
  }

  console.log(`\nSeed complete in ${((Date.now() - startedAt) / 1000).toFixed(1)}s`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
