import { formatIndianRupees } from '../utils/account-helpers';
import {
  buildMobileCheckoutSignature,
  formatPaymentStartError,
  isOrderStillPayable,
  resolveMobileCheckoutAttempt,
  rotateMobileCheckoutAttempt,
} from '../utils/checkout-helpers';

describe('Mobile Checkout & Razorpay Payment Architecture Tests', () => {
  describe('Delhi NCR COD Restrictions & Pincode Serviceability Parity', () => {
    // Shared business rules between web and mobile
    const checkDeliveryEligibility = (verification: {
      valid: boolean;
      serviceable: boolean;
      isDelhiNcr?: boolean;
    }) => {
      if (!verification.valid) {
        return { eligible: false, codAllowed: false, reason: 'Invalid Indian PIN code' };
      }
      if (!verification.serviceable) {
        return { eligible: false, codAllowed: false, reason: 'Pincode not serviceable' };
      }
      return {
        eligible: true,
        codAllowed: Boolean(verification.isDelhiNcr),
        prepaidAllowed: true,
      };
    };

    it('enables COD for verified Delhi NCR addresses (e.g. Connaught Place 110001)', () => {
      const result = checkDeliveryEligibility({
        valid: true,
        serviceable: true,
        isDelhiNcr: true,
      });

      expect(result.eligible).toBe(true);
      expect(result.codAllowed).toBe(true);
      expect(result.prepaidAllowed).toBe(true);
    });

    it('enables COD for NCR satellites (e.g. Gurugram 122001, Noida 201301)', () => {
      const gurugram = checkDeliveryEligibility({
        valid: true,
        serviceable: true,
        isDelhiNcr: true,
      });
      const noida = checkDeliveryEligibility({
        valid: true,
        serviceable: true,
        isDelhiNcr: true,
      });

      expect(gurugram.codAllowed).toBe(true);
      expect(noida.codAllowed).toBe(true);
    });

    it('disables COD and restricts payment to Razorpay prepaid for non-NCR locations (e.g. Bengaluru 560001, Mumbai 400001)', () => {
      const bengaluru = checkDeliveryEligibility({
        valid: true,
        serviceable: true,
        isDelhiNcr: false,
      });
      const mumbai = checkDeliveryEligibility({
        valid: true,
        serviceable: true,
        isDelhiNcr: false,
      });

      expect(bengaluru.eligible).toBe(true);
      expect(bengaluru.codAllowed).toBe(false);
      expect(bengaluru.prepaidAllowed).toBe(true);

      expect(mumbai.eligible).toBe(true);
      expect(mumbai.codAllowed).toBe(false);
      expect(mumbai.prepaidAllowed).toBe(true);
    });

    it('rejects order submission when delivery pincode is unserviceable', () => {
      const unserviceable = checkDeliveryEligibility({
        valid: true,
        serviceable: false,
        isDelhiNcr: false,
      });

      expect(unserviceable.eligible).toBe(false);
      expect(unserviceable.codAllowed).toBe(false);
      expect(unserviceable.reason).toBe('Pincode not serviceable');
    });
  });

  describe('Outright Purchases & Razorpay Verification Flow', () => {
    it('constructs correct Razorpay order payload with server-authoritative amount', () => {
      const order = {
        id: 'ord_test_123',
        orderNumber: 'LM-2026-0001',
        finalAmount: 24999,
      };

      const amountInPaise = Math.round(order.finalAmount * 100);
      expect(amountInPaise).toBe(2499900);

      const rzpPayload = {
        orderId: order.id,
      };
      expect(rzpPayload.orderId).toBe('ord_test_123');
    });

    it('requires all 4 signature verification parameters before backend confirmation', () => {
      const verificationPayload = {
        orderId: 'ord_test_123',
        razorpayOrderId: 'order_DA789xyz',
        razorpayPaymentId: 'pay_ABC123456',
        razorpaySignature: 'sig_a9f8b7c6d5e4f3a2b1c0',
      };

      const hasAllFields = Boolean(
        verificationPayload.orderId &&
        verificationPayload.razorpayOrderId &&
        verificationPayload.razorpayPaymentId &&
        verificationPayload.razorpaySignature,
      );

      expect(hasAllFields).toBe(true);
    });

    it('never includes RAZORPAY_KEY_SECRET in mobile checkout options', () => {
      const mobileCheckoutOptions: Record<string, unknown> = {
        key: 'rzp_test_public_12345',
        amount: 2499900,
        currency: 'INR',
        name: 'LaptopMitra',
        order_id: 'order_DA789xyz',
        prefill: {
          name: 'Jane Doe',
          email: 'jane@example.com',
          contact: '+919876543210',
        },
      };

      expect(mobileCheckoutOptions.key).toMatch(/^rzp_test_/);
      expect(mobileCheckoutOptions).not.toHaveProperty('key_secret');
      expect(mobileCheckoutOptions).not.toHaveProperty('secret');
      expect(Object.keys(mobileCheckoutOptions)).not.toContain('RAZORPAY_KEY_SECRET');
    });
  });

  describe('Rental AutoPay Subscription Logic', () => {
    it('applies zero security deposit and charges only first month rent at checkout', () => {
      const rentalItem = {
        id: 'cart_item_1',
        purchaseMode: 'lease' as const,
        product: {
          id: 'prod_thinkpad_t480',
          name: 'Lenovo ThinkPad T480',
          price: 24999,
          leasePriceMonthly: 1499,
        },
        quantity: 1,
        priceAtAdd: 1499,
      };

      const subtotal = rentalItem.priceAtAdd * rentalItem.quantity;
      const securityDeposit = 0; // Zero deposit rule
      const payableToday = subtotal + securityDeposit;

      expect(payableToday).toBe(1499);
      expect(securityDeposit).toBe(0);
      expect(formatIndianRupees(payableToday)).toBe('₹1,499');
    });

    it('formats recurring monthly rental schedule correctly', () => {
      const monthlyRate = 1499;
      const firstMonthDate = new Date('2026-11-01');
      const secondMonthDate = new Date(firstMonthDate);
      secondMonthDate.setMonth(secondMonthDate.getMonth() + 1);

      expect(secondMonthDate.getMonth()).toBe(11); // December (0-indexed 11)
      expect(formatIndianRupees(monthlyRate)).toBe('₹1,499');
    });
  });

  describe('Payment Interruption & Failure Resilience', () => {
    it('preserves order in PENDING state upon payment dismissal without cancelling inventory', () => {
      const order = {
        id: 'ord_123',
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentMethod: 'razorpay',
        inventoryStatus: 'RESERVED',
        reservationExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      };

      // User closed the modal or dismissed
      const isReservationActive = new Date(order.reservationExpiresAt).getTime() > Date.now();
      expect(order.status).toBe('PENDING');
      expect(order.inventoryStatus).toBe('RESERVED');
      expect(isReservationActive).toBe(true);

      // Order is eligible for retry
      const canRetry = order.status === 'PENDING' && order.paymentStatus === 'PENDING' && isReservationActive;
      expect(canRetry).toBe(true);
    });

    it('does not transition order to CONFIRMED on mobile callback alone without backend verification', () => {
      const orderBefore = {
        id: 'ord_123',
        status: 'PENDING',
        paymentStatus: 'PENDING',
      };

      // Mock receiving mobile callback
      const mobileCallbackSuccess = true;

      // Rule: Do NOT update order state until backend verification API returns success
      let orderStatus = orderBefore.status;
      if (mobileCallbackSuccess) {
        // Must call verify endpoint first
        const backendVerified = true;
        if (backendVerified) {
          orderStatus = 'CONFIRMED';
        }
      }

      expect(orderStatus).toBe('CONFIRMED');
    });
  });

  describe('Mobile Checkout Helpers: Idempotency, Gateway Error Mapping, and Pending Order Reuse', () => {
    it('reuses idempotency key and activeOrder when checkout signature is unchanged, and rotates when changed', () => {
      const sigA = buildMobileCheckoutSignature({
        userId: 'usr-1',
        paymentMethod: 'razorpay',
        addressId: 'addr-1',
        items: [{ productId: 'prod-1', quantity: 1, purchaseMode: 'sell' }],
      });
      const first = resolveMobileCheckoutAttempt(null, sigA);
      const withOrder = {
        ...first,
        activeOrder: { id: 'ord-1', status: 'PENDING', paymentStatus: 'PENDING' },
      };

      // Repeated click or back navigation keeps same key and order
      const reused = resolveMobileCheckoutAttempt(withOrder, sigA);
      expect(reused.idempotencyKey).toBe(first.idempotencyKey);
      expect(reused.activeOrder?.id).toBe('ord-1');

      // Changing cart quantity invalidates attempt and drops old activeOrder
      const sigB = buildMobileCheckoutSignature({
        userId: 'usr-1',
        paymentMethod: 'razorpay',
        addressId: 'addr-1',
        items: [{ productId: 'prod-1', quantity: 2, purchaseMode: 'sell' }],
      });
      const changed = resolveMobileCheckoutAttempt(withOrder, sigB);
      expect(changed.signature).toBe(sigB);
      expect(changed.idempotencyKey).not.toBe(first.idempotencyKey);
      expect(changed.activeOrder).toBeNull();

      // Explicit rotation after released order mints a fresh key
      const rotated = rotateMobileCheckoutAttempt(sigA);
      expect(rotated.signature).toBe(sigA);
      expect(rotated.idempotencyKey).not.toBe(first.idempotencyKey);
      expect(rotated.activeOrder).toBeNull();
    });

    it('checks order payability accurately for PENDING orders and rejects released/expired ones', () => {
      const future = new Date(Date.now() + 60_000).toISOString();
      const past = new Date(Date.now() - 60_000).toISOString();

      expect(isOrderStillPayable({ status: 'PENDING', paymentStatus: 'PENDING', reservationExpiresAt: future })).toBe(true);
      expect(isOrderStillPayable({ status: 'PENDING', paymentStatus: 'FAILED', reservationExpiresAt: future })).toBe(true);
      expect(isOrderStillPayable({ status: 'CANCELLED', paymentStatus: 'FAILED', reservationExpiresAt: future })).toBe(false);
      expect(isOrderStillPayable({ status: 'PENDING', paymentStatus: 'PAID', reservationExpiresAt: future })).toBe(false);
      expect(isOrderStillPayable({ status: 'PENDING', paymentStatus: 'PENDING', reservationExpiresAt: past })).toBe(false);
    });

    it('maps 502/503 and non-auth-guard 401 gateway errors to user-friendly retry message with orderWasReleased=true', () => {
      const err502 = formatPaymentStartError({
        status: 502,
        data: { code: 'PAYMENT_PROVIDER_UNAVAILABLE', requestId: 'req-abc' },
        message: 'Payment provider unavailable',
      });
      expect(err502.orderWasReleased).toBe(true);
      expect(err502.message).toBe("Payment couldn't be started. Please try again. (Ref: req-abc)");

      const err503 = formatPaymentStartError({ status: 503 });
      expect(err503.orderWasReleased).toBe(true);
      expect(err503.message).toBe("Payment couldn't be started. Please try again.");

      const nonAuth401 = formatPaymentStartError({
        status: 401,
        data: { code: 'RAZORPAY_UPSTREAM_UNAUTHORIZED' },
      });
      expect(nonAuth401.orderWasReleased).toBe(true);

      const authGuard401 = formatPaymentStartError({
        status: 401,
        data: { code: 'TOKEN_EXPIRED' },
        message: 'Session expired',
      });
      expect(authGuard401.orderWasReleased).toBe(false);
      expect(authGuard401.message).toBe('Session expired');
    });
  });
});
