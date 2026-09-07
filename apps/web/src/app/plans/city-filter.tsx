'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCity, type CityOption } from '@/components/city-provider';

export function PlansCityFilter({ currentCity, cities }: { currentCity: string; cities?: CityOption[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setCity, cities: liveCities, citySlug } = useCity();
  const options = cities?.length ? cities : liveCities;
  const selected = currentCity || citySlug;

  return (
    <div className="flex flex-col items-start gap-4 rounded-xl border border-[#e4e9ef] bg-white p-5 sm:flex-row sm:items-center">
      <div className="flex-1">
        <h3 className="font-display text-lg font-extrabold text-[#1b2430]">Select your city</h3>
        <p className="mt-1 text-sm text-[#5d6b7a]">Plans below are the published catalogue for that city.</p>
      </div>
      <select
        value={selected}
        onChange={(event) => {
          const next = event.target.value;
          setCity(next);
          const params = new URLSearchParams(searchParams.toString());
          params.set('city', next);
          router.push(`/plans?${params.toString()}`);
        }}
        className="sf-input w-full sm:w-72"
      >
        {options.map((city) => (
          <option key={city.slug} value={city.slug}>
            {city.name}
          </option>
        ))}
      </select>
    </div>
  );
}
