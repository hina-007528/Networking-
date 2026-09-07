import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  Permission,
  STAFF_ROLES,
  type Paginated,
  type PlanAddonDto,
  type PlanCategoryDto,
  type PlanDto,
  type PlanPriceDto,
  type ProductDto,
  type PromotionDto,
  type TaxRuleDto,
} from '@stormfiber/types';
import {
  adminPlanListQuerySchema,
  adminProductListQuerySchema,
  idParamSchema,
  upsertPlanAddonSchema,
  upsertPlanCategorySchema,
  upsertPlanPriceSchema,
  upsertPlanSchema,
  upsertProductSchema,
  upsertPromotionSchema,
  upsertTaxRuleSchema,
} from '@stormfiber/validation';
import {
  Ctx,
  CurrentUser,
  RequirePermissions,
  Roles,
  type RequestContext,
} from '../../common/decorators/auth.decorators';
import { ResponseMessage } from '../../common/decorators/response.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ApiZodBody, ApiZodQuery } from '../../common/swagger/zod-swagger';
import {
  PlansService,
  type AdminPlanListQuery,
  type UpsertPlanAddonPayload,
  type UpsertPlanCategoryPayload,
  type UpsertPlanPayload,
  type UpsertPlanPricePayload,
  type UpsertPromotionPayload,
  type UpsertTaxRulePayload,
} from '../catalog/plans.service';
import {
  ProductsService,
  type AdminProductListQuery,
  type UpsertProductPayload,
} from '../catalog/products.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles(...STAFF_ROLES)
@Controller('admin')
export class AdminCatalogController {
  constructor(
    private readonly plans: PlansService,
    private readonly products: ProductsService,
  ) {}

  @Get('plans')
  @RequirePermissions(Permission.PLANS_READ)
  @ApiOperation({ summary: 'Paginated plan catalogue including drafts' })
  @ApiZodQuery(adminPlanListQuerySchema)
  listPlans(
    @Query(new ZodValidationPipe(adminPlanListQuerySchema)) query: AdminPlanListQuery,
  ): Promise<Paginated<PlanDto>> {
    return this.plans.listAdmin(query);
  }

  @Get('plans/addons')
  @RequirePermissions(Permission.PLANS_READ)
  listAddons(): Promise<PlanAddonDto[]> {
    return this.plans.listAllAddons();
  }

  @Post('plans')
  @RequirePermissions(Permission.PLANS_WRITE)
  @ResponseMessage('Plan created')
  @ApiZodBody(upsertPlanSchema)
  createPlan(
    @Body(new ZodValidationPipe(upsertPlanSchema)) body: UpsertPlanPayload,
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<PlanDto> {
    return this.plans.createPlan(body, actorId, context);
  }

  @Get('plans/:id')
  @RequirePermissions(Permission.PLANS_READ)
  getPlan(@Param(new ZodValidationPipe(idParamSchema)) params: { id: string }): Promise<PlanDto> {
    return this.plans.getById(params.id);
  }

  @Patch('plans/:id')
  @RequirePermissions(Permission.PLANS_WRITE)
  @ResponseMessage('Plan updated')
  @ApiZodBody(upsertPlanSchema)
  updatePlan(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(upsertPlanSchema)) body: UpsertPlanPayload,
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<PlanDto> {
    return this.plans.updatePlan(params.id, body, actorId, context);
  }

  @Delete('plans/:id')
  @RequirePermissions(Permission.PLANS_WRITE)
  @ResponseMessage('Plan archived')
  archivePlan(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<void> {
    return this.plans.archivePlan(params.id, actorId, context);
  }

  @Get('plans/:id/prices')
  @RequirePermissions(Permission.PLANS_READ)
  listPrices(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
  ): Promise<PlanPriceDto[]> {
    return this.plans.listPrices(params.id);
  }

  @Post('plans/prices')
  @RequirePermissions(Permission.PLANS_WRITE)
  @ResponseMessage('City price saved')
  @ApiZodBody(upsertPlanPriceSchema)
  upsertPrice(
    @Body(new ZodValidationPipe(upsertPlanPriceSchema)) body: UpsertPlanPricePayload,
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<PlanPriceDto> {
    return this.plans.upsertPrice(body, actorId, context);
  }

  @Post('plans/addons')
  @RequirePermissions(Permission.PLANS_WRITE)
  @ResponseMessage('Add-on saved')
  @ApiZodBody(upsertPlanAddonSchema)
  createAddon(
    @Body(new ZodValidationPipe(upsertPlanAddonSchema)) body: UpsertPlanAddonPayload,
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<PlanAddonDto> {
    return this.plans.upsertAddon(body, actorId, context);
  }

  @Patch('plans/addons/:id')
  @RequirePermissions(Permission.PLANS_WRITE)
  @ApiZodBody(upsertPlanAddonSchema)
  updateAddon(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(upsertPlanAddonSchema)) body: UpsertPlanAddonPayload,
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<PlanAddonDto> {
    return this.plans.upsertAddon(body, actorId, context, params.id);
  }

  @Post('plans/categories')
  @RequirePermissions(Permission.PLANS_WRITE)
  @ApiZodBody(upsertPlanCategorySchema)
  createCategory(
    @Body(new ZodValidationPipe(upsertPlanCategorySchema)) body: UpsertPlanCategoryPayload,
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<PlanCategoryDto> {
    return this.plans.upsertCategory(body, actorId, context);
  }

  @Get('promotions')
  @RequirePermissions(Permission.PLANS_READ)
  listPromotions(): Promise<PromotionDto[]> {
    return this.plans.listAllPromotions();
  }

  @Post('promotions')
  @RequirePermissions(Permission.PLANS_WRITE)
  @ApiZodBody(upsertPromotionSchema)
  createPromotion(
    @Body(new ZodValidationPipe(upsertPromotionSchema)) body: UpsertPromotionPayload,
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<PromotionDto> {
    return this.plans.upsertPromotion(body, actorId, context);
  }

  @Patch('promotions/:id')
  @RequirePermissions(Permission.PLANS_WRITE)
  @ApiZodBody(upsertPromotionSchema)
  updatePromotion(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(upsertPromotionSchema)) body: UpsertPromotionPayload,
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<PromotionDto> {
    return this.plans.upsertPromotion(body, actorId, context, params.id);
  }

  @Get('products')
  @RequirePermissions(Permission.PLANS_READ)
  @ApiZodQuery(adminProductListQuerySchema)
  listProducts(
    @Query(new ZodValidationPipe(adminProductListQuerySchema)) query: AdminProductListQuery,
  ): Promise<Paginated<ProductDto>> {
    return this.products.listAdmin(query);
  }

  @Post('products')
  @RequirePermissions(Permission.PLANS_WRITE)
  @ApiZodBody(upsertProductSchema)
  createProduct(
    @Body(new ZodValidationPipe(upsertProductSchema)) body: UpsertProductPayload,
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<ProductDto> {
    return this.products.upsert(body, actorId, context);
  }

  @Patch('products/:id')
  @RequirePermissions(Permission.PLANS_WRITE)
  @ApiZodBody(upsertProductSchema)
  updateProduct(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(upsertProductSchema)) body: UpsertProductPayload,
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<ProductDto> {
    return this.products.upsert(body, actorId, context, params.id);
  }

  @Delete('products/:id')
  @RequirePermissions(Permission.PLANS_WRITE)
  @ResponseMessage('Product archived')
  archiveProduct(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<void> {
    return this.products.archive(params.id, actorId, context);
  }

  @Get('tax-rules')
  @RequirePermissions(Permission.PLANS_READ)
  listTaxRules(): Promise<TaxRuleDto[]> {
    return this.plans.listTaxRules();
  }

  @Post('tax-rules')
  @RequirePermissions(Permission.PLANS_WRITE)
  @ApiZodBody(upsertTaxRuleSchema)
  createTaxRule(
    @Body(new ZodValidationPipe(upsertTaxRuleSchema)) body: UpsertTaxRulePayload,
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<TaxRuleDto> {
    return this.plans.upsertTaxRule(body, actorId, context);
  }
}
