import { z } from 'zod';
import { paginationQuerySchema, planKindSchema, publishStatusSchema } from './common';
import { applicationListQuerySchema } from './applications';
import { invoiceListQuerySchema, paymentListQuerySchema } from './billing';
import { emailSchema, mobileSchema, nameSchema, passwordSchema, uuidSchema } from './primitives';

export const roleNameSchema = z.enum([
  'SUPER_ADMIN',
  'ADMIN',
  'MANAGER',
  'SALES_AGENT',
  'SUPPORT_AGENT',
  'FINANCE_AGENT',
  'CUSTOMER',
]);

export const createStaffUserSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  mobile: mobileSchema,
  password: passwordSchema,
  roles: z.array(roleNameSchema).min(1, 'Assign at least one role'),
});

export const updateStaffUserSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  mobile: mobileSchema.optional(),
  status: z.enum(['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DISABLED']).optional(),
  roles: z.array(roleNameSchema).min(1).optional(),
});

export const updateRolePermissionsSchema = z.object({
  permissions: z.array(z.string().trim().min(3).max(60)).max(80),
});

export const createCustomerSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  mobile: mobileSchema,
  password: passwordSchema,
  addressLine: z.string().trim().min(10).max(255),
  status: z.enum(['PROSPECT', 'ACTIVE', 'SUSPENDED', 'CHURNED']).default('PROSPECT'),
});

export const updateCustomerSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  email: emailSchema.optional(),
  mobile: mobileSchema.optional(),
  alternatePhone: z.string().trim().max(20).optional(),
  cityId: uuidSchema.optional(),
  areaId: uuidSchema.nullable().optional(),
  subAreaId: uuidSchema.nullable().optional(),
  addressLine: z.string().trim().min(10).max(255).optional(),
  status: z.enum(['PROSPECT', 'ACTIVE', 'SUSPENDED', 'CHURNED']).optional(),
});

export const customerListQuerySchema = z.object({
  status: z.enum(['PROSPECT', 'ACTIVE', 'SUSPENDED', 'CHURNED']).optional(),
  cityId: uuidSchema.optional(),
  planId: uuidSchema.optional(),
  hasOutstanding: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((value) => value === true || value === 'true')
    .optional(),
});

export const auditLogQuerySchema = z.object({
  userId: uuidSchema.optional(),
  entity: z.string().trim().max(60).optional(),
  action: z.string().trim().max(60).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const analyticsRangeQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
  cityId: uuidSchema.optional(),
});

export const adminCustomerListQuerySchema = paginationQuerySchema.merge(customerListQuerySchema);
export const adminApplicationListQuerySchema = paginationQuerySchema.merge(applicationListQuerySchema);
export const adminInvoiceListQuerySchema = paginationQuerySchema.merge(invoiceListQuerySchema);
export const adminPaymentListQuerySchema = paginationQuerySchema.merge(paymentListQuerySchema);
export const adminAuditListQuerySchema = paginationQuerySchema.merge(auditLogQuerySchema);
export const adminCallbackListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['NEW', 'CONTACTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
});

export const adminPlanListQuerySchema = paginationQuerySchema.extend({
  status: publishStatusSchema.optional(),
  kind: planKindSchema.optional(),
});

export const adminProductListQuerySchema = paginationQuerySchema.extend({
  status: publishStatusSchema.optional(),
  serviceType: z.enum(['INTERNET', 'TV', 'PHONE']).optional(),
});

export const adminFaqListQuerySchema = paginationQuerySchema.extend({
  status: publishStatusSchema.optional(),
  categoryId: uuidSchema.optional(),
});

export const adminStaffListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DISABLED']).optional(),
  role: roleNameSchema.optional(),
});

export const adminSubscriptionListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'CANCELLED', 'EXPIRED']).optional(),
  cityId: uuidSchema.optional(),
  planId: uuidSchema.optional(),
});

export const adminLeadListQuerySchema = paginationQuerySchema.extend({
  status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST']).optional(),
  cityId: uuidSchema.optional(),
});

export const adminCoverageZoneListQuerySchema = paginationQuerySchema.extend({
  cityId: uuidSchema.optional(),
  status: z.enum(['AVAILABLE', 'NOT_AVAILABLE', 'COMING_SOON']).optional(),
});

export const updateCoverageLeadSchema = z.object({
  status: z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST']).optional(),
  assignedToId: uuidSchema.nullable().optional(),
  notes: z.string().trim().max(1000).optional(),
});

export type CreateStaffUserInput = z.input<typeof createStaffUserSchema>;
export type UpdateCustomerInput = z.input<typeof updateCustomerSchema>;
export type AuditLogQueryInput = z.input<typeof auditLogQuerySchema>;
