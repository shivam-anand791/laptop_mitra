import { DiscountService } from '../../src/modules/discount/discount.service';
import {
  allocateDiscountProportionally,
  AllocatableItem,
} from '../../src/modules/discount/coupon-allocation';
import {
  CouponStatus,
  CouponType,
  CouponVisibility,
  CreateCouponDto,
  BulkGenerateCouponsDto,
} from '../../src/modules/discount/dto/coupon.dto';

describe('Coupon and Promo Code System', () => {
  let discountService: DiscountService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      discountCode: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      discountRedemption: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
      order: {
        count: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      $transaction: jest.fn((cb) => cb(mockPrisma)),
    };

    discountService = new DiscountService(
      mockPrisma,
      { encrypt: jest.fn(), decrypt: jest.fn(), maskIfsc: jest.fn(), maskAccountNumber: jest.fn(), maskUpiId: jest.fn() } as any,
      { saveQrImage: jest.fn() } as any,
    );
  });

  // ===========================================================================
  // 1. Pure Status Derivation
  // ===========================================================================
  describe('1. Pure Status Derivation', () => {
    const baseNow = new Date('2026-11-03T12:00:00Z');

    it('returns ARCHIVED if status is ARCHIVED regardless of dates or counters', () => {
      const coupon = { status: CouponStatus.ARCHIVED, isActive: true, uses: 0, maxUses: 10 };
      expect(discountService.deriveCouponStatus(coupon, baseNow)).toBe(CouponStatus.ARCHIVED);
    });

    it('returns DRAFT if status is DRAFT', () => {
      const coupon = { status: CouponStatus.DRAFT, isActive: true, uses: 0, maxUses: 10 };
      expect(discountService.deriveCouponStatus(coupon, baseNow)).toBe(CouponStatus.DRAFT);
    });

    it('returns PAUSED if isActive is false or status is PAUSED', () => {
      expect(discountService.deriveCouponStatus({ status: CouponStatus.ACTIVE, isActive: false }, baseNow)).toBe(CouponStatus.PAUSED);
      expect(discountService.deriveCouponStatus({ status: CouponStatus.PAUSED, isActive: true }, baseNow)).toBe(CouponStatus.PAUSED);
    });

    it('returns SCHEDULED if validFrom is in the future', () => {
      const coupon = {
        status: CouponStatus.ACTIVE,
        isActive: true,
        validFrom: new Date('2026-11-05T00:00:00Z'),
        validUntil: new Date('2026-11-10T00:00:00Z'),
        uses: 0,
        maxUses: 100,
      };
      expect(discountService.deriveCouponStatus(coupon, baseNow)).toBe(CouponStatus.SCHEDULED);
    });

    it('returns EXPIRED if validUntil is in the past', () => {
      const coupon = {
        status: CouponStatus.ACTIVE,
        isActive: true,
        validFrom: new Date('2026-10-01T00:00:00Z'),
        validUntil: new Date('2026-11-01T00:00:00Z'),
        uses: 10,
        maxUses: 100,
      };
      expect(discountService.deriveCouponStatus(coupon, baseNow)).toBe(CouponStatus.EXPIRED);
    });

    it('returns EXHAUSTED if uses >= maxUses', () => {
      const coupon = {
        status: CouponStatus.ACTIVE,
        isActive: true,
        uses: 50,
        maxUses: 50,
      };
      expect(discountService.deriveCouponStatus(coupon, baseNow)).toBe(CouponStatus.EXHAUSTED);
    });

    it('returns ACTIVE when within dates and under maxUses', () => {
      const coupon = {
        status: CouponStatus.ACTIVE,
        isActive: true,
        validFrom: new Date('2026-11-01T00:00:00Z'),
        validUntil: new Date('2026-11-10T00:00:00Z'),
        uses: 5,
        maxUses: 50,
      };
      expect(discountService.deriveCouponStatus(coupon, baseNow)).toBe(CouponStatus.ACTIVE);
    });
  });

  // ===========================================================================
  // 2. Proportional Allocation & Line Arithmetic
  // ===========================================================================
  describe('2. Proportional Allocation Engine', () => {
    it('allocates discount proportionally with zero remainder drift', () => {
      const items: AllocatableItem[] = [
        { id: 'item-1', eligiblePaise: 100000 }, // ₹1,000
        { id: 'item-2', eligiblePaise: 200000 }, // ₹2,000
        { id: 'item-3', eligiblePaise: 300000 }, // ₹3,000
      ];
      // Total eligible: 600,000 paise (₹6,000). Total discount 50,000 paise (₹500).
      const allocated = allocateDiscountProportionally(items, 50000);

      expect(allocated).toHaveLength(3);
      const totalAllocated = allocated.reduce((sum, line) => sum + line.allocatedDiscountPaise, 0);
      expect(totalAllocated).toBe(50000);

      // Verify net prices
      expect(allocated[0].netPaise).toBe(100000 - allocated[0].allocatedDiscountPaise);
      expect(allocated[1].netPaise).toBe(200000 - allocated[1].allocatedDiscountPaise);
      expect(allocated[2].netPaise).toBe(300000 - allocated[2].allocatedDiscountPaise);
    });

    it('gives zero allocation to ineligible items (e.g. eligiblePaise 0)', () => {
      const items: AllocatableItem[] = [
        { id: 'laptop', eligiblePaise: 5000000 }, // ₹50,000
        { id: 'warranty', eligiblePaise: 0 }, // warranty excluded
        { id: 'rent-mouse', eligiblePaise: 0 }, // lease excluded
      ];
      const allocated = allocateDiscountProportionally(items, 100000); // ₹1,000 discount

      const laptopLine = allocated.find((a) => a.id === 'laptop');
      const warrantyLine = allocated.find((a) => a.id === 'warranty');
      const rentLine = allocated.find((a) => a.id === 'rent-mouse');

      expect(laptopLine?.allocatedDiscountPaise).toBe(100000);
      expect(laptopLine?.netPaise).toBe(4900000);
      expect(warrantyLine?.allocatedDiscountPaise).toBe(0);
      expect(warrantyLine?.netPaise).toBe(0);
      expect(rentLine?.allocatedDiscountPaise).toBe(0);
      expect(rentLine?.netPaise).toBe(0);
    });

    it('never discounts below zero when discount exceeds eligible total', () => {
      const items: AllocatableItem[] = [
        { id: 'item-1', eligiblePaise: 30000 }, // ₹300
      ];
      // Requested discount 50,000 paise on 30,000 item
      const allocated = allocateDiscountProportionally(items, 50000);
      expect(allocated[0].allocatedDiscountPaise).toBe(30000);
      expect(allocated[0].netPaise).toBe(0);
    });
  });

  // ===========================================================================
  // 3. Customer Discovery (getAvailableCoupons)
  // ===========================================================================
  describe('3. Customer Discovery (getAvailableCoupons)', () => {
    const mockCoupons = [
      {
        id: 'c-flat500',
        code: 'SAVE500',
        title: '₹500 Off',
        type: CouponType.FIXED,
        value: 500,
        status: CouponStatus.ACTIVE,
        isActive: true,
        visibility: CouponVisibility.PUBLIC,
        minOrderValue: 2000,
        excludeWarranty: true,
        allowRentLease: false,
      },
      {
        id: 'c-pct10',
        code: 'FESTIVE10',
        title: '10% Off Festival Special',
        type: CouponType.PERCENTAGE,
        value: 10,
        maxDiscountCap: 1500,
        status: CouponStatus.ACTIVE,
        isActive: true,
        visibility: CouponVisibility.PUBLIC,
        minOrderValue: 5000,
      },
      {
        id: 'c-welcome',
        code: 'FIRSTBUY',
        title: 'First Order Bonus',
        type: CouponType.FIXED,
        value: 300,
        status: CouponStatus.ACTIVE,
        isActive: true,
        visibility: CouponVisibility.PUBLIC,
        firstOrderOnly: true,
      },
    ];

    it('returns eligible coupons with calculated savings and ineligible with plain reason', async () => {
      mockPrisma.discountCode.findMany.mockResolvedValue(mockCoupons);
      mockPrisma.order.count.mockResolvedValue(0); // First time buyer
      mockPrisma.discountRedemption.groupBy.mockResolvedValue([]);

      const res = await discountService.getAvailableCoupons('cust-1', {
        items: [
          {
            productId: 'p-1',
            quantity: 1,
            price: 3000, // ₹3,000
            purchaseMode: 'sell',
          },
        ],
      });

      expect(res.eligible).toHaveLength(2); // SAVE500 (min 2000 met) and FIRSTBUY (first order)
      expect(res.ineligible).toHaveLength(1); // FESTIVE10 (min 5000 needed)

      const save500 = res.eligible.find((c: any) => c.code === 'SAVE500');
      expect(save500.savingsAmount).toBe(500);

      const festive10 = res.ineligible.find((c: any) => c.code === 'FESTIVE10');
      expect(festive10.reason).toContain('Add ₹2,000 more');
    });

    it('marks first-order-only coupons as ineligible for returning buyers', async () => {
      mockPrisma.discountCode.findMany.mockResolvedValue(mockCoupons);
      mockPrisma.order.count.mockResolvedValue(2); // Has 2 prior orders
      mockPrisma.discountRedemption.groupBy.mockResolvedValue([]);

      const res = await discountService.getAvailableCoupons('cust-1', {
        items: [{ productId: 'p-1', quantity: 1, price: 3000, purchaseMode: 'sell' }],
      });

      const firstBuy = res.ineligible.find((c: any) => c.code === 'FIRSTBUY');
      expect(firstBuy).toBeDefined();
      expect(firstBuy.reason).toBe('Valid on first order only');
    });

    it('excludes rental products from discount base when allowRentLease is false', async () => {
      mockPrisma.discountCode.findMany.mockResolvedValue([mockCoupons[0]]);
      mockPrisma.order.count.mockResolvedValue(0);
      mockPrisma.discountRedemption.groupBy.mockResolvedValue([]);

      const res = await discountService.getAvailableCoupons('cust-1', {
        items: [
          {
            productId: 'p-rent',
            quantity: 1,
            price: 5000, // ₹5,000 rent
            purchaseMode: 'lease',
          },
        ],
      });

      expect(res.eligible).toHaveLength(0);
      expect(res.ineligible).toHaveLength(1);
      expect(res.ineligible[0].reason).toBe('This offer applies to outright purchase items only');
    });
  });

  // ===========================================================================
  // 4. Preview Calculation & Policy Enforcements
  // ===========================================================================
  describe('4. Preview Calculation & Policy Enforcements', () => {
    const activeCoupon = {
      id: 'coupon-1',
      code: 'TECH50',
      type: CouponType.PERCENTAGE,
      value: 10,
      maxDiscountCap: 1000,
      status: CouponStatus.ACTIVE,
      isActive: true,
      canCombineWithReferral: false,
      allowedPaymentMethods: 'PREPAID',
    };

    it('rejects coupon when combined with a referral discount if canCombineWithReferral is false', async () => {
      mockPrisma.discountCode.findFirst.mockResolvedValue(activeCoupon);

      await expect(
        discountService.previewCoupon('cust-1', {
          code: 'TECH50',
          items: [{ productId: 'p-1', quantity: 1, price: 2000, purchaseMode: 'sell' }],
          referralCode: 'REF123',
        }),
      ).rejects.toThrow('This coupon cannot be combined with a referral discount');
    });

    it('rejects COD payment when coupon requires PREPAID', async () => {
      mockPrisma.discountCode.findFirst.mockResolvedValue(activeCoupon);

      await expect(
        discountService.previewCoupon('cust-1', {
          code: 'TECH50',
          items: [{ productId: 'p-1', quantity: 1, price: 2000, purchaseMode: 'sell' }],
          paymentMethod: 'COD',
        }),
      ).rejects.toThrow('Valid on prepaid online payments only (UPI / Card / Netbanking)');
    });

    it('enforces max discount cap on percentage coupons', async () => {
      mockPrisma.discountCode.findFirst.mockResolvedValue(activeCoupon); // 10% capped at ₹1000

      const res = await discountService.previewCoupon('cust-1', {
        code: 'TECH50',
        items: [{ productId: 'p-1', quantity: 1, price: 30000, purchaseMode: 'sell' }], // ₹30,000 subtotal
        paymentMethod: 'PREPAID',
      });

      // 10% of 30,000 is 3,000, but capped at 1,000
      expect(res.savingsAmount).toBe(1000);
      expect(res.allocatedLines).toHaveLength(1);
      expect(res.allocatedLines[0].allocatedDiscountPaise).toBe(100000); // 1,000 in paise
    });

    it('enforces per-user usage limits', async () => {
      mockPrisma.discountCode.findFirst.mockResolvedValue({
        ...activeCoupon,
        maxUsesPerUser: 1,
      });
      mockPrisma.discountRedemption.count.mockResolvedValue(1); // Already redeemed once

      await expect(
        discountService.previewCoupon('cust-1', {
          code: 'TECH50',
          items: [{ productId: 'p-1', quantity: 1, price: 2000, purchaseMode: 'sell' }],
          paymentMethod: 'PREPAID',
        }),
      ).rejects.toThrow('You have already redeemed this coupon (1/1 uses)');
    });
  });

  // ===========================================================================
  // 5. Order Transaction: Atomic Consumption & Restoration (No Hard Deletes)
  // ===========================================================================
  describe('5. Order Redemption & Restoration Integrity', () => {
    it('consumes discount and stores immutable audit snapshot with line allocations', async () => {
      mockPrisma.discountCode.findUnique.mockResolvedValue({
        id: 'c-1',
        type: CouponType.FIXED,
        value: 500,
        isActive: true,
        maxUsesPerUser: 2,
      });
      mockPrisma.discountRedemption.count.mockResolvedValue(0);
      mockPrisma.discountCode.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.discountRedemption.create.mockResolvedValue({ id: 'red-1' });

      await discountService.consumeOrderDiscount(
        mockPrisma,
        'c-1',
        'cust-1',
        'order-1',
        5000,
        [{ id: 'p-1', allocatedDiscountPaise: 50000, netPaise: 450000 }],
      );

      // Verifies usage increment
      expect(mockPrisma.discountCode.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'c-1' }),
          data: expect.objectContaining({ uses: { increment: 1 } }),
        }),
      );

      // Verifies immutable snapshot created
      expect(mockPrisma.discountRedemption.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          discountCodeId: 'c-1',
          userId: 'cust-1',
          orderId: 'order-1',
          status: 'REDEEMED',
          discountAmount: '500.00',
          allocatedLines: expect.any(Array),
        }),
      });
    });

    it('restores coupon on order cancellation without hard deleting redemption', async () => {
      mockPrisma.discountRedemption.findUnique.mockResolvedValue({
        id: 'red-1',
        discountCodeId: 'c-1',
        status: 'REDEEMED',
      });
      mockPrisma.discountCode.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.discountRedemption.update.mockResolvedValue({ id: 'red-1', status: 'RESTORED' });

      const restored = await discountService.restoreOrderDiscount(
        mockPrisma,
        'order-1',
        'Order payment failed before capture',
      );

      expect(restored).toBe(true);

      // Verifies usage decrement
      expect(mockPrisma.discountCode.updateMany).toHaveBeenCalledWith({
        where: { id: 'c-1', uses: { gt: 0 } },
        data: {
          uses: { decrement: 1 },
          dailyUses: { decrement: 1 },
        },
      });

      // Verifies status marked RESTORED (NEVER deleted)
      expect(mockPrisma.discountRedemption.update).toHaveBeenCalledWith({
        where: { id: 'red-1' },
        data: expect.objectContaining({
          status: 'RESTORED',
          restorationReason: 'Order payment failed before capture',
        }),
      });
    });

    it('returns false idempotently if redemption is already RESTORED', async () => {
      mockPrisma.discountRedemption.findUnique.mockResolvedValue({
        id: 'red-1',
        status: 'RESTORED',
      });

      const restored = await discountService.restoreOrderDiscount(mockPrisma, 'order-1');
      expect(restored).toBe(false);
      expect(mockPrisma.discountCode.updateMany).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // 6. Admin Coupon CRUD & Bulk Generator
  // ===========================================================================
  describe('6. Admin Coupon Management & Generation', () => {
    it('creates a new coupon and converts code to uppercase', async () => {
      mockPrisma.discountCode.findUnique.mockResolvedValue(null);
      mockPrisma.discountCode.create.mockImplementation(({ data }: any) => Promise.resolve({ id: 'new-1', ...data }));

      const dto: CreateCouponDto = {
        code: 'monsoon50',
        title: 'Monsoon Sale',
        type: CouponType.PERCENTAGE,
        value: 15,
        visibility: CouponVisibility.PUBLIC,
      };

      const res = await discountService.createCoupon('admin-1', dto);

      expect(res.code).toBe('MONSOON50');
      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'CREATE_COUPON', actorUserId: 'admin-1' }),
        }),
      );
    });

    it('archives coupon with soft delete instead of database deletion', async () => {
      mockPrisma.discountCode.findUnique.mockResolvedValue({
        id: 'c-1',
        code: 'OLDCODE',
        status: CouponStatus.ACTIVE,
      });
      mockPrisma.discountCode.update.mockResolvedValue({
        id: 'c-1',
        code: 'OLDCODE',
        status: CouponStatus.ARCHIVED,
        isActive: false,
      });

      const res = await discountService.updateCouponStatus('admin-1', 'c-1', CouponStatus.ARCHIVED);

      expect(res.status).toBe(CouponStatus.ARCHIVED);
      expect(res.isActive).toBe(false);
      expect(mockPrisma.discountCode.update).toHaveBeenCalledWith({
        where: { id: 'c-1' },
        data: { status: CouponStatus.ARCHIVED, isActive: false },
      });
    });

    it('bulk generates unique uppercase alphanumeric codes without ambiguous characters', async () => {
      mockPrisma.discountCode.findMany.mockResolvedValue([]);
      mockPrisma.discountCode.createMany.mockResolvedValue({ count: 5 });

      const dto: BulkGenerateCouponsDto = {
        quantity: 5,
        prefix: 'VIP',
        title: 'VIP Exclusive',
        type: CouponType.FIXED,
        value: 200,
      };

      const res = await discountService.bulkGenerateCoupons('admin-1', dto);

      expect(res.codes).toHaveLength(5);
      for (const code of res.codes) {
        expect(code.startsWith('VIP-')).toBe(true);
        expect(code).toBe(code.toUpperCase());
      }
    });
  });
});
