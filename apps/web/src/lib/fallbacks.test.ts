import { describe, expect, it } from 'vitest';
import { FALLBACK_CITIES, fallbackCity } from './fallbacks';

describe('city fallbacks', () => {
  it('uses isActive rather than a legacy active flag', () => {
    const city = fallbackCity('c-9', 'Sialkot', 'sialkot', 'SKT', '052', 9);
    expect(city.isActive).toBe(true);
    expect(city).not.toHaveProperty('active');
  });

  it('covers the major Pakistani metros used in seed data', () => {
    const slugs = FALLBACK_CITIES.map((city) => city.slug);
    expect(slugs).toEqual(
      expect.arrayContaining(['karachi', 'lahore', 'islamabad', 'peshawar', 'multan']),
    );
  });
});
