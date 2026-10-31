import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Firebase Client Configuration Validation Matrix', () => {
  const firebaseKeys = [
    'NEXT_PUBLIC_FIREBASE_API_KEY',
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    'NEXT_PUBLIC_FIREBASE_APP_ID',
  ] as const;

  function validateConfig(env: Record<string, string | undefined>) {
    const missing: string[] = [];
    for (const key of firebaseKeys) {
      if (!env[key]?.trim()) {
        missing.push(key);
      }
    }
    if (missing.length > 0) {
      throw new Error(`Missing required Firebase client environment variable(s): ${missing.join(', ')}`);
    }
    return true;
  }

  it('passes validation when all 6 Firebase variables are provided', () => {
    const validEnv = {
      NEXT_PUBLIC_FIREBASE_API_KEY: 'test-key',
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'test.firebaseapp.com',
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'laptop-mitra-dev',
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'test.appspot.com',
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456789',
      NEXT_PUBLIC_FIREBASE_APP_ID: '1:123456789:web:abcdef',
    };
    assert.equal(validateConfig(validEnv), true);
  });

  it('fails with exact variable names when variables are missing', () => {
    const partialEnv = {
      NEXT_PUBLIC_FIREBASE_API_KEY: 'test-key',
      // missing authDomain and projectId
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'test.appspot.com',
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '123456789',
      // missing appId
    };

    assert.throws(
      () => validateConfig(partialEnv),
      (err: any) => {
        assert.ok(err.message.includes('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'));
        assert.ok(err.message.includes('NEXT_PUBLIC_FIREBASE_PROJECT_ID'));
        assert.ok(err.message.includes('NEXT_PUBLIC_FIREBASE_APP_ID'));
        assert.ok(!err.message.includes('NEXT_PUBLIC_FIREBASE_API_KEY'));
        return true;
      },
    );
  });

  it('never silently falls back to a production project when unset', () => {
    const emptyEnv = {};
    assert.throws(
      () => validateConfig(emptyEnv),
      /Missing required Firebase client environment variable\(s\)/,
    );
  });
});

