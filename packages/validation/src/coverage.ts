import { z } from 'zod';
import {
  addressSchema,
  emailSchema,
  mobileSchema,
  nameSchema,
  optionalMessageSchema,
  uuidSchema,
} from './primitives';

export const coverageCheckSchema = z
  .object({
    cityId: uuidSchema,
    areaId: uuidSchema.optional(),
    subAreaId: uuidSchema.optional(),
    address: z.string().trim().max(255).optional(),
    mobile: mobileSchema.optional(),
  })
  .refine((value) => Boolean(value.areaId ?? value.subAreaId), {
    message: 'Select your area to check coverage',
    path: ['areaId'],
  });

export const coverageLeadSchema = z.object({
  checkId: uuidSchema.optional(),
  name: nameSchema,
  mobile: mobileSchema,
  email: emailSchema.optional(),
  cityId: uuidSchema,
  areaId: uuidSchema.optional(),
  subAreaId: uuidSchema.optional(),
  address: addressSchema.optional(),
  notes: optionalMessageSchema,
});

export const callbackRequestSchema = z.object({
  name: nameSchema,
  phone: mobileSchema,
  email: emailSchema.optional(),
  cityId: uuidSchema.optional(),
  areaId: uuidSchema.optional(),
  preferredTime: z
    .enum(['MORNING', 'AFTERNOON', 'EVENING', 'ANYTIME'], {
      errorMap: () => ({ message: 'Choose a preferred time' }),
    })
    .optional(),
  subject: z.string().trim().min(3, 'Tell us what this is about').max(160),
  message: optionalMessageSchema,
});

export type CoverageCheckInput = z.input<typeof coverageCheckSchema>;
export type CoverageLeadInput = z.input<typeof coverageLeadSchema>;
export type CallbackRequestInput = z.input<typeof callbackRequestSchema>;
