import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { CreateOrderResult, OrderDto } from '@stormfiber/types';
import { createOrderSchema, idParamSchema, verifyOrderOtpSchema } from '@stormfiber/validation';
import { Ctx, CurrentCustomerId, type RequestContext } from '../../common/decorators/auth.decorators';
import { ResponseMessage } from '../../common/decorators/response.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ApiZodBody } from '../../common/swagger/zod-swagger';
import { OrdersService, type CreateOrderPayload, type VerifyOrderOtpPayload } from './orders.service';

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get('preview/:planId')
  @ApiOperation({ summary: 'Plan and profile address for the order review step' })
  preview(
    @CurrentCustomerId() customerId: string,
    @Param('planId') planId: string,
  ) {
    return this.orders.preview(customerId, planId);
  }

  @Post()
  @ResponseMessage('Confirmation code emailed')
  @ApiOperation({ summary: 'Create an order and email a 6-digit OTP' })
  @ApiZodBody(createOrderSchema)
  create(
    @CurrentCustomerId() customerId: string,
    @Body(new ZodValidationPipe(createOrderSchema)) body: CreateOrderPayload,
  ): Promise<CreateOrderResult> {
    return this.orders.create(customerId, body);
  }

  @Get(':id')
  @ApiOperation({ summary: 'The signed-in customer’s order (OTP hash is never returned)' })
  get(
    @CurrentCustomerId() customerId: string,
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
  ): Promise<OrderDto> {
    return this.orders.findForCustomer(params.id, customerId);
  }

  @Post(':id/resend-otp')
  @Throttle({ default: { limit: 6, ttl: 600_000 } })
  @ResponseMessage('A new confirmation code was emailed')
  @ApiOperation({ summary: 'Resend the order OTP. Max 3 emails per 10 minutes.' })
  resend(
    @CurrentCustomerId() customerId: string,
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
  ): Promise<CreateOrderResult> {
    return this.orders.resendOtp(params.id, customerId);
  }

  @Post(':id/verify-otp')
  @ResponseMessage('Order confirmed')
  @ApiOperation({ summary: 'Confirm the order with the emailed OTP and create a subscription' })
  @ApiZodBody(verifyOrderOtpSchema)
  verify(
    @CurrentCustomerId() customerId: string,
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(verifyOrderOtpSchema)) body: VerifyOrderOtpPayload,
    @Ctx() context: RequestContext,
  ): Promise<OrderDto> {
    return this.orders.verifyOtp(params.id, customerId, body, context);
  }
}
