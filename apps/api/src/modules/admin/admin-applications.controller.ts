import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApplicationStatus } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission, STAFF_ROLES, type ApplicationDto, type Paginated } from '@stormfiber/types';
import {
  adminApplicationListQuerySchema,
  idParamSchema,
  updateApplicationStatusSchema,
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
  ApplicationsService,
  type AdminApplicationListQuery,
  type UpdateApplicationStatusPayload,
} from '../applications/applications.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles(...STAFF_ROLES)
@Controller('admin/applications')
export class AdminApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Get()
  @RequirePermissions(Permission.APPLICATIONS_READ)
  @ApiOperation({ summary: 'Paginated new-connection applications' })
  @ApiZodQuery(adminApplicationListQuerySchema)
  list(
    @Query(new ZodValidationPipe(adminApplicationListQuerySchema)) query: AdminApplicationListQuery,
  ): Promise<Paginated<ApplicationDto>> {
    return this.applications.list(query);
  }

  @Get(':id')
  @RequirePermissions(Permission.APPLICATIONS_READ)
  @ApiOperation({ summary: 'A single application, including status history' })
  get(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
  ): Promise<ApplicationDto> {
    return this.applications.findById(params.id);
  }

  @Patch(':id/status')
  @RequirePermissions(Permission.APPLICATIONS_APPROVE)
  @ResponseMessage('Application status updated')
  @ApiOperation({ summary: 'Move an application through the audited state machine' })
  @ApiZodBody(updateApplicationStatusSchema)
  changeStatus(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(updateApplicationStatusSchema)) body: UpdateApplicationStatusPayload,
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<ApplicationDto> {
    return this.applications.changeStatus(params.id, body.status as ApplicationStatus, {
      reason: body.reason,
      scheduledInstallationDate: body.scheduledInstallationDate,
      changedById: actorId,
      context,
    });
  }
}
