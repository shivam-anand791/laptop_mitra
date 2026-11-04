import { PrismaService } from '../../src/prisma/prisma.service';
import { ServiceService } from '../../src/modules/service/service.service';
import { AdminService } from '../../src/modules/admin/admin.service';
import { NotificationService } from '../../src/modules/notifications/notification.service';
import { randomUUID } from 'crypto';

describe('Service Reminders, Deduplication & Leased Laptops (Stages 6 & 7)', () => {
  let prisma: PrismaService;
  let serviceService: ServiceService;
  let adminService: AdminService;
  let notificationService: NotificationService;

  let testCustomer: any;
  let testAdmin: any;
  let testTechnician: any;
  let testProduct: any;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    notificationService = new NotificationService(prisma);
    serviceService = new ServiceService(prisma, notificationService);
    adminService = new AdminService(prisma);

    const runId = randomUUID().slice(0, 8);
    testCustomer = await prisma.user.create({
      data: {
        id: `cust-rem-${runId}`,
        firebaseUid: `fb-cust-rem-${runId}`,
        referralCode: `REF-REM-${runId}`,
        email: `cust-rem-${runId}@example.com`,
        name: 'Reminder Test Customer',
        role: 'CUSTOMER',
      },
    });

    testAdmin = await prisma.user.create({
      data: {
        id: `admin-rem-${runId}`,
        firebaseUid: `fb-admin-rem-${runId}`,
        referralCode: `REF-ADM-${runId}`,
        email: `admin-rem-${runId}@example.com`,
        name: 'Reminder Admin',
        role: 'ADMIN',
      },
    });

    testTechnician = await prisma.user.create({
      data: {
        id: `tech-rem-${runId}`,
        firebaseUid: `fb-tech-rem-${runId}`,
        referralCode: `REF-TECH-${runId}`,
        email: `tech-rem-${runId}@example.com`,
        name: 'Service Tech',
        role: 'TECHNICIAN',
      },
    });

    const category = await prisma.category.upsert({
      where: { slug: 'laptops-reminders-test' },
      update: {},
      create: { name: 'Laptops Reminders Test', slug: 'laptops-reminders-test' },
    });

    testProduct = await prisma.product.create({
      data: {
        name: `ThinkPad X1 Reminders ${runId}`,
        slug: `thinkpad-x1-rem-${runId}`,
        categoryId: category.id,
        price: 52000,
        sku: `SKU-REM-${runId}`,
        stock: 5,
        status: 'ACTIVE',
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. Reminder Engine & Deduplication Protection (Stage 6)', () => {
    it('sends reminder for entitlement approaching 30-day window and prevents duplicate sends', async () => {
      const serial = `SN-REM-${randomUUID().slice(0, 8).toUpperCase()}`;

      // Create an outright order and deliver it
      const order = await prisma.order.create({
        data: {
          orderNumber: `ORD-REM-${randomUUID().slice(0, 6)}`,
          userId: testCustomer.id,
          email: 'test-rem@example.com',
          status: 'CONFIRMED',
          paymentStatus: 'COMPLETED',
          paymentMethod: 'ONLINE',
          subtotal: 52000,
          finalAmount: 52000,
          items: {
            create: {
              productId: testProduct.id,
              quantity: 1,
              price: 52000,
              purchaseMode: 'sell',
            },
          },
        },
        include: { items: true },
      });

      await adminService.updateOrderStatus(order.id, 'SHIPPING', testAdmin.id, {
        courierName: 'BlueDart',
        trackingNumber: `BD-${randomUUID().slice(0, 8)}`,
        serialAssignments: [
          {
            orderItemId: order.items[0].id,
            unitIndex: 1,
            serialNumber: serial,
          },
        ],
      });

      await adminService.updateOrderStatus(order.id, 'DELIVERED', testAdmin.id);

      const unit = await prisma.soldUnit.findFirst({
        where: { serialNumber: serial },
        include: { entitlements: true },
      });

      expect(unit).toBeDefined();

      // Update the entitlement's periodEnd to match the 30-day window
      const now = Date.now();
      const targetDate = new Date(now + 30 * 24 * 60 * 60 * 1000 - 3600 * 1000);

      const entitlement = await prisma.serviceEntitlement.update({
        where: { id: unit!.entitlements[0].id },
        data: { periodEnd: targetDate },
      });

      // First run: should detect and dispatch 30-day reminder
      const run1 = await serviceService.processServiceReminders();
      expect(run1.remindersSent).toBeGreaterThanOrEqual(1);

      // Verify record exists in NotificationDedupeLog
      const dedupeKey = `${entitlement.id}_30d`;
      const dedupeRecord = await prisma.notificationDedupeLog.findUnique({
        where: {
          templateKey_dedupeKey: {
            templateKey: 'SERVICE_EXPIRY_REMINDER',
            dedupeKey,
          },
        },
      });
      expect(dedupeRecord).toBeDefined();
      expect(dedupeRecord?.recipient).toBe(testCustomer.id);

      // Second run: must be completely idempotent (0 duplicate reminders sent for this entitlement)
      const run2 = await serviceService.processServiceReminders();
      const logsForThisEntitlement = await prisma.notificationDedupeLog.findMany({
        where: {
          templateKey: 'SERVICE_EXPIRY_REMINDER',
          dedupeKey,
        },
      });
      expect(logsForThisEntitlement.length).toBe(1);
    });
  });

  describe('2. Leased Laptop Monthly Maintenance (Stage 7)', () => {
    it('creates LEASE_MONTHLY entitlement upon delivery of a leased laptop', async () => {
      const serial = `SN-LEASE-${randomUUID().slice(0, 8).toUpperCase()}`;

      // Create an order with purchaseMode: rent
      const order = await prisma.order.create({
        data: {
          orderNumber: `ORD-LEASE-${randomUUID().slice(0, 6)}`,
          userId: testCustomer.id,
          email: 'test-lease@example.com',
          status: 'CONFIRMED',
          paymentStatus: 'COMPLETED',
          paymentMethod: 'ONLINE',
          subtotal: 3000,
          finalAmount: 3000,
          items: {
            create: {
              productId: testProduct.id,
              quantity: 1,
              price: 3000,
              purchaseMode: 'rent',
              tenureMonths: 6,
            },
          },
        },
        include: { items: true },
      });

      // Move to SHIPPING with serial assignment
      await adminService.updateOrderStatus(order.id, 'SHIPPING', testAdmin.id, {
        courierName: 'BlueDart',
        trackingNumber: `BD-${randomUUID().slice(0, 8)}`,
        serialAssignments: [
          {
            orderItemId: order.items[0].id,
            unitIndex: 1,
            serialNumber: serial,
          },
        ],
      });

      // Move to DELIVERED
      await adminService.updateOrderStatus(order.id, 'DELIVERED', testAdmin.id);

      // Verify SoldUnit
      const soldUnit = await prisma.soldUnit.findFirst({
        where: { serialNumber: serial },
        include: { entitlements: true },
      });
      expect(soldUnit).toBeDefined();

      // Verify LEASE_MONTHLY entitlement was created
      const leaseEntitlement = soldUnit?.entitlements.find(
        (e) => e.kind === 'LEASE_MONTHLY' && e.cycleMonth === 1,
      );
      expect(leaseEntitlement).toBeDefined();
      expect(leaseEntitlement?.status).toBe('AVAILABLE');

      // Customer can book monthly maintenance service
      const booking = await serviceService.bookService(testCustomer.id, 'CUSTOMER', soldUnit!.id, {
        preferredDate: '2026-11-20',
        preferredSlot: 'MORNING_10_TO_1',
        pickupAddress: {
          fullName: 'Test Customer',
          phone: '9876543210',
          address: '42 MG Road',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560001',
        },
        pickupPincode: '560001',
        backupAcknowledged: true,
      });

      expect(booking.jobNumber).toMatch(/^SRV-\d{6}-\d{5}$/);
      expect(booking.status).toBe('REQUESTED');

      // Verify entitlement transitioned to BOOKED
      const updatedEntitlement = await prisma.serviceEntitlement.findUnique({
        where: { id: leaseEntitlement!.id },
      });
      expect(updatedEntitlement?.status).toBe('BOOKED');
    });
  });
});
