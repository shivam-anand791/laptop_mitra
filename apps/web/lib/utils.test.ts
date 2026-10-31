import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatAuthError } from './utils.ts';

describe('formatAuthError Reason Code Mapping Matrix', () => {
  it('maps DATABASE_UNAVAILABLE to clear plain-language database message', () => {
    assert.equal(
      formatAuthError({ code: 'DATABASE_UNAVAILABLE' }),
      'The database is temporarily unavailable. Please try again in a few moments.'
    );
  });

  it('maps TOKEN_WRONG_PROJECT to clean cross-environment message', () => {
    assert.equal(
      formatAuthError({ code: 'TOKEN_WRONG_PROJECT' }),
      'Authentication token was issued for a different environment. Please sign out and sign in again.'
    );
  });

  it('maps TOKEN_EXPIRED to session expiration message', () => {
    assert.equal(
      formatAuthError({ code: 'TOKEN_EXPIRED' }),
      'Your session has expired. Please sign in again.'
    );
  });

  it('maps FIREBASE_UNCONFIGURED to service unavailable message', () => {
    assert.equal(
      formatAuthError({ code: 'FIREBASE_UNCONFIGURED' }),
      'Authentication service is temporarily unavailable. Please try again shortly.'
    );
  });

  it('maps client-side Firebase invalid credentials', () => {
    assert.equal(
      formatAuthError({ code: 'auth/invalid-credential' }),
      'Incorrect email or password. Please check your credentials and try again.'
    );
  });
});
