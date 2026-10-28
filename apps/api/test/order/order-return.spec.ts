import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrderService } from '../../src/modules/order/order.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { CartService } from '../../src/modules/cart/cart.service';
import { ProductService } from '../../src/modules/product/product.service';
import { NotificationService } from '../../src/modules/notifications/notification.service';
import { DiscountService } from '../../src/modules/discount/discount.service';
import { PaymentService } from '../../src/modules/payments/payment.service';

describe('OrderService - Return Request Tests (POST /orders/:id/return)', () => {
  let orderService: OrderService;
  let prisma: any;

  const mockUserId = 'user-test-123';
  const otherUserId = 'user-intruder-456';
  const orderId = 'order-test-abc';

  const createMockDbOrder = (overrides: any = {}) => ({
    id: orderId,
    orderNumber: 'LM-ORD-ABC12345',
    userId: mockUserId,
    status: 'DELIVERED',
    paymentStatus: 'COMPLETED',
    paymentMethod: 'razorpay',
    subtotal: 52000,
    discountAmount: 0,
    finalAmount: 52000,
    email: 'test@laptopmitra.com',
    shippingAddress: {
      addressLine1: '123 MG Road',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560001',
    },
    notes: 'Please leave with security',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    items: [],
    deliveries: [
      {
        id: 'del-1',
        orderId,
        status: 'DELIVERED',
        carrier: 'BlueDart Express',
        trackingNumber: 'BD123456789IN',
        shippedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        deliveredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago (within 7-day window)
      },
    ],
    payments: [],
    ...overrides,
  });

  beforeEach(async () => {
    prisma = {
      order: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $transaction: jest.fn((cb) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: PrismaService, useValue: prisma },
        { provide: CartService, useValue: { addItem: jest.fn() } },
        { provide: ProductService, useValue: {} },
        { provide: NotificationService, useValue: {} },
        { provide: DiscountService, useValue: {} },
        { provide: PaymentService, useValue: {} },
      ],
    }).compile();

    orderService = module.get<OrderService>(OrderService);
  });

  it('1. should reject return if order status is not DELIVERED (e.g. SHIPPING)', async () => {
    const shippingOrder = createMockDbOrder({ status: 'SHIPPING' });
    prisma.order.findUnique.mockResolvedValue(shippingOrder);

    await expect(
      orderService.requestReturn(orderId, mockUserId, 'Display defect'),
    ).rejects.toThrow(BadRequestException);

    expect(prisma.order.update).not.toHaveBeenCalled();
  });

  it('2. should reject return if delivery timestamp is older than 7 days', async () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
    const expiredOrder = createMockDbOrder({
      deliveries: [
        {
          id: 'del-1',
          orderId,
          status: 'DELIVERED',
          deliveredAt: eightDaysAgo,
        },
      ],
    });
    prisma.order.findUnique.mockResolvedValue(expiredOrder);

    await expect(
      orderService.requestReturn(orderId, mockUserId, 'Battery degradation'),
    ).rejects.toThrow(/Return window has expired.*within 7 days/i);

    expect(prisma.order.update).not.toHaveBeenCalled();
  });

  it('3. should accept return within 7 days and persist status change via Prisma', async () => {
    const validDeliveredOrder = createMockDbOrder();
    prisma.order.findUnique.mockResolvedValue(validDeliveredOrder);

    const result = await orderService.requestReturn(
      orderId,
      mockUserId,
      'Keyboard keys sticky',
    );

    expect(result.returnStatus).toBe('REQUESTED');
    expect(result.message).toContain('Return / Replacement request submitted successfully');

    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: orderId },
        data: expect.objectContaining({
          shippingAddress: expect.objectContaining({
            returnStatus: 'REQUESTED',
            returnReason: 'Keyboard keys sticky',
            returnRequestedAt: expect.any(String),
          }),
          notes: expect.stringContaining('[Return Requested:'),
        }),
      }),
    );
  });

  it('4. should be idempotent: second return request returns current status without throwing or re-updating', async () => {
    const alreadyRequestedOrder = createMockDbOrder({
      shippingAddress: {
        city: 'Bengaluru',
        returnStatus: 'REQUESTED',
        returnReason: 'Keyboard keys sticky',
      },
    });
    prisma.order.findUnique.mockResolvedValue(alreadyRequestedOrder);

    const result = await orderService.requestReturn(
      orderId,
      mockUserId,
      'Duplicate request click',
    );

    expect(result.returnStatus).toBe('REQUESTED');
    expect(result.message).toContain('Return / Replacement request already submitted');
    // Prisma update should not be called again because it's already requested
    expect(prisma.order.update).not.toHaveBeenCalled();
  });

  it('5. should reject return request from another unauthorized user (403 Forbidden)', async () => {
    const validDeliveredOrder = createMockDbOrder();
    prisma.order.findUnique.mockResolvedValue(validDeliveredOrder);

    await expect(
      orderService.requestReturn(orderId, otherUserId, 'Unauthorized request'),
    ).rejects.toThrow(ForbiddenException);

    expect(prisma.order.update).not.toHaveBeenCalled();
  });
});
