import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { RoleName, type Permission } from '@stormfiber/types';
import { AppException } from '../../../common/errors/app.exception';
import { PERMISSIONS_KEY, ROLES_KEY } from '../../../common/decorators/auth.decorators';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user';

/**
 * Authorisation guard for `@Roles()` and `@RequirePermissions()`.
 *
 * Roles are satisfied by holding *any* of the listed roles; permissions require *all* of them.
 * That split matches how the admin console is structured: broad access by role, specific
 * destructive actions by explicit permission.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];
    const requiredRoles = this.reflector.getAllAndOverride<RoleName[]>(ROLES_KEY, targets);
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      targets,
    );

    if (!requiredRoles?.length && !requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw AppException.unauthorized('Sign in to continue');
    }

    if (user.roles.includes(RoleName.SUPER_ADMIN)) {
      return true;
    }

    if (requiredRoles?.length && !requiredRoles.some((role) => user.roles.includes(role))) {
      throw AppException.forbidden('Your account does not have access to this area');
    }

    if (requiredPermissions?.length) {
      const missing = requiredPermissions.filter(
        (permission) => !user.permissions.includes(permission),
      );

      if (missing.length > 0) {
        throw AppException.forbidden('You do not have permission to perform this action');
      }
    }

    return true;
  }
}
