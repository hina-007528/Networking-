import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { randomBytes, randomInt } from 'node:crypto';
import type { OtpPurpose } from '@prisma/client';
import { NotificationEvent, type OtpRequestResult, type OtpVerifyResult } from '@stormfiber/types';
import { APP_CONFIG, type AppConfig } from '../../config/configuration';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AppException } from '../../common/errors/app.exception';
import type { RequestContext } from '../../common/decorators/auth.decorators';
import { hashOtp, otpMatches } from '../../common/utils/otp-hash';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * One-time passcode issuance and verification.
 *
 * The code is only ever stored as a hash, delivery is transient (no readable copy is persisted),
 * and each request carries its own attempt counter and expiry. A successful verification yields a
 * short-lived *proof* token that registration and application submission consume, so the code
 * itself is never replayed across endpoints.
 */
@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  private hash(value: string): string {
    return hashOtp(value, this.config.auth.jwtSecret);
  }

  private generateCode(): string {
    const max = 10 ** this.config.otp.length;
    return String(randomInt(0, max)).padStart(this.config.otp.length, '0');
  }

  async request(
    input: { mobile: string; purpose: OtpPurpose; email?: string },
    context: RequestContext | null,
  ): Promise<OtpRequestResult> {
    if (
      (input.purpose === 'REGISTRATION' || input.purpose === 'APPLICATION') &&
      !input.email
    ) {
      throw AppException.of(
        'VALIDATION_ERROR',
        'Enter your email so we can send the confirmation code',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.enforceCooldown(input.mobile, input.purpose, {
      email: input.email,
      ipAddress: context?.ipAddress,
    });

    return this.issueAndDeliver(input, context);
  }

  /** Issues a replacement code for the same contact, invalidating unused earlier codes. */
  async resend(
    input: { mobile: string; purpose: OtpPurpose; email?: string },
    context: RequestContext | null,
  ): Promise<OtpRequestResult> {
    if (
      (input.purpose === 'REGISTRATION' || input.purpose === 'APPLICATION') &&
      !input.email
    ) {
      throw AppException.of(
        'VALIDATION_ERROR',
        'Enter your email so we can send the confirmation code',
        HttpStatus.BAD_REQUEST,
      );
    }

    const previous = await this.prisma.otpRequest.findFirst({
      where: { mobile: input.mobile, purpose: input.purpose },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    if (!previous) {
      return this.request(input, context);
    }

    await this.enforceCooldown(input.mobile, input.purpose, {
      email: input.email,
      ipAddress: context?.ipAddress,
    });

    this.logger.log(`OTP resend for ${input.purpose} ${input.mobile}`);
    return this.issueAndDeliver(input, context);
  }

  /**
   * Emails the code first, then persists it. A failed send does not create a row, so the user can
   * tap Resend immediately instead of waiting out a cooldown for a code they never received.
   */
  private async issueAndDeliver(
    input: { mobile: string; purpose: OtpPurpose; email?: string },
    context: RequestContext | null,
  ): Promise<OtpRequestResult> {
    const code = this.generateCode();
    const now = Date.now();
    const expiresAt = new Date(now + this.config.otp.ttlSeconds * 1000);

    const delivery = await this.notifications
      .sendTransient(
        NotificationEvent.OTP_REQUESTED,
        { code, expiryMinutes: Math.round(this.config.otp.ttlSeconds / 60) },
        { mobile: input.mobile, email: input.email ?? null },
      )
      .catch((error) => {
        this.logger.warn(
          `OTP delivery for ${input.mobile} failed: ${error instanceof Error ? error.message : 'unknown'}`,
        );
        return { delivered: false, error: error instanceof Error ? error.message : 'unknown' };
      });

    if (!delivery.delivered) {
      throw AppException.of(
        'INTERNAL_ERROR',
        otpMailFailureMessage(delivery.error),
        HttpStatus.BAD_GATEWAY,
      );
    }

    await this.prisma.otpRequest.updateMany({
      where: {
        mobile: input.mobile,
        purpose: input.purpose,
        consumedAt: null,
        verifiedAt: null,
      },
      data: { expiresAt: new Date(now - 1) },
    });

    const record = await this.prisma.otpRequest.create({
      data: {
        mobile: input.mobile,
        email: input.email ?? null,
        purpose: input.purpose,
        codeHash: this.hash(code),
        maxAttempts: this.config.otp.maxAttempts,
        expiresAt,
        ipAddress: context?.ipAddress ?? null,
      },
      select: { id: true, createdAt: true },
    });

    return {
      requestId: record.id,
      mobile: input.mobile,
      purpose: input.purpose,
      expiresAt: expiresAt.toISOString(),
      resendAvailableAt: new Date(
        record.createdAt.getTime() + this.config.otp.resendCooldownSeconds * 1000,
      ).toISOString(),
      attemptsRemaining: this.config.otp.maxAttempts,
    };
  }

  /**
   * Rate-limits resends per mobile number and purpose. This is enforced in the database rather
   * than in memory so it survives a restart and holds across API instances.
   */
  private async enforceCooldown(
    mobile: string,
    purpose: OtpPurpose,
    extras: { email?: string | null; ipAddress?: string | null },
  ): Promise<void> {
    const cooldownMs = this.config.otp.resendCooldownSeconds * 1000;
    const latest = await this.prisma.otpRequest.findFirst({
      where: { mobile, purpose },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });

    if (latest) {
      const elapsed = Date.now() - latest.createdAt.getTime();
      if (elapsed < cooldownMs) {
        const retryAfterSeconds = Math.ceil((cooldownMs - elapsed) / 1000);
        throw AppException.of(
          'OTP_COOLDOWN',
          `Please wait ${retryAfterSeconds} seconds before requesting another code`,
          HttpStatus.TOO_MANY_REQUESTS,
          [{ field: 'retryAfterSeconds', message: String(retryAfterSeconds) }],
        );
      }
    }

    const hourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const hourlyCount = await this.prisma.otpRequest.count({
      where: { mobile, createdAt: { gte: hourAgo } },
    });

    if (hourlyCount >= 8) {
      throw AppException.rateLimited(
        'Too many verification codes requested for this number. Please try again later.',
      );
    }

    if (extras.email) {
      const emailCount = await this.prisma.otpRequest.count({
        where: { email: extras.email, createdAt: { gte: hourAgo } },
      });
      if (emailCount >= 8) {
        throw AppException.rateLimited(
          'Too many verification codes requested for this email. Please try again later.',
        );
      }
    }

    if (extras.ipAddress) {
      const ipCount = await this.prisma.otpRequest.count({
        where: { ipAddress: extras.ipAddress, createdAt: { gte: hourAgo } },
      });
      if (ipCount >= 20) {
        throw AppException.rateLimited(
          'Too many verification codes requested from this network. Please try again later.',
        );
      }
    }
  }

  async verify(
    input: { requestId: string; code: string },
    _context: RequestContext | null,
  ): Promise<OtpVerifyResult> {
    const record = await this.prisma.otpRequest.findUnique({ where: { id: input.requestId } });

    if (!record) {
      throw AppException.of('OTP_INVALID', 'This verification request is not valid', HttpStatus.BAD_REQUEST);
    }

    if (record.consumedAt) {
      throw AppException.of(
        'OTP_INVALID',
        'This code has already been used. Request a new one.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (record.expiresAt.getTime() <= Date.now()) {
      throw AppException.of(
        'OTP_EXPIRED',
        'This code has expired. Request a new one.',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (record.attempts >= record.maxAttempts) {
      throw AppException.of(
        'OTP_ATTEMPTS_EXCEEDED',
        'Too many incorrect attempts. Request a new code.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    if (!this.matches(input.code, record.codeHash)) {
      const updated = await this.prisma.otpRequest.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
        select: { attempts: true, maxAttempts: true },
      });

      const remaining = Math.max(updated.maxAttempts - updated.attempts, 0);
      throw AppException.of(
        remaining === 0 ? 'OTP_ATTEMPTS_EXCEEDED' : 'OTP_INVALID',
        remaining === 0
          ? 'Too many incorrect attempts. Request a new code.'
          : `That code is incorrect. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const proof = randomBytes(32).toString('base64url');
    const proofExpiresAt = new Date(Date.now() + this.config.otp.proofTtlSeconds * 1000);

    await this.prisma.otpRequest.update({
      where: { id: record.id },
      data: {
        verifiedAt: new Date(),
        proofHash: this.hash(proof),
        proofExpiresAt,
      },
    });

    return {
      requestId: record.id,
      verified: true,
      verificationToken: proof,
      expiresAt: proofExpiresAt.toISOString(),
    };
  }

  /**
   * Consumes a verification proof, tying it to the mobile number it was issued for.
   *
   * Binding to the number is what stops a proof obtained for one number being used to register
   * or apply under a different one.
   */
  async consumeProof(token: string, mobile: string, purpose: OtpPurpose): Promise<void> {
    const record = await this.prisma.otpRequest.findFirst({
      where: {
        proofHash: this.hash(token),
        mobile,
        purpose,
        consumedAt: null,
        verifiedAt: { not: null },
      },
    });

    if (!record) {
      throw AppException.of(
        'OTP_INVALID',
        'Please verify your mobile number before continuing',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!record.proofExpiresAt || record.proofExpiresAt.getTime() <= Date.now()) {
      throw AppException.of(
        'OTP_EXPIRED',
        'Your verification has expired. Please verify your number again.',
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.prisma.otpRequest.update({
      where: { id: record.id },
      data: { consumedAt: new Date(), proofHash: null, proofExpiresAt: null },
    });
  }

  /** Constant-time comparison so a response time cannot reveal how much of the code matched. */
  private matches(code: string, storedHash: string): boolean {
    return otpMatches(code, storedHash, this.config.auth.jwtSecret);
  }

  /** Removes expired requests. Called by the maintenance job. */
  async pruneExpired(): Promise<number> {
    const result = await this.prisma.otpRequest.deleteMany({
      where: { expiresAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });

    if (result.count > 0) {
      this.logger.log(`Pruned ${result.count} expired OTP requests`);
    }

    return result.count;
  }
}

function otpMailFailureMessage(error?: string): string {
  const reason = (error ?? '').trim();
  if (/domain is not verified/i.test(reason)) {
    return 'The sending domain is not verified in Resend yet. Add only the TXT and CNAME records Resend shows — do not change Hostinger MX. Until it is Verified, codes can only be delivered to the Gmail used for the Resend account. Then tap Resend OTP.';
  }
  if (/RESEND_API_KEY/i.test(reason)) {
    return 'Email is not configured on the server. Set MAIL_PROVIDER=resend and RESEND_API_KEY on Render, then tap Resend OTP.';
  }
  if (/ECONNREFUSED|ETIMEDOUT|timeout|SMTP|blocked|EHOSTUNREACH/i.test(reason)) {
    return 'The server could not send mail over SMTP (Render blocks those ports). Set MAIL_PROVIDER=resend and RESEND_API_KEY, then tap Resend OTP.';
  }
  if (reason) {
    return `We could not send the verification email (${reason}). Check spam, then tap Resend OTP.`;
  }
  return 'We could not send the verification email. Check spam, then tap Resend OTP.';
}
