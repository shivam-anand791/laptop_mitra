import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isTransientSyncError,
  formatSyncErrorMessage,
  syncWithBackoff,
} from './sync-recovery.ts';

describe('Sync Recovery & Transient Retry Matrix', () => {
  describe('isTransientSyncError', () => {
    it('identifies HTTP 503, 502, 504, 429 as transient', () => {
      assert.equal(isTransientSyncError({ status: 503 }), true);
      assert.equal(isTransientSyncError({ status: 502 }), true);
      assert.equal(isTransientSyncError({ status: 504 }), true);
      assert.equal(isTransientSyncError({ status: 429 }), true);
    });

    it('identifies network failures and connection dropouts as transient', () => {
      assert.equal(isTransientSyncError(new TypeError('Failed to fetch')), true);
      assert.equal(isTransientSyncError(new Error('Network error: connect ECONNREFUSED 127.0.0.1:5432')), true);
      assert.equal(isTransientSyncError(new Error('Authentication service temporarily unavailable')), true);
    });

    it('rejects client 4xx authorization errors as non-transient', () => {
      assert.equal(isTransientSyncError({ status: 400 }), false);
      assert.equal(isTransientSyncError({ status: 401 }), false);
      assert.equal(isTransientSyncError({ status: 403 }), false);
      assert.equal(isTransientSyncError({ status: 404 }), false);
      assert.equal(isTransientSyncError(null), false);
    });
  });

  describe('formatSyncErrorMessage', () => {
    it('formats plain-language message for transient database failures', () => {
      const msg = formatSyncErrorMessage({ status: 503, message: 'Authentication service temporarily unavailable' });
      assert.ok(msg.includes('server database is temporarily unavailable'));
      assert.ok(!msg.includes('Prisma'));
      assert.ok(!msg.includes('localhost:5432'));
    });
  });

  describe('syncWithBackoff', () => {
    it('resolves immediately when action succeeds on first try', async () => {
      let callCount = 0;
      const result = await syncWithBackoff(async () => {
        callCount++;
        return 'success';
      });
      assert.equal(result, 'success');
      assert.equal(callCount, 1);
    });

    it('retries on transient failure and resolves when recovery succeeds', async () => {
      let callCount = 0;
      const retryAttempts: number[] = [];

      const result = await syncWithBackoff(
        async () => {
          callCount++;
          if (callCount === 1) {
            const err: any = new Error('Database temporarily unavailable');
            err.status = 503;
            throw err;
          }
          return 'recovered';
        },
        {
          maxRetries: 2,
          initialDelayMs: 10,
          onRetry: (attempt) => retryAttempts.push(attempt),
        },
      );

      assert.equal(result, 'recovered');
      assert.equal(callCount, 2);
      assert.deepEqual(retryAttempts, [1]);
    });

    it('exhausts retries on persistent transient error and throws', async () => {
      let callCount = 0;
      await assert.rejects(
        async () => {
          await syncWithBackoff(
            async () => {
              callCount++;
              const err: any = new Error('503 Service Unavailable');
              err.status = 503;
              throw err;
            },
            {
              maxRetries: 2,
              initialDelayMs: 10,
            },
          );
        },
        (err: any) => err.status === 503,
      );

      // Initial try (1) + 2 retries = 3 calls
      assert.equal(callCount, 3);
    });

    it('fails immediately without retry when error is non-transient (e.g. 401)', async () => {
      let callCount = 0;
      await assert.rejects(
        async () => {
          await syncWithBackoff(
            async () => {
              callCount++;
              const err: any = new Error('Unauthorized');
              err.status = 401;
              throw err;
            },
            {
              maxRetries: 3,
              initialDelayMs: 10,
            },
          );
        },
        (err: any) => err.status === 401,
      );

      assert.equal(callCount, 1);
    });
  });
});

