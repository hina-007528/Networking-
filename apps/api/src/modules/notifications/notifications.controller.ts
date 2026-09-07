import { Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { NotificationDto, Paginated } from '@stormfiber/types';
import {
  idParamSchema,
  type NotificationListQuery,
  notificationListQuerySchema,
} from '@stormfiber/validation';
import { CurrentUser } from '../../common/decorators/auth.decorators';
import { ResponseMessage } from '../../common/decorators/response.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ApiZodQuery } from '../../common/swagger/zod-swagger';
import { NotificationsService } from './notifications.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List the signed-in user’s in-app notifications' })
  @ApiZodQuery(notificationListQuerySchema)
  list(
    @CurrentUser('id') userId: string,
    @Query(new ZodValidationPipe(notificationListQuerySchema)) query: NotificationListQuery,
  ): Promise<Paginated<NotificationDto>> {
    return this.notifications.listForUser(userId, query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Number of unread in-app notifications' })
  unreadCount(@CurrentUser('id') userId: string): Promise<{ count: number }> {
    return this.notifications.unreadCount(userId);
  }

  @Patch(':id/read')
  @ResponseMessage('Notification marked as read')
  @ApiOperation({ summary: 'Mark one notification as read' })
  markRead(
    @CurrentUser('id') userId: string,
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
  ): Promise<NotificationDto> {
    return this.notifications.markRead(userId, params.id);
  }

  @Patch('read-all')
  @ResponseMessage('All notifications marked as read')
  @ApiOperation({ summary: 'Mark every unread notification as read' })
  markAllRead(@CurrentUser('id') userId: string): Promise<{ updated: number }> {
    return this.notifications.markAllRead(userId);
  }
}
