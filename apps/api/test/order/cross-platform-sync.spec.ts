/// <reference types="jest" />

import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { OrderService } from '../../src/modules/order/order.service';
import { OrderController } from '../../src/modules/order/order.controller';
import { CartService } from '../../src/modules/cart/cart.service';

describe('Cross-Platform Data Synchronization (Web & Mobile)', () => {
  let orderService: OrderService;
  let orderController: OrderController;
  let cartService: CartService;
  let prismaMock: any;
  let notificationServiceMock: any;
  let discountServiceMock: any;

  const customerA = { id: 'usr-customer-a', role: 'CUSTOMER', email: 'cust_a@example.com', phone: '9876543210' };
  const customerB = { id: 'usr-customer-b', role: 'CUSTOMER', email: 'cust_b@example.com', phone: '9123456789' };
  const adminUser = { id: 'usr-admin-1', role: 'ADMIN', email: 'admin@laptopmitra.com' };

  beforeEach(() => {
    prismaMock = {
      order: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        count: jest.fn(),
      },
      cart: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
      cartItem: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      product: {
        findUnique: jest.fn(),
        updateMany: jest.fn(),
      },
      referralRedemption: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      $transaction: jest.fn(async (cb) => cb(prismaMock)),
    };

    notificationServiceMock = {
      dispatchOrderUpdate: jest.fn().mockResolvedValue(undefined),
    };

    discountServiceMock = {
      validateOrderDiscount: jest.fn().mockResolvedValue(null),
      consumeOrderDiscount: jest.fn().mockResolvedValue(undefined),
    };

    cartService = new CartService(prismaMock, {} as any);
    orderService = new OrderService(
      prismaMock,
      cartService,
      {} as any,
      notificationServiceMock,
      discountServiceMock,
    );
    orderController = new OrderController(orderService);
  });

  describe('Scenario A: Web Order Creation to Mobile Retrieval', () => {
    it('creates an order from web storefront and allows mobile app to fetch it under the same account', async () => {
      const mockWebOrder = {
        id: 'ord-web-101',
        orderNumber: 'LM-WEB-101',
        userId: customerA.id,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentMethod: 'razorpay',
        subtotal: 45000,
        discountAmount: 0,
        finalAmount: 45000,
        phone: customerA.phone,
        email: customerA.email,
        shippingAddress: {
          fullName: 'Customer A',
          address: '42 MG Road',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560001',
        },
        items: [
          {
            id: 'item-1',
            productId: 'prod-thinkpad-t480',
            quantity: 1,
            price: 45000,
            product: { name: 'Lenovo ThinkPad T480', price: 45000 },
          },
        ],
        createdAt: new Date('2026-10-22T10:00:00Z'),
      };

      // Mock user's cart on backend
      prismaMock.cart.findFirst.mockResolvedValue({
        id: 'cart-1',
        userId: customerA.id,
        items: [
          {
            id: 'ci-1',
            productId: 'prod-thinkpad-t480',
            quantity: 1,
            product: {
              id: 'prod-thinkpad-t480',
              name: 'Lenovo ThinkPad T480',
              price: 45000,
              stock: 5,
              status: 'ACTIVE',
              categoryId: 'cat-enterprise',
            },
          },
        ],
      });

      prismaMock.product.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.order.create.mockResolvedValue(mockWebOrder);

      // 1. Web client initiates order creation
      const createdOrder = await orderController.createOrder(
        customerA,
        {
          paymentMethod: 'razorpay',
          email: customerA.email,
          phone: customerA.phone,
          shippingAddress: mockWebOrder.shippingAddress,
          idempotencyKey: 'idemp-web-test-01',
        },
        'idemp-web-test-01',
      );

      expect(createdOrder.id).toBe('ord-web-101');
      expect(createdOrder.orderNumber).toBe('LM-WEB-101');

      // 2. Mobile client logs into the same account and queries order history
      prismaMock.order.findMany.mockResolvedValue([mockWebOrder]);
      const mobileOrderHistory = await orderController.getOrders(customerA);

      expect(mobileOrderHistory).toHaveLength(1);
      expect(mobileOrderHistory[0].id).toBe('ord-web-101');
      expect(mobileOrderHistory[0].userId).toBe(customerA.id);
      expect(mobileOrderHistory[0].finalAmount).toBe(45000);

      // 3. Mobile client opens individual order details
      prismaMock.order.findUnique.mockResolvedValue(mockWebOrder);
      const mobileOrderDetail = await orderController.getOrder(customerA, 'ord-web-101');

      expect(mobileOrderDetail.id).toBe('ord-web-101');
      expect(mobileOrderDetail.items?.[0].product?.name).toBe('Lenovo ThinkPad T480');
    });
  });

  describe('Scenario B: Mobile Order Creation to Web Retrieval', () => {
    it('creates a COD order from mobile app and allows web storefront to display it immediately', async () => {
      const mockMobileOrder = {
        id: 'ord-mob-202',
        orderNumber: 'LM-MOB-202',
        userId: customerA.id,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        paymentMethod: 'cod',
        subtotal: 52000,
        discountAmount: 0,
        finalAmount: 52000,
        phone: customerA.phone,
        email: customerA.email,
        shippingAddress: {
          fullName: 'Customer A',
          address: '15 Nehru Place',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110019',
        },
        items: [
          {
            id: 'item-2',
            productId: 'prod-dell-latitude-7490',
            quantity: 1,
            price: 52000,
            product: { name: 'Dell Latitude 7490', price: 52000 },
          },
        ],
        createdAt: new Date('2026-10-22T11:00:00Z'),
      };

      prismaMock.cart.findFirst.mockResolvedValue({
        id: 'cart-1',
        userId: customerA.id,
        items: [
          {
            id: 'ci-2',
            productId: 'prod-dell-latitude-7490',
            quantity: 1,
            product: {
              id: 'prod-dell-latitude-7490',
              name: 'Dell Latitude 7490',
              price: 52000,
              stock: 3,
              status: 'ACTIVE',
              categoryId: 'cat-latitude',
            },
          },
        ],
      });

      prismaMock.product.updateMany.mockResolvedValue({ count: 1 });
      prismaMock.order.create.mockResolvedValue(mockMobileOrder);

      // 1. Mobile app submits order
      const placedOrder = await orderController.createOrder(
        customerA,
        {
          paymentMethod: 'cod',
          email: customerA.email,
          phone: customerA.phone,
          shippingAddress: mockMobileOrder.shippingAddress,
          idempotencyKey: 'idemp-mob-test-02',
        },
        'idemp-mob-test-02',
      );

      expect(placedOrder.id).toBe('ord-mob-202');
      expect(placedOrder.paymentMethod).toBe('cod');

      // 2. Web customer views order history on /account/orders or /profile
      prismaMock.order.findMany.mockResolvedValue([mockMobileOrder]);
      const webOrderList = await orderController.getOrders(customerA);

      expect(webOrderList).toHaveLength(1);
      expect(webOrderList[0].id).toBe('ord-mob-202');
      expect(webOrderList[0].status).toBe('PENDING');

      // 3. Web customer views details on /account/orders/ord-mob-202
      prismaMock.order.findUnique.mockResolvedValue(mockMobileOrder);
      const webOrderDetail = await orderController.getOrder(customerA, 'ord-mob-202');

      expect(webOrderDetail.orderNumber).toBe('LM-MOB-202');
      expect(webOrderDetail.shippingAddress?.city).toBe('New Delhi');
    });
  });

  describe('Scenario C: Order Status Transitions', () => {
    it('propagates order status progression from backend across both clients', async () => {
      const orderRecord = {
        id: 'ord-sync-303',
        userId: customerA.id,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        orderNumber: 'LM-SYNC-303',
        subtotal: 40000,
        discountAmount: 0,
        finalAmount: 40000,
        email: customerA.email,
      };

      // 1. Admin confirms the order
      prismaMock.order.findUnique.mockResolvedValue(orderRecord);
      prismaMock.order.update.mockResolvedValue({ ...orderRecord, status: 'CONFIRMED' });

      const confirmed = await orderController.updateStatus(adminUser, 'ord-sync-303', 'CONFIRMED');
      expect(confirmed.status).toBe('CONFIRMED');

      // 2. Both mobile and web clients query the order and see CONFIRMED
      prismaMock.order.findUnique.mockResolvedValue({ ...orderRecord, status: 'CONFIRMED' });
      const clientView = await orderController.getOrder(customerA, 'ord-sync-303');
      expect(clientView.status).toBe('CONFIRMED');
    });
  });

  describe('Idempotency & Duplicate Order Protection', () => {
    it('returns the existing order without creating a duplicate when identical idempotencyKey is submitted', async () => {
      const existingOrder = {
        id: 'ord-existing-999',
        orderNumber: 'LM-IDEMP-999',
        userId: customerA.id,
        status: 'PENDING',
        paymentStatus: 'PENDING',
        finalAmount: 38000,
        email: customerA.email,
        phone: customerA.phone,
        shippingAddress: {
          address: '10 Industrial Area',
          _idempotencyKey: 'idemp-duplicate-test',
        },
      };

      // When checking for existing orders with this idempotency key
      prismaMock.order.findMany.mockResolvedValue([existingOrder]);

      const result = await orderController.createOrder(
        customerA,
        {
          paymentMethod: 'cod',
          email: customerA.email,
          phone: customerA.phone,
          idempotencyKey: 'idemp-duplicate-test',
        },
        'idemp-duplicate-test',
      );

      // Verify that prisma.order.create was NOT called
      expect(prismaMock.order.create).not.toHaveBeenCalled();
      expect(result.id).toBe('ord-existing-999');
    });
  });

  describe('Account Isolation & Cross-Account Security', () => {
    it('prevents customer B from viewing customer A orders', async () => {
      prismaMock.order.findUnique.mockResolvedValue({
        id: 'ord-private-777',
        userId: customerA.id,
      });

      await expect(
        orderController.getOrder(customerB, 'ord-private-777'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('returns empty array cleanly for a customer with no orders', async () => {
      prismaMock.order.findMany.mockResolvedValue([]);
      const orders = await orderController.getOrders(customerB);
      expect(orders).toEqual([]);
    });
  });

  describe('Cart Synchronization & Stock Validation', () => {
    it('updates quantity whether referenced by cartItem.id or productId', async () => {
      const mockCart = {
        id: 'cart-cust-a',
        userId: customerA.id,
        items: [
          {
            id: 'cart-item-1',
            cartId: 'cart-cust-a',
            productId: 'prod-macbook-pro',
            quantity: 1,
            priceAtAdd: 85000,
            product: { stock: 10, allowBackorder: false },
          },
        ],
      };

      prismaMock.cart.findFirst.mockResolvedValue(mockCart);

      // 1. Mutate using productId instead of cartItem.id
      prismaMock.cartItem.findUnique.mockResolvedValue(null); // not found by cartItem.id
      prismaMock.cartItem.findFirst.mockResolvedValue(mockCart.items[0]); // found by productId
      prismaMock.cartItem.update.mockResolvedValue({ ...mockCart.items[0], quantity: 2 });

      const updated = await cartService.updateQuantity(customerA.id, 'prod-macbook-pro', 2);
      expect(updated.quantity).toBe(2);
      expect(prismaMock.cartItem.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'cart-item-1' } }),
      );
    });

    it('enforces server-side stock check when adding or updating cart quantity', async () => {
      const mockCart = {
        id: 'cart-cust-a',
        userId: customerA.id,
        items: [],
      };

      prismaMock.cart.findFirst.mockResolvedValue(mockCart);
      prismaMock.product.findUnique.mockResolvedValue({
        id: 'prod-hp-elitebook',
        stock: 2,
        allowBackorder: false,
      });

      // Attempt to add quantity 5 when stock is 2
      await expect(
        cartService.addItem(customerA.id, 'prod-hp-elitebook', 5),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
