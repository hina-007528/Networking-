import {
  DiscountKind,
  type Prisma,
  type PrismaClient,
  PublishStatus,
  TaxKind,
  TaxTarget,
} from '@prisma/client';
import {
  seedAddons,
  seedCityPriceAdjustments,
  seedCityTaxOverrides,
  seedPlanCategories,
  seedPlans,
  seedProducts,
  seedPromotions,
  seedTaxRules,
} from '../data/catalog';
import { adjustPrice, decimal, logStep } from '../utils';

export interface SeededCatalog {
  planIdBySlug: Map<string, string>;
  addonIdBySlug: Map<string, string>;
}

export async function seedCatalog(
  prisma: PrismaClient,
  cityIdBySlug: Map<string, string>,
): Promise<SeededCatalog> {
  logStep('tax rules');
  const taxRuleIdByCode = new Map<string, string>();
  for (const rule of seedTaxRules) {
    const record = await prisma.taxRule.upsert({
      where: { code: rule.code },
      update: {
        label: rule.label,
        kind: rule.kind as TaxKind,
        rate: rule.rate,
        appliesTo: rule.appliesTo as unknown as TaxTarget[],
        isActive: true,
      },
      create: {
        code: rule.code,
        label: rule.label,
        kind: rule.kind as TaxKind,
        rate: rule.rate,
        appliesTo: rule.appliesTo as unknown as TaxTarget[],
        isActive: true,
      },
    });
    taxRuleIdByCode.set(rule.code, record.id);
  }

  for (const override of seedCityTaxOverrides) {
    const cityId = cityIdBySlug.get(override.citySlug);
    const taxRuleId = taxRuleIdByCode.get(override.taxCode);
    if (!cityId || !taxRuleId) continue;

    await prisma.cityTaxRule.upsert({
      where: { cityId_taxRuleId: { cityId, taxRuleId } },
      update: { rateOverride: override.rate, isActive: true },
      create: { cityId, taxRuleId, rateOverride: override.rate, isActive: true },
    });
  }

  logStep('products and product features');
  for (const product of seedProducts) {
    const record = await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        name: product.name,
        serviceType: product.serviceType,
        tagline: product.tagline,
        description: product.description,
        heroHeadline: product.heroHeadline,
        heroSubheadline: product.heroSubheadline,
        iconKey: product.iconKey,
        status: PublishStatus.PUBLISHED,
        displayOrder: product.displayOrder,
        seoTitle: product.seoTitle,
        seoDescription: product.seoDescription,
      },
      create: {
        name: product.name,
        slug: product.slug,
        serviceType: product.serviceType,
        tagline: product.tagline,
        description: product.description,
        heroHeadline: product.heroHeadline,
        heroSubheadline: product.heroSubheadline,
        iconKey: product.iconKey,
        status: PublishStatus.PUBLISHED,
        displayOrder: product.displayOrder,
        seoTitle: product.seoTitle,
        seoDescription: product.seoDescription,
      },
    });

    await prisma.productFeature.deleteMany({ where: { productId: record.id } });
    await prisma.productFeature.createMany({
      data: product.features.map((feature, index) => ({
        productId: record.id,
        title: feature.title,
        description: feature.description,
        iconKey: feature.iconKey,
        displayOrder: index,
      })),
    });
  }

  logStep('plan categories');
  const categoryIdBySlug = new Map<string, string>();
  for (const category of seedPlanCategories) {
    const record = await prisma.planCategory.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        kind: category.kind,
        description: category.description,
        displayOrder: category.displayOrder,
      },
      create: {
        name: category.name,
        slug: category.slug,
        kind: category.kind,
        description: category.description,
        displayOrder: category.displayOrder,
      },
    });
    categoryIdBySlug.set(category.slug, record.id);
  }

  logStep('add-ons');
  const addonIdBySlug = new Map<string, string>();
  for (const addon of seedAddons) {
    const record = await prisma.planAddon.upsert({
      where: { slug: addon.slug },
      update: {
        name: addon.name,
        description: addon.description,
        serviceType: addon.serviceType,
        monthlyPrice: decimal(addon.monthlyPrice),
        oneTimePrice: decimal(addon.oneTimePrice),
        isActive: true,
        displayOrder: addon.displayOrder,
      },
      create: {
        name: addon.name,
        slug: addon.slug,
        description: addon.description,
        serviceType: addon.serviceType,
        monthlyPrice: decimal(addon.monthlyPrice),
        oneTimePrice: decimal(addon.oneTimePrice),
        isActive: true,
        displayOrder: addon.displayOrder,
      },
    });
    addonIdBySlug.set(addon.slug, record.id);
  }

  logStep('promotions');
  const promotionIdBySlug = new Map<string, string>();
  for (const promotion of seedPromotions) {
    const record = await prisma.promotion.upsert({
      where: { slug: promotion.slug },
      update: {
        name: promotion.name,
        description: promotion.description,
        code: promotion.code,
        discountKind: promotion.discountKind as DiscountKind,
        discountValue: decimal(promotion.discountValue),
        durationMonths: promotion.durationMonths ?? null,
        badgeText: promotion.badgeText,
        status: promotion.status,
        startsAt: new Date(promotion.startsAt),
        endsAt: new Date(promotion.endsAt),
      },
      create: {
        name: promotion.name,
        slug: promotion.slug,
        description: promotion.description,
        code: promotion.code,
        discountKind: promotion.discountKind as DiscountKind,
        discountValue: decimal(promotion.discountValue),
        durationMonths: promotion.durationMonths ?? null,
        badgeText: promotion.badgeText,
        status: promotion.status,
        startsAt: new Date(promotion.startsAt),
        endsAt: new Date(promotion.endsAt),
      },
    });
    promotionIdBySlug.set(promotion.slug, record.id);
  }

  logStep('plans, features, add-on links and city pricing');
  const planIdBySlug = new Map<string, string>();
  for (const [index, plan] of seedPlans.entries()) {
    const record = await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: {
        name: plan.name,
        description: plan.description,
        shortDescription: plan.shortDescription,
        kind: plan.kind,
        categoryId: categoryIdBySlug.get(plan.categorySlug) ?? null,
        promotionId: plan.promotionSlug ? promotionIdBySlug.get(plan.promotionSlug) ?? null : null,
        services: plan.services,
        speedMbps: plan.speedMbps ?? null,
        uploadMbps: plan.uploadMbps ?? null,
        tvChannels: plan.tvChannels ?? null,
        voiceMinutes: plan.voiceMinutes ?? null,
        monthlyPrice: decimal(plan.monthlyPrice),
        installationPrice: decimal(plan.installationPrice),
        status: plan.status ?? PublishStatus.PUBLISHED,
        featured: plan.featured ?? false,
        displayOrder: index,
        badgeText: plan.badgeText ?? null,
        metadata: (plan.metadata ?? {}) as Prisma.InputJsonObject,
        publishedAt: new Date(),
      },
      create: {
        name: plan.name,
        slug: plan.slug,
        description: plan.description,
        shortDescription: plan.shortDescription,
        kind: plan.kind,
        categoryId: categoryIdBySlug.get(plan.categorySlug) ?? null,
        promotionId: plan.promotionSlug ? promotionIdBySlug.get(plan.promotionSlug) ?? null : null,
        services: plan.services,
        speedMbps: plan.speedMbps ?? null,
        uploadMbps: plan.uploadMbps ?? null,
        tvChannels: plan.tvChannels ?? null,
        voiceMinutes: plan.voiceMinutes ?? null,
        monthlyPrice: decimal(plan.monthlyPrice),
        installationPrice: decimal(plan.installationPrice),
        status: plan.status ?? PublishStatus.PUBLISHED,
        featured: plan.featured ?? false,
        displayOrder: index,
        badgeText: plan.badgeText ?? null,
        metadata: (plan.metadata ?? {}) as Prisma.InputJsonObject,
        seoTitle: `${plan.name} â€” ${plan.shortDescription}`.slice(0, 70),
        seoDescription: plan.shortDescription,
        publishedAt: new Date(),
      },
    });
    planIdBySlug.set(plan.slug, record.id);

    await prisma.planFeature.deleteMany({ where: { planId: record.id } });
    await prisma.planFeature.createMany({
      data: plan.features.map((feature, featureIndex) => ({
        planId: record.id,
        label: feature.label,
        value: feature.value ?? null,
        iconKey: feature.iconKey ?? null,
        highlighted: feature.highlighted ?? false,
        displayOrder: featureIndex,
      })),
    });

    await prisma.planAddonLink.deleteMany({ where: { planId: record.id } });
    const addonIds = (plan.addonSlugs ?? [])
      .map((slug) => addonIdBySlug.get(slug))
      .filter((id): id is string => Boolean(id));
    if (addonIds.length > 0) {
      await prisma.planAddonLink.createMany({
        data: addonIds.map((addonId) => ({ planId: record.id, addonId })),
        skipDuplicates: true,
      });
    }

    // A PlanPrice row is what makes a plan purchasable in a city, so only cities listed here
    // sell this plan. Everywhere else the plan is simply not offered.
    for (const adjustment of seedCityPriceAdjustments) {
      const cityId = cityIdBySlug.get(adjustment.citySlug);
      if (!cityId) continue;

      const monthlyPrice = adjustPrice(plan.monthlyPrice, adjustment.adjustmentPercent);
      const installationPrice = adjustPrice(plan.installationPrice, adjustment.adjustmentPercent);

      await prisma.planPrice.upsert({
        where: { planId_cityId: { planId: record.id, cityId } },
        update: {
          monthlyPrice: decimal(monthlyPrice),
          installationPrice: decimal(installationPrice),
          isActive: true,
        },
        create: {
          planId: record.id,
          cityId,
          monthlyPrice: decimal(monthlyPrice),
          installationPrice: decimal(installationPrice),
          isActive: true,
        },
      });
    }
  }

  logStep(`${planIdBySlug.size} plans priced across ${seedCityPriceAdjustments.length} cities`);

  return { planIdBySlug, addonIdBySlug };
}

