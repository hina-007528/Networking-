import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule, ConfigService } from '@nestjs/config';
import {
  APP_CONFIG,
  type AppConfig,
  buildAppConfig,
  validateEnvironment,
} from './configuration';

/**
 * Wraps `@nestjs/config` so that everything downstream injects a validated, grouped `AppConfig`
 * rather than reading loose strings out of `process.env`.
 *
 * `NestConfigModule` populates `process.env` from the env files before custom loaders run, so the
 * loader below sees the merged environment and can validate it in one pass.
 */
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env.local', '.env', '../../.env'],
      load: [() => ({ app: buildAppConfig(validateEnvironment(process.env)) })],
    }),
  ],
  providers: [
    {
      provide: APP_CONFIG,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): AppConfig =>
        configService.getOrThrow<AppConfig>('app'),
    },
  ],
  exports: [APP_CONFIG, NestConfigModule],
})
export class AppConfigModule {}
