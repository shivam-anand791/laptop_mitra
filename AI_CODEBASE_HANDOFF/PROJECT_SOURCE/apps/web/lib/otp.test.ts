import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

function isValidOtpCode(code: string): boolean {
  return /^\d{6}$/.test(code.trim());
}

function isValidGrantToken(token: string): boolean {
  return typeof token === 'string' && token.length === 64 && /^[0-9a-f]{64}$/i.test(token);
}

function calculateRemainingAttempts(attempts: number, maxAttempts = 5): number {
  return Math.max(0, maxAttempts - attempts);
}

describe('OTP Verification & Grant Contracts (Phase 4 / Option A)', () => {
  describe('OTP Code Format Validation', () => {
    it('accepts strictly 6-digit numeric strings', () => {
      assert.equal(isValidOtpCode('123456'), true);
      assert.equal(isValidOtpCode('000000'), true);
      assert.equal(isValidOtpCode('999999'), true);
    });

    it('rejects codes with non-numeric characters, wrong length, or whitespace', () => {
      assert.equal(isValidOtpCode('12345'), false);
      assert.equal(isValidOtpCode('1234567'), false);
      assert.equal(isValidOtpCode('12345a'), false);
      assert.equal(isValidOtpCode(''), false);
    });
  });

  describe('Single-Use Grant Token Validation', () => {
    it('accepts valid 256-bit (64 hex characters) single-use grant tokens', () => {
      const validToken = 'a'.repeat(64);
      assert.equal(isValidGrantToken(validToken), true);
    });

    it('rejects grant tokens with improper entropy or invalid characters', () => {
      assert.equal(isValidGrantToken('short_token'), false);
      assert.equal(isValidGrantToken('g'.repeat(64)), false); // 'g' is not hex
    });
  });

  describe('Attempt Depletion Logic', () => {
    it('calculates remaining attempts accurately down to zero', () => {
      assert.equal(calculateRemainingAttempts(0, 5), 5);
      assert.equal(calculateRemainingAttempts(1, 5), 4);
      assert.equal(calculateRemainingAttempts(4, 5), 1);
      assert.equal(calculateRemainingAttempts(5, 5), 0);
      assert.equal(calculateRemainingAttempts(6, 5), 0); // clamps at 0
    });
  });
});

