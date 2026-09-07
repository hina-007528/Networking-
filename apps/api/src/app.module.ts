import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AppConfigModule } from './config/config.module';
import { APP_CONFIG, type AppConfig } from './config/configuration';
import { PrismaModule } from './common/prisma/prisma.module';
import { CacheModule } from './common/cache/cache.module';
import { QueueModule } from './common/queue/queue.module';
import { AuditModule } from './common/audit/audit.module';
import { SequenceModule } from './common/sequence/sequence.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from './modules/auth/guards/roles.guard';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { HealthModule } from './modules/health/health.module';
import { GeographyModule } from './modules/geography/geography.module';
import { CoverageModule } from './modules/coverage/coverage.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { CustomersModule } from './modules/customers/customers.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { BillingModule } from './modules/billing/billing.module';
import { OrdersModule } from './modules/orders/orders.module';
import { StorageModule } from './modules/storage/storage.module';
import { SupportModule } from './modules/support/support.module';
import { CallbacksModule } from './modules/callbacks/callbacks.module';
import { CmsModule } from './modules/cms/cms.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AdminModule } from './modules/admin/admin.module';

/**
 * Root module.
 *
 * Guard order is load-bearing: rate limiting runs first so an unauthenticated flood is rejected
 * before any token work, then authentication, then authorisation.
 */
@Module({
  imports: [
    AppConfigModule,
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        throttlers: [{ ttl: config.throttle.ttl * 1000, limit: config.throttle.limit }],
      }),
    }),
    PrismaModule,
    CacheModule,
    QueueModule,
    AuditModule,
    SequenceModule,
    StorageModule,
    AnalyticsModule,
    AuthModule,
    NotificationsModule,
    GeographyModule,
    CoverageModule,
    CatalogModule,
    ApplicationsModule,
    CustomersModule,
    SubscriptionsModule,
    BillingModule,
    OrdersModule,
    SupportModule,
    CallbacksModule,
    CmsModule,
    AdminModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
