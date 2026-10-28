import {
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  OnModuleInit,
} from '@nestjs/common';
import { IStorageService, SignedUploadResult, StorageFileMeta } from './storage.interface';

@Injectable()
export class SupabaseStorageService implements IStorageService, OnModuleInit {
  private readonly logger = new Logger(SupabaseStorageService.name);
  private readonly supabaseUrl: string;
  private readonly serviceRoleKey: string;
  private readonly bucket: string;

  constructor() {
    this.supabaseUrl = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
    this.serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    this.bucket = process.env.SUPABASE_STORAGE_BUCKET || 'laptopmitra-private';
  }

  onModuleInit() {
    this.validateProductionConfig();
  }

  /**
   * Fails fast if required Supabase credentials are missing in production.
   */
  validateProductionConfig(): void {
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      if (!this.supabaseUrl || !this.serviceRoleKey) {
        const errorMsg =
          'CRITICAL: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in production environment. Refusing to start.';
        this.logger.error(errorMsg);
        throw new Error(errorMsg);
      }
    }
  }

  private getAuthHeaders(contentType = 'application/json'): Record<string, string> {
    return {
      Authorization: `Bearer ${this.serviceRoleKey}`,
      apikey: this.serviceRoleKey,
      'Content-Type': contentType,
    };
  }

  async createSignedUploadUrl(
    key: string,
    mimeType: string,
    expiresInSec = 3600,
  ): Promise<SignedUploadResult> {
    if (!this.supabaseUrl || !this.serviceRoleKey) {
      throw new ServiceUnavailableException('Supabase storage credentials not configured');
    }

    const cleanKey = key.replace(/^\/+/, '');
    const endpoint = `${this.supabaseUrl}/storage/v1/object/upload/sign/${this.bucket}/${cleanKey}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ expiresIn: expiresInSec }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      this.logger.error(`Failed to create signed upload URL: ${res.status} ${errText}`);
      throw new ServiceUnavailableException('Storage provider failed to create signed upload URL');
    }

    const data = (await res.json()) as { url: string };
    const uploadUrl = data.url.startsWith('http')
      ? data.url
      : `${this.supabaseUrl}/storage/v1${data.url}`;

    return { uploadUrl, key: cleanKey };
  }

  async headObject(key: string): Promise<StorageFileMeta | null> {
    if (!this.supabaseUrl || !this.serviceRoleKey) {
      throw new ServiceUnavailableException('Supabase storage credentials not configured');
    }

    const cleanKey = key.replace(/^\/+/, '');
    const endpoint = `${this.supabaseUrl}/storage/v1/object/info/authenticated/${this.bucket}/${cleanKey}`;

    const res = await fetch(endpoint, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    if (res.status === 404) {
      return null;
    }

    if (!res.ok) {
      this.logger.error(`Failed to fetch headObject from Supabase: ${res.status}`);
      return null;
    }

    const data = (await res.json()) as any;
    return {
      size: Number(data.size || data.content_length || 0),
      mimeType: data.mimetype || data.content_type || 'application/octet-stream',
      updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
    };
  }

  async readRange(key: string, start: number, end: number): Promise<Buffer> {
    if (!this.supabaseUrl || !this.serviceRoleKey) {
      throw new ServiceUnavailableException('Supabase storage credentials not configured');
    }

    const cleanKey = key.replace(/^\/+/, '');
    const endpoint = `${this.supabaseUrl}/storage/v1/object/authenticated/${this.bucket}/${cleanKey}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.serviceRoleKey}`,
      apikey: this.serviceRoleKey,
      Range: `bytes=${start}-${end}`,
    };

    const res = await fetch(endpoint, {
      method: 'GET',
      headers,
    });

    if (res.status === 404) {
      throw new NotFoundException(`Storage object not found: ${cleanKey}`);
    }

    if (!res.ok && res.status !== 206) {
      throw new ServiceUnavailableException(`Failed to read byte range from Supabase: ${res.status}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async signedDownload(key: string, expiresInSec = 3600): Promise<string> {
    if (!this.supabaseUrl || !this.serviceRoleKey) {
      throw new ServiceUnavailableException('Supabase storage credentials not configured');
    }

    const cleanKey = key.replace(/^\/+/, '');
    const endpoint = `${this.supabaseUrl}/storage/v1/object/sign/${this.bucket}/${cleanKey}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ expiresIn: expiresInSec }),
    });

    if (res.status === 404) {
      throw new NotFoundException(`Storage object not found: ${cleanKey}`);
    }

    if (!res.ok) {
      throw new ServiceUnavailableException('Failed to generate signed download URL');
    }

    const data = (await res.json()) as { signedUrl: string };
    return data.signedUrl.startsWith('http')
      ? data.signedUrl
      : `${this.supabaseUrl}/storage/v1${data.signedUrl}`;
  }

  async delete(key: string): Promise<void> {
    if (!this.supabaseUrl || !this.serviceRoleKey) {
      return;
    }

    const cleanKey = key.replace(/^\/+/, '');
    const endpoint = `${this.supabaseUrl}/storage/v1/object/${this.bucket}`;

    try {
      await fetch(endpoint, {
        method: 'DELETE',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ prefixes: [cleanKey] }),
      });
    } catch (err: any) {
      this.logger.warn(`Failed to delete Supabase storage object "${cleanKey}": ${err?.message || err}`);
    }
  }

  async uploadBuffer(key: string, buffer: Buffer, mimeType: string): Promise<string> {
    if (!this.supabaseUrl || !this.serviceRoleKey) {
      throw new ServiceUnavailableException('Supabase storage credentials not configured');
    }

    const cleanKey = key.replace(/^\/+/, '');
    const endpoint = `${this.supabaseUrl}/storage/v1/object/${this.bucket}/${cleanKey}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.serviceRoleKey}`,
      apikey: this.serviceRoleKey,
      'Content-Type': mimeType,
      'x-upsert': 'true',
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: new Uint8Array(buffer),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      this.logger.error(`Failed to upload buffer to Supabase: ${res.status} ${errText}`);
      throw new ServiceUnavailableException('Storage provider failed to save buffer');
    }

    return cleanKey;
  }
}
