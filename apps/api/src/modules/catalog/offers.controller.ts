import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { OfferDetailDto, PromotionDto } from '@stormfiber/types';
import { slugParamSchema } from '@stormfiber/validation';
import { Public } from '../../common/decorators/auth.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { type PlansService } from './plans.service';

/** Promotions are published to the public site as "offers". */
@ApiTags('Offers')
@Controller('offers')
export class OffersController {
  constructor(private readonly plans: PlansService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Live promotional offers' })
  list(): Promise<PromotionDto[]> {
    return this.plans.listPromotions();
  }

  @Get(':slug')
  @Public()
  @ApiOperation({ summary: 'One offer with the plans it applies to' })
  getBySlug(
    @Param(new ZodValidationPipe(slugParamSchema)) params: { slug: string },
  ): Promise<OfferDetailDto> {
    return this.plans.getPromotionBySlug(params.slug);
  }
}
