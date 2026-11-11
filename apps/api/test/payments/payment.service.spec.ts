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
    plans: {
      create: jest.fn().mockResolvedValue({ id: 'plan_test_1' }),
    },
    subscriptions: {
      create: jest.fn().mockResolvedValue({ id: 'sub_test_1', status: 'created' }),
      fetch: jest.fn(),
      cancel: jest.fn(),
    },
  }));
});

import { PaymentService } from '../../src/modules/payments/payment.service';
import { PaymentController } from '../../src/modules/payments/payment.controller';
import { ConfigService } from '@nestjs/config';
import {
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { createNoTaxService } from '../helpers/no-tax-service';

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
      rentalSubscription: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      rentalPayment: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
        update: jest.fn().mockResolvedValue({}),
      },
      orderItem: {
        findFirst: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      orderItemCancellation: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({}),
      },
      cartItem: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
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
      createNoTaxService(),
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

    describe('Rental subscription initialization', () => {
      it('creates a provider subscription only after claiming the local rental record', async () => {
        const reservationExpiresAt = new Date(Date.now() + 60_000);
        prisma.order.findUnique.mockResolvedValue({
          id: 'rental-order-1',
          orderNumber: 'LM-RENT-1',
          userId: 'user-1',
          status: 'PENDING',
          paymentStatus: 'PENDING',
          paymentMethod: 'razorpay_subscription',
          inventoryStatus: 'RESERVED',
          reservationExpiresAt,
          items: [{ purchaseMode: 'lease' }],
          rentalSubscription: {
            id: 'rental-1',
            userId: 'user-1',
            status: 'PENDING_AUTHORIZATION',
            razorpaySubscriptionId: null,
            razorpayPlanId: null,
            monthlyAmount: 2500,
            tenureMonths: 6,
          },
        });

        const razorpay = (paymentService as any).razorpay;
        const result = await paymentService.createRentalSubscriptionForUser(
          'rental-order-1',
          'user-1',
          'CUSTOMER',
        );

        expect(prisma.rentalSubscription.updateMany).toHaveBeenCalledWith(expect.objectContaining({
          where: { id: 'rental-1', status: 'PENDING_AUTHORIZATION', razorpaySubscriptionId: null },
          data: { status: 'CREATING' },
        }));
        expect(razorpay.plans.create).toHaveBeenCalledWith(expect.objectContaining({
          period: 'monthly',
          item: expect.objectContaining({ amount: 250000, currency: 'INR' }),
        }));
        expect(razorpay.subscriptions.create).toHaveBeenCalledWith(expect.objectContaining({
          plan_id: 'plan_test_1',
          total_count: 6,
          notes: { orderId: 'rental-order-1', rentalSubscriptionId: 'rental-1' },
        }));
        expect(result).toMatchObject({
          subscriptionId: 'sub_test_1',
          amount: 250000,
          currency: 'INR',
        });
      });

      it('does not create another provider subscription when a stored subscription already exists', async () => {
        prisma.order.findUnique.mockResolvedValue({
          id: 'rental-order-1',
          orderNumber: 'LM-RENT-1',
          userId: 'user-1',
          status: 'PENDING',
          paymentStatus: 'PENDING',
          paymentMethod: 'razorpay_subscription',
          inventoryStatus: 'RESERVED',
          reservationExpiresAt: new Date(Date.now() + 60_000),
          items: [{ purchaseMode: 'lease' }],
          rentalSubscription: {
            id: 'rental-1',
            userId: 'user-1',
            status: 'PENDING_AUTHORIZATION',
            razorpaySubscriptionId: 'sub_existing',
            razorpayPlanId: 'plan_existing',
            monthlyAmount: 2500,
            tenureMonths: 6,
          },
        });

        const razorpay = (paymentService as any).razorpay;
        const result = await paymentService.createRentalSubscriptionForUser(
          'rental-order-1',
          'user-1',
          'CUSTOMER',
        );

        expect(result.subscriptionId).toBe('sub_existing');
        expect(razorpay.plans.create).not.toHaveBeenCalled();
        expect(razorpay.subscriptions.create).not.toHaveBeenCalled();
        expect(prisma.rentalSubscription.updateMany).not.toHaveBeenCalled();
      });
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
      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cart: { userId: 'user-legit' } },
      });
      expect(notificationService.dispatchPaymentUpdate).toHaveBeenCalledWith('user-legit', 'order-legit', 'COMPLETED');
    });
  });

  describe('Phase 1 P0 blockers: Login enforcement, Rental flow, Cart clear & FAILED retry', () => {
    const secret = 'secret1234567890';
    const orderId = 'order-p1';
    const razorpayOrderId = 'order_rzp_100';
    const paymentId = 'pay_p1_success';
    const sigOrder = (rzpOrd: string, pId: string) =>
      crypto.createHmac('sha256', secret).update(`${rzpOrd}|${pId}`).digest('hex');
    const sigSub = (pId: string, subId: string) =>
      crypto.createHmac('sha256', secret).update(`${pId}|${subId}`).digest('hex');

    it('rejects GUEST role across PaymentController payment creation and verification endpoints', async () => {
      const controller = new PaymentController(paymentService);
      const guest = { id: 'guest-1', role: 'GUEST', isGuest: true };

      for (const method of ['createRazorpayOrder', 'createRentalSubscription', 'verifyRentalSubscription', 'verifyPayment'] as const) {
        expect(Reflect.getMetadata('roles', (PaymentController.prototype as any)[method])).toEqual(['CUSTOMER', 'ADMIN']);
      }

      await expect(controller.createRazorpayOrder(guest, { orderId: 'ord-1' })).rejects.toThrow(ForbiddenException);
      await expect(controller.createRentalSubscription(guest, { orderId: 'ord-1' })).rejects.toThrow(ForbiddenException);
      await expect(
        controller.verifyPayment(guest, {
          orderId: 'ord-1',
          razorpayOrderId: 'order_1',
          razorpayPaymentId: 'pay_1',
          razorpaySignature: 'sig_1',
        }),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        controller.verifyRentalSubscription(guest, {
          orderId: 'ord-1',
          razorpaySubscriptionId: 'sub_1',
          razorpayPaymentId: 'pay_1',
          razorpaySignature: 'sig_1',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('clears user cart inside verifyPayment transaction', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: orderId,
        userId: 'user-cart-1',
        finalAmount: 1250,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        razorpayOrderId,
        paymentMethod: 'razorpay',
        inventoryStatus: 'RESERVED',
        reservationExpiresAt: new Date(Date.now() + 60_000),
        payments: [{
          id: 'pay-rec-1',
          orderId,
          razorpayOrderId,
          razorpayPaymentId: null,
          amount: 125000,
          currency: 'INR',
          status: 'PENDING',
        }],
      });

      const res = await paymentService.verifyPayment(
        orderId,
        razorpayOrderId,
        paymentId,
        sigOrder(razorpayOrderId, paymentId),
        'user-cart-1',
        'CUSTOMER',
      );
      expect(res.success).toBe(true);
      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cart: { userId: 'user-cart-1' } },
      });
    });

    it('allows verifyPayment retry inside same modal when prior attempt set paymentStatus=FAILED', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: orderId,
        userId: 'user-retry-1',
        finalAmount: 1250,
        status: 'PENDING',
        paymentStatus: 'FAILED',
        razorpayOrderId,
        paymentId: 'pay_failed_first',
        paymentMethod: 'razorpay',
        inventoryStatus: 'RESERVED',
        reservationExpiresAt: new Date(Date.now() + 60_000),
        payments: [{
          id: 'pay-rec-failed',
          orderId,
          razorpayOrderId,
          razorpayPaymentId: 'pay_failed_first',
          amount: 125000,
          currency: 'INR',
          status: 'FAILED',
        }],
      });

      const res = await paymentService.verifyPayment(
        orderId,
        razorpayOrderId,
        paymentId,
        sigOrder(razorpayOrderId, paymentId),
        'user-retry-1',
        'CUSTOMER',
      );
      expect(res.success).toBe(true);
      expect(prisma.payment.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          id: 'pay-rec-failed',
          status: 'FAILED',
        }),
        data: expect.objectContaining({
          status: 'COMPLETED',
          razorpayPaymentId: paymentId,
        }),
      }));
      expect(prisma.order.updateMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          id: orderId,
          paymentStatus: { in: ['PENDING', 'FAILED'] },
        }),
        data: expect.objectContaining({
          status: 'CONFIRMED',
          paymentStatus: 'COMPLETED',
        }),
      }));
      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cart: { userId: 'user-retry-1' } },
      });
    });

    it('verifies rental subscription using Razorpay paymentId|subscriptionId HMAC and clears cart', async () => {
      const subId = 'sub_live_check_1';
      const rentalOrder = {
        id: 'rental-order-verify',
        userId: 'user-rent-1',
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentMethod: 'razorpay_subscription',
        inventoryStatus: 'RESERVED',
        reservationExpiresAt: new Date(Date.now() + 120_000),
      };
      prisma.rentalSubscription.findUnique.mockResolvedValue({
        id: 'rental-rec-1',
        orderId: rentalOrder.id,
        userId: 'user-rent-1',
        razorpaySubscriptionId: subId,
        monthlyAmount: 2500,
        taxRate: 0,
        taxAmount: 0,
        taxInclusive: false,
        status: 'PENDING_AUTHORIZATION',
        firstPaymentId: null,
        payments: [],
        order: rentalOrder,
      });
      const rzp = (paymentService as any).razorpay;
      rzp.subscriptions.fetch.mockResolvedValue({
        id: subId,
        status: 'authenticated',
        charge_at: Math.floor(Date.now() / 1000) + 86400,
      });
      rzp.payments.fetch.mockResolvedValue({
        id: 'pay_rent_1',
        subscription_id: subId,
        amount: 250000,
        currency: 'INR',
        status: 'captured',
      });

      // Swapped subscriptionId|paymentId must be rejected
      await expect(
        paymentService.verifyRentalSubscription(
          rentalOrder.id,
          subId,
          'pay_rent_1',
          sigOrder(subId, 'pay_rent_1'),
          'user-rent-1',
          'CUSTOMER',
        ),
      ).rejects.toThrow(BadRequestException);

      // Official paymentId|subscriptionId signature succeeds and clears cart
      const result = await paymentService.verifyRentalSubscription(
        rentalOrder.id,
        subId,
        'pay_rent_1',
        sigSub('pay_rent_1', subId),
        'user-rent-1',
        'CUSTOMER',
      );
      expect(result.success).toBe(true);
      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cart: { userId: 'user-rent-1' } },
      });
    });

    it('resets rentalSubscription status from CREATING back to PENDING_AUTHORIZATION if Razorpay API fails', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'rental-order-fail',
        orderNumber: 'LM-RENT-FAIL',
        userId: 'user-rent-2',
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentMethod: 'razorpay_subscription',
        inventoryStatus: 'RESERVED',
        reservationExpiresAt: new Date(Date.now() + 60_000),
        items: [{ purchaseMode: 'lease' }],
        rentalSubscription: {
          id: 'rental-fail-1',
          userId: 'user-rent-2',
          status: 'PENDING_AUTHORIZATION',
          razorpaySubscriptionId: null,
          razorpayPlanId: null,
          monthlyAmount: 2500,
          tenureMonths: 6,
        },
      });
      (paymentService as any).razorpay.plans.create.mockRejectedValueOnce(new Error('Razorpay timeout'));

      await expect(
        paymentService.createRentalSubscriptionForUser('rental-order-fail', 'user-rent-2', 'CUSTOMER'),
      ).rejects.toThrow('Razorpay timeout');

      expect(prisma.rentalSubscription.updateMany).toHaveBeenLastCalledWith({
        where: { id: 'rental-fail-1', status: 'CREATING', razorpaySubscriptionId: null },
        data: { status: 'PENDING_AUTHORIZATION' },
      });
    });
  });

  describe('Phase 2: Webhooks (order.paid + SkipThrottle), Partial Refunds & Double-Refund Guards', () => {
    const signWebhook = (rawBody: string) =>
      crypto.createHmac('sha256', 'webhooksecret1234567890').update(rawBody).digest('hex');

    it('marks Razorpay webhook handler with @SkipThrottle()', () => {
      const skipMeta = Reflect.getMetadata(
        'THROTTLER:SKIPdefault',
        PaymentController.prototype.handleRazorpayWebhook,
      );
      expect(skipMeta).toBe(true);
    });

    it('handles order.paid webhook idempotently, clears cart, and shares capture confirmation with payment.captured', async () => {
      const orderPaidPayload = JSON.stringify({
        event: 'order.paid',
        payload: {
          order: {
            entity: {
              id: 'order_rzp_paid_1',
              amount: 50000,
              amount_paid: 50000,
              currency: 'INR',
            },
          },
          payment: {
            entity: {
              id: 'pay_order_paid_1',
              order_id: 'order_rzp_paid_1',
              amount: 50000,
              currency: 'INR',
              status: 'captured',
            },
          },
        },
      });

      const orderRecord = {
        id: 'order-paid-1',
        orderNumber: 'LM-500',
        userId: 'cust-1',
        finalAmount: 500,
        razorpayOrderId: 'order_rzp_paid_1',
        status: 'PENDING',
        paymentStatus: 'PENDING',
        inventoryStatus: 'RESERVED',
        reservationExpiresAt: new Date(Date.now() + 60_000),
      };

      prisma.payment.findFirst.mockResolvedValueOnce({
        id: 'pay-rec-1',
        orderId: 'order-paid-1',
        razorpayOrderId: 'order_rzp_paid_1',
        razorpayPaymentId: null,
        amount: 50000,
        currency: 'INR',
        status: 'PENDING',
        order: orderRecord,
      });

      const first = await paymentService.handlePaymentWebhook(orderPaidPayload, signWebhook(orderPaidPayload));
      expect(first).toEqual({ valid: true, event: 'payment_completed' });
      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cart: { userId: 'cust-1' } },
      });
      expect(notificationService.dispatchPaymentUpdate).toHaveBeenCalledWith(
        'cust-1',
        'order-paid-1',
        'COMPLETED',
      );

      // Replaying order.paid or receiving duplicate payment.captured for same payment returns already_processed
      prisma.payment.findFirst.mockResolvedValueOnce({
        id: 'pay-rec-1',
        orderId: 'order-paid-1',
        razorpayOrderId: 'order_rzp_paid_1',
        razorpayPaymentId: 'pay_order_paid_1',
        amount: 50000,
        currency: 'INR',
        status: 'COMPLETED',
        order: { ...orderRecord, status: 'CONFIRMED', paymentStatus: 'COMPLETED', paymentId: 'pay_order_paid_1' },
      });
      const dupCaptured = JSON.stringify({
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_order_paid_1',
              order_id: 'order_rzp_paid_1',
              amount: 50000,
              currency: 'INR',
            },
          },
        },
      });
      const second = await paymentService.handlePaymentWebhook(dupCaptured, signWebhook(dupCaptured));
      expect(second).toEqual({ valid: true, event: 'already_processed' });
    });

    it('processes partial cancelled item refund via Razorpay, guards against over-refunding, and prevents double refund', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: 'pay-full-1',
        orderId: 'order-2items',
        razorpayPaymentId: 'pay_rzp_2items',
        amount: 100000, // ₹1000
        status: 'COMPLETED',
        order: { id: 'order-2items', userId: 'cust-1', orderNumber: 'LM-200', status: 'CONFIRMED', paymentStatus: 'COMPLETED' },
      });
      prisma.orderItem.findFirst.mockResolvedValue({
        id: 'item-1',
        orderId: 'order-2items',
        status: 'CANCELLED',
        refundStatus: 'REFUND_PENDING',
        refundAmount: 400, // ₹400 = 40000 paise
      });
      prisma.orderItemCancellation.findMany.mockResolvedValueOnce([]);

      const partial = await paymentService.refundPayment('order-2items', 'pay_rzp_2items', {
        orderItemId: 'item-1',
        adminUserId: 'admin-1',
        reason: 'Item out of stock',
      });

      expect(partial).toEqual({ status: 'REFUNDED', refundId: 'rfnd_test_1', amountPaise: 40000 });
      expect((paymentService as any).razorpay.payments.refund).toHaveBeenCalledWith('pay_rzp_2items', {
        amount: 40000,
        notes: { orderId: 'order-2items', orderItemId: 'item-1', reason: 'Item out of stock' },
      });
      expect(prisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: 'order-2items' },
        data: { paymentStatus: 'PARTIALLY_REFUNDED' },
      });
      expect(notificationService.dispatchPaymentUpdate).toHaveBeenCalledWith(
        'cust-1',
        'order-2items',
        'REFUND_PROCESSED',
        expect.objectContaining({ amountPaise: 40000, refundId: 'rfnd_test_1' }),
      );

      // Re-clicking same cancelled item returns idempotent REFUNDED without calling Razorpay again
      (paymentService as any).razorpay.payments.refund.mockClear();
      prisma.orderItem.findFirst.mockResolvedValueOnce({
        id: 'item-1',
        orderId: 'order-2items',
        status: 'CANCELLED',
        refundStatus: 'REFUNDED',
        refundAmount: 400,
      });
      const idempotentItem = await paymentService.refundPayment('order-2items', 'pay_rzp_2items', {
        orderItemId: 'item-1',
      });
      expect(idempotentItem.status).toBe('REFUNDED');
      expect((paymentService as any).razorpay.payments.refund).not.toHaveBeenCalled();

      // Remaining balance refund cannot exceed paidPaise - alreadyRefundedPaise (60000)
      prisma.orderItemCancellation.findMany.mockResolvedValue([{ refundAmount: 400 }]);
      await expect(
        paymentService.refundPayment('order-2items', 'pay_rzp_2items', { amountPaise: 70000 }),
      ).rejects.toThrow(BadRequestException);

      // Full remaining balance refund sends exact 60000 paise
      const rem = await paymentService.refundPayment('order-2items', 'pay_rzp_2items', {
        adminUserId: 'admin-1',
      });
      expect(rem.status).toBe('REFUNDED');
      expect(rem.amountPaise).toBe(60000);
      expect((paymentService as any).razorpay.payments.refund).toHaveBeenCalledWith('pay_rzp_2items', {
        amount: 60000,
        notes: { orderId: 'order-2items' },
      });
    });

    it('marks REFUND_FAILED when Razorpay refund API throws and sends REFUND_FAILED notification', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: 'pay-rfnd-fail',
        orderId: 'order-rfnd-fail',
        razorpayPaymentId: 'pay_rzp_rfnd_fail',
        amount: 50000,
        status: 'COMPLETED',
        order: { id: 'order-rfnd-fail', userId: 'cust-2', orderNumber: 'LM-ERR', status: 'CANCELLED', paymentStatus: 'REFUND_PENDING' },
      });
      (paymentService as any).razorpay.payments.refund.mockRejectedValueOnce(new Error('Gateway 502'));

      const res = await paymentService.refundPayment('order-rfnd-fail', 'pay_rzp_rfnd_fail');
      expect(res).toEqual({ status: 'REFUND_FAILED', amountPaise: 50000 });
      expect(prisma.order.updateMany).toHaveBeenCalledWith({
        where: { id: 'order-rfnd-fail', paymentStatus: { in: ['REFUND_PENDING', 'REFUND_FAILED'] } },
        data: { paymentStatus: 'REFUND_FAILED' },
      });
      expect(notificationService.dispatchPaymentUpdate).toHaveBeenCalledWith(
        'cust-2',
        'order-rfnd-fail',
        'REFUND_FAILED',
        expect.objectContaining({ amountPaise: 50000 }),
      );
    });
  });

  describe('Phase 3: Superseded Webhooks, DTO Validation & Boot Config Checks', () => {
    const signWebhook = (rawBody: string) =>
      crypto.createHmac('sha256', 'webhooksecret1234567890').update(rawBody).digest('hex');

    it('refunds captured payment for a superseded razorpayOrderId without overwriting active Order.paymentStatus or Order.paymentId', async () => {
      const payload = JSON.stringify({
        event: 'payment.captured',
        payload: {
          payment: {
            entity: {
              id: 'pay_superseded_1',
              order_id: 'order_rzp_old',
              amount: 50000,
              currency: 'INR',
            },
          },
        },
      });

      const activeOrder = {
        id: 'order-active-1',
        orderNumber: 'LM-ACT-1',
        userId: 'cust-1',
        finalAmount: 500,
        razorpayOrderId: 'order_rzp_newer',
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentId: null,
        inventoryStatus: 'RESERVED',
        reservationExpiresAt: new Date(Date.now() + 60_000),
      };

      prisma.payment.findFirst
        .mockResolvedValueOnce({
          id: 'pay-row-old',
          orderId: 'order-active-1',
          razorpayOrderId: 'order_rzp_old',
          razorpayPaymentId: null,
          amount: 50000,
          currency: 'INR',
          status: 'PENDING',
          order: activeOrder,
        })
        .mockResolvedValueOnce({
          id: 'pay-row-old',
          orderId: 'order-active-1',
          razorpayOrderId: 'order_rzp_old',
          razorpayPaymentId: 'pay_superseded_1',
          amount: 50000,
          currency: 'INR',
          status: 'COMPLETED',
          order: activeOrder,
        });

      const res = await paymentService.handlePaymentWebhook(payload, signWebhook(payload));
      expect(res).toEqual({ valid: true, event: 'superseded_payment_refund', data: { refundStatus: 'REFUNDED' } });
      expect((paymentService as any).razorpay.payments.refund).toHaveBeenCalledWith('pay_superseded_1', {
        amount: 50000,
        notes: { orderId: 'order-active-1' },
      });
      // Active Order rows must NEVER be overwritten with REFUND_PENDING / REFUNDED or old paymentId
      expect(prisma.order.updateMany).not.toHaveBeenCalled();
    });

    it('validates PaymentController DTO payloads with class-validator and forbidNonWhitelisted', async () => {
      const { ValidationPipe } = await import('@nestjs/common');
      const { CreateRazorpayOrderDto, VerifyRazorpayPaymentDto } = await import(
        '../../src/modules/payments/dto/razorpay.dto'
      );
      const pipe = new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true });

      await expect(
        pipe.transform({ orderId: 'ord-1', amount: 1 }, { type: 'body', metatype: CreateRazorpayOrderDto }),
      ).rejects.toThrow();

      await expect(
        pipe.transform({ orderId: '' }, { type: 'body', metatype: CreateRazorpayOrderDto }),
      ).rejects.toThrow();

      const validVerify = await pipe.transform(
        {
          orderId: 'ord-1',
          razorpayOrderId: 'order_rzp_1',
          razorpayPaymentId: 'pay_rzp_1',
          razorpaySignature: 'sig_1',
        },
        { type: 'body', metatype: VerifyRazorpayPaymentDto },
      );
      expect(validVerify.orderId).toBe('ord-1');
    });

    it('enforces Razorpay boot config rules: requires webhook secret, gates rzp_live_ behind ALLOW_LIVE_PAYMENT_KEYS in prod, and requires rzp_test_ otherwise', () => {
      const makeCfg = (envMap: Record<string, string | undefined>) => ({
        get: (k: string) => envMap[k],
      }) as unknown as ConfigService;

      // Test keys are allowed in production when ALLOW_LIVE_PAYMENT_KEYS is false/unset (for onboarding/staging)
      expect(
        () =>
          new PaymentService(
            makeCfg({
              NODE_ENV: 'production',
              ALLOW_LIVE_PAYMENT_KEYS: 'false',
              RAZORPAY_KEY_ID: 'rzp_test_123',
              RAZORPAY_KEY_SECRET: 'sec',
              RAZORPAY_WEBHOOK_SECRET: 'whsec',
            }),
            prisma,
            notificationService,
            createNoTaxService(),
          ),
      ).not.toThrow();

      // Test keys are rejected once ALLOW_LIVE_PAYMENT_KEYS=true in production
      expect(
        () =>
          new PaymentService(
            makeCfg({
              NODE_ENV: 'production',
              ALLOW_LIVE_PAYMENT_KEYS: 'true',
              RAZORPAY_KEY_ID: 'rzp_test_123',
              RAZORPAY_KEY_SECRET: 'sec',
              RAZORPAY_WEBHOOK_SECRET: 'whsec',
            }),
            prisma,
            notificationService,
            createNoTaxService(),
          ),
      ).toThrow(UnauthorizedException);

      // Live keys are rejected in production unless ALLOW_LIVE_PAYMENT_KEYS=true
      expect(
        () =>
          new PaymentService(
            makeCfg({
              NODE_ENV: 'production',
              RAZORPAY_KEY_ID: 'rzp_live_valid123',
              RAZORPAY_KEY_SECRET: 'sec',
              RAZORPAY_WEBHOOK_SECRET: 'whsec',
            }),
            prisma,
            notificationService,
            createNoTaxService(),
          ),
      ).toThrow(UnauthorizedException);

      // Live keys are never allowed outside production even with ALLOW_LIVE_PAYMENT_KEYS=true
      expect(
        () =>
          new PaymentService(
            makeCfg({
              NODE_ENV: 'development',
              ALLOW_LIVE_PAYMENT_KEYS: 'true',
              RAZORPAY_KEY_ID: 'rzp_live_valid123',
              RAZORPAY_KEY_SECRET: 'sec',
              RAZORPAY_WEBHOOK_SECRET: 'whsec',
            }),
            prisma,
            notificationService,
            createNoTaxService(),
          ),
      ).toThrow(UnauthorizedException);

      expect(
        () =>
          new PaymentService(
            makeCfg({
              NODE_ENV: 'development',
              RAZORPAY_KEY_ID: 'rzp_test_123',
              RAZORPAY_KEY_SECRET: 'sec',
              RAZORPAY_WEBHOOK_SECRET: '',
            }),
            prisma,
            notificationService,
            createNoTaxService(),
          ),
      ).toThrow(UnauthorizedException);

      expect(
        () =>
          new PaymentService(
            makeCfg({
              NODE_ENV: 'production',
              ALLOW_LIVE_PAYMENT_KEYS: 'true',
              RAZORPAY_KEY_ID: 'rzp_live_valid123',
              RAZORPAY_KEY_SECRET: 'sec',
              RAZORPAY_WEBHOOK_SECRET: 'whsec',
            }),
            prisma,
            notificationService,
            createNoTaxService(),
          ),
      ).not.toThrow();
    });

    it('enforces >= 100 paise minimum amount and maps Razorpay 401/500 errors safely in createOrderForUser', async () => {
      prisma.order.findUnique.mockResolvedValueOnce({
        id: 'order-sub-100',
        userId: 'user-1',
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentMethod: 'razorpay',
        inventoryStatus: 'RESERVED',
        reservationExpiresAt: new Date(Date.now() + 60_000),
        finalAmount: 0.5,
        items: [{ purchaseMode: 'buy' }],
        payments: [],
      });

      await expect(paymentService.createOrderForUser('order-sub-100', 'user-1', 'CUSTOMER')).rejects.toThrow(
        BadRequestException,
      );

      const baseOrder = {
        id: 'order-err-1',
        userId: 'user-1',
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentMethod: 'razorpay',
        inventoryStatus: 'RESERVED',
        reservationExpiresAt: new Date(Date.now() + 60_000),
        finalAmount: 500,
        items: [{ purchaseMode: 'buy' }],
        payments: [],
      };
      const rzpCreateSpy = (paymentService as any).razorpay.orders.create as jest.Mock;

      prisma.order.findUnique.mockResolvedValueOnce(baseOrder);
      rzpCreateSpy.mockRejectedValueOnce({ statusCode: 401, error: { description: 'Authentication failed' } });
      await expect(paymentService.createOrderForUser('order-err-1', 'user-1', 'CUSTOMER')).rejects.toThrow(
        UnauthorizedException,
      );

      prisma.order.findUnique.mockResolvedValueOnce(baseOrder);
      rzpCreateSpy.mockRejectedValueOnce({ statusCode: 502, error: { description: 'Gateway timeout' } });
      await expect(paymentService.createOrderForUser('order-err-1', 'user-1', 'CUSTOMER')).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
