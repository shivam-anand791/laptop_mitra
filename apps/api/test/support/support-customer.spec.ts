import { Test, TestingModule } from '@nestjs/testing';
import { SupportService } from '../../src/modules/support/support.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentEncryptionService } from '../../src/common/encryption/payment-encryption.service';

describe('SupportService (Customer Experience & IDOR Enforcement)', () => {
  let service: SupportService;
  let prisma: any;

  const mockUserA = { id: 'usr-user-a', name: 'User A', email: 'a@example.com' };
  const mockUserB = { id: 'usr-user-b', name: 'User B', email: 'b@example.com' };

  const mockTicketA = {
    id: 'tkt-123',
    ticketNumber: 'LM-T-1001',
    userId: mockUserA.id,
    subject: 'Broken screen on delivery',
    category: 'RETURN_REFUND',
    issueType: 'DAMAGED_ON_ARRIVAL',
    type: 'QUERY',
    status: 'NEW',
    priority: 'HIGH',
    isArchived: false,
    reopenCount: 0,
    csatScore: null,
    csatComment: null,
    resolvedAt: null,
    customerLastReadAt: new Date(),
    staffLastReadAt: null,
    messages: [],
    events: [],
    attachments: [],
    order: null,
    orderItem: null,
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn((cb) => cb(prisma)),
      $queryRaw: jest.fn().mockResolvedValue([{ nextval: 1001 }]),
      supportTicket: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      ticketMessage: {
        create: jest.fn(),
      },
      ticketEvent: {
        create: jest.fn(),
      },
      ticketAttachment: {
        create: jest.fn(),
      },
      order: {
        findUnique: jest.fn(),
      },
      returnRequest: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      returnItem: {
        create: jest.fn(),
      },
      helpCategory: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      helpArticle: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: PaymentEncryptionService,
          useValue: {
            encrypt: jest.fn((val: string) => `enc:${val}`),
            decrypt: jest.fn((val: string) => val.replace('enc:', '')),
          },
        },
      ],
    }).compile();

    service = module.get<SupportService>(SupportService);
  });

  describe('IDOR Security Checks on Tickets', () => {
    it('allows ticket owner to view their own ticket', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue(mockTicketA);
      prisma.supportTicket.update.mockResolvedValue(mockTicketA);

      const result = await service.getTicketById(mockTicketA.id, mockUserA.id, false);
      expect(result).toBeDefined();
      expect(result.id).toBe(mockTicketA.id);
    });

    it('rejects another user (User B) from viewing User A ticket with ForbiddenException (IDOR)', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue(mockTicketA);

      await expect(service.getTicketById(mockTicketA.id, mockUserB.id, false)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('allows staff (Admin or Support) to view any ticket', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue(mockTicketA);

      const result = await service.getTicketById(mockTicketA.id, 'admin-id', true);
      expect(result).toBeDefined();
    });

    it('blocks User B from adding a reply to User A ticket (IDOR)', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue(mockTicketA);

      await expect(
        service.addMessage(mockTicketA.id, mockUserB.id, 'Malicious reply', undefined, 'CUSTOMER'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('blocks User B from rating User A ticket (IDOR)', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue(mockTicketA);

      await expect(service.rateTicket(mockTicketA.id, mockUserB.id, 5)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('blocks User B from reopening User A ticket (IDOR)', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue({
        ...mockTicketA,
        status: 'RESOLVED',
        resolvedAt: new Date(),
      });

      await expect(service.reopenTicket(mockTicketA.id, mockUserB.id)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('Ticket Creation & Sequence Number', () => {
    it('creates ticket with formatted LM-T- sequence number', async () => {
      prisma.$queryRaw.mockResolvedValue([{ nextval: 1042 }]);
      prisma.supportTicket.create.mockImplementation(({ data }: any) => ({
        id: 'tkt-new',
        ...data,
      }));
      prisma.ticketMessage.create.mockResolvedValue({ id: 'msg-1' });
      prisma.ticketEvent.create.mockResolvedValue({ id: 'evt-1' });

      const ticket = await service.createTicket(mockUserA.id, {
        subject: 'Keyboard not working',
        category: 'WARRANTY_REPAIR',
        message: 'Several keys on the top row do not respond.',
      });

      expect(ticket.ticketNumber).toBe('LM-T-1042');
      expect(ticket.status).toBe('NEW');
      expect(prisma.supportTicket.create).toHaveBeenCalled();
      expect(prisma.ticketMessage.create).toHaveBeenCalled();
      expect(prisma.ticketEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ eventType: 'CREATED' }),
        }),
      );
    });

    it('rejects ticket creation with empty message or subject', async () => {
      await expect(
        service.createTicket(mockUserA.id, {
          subject: '',
          category: 'ORDER_DELIVERY',
          message: 'Help please',
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.createTicket(mockUserA.id, {
          subject: 'Valid Subject',
          category: 'ORDER_DELIVERY',
          message: '',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Reopen Window (7 Days)', () => {
    it('allows reopening when ticket is RESOLVED within 7 days', async () => {
      const recentResolved = {
        ...mockTicketA,
        status: 'RESOLVED',
        resolvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      };
      prisma.supportTicket.findUnique.mockResolvedValue(recentResolved);
      prisma.supportTicket.update.mockResolvedValue({ ...recentResolved, status: 'REOPENED', reopenCount: 1 });
      prisma.ticketEvent.create.mockResolvedValue({ id: 'evt-2' });

      const reopened = await service.reopenTicket(mockTicketA.id, mockUserA.id);
      expect(reopened.status).toBe('REOPENED');
      expect(reopened.reopenCount).toBe(1);
    });

    it('rejects reopening when ticket resolution is older than 7 days', async () => {
      const oldResolved = {
        ...mockTicketA,
        status: 'RESOLVED',
        resolvedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      };
      prisma.supportTicket.findUnique.mockResolvedValue(oldResolved);

      await expect(service.reopenTicket(mockTicketA.id, mockUserA.id)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects reopening if ticket is not currently in RESOLVED status', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue({
        ...mockTicketA,
        status: 'OPEN',
      });

      await expect(service.reopenTicket(mockTicketA.id, mockUserA.id)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('CSAT Rating Validation', () => {
    it('accepts valid CSAT rating (1 to 5) with feedback', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue(mockTicketA);
      prisma.supportTicket.update.mockResolvedValue({
        ...mockTicketA,
        csatScore: 5,
        csatComment: 'Super fast resolution!',
      });
      prisma.ticketEvent.create.mockResolvedValue({ id: 'evt-3' });

      const rated = await service.rateTicket(mockTicketA.id, mockUserA.id, 5, 'Super fast resolution!');
      expect(rated.csatScore).toBe(5);
      expect(prisma.ticketEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ eventType: 'CSAT_RATING', newValue: '5' }),
        }),
      );
    });

    it('rejects invalid CSAT scores (< 1 or > 5)', async () => {
      await expect(service.rateTicket(mockTicketA.id, mockUserA.id, 0)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.rateTicket(mockTicketA.id, mockUserA.id, 6)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('Returns & Refunds Management (COD & IDOR)', () => {
    const mockOrderA = {
      id: 'ord-100',
      userId: mockUserA.id,
      status: 'DELIVERED',
      createdAt: new Date(),
      updatedAt: new Date(),
      shippingAddress: { city: 'Bengaluru', address: '123 Tech Park' },
      items: [
        { id: 'item-1', price: 32000, quantity: 1 },
      ],
    };

    it('creates return request with formatted LM-R- sequence number', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrderA);
      prisma.$queryRaw.mockResolvedValue([{ nextval: 2005 }]);
      prisma.returnRequest.create.mockImplementation(({ data }: any) => ({
        id: 'ret-new',
        ...data,
      }));
      prisma.returnItem.create.mockResolvedValue({ id: 'ri-1' });

      const returnReq = await service.createReturnRequest(mockUserA.id, {
        orderId: mockOrderA.id,
        reason: 'Display flickering on dark backgrounds',
        items: [{ orderItemId: 'item-1', quantity: 1 }],
      });

      expect(returnReq.returnNumber).toBe('LM-R-2005');
      expect(returnReq.status).toBe('REQUESTED');
    });

    it('validates matching account number and valid Indian IFSC code for COD bank details', async () => {
      prisma.order.findUnique.mockResolvedValue(mockOrderA);

      // Mismatched account numbers
      await expect(
        service.createReturnRequest(mockUserA.id, {
          orderId: mockOrderA.id,
          reason: 'Defective charger',
          items: [{ orderItemId: 'item-1', quantity: 1 }],
          refundDetails: {
            accountNumber: '1234567890',
            confirmAccountNumber: '9876543210',
            ifscCode: 'HDFC0001234',
            accountHolderName: 'User A',
          },
        }),
      ).rejects.toThrow('Bank account numbers do not match');

      // Invalid IFSC format
      await expect(
        service.createReturnRequest(mockUserA.id, {
          orderId: mockOrderA.id,
          reason: 'Defective charger',
          items: [{ orderItemId: 'item-1', quantity: 1 }],
          refundDetails: {
            accountNumber: '1234567890',
            confirmAccountNumber: '1234567890',
            ifscCode: 'INVALID_IFSC',
            accountHolderName: 'User A',
          },
        }),
      ).rejects.toThrow('Invalid Indian Bank IFSC Code format');
    });

    it('allows updating refund details before return is processed', async () => {
      const mockReturn = {
        id: 'ret-101',
        userId: mockUserA.id,
        status: 'APPROVED',
        refundAccountMasked: '••••••••1234',
        refundIfscMasked: 'HDFC••••234',
        refundUpiMasked: null,
      };
      prisma.returnRequest.findUnique.mockResolvedValue(mockReturn);
      prisma.returnRequest.update.mockImplementation(({ data }: any) => ({
        ...mockReturn,
        ...data,
      }));

      const updated = await service.updateRefundDetails(mockReturn.id, mockUserA.id, {
        accountNumber: '998877665544',
        confirmAccountNumber: '998877665544',
        ifscCode: 'SBIN0001234',
        accountHolderName: 'User A Updated',
      });

      expect(updated.refundAccountMasked).toBe('••••••••5544');
      expect(updated.refundIfscMasked).toBe('SBIN••••234');
    });

    it('blocks updating refund details if return status is already REFUNDED', async () => {
      prisma.returnRequest.findUnique.mockResolvedValue({
        id: 'ret-101',
        userId: mockUserA.id,
        status: 'REFUNDED',
      });

      await expect(
        service.updateRefundDetails('ret-101', mockUserA.id, {
          upiId: 'user@okaxis',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('protects return request with IDOR check against unauthorized users', async () => {
      prisma.returnRequest.findUnique.mockResolvedValue({
        id: 'ret-101',
        userId: mockUserA.id,
        status: 'REQUESTED',
      });

      await expect(
        service.getReturnRequestById('ret-101', mockUserB.id, false),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.updateRefundDetails('ret-101', mockUserB.id, { upiId: 'b@okaxis' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
