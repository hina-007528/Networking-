import { Prisma } from '@prisma/client';

/**
 * Money helpers.
 *
 * Currency is stored as `Decimal(12,2)` and every arithmetic step runs through `Prisma.Decimal`,
 * so no total is ever the result of binary floating-point addition. Values only become plain
 * numbers at the serialisation boundary.
 */

export type Money = Prisma.Decimal;

export function money(value: number | string | Prisma.Decimal): Money {
  return new Prisma.Decimal(value);
}

export const ZERO: () => Money = () => new Prisma.Decimal(0);

export function sum(values: Money[]): Money {
  return values.reduce<Money>((total, value) => total.plus(value), new Prisma.Decimal(0));
}

/** Rounds to two decimal places, half-up, which is how invoices are expected to round. */
export function roundMoney(value: Money): Money {
  return value.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

export function percentOf(value: Money, percentage: number | string | Money): Money {
  return roundMoney(value.times(new Prisma.Decimal(percentage)).dividedBy(100));
}

/** Serialises a Decimal for JSON. The API always sends numbers, never Decimal instances. */
export function toNumber(value: Money | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'number' ? value : value.toDecimalPlaces(2).toNumber();
}

export function isPositive(value: Money): boolean {
  return value.greaterThan(0);
}
