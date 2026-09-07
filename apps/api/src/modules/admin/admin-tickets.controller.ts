import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission, STAFF_ROLES, type Paginated, type TicketDto } from '@stormfiber/types';
import { idParamSchema, ticketListQuerySchema, updateTicketSchema } from '@stormfiber/validation';
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
  TicketsService,
  type AdminTicketListQuery,
  type UpdateTicketPayload,
} from '../support/tickets.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles(...STAFF_ROLES)
@Controller('admin/tickets')
export class AdminTicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Get()
  @RequirePermissions(Permission.TICKETS_READ)
  @ApiOperation({ summary: 'Paginated support tickets, including internal notes' })
  @ApiZodQuery(ticketListQuerySchema)
  list(
    @Query(new ZodValidationPipe(ticketListQuerySchema)) query: AdminTicketListQuery,
  ): Promise<Paginated<TicketDto>> {
    return this.tickets.listForAdmin(query);
  }

  @Get(':id')
  @RequirePermissions(Permission.TICKETS_READ)
  @ApiOperation({ summary: 'A single ticket with internal notes' })
  get(@Param(new ZodValidationPipe(idParamSchema)) params: { id: string }): Promise<TicketDto> {
    return this.tickets.findForAdmin(params.id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.TICKETS_ASSIGN)
  @ResponseMessage('Ticket updated')
  @ApiOperation({ summary: 'Assign a ticket or change its status' })
  @ApiZodBody(updateTicketSchema)
  update(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(updateTicketSchema)) body: UpdateTicketPayload,
    @CurrentUser('id') actorId: string,
    @Ctx() context: RequestContext,
  ): Promise<TicketDto> {
    return this.tickets.updateForAdmin(params.id, body, actorId, context);
  }
}
