import { brand } from './brand';

/**
 * Presentation helpers shared by the website, the customer portal and the admin console.
 *
 * These format values that the **server** has already computed. They never derive a price,
 * tax or total.
 */

const currencyFormatterCache = new Map<string, Intl.NumberFormat>();

function getCurrencyFormatter(currency: string, maximumFractionDigits: number): Intl.NumberFormat {
  const key = `${currency}:${maximumFractionDigits}`;
  let formatter = currencyFormatterCache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(brand.locale, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 0,
      maximumFractionDigits,
    });
    currencyFormatterCache.set(key, formatter);
  }
  return formatter;
}

export function formatCurrency(
  amount: number,
  options: { currency?: string; withDecimals?: boolean } = {},
): string {
  const currency = options.currency ?? brand.currency;
  const formatter = getCurrencyFormatter(currency, options.withDecimals ? 2 : 0);
  return formatter.format(Number.isFinite(amount) ? amount : 0);
}

/** "Rs 5,799 /mo" style label used on plan cards. */
export function formatMonthlyPrice(amount: number, currency?: string): string {
  return `${formatCurrency(amount, { currency })}/mo`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(brand.locale).format(value);
}

export function formatSpeed(mbps: number | null | undefined): string {
  if (mbps === null || mbps === undefined) return '—';
  if (mbps >= 1000) {
    const gbps = mbps / 1000;
    return `${Number.isInteger(gbps) ? gbps : gbps.toFixed(1)} Gbps`;
  }
  return `${mbps} Mbps`;
}

export function formatDate(
  value: string | Date | null | undefined,
  style: 'short' | 'medium' | 'long' = 'medium',
): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  const options: Intl.DateTimeFormatOptions =
    style === 'short'
      ? { day: '2-digit', month: 'short', year: '2-digit' }
      : style === 'long'
        ? { day: 'numeric', month: 'long', year: 'numeric' }
        : { day: 'numeric', month: 'short', year: 'numeric' };
  return new Intl.DateTimeFormat(brand.locale, { ...options, timeZone: brand.timeZone }).format(
    date,
  );
}

export function formatDateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(brand.locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: brand.timeZone,
  }).format(date);
}

export function formatRelativeTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const thresholds: [Intl.RelativeTimeFormatUnit, number][] = [
    ['second', 60],
    ['minute', 60],
    ['hour', 24],
    ['day', 30],
    ['month', 12],
  ];
  let duration = diffSeconds;
  for (const [unit, step] of thresholds) {
    if (Math.abs(duration) < step) {
      return new Intl.RelativeTimeFormat(brand.locale, { numeric: 'auto' }).format(
        Math.round(duration),
        unit,
      );
    }
    duration /= step;
  }
  return new Intl.RelativeTimeFormat(brand.locale, { numeric: 'auto' }).format(
    Math.round(duration),
    'year',
  );
}

/** `03001234567` → `0300 123 4567` */
export function formatMobile(mobile: string): string {
  const digits = mobile.replace(/\D/g, '');
  if (digits.length !== 11) return mobile;
  return `${digits.slice(0, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
}

/** Builds the city helpline shown on the contact page, e.g. `(042) 111-1-78676`. */
export function formatCityHelpline(dialCode: string, base = brand.supportPhoneDisplay): string {
  return `(${dialCode}) ${base}`;
}

export function toTelHref(dialCode: string, base = brand.supportPhoneDisplay): string {
  return `tel:${dialCode}${base.replace(/\D/g, '')}`;
}

/** Converts an arbitrary label into a URL-safe slug. */
export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function initialsOf(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1).trimEnd()}…`;
}
