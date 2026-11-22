/* eslint-disable no-restricted-properties */
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

export function isCatalogFallbackAllowed(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return process.env.ALLOW_CATALOG_FALLBACK === 'true';
  }
  return process.env.ALLOW_CATALOG_FALLBACK !== 'false';
}

const fallbackUsageCounts: Record<string, number> = {};

export function recordFallbackUsage(source: string): number {
  fallbackUsageCounts[source] = (fallbackUsageCounts[source] || 0) + 1;
  return fallbackUsageCounts[source];
}

export function getFallbackMetrics(): Record<string, number> {
  return { ...fallbackUsageCounts };
}

export function resetFallbackMetrics(): void {
  for (const key of Object.keys(fallbackUsageCounts)) {
    delete fallbackUsageCounts[key];
  }
}

export const FALLBACK_RESPONSE_SYMBOL = Symbol.for('laptopmitra.fallbackResponse');

export function markFallbackResponse<T>(payload: T): T {
  if (payload && (typeof payload === 'object' || typeof payload === 'function')) {
    Object.defineProperty(payload as object, FALLBACK_RESPONSE_SYMBOL, {
      value: true,
      enumerable: false,
      configurable: true,
    });
  }
  return payload;
}

export function isFallbackResponse(payload: unknown): boolean {
  return Boolean(
    payload &&
      (typeof payload === 'object' || typeof payload === 'function') &&
      (payload as Record<symbol, unknown>)[FALLBACK_RESPONSE_SYMBOL] === true,
  );
}
