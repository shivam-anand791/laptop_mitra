/**
 * Email Verification Guard & Grandfathering Logic
 *
 * Rules:
 * 1. Default OFF: Both NEXT_PUBLIC_ENABLE_EMAIL_VERIFICATION and API capabilities must be present.
 * 2. ADMIN and SUPPORT are unconditionally exempt.
 * 3. Guest users are exempt.
 * 4. Existing accounts created before the feature rollout cutoff are grandfathered.
 * 5. Enforcement is restricted to sensitive actions (checkout, payout withdrawal, sensitive updates).
 */

export const FEATURE_ROLLOUT_DATE = new Date('2026-11-01T00:00:00.000Z');

export interface VerificationCheckOptions {
  user?: { role?: string; isGuest?: boolean; createdAt?: string | Date } | null;
  firebaseUser?: { emailVerified?: boolean; metadata?: { creationTime?: string } } | null;
  apiCapabilities?: string[];
}

export function isVerificationEnforced({
  user,
  firebaseUser,
  apiCapabilities = [],
}: VerificationCheckOptions): boolean {
  // 1. Feature flag must be explicitly enabled on the frontend
  if (process.env.NEXT_PUBLIC_ENABLE_EMAIL_VERIFICATION !== 'true') {
    return false;
  }

  // 2. The live API instance must advertise email-verification in its capabilities
  if (!apiCapabilities.includes('email-verification')) {
    return false;
  }

  // 3. ADMIN and SUPPORT roles are strictly exempt from verification gates
  if (user?.role === 'ADMIN' || user?.role === 'SUPPORT') {
    return false;
  }

  // 4. Guest accounts are exempt
  if (user?.isGuest) {
    return false;
  }

  // 5. If already verified in Firebase Auth, not required
  if (firebaseUser?.emailVerified) {
    return false;
  }

  // 6. Grandfather existing accounts created before the feature was shipped
  const creationDateStr = user?.createdAt || firebaseUser?.metadata?.creationTime;
  if (creationDateStr) {
    const creationTime = new Date(creationDateStr);
    if (!isNaN(creationTime.getTime()) && creationTime < FEATURE_ROLLOUT_DATE) {
      return false;
    }
  }

  return true;
}

