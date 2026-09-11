import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from '../../src/modules/order/order.controller';
import { OrderService } from '../../src/modules/order/order.service';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../src/guards/roles.guard';
import { Roles } from '../../src/decorators/roles.decorator';
import { Reflector } from '@nestjs/core';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('OrderController - Security Tests', () => {
  let controller: OrderController;
  let orderService: jest.Mocked<OrderService>;

  const mockUserA = { id: 'user-a', role: 'USER' };
  const mockUserB = { id: 'user-b', role: 'USER' };
  const mockAdmin = { id: 'admin-1', role: 'ADMIN' };

  // Casts are intentional: controller tests verify security logic, not data shape.
  const mockOrderA = {
    id: 'order-1',
    userId: 'user-a',
    status: 'PENDING',
    paymentStatus: 'PENDING',
    orderNumber: 'ORD-001',
    email: 'a@test.com',
    phone: null,
    paymentMethod: null,
    paymentId: null,
    razorpayOrderId: null,
    razorpaySignature: null,
    subtotal: 0,
    discountAmount: 0,
    discountType: null,
    finalAmount: 0,
    shippingAddress: null,
    notes: null,
    referralCode: null,
    referralDiscount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: { id: 'user-a', name: 'A', email: 'a@test.com', role: 'USER' },
    items: [],
    deliveries: [],
    payments: [],
  } as any;

  const mockOrderB = {
    ...mockOrderA,
    id: 'order-2',
    userId: 'user-b',
    status: 'CONFIRMED',
    paymentStatus: 'COMPLETED',
    orderNumber: 'ORD-002',
    user: { id: 'user-b', name: 'B', email: 'b@test.com', role: 'USER' },
  } as any;

  const mockAdminOrder = {
    ...mockOrderA,
    id: 'order-3',
    status: 'SHIPPING',
    orderNumber: 'ORD-003',
  } as any;

  beforeEach(async () => {
    const mockOrderService = {
      findOne: jest.fn(),
      updateStatus: jest.fn(),
      cancelOrder: jest.fn(),
      findByUser: jest.fn(),
      createOrder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrderController],
      providers: [
        {
          provide: OrderService,
          useValue: mockOrderService,
        },
        {
          provide: JwtAuthGuard,
          useValue: { canActivate: jest.fn(() => true) },
        },
        {
          provide: RolesGuard,
          useValue: { canActivate: jest.fn(() => true) },
        },
        {
          provide: Reflector,
          useValue: { getAllAndMerge: jest.fn(() => []) },
        },
      ],
    }).compile();

    controller = module.get<OrderController>(OrderController);
    orderService = module.get(OrderService);
  });

  describe('GET /orders/:id (findOne)', () => {
    it('should return order when user owns it', async () => {
      orderService.findOne.mockResolvedValue(mockOrderA);
      const result = await controller.getOrder(mockUserA, 'order-1');
      expect(result).toEqual(mockOrderA);
      expect(orderService.findOne).toHaveBeenCalledWith('order-1', 'user-a', 'USER');
    });

    it('should return order when admin requests any order', async () => {
      orderService.findOne.mockResolvedValue(mockOrderB);
      const result = await controller.getOrder(mockAdmin, 'order-2');
      expect(result).toEqual(mockOrderB);
      expect(orderService.findOne).toHaveBeenCalledWith('order-2', 'admin-1', 'ADMIN');
    });

    it('should throw ForbiddenException when user A tries to access user B order', async () => {
      orderService.findOne.mockRejectedValue(new ForbiddenException('Access denied: You can only view your own orders'));
      await expect(controller.getOrder(mockUserA, 'order-2')).rejects.toThrow(ForbiddenException);
      expect(orderService.findOne).toHaveBeenCalledWith('order-2', 'user-a', 'USER');
    });

    it('should throw NotFoundException when order does not exist', async () => {
      orderService.findOne.mockRejectedValue(new NotFoundException('Order with id order-999 not found'));
      await expect(controller.getOrder(mockUserA, 'order-999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('PUT /orders/:id/status (updateStatus) - Admin only', () => {
    it('should allow admin to update any order status', async () => {
      orderService.updateStatus.mockResolvedValue({ ...mockOrderA, status: 'DELIVERED', paymentStatus: 'COMPLETED' });
      const result = await controller.updateStatus(mockAdmin, 'order-1', 'DELIVERED');
      expect(result.status).toBe('DELIVERED');
      expect(orderService.updateStatus).toHaveBeenCalledWith('order-1', 'DELIVERED', 'admin-1', 'ADMIN');
    });

    it('should reject non-admin user trying to update status', async () => {
      // RolesGuard would block this before reaching controller, but we test service layer
      orderService.updateStatus.mockRejectedValue(new ForbiddenException('Insufficient permissions'));
      await expect(controller.updateStatus(mockUserA, 'order-1', 'DELIVERED')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('PATCH /orders/:id/cancel (cancelOrder)', () => {
    it('should allow user to cancel their own PENDING order', async () => {
      const cancelledOrder = {
        ...mockOrderA,
        status: 'CANCELLED',
        paymentStatus: 'REFUNDED',
        refundRequired: false,
        refundMessage: null,
      };
      orderService.cancelOrder.mockResolvedValue(cancelledOrder);
      const result = await controller.cancelOrder(mockUserA, 'order-1');
      expect(result.status).toBe('CANCELLED');
      expect(result.refundRequired).toBe(false);
      expect(orderService.cancelOrder).toHaveBeenCalledWith('order-1', 'user-a', 'USER');
    });

    it('should allow user to cancel their own CONFIRMED order', async () => {
      const confirmedOrder = { ...mockOrderA, status: 'CONFIRMED' };
      const cancelledOrder = {
        ...confirmedOrder,
        status: 'CANCELLED',
        paymentStatus: 'REFUNDED',
        refundRequired: false,
        refundMessage: null,
      };
      orderService.cancelOrder.mockResolvedValue(cancelledOrder);
      const result = await controller.cancelOrder(mockUserA, 'order-1');
      expect(result.status).toBe('CANCELLED');
    });

    it('should allow admin to cancel any order', async () => {
      const cancelledOrder = {
        ...mockOrderB,
        status: 'CANCELLED',
        paymentStatus: 'REFUNDED',
        refundRequired: true,
        refundMessage: 'Payment was completed - refund needs to be processed via Razorpay',
      };
      orderService.cancelOrder.mockResolvedValue(cancelledOrder);
      const result = await controller.cancelOrder(mockAdmin, 'order-2');
      expect(result.status).toBe('CANCELLED');
      expect(result.refundRequired).toBe(true);
    });

    it('should throw ForbiddenException when user A tries to cancel user B order', async () => {
      orderService.cancelOrder.mockRejectedValue(new ForbiddenException('Access denied: You can only cancel your own orders'));
      await expect(controller.cancelOrder(mockUserA, 'order-2')).rejects.toThrow(ForbiddenException);
      expect(orderService.cancelOrder).toHaveBeenCalledWith('order-2', 'user-a', 'USER');
    });

    it('should throw BadRequestException when trying to cancel SHIPPING order', async () => {
      orderService.cancelOrder.mockRejectedValue(new BadRequestException('Cannot cancel order in status "SHIPPING". Orders can only be cancelled when PENDING or CONFIRMED.'));
      await expect(controller.cancelOrder(mockUserA, 'order-3')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when order does not exist', async () => {
      orderService.cancelOrder.mockRejectedValue(new NotFoundException('Order with id order-999 not found'));
      await expect(controller.cancelOrder(mockUserA, 'order-999')).rejects.toThrow(NotFoundException);
    });
  });
});

describe('OrderService - Security Logic', () => {
  let orderService: OrderService;
  let prisma: any;

  const mockUserA = { id: 'user-a', role: 'USER' };
  const mockUserB = { id: 'user-b', role: 'USER' };
  const mockAdmin = { id: 'admin-1', role: 'ADMIN' };

  beforeEach(() => {
    prisma = {
      order: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      product: {
        update: jest.fn(),
      },
    };
    orderService = new OrderService(prisma, {} as any, {} as any, {} as any);
  });

  describe('findOne', () => {
    it('returns order when user owns it', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 'o1', userId: 'user-a' });
      const result = await orderService.findOne('o1', 'user-a', 'USER');
      expect(result.userId).toBe('user-a');
    });

    it('returns order when admin requests it', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 'o2', userId: 'user-b' });
      const result = await orderService.findOne('o2', 'admin-1', 'ADMIN');
      expect(result.userId).toBe('user-b');
    });

    it('throws ForbiddenException when user requests another user order', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 'o2', userId: 'user-b' });
      await expect(orderService.findOne('o2', 'user-a', 'USER')).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when order does not exist', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      await expect(orderService.findOne('o999', 'user-a', 'USER')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('allows admin to update any order status', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 'o1', userId: 'user-a', status: 'PENDING' });
      prisma.order.update.mockResolvedValue({ id: 'o1', userId: 'user-a', status: 'DELIVERED', paymentStatus: 'COMPLETED' });
      const result = await orderService.updateStatus('o1', 'DELIVERED', 'admin-1', 'ADMIN');
      expect(result.status).toBe('DELIVERED');
    });

    it('throws ForbiddenException when non-admin tries to update another user order', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 'o2', userId: 'user-b', status: 'PENDING' });
      await expect(orderService.updateStatus('o2', 'DELIVERED', 'user-a', 'USER')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('cancelOrder', () => {
    it('allows user to cancel their own PENDING order', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'o1',
        userId: 'user-a',
        status: 'PENDING',
        paymentStatus: 'PENDING',
        items: [],
        payments: [],
      });
      prisma.order.update.mockResolvedValue({ id: 'o1', status: 'CANCELLED', paymentStatus: 'REFUNDED', items: [] });
      const result = await orderService.cancelOrder('o1', 'user-a', 'USER');
      expect(result.status).toBe('CANCELLED');
      expect(result.refundRequired).toBe(false);
    });

    it('allows user to cancel their own CONFIRMED order', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'o2',
        userId: 'user-a',
        status: 'CONFIRMED',
        paymentStatus: 'PENDING',
        items: [],
        payments: [],
      });
      prisma.order.update.mockResolvedValue({ id: 'o2', status: 'CANCELLED', paymentStatus: 'REFUNDED', items: [] });
      const result = await orderService.cancelOrder('o2', 'user-a', 'USER');
      expect(result.status).toBe('CANCELLED');
    });

    it('throws BadRequestException when trying to cancel SHIPPING order', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'o3',
        userId: 'user-a',
        status: 'SHIPPING',
        paymentStatus: 'COMPLETED',
        items: [],
        payments: [],
      });
      await expect(orderService.cancelOrder('o3', 'user-a', 'USER')).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException when user tries to cancel another user order', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'o2',
        userId: 'user-b',
        status: 'PENDING',
        paymentStatus: 'PENDING',
        items: [],
        payments: [],
      });
      await expect(orderService.cancelOrder('o2', 'user-a', 'USER')).rejects.toThrow(ForbiddenException);
    });

    it('flags refundRequired when payment was completed', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'o4',
        userId: 'user-a',
        status: 'PENDING',
        paymentStatus: 'COMPLETED',
        items: [],
        payments: [{ id: 'pay-1' }],
      });
      prisma.order.update.mockResolvedValue({ id: 'o4', status: 'CANCELLED', paymentStatus: 'REFUNDED', items: [] });
      const result = await orderService.cancelOrder('o4', 'user-a', 'USER');
      expect(result.refundRequired).toBe(true);
      expect(result.refundMessage).toContain('Razorpay');
    });

    it('restores product stock on cancellation', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 'o5',
        userId: 'user-a',
        status: 'PENDING',
        paymentStatus: 'PENDING',
        items: [{ productId: 'prod-1', quantity: 2 }],
        payments: [],
      });
      prisma.order.update.mockResolvedValue({ id: 'o5', status: 'CANCELLED', paymentStatus: 'REFUNDED', items: [{ productId: 'prod-1', quantity: 2 }] });
      await orderService.cancelOrder('o5', 'user-a', 'USER');
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: { stock: { increment: 2 } },
      });
    });
  });
});