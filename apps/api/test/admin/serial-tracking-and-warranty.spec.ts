import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { AdminService } from '../../src/modules/admin/admin.service';

describe('Stage 2: Serial Tracking, Dispatch Flow & Warranty Register', () => {
  let prisma: PrismaClient;
  let adminService: AdminService;

  let testUser: any;
  let adminUser: any;
  let testProduct: any;
  let testOrder: any;
  let testOrderItem: any;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();
    adminService = new AdminService(prisma as any);

    const timestamp = Date.now();
    testUser = await prisma.user.create({
      data: {
        email: `serial-customer-${timestamp}@test.laptopmitra.local`,
        firebaseUid: `fb-serial-cust-${timestamp}`,
        referralCode: `MTR-ST-${timestamp.toString().slice(-4)}`,
        name: 'Serial Test Customer',
        phone: '9876543288',
        role: 'CUSTOMER',
      },
    });

    adminUser = await prisma.user.create({
      data: {
        email: `serial-admin-${timestamp}@test.laptopmitra.local`,
        firebaseUid: `fb-serial-adm-${timestamp}`,
        referralCode: `MTR-SA-${timestamp.toString().slice(-4)}`,
        name: 'Serial Test Admin',
        phone: '9876543289',
        role: 'ADMIN',
      },
    });

    testProduct = await prisma.product.create({
      data: {
        name: `Dell Latitude 7420 (${timestamp})`,
        slug: `dell-latitude-7420-${timestamp}`,
        sku: `SKU-DL7420-${timestamp}`,
        price: '64999.00',
        stock: 10,
        status: 'ACTIVE',
        metadata: {
          brand: 'Dell',
          warrantyMonths: 12,
        },
      },
    });
  });

  beforeEach(async () => {
    const timestamp = Date.now() + Math.floor(Math.random() * 10000);
    testOrder = await prisma.order.create({
      data: {
        orderNumber: `LM-ORD-ST-${timestamp.toString().slice(-6)}`,
        userId: testUser.id,
        email: testUser.email,
        subtotal: '64999.00',
        finalAmount: '64999.00',
        status: 'CONFIRMED',
      },
    });

    testOrderItem = await prisma.orderItem.create({
      data: {
        orderId: testOrder.id,
        productId: testProduct.id,
        quantity: 2,
        price: '64999.00',
        purchaseMode: 'sell',
        hasWarranty: false,
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.warrantyCoverage.deleteMany({
        where: { soldUnit: { userId: testUser.id } },
      }).catch(() => {});
      await prisma.soldUnitSerialHistory.deleteMany({
        where: { soldUnit: { userId: testUser.id } },
      }).catch(() => {});
      await prisma.soldUnit.deleteMany({
        where: { userId: testUser.id },
      }).catch(() => {});
      await prisma.orderItem.deleteMany({
        where: { order: { userId: testUser.id } },
      }).catch(() => {});
      await prisma.delivery.deleteMany({
        where: { order: { userId: testUser.id } },
      }).catch(() => {});
      await prisma.order.deleteMany({
        where: { userId: testUser.id },
      }).catch(() => {});
      if (testProduct) {
        await prisma.product.delete({ where: { id: testProduct.id } }).catch(() => {});
      }
      if (testUser) {
        await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
      }
      if (adminUser) {
        await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});
      }
    } finally {
      await prisma.$disconnect();
    }
  });

  describe('1. Dispatch Serial Assignment Rules', () => {
    it('rejects moving to SHIPPING without serial numbers when no override is given', async () => {
      await expect(
        adminService.updateOrderStatus(testOrder.id, 'SHIPPING', adminUser.id, {
          courierName: 'BlueDart',
          trackingNumber: 'BD123456789',
        }),
      ).rejects.toThrow(/Serial number is required/);
    });

    it('rejects duplicate serial numbers within the dispatch payload', async () => {
      const duplicateSerial = `SN-DUP-${Date.now()}`;
      await expect(
        adminService.updateOrderStatus(testOrder.id, 'SHIPPING', adminUser.id, {
          courierName: 'BlueDart',
          trackingNumber: 'BD123456789',
          serialAssignments: [
            { orderItemId: testOrderItem.id, unitIndex: 1, serialNumber: duplicateSerial },
            { orderItemId: testOrderItem.id, unitIndex: 2, serialNumber: duplicateSerial },
          ],
        }),
      ).rejects.toThrow(/Duplicate serial numbers submitted/);
    });

    it('allows dispatch when administrative overrideReason is provided', async () => {
      const result = await adminService.updateOrderStatus(testOrder.id, 'SHIPPING', adminUser.id, {
        courierName: 'BlueDart',
        trackingNumber: 'BD123456789',
        overrideReason: 'Emergency customer dispatch requested prior to barcode scanning',
      });

      expect(result.status).toBe('SHIPPING');

      const units = await prisma.soldUnit.findMany({
        where: { orderItemId: testOrderItem.id },
      });
      expect(units.length).toBe(2);
      expect(units[0].isDispatched).toBe(true);
      expect(units[0].overrideReason).toContain('Emergency customer dispatch');
    });

    it('successfully assigns unique serials, creates SoldUnits and records audit history', async () => {
      const serial1 = `SN-DELL-${Date.now()}-01`;
      const serial2 = `SN-DELL-${Date.now()}-02`;

      const result = await adminService.updateOrderStatus(testOrder.id, 'SHIPPING', adminUser.id, {
        courierName: 'Delhivery',
        trackingNumber: 'DEL987654321',
        serialAssignments: [
          { orderItemId: testOrderItem.id, unitIndex: 1, serialNumber: serial1 },
          { orderItemId: testOrderItem.id, unitIndex: 2, serialNumber: serial2 },
        ],
      });

      expect(result.status).toBe('SHIPPING');

      const units = await prisma.soldUnit.findMany({
        where: { orderItemId: testOrderItem.id },
        orderBy: { unitIndex: 'asc' },
      });

      expect(units.length).toBe(2);
      expect(units[0].serialNumber).toBe(serial1);
      expect(units[1].serialNumber).toBe(serial2);
      expect(units[0].brandSnapshot).toBe('Dell');

      const history = await prisma.soldUnitSerialHistory.findMany({
        where: { soldUnitId: units[0].id },
      });
      expect(history.length).toBeGreaterThanOrEqual(1);
      expect(history[0].newSerial).toBe(serial1);
      expect(history[0].reason).toContain('dispatch');
    });
  });

  describe('2. Delivery & Warranty Coverage Generation', () => {
    it('creates WarrantyCoverage records at DELIVERED state', async () => {
      const serial1 = `SN-WARR-${Date.now()}-01`;
      const serial2 = `SN-WARR-${Date.now()}-02`;

      await adminService.updateOrderStatus(testOrder.id, 'SHIPPING', adminUser.id, {
        courierName: 'Delhivery',
        trackingNumber: 'DEL111222333',
        serialAssignments: [
          { orderItemId: testOrderItem.id, unitIndex: 1, serialNumber: serial1 },
          { orderItemId: testOrderItem.id, unitIndex: 2, serialNumber: serial2 },
        ],
      });

      const deliveredResult = await adminService.updateOrderStatus(testOrder.id, 'DELIVERED', adminUser.id);
      expect(deliveredResult.status).toBe('DELIVERED');

      const units = await prisma.soldUnit.findMany({
        where: { orderItemId: testOrderItem.id },
        include: { warrantyCoverage: true },
      });

      expect(units[0].warrantyCoverage).toBeDefined();
      expect(units[0].warrantyCoverage?.status).toBe('ACTIVE');
      expect(units[0].warrantyCoverage?.source).toBe('BASE');
      expect(units[0].warrantyCoverage?.monthsSnapshot).toBe(12);

      // Verify idempotency: calling DELIVERED again does not duplicate or throw
      const repeatResult = await adminService.updateOrderStatus(testOrder.id, 'DELIVERED', adminUser.id);
      expect(repeatResult.status).toBe('DELIVERED');
    });
  });

  describe('3. Audited Serial Number Modification', () => {
    it('updates serial number and writes an immutable audit record', async () => {
      const serial1 = `SN-MOD-${Date.now()}-01`;
      const serial2 = `SN-MOD-${Date.now()}-02`;

      await adminService.updateOrderStatus(testOrder.id, 'SHIPPING', adminUser.id, {
        courierName: 'Delhivery',
        trackingNumber: 'DEL-MOD-1',
        serialAssignments: [
          { orderItemId: testOrderItem.id, unitIndex: 1, serialNumber: serial1 },
          { orderItemId: testOrderItem.id, unitIndex: 2, serialNumber: serial2 },
        ],
      });

      const unit = await prisma.soldUnit.findFirst({
        where: { orderItemId: testOrderItem.id, unitIndex: 1 },
      });
      expect(unit).toBeDefined();

      const updatedSerial = `SN-CORRECTED-${Date.now()}`;
      const result = await adminService.updateUnitSerial(
        unit!.id,
        {
          serialNumber: updatedSerial,
          reason: 'Corrected typo from warehouse barcode scanner',
        },
        adminUser.id,
      );

      expect(result.serialNumber).toBe(updatedSerial);

      const history = await prisma.soldUnitSerialHistory.findFirst({
        where: {
          soldUnitId: unit!.id,
          newSerial: updatedSerial,
        },
      });
      expect(history).toBeDefined();
      expect(history?.reason).toContain('typ');
    });

    it('rejects assigning an existing active serial number', async () => {
      const serial1 = `SN-REJ-${Date.now()}-01`;
      const serial2 = `SN-REJ-${Date.now()}-02`;

      await adminService.updateOrderStatus(testOrder.id, 'SHIPPING', adminUser.id, {
        courierName: 'Delhivery',
        trackingNumber: 'DEL-REJ-1',
        serialAssignments: [
          { orderItemId: testOrderItem.id, unitIndex: 1, serialNumber: serial1 },
          { orderItemId: testOrderItem.id, unitIndex: 2, serialNumber: serial2 },
        ],
      });

      const units = await prisma.soldUnit.findMany({
        where: { orderItemId: testOrderItem.id },
        orderBy: { unitIndex: 'asc' },
      });
      expect(units.length).toBe(2);

      await expect(
        adminService.updateUnitSerial(
          units[0].id,
          {
            serialNumber: units[1].serialNumber!,
            reason: 'Testing duplicate rejection',
          },
          adminUser.id,
        ),
      ).rejects.toThrow(/already assigned to another active unit/);
    });
  });

  describe('4. Warranty Register & Unit 360 Queries', () => {
    it('returns paginated warranty register with search and filters', async () => {
      const res = await adminService.getWarrantyRegister({
        page: 1,
        pageSize: 10,
        status: 'ACTIVE',
      });

      expect(res.items).toBeDefined();
      expect(Array.isArray(res.items)).toBe(true);
      expect(res.total).toBeGreaterThanOrEqual(1);
    });

    it('fetches unit 360 details by serial number', async () => {
      const serial1 = `SN-360-${Date.now()}-01`;
      const serial2 = `SN-360-${Date.now()}-02`;

      await adminService.updateOrderStatus(testOrder.id, 'SHIPPING', adminUser.id, {
        courierName: 'Delhivery',
        trackingNumber: 'DEL-360-1',
        serialAssignments: [
          { orderItemId: testOrderItem.id, unitIndex: 1, serialNumber: serial1 },
          { orderItemId: testOrderItem.id, unitIndex: 2, serialNumber: serial2 },
        ],
      });

      await adminService.updateOrderStatus(testOrder.id, 'DELIVERED', adminUser.id);

      const unit = await prisma.soldUnit.findFirst({
        where: { orderItemId: testOrderItem.id, unitIndex: 1 },
      });

      const res = await adminService.getUnitBySerial(unit!.serialNumber!);
      expect(res.id).toBe(unit!.id);
      expect(res.serialHistory).toBeDefined();
      expect(res.warrantyCoverage).toBeDefined();
    });
  });
});
