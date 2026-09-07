import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Paginated, SupportCategoryDto, TicketDto } from '@stormfiber/types';
import {
  createTicketMessageSchema,
  createTicketSchema,
  customerTicketQuerySchema,
  idParamSchema,
} from '@stormfiber/validation';
import {
  Ctx,
  CurrentCustomerId,
  CurrentUser,
  type RequestContext,
} from '../../common/decorators/auth.decorators';
import { ResponseMessage } from '../../common/decorators/response.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ApiZodBody, ApiZodQuery } from '../../common/swagger/zod-swagger';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import {
  type CreateTicketMessagePayload,
  type CreateTicketPayload,
  type CustomerTicketQuery,
  TicketsService,
} from './tickets.service';

@ApiTags('Tickets')
@ApiBearerAuth()
@Controller('tickets')
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Get('categories')
  @ApiOperation({ summary: 'Active ticket categories' })
  categories(): Promise<SupportCategoryDto[]> {
    return this.tickets.listCategories();
  }

  @Get()
  @ApiOperation({ summary: 'The signed-in customer’s tickets' })
  @ApiZodQuery(customerTicketQuerySchema)
  list(
    @CurrentCustomerId() customerId: string,
    @Query(new ZodValidationPipe(customerTicketQuerySchema)) query: CustomerTicketQuery,
  ): Promise<Paginated<TicketDto>> {
    return this.tickets.listForCustomer(customerId, query);
  }

  @Post()
  @ResponseMessage('Ticket created')
  @ApiOperation({ summary: 'Open a support ticket' })
  @ApiZodBody(createTicketSchema)
  create(
    @CurrentCustomerId() customerId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createTicketSchema)) body: CreateTicketPayload,
    @Ctx() context: RequestContext,
  ): Promise<TicketDto> {
    return this.tickets.create(customerId, user.id, displayName(user), body, context);
  }

  @Get(':id')
  @ApiOperation({ summary: 'A single ticket owned by the signed-in customer' })
  get(
    @CurrentCustomerId() customerId: string,
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
  ): Promise<TicketDto> {
    return this.tickets.findForCustomer(params.id, customerId);
  }

  @Post(':id/messages')
  @ResponseMessage('Reply sent')
  @ApiOperation({ summary: 'Add a customer reply. Internal notes are not accepted on this route.' })
  @ApiZodBody(createTicketMessageSchema)
  reply(
    @CurrentCustomerId() customerId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(createTicketMessageSchema)) body: CreateTicketMessagePayload,
  ): Promise<TicketDto> {
    return this.tickets.addMessage(params.id, customerId, user.id, displayName(user), body);
  }
}

function displayName(user: AuthenticatedUser): string {
  const name = `${user.firstName} ${user.lastName}`.trim();
  return name || user.email;
}
