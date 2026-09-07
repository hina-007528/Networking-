import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { compare, hash } from 'bcryptjs';
import type { Prisma } from '@prisma/client';
import type { Response } from 'express';
import type {
  AuthSessionDto,
  AuthUserDto,
  Permission,
  RoleName,
  SessionDto,
} from '@stormfiber/types';
import {
  ALL_PERMISSIONS,
  NotificationChannel,
  NotificationEvent,
  RoleName as Role,
} from '@stormfiber/types';
import { isServiceCity, SERVICE_CITY, SERVICE_CITY_SLUG } from '@stormfiber/config';
import { APP_CONFIG, type AppConfig } from '../../config/configuration';
import { type Db, PrismaService } from '../../common/prisma/prisma.service';
import { AppException } from '../../common/errors/app.exception';
import { AuditAction, AuditService } from '../../common/audit/audit.service';
import type { RequestContext } from '../../common/decorators/auth.decorators';
import type { AuthenticatedUser } from '../../common/types/authenticated-user';
import { SequenceService } from '../../common/sequence/sequence.service';
import { accountNumber } from '../../common/utils/references';
import { renderNotification } from '../notifications/notification-templates';
import { NotificationsService } from '../notifications/notifications.service';
import { OtpService } from './otp.service';
import { TokensService } from './tokens.service';

/** Shape returned by every user lookup in this service. */
const userSelect = {
  id: true,
  email: true,
  mobile: true,
  firstName: true,
  lastName: true,
  status: true,
  passwordHash: true,
  emailVerifiedAt: true,
  mobileVerifiedAt: true,
  avatarUrl: true,
  lastLoginAt: true,
  failedLoginCount: true,
  lockedUntil: true,
  createdAt: true,
  deletedAt: true,
  roles: { select: { role: { select: { name: true, permissions: { select: { permission: { select: { key: true } } } } } } } },
  customer: { select: { id: true, accountNumber: true } },
} satisfies Prisma.UserSelect;

type UserRecord = Prisma.UserGetPayload<{ select: typeof userSelect }>;

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  password: string;
  cityId?: string;
  cityName?: string;
  acceptedTerms: true;
  verificationToken?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
    private readonly otp: OtpService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    private readonly sequence: SequenceService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  // ---------------------------------------------------------------------------
  // Registration
  // ---------------------------------------------------------------------------

  async register(
    input: RegisterInput,
    context: RequestContext | null,
    response: Response,
  ): Promise<AuthSessionDto> {
    const email = input.email.toLowerCase();

    const clash = await this.prisma.user.findFirst({
      where: { OR: [{ email }, { mobile: input.mobile }] },
      select: { email: true, mobile: true },
    });

    if (clash) {
      throw AppException.validation([
        clash.email === email
          ? { field: 'email', code: 'taken', message: 'An account already uses this email address' }
          : { field: 'mobile', code: 'taken', message: 'An account already uses this mobile number' },
      ]);
    }

    // Mobile verification is mandatory: the number is the primary support and billing contact.
    const serviceCity = await this.requireServiceCity(input.cityId, input.cityName);

    if (input.verificationToken) {
      await this.otp.consumeProof(input.verificationToken, input.mobile, 'REGISTRATION');
    } else {
      throw AppException.of(
        'OTP_INVALID',
        'Verify your mobile number to finish creating your account',
        HttpStatus.BAD_REQUEST,
      );
    }

    const customerRole = await this.prisma.role.findUnique({
      where: { name: Role.CUSTOMER },
      select: { id: true },
    });

    if (!customerRole) {
      // The seed guarantees this row; its absence means the database was not provisioned.
      throw AppException.of(
        'INTERNAL_ERROR',
        'Registration is temporarily unavailable',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const created = await this.prisma.user.create({
      data: {
        email,
        mobile: input.mobile,
        passwordHash: await hash(input.password, this.config.auth.bcryptRounds),
        firstName: input.firstName,
        lastName: input.lastName,
        status: 'ACTIVE',
        mobileVerifiedAt: new Date(),
        roles: { create: { roleId: customerRole.id } },
      },
      select: userSelect,
    });

    const next = await this.sequence.next('customer.account_sequence', {
      start: 1000,
      description: 'Monotonic counter behind customer account numbers',
    });
    const accountNo = accountNumber(next);
    await this.prisma.customer.create({
      data: {
        userId: created.id,
        accountNumber: accountNo,
        firstName: created.firstName,
        lastName: created.lastName,
        email,
        mobile: input.mobile,
        status: 'PROSPECT',
        cityId: serviceCity.id,
        addressLine: `${SERVICE_CITY}, Punjab`,
      },
    });

    await this.audit.record({
      userId: created.id,
      action: AuditAction.USER_CREATED,
      entity: 'User',
      entityId: created.id,
      newValue: { email, mobile: input.mobile, source: 'self-registration', city: SERVICE_CITY },
      context,
    });

    void this.notifyRegistration({
      userId: created.id,
      firstName: created.firstName,
      lastName: created.lastName,
      email,
      mobile: input.mobile,
      accountNumber: accountNo,
      city: serviceCity.name,
    });

    return this.startSession(created, context, response);
  }

  private async notifyRegistration(input: {
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
    mobile: string;
    accountNumber: string;
    city: string;
  }): Promise<void> {
    const customerName = `${input.firstName} ${input.lastName}`.trim();
    const loginUrl = `${this.config.http.corsOrigins.find((origin) => origin.includes(':3000')) ?? 'https://www.majawarxnetworks.online'}/login`;

    const customerMail = renderNotification(NotificationEvent.USER_REGISTERED, {
      firstName: input.firstName,
      email: input.email,
      reference: input.accountNumber,
      href: loginUrl,
    });

    try {
      await this.notifications.sendEmail({
        to: input.email,
        subject: customerMail.subject,
        html: customerMail.html,
        text: customerMail.text,
        tag: 'USER_REGISTERED',
        logBody: `Welcome email sent to ${input.email} for account ${input.accountNumber}.`,
      });
    } catch (error) {
      this.logger.warn(
        `Welcome email to ${input.email} failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }

    const adminMail = renderNotification(NotificationEvent.USER_REGISTERED_ADMIN, {
      customerName,
      firstName: input.firstName,
      email: input.email,
      phone: input.mobile,
      reference: input.accountNumber,
      installAddress: input.city,
    });
    const adminLog = `New registration: ${customerName} (${input.email}, ${input.mobile}) account ${input.accountNumber} in ${input.city}.`;

    for (const recipient of this.notifications.adminInboxes) {
      try {
        await this.notifications.sendEmail({
          to: recipient,
          subject: adminMail.subject,
          html: adminMail.html,
          text: adminMail.text,
          tag: 'USER_REGISTERED_ADMIN',
          logBody: adminLog,
        });
      } catch (error) {
        this.logger.warn(
          `Registration alert to ${recipient} failed: ${error instanceof Error ? error.message : 'unknown'}`,
        );
      }
    }

    void this.notifications.dispatch({
      userId: input.userId,
      event: NotificationEvent.USER_REGISTERED,
      channels: [NotificationChannel.IN_APP],
      data: { firstName: input.firstName, reference: input.accountNumber },
    });
  }

  private async requireServiceCity(
    cityId?: string,
    cityName?: string,
  ): Promise<{ id: string; name: string }> {
    if (cityName && !isServiceCity(cityName)) {
      throw AppException.of(
        'OUTSIDE_SERVICE_CITY',
        `Accounts are only opened for ${SERVICE_CITY} addresses. Join the waitlist if you live elsewhere.`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const city = cityId
      ? await this.prisma.city.findFirst({ where: { id: cityId, deletedAt: null }, select: { id: true, name: true } })
      : await this.prisma.city.findFirst({
          where: { slug: SERVICE_CITY_SLUG, deletedAt: null },
          select: { id: true, name: true },
        });

    if (!city || !isServiceCity(city.name)) {
      throw AppException.of(
        'OUTSIDE_SERVICE_CITY',
        `Accounts are only opened for ${SERVICE_CITY} addresses.`,
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    return city;
  }

  /**
   * Gives an approved applicant a login.
   *
   * Applying does not require an account, so on approval one is created here with an unusable
   * password plus a single-use invite link — the applicant chooses their own password through the
   * ordinary reset flow. Runs inside the caller's transaction, so no orphan account survives a
   * failed provisioning run. The mobile number is already OTP-verified by the application flow.
   */
  async ensureApplicantAccount(
    db: Db,
    input: { firstName: string; lastName: string; email: string; mobile: string },
  ): Promise<{ userId: string; inviteUrl: string | null }> {
    const email = input.email.toLowerCase();

    const existing = await db.user.findFirst({
      where: { OR: [{ mobile: input.mobile }, { email }], deletedAt: null },
      select: { id: true },
    });

    if (existing) {
      return { userId: existing.id, inviteUrl: null };
    }

    const customerRole = await db.role.findUnique({
      where: { name: Role.CUSTOMER },
      select: { id: true },
    });

    if (!customerRole) {
      throw AppException.of(
        'INTERNAL_ERROR',
        'Accounts cannot be created because roles are not provisioned',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const created = await db.user.create({
      data: {
        email,
        mobile: input.mobile,
        // Random and never disclosed: the invite link is the only way in until a password is set.
        passwordHash: await hash(randomBytes(32).toString('hex'), this.config.auth.bcryptRounds),
        firstName: input.firstName,
        lastName: input.lastName,
        status: 'PENDING_VERIFICATION',
        mobileVerifiedAt: new Date(),
        roles: { create: { roleId: customerRole.id } },
      },
      select: { id: true },
    });

    const { token, hash: tokenHash } = this.tokens.createOpaqueToken();

    await db.passwordResetToken.create({
      data: {
        userId: created.id,
        tokenHash,
        // Longer than a password reset: this is the applicant's first way into the account.
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { userId: created.id, inviteUrl: this.resetUrlFor(token) };
  }

  // ---------------------------------------------------------------------------
  // Login
  // ---------------------------------------------------------------------------

  async login(
    input: { identifier: string; password: string; rememberMe?: boolean },
    context: RequestContext | null,
    response: Response,
  ): Promise<AuthSessionDto> {
    const identifier = input.identifier.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { mobile: input.identifier.trim() }], deletedAt: null },
      select: userSelect,
    });

    if (!user) {
      // Hash a throwaway value so a missing account and a wrong password cost the same time.
      await hash(input.password, this.config.auth.bcryptRounds);
      throw AppException.invalidCredentials();
    }

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
      throw AppException.of(
        'RATE_LIMITED',
        `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!(await compare(input.password, user.passwordHash))) {
      await this.registerFailedLogin(user, context);
      throw AppException.invalidCredentials();
    }

    if (user.status === 'SUSPENDED' || user.status === 'DISABLED') {
      throw AppException.forbidden(
        'This account has been disabled. Please contact support for assistance.',
      );
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    await this.audit.record({
      userId: user.id,
      action: AuditAction.LOGIN,
      entity: 'User',
      entityId: user.id,
      context,
    });

    return this.startSession(user, context, response, input.rememberMe === true);
  }

  /**
   * Counts a failed attempt and locks the account once the threshold is reached. Locking is
   * time-boxed rather than permanent so a customer is never denied access indefinitely by
   * someone else guessing at their password.
   */
  private async registerFailedLogin(user: UserRecord, context: RequestContext | null): Promise<void> {
    const attempts = user.failedLoginCount + 1;
    const shouldLock = attempts >= this.config.auth.maxFailedLogins;

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginCount: shouldLock ? 0 : attempts,
        lockedUntil: shouldLock
          ? new Date(Date.now() + this.config.auth.loginLockMinutes * 60_000)
          : null,
      },
    });

    await this.audit.record({
      userId: user.id,
      action: AuditAction.LOGIN_FAILED,
      entity: 'User',
      entityId: user.id,
      newValue: { attempts, locked: shouldLock },
      context,
    });
  }

  private async startSession(
    user: UserRecord,
    context: RequestContext | null,
    response: Response,
    persistent = true,
  ): Promise<AuthSessionDto> {
    const principal = this.toPrincipal(user);
    const { tokens } = await this.tokens.issueSession(principal, context);

    if (tokens.refreshToken) {
      this.tokens.setRefreshCookie(response, tokens.refreshToken, { persistent });
    }

    return {
      user: this.toAuthUserDto(user),
      // The refresh token lives in the HTTP-only cookie; it is not echoed in the body.
      tokens: { ...tokens, refreshToken: undefined },
    };
  }

  // ---------------------------------------------------------------------------
  // Session lifecycle
  // ---------------------------------------------------------------------------

  async refresh(
    presentedToken: string | undefined,
    context: RequestContext | null,
    response: Response,
  ): Promise<AuthSessionDto> {
    if (!presentedToken) {
      throw AppException.unauthorized('Your session has ended. Please sign in again.');
    }

    let refreshed: UserRecord | null = null;

    const { tokens } = await this.tokens.rotate(presentedToken, context, async (userId) => {
      refreshed = await this.loadActiveUser(userId);
      return refreshed ? this.toPrincipal(refreshed) : null;
    });

    if (tokens.refreshToken) {
      this.tokens.setRefreshCookie(response, tokens.refreshToken);
    }

    if (!refreshed) {
      throw AppException.unauthorized('This account is no longer active');
    }

    return {
      user: this.toAuthUserDto(refreshed),
      tokens: { ...tokens, refreshToken: undefined },
    };
  }

  async logout(
    presentedToken: string | undefined,
    userId: string | null,
    context: RequestContext | null,
    response: Response,
  ): Promise<{ signedOut: true }> {
    if (presentedToken) {
      await this.tokens.revokeByToken(presentedToken);
    }

    this.tokens.clearRefreshCookie(response);

    if (userId) {
      await this.audit.record({
        userId,
        action: AuditAction.LOGOUT,
        entity: 'User',
        entityId: userId,
        context,
      });
    }

    return { signedOut: true };
  }

  async listSessions(userId: string, currentToken?: string): Promise<SessionDto[]> {
    const currentHash = currentToken ? this.tokens.hashOf(currentToken) : null;
    const rows = await this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { lastUsedAt: 'desc' },
      select: {
        id: true,
        tokenHash: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
      },
    });

    return rows.map((row) => ({
      id: row.id,
      ipAddress: row.ipAddress,
      userAgent: row.userAgent,
      createdAt: row.createdAt.toISOString(),
      lastUsedAt: row.lastUsedAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      current: currentHash !== null && row.tokenHash === currentHash,
    }));
  }

  async revokeSession(userId: string, sessionId: string): Promise<{ revoked: true }> {
    await this.tokens.revokeSession(userId, sessionId);
    return { revoked: true };
  }

  // ---------------------------------------------------------------------------
  // Passwords
  // ---------------------------------------------------------------------------

  /**
   * Always reports success. Revealing whether an identifier exists would turn this endpoint into
   * an account enumeration oracle.
   */
  async forgotPassword(
    identifier: string,
    context: RequestContext | null,
  ): Promise<{ requested: true }> {
    const normalised = identifier.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: normalised }, { mobile: identifier.trim() }], deletedAt: null },
      select: { id: true, email: true, mobile: true, firstName: true },
    });

    if (!user) {
      this.logger.debug(`Password reset requested for unknown identifier`);
      return { requested: true };
    }

    // One live reset link at a time; older links stop working the moment a new one is issued.
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const { token, hash: tokenHash } = this.tokens.createOpaqueToken();

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await this.notifications.sendTransient(
      NotificationEvent.PASSWORD_RESET_REQUESTED,
      { firstName: user.firstName, resetUrl: this.resetUrlFor(token) },
      { email: user.email },
    );

    await this.audit.record({
      userId: user.id,
      action: AuditAction.PASSWORD_RESET,
      entity: 'User',
      entityId: user.id,
      newValue: { stage: 'requested' },
      context,
    });

    return { requested: true };
  }

  /** The password-reset link is also the invite link for an account created on approval. */
  private resetUrlFor(token: string): string {
    const base = this.config.http.corsOrigins[0] ?? '';
    return `${base}/reset-password?token=${token}`;
  }

  async resetPassword(
    input: { token: string; password: string },
    context: RequestContext | null,
  ): Promise<{ reset: true }> {
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: this.tokens.hashOf(input.token) },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        usedAt: true,
        user: { select: { status: true } },
      },
    });

    if (!record || record.usedAt) {
      throw AppException.of(
        'TOKEN_INVALID',
        'This reset link is no longer valid. Request a new one.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (record.expiresAt.getTime() <= Date.now()) {
      throw AppException.of(
        'TOKEN_EXPIRED',
        'This reset link has expired. Request a new one.',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: {
          passwordHash: await hash(input.password, this.config.auth.bcryptRounds),
          failedLoginCount: 0,
          lockedUntil: null,
          // Choosing a password completes activation for an account created from an application.
          ...(record.user.status === 'PENDING_VERIFICATION' ? { status: 'ACTIVE' as const } : {}),
        },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    // A password change invalidates every existing session — that is the point of the reset.
    await this.tokens.revokeAllForUser(record.userId);

    await this.audit.record({
      userId: record.userId,
      action: AuditAction.PASSWORD_RESET,
      entity: 'User',
      entityId: record.userId,
      newValue: { stage: 'completed' },
      context,
    });

    return { reset: true };
  }

  async changePassword(
    userId: string,
    input: { currentPassword: string; newPassword: string },
    context: RequestContext | null,
    currentRefreshToken?: string,
  ): Promise<{ changed: true }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true },
    });

    if (!user) {
      throw AppException.notFound('Account');
    }

    if (!(await compare(input.currentPassword, user.passwordHash))) {
      throw AppException.validation([
        {
          field: 'currentPassword',
          code: 'incorrect',
          message: 'Your current password is incorrect',
        },
      ]);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await hash(input.newPassword, this.config.auth.bcryptRounds) },
    });

    // Other devices are signed out; the device that made the change keeps its session.
    const revoked = await this.tokens.revokeAllForUser(
      userId,
      currentRefreshToken ? this.tokens.hashOf(currentRefreshToken) : undefined,
    );

    await this.audit.record({
      userId,
      action: AuditAction.PASSWORD_CHANGED,
      entity: 'User',
      entityId: userId,
      newValue: { otherSessionsRevoked: revoked },
      context,
    });

    return { changed: true };
  }

  // ---------------------------------------------------------------------------
  // Profile
  // ---------------------------------------------------------------------------

  async me(userId: string): Promise<AuthUserDto> {
    const user = await this.loadActiveUser(userId);

    if (!user) {
      throw AppException.unauthorized('This account is no longer active');
    }

    return this.toAuthUserDto(user);
  }

  private async loadActiveUser(userId: string): Promise<UserRecord | null> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: userSelect,
    });

    if (!user || user.status === 'SUSPENDED' || user.status === 'DISABLED') {
      return null;
    }

    return user;
  }

  // ---------------------------------------------------------------------------
  // Mapping
  // ---------------------------------------------------------------------------

  /**
   * Flattens role grants into the permission list carried by the access token.
   * SUPER_ADMIN is expanded to every permission so a newly added permission key does not need a
   * migration before the top-level role can use it.
   */
  private collectPermissions(user: UserRecord): Permission[] {
    const roles = user.roles.map((entry) => entry.role.name as RoleName);

    if (roles.includes(Role.SUPER_ADMIN)) {
      return [...ALL_PERMISSIONS];
    }

    const permissions = new Set<Permission>();
    for (const entry of user.roles) {
      for (const grant of entry.role.permissions) {
        permissions.add(grant.permission.key as Permission);
      }
    }

    return [...permissions];
  }

  private toPrincipal(user: UserRecord): Omit<AuthenticatedUser, 'sessionId'> {
    return {
      id: user.id,
      email: user.email,
      mobile: user.mobile,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles.map((entry) => entry.role.name as RoleName),
      permissions: this.collectPermissions(user),
      customerId: user.customer?.id ?? null,
    };
  }

  private toAuthUserDto(user: UserRecord): AuthUserDto {
    return {
      id: user.id,
      email: user.email,
      mobile: user.mobile,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt?.toISOString() ?? null,
      mobileVerifiedAt: user.mobileVerifiedAt?.toISOString() ?? null,
      roles: user.roles.map((entry) => entry.role.name as RoleName),
      permissions: this.collectPermissions(user),
      customerId: user.customer?.id ?? null,
      accountNumber: user.customer?.accountNumber ?? null,
      avatarUrl: user.avatarUrl,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
