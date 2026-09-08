import 'reflect-metadata';
import { Logger, type LogLevel } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import type { IncomingMessage } from 'node:http';
import { AppModule } from './app.module';
import { APP_CONFIG, type AppConfig } from './config/configuration';
import { setupSwagger } from './swagger';

const LOG_LEVELS: Record<AppConfig['observability']['logLevel'], LogLevel[]> = {
  error: ['error'],
  warn: ['error', 'warn'],
  info: ['error', 'warn', 'log'],
  debug: ['error', 'warn', 'log', 'debug'],
  verbose: ['error', 'warn', 'log', 'debug', 'verbose'],
};

function isAllowedCorsOrigin(
  origin: string | undefined,
  allowed: string[],
  isDevelopment: boolean,
): boolean {
  // Health checks, curl, and document navigations send no Origin. CORS only applies to browsers.
  if (!origin) {
    return true;
  }
  if (allowed.includes(origin)) {
    return true;
  }
  try {
    const { hostname, protocol } = new URL(origin);
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return isDevelopment;
    }
    if (protocol !== 'https:') {
      return false;
    }
    if (hostname === 'majawarxnetworks.online' || hostname.endsWith('.majawarxnetworks.online')) {
      return true;
    }
    // Vercel production and preview URLs for this repo (admin + site).
    if (hostname === 'networking-admin.vercel.app' || hostname.endsWith('.vercel.app')) {
      return hostname.includes('networking');
    }
  } catch {
    return false;
  }
  return false;
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    // Body parsing is registered below so the raw payment-webhook body can be captured for
    // signature verification.
    bodyParser: false,
  });

  const config = app.get<AppConfig>(APP_CONFIG);
  const logger = new Logger('Bootstrap');

  app.useLogger(LOG_LEVELS[config.observability.logLevel]);
  app.setGlobalPrefix(config.http.globalPrefix, { exclude: ['health', 'health/live', 'health/ready'] });

  // Trusting one proxy hop lets rate limiting and audit logs see the real client IP behind nginx.
  app.set('trust proxy', 1);

  app.use(
    helmet({
      // Swagger UI needs inline styles and scripts; the API itself serves no HTML.
      contentSecurityPolicy: config.isProduction ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(cookieParser());
  app.use(
    json({
      limit: config.http.bodyLimit,
      // A webhook signature covers the exact bytes the provider sent, so the parsed object is not
      // enough — re-serialising it would change key order and whitespace and fail verification.
      verify: (request, _response, buffer) => {
        (request as IncomingMessage & { rawBody?: Buffer }).rawBody = Buffer.from(buffer);
      },
    }),
  );
  app.use(urlencoded({ extended: true, limit: config.http.bodyLimit }));

  app.enableCors({
    origin: (origin, callback) => {
      if (isAllowedCorsOrigin(origin, config.http.corsOrigins, config.isDevelopment)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'Idempotency-Key'],
    exposedHeaders: ['X-Request-Id'],
    maxAge: 86_400,
  });

  app.enableShutdownHooks();

  if (config.http.swaggerEnabled) {
    setupSwagger(app, config);
  }

  await app.listen(config.http.port, '0.0.0.0');

  logger.log(`API listening on ${config.http.url}/${config.http.globalPrefix}`);
  if (config.http.swaggerEnabled) {
    logger.log(`API documentation at ${config.http.url}/docs`);
  }
}

void bootstrap().catch((error: unknown) => {
  // Nothing is wired up yet at this point, so console is the only reporting channel available.
  process.stderr.write(
    `Failed to start the API: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exit(1);
});
