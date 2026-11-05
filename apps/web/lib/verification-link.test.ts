import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Helper under test: Error sanitization
function sanitizeErrorMessage(error: any): string {
  const FALLBACK_ERROR_MESSAGE = "We couldn't send the email right now. Try again in a few minutes.";
  if (!error) return FALLBACK_ERROR_MESSAGE;
  const msg = typeof error === 'string' ? error : error?.message;
  if (!msg || typeof msg !== 'string') return FALLBACK_ERROR_MESSAGE;
  if (
    msg.includes('Cannot POST') ||
    msg.includes('Cannot GET') ||
    msg.includes('Not Found') ||
    msg.includes('404') ||
    msg.includes('500') ||
    msg.includes('503') ||
    msg.includes('NetworkError') ||
    msg.includes('Failed to fetch')
  ) {
    return FALLBACK_ERROR_MESSAGE;
  }
  return msg;
}

// Verification state machine transition helper
type Stage = 'loading' | 'ready' | 'sending' | 'sent' | 'verified' | 'sync-failed' | 'invalid' | 'wrong-account';

function determineStageFromActionCode(params: {
  mode: string | null;
  actionCode: string | null;
  codeOperation: string;
  targetEmail?: string;
  currentUserEmail?: string | null;
  applyCodeSuccess: boolean;
  syncSuccess: boolean;
}): { stage: Stage; email?: string } {
  if (params.mode !== 'verifyEmail' || !params.actionCode) {
    return { stage: 'ready' };
  }
  if (params.codeOperation !== 'VERIFY_EMAIL') {
    return { stage: 'invalid' };
  }
  if (
    params.currentUserEmail &&
    params.targetEmail &&
    params.currentUserEmail.toLowerCase() !== params.targetEmail.toLowerCase()
  ) {
    return { stage: 'wrong-account', email: params.targetEmail };
  }
  if (!params.applyCodeSuccess) {
    return { stage: 'invalid' };
  }
  if (!params.syncSuccess) {
    return { stage: 'sync-failed', email: params.targetEmail };
  }
  return { stage: 'verified', email: params.targetEmail };
}

describe('Verification Link & State Machine Tests (Phase 2)', () => {
  describe('Action Code Verification & Matching', () => {
    it('transitions to verified when action code is valid and applied successfully', () => {
      const result = determineStageFromActionCode({
        mode: 'verifyEmail',
        actionCode: 'valid_oob_code_123',
        codeOperation: 'VERIFY_EMAIL',
        targetEmail: 'customer@laptopmitra.in',
        currentUserEmail: 'customer@laptopmitra.in',
        applyCodeSuccess: true,
        syncSuccess: true,
      });

      assert.equal(result.stage, 'verified');
      assert.equal(result.email, 'customer@laptopmitra.in');
    });

    it('transitions to wrong-account when logged-in account does not match link recipient', () => {
      const result = determineStageFromActionCode({
        mode: 'verifyEmail',
        actionCode: 'valid_oob_code_123',
        codeOperation: 'VERIFY_EMAIL',
        targetEmail: 'recipient@laptopmitra.in',
        currentUserEmail: 'other-user@laptopmitra.in',
        applyCodeSuccess: true,
        syncSuccess: true,
      });

      assert.equal(result.stage, 'wrong-account');
      assert.equal(result.email, 'recipient@laptopmitra.in');
    });

    it('transitions to invalid when operation is not VERIFY_EMAIL (e.g. password reset code on verify page)', () => {
      const result = determineStageFromActionCode({
        mode: 'verifyEmail',
        actionCode: 'reset_oob_code_123',
        codeOperation: 'PASSWORD_RESET',
        applyCodeSuccess: true,
        syncSuccess: true,
      });

      assert.equal(result.stage, 'invalid');
    });

    it('transitions to invalid when action code has expired or has already been used', () => {
      const result = determineStageFromActionCode({
        mode: 'verifyEmail',
        actionCode: 'expired_or_reused_code',
        codeOperation: 'VERIFY_EMAIL',
        applyCodeSuccess: false, // applyActionCode threw auth/invalid-action-code
        syncSuccess: true,
      });

      assert.equal(result.stage, 'invalid');
    });

    it('transitions to sync-failed when verification succeeded but backend profile sync was unavailable', () => {
      const result = determineStageFromActionCode({
        mode: 'verifyEmail',
        actionCode: 'valid_oob_code_123',
        codeOperation: 'VERIFY_EMAIL',
        targetEmail: 'customer@laptopmitra.in',
        currentUserEmail: 'customer@laptopmitra.in',
        applyCodeSuccess: true,
        syncSuccess: false, // /auth/sync transient failure
      });

      assert.equal(result.stage, 'sync-failed');
    });
  });

  describe('Error Message Sanitization', () => {
    it('masks technical 404 / Cannot POST error messages from users', () => {
      assert.equal(
        sanitizeErrorMessage('Cannot POST /auth/email-verification'),
        "We couldn't send the email right now. Try again in a few minutes.",
      );
      assert.equal(
        sanitizeErrorMessage({ message: 'Request failed with status code 503' }),
        "We couldn't send the email right now. Try again in a few minutes.",
      );
      assert.equal(
        sanitizeErrorMessage(null),
        "We couldn't send the email right now. Try again in a few minutes.",
      );
    });

    it('preserves clean user-facing validation errors', () => {
      assert.equal(
        sanitizeErrorMessage('Please wait before requesting another verification email.'),
        'Please wait before requesting another verification email.',
      );
    });
  });

  describe('Resend Cooldown Math', () => {
    it('decrements cooldown timer down to zero and clamps', () => {
      let cooldown = 60;
      cooldown = Math.max(0, cooldown - 1);
      assert.equal(cooldown, 59);

      cooldown = 0;
      cooldown = Math.max(0, cooldown - 1);
      assert.equal(cooldown, 0);
    });
  });
});

