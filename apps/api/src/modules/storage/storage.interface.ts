export const STORAGE_PROVIDER = 'STORAGE_PROVIDER';

export interface StoredObject {
  key: string;
  sizeBytes: number;
}

/**
 * Object-storage contract.
 *
 * Application code never talks to a disk path or an S3 bucket directly. Switching
 * `STORAGE_PROVIDER` from `local` to `s3` only changes which adapter is constructed at boot.
 */
export interface StorageProvider {
  readonly name: string;
  put(key: string, body: Buffer, mimeType: string): Promise<StoredObject>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  publicUrl(key: string): string;
}
