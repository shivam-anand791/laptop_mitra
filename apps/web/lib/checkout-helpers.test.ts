import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildCheckoutSignature,
  clearCheckoutAttempt,
  formatPaymentStartError,
  getOrCreateCheckoutAttempt,
  isAuthGuard401,
  isOrderStillPayable,
  PAYMENT_CONFIRMING_MESSAGE,
  rotateCheckoutAttemptKey,
  savePendingOrderAttempt,
  type StorageLike,
} from './checkout-helpers.ts';

function createMemoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}

describe('checkout-helpers (auth 401 classification, idempotency reuse & gateway recovery)', () => {
  it('treats only FirebaseAuthGuard 401 codes as session expiry', () => {
    assert.equal(isAuthGuard401(401, { code: 'TOKEN_EXPIRED' }), true);
    assert.equal(isAuthGuard401(401, { code: 'TOKEN_INVALID' }), true);
    assert.equal(isAuthGuard401(401, { code: 'TOKEN_WRONG_PROJECT' }), true);
    assert.equal(isAuthGuard401(401, { message: 'Payment gateway authentication failed' }), false);
    assert.equal(isAuthGuard401(502, { code: 'PAYMENT_PROVIDER_UNAVAILABLE' }), false);
    assert.equal(isAuthGuard401(502, { code: 'TOKEN_EXPIRED' }), false);
  });

  it('persists idempotencyKey and pendingOrderId per cart checkout signature across refreshes', () => {
    const storage = createMemoryStorage();
    const sigA = buildCheckoutSignature({
      userId: 'user-1',
      paymentMethod: 'razorpay',
      addressId: 'addr-1',
      items: [{ productId: 'prod-1', variantId: 'var-1', quantity: 2, purchaseMode: 'sell' }],
    });

    const first = getOrCreateCheckoutAttempt(storage, sigA);
    const second = getOrCreateCheckoutAttempt(storage, sigA);
    assert.equal(second.idempotencyKey, first.idempotencyKey);

    const withOrder = savePendingOrderAttempt(storage, sigA, 'ord-123', false);
    assert.equal(withOrder.pendingOrderId, 'ord-123');
    assert.equal(getOrCreateCheckoutAttempt(storage, sigA).pendingOrderId, 'ord-123');

    // Cart changes -> new signature & new idempotencyKey
    const sigB = buildCheckoutSignature({
      userId: 'user-1',
      paymentMethod: 'razorpay',
      addressId: 'addr-1',
      items: [{ productId: 'prod-1', variantId: 'var-1', quantity: 3, purchaseMode: 'sell' }],
    });
    const nextAttempt = getOrCreateCheckoutAttempt(storage, sigB);
    assert.notEqual(nextAttempt.idempotencyKey, first.idempotencyKey);
    assert.equal(nextAttempt.pendingOrderId, null);

    // Rotation generates fresh key without prior pendingOrderId
    const rotated = rotateCheckoutAttemptKey(storage, sigB);
    assert.notEqual(rotated.idempotencyKey, nextAttempt.idempotencyKey);
    assert.equal(rotated.pendingOrderId, null);

    clearCheckoutAttempt(storage);
    assert.equal(getOrCreateCheckoutAttempt(storage, sigB).pendingOrderId, null);
  });

  it('checks order payability accurately against status and reservation TTL', () => {
    const future = new Date(Date.now() + 60_000).toISOString();
    const past = new Date(Date.now() - 10_000).toISOString();

    assert.equal(isOrderStillPayable({ status: 'PENDING', paymentStatus: 'PENDING', reservationExpiresAt: future }), true);
    assert.equal(isOrderStillPayable({ status: 'PENDING', paymentStatus: 'FAILED', reservationExpiresAt: future }), true);
    assert.equal(isOrderStillPayable({ status: 'CANCELLED', paymentStatus: 'FAILED', reservationExpiresAt: future }), false);
    assert.equal(isOrderStillPayable({ status: 'PENDING', paymentStatus: 'PENDING', reservationExpiresAt: past }), false);
    assert.equal(isOrderStillPayable({ status: 'CONFIRMED', paymentStatus: 'COMPLETED' }), false);
  });

  it('formats 502/503 gateway errors safely for retry without logging out', () => {
    const gatewayErr = formatPaymentStartError({
      status: 502,
      message: 'Payment provider unavailable',
      data: { code: 'PAYMENT_PROVIDER_UNAVAILABLE', requestId: 'req-42' },
    });
    assert.equal(gatewayErr.orderWasReleased, true);
    assert.match(gatewayErr.message, /Payment couldn't be started\. Please try again\./);
    assert.match(gatewayErr.message, /req-42/);
    assert.match(PAYMENT_CONFIRMING_MESSAGE, /We're confirming your payment/);
  });
});

