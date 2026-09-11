import { type Env } from './schema.js';
export { envSchema, type Env } from './schema.js';
export declare function isSecretKey(key: string): boolean;
/**
 * Masks a secret for safe display: keeps a short prefix so a value can be
 * identified, never enough to reconstruct it.
 */
export declare function maskSecret(value: string | undefined): string;
/**
 * Returns a redacted copy of the config, safe to log at startup.
 */
export declare function redactEnv(env: Env): Record<string, unknown>;
/**
 * Loads, validates, and caches configuration.
 *
 * Fails fast: an invalid or incomplete environment throws before the app can
 * serve a request. Validation messages deliberately name only the offending
 * KEY and never echo the value, so a bad secret is not leaked into logs.
 */
export declare function loadEnv(options?: {
    reload?: boolean;
}): Env;
/** Test-only: clears the memoised config. */
export declare function resetEnvCache(): void;
//# sourceMappingURL=index.d.ts.map