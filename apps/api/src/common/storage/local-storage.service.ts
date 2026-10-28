import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { IStorageService, SignedUploadResult, StorageFileMeta } from './storage.interface';

@Injectable()
export class LocalStorageService implements IStorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly baseStorageDir: string;

  constructor() {
    this.baseStorageDir = path.resolve(process.cwd(), 'storage', 'private');
    this.ensureDirectory(this.baseStorageDir);
  }

  private ensureDirectory(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private resolveSafePath(key: string): string {
    const sanitizedKey = path.normalize(key).replace(/^(\.\.[\/\\])+/, '');
    return path.join(this.baseStorageDir, sanitizedKey);
  }

  private inferMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.png':
        return 'image/png';
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.webp':
        return 'image/webp';
      case '.mp4':
        return 'video/mp4';
      case '.webm':
        return 'video/webm';
      case '.pdf':
        return 'application/pdf';
      default:
        return 'application/octet-stream';
    }
  }

  async createSignedUploadUrl(
    key: string,
    mimeType: string,
    expiresInSec = 3600,
  ): Promise<SignedUploadResult> {
    const expires = Date.now() + expiresInSec * 1000;
    const uploadUrl = `http://127.0.0.1:8000/api/storage/local-upload?key=${encodeURIComponent(
      key,
    )}&expires=${expires}`;
    return { uploadUrl, key };
  }

  async headObject(key: string): Promise<StorageFileMeta | null> {
    const absolutePath = this.resolveSafePath(key);
    try {
      const stat = await fs.promises.stat(absolutePath);
      return {
        size: stat.size,
        mimeType: this.inferMimeType(absolutePath),
        updatedAt: stat.mtime,
      };
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        return null;
      }
      this.logger.error(`Error in headObject for key "${key}": ${err?.message || err}`);
      throw err;
    }
  }

  async readRange(key: string, start: number, end: number): Promise<Buffer> {
    const absolutePath = this.resolveSafePath(key);
    if (!fs.existsSync(absolutePath)) {
      throw new NotFoundException(`Storage object not found: ${key}`);
    }

    const length = Math.max(0, end - start + 1);
    const buffer = Buffer.alloc(length);
    const fd = await fs.promises.open(absolutePath, 'r');
    try {
      const { bytesRead } = await fd.read(buffer, 0, length, start);
      return buffer.subarray(0, bytesRead);
    } finally {
      await fd.close();
    }
  }

  async signedDownload(key: string, expiresInSec = 3600): Promise<string> {
    const absolutePath = this.resolveSafePath(key);
    if (!fs.existsSync(absolutePath)) {
      throw new NotFoundException(`Storage object not found: ${key}`);
    }
    const expires = Date.now() + expiresInSec * 1000;
    return `http://127.0.0.1:8000/api/storage/local-download?key=${encodeURIComponent(
      key,
    )}&expires=${expires}`;
  }

  async delete(key: string): Promise<void> {
    try {
      const absolutePath = this.resolveSafePath(key);
      if (fs.existsSync(absolutePath)) {
        await fs.promises.unlink(absolutePath);
      }
    } catch (err: any) {
      this.logger.warn(`Could not delete local storage file at key "${key}": ${err?.message || err}`);
    }
  }

  async uploadBuffer(key: string, buffer: Buffer, mimeType: string): Promise<string> {
    const absolutePath = this.resolveSafePath(key);
    this.ensureDirectory(path.dirname(absolutePath));
    await fs.promises.writeFile(absolutePath, buffer);
    return key;
  }

  getLocalFilePath(key: string): string {
    return this.resolveSafePath(key);
  }
}
