import { type PrismaClient, PublishStatus } from '@prisma/client';
import {
  seedCmsPages,
  seedCmsSections,
  seedHeroSlides,
  seedSiteSettings,
} from '../data/content';
import { logStep } from '../utils';

export async function seedContent(prisma: PrismaClient): Promise<void> {
  logStep('hero slides');
  for (const slide of seedHeroSlides) {
    const existing = await prisma.heroSlide.findFirst({
      where: { headline: slide.headline, displayOrder: slide.displayOrder },
      select: { id: true },
    });

    const data = {
      eyebrow: slide.eyebrow,
      headline: slide.headline,
      headlineAccent: slide.headlineAccent,
      subheadline: slide.subheadline,
      desktopImageUrl: slide.desktopImageUrl,
      mobileImageUrl: slide.mobileImageUrl,
      imageAlt: slide.imageAlt,
      primaryCtaLabel: slide.primaryCtaLabel,
      primaryCtaHref: slide.primaryCtaHref,
      secondaryCtaLabel: slide.secondaryCtaLabel,
      secondaryCtaHref: slide.secondaryCtaHref,
      theme: slide.theme,
      status: slide.status,
      displayOrder: slide.displayOrder,
      publishedAt: new Date(),
    };

    if (existing) {
      await prisma.heroSlide.update({ where: { id: existing.id }, data });
    } else {
      await prisma.heroSlide.create({ data });
    }
  }

  logStep('cms pages');
  const pageIdBySlug = new Map<string, string>();
  for (const page of seedCmsPages) {
    const record = await prisma.cmsPage.upsert({
      where: { slug: page.slug },
      update: {
        title: page.title,
        excerpt: page.excerpt,
        body: page.body,
        status: page.status,
        seoTitle: page.seoTitle,
        seoDescription: page.seoDescription,
        publishedAt: new Date(),
      },
      create: {
        slug: page.slug,
        title: page.title,
        excerpt: page.excerpt,
        body: page.body,
        status: page.status,
        seoTitle: page.seoTitle,
        seoDescription: page.seoDescription,
        publishedAt: new Date(),
      },
    });
    pageIdBySlug.set(page.slug, record.id);
  }

  logStep('cms sections');
  for (const section of seedCmsSections) {
    await prisma.cmsSection.upsert({
      where: { key: section.key },
      update: {
        kind: section.kind,
        eyebrow: section.eyebrow ?? null,
        heading: section.heading ?? null,
        headingAccent: section.headingAccent ?? null,
        subheading: section.subheading ?? null,
        ctaLabel: section.ctaLabel ?? null,
        ctaHref: section.ctaHref ?? null,
        content: section.content,
        status: section.status,
        displayOrder: section.displayOrder,
      },
      create: {
        key: section.key,
        kind: section.kind,
        eyebrow: section.eyebrow ?? null,
        heading: section.heading ?? null,
        headingAccent: section.headingAccent ?? null,
        subheading: section.subheading ?? null,
        ctaLabel: section.ctaLabel ?? null,
        ctaHref: section.ctaHref ?? null,
        content: section.content,
        status: section.status,
        displayOrder: section.displayOrder,
      },
    });
  }

  logStep('site settings');
  await prisma.systemSetting.upsert({
    where: { key: 'site.settings' },
    update: { value: seedSiteSettings },
    create: {
      key: 'site.settings',
      value: seedSiteSettings,
      description: 'Brand name, contact details, announcement bar, social and footer navigation.',
    },
  });

  await prisma.systemSetting.upsert({
    where: { key: 'billing.policy' },
    update: {},
    create: {
      key: 'billing.policy',
      value: {
        generationDayOfMonth: 1,
        dueDayOfMonth: 10,
        overdueGraceDays: 0,
        suspensionAfterDays: 20,
        advancePaymentDiscountPercentage: 5,
      },
      description: 'Invoice generation and due-date rules used by the billing scheduler.',
    },
  });

  const publishedPages = await prisma.cmsPage.count({ where: { status: PublishStatus.PUBLISHED } });
  logStep(`${publishedPages} published pages`);
}
