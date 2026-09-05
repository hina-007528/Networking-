import { z } from 'zod';
import { emailSchema } from './primitives';

/**
 * What a customer may change about themselves.
 *
 * Deliberately narrower than the admin schema: city, service address and account status drive
 * billing and installation, so they move through support rather than self-service.
 */
export const updateOwnProfileSchema = z
  .object({
    email: emailSchema.optional(),
    alternatePhone: z
      .string()
      .trim()
      .regex(/^[0-9+\-\s()]{7,20}$/, 'Enter a valid contact number')
      .optional(),
    addressLine: z.string().trim().min(10, 'Enter your full address').max(255).optional(),
  })
  .refine((value) => Object.values(value).some((entry) => entry !== undefined), {
    message: 'Nothing to update',
  });

export const autoPaySchema = z.object({
  enabled: z.boolean(),
});

export type UpdateOwnProfileInput = z.input<typeof updateOwnProfileSchema>;
