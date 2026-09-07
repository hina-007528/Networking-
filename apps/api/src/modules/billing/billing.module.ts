import { Module } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../config/configuration';
import { CatalogModule } from '../catalog/catalog.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { BillingService } from './billing.service';
import { InvoicePdfService } from './invoice-pdf.service';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { HttpGatewayPaymentProvider } from './providers/http-gateway.provider';
import { OfflinePaymentProvider } from './providers/offline.provider';
import type { PaymentProvider } from './providers/payment-provider.interface';
import {
  ONLINE_PAYMENT_PROVIDER,
  PaymentProviderRegistry,
} from './providers/payment-provider.registry';
import { SandboxPaymentProvider } from './providers/sandbox.provider';
import { BillingScheduler } from './billing.scheduler';

/**
 * Invoices, payments and refunds.
 *
 * The online gateway is chosen at boot from `PAYMENT_PROVIDER`; everything downstream depends on
 * the `PaymentProvider` interface, so no business logic knows which gateway is configured. When no
 * gateway credentials are available the sandbox adapter is used, which implements the same contract
 * without pretending a provider is connected.
 */
@Module({
  imports: [CatalogModule, SubscriptionsModule],
  controllers: [InvoicesController, PaymentsController],
  providers: [
    InvoicesService,
    InvoicePdfService,
    BillingService,
    BillingScheduler,
    PaymentsService,
    PaymentProviderRegistry,
    OfflinePaymentProvider,
    {
      provide: SandboxPaymentProvider,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) =>
        new SandboxPaymentProvider(config.payments.secret, config.http.url),
    },
    {
      provide: ONLINE_PAYMENT_PROVIDER,
      inject: [APP_CONFIG, SandboxPaymentProvider],
      useFactory: (config: AppConfig, sandbox: SandboxPaymentProvider): PaymentProvider => {
        if (config.payments.provider === 'mock') {
          return sandbox;
        }

        // The environment schema guarantees these are present for every non-mock provider.
        return new HttpGatewayPaymentProvider(config.payments.provider, {
          apiUrl: config.payments.apiUrl as string,
          apiKey: config.payments.apiKey as string,
          webhookSecret: config.payments.secret,
        });
      },
    },
  ],
  exports: [InvoicesService, PaymentsService, BillingService],
})
export class BillingModule {}
