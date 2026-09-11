"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const order_controller_1 = require("../../src/modules/order/order.controller");
const order_service_1 = require("../../src/modules/order/order.service");
const jwt_auth_guard_1 = require("../../src/auth/guards/jwt-auth.guard");
const roles_guard_1 = require("../../src/guards/roles.guard");
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
describe('OrderController - Security Tests', () => {
    let controller;
    let orderService;
    const mockUserA = { id: 'user-a', role: 'USER' };
    const mockUserB = { id: 'user-b', role: 'USER' };
    const mockAdmin = { id: 'admin-1', role: 'ADMIN' };
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
    };
    const mockOrderB = {
        ...mockOrderA,
        id: 'order-2',
        userId: 'user-b',
        status: 'CONFIRMED',
        paymentStatus: 'COMPLETED',
        orderNumber: 'ORD-002',
        user: { id: 'user-b', name: 'B', email: 'b@test.com', role: 'USER' },
    };
    const mockAdminOrder = {
        ...mockOrderA,
        id: 'order-3',
        status: 'SHIPPING',
        orderNumber: 'ORD-003',
    };
    beforeEach(async () => {
        const mockOrderService = {
            findOne: jest.fn(),
            updateStatus: jest.fn(),
            cancelOrder: jest.fn(),
            findByUser: jest.fn(),
            createOrder: jest.fn(),
        };
        const module = await testing_1.Test.createTestingModule({
            controllers: [order_controller_1.OrderController],
            providers: [
                {
                    provide: order_service_1.OrderService,
                    useValue: mockOrderService,
                },
                {
                    provide: jwt_auth_guard_1.JwtAuthGuard,
                    useValue: { canActivate: jest.fn(() => true) },
                },
                {
                    provide: roles_guard_1.RolesGuard,
                    useValue: { canActivate: jest.fn(() => true) },
                },
                {
                    provide: core_1.Reflector,
                    useValue: { getAllAndMerge: jest.fn(() => []) },
                },
            ],
        }).compile();
        controller = module.get(order_controller_1.OrderController);
        orderService = module.get(order_service_1.OrderService);
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
            orderService.findOne.mockRejectedValue(new common_1.ForbiddenException('Access denied: You can only view your own orders'));
            await expect(controller.getOrder(mockUserA, 'order-2')).rejects.toThrow(common_1.ForbiddenException);
            expect(orderService.findOne).toHaveBeenCalledWith('order-2', 'user-a', 'USER');
        });
        it('should throw NotFoundException when order does not exist', async () => {
            orderService.findOne.mockRejectedValue(new common_1.NotFoundException('Order with id order-999 not found'));
            await expect(controller.getOrder(mockUserA, 'order-999')).rejects.toThrow(common_1.NotFoundException);
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
            orderService.updateStatus.mockRejectedValue(new common_1.ForbiddenException('Insufficient permissions'));
            await expect(controller.updateStatus(mockUserA, 'order-1', 'DELIVERED')).rejects.toThrow(common_1.ForbiddenException);
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
            orderService.cancelOrder.mockRejectedValue(new common_1.ForbiddenException('Access denied: You can only cancel your own orders'));
            await expect(controller.cancelOrder(mockUserA, 'order-2')).rejects.toThrow(common_1.ForbiddenException);
            expect(orderService.cancelOrder).toHaveBeenCalledWith('order-2', 'user-a', 'USER');
        });
        it('should throw BadRequestException when trying to cancel SHIPPING order', async () => {
            orderService.cancelOrder.mockRejectedValue(new common_1.BadRequestException('Cannot cancel order in status "SHIPPING". Orders can only be cancelled when PENDING or CONFIRMED.'));
            await expect(controller.cancelOrder(mockUserA, 'order-3')).rejects.toThrow(common_1.BadRequestException);
        });
        it('should throw NotFoundException when order does not exist', async () => {
            orderService.cancelOrder.mockRejectedValue(new common_1.NotFoundException('Order with id order-999 not found'));
            await expect(controller.cancelOrder(mockUserA, 'order-999')).rejects.toThrow(common_1.NotFoundException);
        });
    });
});
describe('OrderService - Security Logic', () => {
    let orderService;
    let prisma;
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
        orderService = new order_service_1.OrderService(prisma, {}, {}, {});
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
            await expect(orderService.findOne('o2', 'user-a', 'USER')).rejects.toThrow(common_1.ForbiddenException);
        });
        it('throws NotFoundException when order does not exist', async () => {
            prisma.order.findUnique.mockResolvedValue(null);
            await expect(orderService.findOne('o999', 'user-a', 'USER')).rejects.toThrow(common_1.NotFoundException);
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
            await expect(orderService.updateStatus('o2', 'DELIVERED', 'user-a', 'USER')).rejects.toThrow(common_1.ForbiddenException);
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
            await expect(orderService.cancelOrder('o3', 'user-a', 'USER')).rejects.toThrow(common_1.BadRequestException);
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
            await expect(orderService.cancelOrder('o2', 'user-a', 'USER')).rejects.toThrow(common_1.ForbiddenException);
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
//# sourceMappingURL=order.controller.spec.js.map