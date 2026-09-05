import { Inject, Injectable, Logger } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../../config/configuration';

export interface SmsMessage {
  to: string;
  body: string;
}

export interface SmsDeliveryResult {
  delivered: boolean;
  providerRef: string | null;
  error?: string;
}

export interface SmsProvider {
  readonly name: string;
  send(message: SmsMessage): Promise<SmsDeliveryResult>;
}

export const SMS_PROVIDER = 'SMS_PROVIDER';

/** Development transport: logs the message instead of sending it. */
@Injectable()
export class ConsoleSmsProvider implements SmsProvider {
  readonly name = 'console';
  private readonly logger = new Logger(ConsoleSmsProvider.name);

  async send(message: SmsMessage): Promise<SmsDeliveryResult> {
    this.logger.log(`[sms → ${message.to}] ${message.body}`);
    return { delivered: true, providerRef: `console-${Date.now()}` };
  }
}

/**
 * Generic HTTP gateway transport, shaped for the JSON APIs local Pakistani aggregators expose.
 * Swap in a vendor-specific provider by implementing `SmsProvider` and rebinding `SMS_PROVIDER`.
 */
@Injectable()
export class HttpSmsProvider implements SmsProvider {
  readonly name = 'http';
  private readonly logger = new Logger(HttpSmsProvider.name);
  private readonly timeoutMs = 10_000;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  async send(message: SmsMessage): Promise<SmsDeliveryResult> {
    const { apiUrl, apiKey, senderId } = this.config.sms;

    if (!apiUrl) {
      return { delivered: false, providerRef: null, error: 'SMS_API_URL is not configured' };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({ to: message.to, from: senderId, text: message.body }),
        signal: controller.signal,
      });

      if (!response.ok) {
        return {
          delivered: false,
          providerRef: null,
          error: `Gateway responded with ${response.status}`,
        };
      }

      const payload = (await response.json().catch(() => ({}))) as { id?: string };
      return { delivered: true, providerRef: payload.id ?? null };
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Unknown SMS gateway error';
      this.logger.error(`SMS delivery to ${message.to} failed: ${reason}`);
      return { delivered: false, providerRef: null, error: reason };
    } finally {
      clearTimeout(timeout);
    }
  }
}
