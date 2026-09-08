/**
 * Picks the most specific coverage zone from a candidate set.
 * Order is sub-area, then area, then city-wide (both foreign keys null).
 */
export function pickMostSpecificZone<T extends { areaId: string | null; subAreaId: string | null }>(
  zones: T[],
): T | undefined {
  return (
    zones.find((zone) => zone.subAreaId !== null) ??
    zones.find((zone) => zone.areaId !== null) ??
    zones.find((zone) => zone.areaId === null && zone.subAreaId === null)
  );
}
