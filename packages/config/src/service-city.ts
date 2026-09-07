/** Single source of truth for the v1 operating city. Change this to expand later. */
export const SERVICE_CITY = 'Lahore';

export const SERVICE_CITY_SLUG = 'lahore';

export const SERVICE_CITY_BOUNDS = {
  minLat: 31.35,
  maxLat: 31.65,
  minLng: 74.15,
  maxLng: 74.45,
  centerLat: 31.5204,
  centerLng: 74.3587,
} as const;

export function isServiceCity(value: string | null | undefined): boolean {
  return (value ?? '').trim().toLowerCase() === SERVICE_CITY.toLowerCase();
}

export function isWithinServiceBounds(lat: number, lng: number): boolean {
  return (
    lat >= SERVICE_CITY_BOUNDS.minLat &&
    lat <= SERVICE_CITY_BOUNDS.maxLat &&
    lng >= SERVICE_CITY_BOUNDS.minLng &&
    lng <= SERVICE_CITY_BOUNDS.maxLng
  );
}

export const WAITLIST_CITIES = [] as const;
