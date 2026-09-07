import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { CallbackRequestDto } from '@stormfiber/types';
import { callbackRequestSchema } from '@stormfiber/validation';
import { Ctx, Public, type RequestContext } from '../../common/decorators/auth.decorators';
import { ResponseMessage } from '../../common/decorators/response.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ApiZodBody } from '../../common/swagger/zod-swagger';
import { CallbacksService, type CallbackPayload } from './callbacks.service';

@ApiTags('Callbacks')
@Controller('callbacks')
export class CallbacksController {
  constructor(private readonly callbacks: CallbacksService) {}

  @Post()
  @Public()
  @Throttle({ default: { limit: 5, ttl: 600_000 } })
  @ResponseMessage('Thanks — an agent will call you back')
  @ApiOperation({ summary: 'Request a callback from the sales or support team' })
  @ApiZodBody(callbackRequestSchema)
  create(
    @Body(new ZodValidationPipe(callbackRequestSchema)) body: CallbackPayload,
    @Ctx() context: RequestContext,
  ): Promise<CallbackRequestDto> {
    return this.callbacks.create(body, context);
  }
}
