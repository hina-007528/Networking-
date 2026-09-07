import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  Permission,
  STAFF_ROLES,
  type Paginated,
  type SubscriptionChangeRequestDto,
  type SubscriptionDto,
} from '@stormfiber/types';
import {
  adminSubscriptionListQuerySchema,
  idParamSchema,
  reviewChangeRequestSchema,
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
  SubscriptionsService,
  type AdminSubscriptionListQuery,
  type ReviewChangeRequestPayload,
} from '../subscriptions/subscriptions.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles(...STAFF_ROLES)
@Controller('admin/subscriptions')
export class AdminSubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get()
  @RequirePermissions(Permission.SUBSCRIPTIONS_READ)
  @ApiOperation({ summary: 'Paginated subscriptions' })
  @ApiZodQuery(adminSubscriptionListQuerySchema)
  list(
    @Query(new ZodValidationPipe(adminSubscriptionListQuerySchema)) query: AdminSubscriptionListQuery,
  ): Promise<Paginated<SubscriptionDto>> {
    return this.subscriptions.listForAdmin(query);
  }

  @Get('change-requests')
  @RequirePermissions(Permission.SUBSCRIPTIONS_READ)
  @ApiOperation({ summary: 'Recent subscription change requests' })
  listChangeRequests(): Promise<SubscriptionChangeRequestDto[]> {
    return this.subscriptions.listChangeRequestsForAdmin();
  }

  @Get(':id')
  @RequirePermissions(Permission.SUBSCRIPTIONS_READ)
  get(@Param(new ZodValidationPipe(idParamSchema)) params: { id: string }): Promise<SubscriptionDto> {
    return this.subscriptions.findByIdForAdmin(params.id);
  }

  @Get(':id/change-requests')
  @RequirePermissions(Permission.SUBSCRIPTIONS_READ)
  listForSubscription(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
  ): Promise<SubscriptionChangeRequestDto[]> {
    return this.subscriptions.listChangeRequestsForSubscription(params.id);
  }

  @Patch('change-requests/:id')
  @RequirePermissions(Permission.SUBSCRIPTIONS_WRITE)
  @ResponseMessage('Change request reviewed')
  @ApiZodBody(reviewChangeRequestSchema)
  review(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(reviewChangeRequestSchema)) body: ReviewChangeRequestPayload,
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<SubscriptionChangeRequestDto> {
    return this.subscriptions.reviewChangeRequest(params.id, body, actorId, context);
  }
}
