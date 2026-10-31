export interface AdminBootstrapCandidate {
  firebaseUid: string;
  email: string | null;
  emailVerified: Date | null;
  status: string;
}

export function assertAdminBootstrapCandidate(
  candidate: AdminBootstrapCandidate | null,
  expectedUid: string,
  expectedEmail: string,
  matchingEmailCount: number,
  firebaseEmailVerified: boolean,
): asserts candidate is AdminBootstrapCandidate {
  if (!candidate || candidate.firebaseUid !== expectedUid) {
    throw new Error('No database account matches the configured Firebase UID.');
  }
  if (matchingEmailCount !== 1) {
    throw new Error('The configured admin email must match exactly one database account.');
  }
  if (
    !candidate.email ||
    candidate.email.trim().toLowerCase() !== expectedEmail.trim().toLowerCase()
  ) {
    throw new Error('The database email does not match the configured admin identity.');
  }
  if (!firebaseEmailVerified || !candidate.emailVerified) {
    throw new Error('The configured admin email must be verified before promotion.');
  }
  if (candidate.status !== 'ACTIVE') {
    throw new Error('Only an active account can be bootstrapped as ADMIN.');
  }
}
