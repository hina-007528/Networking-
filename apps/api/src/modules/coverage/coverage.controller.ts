import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { CityWaitlistDto, CoverageCheckResult, CoverageLeadDto, CoverageSummaryDto } from '@stormfiber/types';
import { cityWaitlistSchema, coverageCheckSchema, coverageLeadSchema } from '@stormfiber/validation';
import { Ctx, Public, type RequestContext } from '../../common/decorators/auth.decorators';
import { ResponseMessage } from '../../common/decorators/response.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ApiZodBody } from '../../common/swagger/zod-swagger';
import {
  CoverageService,
  type CityWaitlistPayload,
  type CoverageCheckPayload,
  type CoverageLeadPayload,
} from './coverage.service';

@ApiTags('Coverage')
@Controller('coverage')
export class CoverageController {
  constructor(private readonly coverage: CoverageService) {}

  @Post('check')
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Resolve whether an address is in the service city and covered' })
  @ApiZodBody(coverageCheckSchema)
  check(
    @Body(new ZodValidationPipe(coverageCheckSchema)) body: CoverageCheckPayload,
    @Ctx() context: RequestContext,
  ): Promise<CoverageCheckResult> {
    return this.coverage.check(body, context);
  }

  @Post('leads')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 600_000 } })
  @ResponseMessage('We will contact you when this street is live')
  @ApiZodBody(coverageLeadSchema)
  createLead(
    @Body(new ZodValidationPipe(coverageLeadSchema)) body: CoverageLeadPayload,
    @Ctx() context: RequestContext,
  ): Promise<CoverageLeadDto> {
    return this.coverage.createLead(body, context);
  }

  @Post('waitlist')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 600_000 } })
  @ResponseMessage('You are on the expansion waitlist')
  @ApiZodBody(cityWaitlistSchema)
  joinWaitlist(
    @Body(new ZodValidationPipe(cityWaitlistSchema)) body: CityWaitlistPayload,
  ): Promise<CityWaitlistDto> {
    return this.coverage.joinWaitlist(body);
  }

  @Get('summary')
  @Public()
  @ApiOperation({ summary: 'City-level coverage rollup for the map' })
  summary(): Promise<CoverageSummaryDto> {
    return this.coverage.summary();
  }
}
