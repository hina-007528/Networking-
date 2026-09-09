import { Injectable } from '@nestjs/common';
import { PublishStatus, type Prisma } from '@prisma/client';
import { brand, publicRoutes, replaceLegacyBrandCopy } from '@stormfiber/config';
import type {
  CmsPageDto,
  CmsSectionDto,
  HeroSlideDto,
  HomepageDto,
  SiteSettingsDto,
} from '@stormfiber/types';
import type {
  updateSiteSettingsSchema,
  upsertCmsPageSchema,
  upsertCmsSectionSchema,
  upsertHeroSlideSchema,
} from '@stormfiber/validation';
import type { z } from 'zod';
import { AuditAction, AuditService } from '../../common/audit/audit.service';
import { CacheKeys, CacheNamespaces, CacheService } from '../../common/cache/cache.service';
import type { RequestContext } from '../../common/decorators/auth.decorators';
import { AppException } from '../../common/errors/app.exception';
import { PrismaService } from '../../common/prisma/prisma.service';
import { throwIfUniqueConflict } from '../../common/utils/prisma-errors';

export type UpsertHeroSlidePayload = z.output<typeof upsertHeroSlideSchema>;
export type UpsertCmsPagePayload = z.output<typeof upsertCmsPageSchema>;
export type UpsertCmsSectionPayload = z.output<typeof upsertCmsSectionSchema>;
export type UpdateSiteSettingsPayload = z.output<typeof updateSiteSettingsSchema>;

const CMS_TTL_SECONDS = 120;
const SETTINGS_KEY = 'site.settings';

const HERO_PHOTO_BACKGROUNDS = [
  '/hero-freedom.png',
  '/hero-speed.png',
  '/tv-bundle.png',
  '/hero-main.png',
  '/hero-fiber-bg.png',
];

function resolveHeroPhoto(url: string | null | undefined, order: number): string {
  const value = url?.trim() ?? '';
  if (!value || value.includes('/media/') || /\.svg($|\?)/i.test(value)) {
    return HERO_PHOTO_BACKGROUNDS[Math.max(0, order) % HERO_PHOTO_BACKGROUNDS.length];
  }
  return value;
}

const liveSlide = (now: Date): Prisma.HeroSlideWhereInput => ({
  OR: [
    {
      status: PublishStatus.PUBLISHED,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    {
      status: PublishStatus.SCHEDULED,
      publishedAt: { lte: now },
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
  ],
});

const livePage = (now: Date): Prisma.CmsPageWhereInput => ({
  OR: [
    { status: PublishStatus.PUBLISHED },
    { status: PublishStatus.SCHEDULED, publishedAt: { lte: now } },
  ],
});

const liveSection: Prisma.CmsSectionWhereInput = {
  status: PublishStatus.PUBLISHED,
};

const defaultSettings = (): SiteSettingsDto => ({
  brandName: brand.name,
  logoUrl: null,
  supportPhone: brand.supportPhoneDisplay,
  supportEmail: brand.supportEmail,
  announcement: null,
  socialLinks: brand.social.map((item) => ({ platform: item.platform, url: item.url })),
  footerColumns: [
    {
      title: 'Products',
      links: [
        { label: 'Internet', href: publicRoutes.internet, external: false },
        { label: 'TV', href: publicRoutes.tv, external: false },
        { label: 'Phone', href: publicRoutes.phone, external: false },
      ],
    },
    {
      title: 'Plans',
      links: [
        { label: 'Browse plans', href: publicRoutes.plans, external: false },
        { label: 'Compare', href: publicRoutes.compare, external: false },
        { label: 'Offers', href: publicRoutes.offers, external: false },
      ],
    },
    {
      title: 'Support',
      links: [
        { label: 'Help centre', href: publicRoutes.helpCenter, external: false },
        { label: 'FAQs', href: publicRoutes.faqs, external: false },
        { label: 'Contact', href: publicRoutes.contact, external: false },
        { label: 'Check coverage', href: publicRoutes.checkAvailability, external: false },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Terms', href: publicRoutes.terms, external: false },
        { label: 'Privacy', href: publicRoutes.privacy, external: false },
        { label: 'Fair usage', href: publicRoutes.fairUsage, external: false },
      ],
    },
  ],
  footerNote: `© ${new Date().getFullYear()} ${brand.legalName}`,
});

/**
 * Public CMS reads.
 *
 * Published content is cached; admin writes call `invalidate()` so the next visitor sees the
 * change without a deploy.
 */
@Injectable()
export class CmsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly audit: AuditService,
  ) {}

  homepage(): Promise<HomepageDto> {
    return this.cache.remember('cms:homepage', CMS_TTL_SECONDS, async () => {
      const [slides, sections, settings] = await Promise.all([
        this.loadSlides(),
        this.loadHomepageSections(),
        this.loadSettings(),
      ]);
      return { slides, sections, settings };
    });
  }

  heroSlides(): Promise<HeroSlideDto[]> {
    return this.cache.remember(CacheKeys.heroSlides, CMS_TTL_SECONDS, () => this.loadSlides());
  }

  settings(): Promise<SiteSettingsDto> {
    return this.cache.remember(CacheKeys.siteSettings, CMS_TTL_SECONDS, () => this.loadSettings());
  }

  page(slug: string): Promise<CmsPageDto> {
    return this.cache.remember(CacheKeys.cmsPage(slug), CMS_TTL_SECONDS, async () => {
      const now = new Date();
      const row = await this.prisma.cmsPage.findFirst({
        where: {
          slug,
          deletedAt: null,
          ...livePage(now),
        },
        include: {
          sections: {
            where: liveSection,
            orderBy: { displayOrder: 'asc' },
          },
        },
      });

      if (!row) {
        throw AppException.notFound('Page');
      }

      return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        excerpt: row.excerpt,
        body: row.body,
        status: row.status,
        seoTitle: row.seoTitle,
        seoDescription: row.seoDescription,
        ogImageUrl: row.ogImageUrl,
        noIndex: row.noIndex,
        sections: row.sections.map((section) => this.toSectionDto(section, row.slug)),
        publishedAt: row.publishedAt?.toISOString() ?? null,
        updatedAt: row.updatedAt.toISOString(),
      };
    });
  }

  async invalidate(): Promise<void> {
    await this.cache.invalidateNamespace(CacheNamespaces.cms);
    await this.cache.del('cms:homepage');
  }

  private async loadSlides(): Promise<HeroSlideDto[]> {
    const rows = await this.prisma.heroSlide.findMany({
      where: liveSlide(new Date()),
      orderBy: { displayOrder: 'asc' },
    });
    return rows.map((row) => this.toSlideDto(row));
  }

  private async loadHomepageSections(): Promise<CmsSectionDto[]> {
    const rows = await this.prisma.cmsSection.findMany({
      where: { pageId: null, ...liveSection },
      orderBy: { displayOrder: 'asc' },
    });
    return rows.map((row) => this.toSectionDto(row, null));
  }

  private async loadSettings(): Promise<SiteSettingsDto> {
    const stored = await this.prisma.systemSetting.findUnique({
      where: { key: SETTINGS_KEY },
    });
    const defaults = defaultSettings();

    if (!stored || typeof stored.value !== 'object' || stored.value === null || Array.isArray(stored.value)) {
      return defaults;
    }

    const value = stored.value as Partial<SiteSettingsDto>;
    return replaceLegacyBrandCopy({
      brandName: value.brandName ?? defaults.brandName,
      logoUrl: value.logoUrl ?? defaults.logoUrl,
      supportPhone: value.supportPhone ?? defaults.supportPhone,
      supportEmail: value.supportEmail ?? defaults.supportEmail,
      announcement: value.announcement ?? defaults.announcement,
      socialLinks: value.socialLinks ?? defaults.socialLinks,
      footerColumns: value.footerColumns ?? defaults.footerColumns,
      footerNote: value.footerNote ?? defaults.footerNote,
    });
  }

  private toSlideDto(row: {
    id: string;
    eyebrow: string | null;
    headline: string;
    headlineAccent: string | null;
    subheadline: string | null;
    desktopImageUrl: string | null;
    mobileImageUrl: string | null;
    videoUrl: string | null;
    imageAlt: string;
    primaryCtaLabel: string | null;
    primaryCtaHref: string | null;
    secondaryCtaLabel: string | null;
    secondaryCtaHref: string | null;
    theme: 'DARK' | 'LIGHT';
    status: PublishStatus;
    displayOrder: number;
    publishedAt: Date | null;
    expiresAt: Date | null;
  }): HeroSlideDto {
    return {
      id: row.id,
      eyebrow: row.eyebrow,
      headline: row.headline,
      headlineAccent: row.headlineAccent,
      subheadline: row.subheadline,
      desktopImageUrl: resolveHeroPhoto(row.desktopImageUrl ?? row.mobileImageUrl, row.displayOrder),
      mobileImageUrl: resolveHeroPhoto(row.mobileImageUrl ?? row.desktopImageUrl, row.displayOrder),
      videoUrl: row.videoUrl,
      imageAlt: row.imageAlt,
      primaryCtaLabel: row.primaryCtaLabel,
      primaryCtaHref: row.primaryCtaHref,
      secondaryCtaLabel: row.secondaryCtaLabel,
      secondaryCtaHref: row.secondaryCtaHref,
      theme: row.theme,
      status: row.status,
      displayOrder: row.displayOrder,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      expiresAt: row.expiresAt?.toISOString() ?? null,
    };
  }

  private toSectionDto(
    row: {
      id: string;
      key: string;
      kind: CmsSectionDto['kind'];
      eyebrow: string | null;
      heading: string | null;
      headingAccent: string | null;
      subheading: string | null;
      body: string | null;
      ctaLabel: string | null;
      ctaHref: string | null;
      imageUrl: string | null;
      content: Prisma.JsonValue;
      status: PublishStatus;
      displayOrder: number;
    },
    pageSlug: string | null,
  ): CmsSectionDto {
    return {
      id: row.id,
      key: row.key,
      kind: row.kind,
      eyebrow: row.eyebrow,
      heading: row.heading,
      headingAccent: row.headingAccent,
      subheading: row.subheading,
      body: row.body,
      ctaLabel: row.ctaLabel,
      ctaHref: row.ctaHref,
      imageUrl: row.imageUrl,
      content: (row.content ?? {}) as Record<string, unknown>,
      status: row.status,
      displayOrder: row.displayOrder,
      pageSlug,
    };
  }

  async listSlides(): Promise<HeroSlideDto[]> {
    const rows = await this.prisma.heroSlide.findMany({ orderBy: { displayOrder: 'asc' } });
    return rows.map((row) => this.toSlideDto(row));
  }

  async upsertSlide(
    input: UpsertHeroSlidePayload,
    actorId: string,
    context: RequestContext,
    id?: string,
  ): Promise<HeroSlideDto> {
    const data = {
      eyebrow: input.eyebrow ?? null,
      headline: input.headline,
      headlineAccent: input.headlineAccent ?? null,
      subheadline: input.subheadline ?? null,
      desktopImageUrl: input.desktopImageUrl ?? null,
      mobileImageUrl: input.mobileImageUrl ?? null,
      videoUrl: input.videoUrl ?? null,
      imageAlt: input.imageAlt,
      primaryCtaLabel: input.primaryCtaLabel ?? null,
      primaryCtaHref: input.primaryCtaHref ?? null,
      secondaryCtaLabel: input.secondaryCtaLabel ?? null,
      secondaryCtaHref: input.secondaryCtaHref ?? null,
      theme: input.theme,
      status: input.status,
      displayOrder: input.displayOrder,
      publishedAt: input.publishedAt ?? (input.status === 'PUBLISHED' ? new Date() : null),
      expiresAt: input.expiresAt ?? null,
    };

    const row = id
      ? await this.prisma.heroSlide.update({ where: { id }, data })
      : await this.prisma.heroSlide.create({ data });

    await this.afterCmsWrite(actorId, context, row.id, 'HeroSlide', input.status, input);
    return this.toSlideDto(row);
  }

  async deleteSlide(id: string, actorId: string, context: RequestContext): Promise<void> {
    await this.prisma.heroSlide.delete({ where: { id } }).catch(() => {
      throw AppException.notFound('Hero slide');
    });
    await this.afterCmsWrite(actorId, context, id, 'HeroSlide', 'ARCHIVED', { deleted: true });
  }

  async listPages(): Promise<CmsPageDto[]> {
    const rows = await this.prisma.cmsPage.findMany({
      where: { deletedAt: null },
      include: { sections: { orderBy: { displayOrder: 'asc' } } },
      orderBy: { title: 'asc' },
    });
    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt,
      body: row.body,
      status: row.status,
      seoTitle: row.seoTitle,
      seoDescription: row.seoDescription,
      ogImageUrl: row.ogImageUrl,
      noIndex: row.noIndex,
      sections: row.sections.map((section) => this.toSectionDto(section, row.slug)),
      publishedAt: row.publishedAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async upsertPage(
    input: UpsertCmsPagePayload,
    actorId: string,
    context: RequestContext,
    id?: string,
  ): Promise<CmsPageDto> {
    try {
      const row = id
        ? await this.prisma.cmsPage.update({
            where: { id },
            data: {
              slug: input.slug,
              title: input.title,
              excerpt: input.excerpt ?? null,
              body: input.body ?? null,
              status: input.status,
              seoTitle: input.seoTitle ?? null,
              seoDescription: input.seoDescription ?? null,
              ogImageUrl: input.ogImageUrl ?? null,
              noIndex: input.noIndex,
              publishedAt: input.publishedAt ?? (input.status === 'PUBLISHED' ? new Date() : null),
            },
            include: { sections: { orderBy: { displayOrder: 'asc' } } },
          })
        : await this.prisma.cmsPage.create({
            data: {
              slug: input.slug,
              title: input.title,
              excerpt: input.excerpt ?? null,
              body: input.body ?? null,
              status: input.status,
              seoTitle: input.seoTitle ?? null,
              seoDescription: input.seoDescription ?? null,
              ogImageUrl: input.ogImageUrl ?? null,
              noIndex: input.noIndex,
              publishedAt: input.publishedAt ?? (input.status === 'PUBLISHED' ? new Date() : null),
            },
            include: { sections: { orderBy: { displayOrder: 'asc' } } },
          });

      await this.afterCmsWrite(actorId, context, row.id, 'CmsPage', input.status, input);
      return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        excerpt: row.excerpt,
        body: row.body,
        status: row.status,
        seoTitle: row.seoTitle,
        seoDescription: row.seoDescription,
        ogImageUrl: row.ogImageUrl,
        noIndex: row.noIndex,
        sections: row.sections.map((section) => this.toSectionDto(section, row.slug)),
        publishedAt: row.publishedAt?.toISOString() ?? null,
        updatedAt: row.updatedAt.toISOString(),
      };
    } catch (error) {
      throwIfUniqueConflict(error, 'A page with that slug already exists');
    }
  }

  async listSections(): Promise<CmsSectionDto[]> {
    const rows = await this.prisma.cmsSection.findMany({
      include: { page: { select: { slug: true } } },
      orderBy: { displayOrder: 'asc' },
    });
    return rows.map((row) => this.toSectionDto(row, row.page?.slug ?? null));
  }

  async upsertSection(
    input: UpsertCmsSectionPayload,
    actorId: string,
    context: RequestContext,
    id?: string,
  ): Promise<CmsSectionDto> {
    try {
      const row = id
        ? await this.prisma.cmsSection.update({
            where: { id },
            data: {
              key: input.key,
              kind: input.kind,
              eyebrow: input.eyebrow ?? null,
              heading: input.heading ?? null,
              headingAccent: input.headingAccent ?? null,
              subheading: input.subheading ?? null,
              body: input.body ?? null,
              ctaLabel: input.ctaLabel ?? null,
              ctaHref: input.ctaHref ?? null,
              imageUrl: input.imageUrl ?? null,
              content: input.content as Prisma.InputJsonValue,
              status: input.status,
              displayOrder: input.displayOrder,
              pageId: input.pageId ?? null,
            },
            include: { page: { select: { slug: true } } },
          })
        : await this.prisma.cmsSection.create({
            data: {
              key: input.key,
              kind: input.kind,
              eyebrow: input.eyebrow ?? null,
              heading: input.heading ?? null,
              headingAccent: input.headingAccent ?? null,
              subheading: input.subheading ?? null,
              body: input.body ?? null,
              ctaLabel: input.ctaLabel ?? null,
              ctaHref: input.ctaHref ?? null,
              imageUrl: input.imageUrl ?? null,
              content: input.content as Prisma.InputJsonValue,
              status: input.status,
              displayOrder: input.displayOrder,
              pageId: input.pageId ?? null,
            },
            include: { page: { select: { slug: true } } },
          });

      await this.afterCmsWrite(actorId, context, row.id, 'CmsSection', input.status, input);
      return this.toSectionDto(row, row.page?.slug ?? null);
    } catch (error) {
      throwIfUniqueConflict(error, 'A section with that key already exists');
    }
  }

  async updateSettings(
    input: UpdateSiteSettingsPayload,
    actorId: string,
    context: RequestContext,
  ): Promise<SiteSettingsDto> {
    const current = await this.loadSettings();
    const next: SiteSettingsDto = {
      ...current,
      ...(input.brandName === undefined ? {} : { brandName: input.brandName }),
      ...(input.logoUrl === undefined ? {} : { logoUrl: input.logoUrl ?? null }),
      ...(input.supportPhone === undefined ? {} : { supportPhone: input.supportPhone }),
      ...(input.supportEmail === undefined ? {} : { supportEmail: input.supportEmail }),
      ...(input.socialLinks === undefined ? {} : { socialLinks: input.socialLinks }),
      ...(input.footerColumns === undefined ? {} : { footerColumns: input.footerColumns }),
      ...(input.footerNote === undefined ? {} : { footerNote: input.footerNote }),
      announcement:
        input.announcementMessage === undefined
          ? current.announcement
          : input.announcementMessage
            ? { message: input.announcementMessage, href: input.announcementHref ?? null }
            : null,
    };

    await this.prisma.systemSetting.upsert({
      where: { key: SETTINGS_KEY },
      create: {
        key: SETTINGS_KEY,
        value: next as unknown as Prisma.InputJsonValue,
        description: 'Public site chrome',
        updatedById: actorId,
      },
      update: {
        value: next as unknown as Prisma.InputJsonValue,
        updatedById: actorId,
      },
    });

    await this.afterCmsWrite(actorId, context, SETTINGS_KEY, 'SystemSetting', 'PUBLISHED', input);
    return next;
  }

  private async afterCmsWrite(
    actorId: string,
    context: RequestContext,
    entityId: string,
    entity: string,
    status: string,
    newValue: unknown,
  ): Promise<void> {
    await this.invalidate();
    await this.audit.record({
      userId: actorId,
      action: status === 'PUBLISHED' ? AuditAction.CONTENT_PUBLISHED : AuditAction.CONTENT_UPDATED,
      entity,
      entityId,
      newValue,
      context,
    });
  }
}
