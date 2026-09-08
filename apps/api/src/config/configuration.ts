import { z } from 'zod';

/**
 * Environment contract.
 *
 * The application refuses to boot if this schema fails, which turns a missing or malformed secret
 * into a startup error instead of a runtime surprise in production.
 */
const booleanFromEnv = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

const csvList = z
  .string()
  .transform((value) =>
    value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
  );

export const environmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
    REDIS_URL: z.string().default('redis://localhost:6379'),

    PORT: z.coerce.number().int().min(1).max(65535).optional(),
    API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    API_URL: z.string().default('http://localhost:4000'),
    API_GLOBAL_PREFIX: z.string().default('api/v1'),
    CORS_ORIGINS: csvList.default(
      [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
        'https://networking-admin.vercel.app',
        'https://www.majawarxnetworks.online',
        'https://majawarxnetworks.online',
        'https://admin.majawarxnetworks.online',
      ].join(','),
    ),
    THROTTLE_TTL: z.coerce.number().int().min(1).default(60),
    THROTTLE_LIMIT: z.coerce.number().int().min(1).default(120),
    SWAGGER_ENABLED: booleanFromEnv.optional(),
    BODY_LIMIT: z.string().default('1mb'),

    JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
    JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
    JWT_ACCESS_TTL: z.coerce.number().int().min(60).default(900),
    JWT_REFRESH_TTL: z.coerce.number().int().min(3600).default(2_592_000),
    COOKIE_DOMAIN: z.string().default('localhost'),
    COOKIE_SECURE: booleanFromEnv.default('false'),
    BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
    MAX_FAILED_LOGINS: z.coerce.number().int().min(3).default(8),
    LOGIN_LOCK_MINUTES: z.coerce.number().int().min(1).default(15),

    OTP_TTL_SECONDS: z.coerce.number().int().min(30).default(300),
    OTP_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(5),
    OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().min(10).default(60),
    OTP_LENGTH: z.coerce.number().int().min(4).max(8).default(6),
    OTP_DEV_ECHO: booleanFromEnv.default('false'),
    OTP_PROOF_TTL_SECONDS: z.coerce.number().int().min(60).default(1800),

    MAIL_PROVIDER: z.enum(['console', 'smtp']).default('console'),
    MAIL_FROM: z.string().default('Majawar X Network <info@majawarxnetworks.online>'),
    MAIL_ADMIN_INBOX: z
      .string()
      .default('ceo@majawarxnetworks.online,info@majawarxnetworks.online'),
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.coerce.number().int().optional(),
    SMTP_SECURE: booleanFromEnv.default('false'),
    SMTP_USER: z.string().optional(),
    SMTP_PASSWORD: z.string().optional(),

    SMS_PROVIDER: z.enum(['console', 'http']).default('console'),
    SMS_API_URL: z.string().optional(),
    SMS_API_KEY: z.string().optional(),
    SMS_SENDER_ID: z.string().default('StormFiber'),

    WHATSAPP_ADMIN: z.string().default('+923257862291'),
    WHATSAPP_ACCESS_TOKEN: z.string().optional(),
    WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),

    PAYMENT_PROVIDER: z.enum(['mock', 'card', 'bank', 'wallet']).default('mock'),
    PAYMENT_SECRET: z.string().min(8).default('dev-only-webhook-signing-secret'),
    PAYMENT_API_URL: z.string().optional(),
    PAYMENT_API_KEY: z.string().optional(),
    PAYMENT_RETURN_URL: z.string().default('http://localhost:3000/dashboard/payments/return'),
    PAYMENT_CURRENCY: z.string().length(3).default('PKR'),

    STORAGE_PROVIDER: z.enum(['local', 's3']).default('local'),
    STORAGE_LOCAL_PATH: z.string().default('./storage'),
    STORAGE_PUBLIC_URL: z.string().default('http://localhost:4000/api/v1/files'),
    STORAGE_MAX_UPLOAD_BYTES: z.coerce.number().int().default(5 * 1024 * 1024),
    S3_BUCKET: z.string().optional(),
    S3_REGION: z.string().optional(),
    S3_ENDPOINT: z.string().optional(),
    S3_ACCESS_KEY: z.string().optional(),
    S3_SECRET_KEY: z.string().optional(),

    QUEUE_ENABLED: booleanFromEnv.default('false'),
    LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug', 'verbose']).default('info'),
    SENTRY_DSN: z.string().optional(),
    METRICS_ENABLED: booleanFromEnv.default('false'),
    CACHE_TTL_SECONDS: z.coerce.number().int().min(0).default(300),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production') {
      if (env.OTP_DEV_ECHO) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['OTP_DEV_ECHO'],
          message: 'OTP_DEV_ECHO must be disabled in production',
        });
      }
      if (!env.COOKIE_SECURE) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['COOKIE_SECURE'],
          message: 'COOKIE_SECURE must be enabled in production',
        });
      }
      if (env.MAIL_PROVIDER === 'smtp' && !env.SMTP_HOST) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['SMTP_HOST'],
          message: 'SMTP_HOST is required when MAIL_PROVIDER is smtp',
        });
      }
      if (env.PAYMENT_PROVIDER !== 'mock' && (!env.PAYMENT_API_URL || !env.PAYMENT_API_KEY)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['PAYMENT_API_URL'],
          message:
            'PAYMENT_API_URL and PAYMENT_API_KEY are required unless PAYMENT_PROVIDER is "mock"',
        });
      }
      if (env.STORAGE_PROVIDER === 's3' && !env.S3_BUCKET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['S3_BUCKET'],
          message: 'S3_BUCKET is required when STORAGE_PROVIDER is s3',
        });
      }
    }
  });

export type Environment = z.infer<typeof environmentSchema>;

export function validateEnvironment(raw: Record<string, unknown>): Environment {
  const result = environmentSchema.safeParse(raw);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${details}`);
  }

  return result.data;
}

/**
 * Grouped, strongly typed view of the environment. Services inject this rather than reading
 * `process.env`, so configuration has exactly one entry point.
 */
export interface AppConfig {
  nodeEnv: Environment['NODE_ENV'];
  isProduction: boolean;
  isDevelopment: boolean;
  http: {
    port: number;
    url: string;
    globalPrefix: string;
    corsOrigins: string[];
    bodyLimit: string;
    swaggerEnabled: boolean;
  };
  throttle: { ttl: number; limit: number };
  auth: {
    jwtSecret: string;
    jwtRefreshSecret: string;
    accessTtl: number;
    refreshTtl: number;
    cookieDomain: string;
    cookieSecure: boolean;
    bcryptRounds: number;
    maxFailedLogins: number;
    loginLockMinutes: number;
  };
  otp: {
    ttlSeconds: number;
    maxAttempts: number;
    resendCooldownSeconds: number;
    length: number;
    devEcho: boolean;
    proofTtlSeconds: number;
  };
  mail: {
    provider: Environment['MAIL_PROVIDER'];
    from: string;
    adminInbox: string;
    adminInboxes: string[];
    host?: string;
    port?: number;
    secure: boolean;
    user?: string;
    password?: string;
  };
  sms: {
    provider: Environment['SMS_PROVIDER'];
    apiUrl?: string;
    apiKey?: string;
    senderId: string;
  };
  whatsapp: {
    adminNumbers: string[];
    accessToken?: string;
    phoneNumberId?: string;
  };
  payments: {
    provider: Environment['PAYMENT_PROVIDER'];
    secret: string;
    apiUrl?: string;
    apiKey?: string;
    returnUrl: string;
    currency: string;
  };
  storage: {
    provider: Environment['STORAGE_PROVIDER'];
    localPath: string;
    publicUrl: string;
    maxUploadBytes: number;
    s3: { bucket?: string; region?: string; endpoint?: string; accessKey?: string; secretKey?: string };
  };
  redis: { url: string };
  queue: { enabled: boolean };
  observability: { logLevel: Environment['LOG_LEVEL']; sentryDsn?: string; metricsEnabled: boolean };
  cache: { ttlSeconds: number };
}

export function buildAppConfig(env: Environment): AppConfig {
  return {
    nodeEnv: env.NODE_ENV,
    isProduction: env.NODE_ENV === 'production',
    isDevelopment: env.NODE_ENV === 'development',
    http: {
      port: env.PORT ?? env.API_PORT,
      url: env.API_URL,
      globalPrefix: env.API_GLOBAL_PREFIX,
      corsOrigins: env.CORS_ORIGINS,
      bodyLimit: env.BODY_LIMIT,
      swaggerEnabled: env.SWAGGER_ENABLED ?? env.NODE_ENV !== 'production',
    },
    throttle: { ttl: env.THROTTLE_TTL, limit: env.THROTTLE_LIMIT },
    auth: {
      jwtSecret: env.JWT_SECRET,
      jwtRefreshSecret: env.JWT_REFRESH_SECRET,
      accessTtl: env.JWT_ACCESS_TTL,
      refreshTtl: env.JWT_REFRESH_TTL,
      cookieDomain: env.COOKIE_DOMAIN,
      cookieSecure: env.COOKIE_SECURE,
      bcryptRounds: env.BCRYPT_ROUNDS,
      maxFailedLogins: env.MAX_FAILED_LOGINS,
      loginLockMinutes: env.LOGIN_LOCK_MINUTES,
    },
    otp: {
      ttlSeconds: env.OTP_TTL_SECONDS,
      maxAttempts: env.OTP_MAX_ATTEMPTS,
      resendCooldownSeconds: env.OTP_RESEND_COOLDOWN_SECONDS,
      length: env.OTP_LENGTH,
      devEcho: env.OTP_DEV_ECHO,
      proofTtlSeconds: env.OTP_PROOF_TTL_SECONDS,
    },
    mail: {
      provider: env.MAIL_PROVIDER,
      from: env.MAIL_FROM,
      adminInbox: env.MAIL_ADMIN_INBOX.split(',')[0]?.trim() || 'info@majawarxnetworks.online',
      adminInboxes: env.MAIL_ADMIN_INBOX.split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry.includes('@')),
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      user: env.SMTP_USER,
      password: env.SMTP_PASSWORD,
    },
    sms: {
      provider: env.SMS_PROVIDER,
      apiUrl: env.SMS_API_URL,
      apiKey: env.SMS_API_KEY,
      senderId: env.SMS_SENDER_ID,
    },
    whatsapp: {
      adminNumbers: env.WHATSAPP_ADMIN.split(',')
        .map((entry) => entry.trim())
        .filter(Boolean),
      accessToken: env.WHATSAPP_ACCESS_TOKEN,
      phoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID,
    },
    payments: {
      provider: env.PAYMENT_PROVIDER,
      secret: env.PAYMENT_SECRET,
      apiUrl: env.PAYMENT_API_URL,
      apiKey: env.PAYMENT_API_KEY,
      returnUrl: env.PAYMENT_RETURN_URL,
      currency: env.PAYMENT_CURRENCY,
    },
    storage: {
      provider: env.STORAGE_PROVIDER,
      localPath: env.STORAGE_LOCAL_PATH,
      publicUrl: env.STORAGE_PUBLIC_URL,
      maxUploadBytes: env.STORAGE_MAX_UPLOAD_BYTES,
      s3: {
        bucket: env.S3_BUCKET,
        region: env.S3_REGION,
        endpoint: env.S3_ENDPOINT,
        accessKey: env.S3_ACCESS_KEY,
        secretKey: env.S3_SECRET_KEY,
      },
    },
    redis: { url: env.REDIS_URL },
    queue: { enabled: env.QUEUE_ENABLED },
    observability: {
      logLevel: env.LOG_LEVEL,
      sentryDsn: env.SENTRY_DSN,
      metricsEnabled: env.METRICS_ENABLED,
    },
    cache: { ttlSeconds: env.CACHE_TTL_SECONDS },
  };
}

export const APP_CONFIG = 'APP_CONFIG';
