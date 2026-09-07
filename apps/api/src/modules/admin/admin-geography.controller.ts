import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission, STAFF_ROLES, type AreaDto, type CityDto, type SubAreaDto } from '@stormfiber/types';
import {
  idParamSchema,
  includeInactiveQuerySchema,
  slugParamSchema,
  upsertAreaSchema,
  upsertCitySchema,
  upsertSubAreaSchema,
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
  GeographyService,
  type UpsertAreaPayload,
  type UpsertCityPayload,
  type UpsertSubAreaPayload,
} from '../geography/geography.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles(...STAFF_ROLES)
@Controller('admin')
export class AdminGeographyController {
  constructor(private readonly geography: GeographyService) {}

  @Get('cities')
  @RequirePermissions(Permission.COVERAGE_READ)
  @ApiOperation({ summary: 'All cities, including inactive rows' })
  listCities(
    @Query(new ZodValidationPipe(includeInactiveQuerySchema)) query: { includeInactive: boolean },
  ): Promise<CityDto[]> {
    return this.geography.listCities(query.includeInactive);
  }

  @Post('cities')
  @RequirePermissions(Permission.COVERAGE_WRITE)
  @ResponseMessage('City created')
  @ApiZodBody(upsertCitySchema)
  createCity(
    @Body(new ZodValidationPipe(upsertCitySchema)) body: UpsertCityPayload,
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<CityDto> {
    return this.geography.upsertCity(body, actorId, context);
  }

  @Patch('cities/:id')
  @RequirePermissions(Permission.COVERAGE_WRITE)
  @ApiZodBody(upsertCitySchema)
  updateCity(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(upsertCitySchema)) body: UpsertCityPayload,
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<CityDto> {
    return this.geography.upsertCity(body, actorId, context, params.id);
  }

  @Delete('cities/:id')
  @RequirePermissions(Permission.COVERAGE_WRITE)
  @ResponseMessage('City archived')
  archiveCity(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<void> {
    return this.geography.archiveCity(params.id, actorId, context);
  }

  @Get('cities/:slug/areas')
  @RequirePermissions(Permission.COVERAGE_READ)
  listAreas(
    @Param(new ZodValidationPipe(slugParamSchema)) params: { slug: string },
  ): Promise<AreaDto[]> {
    return this.geography.listAreasByCitySlug(params.slug, true);
  }

  @Post('areas')
  @RequirePermissions(Permission.COVERAGE_WRITE)
  @ApiZodBody(upsertAreaSchema)
  createArea(
    @Body(new ZodValidationPipe(upsertAreaSchema)) body: UpsertAreaPayload,
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<AreaDto> {
    return this.geography.upsertArea(body, actorId, context);
  }

  @Patch('areas/:id')
  @RequirePermissions(Permission.COVERAGE_WRITE)
  @ApiZodBody(upsertAreaSchema)
  updateArea(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(upsertAreaSchema)) body: UpsertAreaPayload,
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<AreaDto> {
    return this.geography.upsertArea(body, actorId, context, params.id);
  }

  @Delete('areas/:id')
  @RequirePermissions(Permission.COVERAGE_WRITE)
  @ResponseMessage('Area archived')
  archiveArea(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<void> {
    return this.geography.archiveArea(params.id, actorId, context);
  }

  @Get('areas/:id/subareas')
  @RequirePermissions(Permission.COVERAGE_READ)
  listSubAreas(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
  ): Promise<SubAreaDto[]> {
    return this.geography.listSubAreas(params.id, true);
  }

  @Post('subareas')
  @RequirePermissions(Permission.COVERAGE_WRITE)
  @ApiZodBody(upsertSubAreaSchema)
  createSubArea(
    @Body(new ZodValidationPipe(upsertSubAreaSchema)) body: UpsertSubAreaPayload,
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<SubAreaDto> {
    return this.geography.upsertSubArea(body, actorId, context);
  }

  @Patch('subareas/:id')
  @RequirePermissions(Permission.COVERAGE_WRITE)
  @ApiZodBody(upsertSubAreaSchema)
  updateSubArea(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(upsertSubAreaSchema)) body: UpsertSubAreaPayload,
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<SubAreaDto> {
    return this.geography.upsertSubArea(body, actorId, context, params.id);
  }

  @Delete('subareas/:id')
  @RequirePermissions(Permission.COVERAGE_WRITE)
  @ResponseMessage('Sub-area archived')
  archiveSubArea(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<void> {
    return this.geography.archiveSubArea(params.id, actorId, context);
  }
}
