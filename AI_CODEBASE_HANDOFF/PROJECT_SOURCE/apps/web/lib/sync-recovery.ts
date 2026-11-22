/**
 * Transient error detection and exponential backoff retry helper
 * for Firebase identity synchronization (/auth/sync).
 */

export interface SyncErrorState {
  message: string;
  isTransient: boolean;
  failedAt: number;
}

/**
 * Determines whether a sync error is transient (e.g. PostgreSQL offline,
 * gateway error, network disconnect) and safe to retry automatically.
 */
export function isTransientSyncError(err: unknown): boolean {
  if (!err) return false;

  const status = (err as any)?.status;
  if (status === 503 || status === 502 || status === 504 || status === 429) {
    return true;
  }

  const message = String((err as any)?.message || err).toLowerCase();
  if (
    message.includes('fetch failed') ||
    message.includes('failed to fetch') ||
    message.includes('network') ||
    message.includes('econnrefused') ||
    message.includes('database error') ||
    message.includes('temporarily unavailable')
  ) {
    return true;
  }

  return false;
}

/**
 * Formats a plain-language user explanation for sync failures
 * without leaking internal database connection strings or stack traces.
 */
export function formatSyncErrorMessage(err: unknown): string {
  if (isTransientSyncError(err)) {
    return 'Your account is signed in, but we couldn’t finish setting up your session because the server database is temporarily unavailable.';
  }
  return 'Your account is signed in, but completing your account setup failed. Click Retry to complete setup.';
}

/**
 * Retries an asynchronous sync operation with exponential backoff
 * for transient errors only. Non-transient errors (400, 401, 403) fail immediately.
 */
export async function syncWithBackoff<T>(
  action: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    onRetry?: (attempt: number, error: unknown) => void;
  } = {},
): Promise<T> {
  const maxRetries = options.maxRetries ?? 2; // total 3 attempts (initial + 2 retries)
  const initialDelayMs = options.initialDelayMs ?? 400;

  let attempt = 0;
  while (true) {
    try {
      return await action();
    } catch (err: unknown) {
      attempt++;
      if (attempt > maxRetries || !isTransientSyncError(err)) {
        throw err;
      }
      if (options.onRetry) {
        options.onRetry(attempt, err);
      }
      const delay = initialDelayMs * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

