import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  Permission,
  STAFF_ROLES,
  type CustomerDto,
  type Paginated,
  type SubscriptionDto,
} from '@stormfiber/types';
import {
  adminCustomerListQuerySchema,
  createCustomerSchema,
  createCustomerSubscriptionSchema,
  idParamSchema,
  updateCustomerSchema,
  updateCustomerStatusSchema,
  updateCustomerSubscriptionSchema,
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
  CustomersService,
  type AdminCustomerListQuery,
  type CreateCustomerPayload,
  type UpdateCustomerPayload,
} from '../customers/customers.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles(...STAFF_ROLES)
@Controller('admin/customers')
export class AdminCustomersController {
  constructor(
    private readonly customers: CustomersService,
    private readonly subscriptions: SubscriptionsService,
  ) {}

  @Get()
  @RequirePermissions(Permission.CUSTOMERS_READ)
  @ApiOperation({ summary: 'Paginated customer directory' })
  @ApiZodQuery(adminCustomerListQuerySchema)
  list(
    @Query(new ZodValidationPipe(adminCustomerListQuerySchema)) query: AdminCustomerListQuery,
  ): Promise<Paginated<CustomerDto>> {
    return this.customers.list(query);
  }

  @Post()
  @RequirePermissions(Permission.CUSTOMERS_WRITE)
  @ResponseMessage('Customer created')
  @ApiOperation({ summary: 'Create a customer account in Lahore' })
  @ApiZodBody(createCustomerSchema)
  create(
    @Body(new ZodValidationPipe(createCustomerSchema)) body: CreateCustomerPayload,
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<CustomerDto> {
    return this.customers.adminCreate(body, actorId, context);
  }

  @Get(':id')
  @RequirePermissions(Permission.CUSTOMERS_READ)
  @ApiOperation({ summary: 'A single customer record' })
  get(@Param(new ZodValidationPipe(idParamSchema)) params: { id: string }): Promise<CustomerDto> {
    return this.customers.findById(params.id);
  }

  @Delete(':id')
  @RequirePermissions(Permission.CUSTOMERS_WRITE)
  @ResponseMessage('Customer deleted')
  @ApiOperation({ summary: 'Permanently delete a customer and their login' })
  remove(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<void> {
    return this.customers.adminDelete(params.id, actorId, context);
  }

  @Patch(':id')
  @RequirePermissions(Permission.CUSTOMERS_WRITE)
  @ResponseMessage('Customer updated')
  @ApiOperation({ summary: 'Update a customer. Status changes are audited.' })
  @ApiZodBody(updateCustomerSchema)
  update(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(updateCustomerSchema)) body: UpdateCustomerPayload,
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<CustomerDto> {
    return this.customers.adminUpdate(params.id, body, actorId, context);
  }

  @Put(':id')
  @RequirePermissions(Permission.CUSTOMERS_WRITE)
  @ResponseMessage('Customer updated')
  @ApiOperation({ summary: 'Replace profile fields on a customer' })
  @ApiZodBody(updateCustomerSchema)
  replace(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(updateCustomerSchema)) body: UpdateCustomerPayload,
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<CustomerDto> {
    return this.customers.adminUpdate(params.id, body, actorId, context);
  }

  @Put(':id/status')
  @RequirePermissions(Permission.CUSTOMERS_WRITE)
  @ResponseMessage('Customer status updated')
  @ApiOperation({ summary: 'Suspend, reactivate or terminate a customer' })
  @ApiZodBody(updateCustomerStatusSchema)
  updateStatus(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(updateCustomerStatusSchema)) body: { status: UpdateCustomerPayload['status'] },
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<CustomerDto> {
    return this.customers.adminUpdate(params.id, { status: body.status }, actorId, context);
  }

  @Get(':id/subscriptions')
  @RequirePermissions(Permission.SUBSCRIPTIONS_READ)
  @ApiOperation({ summary: 'All subscriptions for a customer' })
  listSubscriptions(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
  ): Promise<SubscriptionDto[]> {
    return this.subscriptions.listForCustomer(params.id);
  }

  @Put(':id/subscription')
  @RequirePermissions(Permission.SUBSCRIPTIONS_WRITE)
  @ResponseMessage('Subscription updated')
  @ApiOperation({ summary: 'Change plan, status or dates on an existing subscription' })
  @ApiZodBody(updateCustomerSubscriptionSchema)
  updateSubscription(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(updateCustomerSubscriptionSchema)) body: {
      subscriptionId: string;
      planId?: string;
      status?: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'EXPIRED';
      startedAt?: Date | null;
      currentPeriodStart?: Date | null;
      currentPeriodEnd?: Date | null;
      nextBillingDate?: Date | null;
      reason?: string;
    },
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<SubscriptionDto> {
    return this.subscriptions.adminUpdateForCustomer(params.id, body, actorId, context);
  }

  @Post(':id/subscriptions')
  @RequirePermissions(Permission.SUBSCRIPTIONS_WRITE)
  @ResponseMessage('Subscription added')
  @ApiOperation({ summary: 'Add a subscription (for example a TV package) to a customer' })
  @ApiZodBody(createCustomerSubscriptionSchema)
  addSubscription(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(createCustomerSubscriptionSchema)) body: {
      planId: string;
      status?: 'PENDING' | 'ACTIVE' | 'SUSPENDED';
      startedAt?: Date;
      reason?: string;
    },
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<SubscriptionDto> {
    return this.subscriptions.adminCreateForCustomer(params.id, body, actorId, context);
  }
}
