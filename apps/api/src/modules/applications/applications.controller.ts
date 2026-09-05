import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { ApplicationDto } from '@stormfiber/types';
import {
  applicationOwnershipQuerySchema,
  createApplicationSchema,
  idParamSchema,
} from '@stormfiber/validation';
import { Ctx, Public, type RequestContext } from '../../common/decorators/auth.decorators';
import { ResponseMessage } from '../../common/decorators/response.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ApiEnvelope, ApiErrorEnvelope, ApiZodBody, ApiZodQuery } from '../../common/swagger/zod-swagger';
import { type ApplicationsService, type CreateApplicationPayload } from './applications.service';

@ApiTags('Applications')
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Post()
  @Public()
  @Throttle({ default: { limit: 5, ttl: 900_000 } })
  @ResponseMessage('Your application has been submitted')
  @ApiOperation({ summary: 'Submit a new-connection application' })
  @ApiZodBody(createApplicationSchema)
  @ApiEnvelope(HttpStatus.CREATED, 'The submitted application, with the server-computed quote')
  @ApiErrorEnvelope(
    HttpStatus.CONFLICT,
    'The address is outside the serviceable footprint',
    'COVERAGE_UNAVAILABLE',
  )
  create(
    @Body(new ZodValidationPipe(createApplicationSchema)) body: CreateApplicationPayload,
    @Ctx() context: RequestContext,
  ): Promise<ApplicationDto> {
    return this.applications.create(body, context);
  }

  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Track an application. The mobile number on the application proves ownership.',
  })
  @ApiZodQuery(applicationOwnershipQuerySchema)
  findOne(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @Query(new ZodValidationPipe(applicationOwnershipQuerySchema)) query: { mobile: string },
  ): Promise<ApplicationDto> {
    return this.applications.findByIdForApplicant(params.id, query.mobile);
  }

  @Post(':id/submit')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 900_000 } })
  @ResponseMessage('Your application has been submitted')
  @ApiOperation({ summary: 'Confirm and submit a draft application prepared for you' })
  @ApiZodBody(applicationOwnershipQuerySchema)
  submit(
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
    @Body(new ZodValidationPipe(applicationOwnershipQuerySchema)) body: { mobile: string },
    @Ctx() context: RequestContext,
  ): Promise<ApplicationDto> {
    return this.applications.submitDraft(params.id, body.mobile, context);
  }
}
