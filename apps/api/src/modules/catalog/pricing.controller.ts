import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { PriceQuoteDto } from '@stormfiber/types';
import { priceQuoteSchema } from '@stormfiber/validation';
import { Public } from '../../common/decorators/auth.decorators';
import { ResponseMessage } from '../../common/decorators/response.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ApiEnvelope, ApiErrorEnvelope, ApiZodBody } from '../../common/swagger/zod-swagger';
import { type PricingService, type QuoteRequest } from './pricing.service';

/**
 * The only endpoint that produces a price.
 *
 * The website calls it before showing any total, and the application flow calls it again at
 * submission time — a quote sent up from the browser is never trusted.
 */
@ApiTags('Pricing')
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricing: PricingService) {}

  @Post('quote')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Price calculated')
  @ApiOperation({ summary: 'Server-computed price breakdown for a plan, city and add-on selection' })
  @ApiZodBody(priceQuoteSchema)
  @ApiEnvelope(HttpStatus.OK, 'Full price breakdown including taxes and discounts')
  @ApiErrorEnvelope(
    HttpStatus.CONFLICT,
    'The plan is not sold in the requested city',
    'PLAN_UNAVAILABLE_IN_CITY',
  )
  quote(@Body(new ZodValidationPipe(priceQuoteSchema)) body: QuoteRequest): Promise<PriceQuoteDto> {
    return this.pricing.quote(body);
  }
}
