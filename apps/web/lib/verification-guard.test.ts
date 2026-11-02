import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { isVerificationEnforced, FEATURE_ROLLOUT_DATE } from './verification-guard.ts';

describe('isVerificationEnforced', () => {
  const originalEnv = process.env.NEXT_PUBLIC_ENABLE_EMAIL_VERIFICATION;

  afterEach(() => {
    process.env.NEXT_PUBLIC_ENABLE_EMAIL_VERIFICATION = originalEnv;
  });

  describe('Feature Flag Behavior (default OFF)', () => {
    it('returns false by default when feature flag is undefined', () => {
      delete process.env.NEXT_PUBLIC_ENABLE_EMAIL_VERIFICATION;
      const result = isVerificationEnforced({
        user: { role: 'CUSTOMER', isGuest: false, createdAt: new Date() },
        firebaseUser: { emailVerified: false },
        apiCapabilities: ['email-verification'],
      });
      assert.equal(result, false);
    });

    it('returns false when feature flag is explicitly "false"', () => {
      process.env.NEXT_PUBLIC_ENABLE_EMAIL_VERIFICATION = 'false';
      const result = isVerificationEnforced({
        user: { role: 'CUSTOMER', isGuest: false, createdAt: new Date() },
        firebaseUser: { emailVerified: false },
        apiCapabilities: ['email-verification'],
      });
      assert.equal(result, false);
    });

    it('returns false when API capabilities do not include email-verification', () => {
      process.env.NEXT_PUBLIC_ENABLE_EMAIL_VERIFICATION = 'true';
      const result = isVerificationEnforced({
        user: { role: 'CUSTOMER', isGuest: false, createdAt: new Date() },
        firebaseUser: { emailVerified: false },
        apiCapabilities: [], // e.g. rolled back or legacy API
      });
      assert.equal(result, false);
    });
  });

  describe('Role Exemptions', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_ENABLE_EMAIL_VERIFICATION = 'true';
    });

    it('exempts ADMIN role unconditionally even if unverified', () => {
      const result = isVerificationEnforced({
        user: { role: 'ADMIN', isGuest: false, createdAt: new Date() },
        firebaseUser: { emailVerified: false },
        apiCapabilities: ['email-verification'],
      });
      assert.equal(result, false);
    });

    it('exempts SUPPORT role unconditionally even if unverified', () => {
      const result = isVerificationEnforced({
        user: { role: 'SUPPORT', isGuest: false, createdAt: new Date() },
        firebaseUser: { emailVerified: false },
        apiCapabilities: ['email-verification'],
      });
      assert.equal(result, false);
    });

    it('exempts guest accounts unconditionally', () => {
      const result = isVerificationEnforced({
        user: { role: 'CUSTOMER', isGuest: true },
        firebaseUser: { emailVerified: false },
        apiCapabilities: ['email-verification'],
      });
      assert.equal(result, false);
    });
  });

  describe('Grandfathering Existing Accounts', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_ENABLE_EMAIL_VERIFICATION = 'true';
    });

    it('grandfathers historical accounts created before the rollout date', () => {
      const preRolloutDate = new Date(FEATURE_ROLLOUT_DATE.getTime() - 24 * 60 * 60 * 1000); // 1 day before
      const result = isVerificationEnforced({
        user: { role: 'CUSTOMER', isGuest: false, createdAt: preRolloutDate.toISOString() },
        firebaseUser: { emailVerified: false },
        apiCapabilities: ['email-verification'],
      });
      assert.equal(result, false);
    });

    it('enforces verification for new accounts created after the rollout date', () => {
      const postRolloutDate = new Date(FEATURE_ROLLOUT_DATE.getTime() + 24 * 60 * 60 * 1000); // 1 day after
      const result = isVerificationEnforced({
        user: { role: 'CUSTOMER', isGuest: false, createdAt: postRolloutDate.toISOString() },
        firebaseUser: { emailVerified: false },
        apiCapabilities: ['email-verification'],
      });
      assert.equal(result, true);
    });

    it('returns false if user is already emailVerified', () => {
      const postRolloutDate = new Date(FEATURE_ROLLOUT_DATE.getTime() + 24 * 60 * 60 * 1000);
      const result = isVerificationEnforced({
        user: { role: 'CUSTOMER', isGuest: false, createdAt: postRolloutDate.toISOString() },
        firebaseUser: { emailVerified: true },
        apiCapabilities: ['email-verification'],
      });
      assert.equal(result, false);
    });
  });
});
