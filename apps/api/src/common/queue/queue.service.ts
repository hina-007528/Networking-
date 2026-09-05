import { Inject, Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { APP_CONFIG, type AppConfig } from '../../config/configuration';

/** Job names. Producers and the worker share these constants so a rename cannot desync them. */
export const QueueName = {
  NOTIFICATIONS: 'notifications',
  BILLING: 'billing',
  MAINTENANCE: 'maintenance',
} as const;
export type QueueName = (typeof QueueName)[keyof typeof QueueName];

export const JobName = {
  SEND_NOTIFICATION: 'send-notification',
  GENERATE_INVOICES: 'generate-invoices',
  MARK_OVERDUE_INVOICES: 'mark-overdue-invoices',
  SEND_INVOICE_REMINDERS: 'send-invoice-reminders',
  PRUNE_EXPIRED_TOKENS: 'prune-expired-tokens',
} as const;
export type JobName = (typeof JobName)[keyof typeof JobName];

export type InlineHandler = (jobName: string, payload: unknown) => Promise<void>;

/**
 * Producer side of the background job system.
 *
 * When `QUEUE_ENABLED` is false — the default for local development and tests — jobs run inline
 * through a registered handler instead of BullMQ. That keeps a single code path for callers while
 * removing Redis from the list of things a developer must install before the app works.
 */
@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private readonly queues = new Map<string, Queue>();
  private readonly inlineHandlers = new Map<string, InlineHandler>();
  private connection: Redis | null = null;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  get enabled(): boolean {
    return this.config.queue.enabled;
  }

  /** Lets a module process its own jobs synchronously when the queue is disabled. */
  registerInlineHandler(queue: QueueName, handler: InlineHandler): void {
    this.inlineHandlers.set(queue, handler);
  }

  async enqueue(
    queue: QueueName,
    jobName: JobName,
    payload: Record<string, unknown>,
    options: { delayMs?: number; attempts?: number; jobId?: string } = {},
  ): Promise<void> {
    if (!this.enabled) {
      await this.runInline(queue, jobName, payload);
      return;
    }

    try {
      await this.getQueue(queue).add(jobName, payload, {
        jobId: options.jobId,
        delay: options.delayMs,
        attempts: options.attempts ?? 3,
        backoff: { type: 'exponential', delay: 5_000 },
        removeOnComplete: { age: 3_600, count: 500 },
        removeOnFail: { age: 86_400 },
      });
    } catch (error) {
      this.logger.error(
        `Failed to enqueue ${jobName} on ${queue}; running inline instead: ${
          error instanceof Error ? error.message : 'unknown error'
        }`,
      );
      await this.runInline(queue, jobName, payload);
    }
  }

  private async runInline(queue: QueueName, jobName: JobName, payload: Record<string, unknown>): Promise<void> {
    const handler = this.inlineHandlers.get(queue);

    if (!handler) {
      this.logger.warn(`Dropped ${jobName}: queue ${queue} is disabled and has no inline handler`);
      return;
    }

    try {
      await handler(jobName, payload);
    } catch (error) {
      this.logger.error(
        `Inline execution of ${jobName} failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  private getConnection(): Redis {
    if (!this.connection) {
      this.connection = new Redis(this.config.redis.url, { maxRetriesPerRequest: null });
    }
    return this.connection;
  }

  private getQueue(name: QueueName): Queue {
    let queue = this.queues.get(name);
    if (!queue) {
      queue = new Queue(name, { connection: this.getConnection() });
      this.queues.set(name, queue);
    }
    return queue;
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([...this.queues.values()].map((queue) => queue.close().catch(() => undefined)));
    this.queues.clear();
    if (this.connection) {
      this.connection.disconnect();
      this.connection = null;
    }
  }
}
