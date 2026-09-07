import type { CmsPageDto } from '@stormfiber/types';
import { PageHero } from '@/components/page-hero';
import { apiGet } from '@/lib/api';
import { heroImages } from '@/lib/hero-images';

export default async function TermsPage() {
  const page = await apiGet<CmsPageDto>('/cms/pages/terms-and-conditions').catch(() => null);

  return (
    <>
      <PageHero heading={page?.title ?? 'Terms & Conditions'} subheading={page?.excerpt ?? undefined} image={heroImages.terms} />
      <div className="sf-container max-w-4xl py-12">
        {page?.body ? (
          <article className="sf-card whitespace-pre-line p-6 text-sm leading-7 text-[#5d6b7a] sm:p-8">{page.body}</article>
        ) : (
          <p className="rounded-2xl border border-[#E6EEF6] bg-white px-6 py-10 text-center text-[#6B7280]">
            Terms have not been published in CMS yet.
          </p>
        )}
      </div>
    </>
  );
}
