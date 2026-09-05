import { customAlphabet } from 'nanoid';

/** Unambiguous alphabet: no O/0 or I/1, so references survive being read over the phone. */
const REFERENCE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const randomSuffix = customAlphabet(REFERENCE_ALPHABET, 6);

function yearPart(): string {
  return String(new Date().getUTCFullYear());
}

export function applicationReference(): string {
  return `APP-${yearPart()}-${randomSuffix()}`;
}

export function subscriptionReference(): string {
  return `SUB-${randomSuffix()}${randomSuffix().slice(0, 2)}`;
}

export function ticketReference(): string {
  return `TKT-${yearPart()}-${randomSuffix()}`;
}

export function callbackReference(): string {
  return `CB-${yearPart()}-${randomSuffix()}`;
}

export function paymentReference(): string {
  return `PAY-${yearPart()}-${randomSuffix()}${randomSuffix().slice(0, 2)}`;
}

/**
 * Account numbers are sequential rather than random so support staff can read them out and
 * customers can recognise them. The caller supplies the next sequence value.
 */
export function accountNumber(sequence: number): string {
  return `SF-${String(sequence).padStart(6, '0')}`;
}

/** Invoice numbers embed the billing period, which is what finance teams expect. */
export function invoiceNumber(periodStart: Date, sequence: number): string {
  const year = periodStart.getUTCFullYear();
  const month = String(periodStart.getUTCMonth() + 1).padStart(2, '0');
  return `INV-${year}${month}-${String(sequence).padStart(5, '0')}`;
}
