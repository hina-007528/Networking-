import { hashOtp, otpMatches, redactSecrets } from './otp-hash';

describe('otp-hash', () => {
  const secret = 'test-pepper-do-not-use-in-prod';

  it('stores a keyed hash that cannot be compared as raw SHA-256', () => {
    const digest = hashOtp('123456', secret);
    expect(digest).toHaveLength(64);
    expect(digest).not.toBe(hashOtp('123456', 'other-secret'));
    expect(otpMatches('123456', digest, secret)).toBe(true);
    expect(otpMatches('000000', digest, secret)).toBe(false);
  });

  it('redacts numeric codes from console log lines', () => {
    expect(redactSecrets('Your code is 482913. It expires in 5 minutes.')).toBe(
      'Your code is ******. It expires in 5 minutes.',
    );
    expect(redactSecrets('482913 is your Majawar X Network verification code')).toContain(
      'verification code',
    );
    expect(redactSecrets('482913 is your Majawar X Network verification code')).not.toContain(
      '482913',
    );
  });
});
