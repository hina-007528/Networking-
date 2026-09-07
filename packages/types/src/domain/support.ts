import type { PublishStatus, TicketPriority, TicketStatus } from '../enums';

export interface SupportCategoryDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  iconKey: string | null;
  displayOrder: number;
}

export interface FaqCategoryDto {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  iconKey: string | null;
  displayOrder: number;
  faqCount: number;
}

export interface FaqDto {
  id: string;
  question: string;
  slug: string;
  answer: string;
  categoryId: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  tags: string[];
  status?: PublishStatus;
  displayOrder: number;
  helpfulCount: number;
  updatedAt: string;
}

export interface FaqSearchQuery {
  search?: string;
  category?: string;
  page?: number;
  pageSize?: number;
}

export interface TicketAttachmentDto {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  createdAt: string;
}

export interface TicketMessageDto {
  id: string;
  ticketId: string;
  body: string;
  authorId: string | null;
  authorName: string;
  authorType: 'CUSTOMER' | 'AGENT' | 'SYSTEM';
  /** Internal notes are stripped from customer-facing responses by the API. */
  isInternal: boolean;
  attachments: TicketAttachmentDto[];
  createdAt: string;
}

export interface TicketStatusHistoryDto {
  id: string;
  fromStatus: TicketStatus | null;
  toStatus: TicketStatus;
  changedById: string | null;
  changedByName: string | null;
  note: string | null;
  createdAt: string;
}

export interface TicketDto {
  id: string;
  reference: string;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  categoryId: string | null;
  categoryName: string | null;
  customerId: string;
  customerName: string;
  assignedToId: string | null;
  assignedToName: string | null;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  messages: TicketMessageDto[];
  attachments: TicketAttachmentDto[];
  statusHistory: TicketStatusHistoryDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateTicketRequest {
  categoryId: string;
  subject: string;
  description: string;
  priority: TicketPriority;
  attachmentIds?: string[];
}

export interface CreateTicketMessageRequest {
  body: string;
  attachmentIds?: string[];
  isInternal?: boolean;
}
