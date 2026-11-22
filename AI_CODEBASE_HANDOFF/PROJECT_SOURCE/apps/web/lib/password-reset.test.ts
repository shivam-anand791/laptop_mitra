import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

function maskEmail(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return '***';
  const [local, domain] = parts;
  if (local.length <= 1) return `*@${domain}`;
  if (local.length === 2) return `${local[0]}*@${domain}`;
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) return { valid: false, message: 'Password must be at least 8 characters long.' };
  if (!/[a-z]/.test(password)) return { valid: false, message: 'Password must contain at least one lowercase letter.' };
  if (!/[A-Z]/.test(password)) return { valid: false, message: 'Password must contain at least one uppercase letter.' };
  if (!/[0-9]/.test(password)) return { valid: false, message: 'Password must contain at least one number.' };
  if (!/[@$!%*?&]/.test(password)) return { valid: false, message: 'Password must contain at least one special character (@$!%*?&).' };
  return { valid: true };
}

type Stage = 'verifying' | 'ready' | 'submitting' | 'success' | 'invalid';

function resolveResetStage(params: {
  oobCode?: string | null;
  verifySuccess: boolean;
  confirmSuccess: boolean;
}): Stage {
  if (!params.oobCode) return 'invalid';
  if (!params.verifySuccess) return 'invalid';
  if (params.confirmSuccess) return 'success';
  return 'ready';
}

describe('Forgot & Reset Password Web Contracts (Phase 3)', () => {
  describe('Email Masking (Anti-Credential Exposure)', () => {
    it('masks emails with standard, short, and single-letter local parts safely', () => {
      assert.equal(maskEmail('customer@laptopmitra.in'), 'c***r@laptopmitra.in');
      assert.equal(maskEmail('ab@laptopmitra.in'), 'a*@laptopmitra.in');
      assert.equal(maskEmail('a@laptopmitra.in'), '*@laptopmitra.in');
      assert.equal(maskEmail('invalid-email'), '***');
    });
  });

  describe('Password Complexity Validation', () => {
    it('rejects passwords shorter than 8 characters', () => {
      const res = validatePassword('Pass1!');
      assert.equal(res.valid, false);
      assert.match(res.message || '', /at least 8 characters/);
    });

    it('rejects passwords without lowercase letters', () => {
      const res = validatePassword('PASSWORD123!');
      assert.equal(res.valid, false);
      assert.match(res.message || '', /lowercase/);
    });

    it('rejects passwords without uppercase letters', () => {
      const res = validatePassword('password123!');
      assert.equal(res.valid, false);
      assert.match(res.message || '', /uppercase/);
    });

    it('rejects passwords without numbers', () => {
      const res = validatePassword('PasswordSpecial!');
      assert.equal(res.valid, false);
      assert.match(res.message || '', /number/);
    });

    it('rejects passwords without approved special characters', () => {
      const res = validatePassword('Password123');
      assert.equal(res.valid, false);
      assert.match(res.message || '', /special character/);
    });

    it('accepts strong compliant passwords', () => {
      const res = validatePassword('MitraSecure#2026!');
      assert.equal(res.valid, true);
      assert.equal(res.message, undefined);
    });
  });

  describe('Reset Link State Machine Transitions', () => {
    it('marks link invalid when oobCode is missing from query string', () => {
      const stage = resolveResetStage({
        oobCode: null,
        verifySuccess: false,
        confirmSuccess: false,
      });
      assert.equal(stage, 'invalid');
    });

    it('marks link invalid when code has expired or was already used', () => {
      const stage = resolveResetStage({
        oobCode: 'expired_code_123',
        verifySuccess: false,
        confirmSuccess: false,
      });
      assert.equal(stage, 'invalid');
    });

    it('transitions to ready when code is validated by Firebase', () => {
      const stage = resolveResetStage({
        oobCode: 'valid_code_123',
        verifySuccess: true,
        confirmSuccess: false,
      });
      assert.equal(stage, 'ready');
    });

    it('transitions to success when password update is confirmed', () => {
      const stage = resolveResetStage({
        oobCode: 'valid_code_123',
        verifySuccess: true,
        confirmSuccess: true,
      });
      assert.equal(stage, 'success');
    });
  });

  describe('Resend Cooldown Math', () => {
    it('decrements cooldown timer correctly and stops at 0', () => {
      let cooldown = 60;
      cooldown = Math.max(0, cooldown - 1);
      assert.equal(cooldown, 59);

      cooldown = 0;
      cooldown = Math.max(0, cooldown - 1);
      assert.equal(cooldown, 0);
    });
  });
});

