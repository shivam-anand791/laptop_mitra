/**
 * Determines whether in-memory fallback is permitted during database/service failures.
 *
 * In production (NODE_ENV === 'production'), in-memory fallbacks are NEVER allowed.
 * In development/test, fallback is strictly opt-in and requires ALLOW_IN_MEMORY_FALLBACK === 'true'.
 * The default is false everywhere.
 */
export function allowInMemoryFallback(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  return process.env.ALLOW_IN_MEMORY_FALLBACK === 'true';
}
