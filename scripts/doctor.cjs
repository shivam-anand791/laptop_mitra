#!/usr/bin/env node

/**
 * Laptop Mitra Environment & Auth Doctor
 *
 * Diagnoses Firebase Auth, API URL, and environment consistency
 * across Web, API, and Mobile without exposing secrets.
 *
 * Rules:
 *  - Never print secret values (private keys, passwords, hashes).
 *  - Reports PASS/FAIL/WARN for variable existence, project ID match, and authorized domains.
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const vars = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
    vars[key] = val;
  }
  return vars;
}

function mask(val) {
  if (!val) return '<unset>';
  if (val.length <= 6) return '***';
  return `${val.slice(0, 3)}...${val.slice(-3)}`;
}

console.log('\n========================================');
console.log('   Laptop Mitra Auth & Environment Doctor');
console.log('========================================\n');

// 1. Inspect Web Environment
const webEnvPath = path.join(rootDir, 'apps', 'web', '.env');
const webEnvLocalPath = path.join(rootDir, 'apps', 'web', '.env.local');
const webEnv = { ...parseEnvFile(webEnvPath), ...parseEnvFile(webEnvLocalPath) };

const webRequiredFirebaseVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID',
];

console.log('[1/4] Web Client Configuration:');
const missingWebVarsiables = [];
for (const varName of webRequiredFirebaseVars) {
  if (!webEnv[varName]) {
    missingWebVarsiables.push(varName);
    console.log(`  [-] ${varName}: MISSING`);
  } else {
    console.log(`  [+] ${varName}: SET (${mask(webEnv[varName])})`);
  }
}
if (!webEnv['NEXT_PUBLIC_API_URL']) {
  console.log(`  [-] NEXT_PUBLIC_API_URL: MISSING (defaults to http://localhost:3001 in dev)`);
} else {
  console.log(`  [+] NEXT_PUBLIC_API_URL: ${webEnv['NEXT_PUBLIC_API_URL']}`);
}

// 2. Inspect Mobile Environment
const mobileEnvPath = path.join(rootDir, 'apps', 'mobile', '.env');
const mobileEnv = parseEnvFile(mobileEnvPath);

const mobileRequiredFirebaseVars = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
];

console.log('\n[2/4] Mobile Client Configuration:');
const missingMobileVariables = [];
for (const varName of mobileRequiredFirebaseVars) {
  if (!mobileEnv[varName]) {
    missingMobileVariables.push(varName);
    console.log(`  [-] ${varName}: MISSING`);
  } else {
    console.log(`  [+] ${varName}: SET (${mask(mobileEnv[varName])})`);
  }
}
if (!mobileEnv['EXPO_PUBLIC_API_URL']) {
  console.log(`  [-] EXPO_PUBLIC_API_URL: MISSING`);
} else {
  console.log(`  [+] EXPO_PUBLIC_API_URL: ${mobileEnv['EXPO_PUBLIC_API_URL']}`);
}

// 3. Inspect API Environment
const apiEnvPath = path.join(rootDir, 'apps', 'api', '.env');
const apiEnvDevPath = path.join(rootDir, 'apps', 'api', '.env.development');
const apiEnv = { ...parseEnvFile(apiEnvPath), ...parseEnvFile(apiEnvDevPath) };

console.log('\n[3/4] API Firebase Admin Configuration:');
let apiProjectId = apiEnv['FIREBASE_PROJECT_ID'];

// Check service account file if path provided
let serviceAccountProjectId = null;
const saPath = apiEnv['FIREBASE_SERVICE_ACCOUNT_PATH'];
if (saPath) {
  const resolvedSaPath = path.isAbsolute(saPath)
    ? saPath
    : path.resolve(rootDir, 'apps', 'api', saPath);
  if (fs.existsSync(resolvedSaPath)) {
    try {
      const sa = JSON.parse(fs.readFileSync(resolvedSaPath, 'utf8'));
      serviceAccountProjectId = sa.project_id;
      console.log(`  [+] Service Account File: FOUND (${resolvedSaPath})`);
      console.log(`  [+] Service Account Project ID: ${serviceAccountProjectId || '<unset>'}`);
    } catch {
      console.log(`  [-] Service Account File: MALFORMED JSON at ${resolvedSaPath}`);
    }
  } else {
    console.log(`  [-] Service Account File: NOT FOUND at ${resolvedSaPath}`);
  }
}

if (apiProjectId) {
  console.log(`  [+] FIREBASE_PROJECT_ID env: ${apiProjectId}`);
} else if (serviceAccountProjectId) {
  apiProjectId = serviceAccountProjectId;
} else {
  console.log(`  [-] FIREBASE_PROJECT_ID env: MISSING`);
}

const hasEnvCredentials = !!apiEnv['FIREBASE_CLIENT_EMAIL'] && !!apiEnv['FIREBASE_PRIVATE_KEY'];
console.log(`  [+] API Direct Env Credentials: ${hasEnvCredentials ? 'SET (EMAIL & PRIVATE_KEY)' : 'NOT SET'}`);

// 4. Alignment & Project Mismatch Checks
console.log('\n[4/4] Environment Project ID Consistency Matrix:');
const webProjectId = webEnv['NEXT_PUBLIC_FIREBASE_PROJECT_ID'];
const mobileProjectId = mobileEnv['EXPO_PUBLIC_FIREBASE_PROJECT_ID'];

let allMatch = true;

if (webProjectId && apiProjectId) {
  if (webProjectId === apiProjectId) {
    console.log(`  [PASS] Web and API Project IDs match: "${webProjectId}"`);
  } else {
    console.log(`  [FAIL] Web ("${webProjectId}") and API ("${apiProjectId}") Project ID MISMATCH!`);
    allMatch = false;
  }
} else {
  console.log(`  [WARN] Unable to verify Web vs API project ID (one or both unset)`);
}

if (mobileProjectId && apiProjectId) {
  if (mobileProjectId === apiProjectId) {
    console.log(`  [PASS] Mobile and API Project IDs match: "${mobileProjectId}"`);
  } else {
    console.log(`  [FAIL] Mobile ("${mobileProjectId}") and API ("${apiProjectId}") Project ID MISMATCH!`);
    allMatch = false;
  }
} else {
  console.log(`  [WARN] Unable to verify Mobile vs API project ID (one or both unset)`);
}

// Check if dev environment uses production project
if (apiProjectId === 'laptop-mitra') {
  console.log(`  [NOTICE] Current active profile uses production Firebase project: "laptop-mitra".`);
  console.log(`           To separate dev testing, configure "laptop-mitra-dev" or Firebase Auth Emulator.`);
}

console.log('\n========================================');
console.log('   Firebase Console Reminders');
console.log('========================================');
console.log('Ensure the following domains are in Firebase Console -> Authentication -> Settings -> Authorized domains:');
console.log('  - localhost');
console.log('  - 127.0.0.1');
console.log('  - laptop-mitra.vercel.app (Production)');
console.log('  - *.vercel.app (Vercel Preview Deployments)');
console.log('========================================\n');

if (missingWebVarsiables.length > 0) {
  console.error(`ERROR: Web is missing required Firebase variables: ${missingWebVarsiables.join(', ')}`);
  process.exit(1);
}

if (!allMatch) {
  console.error('ERROR: Firebase project ID mismatch detected across monorepo packages.');
  process.exit(1);
}

console.log('Doctor preflight checks PASSED.\n');
process.exit(0);

