import * as fs from 'fs';
import * as path from 'path';
import { LocalStorageService } from '../../src/common/storage/local-storage.service';
import { SupabaseStorageService } from '../../src/common/storage/supabase-storage.service';
import { QrStorageService } from '../../src/common/storage/qr-storage.service';
import { BadRequestException } from '@nestjs/common';

describe('S2.2 Storage Adapter & QrStorageService Refactoring', () => {
  const testDir = path.resolve(process.cwd(), 'storage', 'private', 'test-suite');

  afterAll(async () => {
    try {
      if (fs.existsSync(testDir)) {
        await fs.promises.rm(testDir, { recursive: true, force: true });
      }
    } catch {}
  });

  describe('LocalStorageService (Development Only)', () => {
    let localStorageService: LocalStorageService;
    const testKey = 'test-suite/sample.png';
    // 16-byte dummy PNG with valid magic bytes
    const pngBuffer = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48,
      0x44, 0x52,
    ]);

    beforeAll(() => {
      localStorageService = new LocalStorageService();
    });

    it('generates a valid signed upload URL structure', async () => {
      const res = await localStorageService.createSignedUploadUrl(testKey, 'image/png', 1800);
      expect(res.key).toBe(testKey);
      expect(res.uploadUrl).toContain(encodeURIComponent(testKey));
      expect(res.uploadUrl).toContain('expires=');
    });

    it('uploads a buffer and confirms file presence on disk', async () => {
      const key = await localStorageService.uploadBuffer(testKey, pngBuffer, 'image/png');
      expect(key).toBe(testKey);

      const filePath = localStorageService.getLocalFilePath(testKey);
      expect(fs.existsSync(filePath)).toBe(true);
      expect(fs.readFileSync(filePath)).toEqual(pngBuffer);
    });

    it('retrieves accurate file metadata via headObject', async () => {
      const meta = await localStorageService.headObject(testKey);
      expect(meta).not.toBeNull();
      expect(meta!.size).toBe(pngBuffer.length);
      expect(meta!.mimeType).toBe('image/png');
    });

    it('returns null from headObject when file does not exist', async () => {
      const meta = await localStorageService.headObject('test-suite/non-existent.jpg');
      expect(meta).toBeNull();
    });

    it('reads a byte range from a stored file', async () => {
      const range = await localStorageService.readRange(testKey, 0, 3);
      expect(range.length).toBe(4);
      expect(range).toEqual(pngBuffer.subarray(0, 4));
    });

    it('generates a signed download URL for existing file', async () => {
      const url = await localStorageService.signedDownload(testKey, 3600);
      expect(url).toContain(encodeURIComponent(testKey));
    });

    it('deletes an object from local storage', async () => {
      await localStorageService.delete(testKey);
      const meta = await localStorageService.headObject(testKey);
      expect(meta).toBeNull();
    });
  });

  describe('SupabaseStorageService (Production)', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      process.env = { ...originalEnv };
    });

    it('fails startup in production if SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      const service = new SupabaseStorageService();
      expect(() => service.validateProductionConfig()).toThrow(
        'CRITICAL: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in production environment. Refusing to start.',
      );
    });

    it('passes production validation when Supabase environment variables are provided', () => {
      process.env.NODE_ENV = 'production';
      process.env.SUPABASE_URL = 'https://abcdefghijk.supabase.co';
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key-test-value';

      const service = new SupabaseStorageService();
      expect(() => service.validateProductionConfig()).not.toThrow();
    });
  });

  describe('QrStorageService Refactoring onto IStorageService', () => {
    let mockStorage: any;
    let qrStorageService: QrStorageService;

    beforeEach(() => {
      mockStorage = {
        uploadBuffer: jest.fn().mockResolvedValue('affiliates/qr/user-1-12345.png'),
        delete: jest.fn().mockResolvedValue(undefined),
        getLocalFilePath: jest.fn().mockReturnValue('C:\\mock\\path\\user-1-12345.png'),
        signedDownload: jest.fn().mockResolvedValue('https://mock-storage.com/download/qr.png'),
      };
      qrStorageService = new QrStorageService(mockStorage);
    });

    const validPng = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48,
    ]);

    it('validates authentic PNG magic bytes', () => {
      const res = qrStorageService.validateMagicBytes(validPng);
      expect(res.extension).toBe('png');
      expect(res.mimeType).toBe('image/png');
    });

    it('rejects invalid or corrupted image bytes', () => {
      const corrupt = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b]);
      expect(() => qrStorageService.validateMagicBytes(corrupt)).toThrow(BadRequestException);
    });

    it('delegates saving QR image to IStorageService.uploadBuffer', async () => {
      const key = await qrStorageService.saveQrImage('user-1', validPng, 'previous/key.png');

      expect(mockStorage.delete).toHaveBeenCalledWith('previous/key.png');
      expect(mockStorage.uploadBuffer).toHaveBeenCalledWith(
        expect.stringContaining('affiliates/qr/user-1-'),
        validPng,
        'image/png',
      );
      expect(key).toContain('affiliates/qr/user-1-');
    });

    it('delegates deletion to IStorageService.delete', async () => {
      await qrStorageService.deleteQrImage('affiliates/qr/user-1-test.png');
      expect(mockStorage.delete).toHaveBeenCalledWith('affiliates/qr/user-1-test.png');
    });

    it('delegates signed URL download to IStorageService.signedDownload', async () => {
      const url = await qrStorageService.getSignedDownloadUrl('affiliates/qr/user-1-test.png', 1800);
      expect(mockStorage.signedDownload).toHaveBeenCalledWith('affiliates/qr/user-1-test.png', 1800);
      expect(url).toBe('https://mock-storage.com/download/qr.png');
    });
  });

  describe('Security Check: No Service Role Key Exposure in Client Bundles', () => {
    it('proves SUPABASE_SERVICE_ROLE_KEY is absent from web and mobile source code', () => {
      const repoRoot = path.resolve(__dirname, '../../../../');
      const webDir = path.join(repoRoot, 'apps', 'web');
      const mobileDir = path.join(repoRoot, 'apps', 'mobile');

      function scanDir(dir: string): string[] {
        const violations: string[] = [];
        if (!fs.existsSync(dir)) return violations;

        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'dist') {
            continue;
          }
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            violations.push(...scanDir(fullPath));
          } else if (/\.(ts|tsx|js|jsx|json)$/.test(entry.name)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('SUPABASE_SERVICE_ROLE_KEY') || content.includes('service_role')) {
              violations.push(fullPath);
            }
          }
        }
        return violations;
      }

      const webViolations = scanDir(webDir);
      const mobileViolations = scanDir(mobileDir);

      expect(webViolations).toEqual([]);
      expect(mobileViolations).toEqual([]);
    });
  });
});
