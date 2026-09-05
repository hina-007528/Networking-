import type { OtpPurpose, RoleName, UserStatus } from '../enums';

export interface AuthUserDto {
  id: string;
  email: string;
  mobile: string;
  firstName: string;
  lastName: string;
  fullName: string;
  status: UserStatus;
  emailVerifiedAt: string | null;
  mobileVerifiedAt: string | null;
  roles: RoleName[];
  permissions: string[];
  customerId: string | null;
  accountNumber: string | null;
  avatarUrl: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface LoginRequest {
  /** Email address or registered mobile number. */
  identifier: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  password: string;
  cityId?: string;
  acceptedTerms: boolean;
}

export interface AuthTokens {
  accessToken: string;
  /** Only returned when cookie transport is disabled (e.g. native clients). */
  refreshToken?: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface AuthSessionDto {
  user: AuthUserDto;
  tokens: AuthTokens;
}

export interface OtpRequestPayload {
  mobile: string;
  purpose: OtpPurpose;
  email?: string;
}

export interface OtpRequestResult {
  requestId: string;
  mobile: string;
  purpose: OtpPurpose;
  expiresAt: string;
  resendAvailableAt: string;
  attemptsRemaining: number;
  /** Populated only when OTP_DEV_ECHO is enabled in a development environment. */
  devCode?: string;
}

export interface OtpVerifyPayload {
  requestId: string;
  code: string;
}

export interface OtpVerifyResult {
  requestId: string;
  verified: true;
  /** Short-lived proof of verification consumed by registration / application submission. */
  verificationToken: string;
  expiresAt: string;
}

export interface ForgotPasswordRequest {
  identifier: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface SessionDto {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  current: boolean;
}
