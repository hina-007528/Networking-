import { SERVICE_CITY, brand } from '@stormfiber/config';

export const PUBLIC_CITIES = [SERVICE_CITY] as const;

export const CITY_HELP_LINES: Record<string, string> = Object.fromEntries(
  PUBLIC_CITIES.map((city) => [city, brand.supportPhoneDisplay]),
);

export const CITY_ADDRESSES: Record<string, string> = Object.fromEntries(
  PUBLIC_CITIES.map((city) => [
    city,
    city === SERVICE_CITY ? brand.offices.head.address : `Waitlist city — we currently serve ${SERVICE_CITY} only.`,
  ]),
);

export const CITY_STORAGE_KEY = 'mx-selected-city';
