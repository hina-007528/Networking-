import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { APP_CONFIG, type AppConfig } from './config/configuration';
import { QueueService } from './common/queue/queue.service';

/**
 * Background worker process.
 *
 * Loads the same Nest application context as the HTTP API so job handlers share services,
 * configuration and Prisma, then listens on the BullMQ queues. Invoice generation runs here
 * rather than inside the API process so a stuck billing job cannot take the site down.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, { bufferLogs: true });
  const config = app.get<AppConfig>(APP_CONFIG);
  const logger = new Logger('Worker');
  const queue = app.get(QueueService);

  app.enableShutdownHooks();

  if (!config.queue.enabled) {
    logger.warn('QUEUE_ENABLED is false — worker has nothing to consume and will idle');
  }

  await queue.startWorkers();
  logger.log('Worker ready');
}

void bootstrap().catch((error: unknown) => {
  process.stderr.write(
    `Failed to start the worker: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exit(1);
});
