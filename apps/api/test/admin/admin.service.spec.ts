/// <reference types="jest" />
import { BadRequestException, NotFoundException, ForbiddenException, ServiceUnavailableException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { AdminService } from '../../src/modules/admin/admin.service';
import { AdminController } from '../../src/modules/admin/admin.controller';
import { RolesGuard } from '../../src/guards/roles.guard';
import { AdminPaginationDto } from '../../src/modules/admin/dto/admin-pagination.dto';
import { AdminOrderQueryDto } from '../../src/modules/admin/dto/admin-order-query.dto';
import { AdminAnalyticsQueryDto } from '../../src/modules/admin/dto/admin-analytics-query.dto';

describe('AdminService & AdminController (Phase 3 & Phase 4 Backend Correctness)', () => {
  let adminService: AdminService;
  let adminController: AdminController;
  let prismaMock: any;
  let firebaseServiceMock: any;

  beforeEach(() => {
    prismaMock = {
      $transaction: jest.fn(async (cb: (tx: any) => Promise<any>) => cb(prismaMock)),
      user: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      product: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      order: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn(),
        groupBy: jest.fn(),
      },
      orderItem: {
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      delivery: {
        findFirst: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
      cartItem: {
        deleteMany: jest.fn(),
      },
      wishlistItem: {
        deleteMany: jest.fn(),
      },
      productImage: {
        deleteMany: jest.fn(),
      },
    };

    firebaseServiceMock = {
      revokeRefreshTokens: jest.fn().mockResolvedValue(undefined),
    };

    adminService = new AdminService(prismaMock, firebaseServiceMock);
    adminController = new AdminController(adminService);
  });

  describe('User Management (Task 6)', () => {
    it('returns all users without exposing sensitive authentication tokens', async () => {
      const mockUsers = [
        { id: 'u1', name: 'Admin User', email: 'admin@laptopmitra.com', role: 'ADMIN', status: 'ACTIVE' },
        { id: 'u2', name: 'Customer User', email: 'cust@example.com', role: 'CUSTOMER', status: 'ACTIVE' },
      ];
      prismaMock.user.findMany.mockResolvedValue(mockUsers);
      prismaMock.user.count.mockResolvedValue(2);

      const result = await adminService.getAllUsers();
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            id: true,
            email: true,
            role: true,
            status: true,
          }),
        }),
      );
    });

    it('updates user status when allowed', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'u2', role: 'CUSTOMER', status: 'ACTIVE', firebaseUid: 'f-u2' });
      prismaMock.user.update.mockResolvedValue({ id: 'u2', status: 'SUSPENDED' });

      const updated = await adminService.updateUserStatus('u2', 'SUSPENDED', 'admin-1');
      expect(updated.status).toBe('SUSPENDED');
      expect(prismaMock.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u2' },
          data: { status: 'SUSPENDED' },
        }),
      );
      expect(firebaseServiceMock.revokeRefreshTokens).toHaveBeenCalledWith('f-u2');
    });

    it('forbids an administrator from suspending their own account (self-suspend forbidden)', async () => {
      await expect(
        adminService.updateUserStatus('admin-1', 'SUSPENDED', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('forbids an administrator from modifying status of another administrator', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'admin-2', role: 'ADMIN', status: 'ACTIVE' });

      await expect(
        adminService.updateUserStatus('admin-2', 'SUSPENDED', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('rejects invalid user status with 400', async () => {
      await expect(
        adminService.updateUserStatus('u2', 'SUPER_ADMIN', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns 404 when user is not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(
        adminService.updateUserStatus('non-existent', 'ACTIVE', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Order State Machine & Transition Rules (Tasks 1, 2, 4)', () => {
    it('rejects invalid order status with 400', async () => {
      await expect(
        adminService.updateOrderStatus('ord-1', 'INVALID_STATUS', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('returns 404 when order is not found', async () => {
      prismaMock.order.findUnique.mockResolvedValue(null);
      await expect(
        adminService.updateOrderStatus('missing-order', 'CONFIRMED', 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });

    describe('Legal Transitions', () => {
      it('allows PENDING -> CONFIRMED', async () => {
        const order = { id: 'ord-1', status: 'PENDING', paymentMethod: 'cod', paymentStatus: 'PENDING', items: [], deliveries: [] };
        prismaMock.order.findUnique.mockResolvedValue(order);
        prismaMock.order.update.mockResolvedValue({ ...order, status: 'CONFIRMED' });

        const result = await adminService.updateOrderStatus('ord-1', 'CONFIRMED', 'admin-1');
        expect(result.status).toBe('CONFIRMED');
      });

      it('allows PENDING -> CANCELLED', async () => {
        const order = { id: 'ord-1', status: 'PENDING', paymentMethod: 'cod', paymentStatus: 'PENDING', items: [], deliveries: [] };
        prismaMock.order.findUnique.mockResolvedValue(order);
        prismaMock.order.update.mockResolvedValue({ ...order, status: 'CANCELLED' });

        const result = await adminService.updateOrderStatus('ord-1', 'CANCELLED', 'admin-1');
        expect(result.status).toBe('CANCELLED');
      });

      it('allows CONFIRMED -> SHIPPING', async () => {
        const order = { id: 'ord-1', status: 'CONFIRMED', paymentMethod: 'razorpay', paymentStatus: 'COMPLETED', items: [], deliveries: [] };
        prismaMock.order.findUnique.mockResolvedValue(order);
        prismaMock.order.update.mockResolvedValue({ ...order, status: 'SHIPPING' });

        const result = await adminService.updateOrderStatus('ord-1', 'SHIPPING', 'admin-1');
        expect(result.status).toBe('SHIPPING');
      });

      it('allows CONFIRMED -> CANCELLED', async () => {
        const order = { id: 'ord-1', status: 'CONFIRMED', paymentMethod: 'cod', paymentStatus: 'PENDING', items: [], deliveries: [] };
        prismaMock.order.findUnique.mockResolvedValue(order);
        prismaMock.order.update.mockResolvedValue({ ...order, status: 'CANCELLED' });

        const result = await adminService.updateOrderStatus('ord-1', 'CANCELLED', 'admin-1');
        expect(result.status).toBe('CANCELLED');
      });

      it('allows SHIPPING -> DELIVERED', async () => {
        const order = { id: 'ord-1', status: 'SHIPPING', paymentMethod: 'cod', paymentStatus: 'PENDING', items: [], deliveries: [] };
        prismaMock.order.findUnique.mockResolvedValue(order);
        prismaMock.order.update.mockResolvedValue({ ...order, status: 'DELIVERED', paymentStatus: 'COMPLETED' });

        const result = await adminService.updateOrderStatus('ord-1', 'DELIVERED', 'admin-1');
        expect(result.status).toBe('DELIVERED');
      });

      it('allows DELIVERED -> REFUNDED', async () => {
        const order = { id: 'ord-1', status: 'DELIVERED', paymentMethod: 'razorpay', paymentStatus: 'COMPLETED', items: [], deliveries: [] };
        prismaMock.order.findUnique.mockResolvedValue(order);
        prismaMock.order.update.mockResolvedValue({ ...order, status: 'REFUNDED' });

        const result = await adminService.updateOrderStatus('ord-1', 'REFUNDED', 'admin-1');
        expect(result.status).toBe('REFUNDED');
      });
    });

    describe('Illegal Transitions (Rejected with 400)', () => {
      it('rejects PENDING -> SHIPPING', async () => {
        prismaMock.order.findUnique.mockResolvedValue({ id: 'ord-1', status: 'PENDING', items: [], deliveries: [] });
        await expect(adminService.updateOrderStatus('ord-1', 'SHIPPING', 'admin-1')).rejects.toThrow(BadRequestException);
      });

      it('rejects PENDING -> DELIVERED', async () => {
        prismaMock.order.findUnique.mockResolvedValue({ id: 'ord-1', status: 'PENDING', items: [], deliveries: [] });
        await expect(adminService.updateOrderStatus('ord-1', 'DELIVERED', 'admin-1')).rejects.toThrow(BadRequestException);
      });

      it('rejects CONFIRMED -> DELIVERED', async () => {
        prismaMock.order.findUnique.mockResolvedValue({ id: 'ord-1', status: 'CONFIRMED', items: [], deliveries: [] });
        await expect(adminService.updateOrderStatus('ord-1', 'DELIVERED', 'admin-1')).rejects.toThrow(BadRequestException);
      });

      it('rejects SHIPPING -> CANCELLED', async () => {
        prismaMock.order.findUnique.mockResolvedValue({ id: 'ord-1', status: 'SHIPPING', items: [], deliveries: [] });
        await expect(adminService.updateOrderStatus('ord-1', 'CANCELLED', 'admin-1')).rejects.toThrow(BadRequestException);
      });

      it('rejects DELIVERED -> CANCELLED', async () => {
        prismaMock.order.findUnique.mockResolvedValue({ id: 'ord-1', status: 'DELIVERED', items: [], deliveries: [] });
        await expect(adminService.updateOrderStatus('ord-1', 'CANCELLED', 'admin-1')).rejects.toThrow(BadRequestException);
      });

      it('rejects transitions from terminal CANCELLED state', async () => {
        prismaMock.order.findUnique.mockResolvedValue({ id: 'ord-1', status: 'CANCELLED', items: [], deliveries: [] });
        await expect(adminService.updateOrderStatus('ord-1', 'CONFIRMED', 'admin-1')).rejects.toThrow(BadRequestException);
        await expect(adminService.updateOrderStatus('ord-1', 'CANCELLED', 'admin-1')).rejects.toThrow(BadRequestException);
      });

      it('rejects transitions from terminal REFUNDED state', async () => {
        prismaMock.order.findUnique.mockResolvedValue({ id: 'ord-1', status: 'REFUNDED', items: [], deliveries: [] });
        await expect(adminService.updateOrderStatus('ord-1', 'DELIVERED', 'admin-1')).rejects.toThrow(BadRequestException);
      });
    });

    describe('Stock Restoration on Cancellation (Task 4)', () => {
      it('restores stock once when moving order to CANCELLED', async () => {
        const order = {
          id: 'ord-cancel',
          status: 'PENDING',
          paymentMethod: 'cod',
          paymentStatus: 'PENDING',
          items: [
            { productId: 'prod-1', quantity: 2 },
            { productId: 'prod-2', quantity: 1 },
          ],
          deliveries: [],
        };
        prismaMock.order.findUnique.mockResolvedValue(order);
        prismaMock.order.update.mockResolvedValue({ ...order, status: 'CANCELLED' });

        await adminService.updateOrderStatus('ord-cancel', 'CANCELLED', 'admin-1');

        expect(prismaMock.product.update).toHaveBeenCalledTimes(2);
        expect(prismaMock.product.update).toHaveBeenCalledWith({
          where: { id: 'prod-1' },
          data: { stock: { increment: 2 } },
        });
        expect(prismaMock.product.update).toHaveBeenCalledWith({
          where: { id: 'prod-2' },
          data: { stock: { increment: 1 } },
        });
      });

      it('does NOT restore stock twice on repeat cancellation attempt', async () => {
        // Order is already CANCELLED
        const cancelledOrder = {
          id: 'ord-cancel',
          status: 'CANCELLED',
          items: [{ productId: 'prod-1', quantity: 2 }],
          deliveries: [],
        };
        prismaMock.order.findUnique.mockResolvedValue(cancelledOrder);

        // Attempting to cancel again must be rejected by the transition map
        await expect(
          adminService.updateOrderStatus('ord-cancel', 'CANCELLED', 'admin-1'),
        ).rejects.toThrow(BadRequestException);

        expect(prismaMock.product.update).not.toHaveBeenCalled();
      });
    });

    describe('Payment Status Rules (Task 4)', () => {
      it('COD delivered marks payment COMPLETED', async () => {
        const order = { id: 'ord-cod', status: 'SHIPPING', paymentMethod: 'cod', paymentStatus: 'PENDING', items: [], deliveries: [] };
        prismaMock.order.findUnique.mockResolvedValue(order);
        prismaMock.order.update.mockResolvedValue({ ...order, status: 'DELIVERED', paymentStatus: 'COMPLETED' });

        await adminService.updateOrderStatus('ord-cod', 'DELIVERED', 'admin-1');

        expect(prismaMock.order.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              status: 'DELIVERED',
              paymentStatus: 'COMPLETED',
            }),
          }),
        );
      });

      it('online payment delivered does NOT touch paymentStatus', async () => {
        const order = { id: 'ord-online', status: 'SHIPPING', paymentMethod: 'razorpay', paymentStatus: 'PENDING', items: [], deliveries: [] };
        prismaMock.order.findUnique.mockResolvedValue(order);
        prismaMock.order.update.mockResolvedValue({ ...order, status: 'DELIVERED', paymentStatus: 'PENDING' });

        await adminService.updateOrderStatus('ord-online', 'DELIVERED', 'admin-1');

        expect(prismaMock.order.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: {
              status: 'DELIVERED',
              updatedAt: expect.any(Date),
            },
          }),
        );
      });

      it('cancelled order marks payment REFUNDED only if paymentStatus was COMPLETED', async () => {
        const paidOrder = { id: 'ord-paid', status: 'CONFIRMED', paymentMethod: 'razorpay', paymentStatus: 'COMPLETED', items: [], deliveries: [] };
        prismaMock.order.findUnique.mockResolvedValue(paidOrder);
        prismaMock.order.update.mockResolvedValue({ ...paidOrder, status: 'CANCELLED', paymentStatus: 'REFUNDED' });

        await adminService.updateOrderStatus('ord-paid', 'CANCELLED', 'admin-1');

        expect(prismaMock.order.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              status: 'CANCELLED',
              paymentStatus: 'REFUNDED',
            }),
          }),
        );
      });

      it('cancelled order does NOT set paymentStatus to REFUNDED if payment was PENDING', async () => {
        const unpaidOrder = { id: 'ord-unpaid', status: 'PENDING', paymentMethod: 'cod', paymentStatus: 'PENDING', items: [], deliveries: [] };
        prismaMock.order.findUnique.mockResolvedValue(unpaidOrder);
        prismaMock.order.update.mockResolvedValue({ ...unpaidOrder, status: 'CANCELLED', paymentStatus: 'PENDING' });

        await adminService.updateOrderStatus('ord-unpaid', 'CANCELLED', 'admin-1');

        expect(prismaMock.order.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: {
              status: 'CANCELLED',
              updatedAt: expect.any(Date),
            },
          }),
        );
      });
    });

    describe('Delivery Synchronization (Task 4)', () => {
      it('updates matching Delivery status to SHIPPED when order transitions to SHIPPING', async () => {
        const order = {
          id: 'ord-deliv',
          status: 'CONFIRMED',
          items: [],
          deliveries: [{ id: 'del-1', status: 'PENDING', shippedAt: null }],
        };
        prismaMock.order.findUnique.mockResolvedValue(order);
        prismaMock.order.update.mockResolvedValue({ ...order, status: 'SHIPPING' });

        await adminService.updateOrderStatus('ord-deliv', 'SHIPPING', 'admin-1');

        expect(prismaMock.delivery.update).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: 'del-1' },
            data: expect.objectContaining({ status: 'SHIPPED' }),
          }),
        );
      });
    });

    describe('Database Failure Resilience (Task 5)', () => {
      it('returns 503 ServiceUnavailableException if database write fails', async () => {
        prismaMock.order.findUnique.mockResolvedValue({ id: 'ord-fail', status: 'PENDING', items: [], deliveries: [] });
        prismaMock.$transaction.mockRejectedValue(new Error('Connection lost to database'));

        await expect(
          adminService.updateOrderStatus('ord-fail', 'CONFIRMED', 'admin-1'),
        ).rejects.toThrow(ServiceUnavailableException);
      });
    });
  });

  describe('Authorization: Non-Admin gets 403 on every /admin route (Task 7 & Phase Check)', () => {
    let reflector: Reflector;
    let rolesGuard: RolesGuard;

    beforeEach(() => {
      reflector = new Reflector();
      rolesGuard = new RolesGuard(reflector);
    });

    function createMockContext(userRole?: string): ExecutionContext {
      return {
        getHandler: () => AdminController.prototype.updateOrderStatus,
        getClass: () => AdminController,
        switchToHttp: () => ({
          getRequest: () => ({
            user: userRole ? { id: 'user-test', role: userRole } : null,
          }),
        }),
      } as unknown as ExecutionContext;
    }

    it('rejects unauthenticated request with 403', () => {
      const context = createMockContext(undefined);
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('rejects CUSTOMER role with 403', () => {
      const context = createMockContext('CUSTOMER');
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('rejects GUEST role with 403', () => {
      const context = createMockContext('GUEST');
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('rejects MODERATOR role with 403 on admin-only routes', () => {
      const context = createMockContext('MODERATOR');
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('allows ADMIN role through', () => {
      const context = createMockContext('ADMIN');
      expect(rolesGuard.canActivate(context)).toBe(true);
    });
  });

  describe('AdminController Endpoint Delegation (Task 3)', () => {
    it('delegates updateUserStatus to adminService with admin context', async () => {
      jest.spyOn(adminService, 'updateUserStatus').mockResolvedValue({ id: 'u1', status: 'SUSPENDED' } as any);
      const res = await adminController.updateUserStatus({ id: 'admin-1' }, 'u1', { status: 'SUSPENDED' });
      expect(res.status).toBe('SUSPENDED');
      expect(adminService.updateUserStatus).toHaveBeenCalledWith('u1', 'SUSPENDED', 'admin-1');
    });

    it('delegates updateOrderStatus to adminService with admin context', async () => {
      jest.spyOn(adminService, 'updateOrderStatus').mockResolvedValue({ id: 'o1', status: 'CONFIRMED' } as any);
      const res = await adminController.updateOrderStatus({ id: 'admin-1' }, 'o1', { status: 'CONFIRMED' });
      expect(res.status).toBe('CONFIRMED');
      expect(adminService.updateOrderStatus).toHaveBeenCalledWith('o1', 'CONFIRMED', 'admin-1');
    });
  });

  describe('Phase 4: Admin Pagination, Aggregates, Lean Shapes & Analytics', () => {
    describe('Task 1: Pagination bounds & DTO validation', () => {
      it('rejects pageSize > 100 via ValidationPipe DTO', async () => {
        const dto = plainToInstance(AdminPaginationDto, { page: 1, pageSize: 120 });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints).toHaveProperty('max');
      });

      it('rejects page < 1 via ValidationPipe DTO', async () => {
        const dto = plainToInstance(AdminPaginationDto, { page: 0, pageSize: 20 });
        const errors = await validate(dto);
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].constraints).toHaveProperty('min');
      });

      it('accepts valid pagination parameters', async () => {
        const dto = plainToInstance(AdminPaginationDto, { page: 2, pageSize: 50, search: 'laptop' });
        const errors = await validate(dto);
        expect(errors).toHaveLength(0);
      });

      it('clamps pageSize to 100 and page to 1 at service layer as safeguard', async () => {
        prismaMock.order.findMany.mockResolvedValue([]);
        prismaMock.order.count.mockResolvedValue(0);

        const result = await adminService.getAllOrders({ page: -5, pageSize: 200 });
        expect(result.page).toBe(1);
        expect(result.pageSize).toBe(100);
        expect(prismaMock.order.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            skip: 0,
            take: 100,
          }),
        );
      });

      it('filters orders by status, paymentStatus, from, to and case-insensitive search', async () => {
        prismaMock.order.findMany.mockResolvedValue([]);
        prismaMock.order.count.mockResolvedValue(0);

        await adminService.getAllOrders({
          page: 1,
          pageSize: 20,
          status: 'CONFIRMED',
          paymentStatus: 'COMPLETED',
          from: '2026-10-01T00:00:00.000Z',
          to: '2026-10-23T23:59:59.000Z',
          search: 'ORD-999',
        });

        expect(prismaMock.order.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              status: 'CONFIRMED',
              paymentStatus: 'COMPLETED',
              createdAt: {
                gte: new Date('2026-10-01T00:00:00.000Z'),
                lte: new Date('2026-10-23T23:59:59.000Z'),
              },
              OR: expect.arrayContaining([
                { orderNumber: { contains: 'ORD-999', mode: 'insensitive' } },
                { email: { contains: 'ORD-999', mode: 'insensitive' } },
                { phone: { contains: 'ORD-999', mode: 'insensitive' } },
                { user: { name: { contains: 'ORD-999', mode: 'insensitive' } } },
                { user: { email: { contains: 'ORD-999', mode: 'insensitive' } } },
              ]),
            }),
          }),
        );
      });

      it('returns lean order shape without deep product relations', async () => {
        const leanOrder = {
          id: 'ord-1',
          orderNumber: 'ORD-001',
          userId: 'u-1',
          status: 'CONFIRMED',
          paymentStatus: 'COMPLETED',
          finalAmount: '12000',
          user: { id: 'u-1', name: 'John Doe', email: 'john@example.com' },
          items: [{ id: 'item-1', productId: 'p-1', quantity: 1, price: '12000', product: { name: 'ThinkPad' } }],
          deliveries: [{ id: 'del-1', status: 'SHIPPED', shippedAt: new Date() }],
        };
        prismaMock.order.findMany.mockResolvedValue([leanOrder]);
        prismaMock.order.count.mockResolvedValue(1);

        const result = await adminService.getAllOrders();
        expect(result.items).toHaveLength(1);
        expect(result.items[0]).toHaveProperty('orderNumber', 'ORD-001');
        expect(result.items[0].items[0]).toHaveProperty('productId', 'p-1');
        // Ensure no full product details like images or descriptions are in lean list
        expect(result.items[0].items[0].product).not.toHaveProperty('description');
        expect(result.items[0].items[0].product).not.toHaveProperty('images');
      });

      it('filters products by lowStock (stock <= 5)', async () => {
        prismaMock.product.findMany.mockResolvedValue([]);
        prismaMock.product.count.mockResolvedValue(0);

        await adminService.getAllProducts({ lowStock: true, status: 'ACTIVE', categoryId: 'cat-laptops' });

        expect(prismaMock.product.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              stock: { lte: 5 },
              status: 'ACTIVE',
              categoryId: 'cat-laptops',
            }),
          }),
        );
      });
    });

    describe('Task 2: Full Order Detail (GET /admin/orders/:id)', () => {
      it('returns full order with user, items, product images, category, payments, and deliveries', async () => {
        const fullOrder = {
          id: 'ord-detail-1',
          orderNumber: 'ORD-DETAIL-001',
          userId: 'user-1',
          status: 'CONFIRMED',
          paymentStatus: 'COMPLETED',
          shippingAddress: { city: 'Bengaluru', pincode: '560001' },
          notes: 'Deliver to front desk',
          user: { id: 'user-1', name: 'John', email: 'john@test.com', phone: '9876543210', role: 'CUSTOMER', status: 'ACTIVE' },
          items: [
            {
              id: 'it-1',
              productId: 'prod-1',
              product: {
                name: 'Laptop Elite',
                images: [{ url: 'https://cdn.example.com/laptop.jpg' }],
                category: { name: 'Laptops' },
              },
            },
          ],
          deliveries: [{ id: 'del-1', status: 'CONFIRMED' }],
          payments: [{ id: 'pay-1', amount: '45000', status: 'COMPLETED' }],
        };
        prismaMock.order.findUnique.mockResolvedValue(fullOrder);

        const res = await adminService.getOrder('ord-detail-1');
        expect(res).toBeDefined();
        expect(res.id).toBe('ord-detail-1');
        expect(res.items[0].product.images).toHaveLength(1);
        expect(res.payments).toHaveLength(1);
      });

      it('throws 404 when order id does not exist', async () => {
        prismaMock.order.findUnique.mockResolvedValue(null);
        await expect(adminService.getOrder('non-existent')).rejects.toThrow(NotFoundException);
      });
    });

    describe('Task 3: Dashboard Stats Aggregation', () => {
      it('computes stats via count() and aggregate() in single Promise.all without order findMany', async () => {
        prismaMock.user.count.mockResolvedValue(50);
        prismaMock.product.count
          .mockResolvedValueOnce(25) // totalProducts
          .mockResolvedValueOnce(3); // lowStockProducts
        prismaMock.order.count
          .mockResolvedValueOnce(100) // totalOrders
          .mockResolvedValueOnce(10)  // pendingOrders
          .mockResolvedValueOnce(80)  // deliveredOrders
          .mockResolvedValueOnce(5);  // ordersToday
        prismaMock.order.aggregate
          .mockResolvedValueOnce({ _sum: { finalAmount: 250000.5 } }) // revenueCompleted
          .mockResolvedValueOnce({ _sum: { finalAmount: 35000.0 } });  // revenuePending

        const stats = await adminService.getDashboardStats();

        // Must NOT use findMany for orders
        expect(prismaMock.order.findMany).not.toHaveBeenCalled();

        expect(stats.totalUsers).toBe(50);
        expect(stats.totalProducts).toBe(25);
        expect(stats.totalOrders).toBe(100);
        expect(stats.pendingOrders).toBe(10);
        expect(stats.deliveredOrders).toBe(80);
        expect(stats.lowStockProducts).toBe(3);
        expect(stats.ordersToday).toBe(5);
        expect(stats.revenueCompleted).toBe(250000.5);
        expect(stats.revenuePending).toBe(35000.0);
        expect(stats.revenue.completed).toBe(250000.5);
        expect(stats.revenue.pending).toBe(35000.0);
      });

      it('handles null aggregate sums safely as 0', async () => {
        prismaMock.user.count.mockResolvedValue(0);
        prismaMock.product.count.mockResolvedValue(0);
        prismaMock.order.count.mockResolvedValue(0);
        prismaMock.order.aggregate.mockResolvedValue({ _sum: { finalAmount: null } });

        const stats = await adminService.getDashboardStats();
        expect(stats.revenueCompleted).toBe(0);
        expect(stats.revenuePending).toBe(0);
        expect(isNaN(stats.revenueCompleted)).toBe(false);
      });
    });

    describe('Task 4: Analytics with Zero-Filling & Top Products', () => {
      it('zero-fills daily metrics for 7d range', async () => {
        const today = new Date().toISOString().split('T')[0];
        prismaMock.user.count.mockResolvedValue(10);
        prismaMock.order.count.mockResolvedValue(5);
        prismaMock.product.count.mockResolvedValue(20);
        prismaMock.order.findMany.mockResolvedValue([
          {
            id: 'ord-1',
            status: 'DELIVERED',
            paymentStatus: 'COMPLETED',
            finalAmount: 1500,
            createdAt: new Date(),
          },
        ]);
        prismaMock.user.findMany.mockResolvedValue([]);
        prismaMock.order.groupBy.mockResolvedValue([
          { status: 'DELIVERED', _count: { _all: 1 } },
        ]);
        prismaMock.orderItem.groupBy.mockResolvedValue([
          { productId: 'p1', _sum: { quantity: 4, price: 6000 } },
        ]);
        prismaMock.product.findMany.mockResolvedValue([
          { id: 'p1', name: 'Dell XPS 13' },
        ]);

        const analytics = await adminService.getAnalytics({ range: '7d' });

        expect(analytics.range).toBe('7d');
        expect(analytics.revenueByDay).toHaveLength(7);
        expect(analytics.ordersByDay).toHaveLength(7);
        expect(analytics.newUsersByDay).toHaveLength(7);

        // Missing days must be zero
        const missingDays = analytics.revenueByDay.filter((d) => d.date !== today);
        expect(missingDays.every((d) => d.amount === 0)).toBe(true);

        // Today must have 1500 revenue
        const todayRevenue = analytics.revenueByDay.find((d) => d.date === today);
        expect(todayRevenue?.amount).toBe(1500);

        // Top products
        expect(analytics.topProducts).toHaveLength(1);
        expect(analytics.topProducts[0]).toEqual({
          id: 'p1',
          name: 'Dell XPS 13',
          units: 4,
          revenue: 6000,
        });

        // Summary
        expect(analytics.summary.totalRevenue).toBe(1500);
        expect(analytics.summary.totalOrders).toBe(1);
      });

      it('handles empty database without throwing or returning NaN', async () => {
        prismaMock.user.count.mockResolvedValue(0);
        prismaMock.order.count.mockResolvedValue(0);
        prismaMock.product.count.mockResolvedValue(0);
        prismaMock.order.findMany.mockResolvedValue([]);
        prismaMock.user.findMany.mockResolvedValue([]);
        prismaMock.order.groupBy.mockResolvedValue([]);
        prismaMock.orderItem.groupBy.mockResolvedValue([]);

        const analytics = await adminService.getAnalytics({ range: '30d' });

        expect(analytics.revenueByDay).toHaveLength(30);
        expect(analytics.topProducts).toHaveLength(0);
        expect(analytics.summary.totalRevenue).toBe(0);
        expect(analytics.summary.totalOrders).toBe(0);
        expect(analytics.summary.totalNewUsers).toBe(0);
      });
    });

    describe('Controller Query Delegation', () => {
      it('delegates getAllOrders with query to service', async () => {
        const query: AdminOrderQueryDto = { page: 1, pageSize: 20, status: 'PENDING' };
        jest.spyOn(adminService, 'getAllOrders').mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });

        const res = await adminController.getAllOrders(query);
        expect(res.page).toBe(1);
        expect(adminService.getAllOrders).toHaveBeenCalledWith(query);
      });

      it('delegates getAnalytics with query to service', async () => {
        const query: AdminAnalyticsQueryDto = { range: '30d' };
        jest.spyOn(adminService, 'getAnalytics').mockResolvedValue({ range: '30d' } as any);

        const res = await adminController.getAnalytics(query);
        expect(res.range).toBe('30d');
        expect(adminService.getAnalytics).toHaveBeenCalledWith(query);
      });

      it('delegates getOrder to service', async () => {
        jest.spyOn(adminService, 'getOrder').mockResolvedValue({ id: 'ord-1' } as any);
        const res = await adminController.getOrder('ord-1');
        expect(res.id).toBe('ord-1');
        expect(adminService.getOrder).toHaveBeenCalledWith('ord-1');
      });
    });
  });
});

