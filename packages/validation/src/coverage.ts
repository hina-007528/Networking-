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
    cityId: uuidSchema.optional(),
    cityName: z.string().trim().min(2).max(80).optional(),
    areaId: uuidSchema.optional(),
    subAreaId: uuidSchema.optional(),
    address: z.string().trim().max(255).optional(),
    mobile: mobileSchema.optional(),
    lat: z.number().gte(-90).lte(90).optional(),
    lng: z.number().gte(-180).lte(180).optional(),
  })
  .refine((value) => Boolean(value.cityId ?? value.cityName ?? (value.lat != null && value.lng != null)), {
    message: 'Enter a city or drop a pin on the map',
    path: ['cityName'],
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

export const cityWaitlistSchema = z.object({
  name: nameSchema,
  phone: mobileSchema,
  city: z.string().trim().min(2, 'Enter your city').max(80),
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
export type CityWaitlistInput = z.input<typeof cityWaitlistSchema>;
export type CallbackRequestInput = z.input<typeof callbackRequestSchema>;
