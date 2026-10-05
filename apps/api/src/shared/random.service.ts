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

}