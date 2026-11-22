import { BadRequestException } from '@nestjs/common';
import { AdminService } from '../../src/modules/admin/admin.service';
import { AdminController } from '../../src/modules/admin/admin.controller';
import { ROLES_KEY } from '../../src/decorators/roles.decorator';

describe('AdminService & AdminController Manual Refunds and Cancellation Restocking', () => {
  let prisma: any;
  let paymentService: any;
  let adminService: AdminService;

  beforeEach(() => {
    prisma = {
      order: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      product: {
        update: jest.fn().mockResolvedValue({}),
      },
      productVariant: {
        update: jest.fn().mockResolvedValue({}),
      },
      delivery: {
        update: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn().mockImplementation(async (cb: any) => cb(prisma)),
    };
    paymentService = {
      refundPayment: jest.fn().mockResolvedValue({ status: 'REFUNDED', refundId: 'rfnd_1', amountPaise: 50000 }),
    };
    adminService = new AdminService(prisma, undefined, undefined, undefined, undefined, paymentService);
  });

  it('requires ADMIN role on AdminController.triggerOrderRefund', () => {
    const roles = Reflect.getMetadata(ROLES_KEY, AdminController.prototype.triggerOrderRefund);
    expect(roles).toEqual(['ADMIN']);
  });

  it('cancelling a paid order sets REFUND_PENDING (not REFUNDED), restocks variants/products, updates inventoryStatus, and does not auto-refund', async () => {
    const paidOrder = {
      id: 'ord-cancel-1',
      status: 'CONFIRMED',
      paymentStatus: 'COMPLETED',
      inventoryStatus: 'CONSUMED',
      paymentMethod: 'razorpay',
      paymentId: 'pay_1',
      items: [
        { id: 'i1', productId: 'prod-1', variantId: 'var-1', quantity: 2, status: 'ACTIVE' },
        { id: 'i2', productId: 'prod-2', variantId: null, quantity: 1, status: 'ACTIVE' },
        { id: 'i3', productId: 'prod-3', variantId: 'var-3', quantity: 1, status: 'CANCELLED' },
      ],
      deliveries: [],
    };
    prisma.order.findUnique.mockResolvedValue(paidOrder);
    prisma.order.update.mockImplementation(async ({ data }: any) => ({
      ...paidOrder,
      ...data,
      user: { id: 'u1', name: 'Customer', email: 'c@example.com' },
    }));

    const result = await adminService.updateOrderStatus('ord-cancel-1', 'CANCELLED', 'admin-1');

    expect(result.paymentStatus).toBe('REFUND_PENDING');
    expect(result.paymentStatus).not.toBe('REFUNDED');
    expect(prisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'CANCELLED',
          paymentStatus: 'REFUND_PENDING',
          inventoryStatus: 'RELEASED',
          reservationExpiresAt: null,
        }),
      }),
    );
    expect(prisma.productVariant.update).toHaveBeenCalledTimes(1);
    expect(prisma.productVariant.update).toHaveBeenCalledWith({
      where: { id: 'var-1' },
      data: { stock: { increment: 2 } },
    });
    expect(prisma.product.update).toHaveBeenCalledTimes(1);
    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 'prod-2' },
      data: { stock: { increment: 1 } },
    });
    expect(paymentService.refundPayment).not.toHaveBeenCalled();
  });

  it('triggers manual full or partial item refund and rejects already-refunded / non-razorpay orders', async () => {
    prisma.order.findUnique.mockResolvedValueOnce({
      id: 'ord-ref-1',
      status: 'CANCELLED',
      paymentStatus: 'REFUND_PENDING',
      paymentMethod: 'razorpay',
      paymentId: 'pay_manual_1',
      payments: [{ id: 'p1', razorpayPaymentId: 'pay_manual_1', status: 'COMPLETED' }],
      items: [],
    });

    const fullRes = await adminService.triggerOrderRefund('ord-ref-1', 'admin-1', { reason: 'Customer request' });
    expect(fullRes.status).toBe('REFUNDED');
    expect(paymentService.refundPayment).toHaveBeenCalledWith('ord-ref-1', 'pay_manual_1', {
      amountPaise: undefined,
      orderItemId: undefined,
      adminUserId: 'admin-1',
      reason: 'Customer request',
    });

    prisma.order.findUnique.mockResolvedValueOnce({
      id: 'ord-already',
      status: 'CANCELLED',
      paymentStatus: 'REFUNDED',
      paymentMethod: 'razorpay',
      paymentId: 'pay_done',
    });
    await expect(adminService.triggerOrderRefund('ord-already', 'admin-1')).rejects.toThrow(BadRequestException);

    prisma.order.findUnique.mockResolvedValueOnce({
      id: 'ord-cod',
      status: 'CANCELLED',
      paymentStatus: 'PENDING',
      paymentMethod: 'cod',
      paymentId: null,
      payments: [],
    });
    await expect(adminService.triggerOrderRefund('ord-cod', 'admin-1')).rejects.toThrow(BadRequestException);
  });
});

