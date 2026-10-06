import { ServiceUnavailableException, BadRequestException, NotFoundException } from '@nestjs/common';
import { allowInMemoryFallback } from '../../src/common/fallback';
import { AddressService } from '../../src/modules/address/address.service';
import { NotificationService } from '../../src/modules/notifications/notification.service';
import { SupportService } from '../../src/modules/support/support.service';
import { OrderService } from '../../src/modules/order/order.service';

describe('Production Database Resilience & Fallback Prevention', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('allowInMemoryFallback helper', () => {
    it('returns false when NODE_ENV is production regardless of ALLOW_IN_MEMORY_FALLBACK', () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOW_IN_MEMORY_FALLBACK = 'true';
      expect(allowInMemoryFallback()).toBe(false);
    });

    it('returns false when ALLOW_IN_MEMORY_FALLBACK is unset or false in development', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.ALLOW_IN_MEMORY_FALLBACK;
      expect(allowInMemoryFallback()).toBe(false);

      process.env.ALLOW_IN_MEMORY_FALLBACK = 'false';
      expect(allowInMemoryFallback()).toBe(false);
    });

    it('returns true only when NODE_ENV !== production AND ALLOW_IN_MEMORY_FALLBACK === "true"', () => {
      process.env.NODE_ENV = 'development';
      process.env.ALLOW_IN_MEMORY_FALLBACK = 'true';
      expect(allowInMemoryFallback()).toBe(true);

      process.env.NODE_ENV = 'test';
      process.env.ALLOW_IN_MEMORY_FALLBACK = 'true';
      expect(allowInMemoryFallback()).toBe(true);
    });
  });

  describe('Production mode (NODE_ENV=production): database failures must throw clear errors', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOW_IN_MEMORY_FALLBACK = 'false';
    });

    describe('AddressService', () => {
      it('findAll rejects with ServiceUnavailableException when Prisma throws', async () => {
        const prisma = {
          address: {
            findMany: jest.fn().mockRejectedValue(new Error('Connection terminated unexpectedly')),
          },
        } as any;

        const service = new AddressService(prisma);
        await expect(service.findAll('user-1')).rejects.toThrow(ServiceUnavailableException);
      });

      it('create rejects with ServiceUnavailableException when Prisma throws', async () => {
        const prisma = {
          address: {
            create: jest.fn().mockRejectedValue(new Error('Database disk full')),
          },
        } as any;

        const service = new AddressService(prisma);
        await expect(
          service.create('user-1', {
            address: '123 Main St',
            city: 'Bengaluru',
            state: 'Karnataka',
            pincode: '560001',
          }),
        ).rejects.toThrow(ServiceUnavailableException);
      });
    });

    describe('NotificationService', () => {
      it('registerDeviceToken rejects with ServiceUnavailableException when Prisma throws', async () => {
        const prisma = {
          deviceToken: {
            findFirst: jest.fn().mockRejectedValue(new Error('Prisma Client Connection Pool Timeout')),
          },
        } as any;

        const service = new NotificationService(prisma);
        await expect(
          service.registerDeviceToken('user-1', 'expo-token-xyz', 'android'),
        ).rejects.toThrow(ServiceUnavailableException);
      });

      it('getPreferences rejects with ServiceUnavailableException when Prisma throws', async () => {
        const prisma = {
          user: {
            findUnique: jest.fn().mockRejectedValue(new Error('PostgreSQL server shut down')),
          },
        } as any;

        const service = new NotificationService(prisma);
        await expect(service.getPreferences('user-1')).rejects.toThrow(ServiceUnavailableException);
      });
    });

    describe('SupportService', () => {
      it('getUserTickets rejects with ServiceUnavailableException when Prisma throws', async () => {
        const prisma = {
          user: {
            findUnique: jest.fn().mockRejectedValue(new Error('Prisma connection lost')),
          },
        } as any;

        const service = new SupportService(prisma);
        await expect(service.getUserTickets('user-1')).rejects.toThrow(ServiceUnavailableException);
      });

      it('createTicket rejects with ServiceUnavailableException when order lookup fails on DB error', async () => {
        const prisma = {
          user: { findUnique: jest.fn().mockResolvedValue({ id: 'user-1' }) },
          order: {
            findUnique: jest.fn().mockRejectedValue(new Error('Deadlock detected')),
          },
        } as any;

        const service = new SupportService(prisma);
        await expect(
          service.createTicket('user-1', {
            subject: 'Broken screen on delivery',
            message: 'Laptop arrived damaged',
            orderId: 'ord-123',
          }),
        ).rejects.toThrow(ServiceUnavailableException);
      });
    });

    describe('OrderService', () => {
      it('createOrder rejects with ServiceUnavailableException when prisma.$transaction fails, and does NOT clear cart', async () => {
        const mockCart = {
          cart: {
            id: 'cart-1',
            userId: 'user-1',
            items: [
              {
                id: 'ci-1',
                productId: 'prod-1',
                quantity: 1,
                priceAtAdd: 50000,
                product: { id: 'prod-1', name: 'ThinkPad', price: 50000 },
              },
            ],
          },
          total: 50000,
          itemCount: 1,
        };

        const cartService = {
          getCart: jest.fn().mockResolvedValue(mockCart),
          clearCart: jest.fn(),
        } as any;

        const prisma = {
          order: { create: jest.fn().mockReturnValue({ id: 'op-1' }) },
          orderItem: { create: jest.fn().mockReturnValue({ id: 'op-2' }) },
          $transaction: jest.fn().mockRejectedValue(new Error('Transaction serialization conflict')),
        } as any;

        const notificationService = {
          dispatchOrderUpdate: jest.fn(),
        } as any;

        const productService = {} as any;

        const service = new OrderService(prisma, cartService, productService, notificationService);

        await expect(
          service.createOrder(
            'user-1',
            undefined,
            undefined,
            { address: '123 Tech Park', city: 'Bengaluru' },
            '+919876543210',
            undefined,
            'customer@example.com',
          ),
        ).rejects.toThrow(ServiceUnavailableException);

        // Cart must NOT be cleared when order fails
        expect(cartService.clearCart).not.toHaveBeenCalled();
        expect(notificationService.dispatchOrderUpdate).not.toHaveBeenCalled();
      });

      it('createOrder rejects with BadRequestException (400) if email or phone is missing', async () => {
        const mockCart = {
          cart: {
            id: 'cart-1',
            userId: 'user-1',
            items: [{ id: 'ci-1', productId: 'p1', quantity: 1, priceAtAdd: 1000 }],
          },
          total: 1000,
          itemCount: 1,
        };

        const cartService = { getCart: jest.fn().mockResolvedValue(mockCart), clearCart: jest.fn() } as any;
        const prisma = { $transaction: jest.fn() } as any;
        const service = new OrderService(prisma, cartService, {} as any, {} as any);

        // Missing email
        await expect(
          service.createOrder('user-1', undefined, undefined, {}, '+919876543210', undefined, ''),
        ).rejects.toThrow(BadRequestException);

        // Missing phone
        await expect(
          service.createOrder('user-1', undefined, undefined, {}, '', undefined, 'test@example.com'),
        ).rejects.toThrow(BadRequestException);
      });

      it('createOrder sets carrier and trackingNumber to null at creation time', async () => {
        const mockCart = {
          cart: {
            id: 'cart-1',
            userId: 'user-1',
            items: [
              {
                id: 'ci-1',
                productId: 'prod-1',
                quantity: 1,
                priceAtAdd: 50000,
                product: { id: 'prod-1', name: 'ThinkPad', price: 50000 },
              },
            ],
          },
          total: 50000,
          itemCount: 1,
        };

        const cartService = {
          getCart: jest.fn().mockResolvedValue(mockCart),
          clearCart: jest.fn().mockResolvedValue(undefined),
        } as any;

        const prisma = {
          order: { create: jest.fn().mockImplementation(({ data }) => data) },
          orderItem: { create: jest.fn().mockImplementation(({ data }) => data) },
          $transaction: jest.fn().mockResolvedValue([]),
        } as any;

        const notificationService = {
          dispatchOrderUpdate: jest.fn().mockResolvedValue(undefined),
        } as any;

        const service = new OrderService(prisma, cartService, {} as any, notificationService);

        const order = await service.createOrder(
          'user-1',
          undefined,
          undefined,
          { address: '123 Tech Park', city: 'Bengaluru' },
          '+919876543210',
          'Leave at door',
          'buyer@example.com',
        );

        expect(order.carrier).toBeNull();
        expect(order.trackingNumber).toBeNull();
        expect(order.email).toBe('buyer@example.com');
        expect(order.phone).toBe('+919876543210');
        expect(cartService.clearCart).toHaveBeenCalledWith('user-1');
      });
    });
  });

  describe('Development mode with fallback explicitly enabled: old fallback still works', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
      process.env.ALLOW_IN_MEMORY_FALLBACK = 'true';
    });

    it('AddressService.findAll falls back to memory without crashing', async () => {
      const prisma = {
        address: {
          findMany: jest.fn().mockRejectedValue(new Error('Connection refused')),
        },
      } as any;

      const service = new AddressService(prisma);
      const addresses = await service.findAll('dev-user');
      expect(Array.isArray(addresses)).toBe(true);
    });

    it('NotificationService.registerDeviceToken succeeds via fallback', async () => {
      const prisma = {
        deviceToken: {
          findFirst: jest.fn().mockRejectedValue(new Error('Connection refused')),
        },
      } as any;

      const service = new NotificationService(prisma);
      const res = await service.registerDeviceToken('dev-user', 'dev-token', 'ios');
      expect(res.message).toBe('Device token registered successfully');
    });

    it('SupportService.createTicket falls back when order lookup fails', async () => {
      const prisma = {
        user: { findUnique: jest.fn().mockRejectedValue(new Error('Connection refused')) },
        order: { findUnique: jest.fn().mockRejectedValue(new Error('Connection refused')) },
      } as any;

      const service = new SupportService(prisma);
      const ticket = await service.createTicket('dev-user', {
        subject: 'Dev question',
        message: 'Testing fallback',
        orderId: 'ord-dev-1',
      });
      expect(ticket.ticketNumber).toBeDefined();
      expect(ticket.orderNumber).toBe('ORD-ORD-DE');
    });

    it('OrderService.createOrder creates in-memory order and clears cart when fallback is enabled', async () => {
      const mockCart = {
        cart: {
          id: 'cart-1',
          userId: 'dev-user',
          items: [{ id: 'ci-1', productId: 'p1', quantity: 1, priceAtAdd: 1000 }],
        },
        total: 1000,
        itemCount: 1,
      };

      const cartService = {
        getCart: jest.fn().mockResolvedValue(mockCart),
        clearCart: jest.fn().mockResolvedValue(undefined),
      } as any;

      const prisma = {
        order: { create: jest.fn() },
        orderItem: { create: jest.fn() },
        $transaction: jest.fn().mockRejectedValue(new Error('Offline local dev')),
      } as any;

      const notificationService = {
        dispatchOrderUpdate: jest.fn().mockResolvedValue(undefined),
      } as any;

      const service = new OrderService(prisma, cartService, {} as any, notificationService);

      const order = await service.createOrder(
        'dev-user',
        undefined,
        undefined,
        { address: 'Local test address' },
        '+919999999999',
        undefined,
        'dev@example.com',
      );

      expect(order.userId).toBe('dev-user');
      expect(order.email).toBe('dev@example.com');
      expect(order.phone).toBe('+919999999999');
      expect(cartService.clearCart).toHaveBeenCalledWith('dev-user');
    });
  });
});
