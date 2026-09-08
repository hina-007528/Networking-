import { describe, expect, it } from 'vitest';
import { pickMostSpecificZone } from './coverage-resolve';

describe('pickMostSpecificZone', () => {
  it('prefers a sub-area zone over area and city zones', () => {
    const chosen = pickMostSpecificZone([
      { areaId: null, subAreaId: null, id: 'city' },
      { areaId: 'area-1', subAreaId: null, id: 'area' },
      { areaId: 'area-1', subAreaId: 'sub-1', id: 'sub' },
    ]);
    expect(chosen?.id).toBe('sub');
  });

  it('falls back to an area zone when no sub-area zone exists', () => {
    const chosen = pickMostSpecificZone([
      { areaId: null, subAreaId: null, id: 'city' },
      { areaId: 'area-1', subAreaId: null, id: 'area' },
    ]);
    expect(chosen?.id).toBe('area');
  });

  it('uses the city-wide zone when nothing more specific exists', () => {
    const chosen = pickMostSpecificZone([{ areaId: null, subAreaId: null, id: 'city' }]);
    expect(chosen?.id).toBe('city');
  });

  it('returns undefined when the candidate list is empty', () => {
    expect(pickMostSpecificZone([])).toBeUndefined();
  });
});
