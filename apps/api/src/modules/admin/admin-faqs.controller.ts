import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission, STAFF_ROLES, type FaqCategoryDto, type FaqDto, type Paginated } from '@stormfiber/types';
import {
  adminFaqListQuerySchema,
  idParamSchema,
  upsertFaqCategorySchema,
  upsertFaqSchema,
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
  FaqsService,
  type AdminFaqListQuery,
  type UpsertFaqCategoryPayload,
  type UpsertFaqPayload,
} from '../support/faqs.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles(...STAFF_ROLES)
@Controller('admin/faqs')
export class AdminFaqsController {
  constructor(private readonly faqs: FaqsService) {}

  @Get()
  @RequirePermissions(Permission.CONTENT_READ)
  @ApiOperation({ summary: 'Paginated FAQs including drafts' })
  @ApiZodQuery(adminFaqListQuerySchema)
  list(
    @Query(new ZodValidationPipe(adminFaqListQuerySchema)) query: AdminFaqListQuery,
  ): Promise<Paginated<FaqDto>> {
    return this.faqs.listAdmin(query);
  }

  @Get('categories')
  @RequirePermissions(Permission.CONTENT_READ)
  categories(): Promise<FaqCategoryDto[]> {
    return this.faqs.listCategories();
  }

  @Post()
  @RequirePermissions(Permission.CONTENT_WRITE)
  @ApiZodBody(upsertFaqSchema)
  create(
    @Body(new ZodValidationPipe(upsertFaqSchema)) body: UpsertFaqPayload,
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<FaqDto> {
    return this.faqs.upsertFaq(body, actorId, context);
  }

  @Patch(':id')
  @RequirePermissions(Permission.CONTENT_WRITE)
  @ApiZodBody(upsertFaqSchema)
  update(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(upsertFaqSchema)) body: UpsertFaqPayload,
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<FaqDto> {
    return this.faqs.upsertFaq(body, actorId, context, params.id);
  }

  @Delete(':id')
  @RequirePermissions(Permission.CONTENT_WRITE)
  @ResponseMessage('FAQ archived')
  archive(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<void> {
    return this.faqs.archiveFaq(params.id, actorId, context);
  }

  @Post('categories')
  @RequirePermissions(Permission.CONTENT_WRITE)
  @ApiZodBody(upsertFaqCategorySchema)
  createCategory(
    @Body(new ZodValidationPipe(upsertFaqCategorySchema)) body: UpsertFaqCategoryPayload,
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<FaqCategoryDto> {
    return this.faqs.upsertCategory(body, actorId, context);
  }
}
