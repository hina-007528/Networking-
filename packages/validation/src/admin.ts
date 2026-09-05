import { z } from 'zod';
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

export type CreateStaffUserInput = z.input<typeof createStaffUserSchema>;
export type UpdateCustomerInput = z.input<typeof updateCustomerSchema>;
export type AuditLogQueryInput = z.input<typeof auditLogQuerySchema>;
