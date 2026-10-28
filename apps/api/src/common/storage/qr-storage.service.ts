import { Injectable, BadRequestException, Logger, Inject, Optional } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { IStorageService, STORAGE_SERVICE } from './storage.interface';
import { LocalStorageService } from './local-storage.service';

export interface ValidatedImage {
  extension: 'png' | 'jpg' | 'webp';
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp';
}

@Injectable()
export class QrStorageService {
  private readonly logger = new Logger(QrStorageService.name);
  private readonly storageService: IStorageService;

  constructor(
    @Optional() @Inject(STORAGE_SERVICE) storageService?: IStorageService,
  ) {
    this.storageService = storageService || new LocalStorageService();
  }

  /**
   * Validates file magic bytes (never trusts client MIME alone).
   */
  validateMagicBytes(buffer: Buffer): ValidatedImage {
    if (!buffer || buffer.length < 12) {
      throw new BadRequestException('Invalid file: file is too small or empty');
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return { extension: 'png', mimeType: 'image/png' };
    }

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { extension: 'jpg', mimeType: 'image/jpeg' };
    }

    // WEBP: 'RIFF' .... 'WEBP'
    if (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return { extension: 'webp', mimeType: 'image/webp' };
    }

    throw new BadRequestException(
      'Invalid image file format. Only authentic PNG, JPEG, and WebP files are accepted',
    );
  }

  /**
   * Saves a QR image to storage via IStorageService. Unlinks previous QR file if replacing.
   */
  async saveQrImage(userId: string, buffer: Buffer, previousKey?: string | null): Promise<string> {
    const { extension, mimeType } = this.validateMagicBytes(buffer);

    // Delete previous file if provided
    if (previousKey) {
      await this.deleteQrImage(previousKey);
    }

    const filename = `${userId}-${Date.now()}.${extension}`;
    const relativeKey = `affiliates/qr/${filename}`;

    if (this.storageService.uploadBuffer) {
      await this.storageService.uploadBuffer(relativeKey, buffer, mimeType);
    } else {
      // Fallback for providers that generate signed upload URLs
      const { uploadUrl } = await this.storageService.createSignedUploadUrl(relativeKey, mimeType);
      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': mimeType },
        body: new Uint8Array(buffer),
      });
    }

    return relativeKey;
  }

  /**
   * Deletes a QR image from storage if it exists.
   */
  async deleteQrImage(key: string): Promise<void> {
    try {
      await this.storageService.delete(key);
    } catch (err: any) {
      this.logger.warn(`Could not delete QR file at key "${key}": ${err?.message || err}`);
    }
  }

  /**
   * Retrieves file path and mime type for authorized admin streaming (or download url).
   */
  getQrFile(key: string): { filePath: string; mimeType: string } {
    if (this.storageService.getLocalFilePath) {
      const filePath = this.storageService.getLocalFilePath(key);
      if (!fs.existsSync(filePath)) {
        throw new BadRequestException('QR image file not found');
      }
      const ext = path.extname(filePath).toLowerCase();
      const mimeType =
        ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
      return { filePath, mimeType };
    }

    throw new BadRequestException('Local file streaming not supported for non-local driver');
  }

  /**
   * Generates a signed download URL for authorized viewing.
   */
  async getSignedDownloadUrl(key: string, expiresInSec = 3600): Promise<string> {
    return this.storageService.signedDownload(key, expiresInSec);
  }
}
