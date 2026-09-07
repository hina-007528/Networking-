import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission, STAFF_ROLES } from '@stormfiber/types';
import type { DashboardChartsDto, DashboardMetricsDto } from '@stormfiber/types';
import { analyticsRangeQuerySchema } from '@stormfiber/validation';
import { RequirePermissions, Roles } from '../../common/decorators/auth.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ApiZodQuery } from '../../common/swagger/zod-swagger';
import { AdminDashboardService } from './admin-dashboard.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles(...STAFF_ROLES)
@Controller('admin/analytics')
export class AdminDashboardController {
  constructor(private readonly dashboard: AdminDashboardService) {}

  @Get('dashboard')
  @RequirePermissions(Permission.ANALYTICS_READ)
  @ApiOperation({ summary: 'Operational totals for the admin home screen' })
  metrics(): Promise<DashboardMetricsDto> {
    return this.dashboard.metrics();
  }

  @Get('charts')
  @RequirePermissions(Permission.ANALYTICS_READ)
  @ApiOperation({ summary: 'Time-series charts for the admin home screen' })
  @ApiZodQuery(analyticsRangeQuerySchema)
  charts(
    @Query(new ZodValidationPipe(analyticsRangeQuerySchema)) query: { days: number },
  ): Promise<DashboardChartsDto> {
    return this.dashboard.charts(query.days);
  }
}
