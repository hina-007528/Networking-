import { Injectable, Logger } from '@nestjs/common';
import type { AnalyticsEventPayload } from '@stormfiber/types';
import { Prisma } from '@prisma/client';
import type { RequestContext } from '../../common/decorators/auth.decorators';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface RecordEventInput extends AnalyticsEventPayload {
  userId?: string | null;
  context?: RequestContext | null;
}

/**
 * Product analytics ingest.
 *
 * Events are stored here and later aggregated by the admin dashboard. A visitor address is
 * truncated to a network prefix before write so we can detect abuse without keeping a precise
 * location.
 */
@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordEventInput): Promise<void> {
    try {
      await this.prisma.analyticsEvent.create({
        data: {
          name: input.name,
          path: input.path ?? null,
          cityId: input.cityId ?? null,
          planId: input.planId ?? null,
          userId: input.userId ?? null,
          sessionId: input.sessionId ?? null,
          properties: (input.properties ?? {}) as Prisma.InputJsonValue,
          ipPrefix: ipPrefix(input.context?.ipAddress ?? null),
          userAgent: input.context?.userAgent ?? null,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to record ${input.name}: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }
}

/** Keeps a /24 (IPv4) or /48-equivalent (IPv6) prefix. Never the host address. */
export function ipPrefix(address: string | null): string | null {
  if (!address) return null;

  if (address.includes('.')) {
    const parts = address.split('.');
    if (parts.length !== 4) return null;
    return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
  }

  if (address.includes(':')) {
    const parts = address.split(':').filter((part) => part.length > 0);
    return `${parts.slice(0, 3).join(':')}::`;
  }

  return null;
}
