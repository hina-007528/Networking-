import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission, STAFF_ROLES, type CallbackRequestDto, type Paginated } from '@stormfiber/types';
import {
  adminCallbackListQuerySchema,
  idParamSchema,
  updateCallbackSchema,
} from '@stormfiber/validation';
import { CurrentUser, RequirePermissions, Roles } from '../../common/decorators/auth.decorators';
import { ResponseMessage } from '../../common/decorators/response.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ApiZodBody, ApiZodQuery } from '../../common/swagger/zod-swagger';
import {
  CallbacksService,
  type AdminCallbackListQuery,
  type UpdateCallbackPayload,
} from '../callbacks/callbacks.service';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles(...STAFF_ROLES)
@Controller('admin/callbacks')
export class AdminCallbacksController {
  constructor(private readonly callbacks: CallbacksService) {}

  @Get()
  @RequirePermissions(Permission.CALLBACKS_READ)
  @ApiOperation({ summary: 'Paginated callback requests' })
  @ApiZodQuery(adminCallbackListQuerySchema)
  list(
    @Query(new ZodValidationPipe(adminCallbackListQuerySchema)) query: AdminCallbackListQuery,
  ): Promise<Paginated<CallbackRequestDto>> {
    return this.callbacks.list(query);
  }

  @Get(':id')
  @RequirePermissions(Permission.CALLBACKS_READ)
  @ApiOperation({ summary: 'A single callback request' })
  get(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
  ): Promise<CallbackRequestDto> {
    return this.callbacks.findById(params.id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.CALLBACKS_WRITE)
  @ResponseMessage('Callback updated')
  @ApiOperation({ summary: 'Assign or progress a callback request' })
  @ApiZodBody(updateCallbackSchema)
  update(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(updateCallbackSchema)) body: UpdateCallbackPayload,
    @CurrentUser('id') actorId: string,
  ): Promise<CallbackRequestDto> {
    return this.callbacks.update(params.id, body, actorId);
  }
}
