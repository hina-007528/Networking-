import { describe, expect, it } from 'vitest';
import { ipPrefix } from './analytics.service';

describe('ipPrefix', () => {
  it('truncates IPv4 to a /24', () => {
    expect(ipPrefix('203.99.54.18')).toBe('203.99.54.0');
  });

  it('keeps only the first three IPv6 hextets', () => {
    expect(ipPrefix('2001:db8:abcd:0012:0000:0000:0000:0001')).toBe('2001:db8:abcd::');
  });

  it('returns null for missing or malformed addresses', () => {
    expect(ipPrefix(null)).toBeNull();
    expect(ipPrefix('not-an-ip')).toBeNull();
    expect(ipPrefix('10.0.1')).toBeNull();
  });
});
