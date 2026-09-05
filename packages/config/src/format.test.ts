import { describe, expect, it } from 'vitest';
import {
  formatCityHelpline,
  formatCurrency,
  formatMobile,
  formatMonthlyPrice,
  formatSpeed,
  slugify,
  toTelHref,
  truncate,
} from './format';

describe('formatCurrency', () => {
  it('formats whole rupees without decimals', () => {
    expect(formatCurrency(5799).replace(/\u00a0/g, ' ')).toContain('5,799');
  });

  it('never renders NaN', () => {
    expect(formatCurrency(Number.NaN)).toContain('0');
  });

  it('appends a monthly suffix', () => {
    expect(formatMonthlyPrice(2499)).toMatch(/\/mo$/);
  });
});

describe('formatSpeed', () => {
  it.each([
    [15, '15 Mbps'],
    [275, '275 Mbps'],
    [1000, '1 Gbps'],
    [1500, '1.5 Gbps'],
  ])('formats %s Mbps', (input, expected) => {
    expect(formatSpeed(input)).toBe(expected);
  });

  it('renders a dash for a missing speed', () => {
    expect(formatSpeed(null)).toBe('—');
  });
});

describe('phone helpers', () => {
  it('groups a mobile number', () => {
    expect(formatMobile('03001234567')).toBe('0300 123 4567');
  });

  it('leaves an unexpected format untouched', () => {
    expect(formatMobile('12345')).toBe('12345');
  });

  it('builds a city helpline and tel href', () => {
    expect(formatCityHelpline('042')).toBe('(042) 111-1-78676');
    expect(toTelHref('042')).toBe('tel:042111178676');
  });
});

describe('slugify', () => {
  it.each([
    ['Triple Play 100 Mbps', 'triple-play-100-mbps'],
    ['D.H.A. Phase 6', 'd-h-a-phase-6'],
    ['  Gulberg   III  ', 'gulberg-iii'],
  ])('slugifies %s', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });
});

describe('truncate', () => {
  it('leaves short strings alone', () => {
    expect(truncate('Storm', 10)).toBe('Storm');
  });

  it('adds an ellipsis when clipping', () => {
    expect(truncate('StormFiber Triple Play', 10)).toBe('StormFibe…');
  });
});
