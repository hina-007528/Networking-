import { z } from 'zod';
import { serviceTypeSchema } from './common';
import {
  addressSchema,
  cnicLast4Schema,
  dateOnlySchema,
  emailSchema,
  mobileSchema,
  nameSchema,
  optionalMessageSchema,
  uuidSchema,
} from './primitives';

/**
 * The Get Connection wizard. Each step has its own schema so the client can validate
 * progressively, and `createApplicationSchema` is the composed contract the API enforces on
 * submission — the server never trusts that the client ran the per-step checks.
 */

export const applicationPersonalStepSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  mobile: mobileSchema,
  email: emailSchema,
  cnicLast4: cnicLast4Schema.optional(),
});

export const applicationOtpStepSchema = z.object({
  requestId: uuidSchema,
  code: z
    .string()
    .trim()
    .regex(/^\d{4,8}$/, 'Enter the code we sent you'),
});

export const applicationLocationStepSchema = z.object({
  cityId: uuidSchema,
  areaId: uuidSchema.optional(),
  subAreaId: uuidSchema.optional(),
  addressLine: addressSchema,
  nearestLandmark: z.string().trim().max(160).optional(),
});

export const applicationServicesStepSchema = z.object({
  services: z.array(serviceTypeSchema).min(1, 'Choose at least one service'),
});

export const applicationPlanStepSchema = z.object({
  planId: uuidSchema,
});

export const applicationAddonsStepSchema = z.object({
  addonIds: z.array(uuidSchema).max(20).default([]),
});

export const applicationScheduleStepSchema = z.object({
  preferredInstallationDate: dateOnlySchema.optional(),
  notes: optionalMessageSchema,
});

export const applicationTermsStepSchema = z.object({
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms and conditions to continue' }),
  }),
});

export const createApplicationSchema = applicationPersonalStepSchema
  .merge(applicationLocationStepSchema)
  .merge(applicationServicesStepSchema)
  .merge(applicationPlanStepSchema)
  .merge(applicationAddonsStepSchema)
  .merge(applicationScheduleStepSchema)
  .merge(applicationTermsStepSchema)
  .extend({
    verificationToken: z.string().min(10, 'Verify your mobile number to continue'),
  });

/**
 * An application exists before the applicant has an account, so ownership is proven with the
 * mobile number recorded on it rather than with a session.
 */
export const applicationOwnershipQuerySchema = z.object({
  mobile: mobileSchema,
});

export const applicationStatusSchema = z.enum([
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'PAYMENT_PENDING',
  'PAYMENT_RECEIVED',
  'APPROVED',
  'INSTALLATION_SCHEDULED',
  'INSTALLATION_IN_PROGRESS',
  'ACTIVE',
  'REJECTED',
  'CANCELLED',
]);

export const updateApplicationStatusSchema = z
  .object({
    status: applicationStatusSchema,
    reason: z.string().trim().max(500).optional(),
    scheduledInstallationDate: dateOnlySchema.optional(),
  })
  .refine((value) => value.status !== 'REJECTED' || Boolean(value.reason), {
    message: 'A reason is required when rejecting an application',
    path: ['reason'],
  });

export const applicationListQuerySchema = z.object({
  status: applicationStatusSchema.optional(),
  cityId: uuidSchema.optional(),
  planId: uuidSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export type ApplicationPersonalStepInput = z.input<typeof applicationPersonalStepSchema>;
export type ApplicationLocationStepInput = z.input<typeof applicationLocationStepSchema>;
export type CreateApplicationInput = z.input<typeof createApplicationSchema>;
export type UpdateApplicationStatusInput = z.input<typeof updateApplicationStatusSchema>;
