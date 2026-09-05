/**
 * Fields that must never reach an audit log, an analytics record or an error response.
 *
 * The list is matched case-insensitively against key names, and matching is substring-based so
 * `newPassword`, `password_hash` and `cardNumber` are all caught.
 */
const SENSITIVE_KEY_PATTERNS = [
  'password',
  'passwordhash',
  'secret',
  'token',
  'otp',
  'code_hash',
  'codehash',
  'authorization',
  'cookie',
  'cardnumber',
  'card_number',
  'cvv',
  'cvc',
  'pan',
  'iban',
  'apikey',
  'api_key',
  'privatekey',
  'signature',
];

const REDACTED = '[redacted]';

function isSensitiveKey(key: string): boolean {
  const normalised = key.toLowerCase();
  return SENSITIVE_KEY_PATTERNS.some((pattern) => normalised.includes(pattern));
}

/** Deep-clones a value with every sensitive field replaced by a marker. */
export function redact<T>(value: T, depth = 0): unknown {
  if (depth > 8 || value === null || value === undefined) {
    return value ?? null;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redact(entry, depth + 1));
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object') {
    const source = value as Record<string, unknown>;
    const output: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(source)) {
      output[key] = isSensitiveKey(key) ? REDACTED : redact(entry, depth + 1);
    }

    return output;
  }

  return value;
}

/**
 * Truncates an IPv4 address to its /24 prefix, or an IPv6 address to its /48 prefix, so analytics
 * records cannot be tied back to an individual visitor.
 */
export function truncateIp(ip: string | null | undefined): string | null {
  if (!ip) return null;

  if (ip.includes(':')) {
    const groups = ip.split(':').filter(Boolean);
    return groups.length >= 3 ? `${groups.slice(0, 3).join(':')}::` : null;
  }

  const octets = ip.split('.');
  return octets.length === 4 ? `${octets[0]}.${octets[1]}.${octets[2]}.0` : null;
}

/** Masks all but the final four characters, for display of partially sensitive identifiers. */
export function maskTail(value: string | null | undefined, visible = 4): string | null {
  if (!value) return null;
  if (value.length <= visible) return '*'.repeat(value.length);
  return `${'*'.repeat(value.length - visible)}${value.slice(-visible)}`;
}
