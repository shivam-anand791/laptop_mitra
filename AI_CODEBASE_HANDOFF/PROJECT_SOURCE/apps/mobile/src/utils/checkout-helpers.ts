import { isAuthGuard401 } from '@laptopmitra/api-client';

export interface PayableOrderSnapshot {
  id: string;
  orderNumber?: string | undefined;
  status?: string | null | undefined;
  paymentStatus?: string | null | undefined;
  reservationExpiresAt?: string | Date | null | undefined;
}

export interface MobileCheckoutAttempt {
  signature: string;
  idempotencyKey: string;
  activeOrder: PayableOrderSnapshot | null;
}

export const PAYMENT_CONFIRMING_MESSAGE =
  "We're confirming your payment. Please wait while we check the status with Razorpay.";

export function generateMobileIdempotencyKey(prefix = 'lm-mob'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function buildMobileCheckoutSignature(input: {
  userId?: string | null | undefined;
  paymentMethod: string;
  discountCode?: string | null | undefined;
  referralCode?: string | null | undefined;
  addressId?: string | null | undefined;
  items: Array<{
    productId: string;
    variantId?: string | null | undefined;
    quantity?: number | null | undefined;
    purchaseMode?: string | null | undefined;
    configuration?: string | null | undefined;
    hasWarranty?: boolean | undefined;
    tenureMonths?: number | null | undefined;
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
    addr: input.addressId || '',
    items: normalizedItems,
  });
}

export function resolveMobileCheckoutAttempt(
  current: MobileCheckoutAttempt | null,
  signature: string,
): MobileCheckoutAttempt {
  if (current && current.signature === signature && current.idempotencyKey) {
    return current;
  }
  return {
    signature,
    idempotencyKey: generateMobileIdempotencyKey(),
    activeOrder: null,
  };
}

export function rotateMobileCheckoutAttempt(signature: string): MobileCheckoutAttempt {
  return {
    signature,
    idempotencyKey: generateMobileIdempotencyKey(),
    activeOrder: null,
  };
}

export function isOrderStillPayable(
  order?: {
    status?: string | null | undefined;
    paymentStatus?: string | null | undefined;
    reservationExpiresAt?: string | Date | null | undefined;
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
    (status === 401 && !isAuthGuard401(status, err?.data));

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
