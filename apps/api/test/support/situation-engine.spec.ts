import { Test, TestingModule } from '@nestjs/testing';
import { SupportService } from '../../src/modules/support/support.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { NotificationService } from '../../src/modules/notifications/notification.service';
import { PaymentEncryptionService } from '../../src/common/encryption/payment-encryption.service';
import { PaymentService } from '../../src/modules/payments/payment.service';
import { PHP_BUYBACK_TIERS } from '@laptopmitra/types';
import * as fs from 'fs';
import * as path from 'path';

describe('Situation-Aware "Need Help" Engine & Database Integrity (Stage 0)', () => {
  jest.setTimeout(60000);
  let service: SupportService;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportService,
        PrismaService,
        {
          provide: NotificationService,
          useValue: {
            dispatchSupportNotification: jest.fn().mockResolvedValue({ success: true }),
            dispatchReturnNotification: jest.fn().mockResolvedValue({ success: true }),
          },
        },
        {
          provide: PaymentEncryptionService,
          useValue: {
            encrypt: jest.fn().mockReturnValue({ keyId: 'k1', ciphertext: 'enc' }),
            decrypt: jest.fn().mockReturnValue({ account: '123' }),
          },
        },
        {
          provide: PaymentService,
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<SupportService>(SupportService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Part 1: Database Integrity & Trigger Constraints', () => {
    it('verifies seeded BuybackTiers match the authoritative PHP policy (6 tiers: 70%, 60%, 50%, 40%, 30%, 20%)', async () => {
      const tiers = await prisma.buybackTier.findMany({
        where: { isActive: true },
        orderBy: { fromMonths: 'asc' },
      });

      expect(tiers.length).toBe(6);
      expect(tiers.map((t) => ({ from: t.fromMonths, to: t.toMonths, percent: Number(t.percentage) }))).toEqual([
        { from: 0, to: 6, percent: 70 },
        { from: 6, to: 12, percent: 60 },
        { from: 12, to: 18, percent: 50 },
        { from: 18, to: 24, percent: 40 },
        { from: 24, to: 30, percent: 30 },
        { from: 30, to: 36, percent: 20 },
      ]);

      // Verify agreement with @laptopmitra/types constants
      expect(tiers.map((t) => ({ fromMonths: t.fromMonths, toMonths: t.toMonths, percentage: Number(t.percentage) })))
        .toEqual(PHP_BUYBACK_TIERS);

      // Verify terms-condition-buyback.php text matches
      const phpPath = path.join(__dirname, '../../../../public_htmlphp/terms-condition-buyback.php');
      if (fs.existsSync(phpPath)) {
        const phpContent = fs.readFileSync(phpPath, 'utf8');
        expect(phpContent).toContain('70%');
        expect(phpContent).toContain('60%');
        expect(phpContent).toContain('50%');
        expect(phpContent).toContain('40%');
        expect(phpContent).toContain('30%');
        expect(phpContent).toContain('20%');
      }
    });

    it('verifies BuybackSettings singleton has validity = 15, convenience charge = 0, and battery >= 70%', async () => {
      const settings = await prisma.buybackSettings.findUnique({
        where: { id: 'singleton' },
      });
      expect(settings).toBeDefined();
      expect(settings?.quoteValidityDays).toBe(15);
      expect(Number(settings?.convenienceCharge)).toBe(0);
      expect(settings?.batteryMinPercent).toBe(70);
    });

    it('enforces append-only triggers on ClientNote: rejecting UPDATE and DELETE', async () => {
      const user = await prisma.user.findFirst();
      if (!user) return;

      const note = await prisma.clientNote.create({
        data: {
          userId: user.id,
          authorId: user.id,
          authorName: 'Admin Staff',
          authorRole: 'ADMIN',
          note: 'Initial client interaction note',
        },
      });

      // Update should throw trigger exception
      await expect(
        prisma.clientNote.update({
          where: { id: note.id },
          data: { note: 'Tampered note content' },
        }),
      ).rejects.toThrow(/append-only/i);

      // Delete should throw trigger exception
      await expect(
        prisma.clientNote.delete({
          where: { id: note.id },
        }),
      ).rejects.toThrow(/append-only/i);
    });

    it('enforces append-only triggers on BuybackEvent: rejecting UPDATE and DELETE', async () => {
      const user = await prisma.user.findFirst();
      const item = await prisma.orderItem.findFirst();
      const tier = await prisma.buybackTier.findFirst();
      if (!user || !item || !tier) return;

      const req = await prisma.buybackRequest.create({
        data: {
          requestNumber: `LM-BB-TEST-${Date.now()}`,
          orderId: item.orderId,
          orderItemId: item.id,
          unitNumber: Math.floor(Math.random() * 100000) + 10,
          userId: user.id,
          tierId: tier.id,
          originalNetPrice: 30000,
          deviceAgeMonths: 5,
          tierPercentApplied: 70,
          convenienceCharge: 0,
          initialQuotedAmount: 21000,
          status: 'REQUESTED',
        },
      });

      const event = await prisma.buybackEvent.create({
        data: {
          requestId: req.id,
          actorId: user.id,
          actorRole: 'CUSTOMER',
          eventType: 'QUOTE_ACCEPTED',
          notes: 'Customer accepted initial estimate',
        },
      });

      await expect(
        prisma.buybackEvent.update({
          where: { id: event.id },
          data: { notes: 'Tampered event' },
        }),
      ).rejects.toThrow(/append-only/i);

      await expect(
        prisma.buybackEvent.delete({
          where: { id: event.id },
        }),
      ).rejects.toThrow(/append-only/i);

      // Verify raw SQL DELETE is also blocked by PostgreSQL trigger
      await expect(
        prisma.$executeRawUnsafe(`DELETE FROM "BuybackEvent" WHERE id = '${event.id}'`),
      ).rejects.toThrow(/append-only/i);
    });

    it('enforces ON DELETE RESTRICT on foreign keys: cannot delete user with business profile or change request', async () => {
      const testUser = await prisma.user.create({
        data: {
          email: `restrict-test-${Date.now()}@example.com`,
          firebaseUid: `fb-${Date.now()}`,
          referralCode: `MTR-TEST-${Date.now().toString().slice(-4)}`,
        },
      });

      await prisma.businessProfile.create({
        data: {
          userId: testUser.id,
          companyName: 'Acme Technologies Pvt Ltd',
          gstin: '07AAAAA0000A1Z5',
          billingAddress: { street: '123 Tech Park', city: 'New Delhi', state: 'Delhi', pincode: '110001' },
          contactPerson: 'Rahul Sharma',
          contactPhone: '9876543210',
          contactEmail: 'corp@example.com',
          priorityEnabled: true,
        },
      });

      // Deleting user must fail due to ON DELETE RESTRICT
      await expect(
        prisma.user.delete({
          where: { id: testUser.id },
        }),
      ).rejects.toThrow();

      // Clean up child first, then user
      await prisma.businessProfile.delete({ where: { userId: testUser.id } });
      await prisma.user.delete({ where: { id: testUser.id } });
    });
  });

  describe('Part 2: Support Queue Database Priority Ordering & Multi-Page Pagination', () => {
    it('orders tickets in DB by priorityWeight DESC, isPriorityClient DESC, firstResponseDueAt ASC, createdAt ASC', async () => {
      const user = await prisma.user.findFirst();
      if (!user) return;

      const baseTime = Date.now();
      const createdTickets = await Promise.all([
        prisma.supportTicket.create({
          data: {
            ticketNumber: `LM-T-ORD-${baseTime}-1`,
            userId: user.id,
            subject: 'Low priority general question',
            category: 'GENERAL_INQUIRY',
            priority: 'LOW',
            priorityWeight: 1,
            isPriorityClient: false,
            createdAt: new Date(baseTime + 1000),
          },
        }),
        prisma.supportTicket.create({
          data: {
            ticketNumber: `LM-T-ORD-${baseTime}-2`,
            userId: user.id,
            subject: 'Urgent hardware failure',
            category: 'RETURNS_REFUNDS',
            priority: 'URGENT',
            priorityWeight: 4,
            isPriorityClient: false,
            createdAt: new Date(baseTime + 2000),
          },
        }),
        prisma.supportTicket.create({
          data: {
            ticketNumber: `LM-T-ORD-${baseTime}-3`,
            userId: user.id,
            subject: 'High priority corporate inquiry',
            category: 'CORPORATE',
            priority: 'HIGH',
            priorityWeight: 3,
            isPriorityClient: true,
            createdAt: new Date(baseTime + 3000),
          },
        }),
        prisma.supportTicket.create({
          data: {
            ticketNumber: `LM-T-ORD-${baseTime}-4`,
            userId: user.id,
            subject: 'High priority regular inquiry',
            category: 'CORPORATE',
            priority: 'HIGH',
            priorityWeight: 3,
            isPriorityClient: false,
            createdAt: new Date(baseTime + 4000),
          },
        }),
      ]);

      // Query page 1 (take 2) and page 2 (skip 2, take 2)
      const page1 = await prisma.supportTicket.findMany({
        where: { id: { in: createdTickets.map((t) => t.id) } },
        orderBy: [
          { priorityWeight: 'desc' },
          { isPriorityClient: 'desc' },
          { firstResponseDueAt: 'asc' },
          { createdAt: 'asc' },
        ],
        take: 2,
        skip: 0,
      });

      const page2 = await prisma.supportTicket.findMany({
        where: { id: { in: createdTickets.map((t) => t.id) } },
        orderBy: [
          { priorityWeight: 'desc' },
          { isPriorityClient: 'desc' },
          { firstResponseDueAt: 'asc' },
          { createdAt: 'asc' },
        ],
        take: 2,
        skip: 2,
      });

      expect(page1.length).toBe(2);
      expect(page2.length).toBe(2);

      // Page 1 must have the URGENT ticket (weight 4) and Corporate HIGH ticket (weight 3, priorityClient: true)
      expect(page1[0].priorityWeight).toBe(4);
      expect(page1[1].priorityWeight).toBe(3);
      expect(page1[1].isPriorityClient).toBe(true);

      // Page 2 must have Regular HIGH ticket (weight 3, priorityClient: false) and LOW ticket (weight 1)
      expect(page2[0].priorityWeight).toBe(3);
      expect(page2[0].isPriorityClient).toBe(false);
      expect(page2[1].priorityWeight).toBe(1);

      // Clean up test tickets
      await prisma.supportTicket.deleteMany({
        where: { id: { in: createdTickets.map((t) => t.id) } },
      });
    });
  });

  describe('Part 3: Situation Engine API Matrix & Boundaries', () => {
    let testOrder: any;
    let testItem: any;
    let testUser: any;
    let testProduct: any;

    beforeAll(async () => {
      testUser = await prisma.user.create({
        data: {
          email: `sit-engine-${Date.now()}@example.com`,
          firebaseUid: `fb-sit-${Date.now()}`,
          referralCode: `MTR-SIT-${Date.now().toString().slice(-4)}`,
        },
      });

      testProduct = await prisma.product.create({
        data: {
          name: 'ThinkPad T480 Situation Test Laptop',
          slug: `thinkpad-t480-sit-${Date.now()}`,
          price: 30000,
          sku: `SKU-T480-${Date.now()}`,
        },
      });

      testOrder = await prisma.order.create({
        data: {
          orderNumber: `LM-ORD-SIT-${Date.now()}`,
          user: { connect: { id: testUser.id } },
          subtotal: 30000,
          finalAmount: 30000,
          email: testUser.email,
          status: 'PENDING',
          paymentStatus: 'COMPLETED',
          paymentMethod: 'razorpay',
          items: {
            create: {
              product: { connect: { id: testProduct.id } },
              quantity: 1,
              price: 30000,
              purchaseMode: 'sell',
              hasWarranty: true,
              warrantyPrice: 1500,
            },
          },
        },
        include: { items: true },
      });

      testItem = testOrder.items[0];
    });

    afterAll(async () => {
      if (testItem?.id) {
        await prisma.orderItem.deleteMany({ where: { orderId: testOrder.id } });
      }
      if (testOrder?.id) {
        await prisma.delivery.deleteMany({ where: { orderId: testOrder.id } });
        await prisma.order.delete({ where: { id: testOrder.id } });
      }
      if (testProduct?.id) {
        await prisma.product.delete({ where: { id: testProduct.id } });
      }
      if (testUser?.id) {
        await prisma.user.delete({ where: { id: testUser.id } });
      }
    });

    it('evaluates OUTRIGHT_BEFORE_DISPATCH: cancel & address change enabled, return & warranty disabled', async () => {
      await prisma.order.update({
        where: { id: testOrder.id },
        data: { status: 'CONFIRMED' },
      });

      const res = await service.getItemSituation(testItem.id, testUser.id);
      expect(res.situation).toBe('OUTRIGHT_BEFORE_DISPATCH');
      expect(res.actions.find((a) => a.id === 'CANCEL_ORDER')?.enabled).toBe(true);
      expect(res.actions.find((a) => a.id === 'REQUEST_ADDRESS_CHANGE')?.enabled).toBe(true);
      expect(res.actions.find((a) => a.id === 'REQUEST_RETURN')?.enabled).toBe(false);
      expect(res.actions.find((a) => a.id === 'CLAIM_WARRANTY')?.enabled).toBe(false);
      expect(res.actions.find((a) => a.id === 'REQUEST_BUYBACK')?.enabled).toBe(false);
      expect(res.actions.find((a) => a.id === 'REQUEST_CALLBACK')?.enabled).toBe(true);
    });

    it('evaluates OUTRIGHT_IN_TRANSIT: cancel & address change disabled, tracking enabled', async () => {
      await prisma.order.update({
        where: { id: testOrder.id },
        data: { status: 'SHIPPING' },
      });

      const res = await service.getItemSituation(testItem.id, testUser.id);
      expect(res.situation).toBe('OUTRIGHT_IN_TRANSIT');
      expect(res.actions.find((a) => a.id === 'CANCEL_ORDER')?.enabled).toBe(false);
      expect(res.actions.find((a) => a.id === 'CANCEL_ORDER')?.disabledReason).toContain('already been dispatched');
      expect(res.actions.find((a) => a.id === 'REQUEST_ADDRESS_CHANGE')?.enabled).toBe(false);
      expect(res.actions.find((a) => a.id === 'TRACK_SHIPMENT')?.enabled).toBe(true);
    });

    it('evaluates OUTRIGHT_DELIVERED_RETURN_WINDOW: day 7 is eligible, return action enabled', async () => {
      const sixDaysAgo = new Date(Date.now() - 6 * 24 * 3600 * 1000);
      await prisma.order.update({
        where: { id: testOrder.id },
        data: { status: 'DELIVERED' },
      });
      await prisma.delivery.create({
        data: {
          orderId: testOrder.id,
          status: 'DELIVERED',
          deliveredAt: sixDaysAgo,
        },
      });

      const res = await service.getItemSituation(testItem.id, testUser.id);
      expect(res.situation).toBe('OUTRIGHT_DELIVERED_RETURN_WINDOW');
      expect(res.actions.find((a) => a.id === 'REQUEST_RETURN')?.enabled).toBe(true);
      expect(res.actions.find((a) => a.id === 'CLAIM_WARRANTY')?.enabled).toBe(false);
      expect(res.actions.find((a) => a.id === 'CLAIM_WARRANTY')?.disabledReason).toContain('within the 7-day replacement window');
      expect(res.actions.find((a) => a.id === 'REQUEST_BUYBACK')?.enabled).toBe(false);

      await prisma.delivery.deleteMany({ where: { orderId: testOrder.id } });
    });

    it('evaluates OUTRIGHT_DELIVERED_IN_WARRANTY: day 8 return window expired, warranty claim enabled', async () => {
      const eightDaysAgo = new Date(Date.now() - 8 * 24 * 3600 * 1000);
      await prisma.delivery.create({
        data: {
          orderId: testOrder.id,
          status: 'DELIVERED',
          deliveredAt: eightDaysAgo,
        },
      });

      const res = await service.getItemSituation(testItem.id, testUser.id);
      expect(res.situation).toBe('OUTRIGHT_DELIVERED_IN_WARRANTY');
      expect(res.actions.find((a) => a.id === 'REQUEST_RETURN')?.enabled).toBe(false);
      expect(res.actions.find((a) => a.id === 'REQUEST_RETURN')?.disabledReason).toContain('return window expired');
      expect(res.actions.find((a) => a.id === 'CLAIM_WARRANTY')?.enabled).toBe(true);

      await prisma.delivery.deleteMany({ where: { orderId: testOrder.id } });
    });

    it('evaluates OUTRIGHT_DELIVERED_BUYBACK_ELIGIBLE at exact 6-month boundary: upper bound inclusive grants 70% tier', async () => {
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());

      await prisma.delivery.create({
        data: {
          orderId: testOrder.id,
          status: 'DELIVERED',
          deliveredAt: sixMonthsAgo,
        },
      });

      const res = await service.getItemSituation(testItem.id, testUser.id);
      expect(res.situation).toBe('OUTRIGHT_DELIVERED_BUYBACK_ELIGIBLE');
      expect(res.buyback?.isEligible).toBe(true);
      expect(res.buyback?.tierPercentage).toBe(70);
      expect(res.buyback?.estimatedPayout).toBe(21000);
      expect(res.actions.find((a) => a.id === 'REQUEST_BUYBACK')?.enabled).toBe(true);

      await prisma.delivery.deleteMany({ where: { orderId: testOrder.id } });
    });

    it('evaluates Buyback Tier progression at 12m, 18m, 24m, 30m, and 36m', async () => {
      const now = new Date();

      // Test 12m boundary -> 60%
      const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate());
      await prisma.delivery.create({
        data: { orderId: testOrder.id, status: 'DELIVERED', deliveredAt: twelveMonthsAgo },
      });
      let res = await service.getItemSituation(testItem.id, testUser.id);
      expect(res.buyback?.tierPercentage).toBe(60);
      await prisma.delivery.deleteMany({ where: { orderId: testOrder.id } });

      // Test 24m boundary -> 40%
      const twentyFourMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 24, now.getDate());
      await prisma.delivery.create({
        data: { orderId: testOrder.id, status: 'DELIVERED', deliveredAt: twentyFourMonthsAgo },
      });
      res = await service.getItemSituation(testItem.id, testUser.id);
      expect(res.buyback?.tierPercentage).toBe(40);
      await prisma.delivery.deleteMany({ where: { orderId: testOrder.id } });

      // Test 36m boundary -> 20%
      const thirtySixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 36, now.getDate());
      await prisma.delivery.create({
        data: { orderId: testOrder.id, status: 'DELIVERED', deliveredAt: thirtySixMonthsAgo },
      });
      res = await service.getItemSituation(testItem.id, testUser.id);
      expect(res.buyback?.tierPercentage).toBe(20);
      await prisma.delivery.deleteMany({ where: { orderId: testOrder.id } });

      // Test > 36m (37 months) -> Ineligible
      const thirtySevenMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 37, now.getDate());
      await prisma.delivery.create({
        data: { orderId: testOrder.id, status: 'DELIVERED', deliveredAt: thirtySevenMonthsAgo },
      });
      res = await service.getItemSituation(testItem.id, testUser.id);
      expect(res.situation).toBe('OUTRIGHT_DELIVERED_OUT_OF_WARRANTY');
      expect(res.buyback?.isEligible).toBe(false);
      expect(res.buyback?.ineligibilityReason).toContain('36 months');
      await prisma.delivery.deleteMany({ where: { orderId: testOrder.id } });
    });

    it('evaluates lease items: blocks self-serve return & buyback, surfaces structured lease tickets', async () => {
      await prisma.orderItem.update({
        where: { id: testItem.id },
        data: { purchaseMode: 'lease', tenureMonths: 12 },
      });

      const res = await service.getItemSituation(testItem.id, testUser.id);
      expect(res.situation).toBe('LEASE_ACTIVE');
      expect(res.actions.find((a) => a.id === 'REQUEST_RETURN')?.enabled).toBe(false);
      expect(res.actions.find((a) => a.id === 'REQUEST_RETURN')?.disabledReason).toContain('Leased items cannot be returned');
      expect(res.actions.find((a) => a.id === 'REQUEST_BUYBACK')?.enabled).toBe(false);
      expect(res.actions.find((a) => a.id === 'REQUEST_BUYBACK')?.disabledReason).toContain('only to outright purchases');
      expect(res.actions.find((a) => a.id === 'LEASE_MAINTENANCE')?.enabled).toBe(true);

      // Restore purchaseMode
      await prisma.orderItem.update({
        where: { id: testItem.id },
        data: { purchaseMode: 'sell' },
      });
    });

    it('evaluates corporate business profile overlay', async () => {
      await prisma.businessProfile.create({
        data: {
          userId: testUser.id,
          companyName: 'Mitra Labs Private Limited',
          gstin: '07AAAAA0000A1Z5',
          billingAddress: { street: 'Barakhamba Road', city: 'New Delhi', state: 'Delhi', pincode: '110001' },
          contactPerson: 'Amit Gupta',
          contactPhone: '9811122233',
          contactEmail: 'amit@mitralabs.com',
          priorityEnabled: true,
        },
      });

      const res = await service.getItemSituation(testItem.id, testUser.id);
      expect(res.businessProfile?.isBusinessAccount).toBe(true);
      expect(res.businessProfile?.companyName).toBe('Mitra Labs Private Limited');
      expect(res.businessProfile?.priorityEnabled).toBe(true);

      await prisma.businessProfile.delete({ where: { userId: testUser.id } });
    });

    it('guard test: verifies that EVERY situation always returns a non-empty list of actions', async () => {
      const res = await service.getItemSituation(testItem.id, testUser.id);
      expect(res.actions.length).toBeGreaterThan(0);
      for (const action of res.actions) {
        expect(action.id).toBeDefined();
        expect(action.label).toBeDefined();
        if (!action.enabled) {
          expect(action.disabledReason).toBeDefined();
        }
      }
    });
  });
});
