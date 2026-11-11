import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import type { LaptopMitraApiClient as ApiClientClass } from '../../../packages/api-client/dist/index.js';

const require = createRequire(import.meta.url);
const { LaptopMitraApiClient } = require('../../../packages/api-client/dist/index.js') as {
  LaptopMitraApiClient: typeof ApiClientClass;
};

describe('Razorpay subscription verify endpoint contract', () => {
  it('calls /payments/razorpay/subscription/verify in both web api and @laptopmitra/api-client', async () => {
    const requestedUrls: string[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (url: string | URL | Request) => {
      requestedUrls.push(String(url));
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    try {
      const client = new LaptopMitraApiClient({
        baseUrl: 'https://api.example.com',
        getToken: async () => 'token-123',
      });

      await client.verifyRentalSubscription({
        orderId: 'ord-1',
        razorpaySubscriptionId: 'sub-1',
        razorpayPaymentId: 'pay-1',
        razorpaySignature: 'sig-1',
      });

      assert.equal(requestedUrls[0], 'https://api.example.com/payments/razorpay/subscription/verify');

      const webApiSource = readFileSync(join(process.cwd(), 'lib', 'api.ts'), 'utf8');
      assert.match(webApiSource, /\/payments\/razorpay\/subscription\/verify/);
      assert.doesNotMatch(webApiSource, /\/payments\/razorpay\/verify-subscription/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
