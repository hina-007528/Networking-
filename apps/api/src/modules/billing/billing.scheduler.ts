import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { JobName, QueueName, QueueService } from '../../common/queue/queue.service';
import { InvoicesService } from './invoices.service';

/**
 * Daily billing maintenance.
 *
 * The cron only enqueues work. When Redis is disabled the queue runs the same handlers inline,
 * so local development still produces invoices without a worker process.
 */
@Injectable()
export class BillingScheduler {
  private readonly logger = new Logger(BillingScheduler.name);

  constructor(
    private readonly queue: QueueService,
    private readonly invoices: InvoicesService,
  ) {
    this.queue.registerInlineHandler(QueueName.BILLING, async (jobName) => {
      if (jobName === JobName.GENERATE_INVOICES) {
        await this.invoices.runBillingCycle();
        return;
      }
      if (jobName === JobName.MARK_OVERDUE_INVOICES) {
        await this.invoices.markOverdue();
        return;
      }
      if (jobName === JobName.SEND_INVOICE_REMINDERS) {
        await this.invoices.sendReminders();
      }
    });
  }

  @Cron('0 1 * * *', { timeZone: 'Asia/Karachi', name: 'billing.generate' })
  async enqueueGeneration(): Promise<void> {
    this.logger.log('Enqueueing invoice generation');
    await this.queue.enqueue(QueueName.BILLING, JobName.GENERATE_INVOICES, {}, {
      jobId: `generate-${utcDay()}`,
    });
  }

  @Cron('0 2 * * *', { timeZone: 'Asia/Karachi', name: 'billing.overdue' })
  async enqueueOverdue(): Promise<void> {
    await this.queue.enqueue(QueueName.BILLING, JobName.MARK_OVERDUE_INVOICES, {}, {
      jobId: `overdue-${utcDay()}`,
    });
  }

  @Cron('0 9 * * *', { timeZone: 'Asia/Karachi', name: 'billing.reminders' })
  async enqueueReminders(): Promise<void> {
    await this.queue.enqueue(QueueName.BILLING, JobName.SEND_INVOICE_REMINDERS, {}, {
      jobId: `reminders-${utcDay()}`,
    });
  }
}

function utcDay(): string {
  return new Date().toISOString().slice(0, 10);
}
