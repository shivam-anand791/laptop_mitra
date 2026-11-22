import { OrderService } from '../../src/modules/order/order.service';
import { createNoTaxService } from '../helpers/no-tax-service';

describe('OrderService Reservation Cleanup (Phase 3)', () => {
  const createDeps = () => {
    const prisma: any = {
      order: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      product: { update: jest.fn().mockResolvedValue({}) },
      productVariant: { update: jest.fn().mockResolvedValue({}) },
      referralRedemption: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
      cart: { findFirst: jest.fn().mockResolvedValue(null) },
      address: { findFirst: jest.fn() },
      $transaction: jest.fn().mockImplementation(async (cb: any) => cb(prisma)),
    };
    const pincodeService: any = {
      validateOrderShipping: jest.fn().mockResolvedValue({
        city: 'Delhi',
        district: 'New Delhi',
        state: 'Delhi',
        pincode: '110001',
      }),
    };
    const discountService: any = {
      restoreOrderDiscount: jest.fn().mockResolvedValue(undefined),
    };
    const orderService = new OrderService(
      prisma,
      { clearCart: jest.fn() } as any,
      {} as any,
      { dispatchOrderUpdate: jest.fn() } as any,
      discountService,
      pincodeService,
      createNoTaxService(),
    );
    return { orderService, prisma };
  };

  it('runs expireAbandonedReservations() immediately on boot in onModuleInit and registers interval', async () => {
    const { orderService } = createDeps();
    const sweepSpy = jest.spyOn(orderService, 'expireAbandonedReservations').mockResolvedValue(0);

    try {
      orderService.onModuleInit();
      expect(sweepSpy).toHaveBeenCalledTimes(1);
    } finally {
      orderService.onModuleDestroy();
    }
  });

  it('coalesces concurrent expireAbandonedReservations calls safely (single-flight)', async () => {
    const { orderService, prisma } = createDeps();
    let resolveFindMany!: (val: any[]) => void;
    prisma.order.findMany.mockImplementationOnce(
      () =>
        new Promise<any[]>((resolve) => {
          resolveFindMany = resolve;
        }),
    );

    const p1 = orderService.expireAbandonedReservations();
    const p2 = orderService.expireAbandonedReservations();
    expect(prisma.order.findMany).toHaveBeenCalledTimes(1);

    resolveFindMany([]);
    await expect(Promise.all([p1, p2])).resolves.toEqual([0, 0]);
  });

  it('runs lazy reservation cleanup before createOrder stock reservation and avoids throwing if sweep fails', async () => {
    const { orderService } = createDeps();
    const sweepSpy = jest.spyOn(orderService, 'expireAbandonedReservations').mockResolvedValue(1);

    // Calling createOrder with empty cart triggers lazy sweep before failing inside stock/cart check
    await expect(
      orderService.createOrder(
        'user-1',
        undefined,
        undefined,
        { fullName: 'Test', address: '123 St', city: 'Delhi', pincode: '110001' },
        '9999999999',
        undefined,
        'u@example.com',
        { id: 'user-1', role: 'CUSTOMER', email: 'u@example.com', phone: '9999999999' },
        'razorpay',
      ),
    ).rejects.toThrow('Cart is empty');

    expect(sweepSpy).toHaveBeenCalledTimes(1);
  });
});
