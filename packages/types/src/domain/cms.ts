import type { CmsSectionKind, NotificationChannel, PublishStatus } from '../enums';

export interface HeroSlideDto {
  id: string;
  eyebrow: string | null;
  headline: string;
  /** Rendered in the accent colour inside the headline. */
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
  publishedAt: string | null;
  expiresAt: string | null;
}

export interface CmsSectionDto {
  id: string;
  key: string;
  kind: CmsSectionKind;
  eyebrow: string | null;
  heading: string | null;
  headingAccent: string | null;
  subheading: string | null;
  body: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  imageUrl: string | null;
  /** Section-specific structured content (cards, stats, feature lists). */
  content: Record<string, unknown>;
  status: PublishStatus;
  displayOrder: number;
  pageSlug: string | null;
}

export interface CmsPageDto {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string | null;
  status: PublishStatus;
  seoTitle: string | null;
  seoDescription: string | null;
  ogImageUrl: string | null;
  noIndex: boolean;
  sections: CmsSectionDto[];
  publishedAt: string | null;
  updatedAt: string;
}

export interface NavigationLinkDto {
  label: string;
  href: string;
  external: boolean;
  children?: NavigationLinkDto[];
}

export interface FooterColumnDto {
  title: string;
  links: NavigationLinkDto[];
}

export interface SiteSettingsDto {
  brandName: string;
  logoUrl: string | null;
  supportPhone: string;
  supportEmail: string;
  announcement: { message: string; href: string | null } | null;
  socialLinks: { platform: string; url: string }[];
  footerColumns: FooterColumnDto[];
  footerNote: string;
}

export interface NotificationDto {
  id: string;
  event: string;
  channel: NotificationChannel;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface MediaAssetDto {
  id: string;
  key: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  width: number | null;
  height: number | null;
  altText: string | null;
  createdAt: string;
}
