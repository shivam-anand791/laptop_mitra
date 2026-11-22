import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AdminService } from '../../src/modules/admin/admin.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { NotificationService } from '../../src/modules/notifications/notification.service';

describe('AdminService - Courier Tracking & Notification Tests (Section 6.1)', () => {
  let adminService: AdminService;
  let prismaService: any;
  let notificationService: any;

  const mockOrder = {
    id: 'order-101',
    orderNumber: 'LM-ORD-101',
    status: 'CONFIRMED',
    paymentStatus: 'COMPLETED',
    paymentMethod: 'razorpay',
    subtotal: 45000,
    finalAmount: 45000,
    email: 'customer@example.com',
    user: {
      id: 'user-1',
      name: 'John Doe',
      email: 'customer@example.com',
    },
    items: [
      {
        id: 'item-1',
        productId: 'prod-1',
        quantity: 1,
        price: 45000,
        product: {
          id: 'prod-1',
          name: 'ThinkPad T480s',
          stock: 5,
        },
      },
    ],
    deliveries: [
      {
        id: 'del-1',
        orderId: 'order-101',
        status: 'PENDING',
        carrier: null,
        trackingNumber: null,
        shippedAt: null,
        deliveredAt: null,
      },
    ],
  };

  beforeEach(async () => {
    prismaService = {
      order: {
        findUnique: jest.fn().mockResolvedValue(mockOrder),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            ...mockOrder,
            status: data.status,
            paymentStatus: data.paymentStatus || mockOrder.paymentStatus,
          }),
        ),
      },
      delivery: {
        update: jest.fn().mockResolvedValue({ id: 'del-1', status: 'SHIPPED' }),
        create: jest.fn().mockResolvedValue({ id: 'del-2', status: 'SHIPPED' }),
      },
      product: {
        update: jest.fn().mockResolvedValue({ id: 'prod-1' }),
      },
      $transaction: jest.fn().mockImplementation(async (callback) => {
        return callback(prismaService);
      }),
    };

    notificationService = {
      dispatchOrderStatusEmail: jest.fn().mockResolvedValue({ sent: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prismaService },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    adminService = module.get<AdminService>(AdminService);
  });

  describe('Transition to SHIPPING validation', () => {
    it('should throw BadRequestException if courierName or trackingNumber are missing when moving to SHIPPING', async () => {
      await expect(
        adminService.updateOrderStatus('order-101', 'SHIPPING', 'admin-1', {
          courierName: '',
          trackingNumber: '',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        adminService.updateOrderStatus('order-101', 'SHIPPING', 'admin-1', {
          courierName: 'Delhivery',
          trackingNumber: '   ',
        }),
      ).rejects.toThrow('Courier name and tracking number are required when moving order to SHIPPING');
    });

    it('should throw BadRequestException if courierData is not provided at all when moving to SHIPPING', async () => {
      await expect(
        adminService.updateOrderStatus('order-101', 'SHIPPING', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully transition to SHIPPING when courierName and trackingNumber are provided', async () => {
      const result = await adminService.updateOrderStatus('order-101', 'SHIPPING', 'admin-1', {
        courierName: 'BlueDart Express',
        trackingNumber: 'BD987654321IN',
      });

      expect(result.status).toBe('SHIPPING');

      // Verify delivery record was updated with carrier and trackingNumber
      expect(prismaService.delivery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'del-1' },
          data: expect.objectContaining({
            status: 'SHIPPED',
            carrier: 'BlueDart Express',
            trackingNumber: 'BD987654321IN',
          }),
        }),
      );

      // Verify NotificationService sent the branded shipping email
      expect(notificationService.dispatchOrderStatusEmail).toHaveBeenCalledWith(
        expect.anything(),
        'SHIPPING',
        {
          courierName: 'BlueDart Express',
          trackingNumber: 'BD987654321IN',
        },
      );
    });

    it('should create a new delivery record if no delivery record previously existed', async () => {
      const orderWithoutDelivery = {
        ...mockOrder,
        deliveries: [],
      };
      prismaService.order.findUnique.mockResolvedValue(orderWithoutDelivery);

      await adminService.updateOrderStatus('order-101', 'SHIPPING', 'admin-1', {
        courierName: 'DTDC Courier',
        trackingNumber: 'DTDC12345',
      });

      expect(prismaService.delivery.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderId: 'order-101',
            status: 'SHIPPED',
            carrier: 'DTDC Courier',
            trackingNumber: 'DTDC12345',
          }),
        }),
      );
    });
  });

  describe('Lifecycle email triggers', () => {
    it('should trigger notification on DELIVERED transition', async () => {
      const shippingOrder = {
        ...mockOrder,
        status: 'SHIPPING',
      };
      prismaService.order.findUnique.mockResolvedValue(shippingOrder);

      await adminService.updateOrderStatus('order-101', 'DELIVERED', 'admin-1');

      expect(notificationService.dispatchOrderStatusEmail).toHaveBeenCalledWith(
        expect.anything(),
        'DELIVERED',
        undefined,
      );
    });

    it('should trigger notification on CANCELLED transition and restore stock', async () => {
      const pendingOrder = {
        ...mockOrder,
        status: 'PENDING',
      };
      prismaService.order.findUnique.mockResolvedValue(pendingOrder);

      await adminService.updateOrderStatus('order-101', 'CANCELLED', 'admin-1');

      expect(prismaService.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { stock: { increment: 1 } },
      });

      expect(notificationService.dispatchOrderStatusEmail).toHaveBeenCalledWith(
        expect.anything(),
        'CANCELLED',
        undefined,
      );
    });
  });
});
