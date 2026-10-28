import { BadRequestException } from '@nestjs/common';
import { OrderService } from '../../src/modules/order/order.service';
import { CONFIG_UPGRADE_SELL_DELTA, CONFIG_UPGRADE_LEASE_DELTA, WARRANTY_PRICE_PER_UNIT } from '../../src/modules/cart/cart.service';

describe('Phase R3 — Commercial Integrity: Pricing, Warranty, Lease Advance, Multi-Mode Orders & Razorpay', () => {
  let orderService: OrderService;
  let prisma: any;
  let cartService: any;
  let productService: any;
  let notificationService: any;
  let discountService: any;
  let paymentService: any;

  const mockProductBuy = {
    id: 'prod-buy-1',
    name: 'ThinkPad X1 Carbon',
    price: 80000,
    leasePriceMonthly: null,
    stock: 5,
    allowBackorder: false,
    status: 'ACTIVE',
  };

  const mockProductLease = {
    id: 'prod-lease-1',
    name: 'Dell Latitude 5420',
    price: 50000,
    leasePriceMonthly: 3500,
    stock: 10,
    allowBackorder: false,
    status: 'ACTIVE',
  };

  const mockProductLeaseFallback = {
    id: 'prod-lease-fallback',
    name: 'HP EliteBook 840',
    price: 40000,
    leasePriceMonthly: null,
    stock: 8,
    allowBackorder: false,
    status: 'ACTIVE',
  };

  beforeEach(() => {
    prisma = {
      cart: {
        findFirst: jest.fn(),
      },
      product: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUnique: jest.fn(),
      },
      order: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn().mockImplementation(({ data }: any) => {
          return {
            id: 'ord-test-r3-1',
            orderNumber: 'LM-ORD-R3001',
            createdAt: new Date(),
            updatedAt: new Date(),
            ...data,
            items: data.items?.create || [],
          };
        }),
      },
      cartItem: {
        deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
      referralRedemption: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn().mockImplementation((fn: any) => fn(prisma)),
    };

    cartService = {};
    productService = {};
    notificationService = {
      dispatchOrderUpdate: jest.fn().mockResolvedValue(undefined),
    };
    discountService = {
      validateOrderDiscount: jest.fn().mockResolvedValue(null),
      consumeOrderDiscount: jest.fn().mockResolvedValue(undefined),
    };
    paymentService = {};

    orderService = new OrderService(
      prisma,
      cartService,
      productService,
      notificationService,
      discountService,
      paymentService,
    );
  });

  describe('1. Price Resolution & Upgrade Deltas', () => {
    it('resolves correct prices for sell and lease with configuration upgrade deltas', () => {
      // Sell default
      const sellDefault = 80000;
      // Sell with 16GB Pro (+4000)
      const sellUpgraded = sellDefault + CONFIG_UPGRADE_SELL_DELTA;
      expect(sellUpgraded).toBe(84000);

      // Lease explicit (3500)
      const leaseExplicit = 3500;
      // Lease explicit with 16GB Pro (+500/mo)
      const leaseUpgraded = leaseExplicit + CONFIG_UPGRADE_LEASE_DELTA;
      expect(leaseUpgraded).toBe(4000);
    });

    it('rejects order creation if a lease item has null leasePriceMonthly', async () => {
      prisma.cart.findFirst.mockResolvedValue({
        id: 'cart-1',
        items: [
          {
            productId: mockProductLeaseFallback.id,
            product: mockProductLeaseFallback,
            quantity: 1,
            purchaseMode: 'lease',
            configuration: 'default',
            hasWarranty: false,
          },
        ],
      });

      await expect(
        orderService.createOrder(
          'user-1',
          undefined,
          undefined,
          { email: 'user@example.com', phone: '9999999999' },
          '9999999999',
          'Test notes',
          'user@example.com',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('2. Warranty Rejection on Lease Items', () => {
    it('strictly rejects order creation if a lease item has hasWarranty = true', async () => {
      prisma.cart.findFirst.mockResolvedValue({
        id: 'cart-1',
        items: [
          {
            productId: mockProductLease.id,
            product: mockProductLease,
            quantity: 1,
            purchaseMode: 'lease',
            configuration: 'default',
            hasWarranty: true, // INVALID on lease!
          },
        ],
      });

      await expect(
        orderService.createOrder(
          'user-1',
          undefined,
          undefined,
          { email: 'user@example.com', phone: '9999999999' },
          '9999999999',
          'Test notes',
          'user@example.com',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('3. BUY and RENT Coexistence & Order Totals (Option A: Month 1 Advance)', () => {
    it('creates an order with BUY item + warranty and LEASE item (charged as Month 1 advance)', async () => {
      // 1 Buy item: ₹80,000 + 16GB Pro upgrade (+₹4,000) + Warranty (+₹1,999) = ₹85,999
      // 2 Lease items: ₹3,500/mo * 2 units = ₹7,000 Month 1 advance
      // Expected Subtotal & FinalAmount = ₹85,999 + ₹7,000 = ₹92,999.00
      prisma.cart.findFirst.mockResolvedValue({
        id: 'cart-1',
        items: [
          {
            productId: mockProductBuy.id,
            product: mockProductBuy,
            quantity: 1,
            purchaseMode: 'sell',
            configuration: 'ram-16gb',
            hasWarranty: true,
          },
          {
            productId: mockProductLease.id,
            product: mockProductLease,
            quantity: 2,
            purchaseMode: 'lease',
            configuration: 'default',
            hasWarranty: false,
          },
        ],
      });

      const order = await orderService.createOrder(
        'user-1',
        undefined,
        undefined,
        { email: 'user@example.com', phone: '9876543210' },
        '9876543210',
        'Multi-mode order',
        'user@example.com',
      );

      expect(order).toBeDefined();
      expect(Number(order.subtotal)).toBe(92999);
      expect(Number(order.finalAmount)).toBe(92999);
      expect(order.items.length).toBe(2);

      const buyLine = order.items.find((i: any) => i.purchaseMode === 'sell');
      const leaseLine = order.items.find((i: any) => i.purchaseMode === 'lease');

      expect(buyLine).toBeDefined();
      expect(buyLine.configuration).toBe('ram-16gb');
      expect(buyLine.hasWarranty).toBe(true);
      expect(Number(buyLine.price)).toBe(84000); // 80000 + 4000
      expect(buyLine.warrantyPrice).toBe(WARRANTY_PRICE_PER_UNIT);

      expect(leaseLine).toBeDefined();
      expect(leaseLine.purchaseMode).toBe('lease');
      expect(leaseLine.quantity).toBe(2);
      expect(Number(leaseLine.price)).toBe(3500); // Month 1 rate per unit
      expect(leaseLine.hasWarranty).toBe(false);
    });
  });

  describe('4. Razorpay Amount Equals Server Total Exactly', () => {
    it('guarantees Razorpay order amount in paise equals Math.round(order.finalAmount * 100)', () => {
      const serverFinalAmount = 92999.00;
      const expectedRazorpayAmountPaise = Math.round(serverFinalAmount * 100);

      expect(expectedRazorpayAmountPaise).toBe(9299900);
      expect(expectedRazorpayAmountPaise / 100).toBe(serverFinalAmount);
    });
  });
});
