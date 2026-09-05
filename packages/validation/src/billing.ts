import { z } from 'zod';
import { paginationQuerySchema } from './common';
import { moneySchema, uuidSchema } from './primitives';

export const paymentMethodSchema = z.enum(['CARD', 'BANK_TRANSFER', 'MOBILE_WALLET', 'CASH']);

export const createPaymentSchema = z.object({
  invoiceId: uuidSchema,
  method: paymentMethodSchema,
  /**
   * Client-supplied idempotency key. Replaying the same key returns the original payment instead
   * of charging twice.
   */
  idempotencyKey: z.string().trim().min(8, 'Missing idempotency key').max(120),
  returnUrl: z.string().trim().url('Invalid return URL').max(500).optional(),
});

export const paymentWebhookSchema = z.object({
  eventId: z.string().trim().min(1).max(120),
  eventType: z.string().trim().min(1).max(80),
  provider: z.string().trim().min(1).max(40),
  providerReference: z.string().trim().min(1).max(120),
  /** Our own payment reference, echoed back by the provider. */
  paymentReference: z.string().trim().min(1).max(120),
  status: z.enum(['SUCCEEDED', 'FAILED', 'PENDING', 'CANCELLED', 'REFUNDED']),
  amount: moneySchema,
  currency: z.string().trim().length(3),
  occurredAt: z.string().datetime({ offset: true }).optional(),
  metadata: z.record(z.unknown()).default({}),
});

export const invoiceStatusSchema = z.enum([
  'DRAFT',
  'GENERATED',
  'PENDING',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'CANCELLED',
  'REFUNDED',
]);

/** What a customer may filter their own invoice list by. */
export const customerInvoiceQuerySchema = paginationQuerySchema.extend({
  status: invoiceStatusSchema.optional(),
});

export const paymentStatusSchema = z.enum([
  'INITIATED',
  'PENDING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
]);

export const customerPaymentQuerySchema = paginationQuerySchema.extend({
  status: paymentStatusSchema.optional(),
});

export const paymentReferenceParamSchema = z.object({
  reference: z
    .string()
    .trim()
    .regex(/^[A-Z0-9-]{8,40}$/, 'Invalid payment reference'),
});

export const invoiceListQuerySchema = z.object({
  status: invoiceStatusSchema.optional(),
  customerId: uuidSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const paymentListQuerySchema = z.object({
  status: paymentStatusSchema.optional(),
  method: paymentMethodSchema.optional(),
  customerId: uuidSchema.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const createRefundSchema = z.object({
  paymentId: uuidSchema,
  amount: moneySchema.refine((value) => value > 0, 'Refund amount must be greater than zero'),
  reason: z.string().trim().min(5, 'Explain why this refund is being issued').max(500),
});

export const recordManualPaymentSchema = z.object({
  invoiceId: uuidSchema,
  amount: moneySchema.refine((value) => value > 0, 'Amount must be greater than zero'),
  method: paymentMethodSchema,
  reference: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional(),
  paidAt: z.coerce.date().optional(),
});

export const generateInvoiceSchema = z.object({
  subscriptionId: uuidSchema,
  billingPeriodStart: z.coerce.date(),
  billingPeriodEnd: z.coerce.date(),
  dueDate: z.coerce.date().optional(),
  includeInstallation: z.boolean().default(false),
});

export const subscriptionChangeRequestSchema = z
  .object({
    changeType: z.enum([
      'UPGRADE',
      'DOWNGRADE',
      'ADDON_ADDED',
      'ADDON_REMOVED',
      'SERVICE_SUSPENDED',
      'REACTIVATED',
      'CANCELLED',
    ]),
    requestedPlanId: uuidSchema.optional(),
    requestedAddonId: uuidSchema.optional(),
    customerNote: z.string().trim().max(1000).optional(),
  })
  .refine(
    (value) =>
      !['UPGRADE', 'DOWNGRADE'].includes(value.changeType) || Boolean(value.requestedPlanId),
    { message: 'Choose the plan you want to move to', path: ['requestedPlanId'] },
  )
  .refine(
    (value) =>
      !['ADDON_ADDED', 'ADDON_REMOVED'].includes(value.changeType) ||
      Boolean(value.requestedAddonId),
    { message: 'Choose an add-on', path: ['requestedAddonId'] },
  );

export const reviewChangeRequestSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'APPLIED', 'CANCELLED']),
  adminNote: z.string().trim().max(1000).optional(),
  effectiveFrom: z.coerce.date().optional(),
});

export type CreatePaymentInput = z.input<typeof createPaymentSchema>;
export type PaymentWebhookInput = z.input<typeof paymentWebhookSchema>;
export type CreateRefundInput = z.input<typeof createRefundSchema>;
export type SubscriptionChangeRequestInput = z.input<typeof subscriptionChangeRequestSchema>;
