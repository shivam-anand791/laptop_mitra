#!/usr/bin/env node
/**
 * Compares .env against .env.example and reports drift.
 *
 * Deliberately dependency-free and never prints a VALUE — only key names —
 * so it is safe to run in CI logs.
 *
 * Exit codes: 0 = ok (or .env absent), 1 = missing/placeholder keys found.
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const examplePath = resolve(repoRoot, '.env.example');
const envPath = resolve(repoRoot, '.env');

/** Parses KEY=VALUE lines, ignoring comments and blanks. */
function parseEnvFile(path) {
  const out = new Map();
  for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    out.set(line.slice(0, eq).trim(), line.slice(eq + 1).trim());
  }
  return out;
}

/**
 * Keys that are only required for a particular driver selection.
 * Mirrors the superRefine() logic in src/schema.ts — keep the two in sync.
 */
function conditionalKeysFor(env) {
  const skip = new Set();

  if (env.get('MAIL_DRIVER') !== 'smtp') {
    for (const k of ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS']) skip.add(k);
  }

  const storage = env.get('STORAGE_DRIVER') ?? 'cloudinary';
  if (storage !== 'cloudinary') {
    for (const k of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'])
      skip.add(k);
  }
  if (storage !== 's3') {
    for (const k of [
      'S3_REGION',
      'S3_BUCKET',
      'S3_ACCESS_KEY_ID',
      'S3_SECRET_ACCESS_KEY',
      'S3_PUBLIC_BASE_URL',
    ])
      skip.add(k);
  }

  return skip;
}

// Matches anywhere in the value, so prefixed placeholders like
// `rzp_test_changeme` are caught. Kept in sync with notPlaceholder() in schema.ts.
const isPlaceholder = (v) =>
  /(changeme|change_me|replace[-_]?me|placeholder|\bxxx+|\btodo\b)/i.test(v) || /^your[-_]/i.test(v);

if (!existsSync(examplePath)) {
  console.error('✗ .env.example not found — cannot verify environment.');
  process.exit(1);
}

if (!existsSync(envPath)) {
  console.log('ℹ  No .env file found yet.');
  console.log('   Create one with:  cp .env.example .env');
  process.exit(0);
}

const example = parseEnvFile(examplePath);
const actual = parseEnvFile(envPath);
const optional = conditionalKeysFor(actual);

const missing = [];
const placeholder = [];
const empty = [];
const extra = [];

for (const key of example.keys()) {
  if (!actual.has(key)) {
    if (!optional.has(key)) missing.push(key);
    continue;
  }
  const value = actual.get(key);
  if (value === '') {
    if (!optional.has(key)) empty.push(key);
  } else if (isPlaceholder(value)) {
    placeholder.push(key);
  }
}

for (const key of actual.keys()) {
  if (!example.has(key)) extra.push(key);
}

const report = (label, keys, icon) => {
  if (keys.length === 0) return;
  console.log(`\n${icon} ${label}:`);
  for (const k of keys) console.log(`   - ${k}`);
};

report('Missing from .env', missing, '✗');
report('Still set to a placeholder', placeholder, '✗');
report('Present but empty', empty, '⚠');
report('In .env but not in .env.example (add it to the template)', extra, 'ℹ');

const failed = missing.length + placeholder.length + empty.length > 0;

if (failed) {
  console.log('\n✗ Environment is incomplete. The API will refuse to start.\n');
  process.exit(1);
}

console.log('✓ .env matches .env.example — no missing or placeholder keys.\n');
