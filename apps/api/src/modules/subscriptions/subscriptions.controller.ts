import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
  SubscriptionChangeRequestDto,
  SubscriptionDto,
  SubscriptionHistoryDto,
} from '@stormfiber/types';
import { idParamSchema, subscriptionChangeRequestSchema } from '@stormfiber/validation';
import { Ctx, CurrentCustomerId, type RequestContext } from '../../common/decorators/auth.decorators';
import { ResponseMessage } from '../../common/decorators/response.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ApiZodBody } from '../../common/swagger/zod-swagger';
import { type ChangeRequestPayload, type SubscriptionsService } from './subscriptions.service';

/**
 * The signed-in customer's subscription.
 *
 * A customer can see their own subscription and ask for it to change, but cannot change it
 * directly: plan moves and cancellations are reviewed by an operator before they take effect.
 */
@ApiTags('Customer subscription')
@ApiBearerAuth()
@Controller('customer/subscription')
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Get()
  @ApiOperation({ summary: 'The customer’s current subscription, or null before activation' })
  current(@CurrentCustomerId() customerId: string): Promise<SubscriptionDto | null> {
    return this.subscriptions.findForCustomer(customerId);
  }

  @Get('history')
  @ApiOperation({ summary: 'Timeline of changes made to the subscription' })
  history(@CurrentCustomerId() customerId: string): Promise<SubscriptionHistoryDto[]> {
    return this.subscriptions.historyForCustomer(customerId);
  }

  @Get('change-requests')
  @ApiOperation({ summary: 'Plan and add-on change requests raised by the customer' })
  changeRequests(@CurrentCustomerId() customerId: string): Promise<SubscriptionChangeRequestDto[]> {
    return this.subscriptions.listChangeRequests(customerId);
  }

  @Post('change-requests')
  @ResponseMessage('Your request has been sent to our team')
  @ApiOperation({ summary: 'Request an upgrade, downgrade, add-on change or cancellation' })
  @ApiZodBody(subscriptionChangeRequestSchema)
  requestChange(
    @CurrentCustomerId() customerId: string,
    @Body(new ZodValidationPipe(subscriptionChangeRequestSchema)) body: ChangeRequestPayload,
    @Ctx() context: RequestContext,
  ): Promise<SubscriptionChangeRequestDto> {
    return this.subscriptions.createChangeRequest(customerId, body, context);
  }

  @Post('change-requests/:id/withdraw')
  @ResponseMessage('Request withdrawn')
  @ApiOperation({ summary: 'Withdraw a change request that has not been reviewed yet' })
  withdraw(
    @CurrentCustomerId() customerId: string,
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
  ): Promise<SubscriptionChangeRequestDto> {
    return this.subscriptions.withdrawChangeRequest(customerId, params.id);
  }
}
