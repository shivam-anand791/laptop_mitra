import { parseCorsOrigins } from '../src/common/cors';
import { assertRuntimeDatabaseTarget } from '../src/common/database-safety';

type Check = { name: string; passed: boolean };

function isValidEncryptionKey(value = ''): boolean {
  const key = value.trim();
  if (/^[0-9a-fA-F]{64}$/.test(key)) return Buffer.from(key, 'hex').length === 32;
  if (Buffer.byteLength(key, 'utf8') === 32) return true;
  return Buffer.from(key, 'base64').length === 32;
}

function isValidUrl(value = '', protocol?: string): boolean {
  try {
    const url = new URL(value);
    return protocol ? url.protocol === protocol : ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
}

function isValidPostgresUrl(value = ''): boolean {
  try {
    const url = new URL(value);
    return ['postgres:', 'postgresql:'].includes(url.protocol)
      && Boolean(url.hostname && url.username && url.password && url.pathname.length > 1);
  } catch {
    return false;
  }
}

const checks: Check[] = [
  { name: 'NODE_ENV', passed: process.env.NODE_ENV === 'production' },
  { name: 'RENDER', passed: process.env.RENDER === 'true' },
];

let databaseTargetIsSafe = false;
try {
  assertRuntimeDatabaseTarget();
  databaseTargetIsSafe = true;
} catch {
  databaseTargetIsSafe = false;
}
checks.push({
  name: 'DATABASE_URL',
  passed: isValidPostgresUrl(process.env.DATABASE_URL) && databaseTargetIsSafe,
});
if (process.env.DIRECT_URL) {
  checks.push({ name: 'DIRECT_URL', passed: isValidPostgresUrl(process.env.DIRECT_URL) });
}

const corsOrigins = parseCorsOrigins(process.env.CORS_ORIGINS);
checks.push({
  name: 'CORS_ORIGINS',
  passed: corsOrigins.length > 0 && corsOrigins.every((origin) => isValidUrl(origin, 'https:')),
});
checks.push({
  name: 'PAYMENT_ENCRYPTION_KEY',
  passed: isValidEncryptionKey(process.env.PAYMENT_ENCRYPTION_KEY),
});

const firebaseProjectId = process.env.FIREBASE_PROJECT_ID?.trim() || '';
const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim() || '';
const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY?.trim().replace(/\\n/g, '\n') || '';
checks.push({ name: 'FIREBASE_PROJECT_ID', passed: firebaseProjectId.length > 0 });
checks.push({
  name: 'FIREBASE_CLIENT_EMAIL',
  passed: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(firebaseClientEmail),
});
checks.push({
  name: 'FIREBASE_PRIVATE_KEY',
  passed: firebasePrivateKey.includes('-----BEGIN PRIVATE KEY-----')
    && firebasePrivateKey.includes('-----END PRIVATE KEY-----'),
});

checks.push({
  name: 'RAZORPAY_KEY_ID',
  passed: /^rzp_(?:live|test)_[A-Za-z0-9]+$/.test(process.env.RAZORPAY_KEY_ID?.trim() || ''),
});
checks.push({ name: 'RAZORPAY_KEY_SECRET', passed: Boolean(process.env.RAZORPAY_KEY_SECRET?.trim()) });
checks.push({
  name: 'RAZORPAY_WEBHOOK_SECRET',
  passed: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET?.trim()),
});
checks.push({
  name: 'STORAGE_DRIVER',
  passed: process.env.STORAGE_DRIVER?.toLowerCase() === 'supabase',
});
checks.push({
  name: 'SUPABASE_URL',
  passed: isValidUrl(process.env.SUPABASE_URL, 'https:'),
});
checks.push({
  name: 'SUPABASE_SERVICE_ROLE_KEY',
  passed: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
});

for (const check of checks) {
  console.log(`${check.passed ? 'PASS' : 'FAIL'} ${check.name}`);
}

if (checks.some((check) => !check.passed)) process.exitCode = 1;
