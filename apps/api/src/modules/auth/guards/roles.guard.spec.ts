import { Reflector } from '@nestjs/core';
import { Permission, RoleName } from '@stormfiber/types';
import { describe, expect, it } from 'vitest';
import { PERMISSIONS_KEY, ROLES_KEY } from '../../../common/decorators/auth.decorators';
import { AppException } from '../../../common/errors/app.exception';
import { RolesGuard } from './roles.guard';

function context(user?: { roles: RoleName[]; permissions: Permission[] }) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as never;
}

describe('RolesGuard', () => {
  it('allows a route with no role or permission metadata', () => {
    const reflector = { getAllAndOverride: () => undefined } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(guard.canActivate(context())).toBe(true);
  });

  it('rejects a customer hitting a staff route', () => {
    const reflector = {
      getAllAndOverride: (key: string) => (key === ROLES_KEY ? [RoleName.ADMIN] : undefined),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(() =>
      guard.canActivate(
        context({ roles: [RoleName.CUSTOMER], permissions: [] }),
      ),
    ).toThrow(AppException);
  });

  it('requires every listed permission', () => {
    const reflector = {
      getAllAndOverride: (key: string) =>
        key === PERMISSIONS_KEY ? [Permission.PAYMENTS_READ, Permission.PAYMENTS_REFUND] : undefined,
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(() =>
      guard.canActivate(
        context({
          roles: [RoleName.FINANCE_AGENT],
          permissions: [Permission.PAYMENTS_READ],
        }),
      ),
    ).toThrow(/permission/i);
  });

  it('lets a super admin through even without listed permissions', () => {
    const reflector = {
      getAllAndOverride: (key: string) =>
        key === PERMISSIONS_KEY ? [Permission.PAYMENTS_REFUND] : [RoleName.FINANCE_AGENT],
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(
      guard.canActivate(
        context({
          roles: [RoleName.SUPER_ADMIN],
          permissions: [],
        }),
      ),
    ).toBe(true);
  });

  it('allows a staff member who holds the required role and permissions', () => {
    const reflector = {
      getAllAndOverride: (key: string) => {
        if (key === ROLES_KEY) return [RoleName.ADMIN, RoleName.FINANCE_AGENT];
        if (key === PERMISSIONS_KEY) return [Permission.PAYMENTS_REFUND];
        return undefined;
      },
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);
    expect(
      guard.canActivate(
        context({
          roles: [RoleName.FINANCE_AGENT],
          permissions: [Permission.PAYMENTS_REFUND],
        }),
      ),
    ).toBe(true);
  });
});
