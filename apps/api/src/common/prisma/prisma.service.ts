import { Inject, Injectable, Logger, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { type Prisma, PrismaClient } from '@prisma/client';
import { APP_CONFIG, type AppConfig } from '../../config/configuration';

/**
 * Either the root client or an interactive transaction client.
 *
 * Services that may be composed into a caller's transaction accept this instead of
 * `PrismaService`, so the caller decides the transaction boundary.
 */
export type Db = Prisma.TransactionClient | PrismaService;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {
    super({
      log: config.isProduction
        ? [{ emit: 'event', level: 'warn' }, { emit: 'event', level: 'error' }]
        : [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'warn' },
            { emit: 'event', level: 'error' },
          ],
      errorFormat: config.isProduction ? 'minimal' : 'pretty',
    });
  }

  async onModuleInit(): Promise<void> {
    // Slow-query visibility in development, without shipping query text to production logs.
    if (!this.config.isProduction) {
      this.$on('query' as never, (event: Prisma.QueryEvent) => {
        if (event.duration >= 200) {
          this.logger.warn(`Slow query (${event.duration}ms): ${event.query}`);
        }
      });
    }

    this.$on('error' as never, (event: Prisma.LogEvent) => {
      this.logger.error(event.message);
    });

    await this.$connect();
    this.logger.log('Database connection established');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Deletes every row in dependency-safe order. Only ever used by integration tests, and refuses
   * to run outside a test environment.
   */
  async truncateAllTables(): Promise<void> {
    if (this.config.nodeEnv !== 'test') {
      throw new Error('truncateAllTables() is only available when NODE_ENV is "test"');
    }

    const tables = await this.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tablename NOT LIKE '_prisma%'
    `;

    const list = tables.map((table) => `"public"."${table.tablename}"`).join(', ');
    if (list.length > 0) {
      await this.$executeRawUnsafe(`TRUNCATE TABLE ${list} CASCADE;`);
    }
  }
}
