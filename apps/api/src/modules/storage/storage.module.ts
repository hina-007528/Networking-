import { Global, Module, type Provider } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../config/configuration';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { LocalStorageProvider } from './providers/local.provider';
import { S3StorageProvider } from './providers/s3.provider';
import { STORAGE_PROVIDER, type StorageProvider } from './storage.interface';

const storageProvider: Provider = {
  provide: STORAGE_PROVIDER,
  inject: [APP_CONFIG],
  useFactory: (config: AppConfig): StorageProvider =>
    config.storage.provider === 's3'
      ? new S3StorageProvider(config)
      : new LocalStorageProvider(config),
};

@Global()
@Module({
  controllers: [FilesController],
  providers: [storageProvider, FilesService],
  exports: [FilesService, STORAGE_PROVIDER],
})
export class StorageModule {}
