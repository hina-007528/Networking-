import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  Permission,
  STAFF_ROLES,
  type CityWaitlistDto,
  type CoverageLeadDto,
  type CoverageZoneDto,
  type Paginated,
} from '@stormfiber/types';
import {
  adminCoverageZoneListQuerySchema,
  adminLeadListQuerySchema,
  bulkCoverageImportSchema,
  idParamSchema,
  updateCoverageLeadSchema,
  upsertCoverageZoneSchema,
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
  CoverageService,
  type AdminCoverageZoneListQuery,
  type AdminLeadListQuery,
  type BulkCoverageImportPayload,
  type UpdateCoverageLeadPayload,
  type UpsertCoverageZonePayload,
} from '../coverage/coverage.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles(...STAFF_ROLES)
@Controller('admin/coverage')
export class AdminCoverageController {
  constructor(private readonly coverage: CoverageService) {}

  @Get()
  @RequirePermissions(Permission.COVERAGE_READ)
  @ApiOperation({ summary: 'Paginated coverage zones' })
  @ApiZodQuery(adminCoverageZoneListQuerySchema)
  listZones(
    @Query(new ZodValidationPipe(adminCoverageZoneListQuerySchema)) query: AdminCoverageZoneListQuery,
  ): Promise<Paginated<CoverageZoneDto>> {
    return this.coverage.listZones(query);
  }

  @Get('export')
  @RequirePermissions(Permission.COVERAGE_READ)
  exportZones() {
    return this.coverage.exportZones();
  }

  @Get('leads')
  @RequirePermissions(Permission.COVERAGE_READ)
  @ApiZodQuery(adminLeadListQuerySchema)
  listLeads(
    @Query(new ZodValidationPipe(adminLeadListQuerySchema)) query: AdminLeadListQuery,
  ): Promise<Paginated<CoverageLeadDto>> {
    return this.coverage.listLeads(query);
  }

  @Get('waitlist')
  @RequirePermissions(Permission.COVERAGE_READ)
  @ApiOperation({ summary: 'Expansion waitlist from outside the service city' })
  listWaitlist(): Promise<CityWaitlistDto[]> {
    return this.coverage.listWaitlist();
  }

  @Post()
  @RequirePermissions(Permission.COVERAGE_WRITE)
  @ResponseMessage('Coverage zone saved')
  @ApiZodBody(upsertCoverageZoneSchema)
  createZone(
    @Body(new ZodValidationPipe(upsertCoverageZoneSchema)) body: UpsertCoverageZonePayload,
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<CoverageZoneDto> {
    return this.coverage.upsertZone(body, actorId, context);
  }

  @Patch(':id')
  @RequirePermissions(Permission.COVERAGE_WRITE)
  @ApiZodBody(upsertCoverageZoneSchema)
  updateZone(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(upsertCoverageZoneSchema)) body: UpsertCoverageZonePayload,
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<CoverageZoneDto> {
    return this.coverage.upsertZone(body, actorId, context, params.id);
  }

  @Delete(':id')
  @RequirePermissions(Permission.COVERAGE_WRITE)
  @ResponseMessage('Coverage zone removed')
  deleteZone(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<void> {
    return this.coverage.deleteZone(params.id, actorId, context);
  }

  @Post('import')
  @RequirePermissions(Permission.COVERAGE_WRITE)
  @ResponseMessage('Coverage import completed')
  @ApiZodBody(bulkCoverageImportSchema)
  importZones(
    @Body(new ZodValidationPipe(bulkCoverageImportSchema)) body: BulkCoverageImportPayload,
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<{ imported: number; createdAreas: number; createdSubAreas: number }> {
    return this.coverage.importZones(body, actorId, context);
  }

  @Patch('leads/:id')
  @RequirePermissions(Permission.COVERAGE_WRITE)
  @ApiZodBody(updateCoverageLeadSchema)
  updateLead(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(updateCoverageLeadSchema)) body: UpdateCoverageLeadPayload,
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<CoverageLeadDto> {
    return this.coverage.updateLead(params.id, body, actorId, context);
  }
}
