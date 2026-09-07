import type { Metadata } from 'next';
import { brand, SERVICE_CITY } from '@stormfiber/config';
import type { CmsPageDto, CityDto, SiteSettingsDto } from '@stormfiber/types';
import { PageHero } from '@/components/page-hero';
import { apiGet } from '@/lib/api';
import { heroImages } from '@/lib/hero-images';

export const metadata: Metadata = {
  title: 'About',
  description: `How ${brand.name} builds fibre for ${SERVICE_CITY} homes — and where to find us.`,
};

export default async function AboutPage() {
  const [page, cities, settings] = await Promise.all([
    apiGet<CmsPageDto>('/cms/pages/about').catch(() => null),
    apiGet<CityDto[]>('/cities').catch(() => [] as CityDto[]),
    apiGet<SiteSettingsDto>('/cms/settings').catch(() => null),
  ]);
  const offices = cities.filter((city) => city.branchAddress);

  return (
    <>
      <PageHero
        heading={page?.title ?? 'A Lahore network,'}
        accent={page?.excerpt ? undefined : 'built for the house'}
        subheading={page?.excerpt ?? brand.tagline}
        image={heroImages.about}
      />
      <div className="sf-container grid gap-8 py-12 lg:grid-cols-2">
        <article className="space-y-4 text-[#4B5563]">
          {page?.body ? (
            <div className="whitespace-pre-line text-sm leading-7">{page.body}</div>
          ) : (
            <>
              <h2 className="sf-h3">Our story</h2>
              <p>
                Majawar X Network is a fibre internet provider based in Lahore. Publish an About page in the
                admin CMS to replace this placeholder with operator-owned copy.
              </p>
            </>
          )}
        </article>
        <div className="grid gap-4">
          {offices.length
            ? offices.map((city) => (
                <article key={city.id} className="sf-card p-6">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-[#2E86DE]">{city.name}</h3>
                  <p className="mt-2 text-sm leading-6">{city.branchAddress}</p>
                  {city.supportPhone ? <p className="mt-2 text-sm">{city.supportPhone}</p> : null}
                </article>
              ))
            : (
                <>
                  <article className="sf-card p-6">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-[#2E86DE]">{brand.offices.head.label}</h3>
                    <p className="mt-2 text-sm leading-6">{brand.offices.head.address}</p>
                  </article>
                  <article className="sf-card p-6">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-[#2E86DE]">{brand.offices.branch.label}</h3>
                    <p className="mt-2 text-sm leading-6">{brand.offices.branch.address}</p>
                  </article>
                </>
              )}
          <p className="text-sm">
            {brand.supportPhoneDisplay}
            <br />
            {brand.whatsappDisplay}
            <br />
            {brand.officeEmail}
          </p>
        </div>
      </div>
    </>
  );
}
