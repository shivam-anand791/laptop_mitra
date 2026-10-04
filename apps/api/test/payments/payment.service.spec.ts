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
      },
      payment: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation(async (promises) => Promise.all(promises)),
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
        razorpayOrderId: 'order_rzp_existing_123',
      };
      prisma.order.findUnique.mockResolvedValue(dbOrder);
      prisma.payment.findFirst.mockResolvedValue({
        id: 'pay-existing',
        razorpayOrderId: 'order_rzp_existing_123',
        status: 'PENDING',
      });

      const res = await paymentService.createOrderForUser('order-existing', 'user-1', 'CUSTOMER');
      expect(res.id).toBe('order_rzp_existing_123');
      expect(res.amount).toBe(4500000);
      expect(prisma.payment.create).not.toHaveBeenCalled();
    });
  });

  describe('Webhook & Signature Verification', () => {
    it('verifies valid HMAC signature using timing-safe comparison', async () => {
      const payload = { event: 'payment.captured', payload: { payment: { entity: { id: 'pay_123' } } } };
      const secret = 'webhooksecret1234567890';
      const validSig = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');

      const result = await paymentService.handlePaymentWebhook(payload, validSig);
      expect(result.valid).toBe(true);
    });

    it('rejects tampered webhook signature', async () => {
      const payload = { event: 'payment.captured' };
      const invalidSig = 'deadbeefdeadbeef';

      const result = await paymentService.handlePaymentWebhook(payload, invalidSig);
      expect(result.valid).toBe(false);
      expect(result.event).toBe('invalid_signature');
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
      const validSig = crypto.createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');

      const dbOrder = {
        id: 'order-100',
        userId: 'user-1',
        finalAmount: 80000, // Expected ₹80,000 (8,000,000 paise)
        paymentStatus: 'PENDING',
        status: 'PENDING',
      };
      prisma.order.findFirst.mockResolvedValue(dbOrder);

      const result = await paymentService.handlePaymentWebhook(payload, validSig);
      expect(result.valid).toBe(false);
      expect(result.event).toBe('amount_mismatch');
      expect(prisma.order.update).not.toHaveBeenCalled();
    });
  });
});
