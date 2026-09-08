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
    if (process.env.NODE_ENV === 'production') {
      this.logger.error(
        `MAIL_PROVIDER=console in production; OTP/email to ${message.to} was not sent`,
      );
      return {
        delivered: false,
        providerRef: null,
        error: 'Email is not configured on the server (set MAIL_PROVIDER=smtp)',
      };
    }
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
      const smtpPort = port ?? (secure ? 465 : 587);
      const useTls = secure || smtpPort === 465;
      this.transporter = createTransport({
        host,
        port: smtpPort,
        secure: useTls,
        family: 4,
        connectionTimeout: 20_000,
        greetingTimeout: 20_000,
        socketTimeout: 30_000,
        auth: user && password ? { user, pass: password } : undefined,
        tls: { minVersion: 'TLSv1.2' },
      });
    }

    return this.transporter;
  }

  async send(message: MailMessage): Promise<MailDeliveryResult> {
    try {
      const transporter = this.getTransporter();
      const info = await transporter.sendMail({
        from: this.config.mail.from,
        envelope: this.config.mail.user
          ? { from: this.config.mail.user, to: message.to }
          : undefined,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
        replyTo: this.config.mail.user || undefined,
      });

      this.logger.log(`SMTP accepted mail to ${message.to} (${info.messageId ?? 'no-id'})`);
      return { delivered: true, providerRef: info.messageId ?? null };
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown SMTP error';
      this.logger.error(`SMTP delivery to ${message.to} failed: ${reason}`);
      return { delivered: false, providerRef: null, error: reason };
    }
  }
}
