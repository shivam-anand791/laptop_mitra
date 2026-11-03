import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../src/prisma/prisma.service';
import { SupportService } from '../../src/modules/support/support.service';
import { PaymentEncryptionService } from '../../src/common/encryption/payment-encryption.service';
import { ChangeRequestTypeEnum } from '../../src/modules/support/dto/order-change-request.dto';

describe('Order Change Requests & Buyback Workflows', () => {
  jest.setTimeout(60000);
  let prisma: PrismaService;
  let service: SupportService;
  let encryptionService: PaymentEncryptionService;

  let testUser: any;
  let adminUser: any;
  let testProduct: any;
  let pendingOrder: any;
  let deliveredOrder: any;
  let pendingItem: any;
  let deliveredItem: any;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigService,
        PrismaService,
        PaymentEncryptionService,
        SupportService,
      ],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    encryptionService = module.get<PaymentEncryptionService>(PaymentEncryptionService);
    service = module.get<SupportService>(SupportService);

    // Seed test users
    testUser = await prisma.user.create({
      data: {
        email: `cr-customer-${Date.now()}@example.com`,
        firebaseUid: `fb-cr-cust-${Date.now()}`,
        referralCode: `MTR-CC-${Date.now().toString().slice(-4)}`,
        name: 'CR Customer',
        phone: '9876543210',
        role: 'CUSTOMER',
      },
    });

    adminUser = await prisma.user.create({
      data: {
        email: `cr-admin-${Date.now()}@example.com`,
        firebaseUid: `fb-cr-adm-${Date.now()}`,
        referralCode: `MTR-CA-${Date.now().toString().slice(-4)}`,
        name: 'CR Admin',
        phone: '9876543211',
        role: 'ADMIN',
      },
    });

    testProduct = await prisma.product.create({
      data: {
        name: 'ThinkPad T480s Pro',
        slug: `t480s-cr-${Date.now()}`,
        sku: `SKU-CR-${Date.now()}`,
        price: 30000.0,
        status: 'ACTIVE',
      },
    });

    // 1. Pending order (before dispatch)
    pendingOrder = await prisma.order.create({
      data: {
        userId: testUser.id,
        status: 'CONFIRMED',
        subtotal: 30000.0,
        finalAmount: 30000.0,
        email: testUser.email,
        phone: '9876543210',
        shippingAddress: {
          addressLine1: '123 MG Road',
          city: 'Bengaluru',
          state: 'Karnataka',
          postalCode: '560001',
        },
      },
    });

    pendingItem = await prisma.orderItem.create({
      data: {
        orderId: pendingOrder.id,
        productId: testProduct.id,
        quantity: 1,
        price: 30000.0,
        purchaseMode: 'sell',
      },
    });

    // 2. Delivered order (delivered 5 months ago)
    const fiveMonthsAgo = new Date();
    fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5);

    deliveredOrder = await prisma.order.create({
      data: {
        userId: testUser.id,
        status: 'DELIVERED',
        subtotal: 30000.0,
        finalAmount: 30000.0,
        email: testUser.email,
        phone: '9876543210',
        createdAt: fiveMonthsAgo,
        shippingAddress: {
          addressLine1: '456 Indiranagar',
          city: 'Bengaluru',
          state: 'Karnataka',
          postalCode: '560038',
        },
      },
    });

    deliveredItem = await prisma.orderItem.create({
      data: {
        orderId: deliveredOrder.id,
        productId: testProduct.id,
        quantity: 1,
        price: 30000.0,
        purchaseMode: 'sell',
        createdAt: fiveMonthsAgo,
      },
    });

    await prisma.delivery.create({
      data: {
        orderId: deliveredOrder.id,
        status: 'DELIVERED',
        deliveredAt: fiveMonthsAgo,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // =========================================================================
  // PART 1: ORDER CHANGE REQUESTS
  // =========================================================================
  describe('Order Change Requests', () => {
    let createdRequestId: string;

    it('allows customer to submit pre-dispatch address change with LM-CR- sequence', async () => {
      const res = await service.createOrderChangeRequest(testUser.id, {
        orderId: pendingOrder.id,
        type: ChangeRequestTypeEnum.ADDRESS_CHANGE,
        requestedData: {
          addressLine1: '789 Brigade Road',
          city: 'Bengaluru',
          state: 'Karnataka',
          postalCode: '560025',
        },
      });

      expect(res.id).toBeDefined();
      expect(res.requestNumber).toMatch(/^LM-CR-\d{6}$/);
      expect(res.status).toBe('PENDING');
      expect((res.previousData as any).addressLine1).toBe('123 MG Road');
      createdRequestId = res.id;
    });

    it('rejects duplicate pending change request of the same type for the order', async () => {
      await expect(
        service.createOrderChangeRequest(testUser.id, {
          orderId: pendingOrder.id,
          type: ChangeRequestTypeEnum.ADDRESS_CHANGE,
          requestedData: { addressLine1: 'Different address' },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects address change on delivered orders', async () => {
      await expect(
        service.createOrderChangeRequest(testUser.id, {
          orderId: deliveredOrder.id,
          type: ChangeRequestTypeEnum.ADDRESS_CHANGE,
          requestedData: { addressLine1: 'Cannot change delivered' },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows admin to approve change request', async () => {
      const reviewed = await service.reviewChangeRequest(createdRequestId, adminUser.id, {
        action: 'APPROVED',
        adminNotes: 'Address verified with customer',
      });

      expect(reviewed.status).toBe('APPROVED');
      expect(reviewed.reviewedBy).toBe(adminUser.id);
    });

    it('allows admin to apply approved change request, updating the order shippingAddress idempotently', async () => {
      const applyResult = await service.applyChangeRequest(createdRequestId, adminUser.id);
      expect(applyResult.success).toBe(true);

      const updatedOrder = await prisma.order.findUnique({ where: { id: pendingOrder.id } });
      expect((updatedOrder?.shippingAddress as any).addressLine1).toBe('789 Brigade Road');

      // Idempotent re-apply
      const secondApply = await service.applyChangeRequest(createdRequestId, adminUser.id);
      expect(secondApply.success).toBe(true);
      expect((secondApply as any).message).toContain('already applied');
    });
  });

  // =========================================================================
  // PART 2: BUYBACK ENGINE
  // =========================================================================
  describe('Buyback Engine', () => {
    let buybackRequestId: string;

    it('returns active buyback config with 6 tiers and singleton settings', async () => {
      const config = await service.getBuybackSettingsAndTiers();
      expect(config.tiers.length).toBe(6);
      expect(config.settings.quoteValidityDays).toBe(15);
      expect(Number(config.settings.convenienceCharge)).toBe(0);
    });

    it('rejects buyback submission if hardware functional checks fail', async () => {
      await expect(
        service.createBuybackRequest(testUser.id, {
          orderId: deliveredOrder.id,
          orderItemId: deliveredItem.id,
          conditionChecklist: {
            bootsToOs: false, // Fails boot
            motherboardWorking: true,
            displayIntact: true,
            originalCharger: true,
            batteryHealthPercent: 85,
          },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects buyback submission if battery health is under 70%', async () => {
      await expect(
        service.createBuybackRequest(testUser.id, {
          orderId: deliveredOrder.id,
          orderItemId: deliveredItem.id,
          conditionChecklist: {
            bootsToOs: true,
            motherboardWorking: true,
            displayIntact: true,
            originalCharger: true,
            batteryHealthPercent: 65, // Under 70
          },
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates buyback request with 70% tier for 5-month device, masking & encrypting payout details', async () => {
      const res = await service.createBuybackRequest(testUser.id, {
        orderId: deliveredOrder.id,
        orderItemId: deliveredItem.id,
        conditionChecklist: {
          bootsToOs: true,
          motherboardWorking: true,
          displayIntact: true,
          originalCharger: true,
          batteryHealthPercent: 88,
        },
        payoutDetails: {
          method: 'BANK_TRANSFER',
          accountNumber: '12345678901234',
          ifscCode: 'HDFC0001234',
          accountHolderName: 'CR Customer',
        },
      });

      expect(res.id).toBeDefined();
      expect(res.requestNumber).toMatch(/^LM-BB-\d{6}$/);
      expect(res.status).toBe('QUOTE_ACCEPTED');
      expect(Number(res.tierPercentApplied)).toBe(70);
      expect(Number(res.initialQuotedAmount)).toBe(21000); // 70% of 30,000
      expect(res.payoutMaskedAccount).toBe('•••• •••• 1234');
      expect(res.payoutMaskedIfsc).toBe('HDFC••••');
      expect(res.payoutEncryptedData).toBeDefined();

      buybackRequestId = res.id;
    });

    it('allows admin to decrypt customer payout details and records an audit log', async () => {
      const decrypted = await service.decryptAdminBuybackPayout(buybackRequestId, adminUser.id);
      expect(decrypted.method).toBe('BANK_TRANSFER');
      expect(decrypted.accountNumber).toBe('12345678901234');
      expect(decrypted.ifscCode).toBe('HDFC0001234');

      const audit = await prisma.auditLog.findFirst({
        where: {
          actorUserId: adminUser.id,
          action: 'DECRYPT_BUYBACK_PAYOUT_DETAILS',
          entityId: buybackRequestId,
        },
      });
      expect(audit).toBeDefined();
    });

    it('allows admin inspection submission with a revised offer on minor defects', async () => {
      const inspected = await service.submitBuybackInspection(buybackRequestId, adminUser.id, {
        bootsToOs: true,
        motherboardWorking: true,
        displayIntact: true,
        originalCharger: true,
        batteryHealthPercent: 78,
        inspectionNotes: 'Minor scratch on top lid',
        revisedQuotedAmount: 19500,
      });

      expect(inspected.status).toBe('REVISED_OFFER_PENDING');
      expect(Number(inspected.revisedQuotedAmount)).toBe(19500);
      expect(inspected.quoteVersion).toBe(2);
    });

    it('allows customer to decline revised offer, triggering free return shipment preparation', async () => {
      const declined = await service.declineRevisedOffer(buybackRequestId, testUser.id);
      expect(declined.status).toBe('REVISED_OFFER_DECLINED');

      const events = await prisma.buybackEvent.findMany({
        where: { requestId: buybackRequestId },
        orderBy: { createdAt: 'desc' },
      });
      expect(events[0].eventType).toBe('REVISED_OFFER_DECLINED');
    });

    it('allows admin to dispatch return shipment back to customer free of charge', async () => {
      const returned = await service.dispatchBuybackReturn(buybackRequestId, adminUser.id, {
        courierName: 'BlueDart Express',
        trackingNumber: 'BD987654321IN',
      });

      expect(returned.status).toBe('RETURNING_TO_CUSTOMER');
      expect(returned.returnCourierName).toBe('BlueDart Express');
      expect(returned.returnTrackingNumber).toBe('BD987654321IN');
    });

    it('allows admin to complete payout on accepted buyback', async () => {
      // Create a fresh accepted buyback to test payout
      const unit2 = await service.createBuybackRequest(testUser.id, {
        orderId: deliveredOrder.id,
        orderItemId: deliveredItem.id,
        unitNumber: 2,
        conditionChecklist: {
          bootsToOs: true,
          motherboardWorking: true,
          displayIntact: true,
          originalCharger: true,
          batteryHealthPercent: 92,
        },
      });

      const paid = await service.processBuybackPayout(unit2.id, adminUser.id, {
        payoutUtr: 'HDFCR520261103001',
        finalAmount: 21000,
      });

      expect(paid.status).toBe('PAID');
      expect(paid.payoutUtr).toBe('HDFCR520261103001');
      expect(Number(paid.finalPayoutAmount)).toBe(21000);
    });
  });

  // =========================================================================
  // PART 3: CORPORATE BUSINESS PROFILE & STAFF NOTES
  // =========================================================================
  describe('Corporate Business Profile & Client Notes', () => {
    it('rejects invalid GSTIN format', async () => {
      await expect(
        service.upsertBusinessProfile(adminUser.id, testUser.id, {
          companyName: 'Acme Corp',
          gstin: 'INVALID_GSTIN_123',
          billingAddress: { city: 'Bengaluru' },
          contactPerson: 'Jane Doe',
          contactPhone: '9876543210',
          contactEmail: 'jane@acme.com',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('upserts valid business profile and synchronizes open ticket priority flag', async () => {
      // Create an open ticket first
      const ticket = await prisma.supportTicket.create({
        data: {
          ticketNumber: `LM-TK-TEST-${Date.now()}`,
          userId: testUser.id,
          subject: 'Corporate inquiry',
          category: 'ORDER_DELIVERY',
          status: 'OPEN',
          priority: 'MEDIUM',
          priorityWeight: 2,
          isPriorityClient: false,
        },
      });

      const profile = await service.upsertBusinessProfile(adminUser.id, testUser.id, {
        companyName: 'Acme Technologies Pvt Ltd',
        gstin: '29ABCDE1234F1Z5', // Valid Karnataka GSTIN
        billingAddress: {
          address: '42 MG Road',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560001',
        },
        contactPerson: 'Jane Doe',
        contactPhone: '9876543210',
        contactEmail: 'jane@acme.com',
        priorityEnabled: true,
        accountManager: 'Rajesh Kumar',
      });

      expect(profile.companyName).toBe('Acme Technologies Pvt Ltd');
      expect(profile.gstin).toBe('29ABCDE1234F1Z5');
      expect(profile.priorityEnabled).toBe(true);

      // Verify ticket priority flag got updated
      const updatedTicket = await prisma.supportTicket.findUnique({ where: { id: ticket.id } });
      expect(updatedTicket?.isPriorityClient).toBe(true);

      // Clean up ticket
      await prisma.supportTicket.delete({ where: { id: ticket.id } });
    });

    it('allows staff to append immutable client note', async () => {
      const note = await service.createClientNote(
        adminUser.id,
        'CR Admin',
        'ADMIN',
        testUser.id,
        'Customer confirmed corporate GST billing address by phone call.',
      );

      expect(note.id).toBeDefined();
      expect(note.note).toBe('Customer confirmed corporate GST billing address by phone call.');

      const notes = await service.getClientNotes(testUser.id);
      expect(notes.length).toBeGreaterThanOrEqual(1);
      expect(notes[0].note).toBe('Customer confirmed corporate GST billing address by phone call.');
    });
  });
});
