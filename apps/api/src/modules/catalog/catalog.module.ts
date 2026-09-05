import { Module } from '@nestjs/common';
import { OffersController } from './offers.controller';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

/**
 * The product and plan catalogue, plus the pricing engine.
 *
 * `PricingService` is exported because the application, subscription and billing modules must all
 * price through the same code path the website quoted from.
 */
@Module({
  controllers: [PlansController, ProductsController, OffersController, PricingController],
  providers: [PlansService, ProductsService, PricingService],
  exports: [PlansService, ProductsService, PricingService],
})
export class CatalogModule {}
