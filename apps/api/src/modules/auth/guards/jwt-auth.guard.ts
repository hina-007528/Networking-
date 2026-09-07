import {
  type CanActivate,
  type ExecutionContext,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { Permission, RoleName } from '@stormfiber/types';
import { APP_CONFIG, type AppConfig } from '../../../config/configuration';
import { AppException } from '../../../common/errors/app.exception';
import { IS_PUBLIC_KEY } from '../../../common/decorators/auth.decorators';
import type {
  AccessTokenPayload,
  AuthenticatedUser,
} from '../../../common/types/authenticated-user';

/**
 * Global authentication guard.
 *
 * Registered as an `APP_GUARD`, so every route requires a valid access token unless it is
 * explicitly marked `@Public()`. Failing closed by default means a new endpoint cannot
 * accidentally ship unauthenticated.
 *
 * Roles and permissions are read from the token rather than the database on every request; the
 * access token is short-lived and refresh re-reads them, which bounds how long a stale grant can
 * survive.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const token = this.extractToken(request);

    if (!token) {
      if (isPublic) return true;
      throw AppException.unauthorized('Sign in to continue');
    }

    let payload: AccessTokenPayload;
    try {
      payload = this.jwt.verify<AccessTokenPayload>(token, { secret: this.config.auth.jwtSecret });
    } catch (error) {
      if (isPublic) return true;
      const expired = error instanceof Error && error.name === 'TokenExpiredError';
      throw AppException.of(
        expired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
        expired ? 'Your session has expired' : 'Your session is not valid',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (payload.type !== 'access') {
      if (isPublic) return true;
      throw AppException.of('TOKEN_INVALID', 'Your session is not valid', HttpStatus.UNAUTHORIZED);
    }

    request.user = {
      id: payload.sub,
      email: payload.email,
      mobile: '',
      firstName: '',
      lastName: '',
      roles: payload.roles as RoleName[],
      permissions: payload.permissions as Permission[],
      customerId: payload.customerId,
      sessionId: payload.sid,
    };

    return true;
  }

  /**
   * Accepts the token from the `Authorization` header only. The refresh cookie is deliberately
   * not accepted here, which keeps the access path immune to CSRF.
   */
  private extractToken(request: Request): string | null {
    const header = request.headers.authorization;
    if (!header) return null;

    const [scheme, value] = header.split(' ');
    return scheme?.toLowerCase() === 'bearer' && value ? value : null;
  }
}
