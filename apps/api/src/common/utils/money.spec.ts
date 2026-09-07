import { describe, expect, it } from 'vitest';
import { money, percentOf, roundMoney, sum, toNumber, ZERO } from './money';

describe('money helpers', () => {
  it('never uses binary floats for addition', () => {
    const total = sum([money('0.10'), money('0.20')]);
    expect(toNumber(total)).toBe(0.3);
  });

  it('rounds half-up to two decimal places', () => {
    expect(toNumber(roundMoney(money('1.225')))).toBe(1.23);
    expect(toNumber(roundMoney(money('1.224')))).toBe(1.22);
  });

  it('computes a percentage of a rupee amount', () => {
    expect(toNumber(percentOf(money(2500), 17))).toBe(425);
  });

  it('serialises null money as zero at the JSON boundary', () => {
    expect(toNumber(null)).toBe(0);
    expect(toNumber(ZERO())).toBe(0);
  });
});
