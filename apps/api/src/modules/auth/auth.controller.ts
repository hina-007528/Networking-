import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type {
  AuthSessionDto,
  AuthUserDto,
  OtpRequestResult,
  OtpVerifyResult,
  SessionDto,
} from '@stormfiber/types';
import {
  changePasswordApiSchema,
  forgotPasswordSchema,
  idParamSchema,
  loginSchema,
  otpRequestSchema,
  otpVerifySchema,
  registerApiSchema,
  resetPasswordApiSchema,
} from '@stormfiber/validation';
import { Ctx, CurrentUser, Public, type RequestContext } from '../../common/decorators/auth.decorators';
import { ResponseMessage } from '../../common/decorators/response.decorators';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ApiEnvelope, ApiErrorEnvelope, ApiZodBody } from '../../common/swagger/zod-swagger';
import { type AuthService, type RegisterInput } from './auth.service';
import { type OtpService } from './otp.service';
import { REFRESH_COOKIE_NAME } from './tokens.service';

/** Reads the refresh token from the HTTP-only cookie, or the body for non-browser clients. */
function refreshTokenFrom(request: Request, body?: { refreshToken?: string }): string | undefined {
  const cookies = (request as Request & { cookies?: Record<string, string> }).cookies;
  return cookies?.[REFRESH_COOKIE_NAME] ?? body?.refreshToken;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly otp: OtpService,
  ) {}

  @Post('otp/request')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 300_000 } })
  @ResponseMessage('Verification code sent')
  @ApiOperation({ summary: 'Send a one-time verification code by SMS' })
  @ApiZodBody(otpRequestSchema)
  @ApiEnvelope(HttpStatus.CREATED, 'Code dispatched')
  @ApiErrorEnvelope(HttpStatus.TOO_MANY_REQUESTS, 'Cooldown or hourly limit reached', 'OTP_COOLDOWN')
  requestOtp(
    @Body(new ZodValidationPipe(otpRequestSchema))
    body: { mobile: string; purpose: OtpRequestResult['purpose']; email?: string },
    @Ctx() context: RequestContext,
  ): Promise<OtpRequestResult> {
    return this.otp.request(body, context);
  }

  @Post('otp/verify')
  @Public()
  @Throttle({ default: { limit: 10, ttl: 300_000 } })
  @ResponseMessage('Mobile number verified')
  @ApiOperation({ summary: 'Verify a one-time code and receive a short-lived proof token' })
  @ApiZodBody(otpVerifySchema)
  @ApiErrorEnvelope(HttpStatus.BAD_REQUEST, 'Code incorrect or expired', 'OTP_INVALID')
  verifyOtp(
    @Body(new ZodValidationPipe(otpVerifySchema)) body: { requestId: string; code: string },
    @Ctx() context: RequestContext,
  ): Promise<OtpVerifyResult> {
    return this.otp.verify(body, context);
  }

  @Post('register')
  @Public()
  @Throttle({ default: { limit: 5, ttl: 600_000 } })
  @ResponseMessage('Your account has been created')
  @ApiOperation({ summary: 'Create a customer account after mobile verification' })
  @ApiZodBody(registerApiSchema)
  @ApiErrorEnvelope(HttpStatus.UNPROCESSABLE_ENTITY, 'Email or mobile already in use', 'VALIDATION_ERROR')
  register(
    @Body(new ZodValidationPipe(registerApiSchema)) body: RegisterInput,
    @Ctx() context: RequestContext,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthSessionDto> {
    return this.auth.register(body, context, response);
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 300_000 } })
  @ResponseMessage('Signed in')
  @ApiOperation({ summary: 'Sign in with email or mobile number' })
  @ApiZodBody(loginSchema)
  @ApiErrorEnvelope(HttpStatus.UNAUTHORIZED, 'Credentials rejected', 'CREDENTIALS_INVALID')
  login(
    @Body(new ZodValidationPipe(loginSchema)) body: { identifier: string; password: string },
    @Ctx() context: RequestContext,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthSessionDto> {
    return this.auth.login(body, context, response);
  }

  @Post('refresh')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Session refreshed')
  @ApiOperation({ summary: 'Exchange the refresh cookie for a new access token' })
  @ApiErrorEnvelope(HttpStatus.UNAUTHORIZED, 'Refresh token missing, expired or replayed', 'TOKEN_INVALID')
  refresh(
    @Req() request: Request,
    @Body() body: { refreshToken?: string },
    @Ctx() context: RequestContext,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthSessionDto> {
    return this.auth.refresh(refreshTokenFrom(request, body), context, response);
  }

  @Post('logout')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Signed out')
  @ApiOperation({ summary: 'Revoke the current session' })
  logout(
    @Req() request: Request,
    @Ctx() context: RequestContext,
    @Res({ passthrough: true }) response: Response,
  ): Promise<{ signedOut: true }> {
    const user = (request as Request & { user?: { id: string } }).user;
    return this.auth.logout(refreshTokenFrom(request), user?.id ?? null, context, response);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'The signed-in user, with roles and permissions' })
  me(@CurrentUser('id') userId: string): Promise<AuthUserDto> {
    return this.auth.me(userId);
  }

  @Get('sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Active sessions for the signed-in user' })
  sessions(@CurrentUser('id') userId: string, @Req() request: Request): Promise<SessionDto[]> {
    return this.auth.listSessions(userId, refreshTokenFrom(request));
  }

  @Delete('sessions/:id')
  @ApiBearerAuth()
  @ResponseMessage('Session revoked')
  @ApiOperation({ summary: 'Sign out one other device' })
  revokeSession(
    @CurrentUser('id') userId: string,
    @Param(new ZodValidationPipe(idParamSchema)) params: { id: string },
  ): Promise<{ revoked: true }> {
    return this.auth.revokeSession(userId, params.id);
  }

  @Post('forgot-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 900_000 } })
  @ResponseMessage('If that account exists, a reset link is on its way')
  @ApiOperation({ summary: 'Request a password reset link' })
  @ApiZodBody(forgotPasswordSchema)
  forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordSchema)) body: { identifier: string },
    @Ctx() context: RequestContext,
  ): Promise<{ requested: true }> {
    return this.auth.forgotPassword(body.identifier, context);
  }

  @Post('reset-password')
  @Public()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 900_000 } })
  @ResponseMessage('Your password has been reset')
  @ApiOperation({ summary: 'Set a new password using a reset token' })
  @ApiZodBody(resetPasswordApiSchema)
  @ApiErrorEnvelope(HttpStatus.BAD_REQUEST, 'Reset token invalid or expired', 'TOKEN_INVALID')
  resetPassword(
    @Body(new ZodValidationPipe(resetPasswordApiSchema)) body: { token: string; password: string },
    @Ctx() context: RequestContext,
  ): Promise<{ reset: true }> {
    return this.auth.resetPassword(body, context);
  }

  @Post('change-password')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Your password has been changed')
  @ApiOperation({ summary: 'Change the password of the signed-in user' })
  @ApiZodBody(changePasswordApiSchema)
  changePassword(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(changePasswordApiSchema))
    body: { currentPassword: string; newPassword: string },
    @Ctx() context: RequestContext,
    @Req() request: Request,
  ): Promise<{ changed: true }> {
    return this.auth.changePassword(userId, body, context, refreshTokenFrom(request));
  }
}
