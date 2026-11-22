#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * Preflight environment checker for Mobile builds and exports.
 * Fails fast with exit code 1 if required Firebase or API variables are absent.
 */

const requiredVars = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
];

const missing = requiredVars.filter((v) => !process.env[v] || !process.env[v].trim());

if (missing.length > 0) {
  console.error('\n❌ BUILD FAILED: Missing required mobile environment variables:\n');
  missing.forEach((v) => console.error(`  - ${v}`));
  console.error('\nPlease inject these via EAS build secrets or your CI/build profile in eas.json.\n');
  process.exit(1);
} else {
  console.log('✅ Mobile environment variables preflight passed.');
}

