import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { LeaseService } from '../../src/modules/order/lease.service';
import { OrderService } from '../../src/modules/order/order.service';
import { Prisma } from '@prisma/client';

describe('Proposal E & B\' — Item-Level Cancellation & Lease Contract Engine', () => {
  describe('LeaseService', () => {
    let leaseService: LeaseService;
    let mockPrisma: any;

    beforeEach(() => {
      mockPrisma = {
        $queryRaw: jest.fn().mockResolvedValue([{ nextval: '1005' }]),
        leaseContract: {
          findUnique: jest.fn(),
          findMany: jest.fn(),
          count: jest.fn(),
          create: jest.fn(),
          update: jest.fn(),
        },
        leaseInstallment: {
          create: jest.fn(),
          updateMany: jest.fn(),
        },
        leaseEvent: {
          create: jest.fn(),
        },
        order: {
          findUnique: jest.fn(),
        },
        $transaction: jest.fn((cb) => cb(mockPrisma)),
      };
      leaseService = new LeaseService(mockPrisma as any);
    });

    it('generates sequential lease contract number with LM-LC- prefix', async () => {
      const contractNum = await leaseService.generateContractNumber();
      expect(contractNum).toBe('LM-LC-001005');
    });

    it('creates lease contract and installment schedule with 1st month marked PAID', async () => {
      const mockOrder = {
        id: 'ord-lease-1',
        userId: 'user-cust-1',
        paymentId: 'pay-rzp-123',
        rentalSubscription: { id: 'sub-rzp-456' },
        items: [
          {
            id: 'item-lease-1',
            productId: 'prod-lap-1',
            purchaseMode: 'lease',
            price: 2500,
            tenureMonths: 12,
            quantity: 1,
          },
        ],
      };

      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.leaseContract.findUnique.mockResolvedValue(null);
      mockPrisma.leaseContract.create.mockImplementation(({ data }: any) => ({
        id: 'contract-1',
        ...data,
      }));
      mockPrisma.leaseInstallment.create.mockImplementation(({ data }: any) => ({
        id: `inst-${data.installmentNumber}`,
        ...data,
      }));
      mockPrisma.leaseEvent.create.mockResolvedValue({ id: 'evt-1' });

      const contracts = await leaseService.createLeaseContractsForOrder('ord-lease-1');
      expect(contracts).toHaveLength(1);
      expect(contracts[0].contractNumber).toBe('LM-LC-001005');
      expect(contracts[0].tenureMonths).toBe(12);

      // Verify Installment 1 is created as PAID
      expect(mockPrisma.leaseInstallment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          installmentNumber: 1,
          status: 'PAID',
          paymentId: 'pay-rzp-123',
        }),
      });

      // Verify 12 installments created in total (1 paid + 11 pending)
      expect(mockPrisma.leaseInstallment.create).toHaveBeenCalledTimes(12);

      // Verify immutable creation event
      expect(mockPrisma.leaseEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'CREATED',
          actorRole: 'CUSTOMER',
        }),
      });
    });

    it('allows customer to request buyout for active lease', async () => {
      mockPrisma.leaseContract.findUnique.mockResolvedValue({
        id: 'contract-1',
        userId: 'user-cust-1',
        status: 'ACTIVE',
      });

      const res = await leaseService.requestBuyout('contract-1', 'user-cust-1');
      expect(res.message).toContain('Buyout request logged');
      expect(mockPrisma.leaseEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'BUYOUT_REQUESTED',
          actorRole: 'CUSTOMER',
        }),
      });
    });

    it('allows admin to set buyout quote with configurable validity', async () => {
      mockPrisma.leaseContract.findUnique.mockResolvedValue({
        id: 'contract-1',
        status: 'ACTIVE',
      });
      mockPrisma.leaseContract.update.mockResolvedValue({
        id: 'contract-1',
        buyoutQuoteAmount: new Prisma.Decimal(18000),
        buyoutStatus: 'QUOTED',
      });

      const res = await leaseService.setBuyoutQuote('contract-1', 'admin-1', {
        quoteAmount: 18000,
        validityDays: 15,
      });

      expect(mockPrisma.leaseContract.update).toHaveBeenCalledWith({
        where: { id: 'contract-1' },
        data: expect.objectContaining({
          buyoutStatus: 'QUOTED',
        }),
      });
      expect(mockPrisma.leaseEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'BUYOUT_QUOTED',
          actorRole: 'ADMIN',
        }),
      });
    });

    it('waives pending installments and sets BOUGHT_OUT on buyout completion', async () => {
      mockPrisma.leaseContract.findUnique.mockResolvedValue({
        id: 'contract-1',
        status: 'ACTIVE',
      });
      mockPrisma.leaseContract.update.mockResolvedValue({
        id: 'contract-1',
        status: 'BOUGHT_OUT',
        buyoutStatus: 'PAID',
      });

      await leaseService.completeBuyout('contract-1', 'admin-1', {
        paymentReference: 'UPI-REF-999',
      });

      expect(mockPrisma.leaseInstallment.updateMany).toHaveBeenCalledWith({
        where: { leaseContractId: 'contract-1', status: 'PENDING' },
        data: { status: 'WAIVED' },
      });
      expect(mockPrisma.leaseContract.update).toHaveBeenCalledWith({
        where: { id: 'contract-1' },
        data: { status: 'BOUGHT_OUT', buyoutStatus: 'PAID' },
      });
    });

    it('terminates lease contract and waives future pending installments', async () => {
      mockPrisma.leaseContract.findUnique.mockResolvedValue({
        id: 'contract-1',
        status: 'ACTIVE',
      });
      mockPrisma.leaseContract.update.mockResolvedValue({
        id: 'contract-1',
        status: 'TERMINATED',
      });

      await leaseService.terminateContract('contract-1', 'admin-1', 'Customer returned device');

      expect(mockPrisma.leaseInstallment.updateMany).toHaveBeenCalledWith({
        where: { leaseContractId: 'contract-1', status: 'PENDING' },
        data: { status: 'WAIVED' },
      });
      expect(mockPrisma.leaseContract.update).toHaveBeenCalledWith({
        where: { id: 'contract-1' },
        data: { status: 'TERMINATED' },
      });
    });
  });

  describe('OrderService.cancelOrderItem (Proposal E)', () => {
    let orderService: OrderService;
    let mockPrisma: any;

    beforeEach(() => {
      mockPrisma = {
        order: {
          findUnique: jest.fn(),
          update: jest.fn(),
        },
        orderItem: {
          update: jest.fn(),
        },
        orderItemCancellation: {
          create: jest.fn(),
        },
        product: {
          update: jest.fn().mockResolvedValue({ count: 1 }),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        productVariant: {
          update: jest.fn().mockResolvedValue({ count: 1 }),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        leaseContract: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        leaseInstallment: {
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        refund: {
          create: jest.fn(),
        },
        $transaction: jest.fn((cb) => cb(mockPrisma)),
      };

      const mockNotification = {
        sendCustomerOrderStatusEmail: jest.fn().mockResolvedValue(true),
        sendCustomerNotification: jest.fn().mockResolvedValue(true),
      };

      orderService = new OrderService(
        mockPrisma as any,
        null as any, // CartService
        null as any, // ProductService
        mockNotification as any,
        null as any, // DiscountService
        null as any, // PaymentService
        null as any, // PincodeService
        null as any, // TaxService
        null as any, // LeaseService
      );
    });

    it('rejects cancellation if order has already dispatched or delivered', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'ord-dispatched',
        userId: 'user-1',
        status: 'SHIPPED',
        items: [{ id: 'item-1', status: 'ACTIVE' }],
      });

      await expect(
        orderService.cancelOrderItem('ord-dispatched', 'item-1', 'user-1', 'CUSTOMER', 'Changed mind'),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects cancellation if user does not own the order and is not staff', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 'ord-other-user',
        userId: 'user-different',
        status: 'CONFIRMED',
        items: [{ id: 'item-1', status: 'ACTIVE' }],
      });

      await expect(
        orderService.cancelOrderItem('ord-other-user', 'item-1', 'user-intruder', 'CUSTOMER', 'Cancel'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('successfully cancels 1 item in a multi-item order, recalculating subtotal and restocking inventory', async () => {
      const order = {
        id: 'ord-multi',
        userId: 'user-1',
        status: 'CONFIRMED',
        paymentMethod: 'RAZORPAY',
        paymentStatus: 'PAID',
        inventoryStatus: 'CONSUMED',
        subtotal: new Prisma.Decimal(50000),
        discountAmount: new Prisma.Decimal(2000),
        warrantyAmount: new Prisma.Decimal(1500),
        shippingFee: new Prisma.Decimal(0),
        taxAmount: new Prisma.Decimal(0),
        finalAmount: new Prisma.Decimal(49500),
        items: [
          {
            id: 'item-cancel',
            productId: 'prod-lap-1',
            quantity: 1,
            price: new Prisma.Decimal(30000),
            hasWarranty: true,
            warrantyPrice: new Prisma.Decimal(1500),
            status: 'ACTIVE',
          },
          {
            id: 'item-keep',
            productId: 'prod-lap-2',
            quantity: 1,
            price: new Prisma.Decimal(20000),
            hasWarranty: false,
            warrantyPrice: new Prisma.Decimal(0),
            status: 'ACTIVE',
          },
        ],
        payments: [{ id: 'pay-1', amount: 49500, status: 'PAID' }],
        discountRedemption: null,
      };

      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockPrisma.orderItem.update.mockResolvedValue({ id: 'item-cancel', status: 'CANCELLED' });
      mockPrisma.order.update.mockResolvedValue({ ...order, subtotal: new Prisma.Decimal(20000) });
      mockPrisma.orderItemCancellation.create.mockResolvedValue({ id: 'canc-log-1' });

      const result = await orderService.cancelOrderItem(
        'ord-multi',
        'item-cancel',
        'user-1',
        'CUSTOMER',
        'Found cheaper alternative',
      );

      expect(result.cancelledItem.status).toBe('CANCELLED');
      expect(result.orderCancelled).toBe(false);

      // Restock inventory for cancelled item
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'prod-lap-1' },
        data: { stock: { increment: 1 } },
      });

      // Item marked CANCELLED
      expect(mockPrisma.orderItem.update).toHaveBeenCalledWith({
        where: { id: 'item-cancel' },
        data: expect.objectContaining({
          status: 'CANCELLED',
          refundStatus: 'REFUND_PENDING',
        }),
      });

      // Immutable audit log created
      expect(mockPrisma.orderItemCancellation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: 'ord-multi',
          orderItemId: 'item-cancel',
          reason: 'Found cheaper alternative',
        }),
      });
    });

    it('cancelling the last active item transitions the whole order to CANCELLED', async () => {
      const order = {
        id: 'ord-single',
        userId: 'user-1',
        status: 'PENDING',
        paymentMethod: 'COD',
        paymentStatus: 'PENDING',
        subtotal: new Prisma.Decimal(15000),
        discountAmount: new Prisma.Decimal(0),
        warrantyAmount: new Prisma.Decimal(0),
        shippingFee: new Prisma.Decimal(0),
        taxAmount: new Prisma.Decimal(0),
        finalAmount: new Prisma.Decimal(15000),
        items: [
          {
            id: 'item-last',
            productId: 'prod-lap-3',
            quantity: 1,
            price: new Prisma.Decimal(15000),
            hasWarranty: false,
            status: 'ACTIVE',
          },
        ],
        payments: [],
        discountRedemption: null,
      };

      mockPrisma.order.findUnique.mockResolvedValue(order);
      mockPrisma.orderItem.update.mockResolvedValue({ id: 'item-last', status: 'CANCELLED' });
      mockPrisma.order.update.mockResolvedValue({ ...order, status: 'CANCELLED' });
      mockPrisma.orderItemCancellation.create.mockResolvedValue({ id: 'canc-log-2' });

      await orderService.cancelOrderItem(
        'ord-single',
        'item-last',
        'user-1',
        'CUSTOMER',
        'No longer needed',
      );

      // Order status updated to CANCELLED because it was the last active item
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ord-single' },
          data: expect.objectContaining({
            status: 'CANCELLED',
          }),
        }),
      );
    });
  });
});
