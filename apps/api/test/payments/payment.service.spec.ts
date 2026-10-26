jest.mock('@nestjs/config', () => ({
  ConfigService: class ConfigService {
    get(key: string) {
      if (key === 'RAZORPAY_KEY_ID') return 'rzp_test_1234567890';
      if (key === 'RAZORPAY_KEY_SECRET') return 'secret1234567890';
      if (key === 'RAZORPAY_WEBHOOK_SECRET') return 'webhooksecret1234567890';
      if (key === 'NODE_ENV') return 'test';
      return null;
    }
  },
}));

jest.mock('razorpay', () => {
  return jest.fn().mockImplementation(() => ({
    orders: {
      create: jest.fn().mockImplementation(async (opts) => ({
        id: `order_rzp_${Date.now()}`,
        amount: opts.amount,
        currency: opts.currency || 'INR',
        receipt: opts.receipt,
      })),
    },
    payments: {
      fetch: jest.fn().mockImplementation(async (id) => ({
        id,
        order_id: 'order_rzp_100',
        amount: 125000,
        currency: 'INR',
        status: 'captured',
      })),
      refund: jest.fn().mockResolvedValue({ id: 'rfnd_test_1', status: 'processed' }),
    },
  }));
});

import { PaymentService } from '../../src/modules/payments/payment.service';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';

describe('PaymentService (Security & Integrity Tests)', () => {
  let paymentService: PaymentService;
  let prisma: any;
  let notificationService: any;
  let configService: any;

  beforeEach(() => {
    configService = new (jest.requireMock('@nestjs/config').ConfigService)();
    prisma = {
      order: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      payment: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $transaction: jest.fn().mockImplementation(async (callbackOrPromises, _options) => {
        if (typeof callbackOrPromises === 'function') {
          return callbackOrPromises(prisma);
        }
        return Promise.all(callbackOrPromises);
      }),
    };
    notificationService = {
      dispatchPaymentUpdate: jest.fn().mockResolvedValue(undefined),
    };

    paymentService = new PaymentService(
      configService as ConfigService,
      prisma,
      notificationService,
    );
  });

  describe('F3 Reproduction & Order Amount / Ownership Checks', () => {
    it('creates Razorpay order using server-side order.finalAmount and ignores client tampering', async () => {
      const dbOrder = {
        id: 'order-100',
        userId: 'user-legit',
        finalAmount: 79999.50,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentMethod: 'razorpay',
        inventoryStatus: 'RESERVED',
        reservationExpiresAt: new Date(Date.now() + 60_000),
        razorpayOrderId: null,
      };
      prisma.order.findUnique.mockResolvedValue(dbOrder);
      prisma.order.update.mockResolvedValue({ ...dbOrder, razorpayOrderId: 'order_rzp_new' });
      prisma.payment.create.mockResolvedValue({ id: 'pay-1' });

      // Legit user requests order creation for order-100
      const rzpOrder = await paymentService.createOrderForUser(
        'order-100',
        'user-legit',
        'CUSTOMER',
      );

      expect(rzpOrder.amount).toBe(7999950); // Exact 79999.50 * 100 paise
      expect(prisma.payment.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          amount: 7999950,
          currency: 'INR',
        }),
      }));
    });

    it('rejects order payment creation for another user order (IDOR Protection)', async () => {
      const victimOrder = {
        id: 'order-victim-999',
        userId: 'victim-user-id',
        finalAmount: 50000,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentMethod: 'razorpay',
        inventoryStatus: 'RESERVED',
        reservationExpiresAt: new Date(Date.now() + 60_000),
      };
      prisma.order.findUnique.mockResolvedValue(victimOrder);

      // Attacker attempts to create payment for victim's order
      await expect(
        paymentService.createOrderForUser(
          'order-victim-999',
          'attacker-user-id',
          'CUSTOMER',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException for non-existent order', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(
        paymentService.createOrderForUser('non-existent', 'user-1', 'CUSTOMER'),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects payment creation for already paid or cancelled orders', async () => {
      prisma.order.findUnique.mockResolvedValueOnce({
        id: 'order-paid',
        userId: 'user-1',
        finalAmount: 1000,
        paymentStatus: 'COMPLETED',
        status: 'CONFIRMED',
      });

      await expect(
        paymentService.createOrderForUser('order-paid', 'user-1', 'CUSTOMER'),
      ).rejects.toThrow(BadRequestException);

      prisma.order.findUnique.mockResolvedValueOnce({
        id: 'order-cancelled',
        userId: 'user-1',
        finalAmount: 1000,
        paymentStatus: 'PENDING',
        status: 'CANCELLED',
      });

      await expect(
        paymentService.createOrderForUser('order-cancelled', 'user-1', 'CUSTOMER'),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns existing Razorpay order if already created (Idempotency)', async () => {
      const dbOrder = {
        id: 'order-existing',
        userId: 'user-1',
        finalAmount: 45000,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentMethod: 'razorpay',
        inventoryStatus: 'RESERVED',
        reservationExpiresAt: new Date(Date.now() + 60_000),
        razorpayOrderId: 'order_rzp_existing_123',
      };
      prisma.order.findUnique.mockResolvedValue(dbOrder);
      prisma.payment.findFirst.mockResolvedValue({
        id: 'pay-existing',
        razorpayOrderId: 'order_rzp_existing_123',
        status: 'PENDING',
        orderId: 'order-existing',
        amount: 4500000,
        currency: 'INR',
      });

      const res = await paymentService.createOrderForUser('order-existing', 'user-1', 'CUSTOMER');
      expect(res.id).toBe('order_rzp_existing_123');
      expect(res.amount).toBe(4500000);
      expect(prisma.payment.create).not.toHaveBeenCalled();
    });
  });

  describe('Browser payment verification is bound to its persisted order', () => {
    const paymentId = 'pay_test_100';
    const orderId = 'order-100';
    const razorpayOrderId = 'order_rzp_100';
    const secret = 'secret1234567890';
    const signatureFor = (order: string, payment: string) =>
      crypto.createHmac('sha256', secret).update(`${order}|${payment}`).digest('hex');
    const makePendingOrder = (overrides: Record<string, any> = {}) => ({
      id: orderId,
      userId: 'user-1',
      finalAmount: 1250,
      status: 'PENDING',
      paymentStatus: 'PENDING',
      razorpayOrderId,
      paymentMethod: 'razorpay',
      inventoryStatus: 'RESERVED',
      reservationExpiresAt: new Date(Date.now() + 60_000),
      payments: [{
        id: 'payment-record-1',
        orderId,
        razorpayOrderId,
        razorpayPaymentId: null,
        amount: 125000,
        currency: 'INR',
        status: 'PENDING',
      }],
      ...overrides,
    });

    it('completes a captured payment only for the matching persisted order and payment record', async () => {
      prisma.order.findUnique.mockResolvedValue(makePendingOrder());

      const result = await paymentService.verifyPayment(
        orderId,
        razorpayOrderId,
        paymentId,
        signatureFor(razorpayOrderId, paymentId),
        'user-1',
        'CUSTOMER',
      );

      expect(result.success).toBe(true);
      expect((paymentService as any).razorpay.payments.fetch).toHaveBeenCalledWith(paymentId);
      expect(prisma.payment.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          id: 'payment-record-1',
          orderId,
          razorpayOrderId,
          status: 'PENDING',
          razorpayPaymentId: null,
        }),
      }));
      expect(prisma.order.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ id: orderId, razorpayOrderId, status: 'PENDING' }),
        data: expect.objectContaining({ paymentStatus: 'COMPLETED', status: 'CONFIRMED', paymentId }),
      }));
    });

    it('rejects a Razorpay order ID from another LaptopMitra order before checking the provider', async () => {
      prisma.order.findUnique.mockResolvedValue(makePendingOrder());

      await expect(paymentService.verifyPayment(
        orderId,
        'order_rzp_other',
        paymentId,
        signatureFor('order_rzp_other', paymentId),
        'user-1',
        'CUSTOMER',
      )).rejects.toThrow(BadRequestException);
      expect((paymentService as any).razorpay.payments.fetch).not.toHaveBeenCalled();
    });

    it('rejects a payment ID whose provider order association differs', async () => {
      prisma.order.findUnique.mockResolvedValue(makePendingOrder());
      (paymentService as any).razorpay.payments.fetch.mockResolvedValue({
        id: paymentId,
        order_id: 'order_rzp_other',
        amount: 125000,
        currency: 'INR',
        status: 'captured',
      });

      await expect(paymentService.verifyPayment(
        orderId,
        razorpayOrderId,
        paymentId,
        signatureFor(razorpayOrderId, paymentId),
        'user-1',
        'CUSTOMER',
      )).rejects.toThrow(BadRequestException);
      expect(prisma.order.updateMany).not.toHaveBeenCalled();
    });

    it('rejects missing payment records and invalid signatures', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(makePendingOrder({ payments: [] }));
      await expect(paymentService.verifyPayment(
        orderId, razorpayOrderId, paymentId, signatureFor(razorpayOrderId, paymentId), 'user-1', 'CUSTOMER',
      )).rejects.toThrow(BadRequestException);

      prisma.order.findUnique.mockResolvedValueOnce(makePendingOrder());
      await expect(paymentService.verifyPayment(
        orderId, razorpayOrderId, paymentId, 'invalid-signature', 'user-1', 'CUSTOMER',
      )).rejects.toThrow(BadRequestException);
      expect((paymentService as any).razorpay.payments.fetch).not.toHaveBeenCalled();
    });

    it('rejects another user, non-captured payments, amount mismatches, and cancelled orders', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(makePendingOrder({ userId: 'user-2' }));
      await expect(paymentService.verifyPayment(
        orderId, razorpayOrderId, paymentId, signatureFor(razorpayOrderId, paymentId), 'user-1', 'CUSTOMER',
      )).rejects.toThrow(ForbiddenException);

      prisma.order.findUnique.mockResolvedValueOnce(makePendingOrder({ status: 'CANCELLED' }));
      await expect(paymentService.verifyPayment(
        orderId, razorpayOrderId, paymentId, signatureFor(razorpayOrderId, paymentId), 'user-1', 'CUSTOMER',
      )).rejects.toThrow();

      prisma.order.findUnique.mockResolvedValue(makePendingOrder());
      (paymentService as any).razorpay.payments.fetch.mockResolvedValueOnce({
        order_id: razorpayOrderId, amount: 125000, currency: 'INR', status: 'authorized',
      });
      await expect(paymentService.verifyPayment(
        orderId, razorpayOrderId, paymentId, signatureFor(razorpayOrderId, paymentId), 'user-1', 'CUSTOMER',
      )).rejects.toThrow(BadRequestException);

      (paymentService as any).razorpay.payments.fetch.mockResolvedValueOnce({
        order_id: razorpayOrderId, amount: 100, currency: 'INR', status: 'captured',
      });
      await expect(paymentService.verifyPayment(
        orderId, razorpayOrderId, paymentId, signatureFor(razorpayOrderId, paymentId), 'user-1', 'CUSTOMER',
      )).rejects.toThrow(BadRequestException);
      expect(prisma.order.updateMany).not.toHaveBeenCalled();
    });

    it('is idempotent for the same completed payment and rejects a conflicting payment', async () => {
      prisma.order.findUnique.mockResolvedValueOnce(makePendingOrder({
        status: 'CONFIRMED', paymentStatus: 'COMPLETED', paymentId: paymentId,
      }));
      const duplicate = await paymentService.verifyPayment(
        orderId, razorpayOrderId, paymentId, 'already-stored', 'user-1', 'CUSTOMER',
      );
      expect(duplicate.success).toBe(true);

      prisma.order.findUnique.mockResolvedValueOnce(makePendingOrder({
        status: 'CONFIRMED', paymentStatus: 'COMPLETED', paymentId: 'pay_other',
      }));
      await expect(paymentService.verifyPayment(
        orderId, razorpayOrderId, paymentId, signatureFor(razorpayOrderId, paymentId), 'user-1', 'CUSTOMER',
      )).rejects.toThrow();
      expect((paymentService as any).razorpay.payments.fetch).not.toHaveBeenCalled();
    });

    it('does not report success when a conditional database update loses a race or fails', async () => {
      prisma.order.findUnique.mockResolvedValue(makePendingOrder());
      prisma.payment.updateMany.mockResolvedValueOnce({ count: 0 });
      await expect(paymentService.verifyPayment(
        orderId, razorpayOrderId, paymentId, signatureFor(razorpayOrderId, paymentId), 'user-1', 'CUSTOMER',
      )).rejects.toThrow();

      prisma.payment.updateMany.mockResolvedValueOnce({ count: 1 });
      prisma.order.updateMany.mockResolvedValueOnce({ count: 0 });
      await expect(paymentService.verifyPayment(
        orderId, razorpayOrderId, paymentId, signatureFor(razorpayOrderId, paymentId), 'user-1', 'CUSTOMER',
      )).rejects.toThrow();
    });
  });

  describe('Webhook & Signature Verification', () => {
    it('webhook with a raw body signed by a known test secret is accepted', async () => {
      const payload = { event: 'payment.captured', payload: { payment: { entity: { id: 'pay_123' } } } };
      const rawBody = Buffer.from(JSON.stringify(payload), 'utf8');
      const secret = 'webhooksecret1234567890';
      const validSig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

      prisma.payment.findFirst.mockResolvedValue(null);

      const result = await paymentService.handlePaymentWebhook(rawBody, validSig);
      expect(result.valid).toBe(true);
    });

    it('same body with one byte changed is rejected with 400 (BadRequestException)', async () => {
      const payload = { event: 'payment.captured', payload: { payment: { entity: { id: 'pay_123' } } } };
      const rawBody = Buffer.from(JSON.stringify(payload), 'utf8');
      const secret = 'webhooksecret1234567890';
      const validSig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

      const tamperedBody = Buffer.from(rawBody);
      tamperedBody[0] = tamperedBody[0] ^ 1; // Flip 1 byte

      await expect(
        paymentService.handlePaymentWebhook(tamperedBody, validSig),
      ).rejects.toThrow(BadRequestException);
    });

    it('missing signature gives 400 (BadRequestException)', async () => {
      const rawBody = Buffer.from(JSON.stringify({ event: 'payment.captured' }), 'utf8');
      await expect(
        paymentService.handlePaymentWebhook(rawBody, undefined),
      ).rejects.toThrow(BadRequestException);
    });

    it('replaying the same event is a no-op (idempotent)', async () => {
      const payload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: { id: 'pay_already_completed', order_id: 'order_rzp_999' },
          },
        },
      };
      const rawBody = Buffer.from(JSON.stringify(payload), 'utf8');
      const secret = 'webhooksecret1234567890';
      const validSig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

      prisma.payment.findFirst.mockResolvedValue({
        id: 'pay-db-1',
        razorpayPaymentId: 'pay_already_completed',
        status: 'COMPLETED',
        order: { id: 'order-1' },
      });

      const result = await paymentService.handlePaymentWebhook(rawBody, validSig);
      expect(result.valid).toBe(true);
      expect(result.event).toBe('already_processed');
      expect(prisma.order.update).not.toHaveBeenCalled();
      expect(notificationService.dispatchPaymentUpdate).not.toHaveBeenCalled();
    });

    it('rejects webhook with amount mismatch against database order', async () => {
      const secret = 'webhooksecret1234567890';
      const payload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_tampered',
              order_id: 'order_rzp_100',
              amount: 100, // Attacker paid 100 paise (₹1)
              currency: 'INR',
            },
          },
        },
      };
      const rawBody = Buffer.from(JSON.stringify(payload), 'utf8');
      const validSig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

      const dbOrder = {
        id: 'order-100',
        userId: 'user-1',
        finalAmount: 80000, // Expected ₹80,000 (8,000,000 paise)
        paymentStatus: 'PENDING',
        status: 'PENDING',
      };
      prisma.payment.findFirst.mockResolvedValue({
        id: 'pay-db-1',
        amount: 80000,
        currency: 'INR',
        order: dbOrder,
      });
      prisma.order.findFirst.mockResolvedValue(dbOrder);

      const result = await paymentService.handlePaymentWebhook(rawBody, validSig);
      expect(result.valid).toBe(false);
      expect(result.event).toBe('amount_mismatch');
      expect(prisma.order.update).not.toHaveBeenCalled();
      expect(notificationService.dispatchPaymentUpdate).toHaveBeenCalledWith('user-1', 'order-100', 'FAILED');
    });

    it('rejects webhook with currency mismatch against database order', async () => {
      const secret = 'webhooksecret1234567890';
      const payload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_wrong_currency',
              order_id: 'order_rzp_101',
              amount: 8000000,
              currency: 'USD', // USD instead of INR
            },
          },
        },
      };
      const rawBody = Buffer.from(JSON.stringify(payload), 'utf8');
      const validSig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

      const dbOrder = {
        id: 'order-101',
        userId: 'user-2',
        finalAmount: 80000,
        paymentStatus: 'PENDING',
        status: 'PENDING',
      };
      prisma.payment.findFirst.mockResolvedValue({
        id: 'pay-db-2',
        amount: 8000000,
        currency: 'INR',
        order: dbOrder,
      });

      const result = await paymentService.handlePaymentWebhook(rawBody, validSig);
      expect(result.valid).toBe(false);
      expect(result.event).toBe('amount_mismatch');
      expect(prisma.order.update).not.toHaveBeenCalled();
      expect(notificationService.dispatchPaymentUpdate).toHaveBeenCalledWith('user-2', 'order-101', 'FAILED');
    });

    it('is idempotent on duplicate payment.failed webhook event', async () => {
      const secret = 'webhooksecret1234567890';
      const payload = {
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: 'pay_failed_dup',
              order_id: 'order_rzp_dup_fail',
            },
          },
        },
      };
      const rawBody = Buffer.from(JSON.stringify(payload), 'utf8');
      const validSig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

      prisma.payment.findFirst.mockResolvedValue({
        id: 'pay-db-dup',
        razorpayPaymentId: 'pay_failed_dup',
        status: 'FAILED',
        order: { id: 'order-dup', paymentStatus: 'FAILED' },
      });

      const result = await paymentService.handlePaymentWebhook(rawBody, validSig);
      expect(result.valid).toBe(true);
      expect(result.event).toBe('already_processed');
      expect(notificationService.dispatchPaymentUpdate).not.toHaveBeenCalled();
    });

    it('ignores out-of-order payment.failed event if order is already COMPLETED', async () => {
      const secret = 'webhooksecret1234567890';
      const payload = {
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: 'pay_old_fail',
              order_id: 'order_rzp_completed',
            },
          },
        },
      };
      const rawBody = Buffer.from(JSON.stringify(payload), 'utf8');
      const validSig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

      prisma.payment.findFirst.mockResolvedValue({
        id: 'pay-db-completed',
        razorpayPaymentId: 'pay_success_123',
        status: 'COMPLETED',
        order: { id: 'order-c1', paymentStatus: 'COMPLETED', status: 'CONFIRMED' },
      });

      const result = await paymentService.handlePaymentWebhook(rawBody, validSig);
      expect(result.valid).toBe(true);
      expect(result.event).toBe('ignored_order_already_completed');
      expect(notificationService.dispatchPaymentUpdate).not.toHaveBeenCalled();
    });

    it('safely refunds delayed payment for an expired inventory reservation', async () => {
      const secret = 'webhooksecret1234567890';
      const payload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_late',
              order_id: 'order_rzp_expired',
              amount: 500000,
              currency: 'INR',
            },
          },
        },
      };
      const rawBody = Buffer.from(JSON.stringify(payload), 'utf8');
      const validSig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

      const expiredOrder = {
        id: 'order-expired',
        userId: 'user-late',
        finalAmount: 5000,
        paymentStatus: 'PENDING',
        status: 'PENDING',
        inventoryStatus: 'RESERVED',
        razorpayOrderId: 'order_rzp_expired',
        reservationExpiresAt: new Date(Date.now() - 3600000), // Expired 1 hour ago
      };

      prisma.payment.findFirst.mockResolvedValue({
        id: 'pay-late-db',
        amount: 500000,
        currency: 'INR',
        status: 'PENDING',
        order: expiredOrder,
      });

      jest.spyOn(paymentService, 'refundPayment').mockResolvedValue({ status: 'REFUNDED' });

      const result = await paymentService.handlePaymentWebhook(rawBody, validSig);
      expect(result.valid).toBe(true);
      expect(result.event).toBe('late_payment_refund');
      expect(paymentService.refundPayment).toHaveBeenCalledWith('order-expired', 'pay_late');
      expect(prisma.order.update).not.toHaveBeenCalled();
    });

    it('captures valid payment, confirms order, and consumes inventory', async () => {
      const secret = 'webhooksecret1234567890';
      const payload = {
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_legit_100',
              order_id: 'order_rzp_legit',
              amount: 500000,
              currency: 'INR',
            },
          },
        },
      };
      const rawBody = Buffer.from(JSON.stringify(payload), 'utf8');
      const validSig = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

      const legitOrder = {
        id: 'order-legit',
        userId: 'user-legit',
        finalAmount: 5000,
        paymentStatus: 'PENDING',
        status: 'PENDING',
        inventoryStatus: 'RESERVED',
        razorpayOrderId: 'order_rzp_legit',
        reservationExpiresAt: new Date(Date.now() + 600000), // Valid for 10 min
      };

      prisma.payment.findFirst.mockResolvedValue({
        id: 'pay-legit-db',
        amount: 500000,
        currency: 'INR',
        status: 'PENDING',
        order: legitOrder,
      });

      const result = await paymentService.handlePaymentWebhook(rawBody, validSig);
      expect(result.valid).toBe(true);
      expect(result.event).toBe('payment_completed');
      expect(notificationService.dispatchPaymentUpdate).toHaveBeenCalledWith('user-legit', 'order-legit', 'COMPLETED');
    });
  });
});
