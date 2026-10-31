import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class RandomService {
  /**
   * Normalizes a username, customer name, email prefix or fallback ID
   * to exactly 4 lowercase alphanumeric characters.
   */
  extractUserSlug(rawUsername?: string | null, fallbackId?: string | null): string {
    const clean = (rawUsername || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (clean.length >= 4) {
      return clean.substring(0, 4);
    }

    const fallbackClean = (fallbackId || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const combined = (clean + fallbackClean + 'user').substring(0, 4);
    return combined.padEnd(4, 'x');
  }

  /**
   * Generates a Mitra affiliate referral code:
   * Format: 'mitra' + first 4 alphanumeric characters of username (lowercase) + 4 random numeric digits.
   * Example: 'mitrashiv1234', 'mitrarahu5821', 'mitraanki7392'
   */
  generateReferralCode(rawUsername?: string | null, fallbackId?: string | null): string {
    const slug = this.extractUserSlug(rawUsername, fallbackId);
    // Cryptographically secure 4-digit number supporting leading zeros (0000 - 9999)
    const suffix = crypto.randomInt(0, 10000).toString().padStart(4, '0');
    return `mitra${slug}${suffix}`;
  }
}
