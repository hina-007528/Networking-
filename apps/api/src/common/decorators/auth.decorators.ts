import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Permission, RoleName } from '@stormfiber/types';
import type { Request } from 'express';
import { AppException } from '../errors/app.exception';
import type { AuthenticatedUser } from '../types/authenticated-user';

export const IS_PUBLIC_KEY = 'auth:public';
export const ROLES_KEY = 'auth:roles';
export const PERMISSIONS_KEY = 'auth:permissions';

/** Marks a route as reachable without an access token. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Requires the caller to hold at least one of the listed roles. */
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);

/** Requires the caller to hold every listed permission. */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

/** Injects the authenticated principal, or one of its properties. */
export const CurrentUser = createParamDecorator(
  (property: keyof AuthenticatedUser | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw AppException.unauthorized();
    }

    return property ? user[property] : user;
  },
);

/**
 * Injects the caller's customer id, failing closed when the account is staff-only.
 * Every customer-scoped endpoint uses this rather than trusting an id from the request.
 */
export const CurrentCustomerId = createParamDecorator((_data: unknown, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
  const customerId = request.user?.customerId;

  if (!customerId) {
    throw AppException.forbidden('This account is not linked to a customer record');
  }

  return customerId;
});

export interface RequestContext {
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
}

/** Injects the request metadata that audit logs and analytics need. */
export const Ctx = createParamDecorator((_data: unknown, context: ExecutionContext): RequestContext => {
  const request = context.switchToHttp().getRequest<Request>();
  const forwarded = request.headers['x-forwarded-for'];
  const ipAddress =
    (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : undefined) ??
    request.ip ??
    null;

  return {
    ipAddress,
    userAgent: (request.headers['user-agent'] as string | undefined) ?? null,
    requestId: (request.headers['x-request-id'] as string | undefined) ?? null,
  };
});
