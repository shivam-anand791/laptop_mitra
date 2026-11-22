import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ServiceService } from '../../src/modules/service/service.service';
import { AdminService } from '../../src/modules/admin/admin.service';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';

describe('Service Lifecycle, Concurrency & Booking Engine (Stage 3)', () => {
  let prisma: PrismaService;
  let serviceService: ServiceService;
  let adminService: AdminService;

  let testCustomer: any;
  let otherCustomer: any;
  let testAdmin: any;
  let testTechnician: any;
  let testProduct: any;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    serviceService = new ServiceService(prisma);
    adminService = new AdminService(prisma);

    // Setup test users
    const runId = randomUUID().slice(0, 8);
    testCustomer = await prisma.user.create({
      data: {
        id: `cust-${runId}`,
        firebaseUid: `fb-cust-${runId}`,
        referralCode: `REF-CUST-${runId}`,
        email: `cust-${runId}@example.com`,
        name: 'Test Customer',
        role: 'CUSTOMER',
      },
    });

    otherCustomer = await prisma.user.create({
      data: {
        id: `other-${runId}`,
        firebaseUid: `fb-other-${runId}`,
        referralCode: `REF-OTHER-${runId}`,
        email: `other-${runId}@example.com`,
        name: 'Other Customer',
        role: 'CUSTOMER',
      },
    });

    testAdmin = await prisma.user.create({
      data: {
        id: `admin-${runId}`,
        firebaseUid: `fb-admin-${runId}`,
        referralCode: `REF-ADMIN-${runId}`,
        email: `admin-${runId}@example.com`,
        name: 'Test Admin',
        role: 'ADMIN',
      },
    });

    testTechnician = await prisma.user.create({
      data: {
        id: `tech-${runId}`,
        firebaseUid: `fb-tech-${runId}`,
        referralCode: `REF-TECH-${runId}`,
        email: `tech-${runId}@example.com`,
        name: 'Test Technician',
        role: 'TECHNICIAN',
      },
    });

    const category = await prisma.category.upsert({
      where: { slug: 'laptops-test' },
      update: {},
      create: { name: 'Laptops Test', slug: 'laptops-test' },
    });

    testProduct = await prisma.product.create({
      data: {
        name: `ThinkPad X1 Test-${runId}`,
        slug: `thinkpad-x1-${runId}`,
        sku: `SKU-${runId}`,
        price: 85000,
        stock: 10,
        categoryId: category.id,
        metadata: {
          brand: 'Lenovo',
          warrantyMonths: 6,
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  async function createDeliveredOrder(userId: string, serial: string) {
    const order = await prisma.order.create({
      data: {
        userId,
        email: 'test@example.com',
        status: 'CONFIRMED',
        paymentStatus: 'COMPLETED',
        paymentMethod: 'ONLINE',
        subtotal: 85000,
        finalAmount: 85000,
        items: {
          create: {
            productId: testProduct.id,
            quantity: 1,
            price: 85000,
            purchaseMode: 'sell',
          },
        },
      },
      include: { items: true },
    });

    // Dispatch order with serial
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

    // Mark delivered -> triggers warranty & service entitlement
    const deliveredOrder = await adminService.updateOrderStatus(order.id, 'DELIVERED', testAdmin.id);

    const unit = await prisma.soldUnit.findFirst({
      where: { serialNumber: serial },
      include: { warrantyCoverage: true, entitlements: true },
    });

    return { order: deliveredOrder, unit };
  }

  describe('1. Entitlement Creation at Delivery', () => {
    it('creates 1 free general service entitlement valid for 6 months upon outright delivery', async () => {
      const serial = `SN-TEST-${randomUUID().slice(0, 8).toUpperCase()}`;
      const { unit } = await createDeliveredOrder(testCustomer.id, serial);

      expect(unit).toBeDefined();
      expect(unit?.serialNumber).toBe(serial);
      expect(unit?.warrantyCoverage).toBeDefined();
      expect(unit?.warrantyCoverage?.status).toBe('ACTIVE');

      const freeEntitlement = unit?.entitlements.find((e) => e.kind === 'OUTRIGHT_FREE');
      expect(freeEntitlement).toBeDefined();
      expect(freeEntitlement?.status).toBe('AVAILABLE');
      expect(freeEntitlement?.userId).toBe(testCustomer.id);

      // Verify 6 months window
      const start = new Date(freeEntitlement!.periodStart).getTime();
      const end = new Date(freeEntitlement!.periodEnd).getTime();
      const diffDays = Math.round((end - start) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBeGreaterThanOrEqual(175);
      expect(diffDays).toBeLessThanOrEqual(185);
    });

    it('is idempotent and does not create duplicate entitlements on multiple delivery updates', async () => {
      const serial = `SN-IDEMP-${randomUUID().slice(0, 8).toUpperCase()}`;
      const { order, unit } = await createDeliveredOrder(testCustomer.id, serial);

      // Call delivery update again
      await adminService.updateOrderStatus(order.id, 'DELIVERED', testAdmin.id);

      const entitlements = await prisma.serviceEntitlement.findMany({
        where: { soldUnitId: unit!.id, kind: 'OUTRIGHT_FREE' },
      });

      expect(entitlements.length).toBe(1);
    });
  });

  describe('2. Service Booking Engine & Row Lock Concurrency', () => {
    it('books free general service successfully and moves entitlement to BOOKED', async () => {
      const serial = `SN-BOOK-${randomUUID().slice(0, 8).toUpperCase()}`;
      const { unit } = await createDeliveredOrder(testCustomer.id, serial);

      const booking = await serviceService.bookService(
        testCustomer.id,
        'CUSTOMER',
        unit!.id,
        {
          preferredDate: '2026-11-20',
          preferredSlot: 'MORNING_10_TO_1',
          pickupAddress: {
            fullName: 'Test Customer',
            phone: '9876543210',
            address: '123 Tech Park',
            city: 'Bengaluru',
            state: 'Karnataka',
            pincode: '560038',
          },
          pickupPincode: '560038',
          customerNotes: 'Fan makes slight whirring noise under load',
          backupAcknowledged: true,
        },
      );

      expect(booking).toBeDefined();
      expect(booking.jobNumber).toMatch(/^SRV-\d{6}-\d{5}$/);
      expect(booking.status).toBe('REQUESTED');
      expect(booking.pickupPincode).toBe('560038');

      // Verify entitlement status transitioned
      const updatedEntitlement = await prisma.serviceEntitlement.findUnique({
        where: { id: booking.entitlementId },
      });
      expect(updatedEntitlement?.status).toBe('BOOKED');
      expect(updatedEntitlement?.consumedAt).toBeDefined();

      // Verify immutable audit event
      const events = await prisma.serviceEvent.findMany({
        where: { jobId: booking.id },
      });
      expect(events.length).toBe(1);
      expect(events[0].eventType).toBe('STATUS_CHANGE');
      expect(events[0].newStatus).toBe('REQUESTED');
      expect(events[0].actorId).toBe(testCustomer.id);
    });

    it('rejects booking by another customer who does not own the laptop', async () => {
      const serial = `SN-FORBID-${randomUUID().slice(0, 8).toUpperCase()}`;
      const { unit } = await createDeliveredOrder(testCustomer.id, serial);

      await expect(
        serviceService.bookService(otherCustomer.id, 'CUSTOMER', unit!.id, {
          preferredDate: '2026-11-20',
          preferredSlot: 'MORNING_10_TO_1',
          pickupAddress: { address: 'Unauthorized street' },
          pickupPincode: '560038',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects double booking when entitlement is already booked', async () => {
      const serial = `SN-DOUBLE-${randomUUID().slice(0, 8).toUpperCase()}`;
      const { unit } = await createDeliveredOrder(testCustomer.id, serial);

      // First booking
      await serviceService.bookService(testCustomer.id, 'CUSTOMER', unit!.id, {
        preferredDate: '2026-11-20',
        preferredSlot: 'MORNING_10_TO_1',
        pickupAddress: { address: '123 Main' },
        pickupPincode: '560038',
      });

      // Second booking attempt should fail
      await expect(
        serviceService.bookService(testCustomer.id, 'CUSTOMER', unit!.id, {
          preferredDate: '2026-11-22',
          preferredSlot: 'AFTERNOON_2_TO_5',
          pickupAddress: { address: '123 Main' },
          pickupPincode: '560038',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects booking when pickup pincode is outside service coverage area', async () => {
      const serial = `SN-PIN-${randomUUID().slice(0, 8).toUpperCase()}`;
      const { unit } = await createDeliveredOrder(testCustomer.id, serial);

      await expect(
        serviceService.bookService(testCustomer.id, 'CUSTOMER', unit!.id, {
          preferredDate: '2026-11-20',
          preferredSlot: 'MORNING_10_TO_1',
          pickupAddress: { address: 'Remote Village' },
          pickupPincode: '999999',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('3. Reschedule & Cancellation Lifecycle', () => {
    it('reschedules an open service job and logs audit event', async () => {
      const serial = `SN-RESCHED-${randomUUID().slice(0, 8).toUpperCase()}`;
      const { unit } = await createDeliveredOrder(testCustomer.id, serial);

      const job = await serviceService.bookService(testCustomer.id, 'CUSTOMER', unit!.id, {
        preferredDate: '2026-11-20',
        preferredSlot: 'MORNING_10_TO_1',
        pickupAddress: { address: '123 Main' },
        pickupPincode: '560038',
      });

      const rescheduled = await serviceService.rescheduleService(
        testCustomer.id,
        'CUSTOMER',
        job.id,
        {
          preferredDate: '2026-11-25',
          preferredSlot: 'EVENING_5_TO_8',
          reason: 'Need evening slot due to office hours',
        },
      );

      expect(rescheduled.status).toBe('RESCHEDULED');
      expect(rescheduled.rescheduledCount).toBe(1);
      expect(rescheduled.preferredSlot).toBe('EVENING_5_TO_8');

      const events = await prisma.serviceEvent.findMany({
        where: { jobId: job.id },
        orderBy: { createdAt: 'asc' },
      });

      expect(events.length).toBe(2);
      expect(events[1].eventType).toBe('RESCHEDULED');
      expect(events[1].notes).toBe('Need evening slot due to office hours');
    });

    it('cancels service job and restores entitlement to AVAILABLE automatically', async () => {
      const serial = `SN-CANCEL-${randomUUID().slice(0, 8).toUpperCase()}`;
      const { unit } = await createDeliveredOrder(testCustomer.id, serial);

      const job = await serviceService.bookService(testCustomer.id, 'CUSTOMER', unit!.id, {
        preferredDate: '2026-11-20',
        preferredSlot: 'MORNING_10_TO_1',
        pickupAddress: { address: '123 Main' },
        pickupPincode: '560038',
      });

      const cancelled = await serviceService.cancelService(
        testCustomer.id,
        'CUSTOMER',
        job.id,
        {
          reason: 'Travelling out of station',
        },
      );

      expect(cancelled.status).toBe('CANCELLED');
      expect(cancelled.cancellationReason).toBe('Travelling out of station');

      // Verify entitlement restored to AVAILABLE
      const entitlement = await prisma.serviceEntitlement.findFirst({
        where: { soldUnitId: unit!.id, status: 'AVAILABLE' },
      });
      expect(entitlement?.status).toBe('AVAILABLE');
      expect(entitlement?.consumedAt).toBeNull();

      // Verify the customer can now book a new appointment!
      const newBooking = await serviceService.bookService(testCustomer.id, 'CUSTOMER', unit!.id, {
        preferredDate: '2026-12-01',
        preferredSlot: 'AFTERNOON_2_TO_5',
        pickupAddress: { address: '123 Main' },
        pickupPincode: '560038',
      });

      expect(newBooking).toBeDefined();
      expect(newBooking.status).toBe('REQUESTED');
    });
  });

  describe('4. Technician & Admin Completion with 4-Point Quality Checklist', () => {
    it('rejects job completion if any of the 4 checklist items is incomplete', async () => {
      const serial = `SN-CHECK-${randomUUID().slice(0, 8).toUpperCase()}`;
      const { unit } = await createDeliveredOrder(testCustomer.id, serial);

      const job = await serviceService.bookService(testCustomer.id, 'CUSTOMER', unit!.id, {
        preferredDate: '2026-11-20',
        preferredSlot: 'MORNING_10_TO_1',
        pickupAddress: { address: '123 Main' },
        pickupPincode: '560038',
      });

      // Attempt completion with only 2 checklist items completed
      await expect(
        serviceService.updateServiceJobStatus(testTechnician.id, 'TECHNICIAN', job.id, {
          status: 'COMPLETED',
          checklistCleaning: true,
          checklistThermalPaste: true,
          checklistSoftware: false,
          checklistBattery: false,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('completes job when all 4 checklist points are verified, generates receipt number, and marks entitlement as USED', async () => {
      const serial = `SN-COMPLETE-${randomUUID().slice(0, 8).toUpperCase()}`;
      const { unit } = await createDeliveredOrder(testCustomer.id, serial);

      const job = await serviceService.bookService(testCustomer.id, 'CUSTOMER', unit!.id, {
        preferredDate: '2026-11-20',
        preferredSlot: 'MORNING_10_TO_1',
        pickupAddress: { address: '123 Main' },
        pickupPincode: '560038',
      });

      const completedJob = await serviceService.updateServiceJobStatus(
        testTechnician.id,
        'TECHNICIAN',
        job.id,
        {
          status: 'COMPLETED',
          checklistCleaning: true,
          checklistThermalPaste: true,
          checklistSoftware: true,
          checklistBattery: true,
          batteryHealthPercent: 92,
          internalNotes: 'Thermal paste replaced with Arctic MX-4. Fan cleaned. Diagnostics passed.',
        },
      );

      expect(completedJob.status).toBe('COMPLETED');
      expect(completedJob.receiptNumber).toMatch(/^RCP-\d{6}-\d{5}$/);
      expect(completedJob.batteryHealthPercent).toBe(92);
      expect(completedJob.actualDeliveredAt).toBeDefined();

      // Verify entitlement status transitioned to USED
      const entitlement = await prisma.serviceEntitlement.findUnique({
        where: { id: job.entitlementId },
      });
      expect(entitlement?.status).toBe('USED');
    });
  });
});
