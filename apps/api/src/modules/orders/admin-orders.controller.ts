import { Body, Controller, Get, Param, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission, STAFF_ROLES, type NotificationLogDto, type OrderDto, type Paginated } from '@stormfiber/types';
import {
  adminNotificationLogQuerySchema,
  adminOrderListQuerySchema,
  adminUpdateOrderSchema,
  idParamSchema,
} from '@stormfiber/validation';
import { Ctx, CurrentUser, RequirePermissions, Roles, type RequestContext } from '../../common/decorators/auth.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ApiZodBody, ApiZodQuery } from '../../common/swagger/zod-swagger';
import {
  NotificationsService,
  type AdminNotificationLogQuery,
} from '../notifications/notifications.service';
import { OrdersService, type AdminOrderListQuery } from './orders.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles(...STAFF_ROLES)
@Controller('admin')
export class AdminOrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly notifications: NotificationsService,
  ) {}

  @Get('orders')
  @RequirePermissions(Permission.CUSTOMERS_READ)
  @ApiOperation({ summary: 'Every order, including abandoned PENDING_OTP ones' })
  @ApiZodQuery(adminOrderListQuerySchema)
  list(
    @Query(new ZodValidationPipe(adminOrderListQuerySchema)) query: AdminOrderListQuery,
  ): Promise<Paginated<OrderDto>> {
    return this.orders.listForAdmin(query);
  }

  @Get('orders/:id')
  @RequirePermissions(Permission.CUSTOMERS_READ)
  @ApiOperation({ summary: 'Order detail with OTP status and notification log (never the code)' })
  get(@Param(new ZodValidationPipe(idParamSchema)) params: { id: string }): Promise<OrderDto> {
    return this.orders.findByIdForAdmin(params.id);
  }

  @Put('orders/:id')
  @RequirePermissions(Permission.CUSTOMERS_WRITE)
  @ApiOperation({ summary: 'Move a confirmed order to scheduled, installed, or cancelled' })
  @ApiZodBody(adminUpdateOrderSchema)
  update(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(adminUpdateOrderSchema)) body: { status: 'CANCELLED' | 'SCHEDULED' | 'INSTALLED' },
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<OrderDto> {
    return this.orders.adminUpdateStatus(params.id, body.status, actorId, context);
  }

  @Get('notifications')
  @RequirePermissions(Permission.CUSTOMERS_READ)
  @ApiOperation({ summary: 'NotificationLog rows so staff can see what was actually emailed' })
  @ApiZodQuery(adminNotificationLogQuerySchema)
  logs(
    @Query(new ZodValidationPipe(adminNotificationLogQuerySchema)) query: AdminNotificationLogQuery,
  ): Promise<Paginated<NotificationLogDto>> {
    return this.notifications.listLogs(query);
  }
}
