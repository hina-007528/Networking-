import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { analyticsEventSchema } from '@stormfiber/validation';
import {
  Ctx,
  OptionalUser,
  Public,
  type RequestContext,
} from '../../common/decorators/auth.decorators';
import { ResponseMessage } from '../../common/decorators/response.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ApiZodBody } from '../../common/swagger/zod-swagger';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Post('events')
  @Public()
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @ResponseMessage('Recorded')
  @ApiOperation({ summary: 'Record a product analytics event from the public site' })
  @ApiZodBody(analyticsEventSchema)
  async track(
    @Body(new ZodValidationPipe(analyticsEventSchema)) body: {
      name: string;
      path?: string;
      cityId?: string;
      planId?: string;
      sessionId?: string;
      properties?: Record<string, unknown>;
    },
    @Ctx() context: RequestContext,
    @OptionalUser() user: AuthenticatedUser | null,
  ): Promise<{ accepted: true }> {
    await this.analytics.record({
      ...body,
      userId: user?.id ?? null,
      context,
    });
    return { accepted: true };
  }
}
