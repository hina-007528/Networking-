import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission, STAFF_ROLES, type AuditLogDto, type Paginated } from '@stormfiber/types';
import { adminAuditListQuerySchema } from '@stormfiber/validation';
import { RequirePermissions, Roles } from '../../common/decorators/auth.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ApiZodQuery } from '../../common/swagger/zod-swagger';
import { AuditService, type AdminAuditListQuery } from '../../common/audit/audit.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles(...STAFF_ROLES)
@Controller('admin/audit-logs')
export class AdminAuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @RequirePermissions(Permission.AUDIT_LOGS_READ)
  @ApiOperation({ summary: 'Paginated audit trail' })
  @ApiZodQuery(adminAuditListQuerySchema)
  list(
    @Query(new ZodValidationPipe(adminAuditListQuerySchema)) query: AdminAuditListQuery,
  ): Promise<Paginated<AuditLogDto>> {
    return this.audit.list(query);
  }
}
