import { z } from 'zod';
import { paginationQuerySchema } from './common';
import { messageSchema, slugSchema, uuidSchema } from './primitives';

export const ticketPrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);

export const ticketStatusSchema = z.enum([
  'OPEN',
  'IN_PROGRESS',
  'WAITING_FOR_CUSTOMER',
  'RESOLVED',
  'CLOSED',
]);

export const createTicketSchema = z.object({
  categoryId: uuidSchema,
  subject: z.string().trim().min(5, 'Add a short subject').max(160),
  description: messageSchema,
  priority: ticketPrioritySchema.default('MEDIUM'),
  attachmentIds: z.array(uuidSchema).max(5, 'Attach up to 5 files').default([]),
});

export const createTicketMessageSchema = z.object({
  body: z.string().trim().min(1, 'Write a message').max(4000),
  attachmentIds: z.array(uuidSchema).max(5).default([]),
  isInternal: z.boolean().default(false),
});

export const updateTicketSchema = z.object({
  status: ticketStatusSchema.optional(),
  priority: ticketPrioritySchema.optional(),
  assignedToId: uuidSchema.nullable().optional(),
  note: z.string().trim().max(1000).optional(),
});

export const ticketListQuerySchema = paginationQuerySchema.extend({
  status: ticketStatusSchema.optional(),
  priority: ticketPrioritySchema.optional(),
  categoryId: uuidSchema.optional(),
  assignedToId: uuidSchema.optional(),
  customerId: uuidSchema.optional(),
});

export const customerTicketQuerySchema = paginationQuerySchema
  .omit({ search: true, sort: true })
  .extend({
    status: ticketStatusSchema.optional(),
  });

export const faqSearchSchema = z.object({
  search: z.string().trim().max(120).optional(),
  category: slugSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const upsertFaqSchema = z.object({
  question: z.string().trim().min(8, 'Write the full question').max(240),
  slug: slugSchema,
  answer: z.string().trim().min(10, 'Write an answer').max(8000),
  categoryId: uuidSchema.optional(),
  tags: z.array(z.string().trim().min(2).max(40)).max(10).default([]),
  displayOrder: z.coerce.number().int().min(0).default(0),
  status: z.enum(['DRAFT', 'PUBLISHED', 'SCHEDULED', 'EXPIRED', 'ARCHIVED']).default('PUBLISHED'),
});

export const upsertFaqCategorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: slugSchema,
  description: z.string().trim().max(500).optional(),
  iconKey: z.string().trim().max(60).optional(),
  displayOrder: z.coerce.number().int().min(0).default(0),
});

export const upsertSupportCategorySchema = upsertFaqCategorySchema;

export const updateCallbackSchema = z.object({
  status: z.enum(['NEW', 'CONTACTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  assignedToId: uuidSchema.nullable().optional(),
  note: z.string().trim().max(1000).optional(),
});

export type CreateTicketInput = z.input<typeof createTicketSchema>;
export type CreateTicketMessageInput = z.input<typeof createTicketMessageSchema>;
export type UpdateTicketInput = z.input<typeof updateTicketSchema>;
export type UpsertFaqInput = z.input<typeof upsertFaqSchema>;
export type CustomerTicketQuery = z.output<typeof customerTicketQuerySchema>;
