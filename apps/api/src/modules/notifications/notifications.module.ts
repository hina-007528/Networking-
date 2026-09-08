import { Global, Module, type Provider } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../config/configuration';
import {
  ConsoleMailProvider,
  FallbackMailProvider,
  MAIL_PROVIDER,
  type MailProvider,
  ResendMailProvider,
  SmtpMailProvider,
} from './providers/mail.provider';
import {
  ConsoleSmsProvider,
  HttpSmsProvider,
  SMS_PROVIDER,
  type SmsProvider,
} from './providers/sms.provider';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

/**
 * Transports are selected once, at boot, from configuration. Application code depends on the
 * `MailProvider` / `SmsProvider` interfaces and never on a concrete gateway.
 */
const mailProvider: Provider = {
  provide: MAIL_PROVIDER,
  inject: [APP_CONFIG],
  useFactory: (config: AppConfig): MailProvider => {
    const resend = config.mail.resendApiKey ? new ResendMailProvider(config) : null;
    if (config.mail.provider === 'resend') {
      return resend ?? new ConsoleMailProvider();
    }
    if (config.mail.provider === 'smtp') {
      const smtp = new SmtpMailProvider(config);
      return resend ? new FallbackMailProvider(smtp, resend) : smtp;
    }
    if (resend && process.env.NODE_ENV === 'production') {
      return resend;
    }
    return new ConsoleMailProvider();
  },
};

const smsProvider: Provider = {
  provide: SMS_PROVIDER,
  inject: [APP_CONFIG],
  useFactory: (config: AppConfig): SmsProvider =>
    config.sms.provider === 'http' ? new HttpSmsProvider(config) : new ConsoleSmsProvider(),
};

@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, mailProvider, smsProvider],
  exports: [NotificationsService],
})
export class NotificationsModule {}
