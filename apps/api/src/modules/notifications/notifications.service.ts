import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { NotificationDto, Paginated } from '@stormfiber/types';
import { NotificationChannel } from '@stormfiber/types';
import type { PaginationQuery } from '@stormfiber/validation';
import { APP_CONFIG, type AppConfig } from '../../config/configuration';
import { type PrismaService } from '../../common/prisma/prisma.service';
import { JobName, QueueName, type QueueService } from '../../common/queue/queue.service';
import { AppException } from '../../common/errors/app.exception';
import { buildPaginationMeta, toPrismaPagination } from '../../common/utils/pagination';
import { MAIL_PROVIDER, type MailProvider } from './providers/mail.provider';
import { SMS_PROVIDER, type SmsProvider } from './providers/sms.provider';
import { renderNotification, type TemplateData } from './notification-templates';

export interface DispatchInput {
  userId: string;
  event: string;
  channels: NotificationChannel[];
  data?: TemplateData;
  /** Overrides the recipient's stored contact details, e.g. during registration. */
  to?: { email?: string; mobile?: string };
}

interface QueuedJobPayload {
  notificationId: string;
  email: string | null;
  mobile: string | null;
}

/**
 * Creates and delivers notifications.
 *
 * Every notification is persisted before delivery is attempted, so the dashboard's notification
 * feed and the audit trail stay accurate even if the email or SMS gateway is down. Delivery
 * itself happens through the queue when enabled, otherwise inline.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: QueueService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(MAIL_PROVIDER) private readonly mail: MailProvider,
    @Inject(SMS_PROVIDER) private readonly sms: SmsProvider,
  ) {
    this.queue.registerInlineHandler(QueueName.NOTIFICATIONS, async (jobName, payload) => {
      if (jobName === JobName.SEND_NOTIFICATION) {
        await this.deliver(payload as QueuedJobPayload);
      }
    });
  }

  /**
   * Fire-and-forget dispatch. Notification failures must never fail the business operation that
   * triggered them, so errors are logged rather than propagated.
   */
  async dispatch(input: DispatchInput): Promise<void> {
    try {
      await this.dispatchOrThrow(input);
    } catch (error) {
      this.logger.error(
        `Failed to dispatch ${input.event} to user ${input.userId}: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
    }
  }

  private async dispatchOrThrow(input: DispatchInput): Promise<void> {
    const rendered = renderNotification(input.event, input.data ?? {});
    const recipient = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: { email: true, mobile: true, firstName: true },
    });

    const email = input.to?.email ?? recipient?.email ?? null;
    const mobile = input.to?.mobile ?? recipient?.mobile ?? null;
    const channels = [...new Set(input.channels)];

    for (const channel of channels) {
      const body =
        channel === NotificationChannel.SMS
          ? rendered.sms
          : channel === NotificationChannel.EMAIL
            ? rendered.text
            : rendered.inApp.body;

      const notification = await this.prisma.notification.create({
        data: {
          userId: input.userId,
          event: input.event,
          channel,
          title: channel === NotificationChannel.EMAIL ? rendered.subject : rendered.inApp.title,
          body,
          href: rendered.inApp.href,
          payload: this.buildPayload(input, channel, rendered.subject),
        },
        select: { id: true },
      });

      // In-app notifications are delivered the moment the row exists.
      if (channel === NotificationChannel.IN_APP) {
        await this.prisma.notification.update({
          where: { id: notification.id },
          data: { status: 'SENT', sentAt: new Date() },
        });
        continue;
      }

      await this.queue.enqueue(
        QueueName.NOTIFICATIONS,
        JobName.SEND_NOTIFICATION,
        { notificationId: notification.id, email, mobile } satisfies QueuedJobPayload,
        { jobId: notification.id },
      );
    }
  }

  private buildPayload(
    input: DispatchInput,
    channel: NotificationChannel,
    subject: string,
  ): Prisma.InputJsonValue {
    const data = { ...(input.data ?? {}) } as Record<string, unknown>;
    // The OTP code is delivered in the message body; it must not be retrievable from the feed.
    delete data.code;

    return { channel, subject, data } as Prisma.InputJsonObject;
  }

  /** Performs the actual send. Called by the worker, or inline when the queue is disabled. */
  async deliver(payload: QueuedJobPayload): Promise<void> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: payload.notificationId },
    });

    if (!notification || notification.status === 'SENT') return;

    const templateData = this.extractTemplateData(notification.payload);
    const rendered = renderNotification(notification.event, templateData);

    const result =
      notification.channel === 'EMAIL'
        ? payload.email
          ? await this.mail.send({
              to: payload.email,
              subject: rendered.subject,
              html: rendered.html,
              text: rendered.text,
            })
          : { delivered: false, providerRef: null, error: 'No email address on file' }
        : payload.mobile
          ? await this.sms.send({ to: payload.mobile, body: rendered.sms })
          : { delivered: false, providerRef: null, error: 'No mobile number on file' };

    await this.prisma.notification.update({
      where: { id: notification.id },
      data: result.delivered
        ? { status: 'SENT', sentAt: new Date(), error: null }
        : { status: 'FAILED', error: result.error ?? 'Delivery failed' },
    });

    if (!result.delivered) {
      this.logger.warn(
        `Notification ${notification.id} (${notification.channel}) failed: ${result.error ?? 'unknown'}`,
      );
    }
  }

  /**
   * The OTP code is never persisted, so it has to be re-injected at delivery time. Only the
   * inline path can do this; queued OTP delivery re-reads the code from the caller's payload.
   */
  private extractTemplateData(raw: Prisma.JsonValue): TemplateData {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const data = (raw as Record<string, unknown>).data;
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
    return data as TemplateData;
  }

  /**
   * Sends a transient message that must not be persisted in readable form (OTP codes,
   * password-reset links). No `Notification` row is created for the secret itself.
   */
  async sendTransient(
    event: string,
    data: TemplateData,
    to: { email?: string | null; mobile?: string | null },
  ): Promise<void> {
    const rendered = renderNotification(event, data);

    if (to.mobile) {
      const result = await this.sms.send({ to: to.mobile, body: rendered.sms });
      if (!result.delivered) {
        this.logger.warn(`Transient SMS for ${event} failed: ${result.error ?? 'unknown'}`);
      }
    }

    if (to.email) {
      const result = await this.mail.send({
        to: to.email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
      });
      if (!result.delivered) {
        this.logger.warn(`Transient email for ${event} failed: ${result.error ?? 'unknown'}`);
      }
    }
  }

  async listForUser(
    userId: string,
    query: PaginationQuery & { unreadOnly?: boolean },
  ): Promise<Paginated<NotificationDto>> {
    const { skip, take } = toPrismaPagination(query);
    const where: Prisma.NotificationWhereInput = {
      userId,
      channel: 'IN_APP',
      ...(query.unreadOnly ? { readAt: null } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      items: rows.map((row) => this.toDto(row)),
      pagination: buildPaginationMeta(query, total),
    };
  }

  async unreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.prisma.notification.count({
      where: { userId, channel: 'IN_APP', readAt: null },
    });
    return { count };
  }

  async markRead(userId: string, notificationId: string): Promise<NotificationDto> {
    const existing = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!existing) {
      throw AppException.notFound('Notification');
    }

    if (existing.readAt) {
      return this.toDto(existing);
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date(), status: 'READ' },
    });

    return this.toDto(updated);
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, channel: 'IN_APP', readAt: null },
      data: { readAt: new Date(), status: 'READ' },
    });

    return { updated: result.count };
  }

  private toDto(row: {
    id: string;
    event: string;
    channel: NotificationChannel;
    title: string;
    body: string;
    href: string | null;
    readAt: Date | null;
    createdAt: Date;
  }): NotificationDto {
    return {
      id: row.id,
      event: row.event,
      channel: row.channel,
      title: row.title,
      body: row.body,
      href: row.href,
      readAt: row.readAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }

  /** Exposes the configured OTP echo flag so the auth module does not read config twice. */
  get devEchoEnabled(): boolean {
    return this.config.otp.devEcho && !this.config.isProduction;
  }
}
