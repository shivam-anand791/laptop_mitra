import { config as loadDotenv } from 'dotenv';
import { envSchema, type Env } from './schema.js';

export { envSchema, envObjectSchema, type Env } from './schema.js';

/** Fields whose values must never appear in logs or error output. */
const SECRET_KEYS = new Set<keyof Env>([
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET',
  'SMTP_PASS',
  'CLOUDINARY_API_SECRET',
  'S3_SECRET_ACCESS_KEY',
]);

export function isSecretKey(key: string): boolean {
  return SECRET_KEYS.has(key as keyof Env);
}

/**
 * Masks a secret for safe display: keeps a short prefix so a value can be
 * identified, never enough to reconstruct it.
 */
export function maskSecret(value: string | undefined): string {
  if (!value) return '<unset>';
  if (value.length <= 8) return '***';
  return `${value.slice(0, 4)}…***(${value.length} chars)`;
}

/**
 * Returns a redacted copy of the config, safe to log at startup.
 */
export function redactEnv(env: Env): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(env).map(([k, v]) => [
      k,
      isSecretKey(k) ? maskSecret(typeof v === 'string' ? v : undefined) : v,
    ]),
  );
}

let cached: Env | undefined;

/**
 * Loads, validates, and caches configuration.
 *
 * Fails fast: an invalid or incomplete environment throws before the app can
 * serve a request. Validation messages deliberately name only the offending
 * KEY and never echo the value, so a bad secret is not leaked into logs.
 */
export function loadEnv(options: { reload?: boolean } = {}): Env {
  if (cached && !options.reload) return cached;

  // Never override real environment variables that are already set — on a
  // deployed host the platform's variables must win over any stray .env file.
  loadDotenv({ override: false });

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `  • ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');

    throw new Error(
      `Invalid environment configuration — refusing to start.\n\n${details}\n\n` +
        `Copy .env.example to .env and fill in the missing values. ` +
        `Run \`npm run env:check\` to compare your .env against .env.example.`,
    );
  }

  cached = parsed.data;
  return cached;
}

/** Test-only: clears the memoised config. */
export function resetEnvCache(): void {
  cached = undefined;
}
