'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { CityDto } from '@stormfiber/types';
import { SERVICE_CITY, SERVICE_CITY_SLUG } from '@/lib/config';
import { CITY_STORAGE_KEY, PUBLIC_CITIES } from '@/lib/cities';
import { apiGet } from '@/lib/api';

export interface CityOption {
  name: string;
  slug: string;
}

interface CityContextValue {
  city: string;
  citySlug: string;
  cities: CityOption[];
  setCity: (city: string) => void;
  openCityModal: () => void;
}

const FALLBACK_CITIES: CityOption[] = PUBLIC_CITIES.map((name) => ({
  name,
  slug: name === SERVICE_CITY ? SERVICE_CITY_SLUG : name.toLowerCase().replace(/\s+/g, '-'),
}));

const CityContext = createContext<CityContextValue | null>(null);

function resolveSlug(value: string, cities: CityOption[]): string {
  const match = cities.find(
    (city) => city.slug === value.toLowerCase() || city.name.toLowerCase() === value.toLowerCase(),
  );
  return match?.slug ?? SERVICE_CITY_SLUG;
}

function resolveName(slug: string, cities: CityOption[]): string {
  return cities.find((city) => city.slug === slug)?.name ?? SERVICE_CITY;
}

export function CityProvider({ children }: { children: React.ReactNode }) {
  const [citySlug, setCitySlug] = useState(SERVICE_CITY_SLUG);
  const [cities, setCities] = useState<CityOption[]>(FALLBACK_CITIES);

  useEffect(() => {
    const stored = window.localStorage.getItem(CITY_STORAGE_KEY);
    apiGet<CityDto[]>('/cities')
      .then((rows) => {
        const next = rows
          .filter((row) => row.isActive)
          .map((row) => ({ name: row.name, slug: row.slug }));
        if (next.length > 0) {
          setCities(next);
          setCitySlug(resolveSlug(stored || SERVICE_CITY_SLUG, next));
        } else if (stored) {
          setCitySlug(resolveSlug(stored, FALLBACK_CITIES));
        }
      })
      .catch(() => {
        if (stored) setCitySlug(resolveSlug(stored, FALLBACK_CITIES));
      });
  }, []);

  const value = useMemo<CityContextValue>(
    () => ({
      city: resolveName(citySlug, cities),
      citySlug,
      cities,
      setCity: (next) => {
        const slug = resolveSlug(next, cities);
        setCitySlug(slug);
        window.localStorage.setItem(CITY_STORAGE_KEY, slug);
      },
      openCityModal: () => undefined,
    }),
    [citySlug, cities],
  );

  return <CityContext.Provider value={value}>{children}</CityContext.Provider>;
}

export function useCity() {
  const context = useContext(CityContext);
  if (!context) {
    throw new Error('useCity must be used within CityProvider');
  }
  return context;
}
