import { createHmac, timingSafeEqual } from 'node:crypto';

/** HMAC so a 6-digit code cannot be recovered from a rainbow table of SHA-256 hashes. */
export function hashOtp(code: string, secret: string): string {
  return createHmac('sha256', secret).update(code.trim()).digest('hex');
}

export function otpMatches(code: string, storedHash: string, secret: string): boolean {
  const candidate = Buffer.from(hashOtp(code, secret), 'hex');
  const stored = Buffer.from(storedHash, 'hex');
  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
}

/** Strips one-time codes from log lines so consoles and support logs never store them. */
export function redactSecrets(value: string): string {
  return value
    .replace(/\b\d{4,8}\b/g, '******')
    .replace(/is your .{1,80} (verification|order confirmation) code/gi, 'verification code');
}
