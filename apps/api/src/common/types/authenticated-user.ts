import type { Permission, RoleName } from '@stormfiber/types';

/** The principal attached to a request once the access token has been verified. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  mobile: string;
  firstName: string;
  lastName: string;
  roles: RoleName[];
  permissions: Permission[];
  customerId: string | null;
  sessionId: string;
}

export interface AccessTokenPayload {
  sub: string;
  email: string;
  roles: RoleName[];
  permissions: string[];
  customerId: string | null;
  sid: string;
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string;
  sid: string;
  family: string;
  type: 'refresh';
}
