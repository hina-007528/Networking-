import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { type PrismaService } from '../prisma/prisma.service';
import type { RequestContext } from '../decorators/auth.decorators';
import { redact } from '../utils/redaction';

/** Canonical audit actions. Using constants keeps the admin filter list honest. */
export const AuditAction = {
  LOGIN: 'auth.login',
  LOGIN_FAILED: 'auth.login_failed',
  LOGOUT: 'auth.logout',
  PASSWORD_RESET: 'auth.password_reset',
  PASSWORD_CHANGED: 'auth.password_changed',
  CUSTOMER_UPDATED: 'customer.updated',
  CUSTOMER_SUSPENDED: 'customer.suspended',
  CUSTOMER_ACTIVATED: 'customer.activated',
  PLAN_CREATED: 'plan.created',
  PLAN_UPDATED: 'plan.updated',
  PLAN_PUBLISHED: 'plan.published',
  PLAN_PRICE_CHANGED: 'plan.price_changed',
  PROMOTION_UPDATED: 'promotion.updated',
  COVERAGE_UPDATED: 'coverage.updated',
  APPLICATION_STATUS_CHANGED: 'application.status_changed',
  APPLICATION_APPROVED: 'application.approved',
  APPLICATION_REJECTED: 'application.rejected',
  SUBSCRIPTION_CHANGED: 'subscription.changed',
  INVOICE_CREATED: 'invoice.created',
  INVOICE_ADJUSTED: 'invoice.adjusted',
  PAYMENT_RECORDED: 'payment.recorded',
  PAYMENT_REFUNDED: 'payment.refunded',
  TICKET_ASSIGNED: 'ticket.assigned',
  TICKET_STATUS_CHANGED: 'ticket.status_changed',
  CONTENT_UPDATED: 'content.updated',
  CONTENT_PUBLISHED: 'content.published',
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  ROLE_PERMISSIONS_CHANGED: 'role.permissions_changed',
  SETTINGS_UPDATED: 'settings.updated',
} as const;
export type AuditAction = (typeof AuditAction)[keyof typeof AuditAction];

export interface AuditEntry {
  userId?: string | null;
  action: AuditAction | string;
  entity: string;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  context?: RequestContext | null;
}

/**
 * Writes the audit trail.
 *
 * Values are passed through `redact()` first, so a password hash, OTP code, token or card field
 * can never be persisted here even if a caller passes a whole entity by mistake.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: entry.userId ?? null,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId ?? null,
          oldValue: (redact(entry.oldValue ?? null) ?? null) as Prisma.InputJsonValue,
          newValue: (redact(entry.newValue ?? null) ?? null) as Prisma.InputJsonValue,
          ipAddress: entry.context?.ipAddress ?? null,
          userAgent: entry.context?.userAgent ?? null,
        },
      });
    } catch (error) {
      // An audit write must never break the business operation that triggered it.
      this.logger.error(
        `Failed to write audit entry ${entry.action} for ${entry.entity}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
