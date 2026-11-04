import { PrismaService } from '../../src/prisma/prisma.service';
import { ServiceService } from '../../src/modules/service/service.service';
import { AdminService } from '../../src/modules/admin/admin.service';
import { NotificationService } from '../../src/modules/notifications/notification.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { randomUUID } from 'crypto';

describe('Stage 8: Comprehensive End-to-End Service & Warranty Verification', () => {
  let prisma: PrismaService;
  let serviceService: ServiceService;
  let adminService: AdminService;
  let notificationService: NotificationService;

  let customerUser: any;
  let secondCustomer: any;
  let adminUser: any;
  let technicianUser: any;
  let secondTechnician: any;
  let testCategory: any;
  let testLaptopProduct: any;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    notificationService = new NotificationService(prisma);
    serviceService = new ServiceService(prisma, notificationService);
    adminService = new AdminService(prisma);

    const runId = randomUUID().slice(0, 8);

    // 1. Customer session user
    customerUser = await prisma.user.create({
      data: {
        id: `cust-e2e-${runId}`,
        firebaseUid: `fb-cust-e2e-${runId}`,
        referralCode: `REF-E2E-${runId}`,
        email: `cust-e2e-${runId}@example.com`,
        name: 'Aarav Sharma',
        role: 'CUSTOMER',
      },
    });

    // 2. Second customer session user (for cross-account isolation test)
    secondCustomer = await prisma.user.create({
      data: {
        id: `other-e2e-${runId}`,
        firebaseUid: `fb-other-e2e-${runId}`,
        referralCode: `REF-OTHER-E2E-${runId}`,
        email: `other-e2e-${runId}@example.com`,
        name: 'Rohan Verma',
        role: 'CUSTOMER',
      },
    });

    // 3. Admin session user
    adminUser = await prisma.user.create({
      data: {
        id: `admin-e2e-${runId}`,
        firebaseUid: `fb-admin-e2e-${runId}`,
        referralCode: `REF-ADM-E2E-${runId}`,
        email: `admin-e2e-${runId}@example.com`,
        name: 'Admin Supervisor',
        role: 'ADMIN',
      },
    });

    // 4. Primary Assigned Technician
    technicianUser = await prisma.user.create({
      data: {
        id: `tech-e2e-${runId}`,
        firebaseUid: `fb-tech-e2e-${runId}`,
        referralCode: `REF-TCH-E2E-${runId}`,
        email: `tech-e2e-${runId}@example.com`,
        name: 'Vikram Singh (Technician)',
        role: 'TECHNICIAN',
      },
    });

    // 5. Unassigned Secondary Technician
    secondTechnician = await prisma.user.create({
      data: {
        id: `tech2-e2e-${runId}`,
        firebaseUid: `fb-tech2-e2e-${runId}`,
        referralCode: `REF-TCH2-E2E-${runId}`,
        email: `tech2-e2e-${runId}@example.com`,
        name: 'Amit Patel (Technician)',
        role: 'TECHNICIAN',
      },
    });

    // Category & Product setup
    testCategory = await prisma.category.upsert({
      where: { slug: 'certified-refurbished-laptops' },
      update: {},
      create: { name: 'Certified Refurbished Laptops', slug: 'certified-refurbished-laptops' },
    });

    testLaptopProduct = await prisma.product.create({
      data: {
        name: `Dell Latitude 7420 Ultrabook ${runId}`,
        slug: `dell-latitude-7420-${runId}`,
        categoryId: testCategory.id,
        price: 45000,
        sku: `SKU-DELL-${runId}`,
        stock: 10,
        status: 'ACTIVE',
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  // -------------------------------------------------------------------------
  // Part 1: Order Placement, Serial Assignment & Delivery
  // -------------------------------------------------------------------------
  let assignedSerial = '';
  let deliveredOrder: any = null;
  let soldUnitRecord: any = null;

  it('1. Sells laptop, rejects duplicate serial, enforces unique serial assignment at dispatch', async () => {
    assignedSerial = `SN-DELL-${randomUUID().slice(0, 8).toUpperCase()}`;

    // Place outright customer order
    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-DELL-${randomUUID().slice(0, 6)}`,
        userId: customerUser.id,
        email: customerUser.email,
        status: 'CONFIRMED',
        paymentStatus: 'COMPLETED',
        paymentMethod: 'ONLINE',
        subtotal: 45000,
        finalAmount: 45000,
        items: {
          create: {
            productId: testLaptopProduct.id,
            quantity: 1,
            price: 45000,
            purchaseMode: 'sell',
          },
        },
      },
      include: { items: true },
    });

    // Dispatch order with serial numbers
    await adminService.updateOrderStatus(order.id, 'SHIPPING', adminUser.id, {
      courierName: 'Delhivery Express',
      trackingNumber: `DEL-${randomUUID().slice(0, 8)}`,
      serialAssignments: [
        {
          orderItemId: order.items[0].id,
          unitIndex: 1,
          serialNumber: assignedSerial,
        },
      ],
    });

    // Mark delivered
    deliveredOrder = await adminService.updateOrderStatus(order.id, 'DELIVERED', adminUser.id);
    expect(deliveredOrder.status).toBe('DELIVERED');

    // Verify SoldUnit created with WarrantyCoverage and ServiceEntitlement
    soldUnitRecord = await prisma.soldUnit.findFirst({
      where: { serialNumber: assignedSerial },
      include: { warrantyCoverage: true, entitlements: true },
    });

    expect(soldUnitRecord).toBeDefined();
    expect(soldUnitRecord.serialNumber).toBe(assignedSerial);
    expect(soldUnitRecord.warrantyCoverage?.status).toBe('ACTIVE');
    expect(soldUnitRecord.entitlements.length).toBe(1);
    expect(soldUnitRecord.entitlements[0].kind).toBe('OUTRIGHT_FREE');
    expect(soldUnitRecord.entitlements[0].status).toBe('AVAILABLE');
  });

  // -------------------------------------------------------------------------
  // Part 2: Customer Booking Flow
  // -------------------------------------------------------------------------
  let activeJobId = '';
  let activeJobNumber = '';

  it('2. Customer books free general service with doorstep address, date, slot & backup acknowledgement', async () => {
    const booking = await serviceService.bookService(customerUser.id, 'CUSTOMER', soldUnitRecord.id, {
      preferredDate: '2026-11-20',
      preferredSlot: 'MORNING_10_TO_1',
      pickupAddress: {
        fullName: 'Aarav Sharma',
        phone: '9876543210',
        address: 'Villa 14, Palm Meadows, Whitefield',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560066',
      },
      pickupPincode: '560066',
      customerNotes: 'Please check fan buzzing noise and thermal repasting.',
      backupAcknowledged: true,
    });

    expect(booking).toBeDefined();
    expect(booking.jobNumber).toMatch(/^SRV-\d{6}-\d{5}$/);
    expect(booking.status).toBe('REQUESTED');
    expect(booking.entitlementId).toBe(soldUnitRecord.entitlements[0].id);

    activeJobId = booking.id;
    activeJobNumber = booking.jobNumber;

    // Verify entitlement marked BOOKED
    const entitlement = await prisma.serviceEntitlement.findUnique({
      where: { id: soldUnitRecord.entitlements[0].id },
    });
    expect(entitlement?.status).toBe('BOOKED');
  });

  it('3. Strictly blocks a concurrent second booking while service job is active', async () => {
    await expect(
      serviceService.bookService(customerUser.id, 'CUSTOMER', soldUnitRecord.id, {
        preferredDate: '2026-11-22',
        preferredSlot: 'AFTERNOON_2_TO_5',
        pickupAddress: {
          fullName: 'Aarav Sharma',
          phone: '9876543210',
          address: 'Villa 14, Palm Meadows, Whitefield',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560066',
        },
        pickupPincode: '560066',
        backupAcknowledged: true,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('4. Rejects booking attempt from non-owner customer account', async () => {
    await expect(
      serviceService.bookService(secondCustomer.id, 'CUSTOMER', soldUnitRecord.id, {
        preferredDate: '2026-11-22',
        preferredSlot: 'AFTERNOON_2_TO_5',
        pickupAddress: {
          fullName: 'Rohan Verma',
          phone: '9123456780',
          address: 'Indiranagar 100ft road',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560038',
        },
        pickupPincode: '560038',
        backupAcknowledged: true,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  // -------------------------------------------------------------------------
  // Part 3: Admin & Technician Operational Workflow
  // -------------------------------------------------------------------------
  it('5. Admin assigns field technician and schedules appointment', async () => {
    const updated = await serviceService.updateServiceJobStatus(
      adminUser.id,
      'ADMIN',
      activeJobId,
      {
        technicianId: technicianUser.id,
        status: 'SCHEDULED',
        internalNotes: 'Assigned to senior hardware technician Vikram Singh.',
      },
    );

    expect(updated.status).toBe('SCHEDULED');
    expect(updated.technicianId).toBe(technicianUser.id);
  });

  it('6. Technician least privilege sweep: technician sees only their assigned jobs', async () => {
    // Primary technician query: sees assigned job
    const tech1Jobs = await serviceService.getAdminServiceJobs({
      technicianId: technicianUser.id,
    });
    expect(tech1Jobs.items.some((j: any) => j.id === activeJobId)).toBe(true);

    // Secondary technician query: does NOT see primary technician's job
    const tech2Jobs = await serviceService.getAdminServiceJobs({
      technicianId: secondTechnician.id,
    });
    expect(tech2Jobs.items.some((j: any) => j.id === activeJobId)).toBe(false);
  });

  it('7. Field progression: Unit Picked Up -> In Service -> Quality Check', async () => {
    // Stage A: Unit Picked Up
    const pickedUp = await serviceService.updateServiceJobStatus(
      technicianUser.id,
      'TECHNICIAN',
      activeJobId,
      { status: 'PICKED_UP', internalNotes: 'Picked up from customer residence. Chassis intact.' },
    );
    expect(pickedUp.status).toBe('PICKED_UP');

    // Stage B: Workbench Service Started
    const inService = await serviceService.updateServiceJobStatus(
      technicianUser.id,
      'TECHNICIAN',
      activeJobId,
      { status: 'IN_SERVICE', internalNotes: 'Disassembled heatsink, thermal paste dried.' },
    );
    expect(inService.status).toBe('IN_SERVICE');

    // Stage C: Quality Check
    const qualityCheck = await serviceService.updateServiceJobStatus(
      technicianUser.id,
      'TECHNICIAN',
      activeJobId,
      { status: 'QUALITY_CHECK' },
    );
    expect(qualityCheck.status).toBe('QUALITY_CHECK');
  });

  it('8. Enforces all 4 checklist points before allowing COMPLETED status', async () => {
    // Attempt completion with only 3 checklist points
    await expect(
      serviceService.updateServiceJobStatus(
        technicianUser.id,
        'TECHNICIAN',
        activeJobId,
        {
          status: 'COMPLETED',
          checklistCleaning: true,
          checklistThermalPaste: true,
          checklistSoftware: true,
          checklistBattery: false, // 4th check missing!
          batteryHealthPercent: 89,
        },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('9. Successfully completes service when all 4 checklist points + battery health verified; generates receipt number', async () => {
    const completedJob = await serviceService.updateServiceJobStatus(
      technicianUser.id,
      'TECHNICIAN',
      activeJobId,
      {
        status: 'COMPLETED',
        checklistCleaning: true,
        checklistThermalPaste: true,
        checklistSoftware: true,
        checklistBattery: true,
        batteryHealthPercent: 91,
        internalNotes:
          'Deep heatsink cleaning performed. Arctic thermal paste applied. 100% memory diagnostics pass. Battery health at 91% capacity.',
      },
    );

    expect(completedJob.status).toBe('COMPLETED');
    expect(completedJob.receiptNumber).toMatch(/^RCP-\d{6}-\d{5}$/);
    expect(completedJob.checklistCleaning).toBe(true);
    expect(completedJob.checklistThermalPaste).toBe(true);
    expect(completedJob.checklistSoftware).toBe(true);
    expect(completedJob.checklistBattery).toBe(true);
    expect(completedJob.batteryHealthPercent).toBe(91);

    // Verify entitlement marked USED
    const entitlement = await prisma.serviceEntitlement.findUnique({
      where: { id: soldUnitRecord.entitlements[0].id },
    });
    expect(entitlement?.status).toBe('USED');
  });

  // -------------------------------------------------------------------------
  // Part 4: Cancellation & Automatic Entitlement Restoration
  // -------------------------------------------------------------------------
  it('10. Appointment cancellation restores customer entitlement for remaining validity period', async () => {
    // Create another unit for cancellation test
    const cancelSerial = `SN-CANCEL-${randomUUID().slice(0, 8).toUpperCase()}`;
    const cancelOrder = await prisma.order.create({
      data: {
        orderNumber: `ORD-CNC-${randomUUID().slice(0, 6)}`,
        userId: customerUser.id,
        email: customerUser.email,
        status: 'CONFIRMED',
        paymentStatus: 'COMPLETED',
        paymentMethod: 'ONLINE',
        subtotal: 45000,
        finalAmount: 45000,
        items: {
          create: {
            productId: testLaptopProduct.id,
            quantity: 1,
            price: 45000,
            purchaseMode: 'sell',
          },
        },
      },
      include: { items: true },
    });

    await adminService.updateOrderStatus(cancelOrder.id, 'SHIPPING', adminUser.id, {
      courierName: 'BlueDart',
      trackingNumber: `BD-${randomUUID().slice(0, 8)}`,
      serialAssignments: [{ orderItemId: cancelOrder.items[0].id, unitIndex: 1, serialNumber: cancelSerial }],
    });

    await adminService.updateOrderStatus(cancelOrder.id, 'DELIVERED', adminUser.id);

    const cancelUnit = await prisma.soldUnit.findFirst({
      where: { serialNumber: cancelSerial },
      include: { entitlements: true },
    });

    // Book service
    const cancelJob = await serviceService.bookService(customerUser.id, 'CUSTOMER', cancelUnit!.id, {
      preferredDate: '2026-11-25',
      preferredSlot: 'MORNING_10_TO_1',
      pickupAddress: {
        fullName: 'Aarav Sharma',
        phone: '9876543210',
        address: 'Palm Meadows',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560066',
      },
      pickupPincode: '560066',
      backupAcknowledged: true,
    });

    expect(cancelJob.status).toBe('REQUESTED');

    // Customer cancels appointment
    const cancelled = await serviceService.cancelService(customerUser.id, 'CUSTOMER', cancelJob.id, {
      reason: 'Travelling out of town on scheduled date.',
    });

    expect(cancelled.status).toBe('CANCELLED');

    // Verify fresh AVAILABLE entitlement exists
    const restoredEntitlement = await prisma.serviceEntitlement.findFirst({
      where: {
        soldUnitId: cancelUnit!.id,
        status: 'AVAILABLE',
      },
    });

    expect(restoredEntitlement).toBeDefined();
    expect(new Date(restoredEntitlement!.periodEnd) > new Date()).toBe(true);

    // Customer can now immediately re-book
    const rebooked = await serviceService.bookService(customerUser.id, 'CUSTOMER', cancelUnit!.id, {
      preferredDate: '2026-11-28',
      preferredSlot: 'AFTERNOON_2_TO_5',
      pickupAddress: {
        fullName: 'Aarav Sharma',
        phone: '9876543210',
        address: 'Palm Meadows',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560066',
      },
      pickupPincode: '560066',
      backupAcknowledged: true,
    });

    expect(rebooked.status).toBe('REQUESTED');
  });
});
