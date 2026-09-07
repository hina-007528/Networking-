import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  Permission,
  STAFF_ROLES,
  type CmsPageDto,
  type CmsSectionDto,
  type HeroSlideDto,
  type SiteSettingsDto,
} from '@stormfiber/types';
import {
  idParamSchema,
  updateSiteSettingsSchema,
  upsertCmsPageSchema,
  upsertCmsSectionSchema,
  upsertHeroSlideSchema,
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
import { ApiZodBody } from '../../common/swagger/zod-swagger';
import {
  CmsService,
  type UpdateSiteSettingsPayload,
  type UpsertCmsPagePayload,
  type UpsertCmsSectionPayload,
  type UpsertHeroSlidePayload,
} from '../cms/cms.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles(...STAFF_ROLES)
@Controller('admin')
export class AdminCmsController {
  constructor(private readonly cms: CmsService) {}

  @Get('content/hero-slides')
  @RequirePermissions(Permission.CONTENT_READ)
  @ApiOperation({ summary: 'All hero slides including drafts' })
  listSlides(): Promise<HeroSlideDto[]> {
    return this.cms.listSlides();
  }

  @Post('content/hero-slides')
  @RequirePermissions(Permission.CONTENT_WRITE)
  @ApiZodBody(upsertHeroSlideSchema)
  createSlide(
    @Body(new ZodValidationPipe(upsertHeroSlideSchema)) body: UpsertHeroSlidePayload,
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<HeroSlideDto> {
    return this.cms.upsertSlide(body, actorId, context);
  }

  @Patch('content/hero-slides/:id')
  @RequirePermissions(Permission.CONTENT_WRITE)
  @ApiZodBody(upsertHeroSlideSchema)
  updateSlide(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(upsertHeroSlideSchema)) body: UpsertHeroSlidePayload,
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<HeroSlideDto> {
    return this.cms.upsertSlide(body, actorId, context, params.id);
  }

  @Delete('content/hero-slides/:id')
  @RequirePermissions(Permission.CONTENT_WRITE)
  @ResponseMessage('Slide deleted')
  deleteSlide(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<void> {
    return this.cms.deleteSlide(params.id, actorId, context);
  }

  @Get('content/pages')
  @RequirePermissions(Permission.CONTENT_READ)
  listPages(): Promise<CmsPageDto[]> {
    return this.cms.listPages();
  }

  @Post('content/pages')
  @RequirePermissions(Permission.CONTENT_WRITE)
  @ApiZodBody(upsertCmsPageSchema)
  createPage(
    @Body(new ZodValidationPipe(upsertCmsPageSchema)) body: UpsertCmsPagePayload,
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<CmsPageDto> {
    return this.cms.upsertPage(body, actorId, context);
  }

  @Patch('content/pages/:id')
  @RequirePermissions(Permission.CONTENT_WRITE)
  @ApiZodBody(upsertCmsPageSchema)
  updatePage(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(upsertCmsPageSchema)) body: UpsertCmsPagePayload,
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<CmsPageDto> {
    return this.cms.upsertPage(body, actorId, context, params.id);
  }

  @Get('content/sections')
  @RequirePermissions(Permission.CONTENT_READ)
  listSections(): Promise<CmsSectionDto[]> {
    return this.cms.listSections();
  }

  @Post('content/sections')
  @RequirePermissions(Permission.CONTENT_WRITE)
  @ApiZodBody(upsertCmsSectionSchema)
  createSection(
    @Body(new ZodValidationPipe(upsertCmsSectionSchema)) body: UpsertCmsSectionPayload,
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<CmsSectionDto> {
    return this.cms.upsertSection(body, actorId, context);
  }

  @Patch('content/sections/:id')
  @RequirePermissions(Permission.CONTENT_WRITE)
  @ApiZodBody(upsertCmsSectionSchema)
  updateSection(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(upsertCmsSectionSchema)) body: UpsertCmsSectionPayload,
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<CmsSectionDto> {
    return this.cms.upsertSection(body, actorId, context, params.id);
  }

  @Get('settings')
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  settings(): Promise<SiteSettingsDto> {
    return this.cms.settings();
  }

  @Patch('settings')
  @RequirePermissions(Permission.SETTINGS_MANAGE)
  @ResponseMessage('Settings saved')
  @ApiZodBody(updateSiteSettingsSchema)
  updateSettings(
    @Body(new ZodValidationPipe(updateSiteSettingsSchema)) body: UpdateSiteSettingsPayload,
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<SiteSettingsDto> {
    return this.cms.updateSettings(body, actorId, context);
  }
}
