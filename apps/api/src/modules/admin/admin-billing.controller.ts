import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  Permission,
  STAFF_ROLES,
  type InvoiceDto,
  type Paginated,
  type PaymentDto,
  type RefundDto,
} from '@stormfiber/types';
import {
  adminInvoiceListQuerySchema,
  adminPaymentListQuerySchema,
  createRefundSchema,
  idParamSchema,
  markInvoicePaidSchema,
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
import { InvoicesService, type AdminInvoiceListQuery } from '../billing/invoices.service';
import {
  PaymentsService,
  type AdminPaymentListQuery,
  type CreateRefundPayload,
} from '../billing/payments.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles(...STAFF_ROLES)
@Controller('admin')
export class AdminBillingController {
  constructor(
    private readonly invoices: InvoicesService,
    private readonly payments: PaymentsService,
  ) {}

  @Get('invoices')
  @RequirePermissions(Permission.INVOICES_READ)
  @ApiOperation({ summary: 'Paginated invoices across all customers' })
  @ApiZodQuery(adminInvoiceListQuerySchema)
  listInvoices(
    @Query(new ZodValidationPipe(adminInvoiceListQuerySchema)) query: AdminInvoiceListQuery,
  ): Promise<Paginated<InvoiceDto>> {
    return this.invoices.listForAdmin(query);
  }

  @Get('invoices/:id')
  @RequirePermissions(Permission.INVOICES_READ)
  @ApiOperation({ summary: 'A single invoice' })
  getInvoice(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
  ): Promise<InvoiceDto> {
    return this.invoices.findById(params.id);
  }

  @Put('invoices/:id/mark-paid')
  @RequirePermissions(Permission.INVOICES_WRITE)
  @ResponseMessage('Invoice marked paid')
  @ApiOperation({ summary: 'Record an offline payment collected by staff' })
  @ApiZodBody(markInvoicePaidSchema)
  markPaid(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(markInvoicePaidSchema)) body: { method: 'cash' | 'bank_transfer' | 'office' },
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<InvoiceDto> {
    return this.invoices.markPaid(params.id, body.method, actorId, context);
  }

  @Get('payments')
  @RequirePermissions(Permission.PAYMENTS_READ)
  @ApiOperation({ summary: 'Paginated payments across all customers' })
  @ApiZodQuery(adminPaymentListQuerySchema)
  listPayments(
    @Query(new ZodValidationPipe(adminPaymentListQuerySchema)) query: AdminPaymentListQuery,
  ): Promise<Paginated<PaymentDto>> {
    return this.payments.listForAdmin(query);
  }

  @Get('payments/:id')
  @RequirePermissions(Permission.PAYMENTS_READ)
  @ApiOperation({ summary: 'A single payment' })
  getPayment(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
  ): Promise<PaymentDto> {
    return this.payments.findById(params.id);
  }

  @Post('refunds')
  @RequirePermissions(Permission.PAYMENTS_REFUND)
  @ResponseMessage('Refund issued')
  @ApiOperation({ summary: 'Refund a successful payment through the configured provider' })
  @ApiZodBody(createRefundSchema)
  refund(
    @Body(new ZodValidationPipe(createRefundSchema)) body: CreateRefundPayload,
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<RefundDto> {
    return this.payments.refund(body, actorId, context);
  }
}
