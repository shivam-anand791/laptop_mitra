import { Injectable, OnModuleInit, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class PaymentEncryptionService implements OnModuleInit {
  private readonly logger = new Logger(PaymentEncryptionService.name);
  private keyBuffer!: Buffer;

  constructor(private readonly configService: ConfigService) {
    this.resolveKey();
  }

  onModuleInit() {
    this.resolveKey();
  }

  private resolveKey(): void {
    const configVal = this.configService?.get<string>('PAYMENT_ENCRYPTION_KEY');
    const rawKey = configVal !== undefined ? configVal : process.env.PAYMENT_ENCRYPTION_KEY;
    if (!rawKey || typeof rawKey !== 'string' || rawKey.trim().length === 0) {
      const msg = 'CRITICAL: PAYMENT_ENCRYPTION_KEY is missing. API refused to start without a valid encryption key.';
      this.logger.error(msg);
      throw new Error(msg);
    }

    const trimmed = rawKey.trim();
    let parsed: Buffer;

    // Support 64-character hex string (standard 32-byte representation) or 32-character utf8/base64
    if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
      parsed = Buffer.from(trimmed, 'hex');
    } else if (Buffer.byteLength(trimmed, 'utf8') === 32) {
      parsed = Buffer.from(trimmed, 'utf8');
    } else {
      try {
        const b64 = Buffer.from(trimmed, 'base64');
        if (b64.length === 32) {
          parsed = b64;
        } else {
          parsed = Buffer.from(trimmed, 'utf8');
        }
      } catch {
        parsed = Buffer.from(trimmed, 'utf8');
      }
    }

    if (parsed.length !== 32) {
      const msg = `CRITICAL: PAYMENT_ENCRYPTION_KEY must decode to exactly 32 bytes (256 bits). Received ${parsed.length} bytes.`;
      this.logger.error(msg);
      throw new Error(msg);
    }

    this.keyBuffer = parsed;
  }

  /**
   * Encrypts plaintext using AES-256-GCM.
   * Returns versioned ciphertext: v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>
   */
  encrypt(plainText: string): string {
    if (!this.keyBuffer) {
      this.resolveKey();
    }
    if (plainText === null || plainText === undefined || plainText === '') {
      return '';
    }

    const iv = crypto.randomBytes(12); // Standard 96-bit IV for AES-GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', this.keyBuffer, iv);
    const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return `v1:${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  /**
   * Decrypts versioned ciphertext string (v1:...) using AES-256-GCM.
   */
  decrypt(versionedCiphertext: string): string {
    if (!this.keyBuffer) {
      this.resolveKey();
    }
    if (!versionedCiphertext || typeof versionedCiphertext !== 'string') {
      return '';
    }

    const parts = versionedCiphertext.split(':');
    if (parts.length !== 4 || parts[0] !== 'v1') {
      throw new BadRequestException('Unsupported or corrupted payment snapshot format');
    }

    const [, ivHex, tagHex, dataHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(tagHex, 'hex');
    const encryptedData = Buffer.from(dataHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.keyBuffer, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    return decrypted.toString('utf8');
  }

  /**
   * Mask account number: e.g. "••••••••1234"
   */
  maskAccountNumber(accountNumber?: string | null): string | null {
    if (!accountNumber) return null;
    const clean = accountNumber.replace(/\s+/g, '');
    if (clean.length <= 4) return '••••' + clean;
    const visible = clean.slice(-4);
    return '••••••••' + visible;
  }

  /**
   * Mask UPI ID: e.g. "ro••••@okaxis"
   */
  maskUpiId(upiId?: string | null): string | null {
    if (!upiId) return null;
    const parts = upiId.split('@');
    if (parts.length !== 2) return '••••@upi';
    const [handle, provider] = parts;
    const prefix = handle.slice(0, 2);
    return `${prefix}••••@${provider}`;
  }

  /**
   * Mask IFSC code: e.g. "SBIN•••••12"
   */
  maskIfsc(ifsc?: string | null): string | null {
    if (!ifsc) return null;
    const clean = ifsc.trim().toUpperCase();
    if (clean.length < 6) return '••••••';
    return clean.slice(0, 4) + '•••••' + clean.slice(-2);
  }
}
