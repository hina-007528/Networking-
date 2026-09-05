import { z } from 'zod';

/**
 * Reusable field-level primitives. Every form on the website and every DTO in the API derives
 * from these, so a rule such as "how a Pakistani mobile number is formatted" exists exactly once.
 */

/**
 * Accepts the local formats used across Pakistan and normalises to `03XXXXXXXXX`:
 *   03001234567, 0300-1234567, +923001234567, 923001234567
 */
export const mobileSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s()-]/g, ''))
  .refine((value) => /^(?:\+92|92|0)3\d{9}$/.test(value), {
    message: 'Enter a valid mobile number, for example 03001234567',
  })
  .transform((value) => {
    const digits = value.replace(/^\+?92/, '0');
    return digits.startsWith('0') ? digits : `0${digits}`;
  });

export const landlineSchema = z
  .string()
  .trim()
  .transform((value) => value.replace(/[\s()-]/g, ''))
  .refine((value) => /^0\d{9,10}$/.test(value), { message: 'Enter a valid landline number' });

export const phoneSchema = z.union([mobileSchema, landlineSchema]);

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(5, 'Email is required')
  .max(254, 'Email is too long')
  .email('Enter a valid email address');

export const nameSchema = z
  .string()
  .trim()
  .min(2, 'Must be at least 2 characters')
  .max(60, 'Must be 60 characters or fewer')
  .regex(/^[\p{L}\p{M}'.\- ]+$/u, 'Only letters, spaces, apostrophes and hyphens are allowed');

/**
 * Password policy: at least 8 characters with an uppercase letter, a lowercase letter, a digit and
 * a special character. This mirrors the requirements advertised on the reference customer portal.
 */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be 128 characters or fewer')
  .regex(/[A-Z]/, 'Include at least one uppercase letter')
  .regex(/[a-z]/, 'Include at least one lowercase letter')
  .regex(/\d/, 'Include at least one number')
  .regex(/[^A-Za-z0-9]/, 'Include at least one special character');

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'Slug is required')
  .max(120, 'Slug is too long')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and single hyphens');

export const uuidSchema = z.string().uuid('Must be a valid identifier');

export const addressSchema = z
  .string()
  .trim()
  .min(10, 'Please enter your full address')
  .max(255, 'Address must be 255 characters or fewer');

export const cnicLast4Schema = z
  .string()
  .trim()
  .regex(/^\d{4}$/, 'Enter the last 4 digits of the CNIC');

export const moneySchema = z
  .number({ invalid_type_error: 'Enter a valid amount' })
  .finite('Enter a valid amount')
  .nonnegative('Amount cannot be negative')
  .max(100_000_000, 'Amount is too large');

export const percentageSchema = z
  .number({ invalid_type_error: 'Enter a valid percentage' })
  .min(0, 'Cannot be negative')
  .max(100, 'Cannot exceed 100');

export const isoDateSchema = z
  .string()
  .datetime({ offset: true, message: 'Must be an ISO 8601 date-time' });

export const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a YYYY-MM-DD date');

/** Free-text fields that end up in emails, tickets and CRM notes. */
export const shortTextSchema = z.string().trim().min(1).max(160);
export const messageSchema = z.string().trim().min(10, 'Please add a little more detail').max(4000);
export const optionalMessageSchema = z
  .string()
  .trim()
  .max(4000, 'Message must be 4000 characters or fewer')
  .optional()
  .or(z.literal('').transform(() => undefined));

/** Coerces `?flag=true` / `?flag=1` style query strings into booleans. */
export const booleanQuerySchema = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .transform((value) => value === true || value === 'true' || value === '1');

export const intQuerySchema = z.coerce.number().int();
