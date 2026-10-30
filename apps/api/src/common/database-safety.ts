import * as dotenv from 'dotenv';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const protectedHostsPath = resolve(__dirname, '../../../../.db-protected-hosts');

export function loadDatabaseEnvironment(
  environment: 'development' | 'test',
  databaseNameOverride?: string,
): void {
  const allowDevSeed = process.env.ALLOW_DEV_SEED === 'true';
  const developmentDatabaseName = process.env.DEV_DATABASE_NAME;
  const envPath = resolve(__dirname, `../../.env.${environment}`);
  if (!existsSync(envPath)) {
    throw new Error(`Database safety error: required ${environment} environment file is missing.`);
  }

  const result = dotenv.config({ path: envPath, override: true });
  if (result.error) {
    throw new Error(`Database safety error: could not load the ${environment} environment file.`);
  }

  if (environment === 'development') {
    if (allowDevSeed) process.env.ALLOW_DEV_SEED = 'true';

    for (const variable of ['DATABASE_URL', 'DIRECT_URL'] as const) {
      const value = process.env[variable];
      if (!value) continue;

      try {
        const url = new URL(value);
        const databaseName = getDevelopmentDatabaseName(url.hostname, developmentDatabaseName);
        if (databaseName) {
          url.pathname = `/${databaseName}`;
        }
        process.env[variable] = url.toString();
      } catch {
        throw new Error(`Database safety error: ${variable} is not a valid PostgreSQL URL.`);
      }
    }
  }

  if (environment === 'test') {
    process.env.ALLOWED_DEV_DB_HOST = '';
    process.env.MAIL_DRIVER = 'console';
    process.env.ALLOW_REAL_EMAILS = 'false';
    delete process.env.RESEND_API_KEY;
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
  }

  if (databaseNameOverride) {
    if (!/^[a-zA-Z0-9_]+$/.test(databaseNameOverride)) {
      throw new Error('Database safety error: test database name must be a PostgreSQL identifier.');
    }

    for (const variable of ['DATABASE_URL', 'DIRECT_URL'] as const) {
      const value = process.env[variable];
      if (!value) continue;

      try {
        const url = new URL(value);
        if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
          throw new Error('Database safety error: integration tests require a loopback database host.');
        }
        url.pathname = `/${databaseNameOverride}`;
        process.env[variable] = url.toString();
      } catch (error) {
        if (error instanceof Error && error.message.startsWith('Database safety error:')) throw error;
        throw new Error(`Database safety error: ${variable} is not a valid PostgreSQL URL.`);
      }
    }
  }
}

export function assertDevelopmentCatalogCount(productCount: number): void {
  if (productCount <= 0) {
    throw new Error('Development database is empty; run pnpm db:dev:seed.');
  }
}

export function getDevelopmentDatabaseName(host: string, configuredName?: string): string | null {
  if (configuredName && !/^[a-zA-Z0-9_]+$/.test(configuredName)) {
    throw new Error('Database safety error: DEV_DATABASE_NAME must be a PostgreSQL identifier.');
  }
  if (configuredName) return configuredName;
  return ['localhost', '127.0.0.1', '::1'].includes(host) ? 'laptopmitra_dev_fresh' : null;
}

function normalizeHost(host: string): string {
  return host.toLowerCase().replace(/\.$/, '');
}

function isLoopbackHost(host: string): boolean {
  return ['localhost', '127.0.0.1', '::1'].includes(host);
}

function getPostgresHost(value: string, variable: string): string {
  try {
    const url = new URL(value);
    if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
      throw new Error('Unsupported database protocol');
    }
    return normalizeHost(url.hostname.replace(/^\[|\]$/g, ''));
  } catch {
    throw new Error(`Database safety error: ${variable} is not a valid PostgreSQL URL.`);
  }
}

function maskHost(host: string): string {
  if (isLoopbackHost(host)) return host;
  const [first, ...rest] = host.split('.');
  return rest.length > 0 ? `${first.slice(0, 3)}***.${rest.join('.')}` : `${first.slice(0, 3)}***`;
}

function hostMatchesPattern(host: string, pattern: string): boolean {
  const normalizedPattern = normalizeHost(pattern);
  if (normalizedPattern.startsWith('*.')) {
    const suffix = normalizedPattern.slice(1);
    return host.endsWith(suffix) && host !== suffix.slice(1);
  }
  return host === normalizedPattern;
}

function readProtectedHosts(): string[] {
  if (!existsSync(protectedHostsPath)) {
    throw new Error('Database safety error: .db-protected-hosts is missing.');
  }

  return readFileSync(protectedHostsPath, 'utf8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map(normalizeHost);
}

export function assertSafeDatabaseTarget(
  env: NodeJS.ProcessEnv = process.env,
  protectedHosts: string[] = readProtectedHosts(),
): void {
  const allowedHosts = (env.ALLOWED_DEV_DB_HOST || '')
    .split(',')
    .map((host) => host.trim())
    .filter(Boolean)
    .map(normalizeHost);

  for (const variable of ['DATABASE_URL', 'DIRECT_URL'] as const) {
    const value = env[variable];
    if (!value) {
      if (variable === 'DATABASE_URL') {
        throw new Error('Database safety error: DATABASE_URL is required.');
      }
      continue;
    }

    const host = getPostgresHost(value, variable);

    if (protectedHosts.some((pattern) => hostMatchesPattern(host, pattern))) {
      throw new Error(`Database safety error: ${variable} targets a protected database host (${host}).`);
    }

    if (!isLoopbackHost(host) && !allowedHosts.includes(host)) {
      throw new Error(
        `Database safety error: ${variable} host (${host}) is not local or explicitly listed in ALLOWED_DEV_DB_HOST.`,
      );
    }
  }
}

export function assertRuntimeDatabaseTarget(
  // This guard must inspect raw variables before application config loads.
  // eslint-disable-next-line no-restricted-properties
  env: NodeJS.ProcessEnv = process.env,
  protectedHosts?: string[],
): void {
  const isRenderProduction = env.NODE_ENV === 'production' && env.RENDER === 'true';
  const environmentType = isRenderProduction ? 'render-production' : 'developer-runtime';
  let host = '<invalid>';
  try {
    if (env.DATABASE_URL) host = maskHost(getPostgresHost(env.DATABASE_URL, 'DATABASE_URL'));
  } catch {
    // The full validation below reports the sanitized configuration error.
  }

  try {
    if (isRenderProduction) {
      for (const variable of ['DATABASE_URL', 'DIRECT_URL'] as const) {
        const value = env[variable];
        if (!value) {
          if (variable === 'DATABASE_URL') {
            throw new Error('Database safety error: DATABASE_URL is required.');
          }
          continue;
        }

        if (isLoopbackHost(getPostgresHost(value, variable))) {
          throw new Error(`Database safety error: production ${variable} must not target a loopback host.`);
        }
      }
    } else {
      assertSafeDatabaseTarget(env, protectedHosts ?? readProtectedHosts());
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.info(`[DatabaseSafety] environment=${environmentType} host=${host} decision=refuse`);
    throw error;
  }

  // eslint-disable-next-line no-console
  console.info(`[DatabaseSafety] environment=${environmentType} host=${host} decision=allow`);
}
