import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { type JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Response } from 'express';
import type { AuthTokens } from '@stormfiber/types';
import { APP_CONFIG, type AppConfig } from '../../config/configuration';
import { type PrismaService } from '../../common/prisma/prisma.service';
import { AppException } from '../../common/errors/app.exception';
import type {
  AccessTokenPayload,
  AuthenticatedUser,
  RefreshTokenPayload,
} from '../../common/types/authenticated-user';
import type { RequestContext } from '../../common/decorators/auth.decorators';

export const REFRESH_COOKIE_NAME = 'sf_refresh';

interface IssuedSession {
  tokens: AuthTokens;
  sessionId: string;
  userId: string;
}

/**
 * Issues and rotates the JWT pair.
 *
 * The refresh token is opaque to the client and stored only as a SHA-256 hash, so a database
 * dump cannot be replayed as a session. Every exchange rotates the token within a *family*: if a
 * previously rotated token is presented again, the whole family is revoked, which contains the
 * damage from a stolen token.
 */
@Injectable()
export class TokensService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private signAccessToken(user: AuthenticatedUser): string {
    const payload: AccessTokenPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
      permissions: user.permissions,
      customerId: user.customerId,
      sid: user.sessionId,
      type: 'access',
    };

    return this.jwt.sign(payload, {
      secret: this.config.auth.jwtSecret,
      expiresIn: this.config.auth.accessTtl,
    });
  }

  private signRefreshToken(userId: string, sessionId: string, family: string): string {
    const payload: RefreshTokenPayload = { sub: userId, sid: sessionId, family, type: 'refresh' };

    return this.jwt.sign(payload, {
      secret: this.config.auth.jwtRefreshSecret,
      expiresIn: this.config.auth.refreshTtl,
    });
  }

  /** Starts a brand new session (login, registration, password reset). */
  async issueSession(
    user: Omit<AuthenticatedUser, 'sessionId'>,
    context: RequestContext | null,
  ): Promise<IssuedSession> {
    const sessionId = randomUUID();
    const family = randomUUID();

    return this.persist({ ...user, sessionId }, family, context);
  }

  private async persist(
    user: AuthenticatedUser,
    family: string,
    context: RequestContext | null,
    replacedTokenId?: string,
  ): Promise<IssuedSession> {
    const refreshToken = this.signRefreshToken(user.id, user.sessionId, family);
    const expiresAt = new Date(Date.now() + this.config.auth.refreshTtl * 1000);

    const record = await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hash(refreshToken),
        family,
        ipAddress: context?.ipAddress ?? null,
        userAgent: context?.userAgent ?? null,
        expiresAt,
      },
      select: { id: true },
    });

    if (replacedTokenId) {
      await this.prisma.refreshToken.update({
        where: { id: replacedTokenId },
        data: { revokedAt: new Date(), replacedById: record.id },
      });
    }

    return {
      sessionId: user.sessionId,
      userId: user.id,
      tokens: {
        accessToken: this.signAccessToken(user),
        refreshToken,
        expiresIn: this.config.auth.accessTtl,
        tokenType: 'Bearer',
      },
    };
  }

  /**
   * Exchanges a refresh token for a new pair.
   *
   * @param loadUser resolves the current principal, so a role or permission change takes effect
   *   on the next refresh rather than only after the customer signs out.
   */
  async rotate(
    presentedToken: string,
    context: RequestContext | null,
    loadUser: (userId: string) => Promise<Omit<AuthenticatedUser, 'sessionId'> | null>,
  ): Promise<IssuedSession> {
    let payload: RefreshTokenPayload;
    try {
      payload = this.jwt.verify<RefreshTokenPayload>(presentedToken, {
        secret: this.config.auth.jwtRefreshSecret,
      });
    } catch {
      throw AppException.of('TOKEN_INVALID', 'Your session is no longer valid', HttpStatus.UNAUTHORIZED);
    }

    if (payload.type !== 'refresh') {
      throw AppException.of('TOKEN_INVALID', 'Your session is no longer valid', HttpStatus.UNAUTHORIZED);
    }

    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hash(presentedToken) },
    });

    if (!stored) {
      // A signed token with no matching row means the row was pruned or the token is forged.
      await this.revokeFamily(payload.family);
      throw AppException.of('TOKEN_INVALID', 'Your session is no longer valid', HttpStatus.UNAUTHORIZED);
    }

    if (stored.revokedAt || stored.replacedById) {
      // Replay of a rotated token: assume theft and invalidate every session in the family.
      await this.revokeFamily(stored.family);
      throw AppException.of(
        'TOKEN_INVALID',
        'Your session was ended for security reasons. Please sign in again.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (stored.expiresAt.getTime() <= Date.now()) {
      throw AppException.of('TOKEN_EXPIRED', 'Your session has expired. Please sign in again.', HttpStatus.UNAUTHORIZED);
    }

    const user = await loadUser(stored.userId);
    if (!user) {
      await this.revokeFamily(stored.family);
      throw AppException.unauthorized('This account is no longer active');
    }

    return this.persist({ ...user, sessionId: payload.sid }, stored.family, context, stored.id);
  }

  async revokeByToken(presentedToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.hash(presentedToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeFamily(family: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { family, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string, exceptTokenHash?: string): Promise<number> {
    const result = await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(exceptTokenHash ? { tokenHash: { not: exceptTokenHash } } : {}),
      },
      data: { revokedAt: new Date() },
    });

    return result.count;
  }

  async revokeSession(userId: string, tokenId: string): Promise<void> {
    const result = await this.prisma.refreshToken.updateMany({
      where: { id: tokenId, userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    if (result.count === 0) {
      throw AppException.notFound('Session');
    }
  }

  /** Deletes rows that can no longer authenticate anything. Called by the maintenance job. */
  async pruneExpired(): Promise<number> {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const result = await this.prisma.refreshToken.deleteMany({
      where: { OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { lt: cutoff } }] },
    });

    return result.count;
  }

  /**
   * Stores the refresh token in an HTTP-only cookie so browser clients never expose it to
   * JavaScript, which removes the XSS route to long-lived credentials.
   */
  setRefreshCookie(response: Response, refreshToken: string): void {
    response.cookie(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: this.config.auth.cookieSecure,
      sameSite: 'lax',
      domain: this.config.auth.cookieDomain === 'localhost' ? undefined : this.config.auth.cookieDomain,
      path: '/',
      maxAge: this.config.auth.refreshTtl * 1000,
    });
  }

  clearRefreshCookie(response: Response): void {
    response.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: this.config.auth.cookieSecure,
      sameSite: 'lax',
      domain: this.config.auth.cookieDomain === 'localhost' ? undefined : this.config.auth.cookieDomain,
      path: '/',
    });
  }

  hashOf(token: string): string {
    return this.hash(token);
  }

  /** Generates an opaque, single-use token for password-reset links. */
  createOpaqueToken(): { token: string; hash: string } {
    const token = randomBytes(32).toString('base64url');
    return { token, hash: this.hash(token) };
  }
}
