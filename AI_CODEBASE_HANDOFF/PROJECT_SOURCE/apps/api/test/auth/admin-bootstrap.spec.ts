import { assertAdminBootstrapCandidate } from '../../src/auth/admin-bootstrap';

describe('admin bootstrap identity checks', () => {
  const candidate = {
    firebaseUid: 'trusted-firebase-uid',
    email: 'admin@example.com',
    emailVerified: new Date('2026-01-01T00:00:00Z'),
    status: 'ACTIVE',
  };

  it('accepts the unique active database identity with a verified email', () => {
    expect(() =>
      assertAdminBootstrapCandidate(candidate, candidate.firebaseUid, candidate.email, 1, true),
    ).not.toThrow();
  });

  it('rejects an unverified email', () => {
    expect(() =>
      assertAdminBootstrapCandidate(
        { ...candidate, emailVerified: null },
        candidate.firebaseUid,
        candidate.email,
        1,
        true,
      ),
    ).toThrow('must be verified');
  });

  it('rejects a mismatched UID, duplicate email, or inactive account', () => {
    expect(() => assertAdminBootstrapCandidate(candidate, 'other-uid', candidate.email, 1, true)).toThrow(
      'Firebase UID',
    );
    expect(() =>
      assertAdminBootstrapCandidate(candidate, candidate.firebaseUid, candidate.email, 2, true),
    ).toThrow('exactly one');
    expect(() =>
      assertAdminBootstrapCandidate(
        { ...candidate, status: 'SUSPENDED' },
        candidate.firebaseUid,
        candidate.email,
        1,
        true,
      ),
    ).toThrow('active account');
  });

  it('rejects a configured email that differs from the database profile', () => {
    expect(() =>
      assertAdminBootstrapCandidate(candidate, candidate.firebaseUid, 'other@example.com', 1, true),
    ).toThrow('does not match');
  });

  it('rejects promotion unless Firebase Auth itself confirms verification', () => {
    expect(() =>
      assertAdminBootstrapCandidate(candidate, candidate.firebaseUid, candidate.email, 1, false),
    ).toThrow('must be verified');
  });
});
