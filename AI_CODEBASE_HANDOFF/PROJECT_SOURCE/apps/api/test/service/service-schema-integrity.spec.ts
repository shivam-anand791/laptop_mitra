import { PrismaClient } from '@prisma/client';

describe('Stage 1 Schema Integrity — Free Service, Warranty Coverage, Serial Tracking', () => {
  let prisma: PrismaClient;

  let testUser: any;
  let testProduct: any;
  let testOrder: any;
  let testOrderItem: any;
  let testSoldUnit: any;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();

    const timestamp = Date.now();
    testUser = await prisma.user.create({
      data: {
        email: `schema-user-${timestamp}@test.laptopmitra.local`,
        firebaseUid: `fb-schema-${timestamp}`,
        referralCode: `MTR-SC-${timestamp.toString().slice(-4)}`,
        name: 'Schema Test Customer',
        phone: '9876543299',
        role: 'CUSTOMER',
      },
    });

    testProduct = await prisma.product.create({
      data: {
        name: `ThinkPad X1 Carbon Gen 10 (${timestamp})`,
        slug: `thinkpad-x1-gen10-${timestamp}`,
        sku: `SKU-TPX1-${timestamp}`,
        price: '89999.00',
        stock: 5,
        status: 'ACTIVE',
      },
    });

    testOrder = await prisma.order.create({
      data: {
        orderNumber: `LM-ORD-SC-${timestamp.toString().slice(-6)}`,
        userId: testUser.id,
        email: testUser.email,
        subtotal: '89999.00',
        finalAmount: '89999.00',
        status: 'CONFIRMED',
      },
    });

    testOrderItem = await prisma.orderItem.create({
      data: {
        orderId: testOrder.id,
        productId: testProduct.id,
        quantity: 2,
        price: '89999.00',
        purchaseMode: 'sell',
        hasWarranty: false,
      },
    });
  });

  afterAll(async () => {
    // Cleanup in reverse dependency order
    try {
      if (testSoldUnit) {
        await prisma.serviceEvent.deleteMany({ where: { job: { soldUnitId: testSoldUnit.id } } }).catch(() => {});
        await prisma.serviceJob.deleteMany({ where: { soldUnitId: testSoldUnit.id } }).catch(() => {});
        await prisma.serviceEntitlement.deleteMany({ where: { soldUnitId: testSoldUnit.id } }).catch(() => {});
        await prisma.warrantyCoverage.deleteMany({ where: { soldUnitId: testSoldUnit.id } }).catch(() => {});
        await prisma.soldUnit.deleteMany({ where: { orderItemId: testOrderItem.id } }).catch(() => {});
      }
      if (testOrderItem) {
        await prisma.orderItem.deleteMany({ where: { id: testOrderItem.id } }).catch(() => {});
      }
      if (testOrder) {
        await prisma.order.deleteMany({ where: { id: testOrder.id } }).catch(() => {});
      }
      if (testProduct) {
        await prisma.product.deleteMany({ where: { id: testProduct.id } }).catch(() => {});
      }
      if (testUser) {
        await prisma.user.deleteMany({ where: { id: testUser.id } }).catch(() => {});
      }
    } finally {
      await prisma.$disconnect();
    }
  });

  describe('1. ServiceSettings Singleton & Configuration', () => {
    it('seeds and loads default ServiceSettings record', async () => {
      const settings = await prisma.serviceSettings.findUnique({
        where: { id: 'default' },
      });

      expect(settings).toBeDefined();
      expect(settings?.windowMonthsOutright).toBe(6);
      expect(settings?.leaseCadenceMonths).toBe(1);
      expect(settings?.freeServiceEnabledDefault).toBe(true);
      expect(Array.isArray(settings?.includedWork)).toBe(true);
      expect((settings?.includedWork as string[])).toContain('Internal dust cleaning');
      expect((settings?.includedWork as string[])).toContain('Thermal paste re-application');
    });
  });

  describe('2. SoldUnit & Unique Constraints', () => {
    it('creates sold units per unitIndex and enforces unique (orderItemId, unitIndex)', async () => {
      testSoldUnit = await prisma.soldUnit.create({
        data: {
          orderItemId: testOrderItem.id,
          productId: testProduct.id,
          userId: testUser.id,
          unitIndex: 1,
          serialNumber: `SN-TPX1-${Date.now()}-01`,
          brandSnapshot: 'Lenovo',
          modelSnapshot: 'ThinkPad X1 Carbon Gen 10',
          status: 'ACTIVE',
        },
      });

      expect(testSoldUnit.id).toBeDefined();
      expect(testSoldUnit.unitIndex).toBe(1);

      // Attempting to create duplicate (orderItemId, unitIndex) must fail
      await expect(
        prisma.soldUnit.create({
          data: {
            orderItemId: testOrderItem.id,
            productId: testProduct.id,
            userId: testUser.id,
            unitIndex: 1,
            serialNumber: `SN-DUPLICATE`,
            brandSnapshot: 'Lenovo',
            modelSnapshot: 'ThinkPad X1 Carbon Gen 10',
          },
        }),
      ).rejects.toThrow();
    });

    it('enforces CHECK constraint on SoldUnit status', async () => {
      await expect(
        prisma.soldUnit.create({
          data: {
            orderItemId: testOrderItem.id,
            productId: testProduct.id,
            userId: testUser.id,
            unitIndex: 2,
            brandSnapshot: 'Lenovo',
            modelSnapshot: 'ThinkPad X1 Carbon Gen 10',
            status: 'INVALID_STATUS',
          },
        }),
      ).rejects.toThrow();
    });
  });

  describe('3. SoldUnitSerialHistory Append-Only Immutability', () => {
    it('creates audit record and prevents UPDATE and DELETE via database trigger', async () => {
      const historyRecord = await prisma.soldUnitSerialHistory.create({
        data: {
          soldUnitId: testSoldUnit.id,
          previousSerial: null,
          newSerial: testSoldUnit.serialNumber || 'SN-INITIAL',
          changedBy: testUser.id,
          reason: 'Initial dispatch serial assignment',
        },
      });

      expect(historyRecord.id).toBeDefined();

      // Trigger must reject direct UPDATE
      await expect(
        prisma.$executeRawUnsafe(
          `UPDATE "SoldUnitSerialHistory" SET "newSerial" = 'HACKED' WHERE id = '${historyRecord.id}'`,
        ),
      ).rejects.toThrow(/append-only and immutable/);

      // Trigger must reject direct DELETE
      await expect(
        prisma.$executeRawUnsafe(
          `DELETE FROM "SoldUnitSerialHistory" WHERE id = '${historyRecord.id}'`,
        ),
      ).rejects.toThrow(/append-only and immutable/);
    });
  });

  describe('4. WarrantyCoverage Relation & Constraints', () => {
    it('creates 1:1 coverage and rejects invalid status', async () => {
      const start = new Date();
      const end = new Date(start.getTime() + 180 * 24 * 60 * 60 * 1000);

      const coverage = await prisma.warrantyCoverage.create({
        data: {
          soldUnitId: testSoldUnit.id,
          source: 'BASE',
          monthsSnapshot: 6,
          startDate: start,
          endDate: end,
          status: 'ACTIVE',
        },
      });

      expect(coverage.id).toBeDefined();
      expect(coverage.status).toBe('ACTIVE');

      // Unique constraint on soldUnitId
      await expect(
        prisma.warrantyCoverage.create({
          data: {
            soldUnitId: testSoldUnit.id,
            source: 'EXTENDED',
            monthsSnapshot: 12,
            startDate: start,
            endDate: end,
            status: 'ACTIVE',
          },
        }),
      ).rejects.toThrow();
    });
  });

  describe('5. ServiceEntitlement & ServiceJob State Machine Enforcement', () => {
    let entitlement: any;

    it('creates service entitlement with valid status and kind', async () => {
      const start = new Date();
      const end = new Date(start.getTime() + 180 * 24 * 60 * 60 * 1000);

      entitlement = await prisma.serviceEntitlement.create({
        data: {
          soldUnitId: testSoldUnit.id,
          userId: testUser.id,
          kind: 'OUTRIGHT_FREE',
          periodStart: start,
          periodEnd: end,
          status: 'AVAILABLE',
        },
      });

      expect(entitlement.id).toBeDefined();
      expect(entitlement.status).toBe('AVAILABLE');
    });

    it('rejects invalid status on ServiceEntitlement', async () => {
      const start = new Date();
      const end = new Date(start.getTime() + 180 * 24 * 60 * 60 * 1000);

      await expect(
        prisma.serviceEntitlement.create({
          data: {
            soldUnitId: testSoldUnit.id,
            userId: testUser.id,
            kind: 'OUTRIGHT_FREE',
            periodStart: start,
            periodEnd: end,
            status: 'UNKNOWN_STATUS',
          },
        }),
      ).rejects.toThrow();
    });

    it('creates service job and advances status within check constraints', async () => {
      const jobNumber = `LM-SV-${Date.now()}`;
      const job = await prisma.serviceJob.create({
        data: {
          jobNumber,
          soldUnitId: testSoldUnit.id,
          entitlementId: entitlement.id,
          userId: testUser.id,
          status: 'REQUESTED',
          pickupAddress: { address: '123 MG Road', city: 'Bengaluru', pincode: '560001' },
          pickupPincode: '560001',
          preferredSlot: '10:00 AM - 01:00 PM',
          checklistCleaning: true,
          checklistThermalPaste: true,
          checklistSoftware: true,
          checklistBattery: true,
          batteryHealthPercent: 92,
        },
      });

      expect(job.id).toBeDefined();
      expect(job.status).toBe('REQUESTED');

      // Update to valid status
      const updated = await prisma.serviceJob.update({
        where: { id: job.id },
        data: { status: 'IN_SERVICE' },
      });
      expect(updated.status).toBe('IN_SERVICE');

      // Update to invalid status must fail check constraint
      await expect(
        prisma.serviceJob.update({
          where: { id: job.id },
          data: { status: 'ILLEGAL_STATUS' },
        }),
      ).rejects.toThrow();
    });
  });

  describe('6. ServiceEvent Append-Only Trigger', () => {
    it('creates job event and rejects UPDATE and DELETE triggers', async () => {
      const job = await prisma.serviceJob.findFirst({ where: { soldUnitId: testSoldUnit.id } });
      expect(job).toBeDefined();

      const event = await prisma.serviceEvent.create({
        data: {
          jobId: job!.id,
          actorId: testUser.id,
          actorRole: 'CUSTOMER',
          eventType: 'STATUS_CHANGE',
          oldStatus: 'REQUESTED',
          newStatus: 'SCHEDULED',
          notes: 'Customer requested morning slot',
        },
      });

      expect(event.id).toBeDefined();

      // Database trigger must reject UPDATE
      await expect(
        prisma.$executeRawUnsafe(
          `UPDATE "ServiceEvent" SET notes = 'TAMPERED' WHERE id = '${event.id}'`,
        ),
      ).rejects.toThrow(/append-only/);

      // Database trigger must reject DELETE
      await expect(
        prisma.$executeRawUnsafe(
          `DELETE FROM "ServiceEvent" WHERE id = '${event.id}'`,
        ),
      ).rejects.toThrow(/append-only/);
    });
  });

  describe('7. Referential Integrity & ON DELETE RESTRICT (No Cascades)', () => {
    it('strictly forbids deleting User when SoldUnit exists', async () => {
      await expect(
        prisma.user.delete({
          where: { id: testUser.id },
        }),
      ).rejects.toThrow();
    });

    it('strictly forbids deleting Product when SoldUnit exists', async () => {
      await expect(
        prisma.product.delete({
          where: { id: testProduct.id },
        }),
      ).rejects.toThrow();
    });

    it('strictly forbids deleting OrderItem when SoldUnit exists', async () => {
      await expect(
        prisma.orderItem.delete({
          where: { id: testOrderItem.id },
        }),
      ).rejects.toThrow();
    });
  });

  describe('8. Sequence Generation & Notification Dedupe Log', () => {
    it('increments service_job_seq and service_receipt_seq', async () => {
      const jobSeqRes: any = await prisma.$queryRawUnsafe(`SELECT nextval('service_job_seq')::text as seq`);
      expect(Number(jobSeqRes[0].seq)).toBeGreaterThanOrEqual(1001);

      const receiptSeqRes: any = await prisma.$queryRawUnsafe(`SELECT nextval('service_receipt_seq')::text as seq`);
      expect(Number(receiptSeqRes[0].seq)).toBeGreaterThanOrEqual(1001);
    });

    it('enforces unique (templateKey, dedupeKey) on NotificationDedupeLog', async () => {
      const template = 'FREE_SERVICE_REMINDER_30D';
      const key = `unit-dedupe-${Date.now()}`;

      const log = await prisma.notificationDedupeLog.create({
        data: {
          channel: 'EMAIL',
          recipient: 'test@example.com',
          templateKey: template,
          dedupeKey: key,
        },
      });

      expect(log.id).toBeDefined();

      // Duplicate dedupeKey must be rejected
      await expect(
        prisma.notificationDedupeLog.create({
          data: {
            channel: 'PUSH',
            recipient: 'test@example.com',
            templateKey: template,
            dedupeKey: key,
          },
        }),
      ).rejects.toThrow();
    });
  });
});

