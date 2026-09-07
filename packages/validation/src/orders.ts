import { z } from 'zod';
import { paginationQuerySchema } from './common';
import { uuidSchema } from './primitives';

export const createOrderSchema = z.object({
  planId: uuidSchema,
  installAddress: z.string().trim().min(10, 'Enter the full installation address').max(255),
});

export const verifyOrderOtpSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter the 6-digit code emailed to you'),
});

export const markInvoicePaidSchema = z.object({
  method: z.enum(['cash', 'bank_transfer', 'office']),
});

export const updateCustomerSubscriptionSchema = z
  .object({
    subscriptionId: uuidSchema,
    planId: uuidSchema.optional(),
    status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'CANCELLED', 'EXPIRED']).optional(),
    startedAt: z.coerce.date().nullable().optional(),
    currentPeriodStart: z.coerce.date().nullable().optional(),
    currentPeriodEnd: z.coerce.date().nullable().optional(),
    nextBillingDate: z.coerce.date().nullable().optional(),
    reason: z.string().trim().max(500).optional(),
  })
  .refine((value) => value.planId !== undefined || value.status !== undefined || value.startedAt !== undefined || value.currentPeriodStart !== undefined || value.currentPeriodEnd !== undefined || value.nextBillingDate !== undefined, {
    message: 'Nothing to update',
  });

export const createCustomerSubscriptionSchema = z.object({
  planId: uuidSchema,
  status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED']).default('PENDING'),
  startedAt: z.coerce.date().optional(),
  reason: z.string().trim().max(500).optional(),
});

export const updateCustomerStatusSchema = z.object({
  status: z.enum(['PROSPECT', 'ACTIVE', 'SUSPENDED', 'CHURNED']),
});

export const orderStatusSchema = z.enum([
  'PENDING_OTP',
  'CONFIRMED',
  'EXPIRED',
  'CANCELLED',
  'SCHEDULED',
  'INSTALLED',
]);

export const adminOrderListQuerySchema = paginationQuerySchema.extend({
  status: orderStatusSchema.optional(),
  customerId: uuidSchema.optional(),
});

export const adminUpdateOrderSchema = z.object({
  status: z.enum(['CANCELLED', 'SCHEDULED', 'INSTALLED']),
});

export const adminNotificationLogQuerySchema = paginationQuerySchema.extend({
  relatedOrderId: uuidSchema.optional(),
  status: z.enum(['SENT', 'FAILED']).optional(),
});

export type CreateOrderInput = z.input<typeof createOrderSchema>;
export type VerifyOrderOtpInput = z.input<typeof verifyOrderOtpSchema>;
export type MarkInvoicePaidInput = z.input<typeof markInvoicePaidSchema>;
