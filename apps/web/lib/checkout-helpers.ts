export const AUTH_GUARD_ERROR_CODES = new Set([
  'TOKEN_EXPIRED',
  'TOKEN_INVALID',
  'TOKEN_WRONG_PROJECT',
]);

export function isAuthGuard401(
  status: number,
  errorData?: { code?: unknown; [key: string]: unknown } | null,
): boolean {
  return (
    status === 401 &&
    typeof errorData?.code === 'string' &&
    AUTH_GUARD_ERROR_CODES.has(errorData.code)
  );
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface CheckoutAttemptRecord {
  signature: string;
  idempotencyKey: string;
  pendingOrderId: string | null;
  pendingIsRental: boolean;
}

export const CHECKOUT_ATTEMPT_STORAGE_KEY = 'laptopmitra.checkout.attempt.v1';

export function generateIdempotencyKey(prefix = 'lm-web'): string {
  const rand =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${rand}`;
}

export function buildCheckoutSignature(input: {
  userId?: string | null;
  paymentMethod: string;
  discountCode?: string | null;
  referralCode?: string | null;
  addressId?: string | null;
  pincode?: string | null;
  address?: string | null;
  items: Array<{
    productId: string;
    variantId?: string | null;
    quantity: number;
    purchaseMode?: string | null;
    configuration?: string | null;
    hasWarranty?: boolean;
    tenureMonths?: number | null;
  }>;
}): string {
  const normalizedItems = [...input.items]
    .map((it) => ({
      p: it.productId,
      v: it.variantId || '',
      q: Number(it.quantity) || 1,
      m: it.purchaseMode || 'sell',
      c: it.configuration || 'default',
      w: Boolean(it.hasWarranty),
      t: it.tenureMonths || 0,
    }))
    .sort((a, b) => `${a.p}:${a.v}:${a.m}:${a.c}`.localeCompare(`${b.p}:${b.v}:${b.m}:${b.c}`));

  return JSON.stringify({
    u: input.userId || '',
    pm: input.paymentMethod,
    dc: (input.discountCode || '').trim().toUpperCase(),
    rc: (input.referralCode || '').trim().toUpperCase(),
    addr: input.addressId || `${(input.pincode || '').trim()}:${(input.address || '').trim()}`,
    items: normalizedItems,
  });
}

function readStoredAttempt(storage?: StorageLike | null): CheckoutAttemptRecord | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(CHECKOUT_ATTEMPT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CheckoutAttemptRecord>;
    if (typeof parsed.signature !== 'string' || typeof parsed.idempotencyKey !== 'string') {
      return null;
    }
    return {
      signature: parsed.signature,
      idempotencyKey: parsed.idempotencyKey,
      pendingOrderId: typeof parsed.pendingOrderId === 'string' ? parsed.pendingOrderId : null,
      pendingIsRental: Boolean(parsed.pendingIsRental),
    };
  } catch {
    return null;
  }
}

function writeStoredAttempt(storage: StorageLike | null | undefined, record: CheckoutAttemptRecord): void {
  if (!storage) return;
  try {
    storage.setItem(CHECKOUT_ATTEMPT_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // Ignore storage quota / private mode failures gracefully.
  }
}

export function getOrCreateCheckoutAttempt(
  storage: StorageLike | null | undefined,
  signature: string,
  prefix = 'lm-web',
): CheckoutAttemptRecord {
  const existing = readStoredAttempt(storage);
  if (existing && existing.signature === signature && existing.idempotencyKey) {
    return existing;
  }
  const fresh: CheckoutAttemptRecord = {
    signature,
    idempotencyKey: generateIdempotencyKey(prefix),
    pendingOrderId: null,
    pendingIsRental: false,
  };
  writeStoredAttempt(storage, fresh);
  return fresh;
}

export function savePendingOrderAttempt(
  storage: StorageLike | null | undefined,
  signature: string,
  pendingOrderId: string,
  pendingIsRental: boolean,
  prefix = 'lm-web',
): CheckoutAttemptRecord {
  const current = getOrCreateCheckoutAttempt(storage, signature, prefix);
  const updated: CheckoutAttemptRecord = {
    ...current,
    pendingOrderId,
    pendingIsRental,
  };
  writeStoredAttempt(storage, updated);
  return updated;
}

export function rotateCheckoutAttemptKey(
  storage: StorageLike | null | undefined,
  signature: string,
  prefix = 'lm-web',
): CheckoutAttemptRecord {
  const rotated: CheckoutAttemptRecord = {
    signature,
    idempotencyKey: generateIdempotencyKey(prefix),
    pendingOrderId: null,
    pendingIsRental: false,
  };
  writeStoredAttempt(storage, rotated);
  return rotated;
}

export function clearCheckoutAttempt(storage?: StorageLike | null): void {
  if (!storage) return;
  try {
    storage.removeItem(CHECKOUT_ATTEMPT_STORAGE_KEY);
  } catch {
    // Ignore storage errors cleanly.
  }
}

export function isOrderStillPayable(
  order?: {
    status?: string | null;
    paymentStatus?: string | null;
    reservationExpiresAt?: string | Date | null;
  } | null,
  nowMs = Date.now(),
): boolean {
  if (!order) return false;
  if (order.status !== 'PENDING') return false;
  if (!['PENDING', 'FAILED'].includes(String(order.paymentStatus || ''))) return false;
  if (order.reservationExpiresAt) {
    const expiresMs = new Date(order.reservationExpiresAt).getTime();
    if (!Number.isFinite(expiresMs) || expiresMs <= nowMs) return false;
  }
  return true;
}

export function formatPaymentStartError(err: any): {
  message: string;
  orderWasReleased: boolean;
} {
  const status = Number(err?.status || err?.data?.statusCode || 0);
  const code = typeof err?.data?.code === 'string' ? err.data.code : typeof err?.code === 'string' ? err.code : '';
  const requestId = typeof err?.data?.requestId === 'string' ? err.data.requestId : '';
  const refSuffix = requestId ? ` (Ref: ${requestId})` : '';

  const isGatewayFailure =
    status === 502 ||
    status === 503 ||
    status === 0 ||
    code === 'PAYMENT_PROVIDER_UNAVAILABLE' ||
    (status === 401 && !AUTH_GUARD_ERROR_CODES.has(code));

  if (isGatewayFailure) {
    return {
      message: `Payment couldn't be started. Please try again.${refSuffix}`,
      orderWasReleased: true,
    };
  }

  return {
    message: err?.message
      ? `${err.message}${refSuffix}`
      : `Payment couldn't be started. Please try again.${refSuffix}`,
    orderWasReleased: false,
  };
}

export const PAYMENT_CONFIRMING_MESSAGE =
  "We're confirming your payment. Please wait while we check the status with Razorpay.";
