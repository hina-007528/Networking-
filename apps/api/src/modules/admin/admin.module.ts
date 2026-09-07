import { Module } from '@nestjs/common';
import { ApplicationsModule } from '../applications/applications.module';
import { BillingModule } from '../billing/billing.module';
import { CallbacksModule } from '../callbacks/callbacks.module';
import { CatalogModule } from '../catalog/catalog.module';
import { CmsModule } from '../cms/cms.module';
import { CoverageModule } from '../coverage/coverage.module';
import { CustomersModule } from '../customers/customers.module';
import { GeographyModule } from '../geography/geography.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { SupportModule } from '../support/support.module';
import { AdminApplicationsController } from './admin-applications.controller';
import { AdminAuditController } from './admin-audit.controller';
import { AdminBillingController } from './admin-billing.controller';
import { AdminCallbacksController } from './admin-callbacks.controller';
import { AdminCatalogController } from './admin-catalog.controller';
import { AdminCmsController } from './admin-cms.controller';
import { AdminCoverageController } from './admin-coverage.controller';
import { AdminCustomersController } from './admin-customers.controller';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminFaqsController } from './admin-faqs.controller';
import { AdminGeographyController } from './admin-geography.controller';
import { AdminSubscriptionsController } from './admin-subscriptions.controller';
import { AdminTicketsController } from './admin-tickets.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';

@Module({
  imports: [
    CustomersModule,
    ApplicationsModule,
    BillingModule,
    SupportModule,
    CallbacksModule,
    CatalogModule,
    GeographyModule,
    CoverageModule,
    CmsModule,
    SubscriptionsModule,
  ],
  controllers: [
    AdminDashboardController,
    AdminCustomersController,
    AdminApplicationsController,
    AdminSubscriptionsController,
    AdminCatalogController,
    AdminGeographyController,
    AdminCoverageController,
    AdminCmsController,
    AdminFaqsController,
    AdminUsersController,
    AdminTicketsController,
    AdminCallbacksController,
    AdminBillingController,
    AdminAuditController,
  ],
  providers: [AdminDashboardService, AdminUsersService],
})
export class AdminModule {}
