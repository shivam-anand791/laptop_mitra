import { Injectable } from '@nestjs/common';

@Injectable()
export class RandomService {
  generateReferralCode(): string {
    // Generate a 8-character alphanumeric referral code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded ambiguous chars
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  generateOtp(length = 6): string {
    const chars = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return otp;
  }

  generateJwtSecret(): string {
    // Generate a 48-byte base64url secret (as required by the app)
    const crypto = require('crypto');
    return crypto.randomBytes(48).toString('base64url');
  }

  hashPassword(password: string): Promise<string> {
    return require('bcrypt').hash(password, 12);
  }
}