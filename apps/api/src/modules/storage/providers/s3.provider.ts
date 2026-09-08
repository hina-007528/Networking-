import { createHash, createHmac } from 'node:crypto';
import type { AppConfig } from '../../../config/configuration';
import type { StorageProvider, StoredObject } from '../storage.interface';

/**
 * S3-compatible object store using the REST API and Signature Version 4.
 *
 * Implemented without an AWS SDK so the API image stays small. Works with Amazon S3 and
 * path-style compatible endpoints (MinIO, Cloudflare R2) when `S3_ENDPOINT` is set.
 */
export class S3StorageProvider implements StorageProvider {
  readonly name = 's3';
  private readonly bucket: string;
  private readonly region: string;
  private readonly accessKey: string;
  private readonly secretKey: string;
  private readonly endpoint: string | undefined;
  private readonly publicBase: string;

  constructor(config: AppConfig) {
    const { bucket, region, accessKey, secretKey, endpoint } = config.storage.s3;

    if (!bucket || !accessKey || !secretKey) {
      throw new Error('S3 storage requires S3_BUCKET, S3_ACCESS_KEY and S3_SECRET_KEY');
    }

    this.bucket = bucket;
    this.region = region ?? 'us-east-1';
    this.accessKey = accessKey;
    this.secretKey = secretKey;
    this.endpoint = endpoint;
    this.publicBase = config.storage.publicUrl.replace(/\/$/, '');
  }

  async put(key: string, body: Buffer, mimeType: string): Promise<StoredObject> {
    await this.request('PUT', key, body, mimeType);
    return { key, sizeBytes: body.length };
  }

  async get(key: string): Promise<Buffer> {
    const response = await this.request('GET', key);
    return Buffer.from(await response.arrayBuffer());
  }

  async delete(key: string): Promise<void> {
    await this.request('DELETE', key);
  }

  publicUrl(key: string): string {
    return `${this.publicBase}/${encodeURIComponent(key)}`;
  }

  private async request(
    method: 'GET' | 'PUT' | 'DELETE',
    key: string,
    body?: Buffer,
    mimeType?: string,
  ): Promise<Response> {
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = sha256Hex(body ?? '');
    const encodedKey = key
      .split('/')
      .map((part) => encodeURIComponent(part))
      .join('/');

    const host = this.host();
    const url = this.objectUrl(encodedKey);
    const headers: Record<string, string> = {
      host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
    };

    if (mimeType && method === 'PUT') {
      headers['content-type'] = mimeType;
    }

    const signedHeaders = Object.keys(headers)
      .map((name) => name.toLowerCase())
      .sort()
      .join(';');
    const canonicalHeaders = Object.keys(headers)
      .map((name) => name.toLowerCase())
      .sort()
      .map((name) => `${name}:${headers[name].trim()}\n`)
      .join('');
    const canonicalRequest = [
      method,
      `/${this.pathStyle() ? `${this.bucket}/` : ''}${encodedKey}`,
      '',
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      sha256Hex(canonicalRequest),
    ].join('\n');
    const signature = hmacHex(this.signingKey(dateStamp), stringToSign);

    headers.authorization = `AWS4-HMAC-SHA256 Credential=${this.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const response = await fetch(url, { method, headers, body });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`S3 ${method} ${key} failed (${response.status}): ${detail.slice(0, 240)}`);
    }

    return response;
  }

  private host(): string {
    if (this.endpoint) {
      return new URL(this.endpoint).host;
    }
    return `${this.bucket}.s3.${this.region}.amazonaws.com`;
  }

  private pathStyle(): boolean {
    return Boolean(this.endpoint);
  }

  private objectUrl(encodedKey: string): string {
    if (this.endpoint) {
      return `${this.endpoint.replace(/\/$/, '')}/${this.bucket}/${encodedKey}`;
    }
    return `https://${this.host()}/${encodedKey}`;
  }

  private signingKey(dateStamp: string): Buffer {
    const dateKey = hmac(Buffer.from(`AWS4${this.secretKey}`, 'utf8'), dateStamp);
    const regionKey = hmac(dateKey, this.region);
    const serviceKey = hmac(regionKey, 's3');
    return hmac(serviceKey, 'aws4_request');
  }
}

function sha256Hex(data: Buffer | string): string {
  return createHash('sha256').update(data).digest('hex');
}

function hmac(key: Buffer, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf8').digest();
}

function hmacHex(key: Buffer, data: string): string {
  return createHmac('sha256', key).update(data, 'utf8').digest('hex');
}
