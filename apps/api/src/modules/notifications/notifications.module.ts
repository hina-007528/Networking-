import { Global, Module, type Provider } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../config/configuration';
import {
  ConsoleMailProvider,
  MAIL_PROVIDER,
  type MailProvider,
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
  useFactory: (config: AppConfig): MailProvider =>
    config.mail.provider === 'smtp' ? new SmtpMailProvider(config) : new ConsoleMailProvider(),
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
