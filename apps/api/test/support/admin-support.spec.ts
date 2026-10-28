import { Test, TestingModule } from '@nestjs/testing';
import { SupportService } from '../../src/modules/support/support.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentEncryptionService } from '../../src/common/encryption/payment-encryption.service';
import { PaymentService } from '../../src/modules/payments/payment.service';

describe('SupportService (Admin Support & Returns Workspace - Phase S5)', () => {
  let service: SupportService;
  let prisma: any;
  let encryptionService: any;
  let paymentService: any;

  const mockAdminUser = { id: 'usr-admin-1', name: 'Admin Staff', email: 'admin@laptopmitra.com', role: 'ADMIN' };
  const mockSupportUser = { id: 'usr-support-1', name: 'Support Agent', email: 'agent@laptopmitra.com', role: 'SUPPORT' };
  const mockCustomer = { id: 'usr-cust-1', name: 'Rohan Sharma', email: 'rohan@example.com' };

  const mockTicket = {
    id: 'tkt-test-101',
    ticketNumber: 'LM-T-1001',
    userId: mockCustomer.id,
    subject: 'Laptop overheating and shutting down',
    category: 'WARRANTY_REPAIR',
    priority: 'HIGH',
    status: 'NEW',
    assigneeId: null,
    firstResponseDueAt: new Date(Date.now() + 86400000),
    firstResponseAt: null,
    slaBreached: false,
    isArchived: false,
    reopenCount: 0,
    csatScore: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    _count: { messages: 1, attachments: 0 },
    user: mockCustomer,
    assignee: null,
    order: null,
  };

  const mockReturn = {
    id: 'ret-test-201',
    returnNumber: 'LM-R-5001',
    orderId: 'ord-123',
    userId: mockCustomer.id,
    status: 'REQUESTED',
    type: 'REFUND',
    reason: 'Screen has dead pixels',
    refundAmount: 28999,
    pickupTrackingNumber: null,
    encryptedRefundDetails: 'ENCRYPTED_PAYLOAD_STRING',
    refundAccountMasked: '••••••••1234',
    refundIfscMasked: 'HDFC••••234',
    manualRefundReference: null,
    razorpayRefundId: null,
    createdAt: new Date(),
    items: [{ id: 'ret-item-1', orderItemId: 'oi-1', unitPrice: 28999, restocked: false }],
    order: {
      id: 'ord-123',
      orderNumber: 'LM-ORD-999',
      paymentMethod: 'COD',
      finalAmount: 28999,
      status: 'DELIVERED',
    },
    user: mockCustomer,
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn((cb) => cb(prisma)),
      supportTicket: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      ticketMessage: {
        create: jest.fn(),
      },
      ticketEvent: {
        create: jest.fn(),
      },
      returnRequest: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      returnItem: {
        updateMany: jest.fn(),
      },
      savedReply: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      helpCategory: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      helpArticle: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      supportSettings: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
      order: {
        update: jest.fn(),
      },
      user: {
        findMany: jest.fn(),
      },
    };

    encryptionService = {
      encrypt: jest.fn((s) => `ENC:${s}`),
      decrypt: jest.fn((s) => JSON.stringify({ accountNumber: '987654321012', ifscCode: 'HDFC0001234', accountHolderName: 'Rohan Sharma' })),
    };

    paymentService = {
      refundPayment: jest.fn().mockResolvedValue({ status: 'REFUNDED' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportService,
        { provide: PrismaService, useValue: prisma },
        { provide: PaymentEncryptionService, useValue: encryptionService },
        { provide: PaymentService, useValue: paymentService },
      ],
    }).compile();

    service = module.get<SupportService>(SupportService);
  });

  describe('1. Ticket Queue & Lifecycle Actions', () => {
    it('should query tickets with pagination and compute open & breached counts', async () => {
      prisma.supportTicket.count
        .mockResolvedValueOnce(1) // total
        .mockResolvedValueOnce(1) // openCount
        .mockResolvedValueOnce(0); // breachedCount
      prisma.supportTicket.findMany.mockResolvedValueOnce([mockTicket]);

      const res = await service.getAdminTickets({ status: 'ALL', page: 1, pageSize: 20 });
      expect(res.total).toBe(1);
      expect(res.items.length).toBe(1);
      expect(res.items[0].ticketNumber).toBe('LM-T-1001');
      expect(res.items[0].slaBreached).toBe(false);
    });

    it('should update ticket status to RESOLVED and set resolvedAt timestamp', async () => {
      prisma.supportTicket.findUnique.mockResolvedValueOnce(mockTicket);
      prisma.supportTicket.update.mockResolvedValueOnce({
        ...mockTicket,
        status: 'RESOLVED',
        resolvedAt: new Date(),
      });

      const res = await service.updateAdminTicket('tkt-test-101', mockSupportUser.id, 'SUPPORT', {
        status: 'RESOLVED',
        adminNotes: 'Replaced thermal paste and cooling fan',
      });

      expect(res.status).toBe('RESOLVED');
      expect(prisma.supportTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tkt-test-101' },
          data: expect.objectContaining({ status: 'RESOLVED' }),
        })
      );
      expect(prisma.ticketEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: 'STATUS_CHANGE',
            oldValue: 'NEW',
            newValue: 'RESOLVED',
          }),
        })
      );
    });

    it('should assign a ticket to a staff member and record ASSIGNED event', async () => {
      prisma.supportTicket.findUnique.mockResolvedValueOnce(mockTicket);
      prisma.supportTicket.update.mockResolvedValueOnce({
        ...mockTicket,
        assigneeId: mockSupportUser.id,
      });

      await service.updateAdminTicket('tkt-test-101', mockAdminUser.id, 'ADMIN', {
        assigneeId: mockSupportUser.id,
      });

      expect(prisma.ticketEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventType: 'ASSIGNED',
            newValue: mockSupportUser.id,
          }),
        })
      );
    });

    it('should merge duplicate ticket into target ticket and close duplicate', async () => {
      const source = { ...mockTicket, id: 'tkt-dup-1', ticketNumber: 'LM-T-9001' };
      const target = { ...mockTicket, id: 'tkt-prim-1', ticketNumber: 'LM-T-9002' };

      prisma.supportTicket.findUnique
        .mockResolvedValueOnce(source)
        .mockResolvedValueOnce(target);

      const res = await service.mergeAdminTickets('tkt-dup-1', 'tkt-prim-1', mockSupportUser.id, 'SUPPORT');
      expect(res.success).toBe(true);
      expect(res.sourceTicketNumber).toBe('LM-T-9001');
      expect(res.targetTicketNumber).toBe('LM-T-9002');
      expect(prisma.supportTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'tkt-dup-1' },
          data: expect.objectContaining({ status: 'MERGED', mergedIntoId: 'tkt-prim-1' }),
        })
      );
    });

    it('should reject merging a ticket into itself', async () => {
      await expect(
        service.mergeAdminTickets('tkt-same-1', 'tkt-same-1', mockAdminUser.id, 'ADMIN')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('2. Returns Workspace & Lifecycle Actions', () => {
    it('should approve return and log approval audit details', async () => {
      prisma.returnRequest.findUnique.mockResolvedValueOnce(mockReturn);
      prisma.returnRequest.update.mockResolvedValueOnce({
        ...mockReturn,
        status: 'APPROVED',
        approvedBy: mockSupportUser.id,
      });

      const res = await service.processAdminReturn('ret-test-201', mockSupportUser.id, 'SUPPORT', {
        status: 'APPROVED',
      });

      expect(res.status).toBe('APPROVED');
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'RETURN_APPROVED',
            entityId: 'ret-test-201',
          }),
        })
      );
    });

    it('should schedule courier pickup with AWB number', async () => {
      prisma.returnRequest.findUnique.mockResolvedValueOnce({ ...mockReturn, status: 'APPROVED' });
      prisma.returnRequest.update.mockResolvedValueOnce({
        ...mockReturn,
        status: 'PICKUP_SCHEDULED',
        pickupTrackingNumber: 'BD123456789IN',
      });

      await service.processAdminReturn('ret-test-201', mockSupportUser.id, 'SUPPORT', {
        status: 'PICKUP_SCHEDULED',
        pickupCourier: 'Bluedart',
        pickupTrackingNumber: 'BD123456789IN',
      });

      expect(prisma.returnRequest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'PICKUP_SCHEDULED',
            pickupTrackingNumber: 'BD123456789IN',
          }),
        })
      );
    });

    it('should automatically flag return items as restocked when inspection passes', async () => {
      prisma.returnRequest.findUnique.mockResolvedValueOnce({ ...mockReturn, status: 'INSPECTING' });
      prisma.returnRequest.update.mockResolvedValueOnce({
        ...mockReturn,
        status: 'INSPECTION_PASSED',
        inspectionPassed: true,
      });

      await service.processAdminReturn('ret-test-201', mockSupportUser.id, 'SUPPORT', {
        status: 'INSPECTION_PASSED',
        inspectionPassed: true,
        inspectionNotes: 'Motherboard and display passed 40-point diagnostic check',
      });

      expect(prisma.returnItem.updateMany).toHaveBeenCalledWith({
        where: { returnRequestId: 'ret-test-201' },
        data: { restocked: true },
      });
    });

    it('should disburse COD refund with bank UTR and create an audit log', async () => {
      prisma.returnRequest.findUnique.mockResolvedValueOnce({
        ...mockReturn,
        status: 'INSPECTION_PASSED',
      });
      prisma.returnRequest.update.mockResolvedValueOnce({
        ...mockReturn,
        status: 'REFUNDED',
        manualRefundReference: 'UTR987654321012',
      });

      const res = await service.processAdminRefund('ret-test-201', mockAdminUser.id, {
        manualRefundReference: 'UTR987654321012',
      });

      expect(res.status).toBe('REFUNDED');
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 'ord-123' },
        data: { paymentStatus: 'REFUNDED', status: 'REFUNDED' },
      });
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'PROCESS_RETURN_REFUND',
            actorUserId: mockAdminUser.id,
          }),
        })
      );
    });

    it('should prevent double-refunding an already refunded return request', async () => {
      prisma.returnRequest.findUnique.mockResolvedValueOnce({
        ...mockReturn,
        status: 'REFUNDED',
      });

      await expect(
        service.processAdminRefund('ret-test-201', mockAdminUser.id, { manualRefundReference: 'UTR123' })
      ).rejects.toThrow('Return request has already been refunded');
    });

    it('should decrypt refund bank details and log an immutable audit trail', async () => {
      prisma.returnRequest.findUnique.mockResolvedValueOnce({
        id: 'ret-test-201',
        returnNumber: 'LM-R-5001',
        encryptedRefundDetails: 'ENCRYPTED_PAYLOAD_STRING',
      });

      const res = await service.decryptAdminRefundDetails('ret-test-201', mockAdminUser.id);
      expect(res.success).toBe(true);
      expect(res.details.accountNumber).toBe('987654321012');
      expect(res.details.ifscCode).toBe('HDFC0001234');
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'DECRYPT_REFUND_DETAILS',
            entityType: 'RETURN_REQUEST',
            actorUserId: mockAdminUser.id,
          }),
        })
      );
    });
  });

  describe('3. Saved Replies & Settings', () => {
    it('should enforce unique formatted shortcut codes for saved replies', async () => {
      prisma.savedReply.findUnique.mockResolvedValueOnce({ id: 'sr-1', shortcut: '/battery' });

      await expect(
        service.createSavedReply({
          shortcut: 'battery',
          title: 'Battery calibration guide',
          content: 'Please calibrate battery by discharging to 5%...',
        })
      ).rejects.toThrow("Shortcut '/battery' already exists");
    });

    it('should retrieve support SLA settings and allow admin updates', async () => {
      prisma.supportSettings.findUnique.mockResolvedValueOnce({
        id: 'default',
        firstResponseSlaMinutes: 1440,
        autoCloseDays: 7,
        reopenWindowDays: 7,
      });
      prisma.supportSettings.update.mockResolvedValueOnce({
        id: 'default',
        firstResponseSlaMinutes: 720,
        autoCloseDays: 5,
        reopenWindowDays: 7,
      });

      const updated = await service.updateAdminSupportSettings(mockAdminUser.id, {
        firstResponseSlaMinutes: 720,
        autoCloseDays: 5,
      });

      expect(updated.firstResponseSlaMinutes).toBe(720);
      expect(prisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'UPDATE_SUPPORT_SETTINGS',
            actorUserId: mockAdminUser.id,
          }),
        })
      );
    });
  });
});
