import { Inject, Injectable, Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import { redactSecrets } from '../../../common/utils/otp-hash';
import { APP_CONFIG, type AppConfig } from '../../../config/configuration';

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface MailDeliveryResult {
  delivered: boolean;
  providerRef: string | null;
  error?: string;
}

export interface MailProvider {
  readonly name: string;
  send(message: MailMessage): Promise<MailDeliveryResult>;
}

export const MAIL_PROVIDER = 'MAIL_PROVIDER';

/** Development transport: logs the message instead of sending it. */
@Injectable()
export class ConsoleMailProvider implements MailProvider {
  readonly name = 'console';
  private readonly logger = new Logger(ConsoleMailProvider.name);

  async send(message: MailMessage): Promise<MailDeliveryResult> {
    this.logger.log(
      `[email → ${message.to}] ${redactSecrets(message.subject)}\n${redactSecrets(message.text)}`,
    );
    return { delivered: true, providerRef: `console-${Date.now()}` };
  }
}

@Injectable()
export class SmtpMailProvider implements MailProvider {
  readonly name = 'smtp';
  private readonly logger = new Logger(SmtpMailProvider.name);
  private transporter: Transporter | null = null;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  private getTransporter(): Transporter {
    if (!this.transporter) {
      const { host, port, secure, user, password } = this.config.mail;
      this.transporter = createTransport({
        host,
        port: port ?? (secure ? 465 : 587),
        secure,
        auth: user && password ? { user, pass: password } : undefined,
      });
    }

    return this.transporter;
  }

  async send(message: MailMessage): Promise<MailDeliveryResult> {
    try {
      const info = await this.getTransporter().sendMail({
        from: this.config.mail.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });

      return { delivered: true, providerRef: info.messageId ?? null };
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown SMTP error';
      this.logger.error(`SMTP delivery to ${message.to} failed: ${reason}`);
      return { delivered: false, providerRef: null, error: reason };
    }
  }
}
