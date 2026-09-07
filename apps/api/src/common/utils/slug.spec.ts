import { describe, expect, it } from 'vitest';
import { slugify } from './slug';

describe('slugify', () => {
  it('turns a Pakistani area name into a kebab slug', () => {
    expect(slugify('D.H.A. Phase 6')).toBe('d-h-a-phase-6');
  });

  it('strips combining marks', () => {
    expect(slugify('Islāmābād')).toBe('islamabad');
  });

  it('collapses punctuation and spaces', () => {
    expect(slugify('  Gulshan-e-Iqbal  ')).toBe('gulshan-e-iqbal');
  });
});
