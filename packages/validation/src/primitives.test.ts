import { describe, expect, it } from 'vitest';
import { emailSchema, mobileSchema, passwordSchema, slugSchema } from './primitives';
import { createApplicationSchema } from './applications';
import { coverageCheckSchema } from './coverage';
import { registerSchema } from './auth';

describe('mobileSchema', () => {
  it.each([
    ['03001234567', '03001234567'],
    ['0300-1234567', '03001234567'],
    ['+923001234567', '03001234567'],
    ['923001234567', '03001234567'],
    ['0300 123 4567', '03001234567'],
  ])('normalises %s to %s', (input, expected) => {
    expect(mobileSchema.parse(input)).toBe(expected);
  });

  it.each(['0300123456', '1234567890', '04212345678', 'not-a-number', ''])(
    'rejects %s',
    (input) => {
      expect(mobileSchema.safeParse(input).success).toBe(false);
    },
  );
});

describe('emailSchema', () => {
  it('trims and lowercases', () => {
    expect(emailSchema.parse('  Customer@Example.COM ')).toBe('customer@example.com');
  });

  it('rejects malformed addresses', () => {
    expect(emailSchema.safeParse('customer@').success).toBe(false);
  });
});

describe('passwordSchema', () => {
  it('accepts a password meeting every rule', () => {
    expect(passwordSchema.safeParse('Storm!2026fiber').success).toBe(true);
  });

  it.each([
    ['short', 'Ab!2345'],
    ['no uppercase', 'storm!2026'],
    ['no lowercase', 'STORM!2026'],
    ['no digit', 'StormFiber!'],
    ['no symbol', 'StormFiber2026'],
  ])('rejects a password with %s', (_label, value) => {
    expect(passwordSchema.safeParse(value).success).toBe(false);
  });
});

describe('slugSchema', () => {
  it('accepts kebab-case slugs', () => {
    expect(slugSchema.parse('Triple-Play-100')).toBe('triple-play-100');
  });

  it('rejects double hyphens and spaces', () => {
    expect(slugSchema.safeParse('triple--play').success).toBe(false);
    expect(slugSchema.safeParse('triple play').success).toBe(false);
  });
});

describe('registerSchema', () => {
  const base = {
    firstName: 'Ayesha',
    lastName: 'Khan',
    email: 'ayesha@example.com',
    mobile: '03001234567',
    password: 'Storm!2026fiber',
    confirmPassword: 'Storm!2026fiber',
    acceptedTerms: true as const,
  };

  it('accepts a complete payload', () => {
    expect(registerSchema.safeParse(base).success).toBe(true);
  });

  it('requires matching passwords', () => {
    const result = registerSchema.safeParse({ ...base, confirmPassword: 'Different!2026' });
    expect(result.success).toBe(false);
  });

  it('requires the terms checkbox', () => {
    expect(registerSchema.safeParse({ ...base, acceptedTerms: false }).success).toBe(false);
  });
});

describe('coverageCheckSchema', () => {
  const cityId = '11111111-1111-4111-8111-111111111111';
  const areaId = '22222222-2222-4222-8222-222222222222';

  it('requires an area or sub-area', () => {
    expect(coverageCheckSchema.safeParse({ cityId }).success).toBe(false);
    expect(coverageCheckSchema.safeParse({ cityId, areaId }).success).toBe(true);
  });
});

describe('createApplicationSchema', () => {
  const payload = {
    firstName: 'Bilal',
    lastName: 'Ahmed',
    mobile: '03211234567',
    email: 'bilal@example.com',
    cityId: '11111111-1111-4111-8111-111111111111',
    areaId: '22222222-2222-4222-8222-222222222222',
    addressLine: 'House 21, Street 4, Gulberg III',
    services: ['INTERNET', 'TV'],
    planId: '33333333-3333-4333-8333-333333333333',
    acceptedTerms: true as const,
    verificationToken: 'verification-token-value',
  };

  it('accepts a fully completed wizard payload', () => {
    const result = createApplicationSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.addonIds).toEqual([]);
    }
  });

  it('rejects submission without a verification token', () => {
    const { verificationToken: _token, ...rest } = payload;
    expect(createApplicationSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects submission with no services selected', () => {
    expect(createApplicationSchema.safeParse({ ...payload, services: [] }).success).toBe(false);
  });
});
