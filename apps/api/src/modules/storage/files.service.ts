import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { MediaAssetDto } from '@stormfiber/types';
import { ApiErrorCode } from '@stormfiber/types';
import { APP_CONFIG, type AppConfig } from '../../config/configuration';
import { AppException } from '../../common/errors/app.exception';
import { PrismaService } from '../../common/prisma/prisma.service';
import { STORAGE_PROVIDER, type StorageProvider } from './storage.interface';

const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
};

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/**
 * Persists uploaded files through the storage adapter and a `MediaAsset` row.
 *
 * The original filename is kept only as a display label. The storage key is generated here so a
 * crafted upload name can never become a path.
 */
@Injectable()
export class FilesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_PROVIDER) private readonly storage: StorageProvider,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  async upload(
    file: UploadedFile,
    uploadedById: string | null,
    altText?: string,
  ): Promise<MediaAssetDto> {
    this.assertAllowed(file);

    const extension = ALLOWED_MIME[file.mimetype];
    const now = new Date();
    const key = [
      String(now.getUTCFullYear()),
      String(now.getUTCMonth() + 1).padStart(2, '0'),
      `${randomUUID()}${extension}`,
    ].join('/');

    await this.storage.put(key, file.buffer, file.mimetype);

    const created = await this.prisma.mediaAsset.create({
      data: {
        key,
        fileName: this.safeFileName(file.originalname, extension),
        mimeType: file.mimetype,
        sizeBytes: file.size,
        altText: altText ?? null,
        provider: this.storage.name,
        uploadedById,
      },
    });

    return this.toDto(created);
  }

  async findById(id: string): Promise<MediaAssetDto> {
    const row = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!row) {
      throw AppException.notFound('File');
    }
    return this.toDto(row);
  }

  async readOwned(ids: string[], uploadedById: string): Promise<{ id: string }[]> {
    if (ids.length === 0) return [];

    const rows = await this.prisma.mediaAsset.findMany({
      where: { id: { in: ids }, uploadedById },
      select: { id: true },
    });

    if (rows.length !== ids.length) {
      throw AppException.badRequest('One or more attachments are missing or are not yours');
    }

    return rows;
  }

  async stream(id: string): Promise<{ body: Buffer; mimeType: string; fileName: string }> {
    const row = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!row) {
      throw AppException.notFound('File');
    }

    const body = await this.storage.get(row.key);
    return { body, mimeType: row.mimeType, fileName: row.fileName };
  }

  urlFor(id: string): string {
    return `${this.config.storage.publicUrl.replace(/\/$/, '')}/${id}`;
  }

  private assertAllowed(file: UploadedFile): void {
    if (!file?.buffer || file.size <= 0) {
      throw AppException.of(ApiErrorCode.UNSUPPORTED_FILE, 'Choose a file to upload');
    }

    if (file.size > this.config.storage.maxUploadBytes) {
      throw AppException.of(
        ApiErrorCode.UNSUPPORTED_FILE,
        `Files must be smaller than ${Math.floor(this.config.storage.maxUploadBytes / (1024 * 1024))} MB`,
      );
    }

    if (!ALLOWED_MIME[file.mimetype]) {
      throw AppException.of(
        ApiErrorCode.UNSUPPORTED_FILE,
        'Upload a JPEG, PNG, WebP, GIF or PDF',
      );
    }
  }

  private safeFileName(original: string, extension: string): string {
    const base = (original.split(/[/\\]/).pop() ?? 'file')
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
    const withoutExt = base.replace(/\.[^.]+$/, '');
    return `${withoutExt || 'file'}${extension}`;
  }

  toDto(row: { id: string; key: string; fileName: string; mimeType: string; sizeBytes: number; width: number | null; height: number | null; altText: string | null; createdAt: Date }): MediaAssetDto {
    return {
      id: row.id,
      key: row.key,
      fileName: row.fileName,
      mimeType: row.mimeType,
      sizeBytes: row.sizeBytes,
      url: this.urlFor(row.id),
      width: row.width,
      height: row.height,
      altText: row.altText,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
