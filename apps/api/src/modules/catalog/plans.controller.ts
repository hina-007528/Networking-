import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Paginated, PlanAddonDto, PlanCategoryDto, PlanDto } from '@stormfiber/types';
import {
  addonScopeQuerySchema,
  cityScopeQuerySchema,
  planCompareSchema,
  planFilterSchema,
  slugParamSchema,
} from '@stormfiber/validation';
import { Public } from '../../common/decorators/auth.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ApiZodQuery } from '../../common/swagger/zod-swagger';
import { type PlansService, type PlanComparePayload, type PlanFilterPayload } from './plans.service';

/**
 * Public plan catalogue.
 *
 * Route order matters here: the literal `categories`, `addons` and `compare` segments are declared
 * before `:slug` so they are not swallowed by the dynamic parameter.
 */
@ApiTags('Plans')
@Controller('plans')
export class PlansController {
  constructor(private readonly plans: PlansService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Browse plans, filtered and paginated server-side' })
  @ApiZodQuery(planFilterSchema)
  list(
    @Query(new ZodValidationPipe(planFilterSchema)) query: PlanFilterPayload,
  ): Promise<Paginated<PlanDto>> {
    return this.plans.list(query);
  }

  @Get('categories')
  @Public()
  @ApiOperation({ summary: 'Plan categories with published plan counts' })
  listCategories(): Promise<PlanCategoryDto[]> {
    return this.plans.listCategories();
  }

  @Get('addons')
  @Public()
  @ApiOperation({ summary: 'Available add-ons, optionally narrowed to one plan' })
  @ApiZodQuery(addonScopeQuerySchema)
  listAddons(
    @Query(new ZodValidationPipe(addonScopeQuerySchema)) query: { plan?: string },
  ): Promise<PlanAddonDto[]> {
    return this.plans.listAddons(query.plan);
  }

  @Get('compare')
  @Public()
  @ApiOperation({ summary: 'Compare two to four plans side by side' })
  @ApiZodQuery(planCompareSchema)
  compare(
    @Query(new ZodValidationPipe(planCompareSchema)) query: PlanComparePayload,
  ): Promise<PlanDto[]> {
    return this.plans.compare(query);
  }

  @Get(':slug')
  @Public()
  @ApiOperation({ summary: 'A single plan, priced for an optional city' })
  @ApiZodQuery(cityScopeQuerySchema)
  getBySlug(
    @Param(new ZodValidationPipe(slugParamSchema)) params: { slug: string },
    @Query(new ZodValidationPipe(cityScopeQuerySchema)) query: { city?: string },
  ): Promise<PlanDto> {
    return this.plans.getBySlug(params.slug, query.city ?? null);
  }
}
