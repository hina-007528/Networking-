import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  type HealthIndicatorResult,
  MemoryHealthIndicator,
} from '@nestjs/terminus';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/auth.decorators';
import { SkipEnvelope } from '../../common/decorators/response.decorators';
import { CacheService } from '../../common/cache/cache.service';
import { PrismaService } from '../../common/prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  /** Liveness: the process is up. Deliberately does not touch the database. */
  @Get('live')
  @Public()
  @SkipEnvelope()
  @ApiOperation({ summary: 'Liveness probe' })
  live(): { status: string; uptime: number; timestamp: string } {
    return {
      status: 'ok',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  /** Readiness: the process can serve traffic, which means the database must answer. */
  @Get('ready')
  @Public()
  @SkipEnvelope()
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe — verifies database connectivity' })
  ready() {
    return this.health.check([() => this.checkDatabase()]);
  }

  @Get()
  @Public()
  @SkipEnvelope()
  @HealthCheck()
  @ApiOperation({ summary: 'Full health check — database, cache and memory' })
  check() {
    return this.health.check([
      () => this.checkDatabase(),
      () => this.checkCache(),
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
    ]);
  }

  private async checkDatabase(): Promise<HealthIndicatorResult> {
    const startedAt = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { database: { status: 'up', responseTimeMs: Date.now() - startedAt } };
    } catch (error) {
      return {
        database: {
          status: 'down',
          message: error instanceof Error ? error.message : 'Unknown database error',
        },
      };
    }
  }

  /**
   * Redis is optional infrastructure — the cache degrades to an in-process map — so an
   * unavailable Redis is reported without failing readiness.
   */
  private checkCache(): HealthIndicatorResult {
    return {
      cache: {
        status: 'up',
        backend: this.cache.isRedisHealthy ? 'redis' : 'in-process',
        degraded: !this.cache.isRedisHealthy,
      },
    };
  }
}
