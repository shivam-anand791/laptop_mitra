/// <reference types="jest" />
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SupportService } from '../../src/modules/support/support.service';
import { AdminService } from '../../src/modules/admin/admin.service';
import { CreateCorporateInquiryDto } from '../../src/modules/support/dto/create-corporate-inquiry.dto';

describe('Corporate Inquiry & Quote Requests (Section 4.1)', () => {
  let supportService: SupportService;
  let adminService: AdminService;
  let mockPrisma: any;
  let mockNotificationService: any;

  beforeEach(() => {
    mockPrisma = {
      corporateInquiry: {
        create: jest.fn().mockImplementation(({ data }: any) => {
          return Promise.resolve({
            id: 'inq-uuid-1',
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }),
        findMany: jest.fn().mockImplementation(({ where }: any) => {
          const list = [
            {
              id: 'inq-1',
              companyName: 'Acme Corp',
              contactPerson: 'Alice',
              email: 'alice@acme.com',
              phone: '9876543210',
              city: 'Bengaluru',
              mode: 'lease',
              quantity: 10,
              status: 'PENDING',
              createdAt: new Date(),
            },
            {
              id: 'inq-2',
              companyName: 'Globex Ltd',
              contactPerson: 'Bob',
              email: 'bob@globex.com',
              phone: '9876543211',
              city: 'Mumbai',
              mode: 'sell',
              quantity: 5,
              status: 'CONTACTED',
              createdAt: new Date(),
            },
          ];
          if (where?.status) {
            return Promise.resolve(list.filter((item) => item.status === where.status));
          }
          return Promise.resolve(list);
        }),
        findUnique: jest.fn().mockImplementation(({ where }: any) => {
          if (where.id === 'inq-1') {
            return Promise.resolve({
              id: 'inq-1',
              companyName: 'Acme Corp',
              contactPerson: 'Alice',
              email: 'alice@acme.com',
              phone: '9876543210',
              city: 'Bengaluru',
              mode: 'lease',
              quantity: 10,
              status: 'PENDING',
              notes: 'Initial requirement: 10 Thinkpads',
            });
          }
          return Promise.resolve(null);
        }),
        update: jest.fn().mockImplementation(({ where, data }: any) => {
          return Promise.resolve({
            id: where.id,
            status: data.status,
            notes: data.notes,
            updatedAt: new Date(),
          });
        }),
        count: jest.fn().mockResolvedValue(2),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };

    mockNotificationService = {
      dispatchCorporateInquiryAlert: jest.fn().mockResolvedValue(true),
    };

    supportService = new SupportService(mockPrisma, mockNotificationService);
    adminService = new AdminService(mockPrisma);
  });

  describe('SupportService - Corporate Inquiry Creation', () => {
    const validDto: CreateCorporateInquiryDto = {
      companyName: 'Tech Innovators Pvt Ltd',
      contactPerson: 'Rohan Sharma',
      email: 'rohan@techinnovators.com',
      phone: '+91 9876543210',
      city: 'Delhi NCR',
      mode: 'lease',
      quantity: 15,
      laptopModel: 'Lenovo ThinkPad T480',
      expectedTenure: '12 Months',
      notes: 'Need standard 16GB RAM models for software engineering team',
      source: 'web',
    };

    it('should successfully create a corporate inquiry and dispatch email alert', async () => {
      const result = await supportService.createCorporateInquiry(validDto);

      expect(mockPrisma.corporateInquiry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          companyName: 'Tech Innovators Pvt Ltd',
          contactPerson: 'Rohan Sharma',
          email: 'rohan@techinnovators.com',
          phone: '+91 9876543210',
          city: 'Delhi NCR',
          mode: 'lease',
          quantity: 15,
          laptopModel: 'Lenovo ThinkPad T480',
          expectedTenure: '12 Months',
          status: 'PENDING',
        }),
      });

      expect(mockNotificationService.dispatchCorporateInquiryAlert).toHaveBeenCalledWith(
        expect.objectContaining({
          companyName: 'Tech Innovators Pvt Ltd',
          email: 'rohan@techinnovators.com',
        })
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('inq-uuid-1');
    });

    it('should default quantity to 5 and mode to sell when absent', async () => {
      const dto = {
        companyName: 'Small Biz',
        contactPerson: 'Jane Doe',
        email: 'jane@smallbiz.com',
        phone: '9988776655',
        city: 'Pune',
      };

      const result = await supportService.createCorporateInquiry(dto as any);

      expect(mockPrisma.corporateInquiry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          mode: 'sell',
          quantity: 5,
        }),
      });
      expect(result).toBeDefined();
    });

    it('should reject invalid mode with BadRequestException (does not fall back to default)', async () => {
      await expect(
        supportService.createCorporateInquiry({ ...validDto, mode: 'invalid-mode' as any })
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid quantity with BadRequestException (does not fall back to default)', async () => {
      await expect(
        supportService.createCorporateInquiry({ ...validDto, quantity: 0 })
      ).rejects.toThrow(BadRequestException);

      await expect(
        supportService.createCorporateInquiry({ ...validDto, quantity: -2 })
      ).rejects.toThrow(BadRequestException);

      await expect(
        supportService.createCorporateInquiry({ ...validDto, quantity: 2.5 })
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when honeypot website field is populated by bots', async () => {
      await expect(
        supportService.createCorporateInquiry({ ...validDto, website: 'https://spam-bot.com' })
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when free-text fields exceed maximum allowed lengths', async () => {
      await expect(
        supportService.createCorporateInquiry({ ...validDto, companyName: 'A'.repeat(151) })
      ).rejects.toThrow(BadRequestException);

      await expect(
        supportService.createCorporateInquiry({ ...validDto, notes: 'A'.repeat(2001) })
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when companyName is missing or blank', async () => {
      await expect(
        supportService.createCorporateInquiry({ ...validDto, companyName: '   ' })
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when contactPerson is missing', async () => {
      await expect(
        supportService.createCorporateInquiry({ ...validDto, contactPerson: '' })
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid or missing email', async () => {
      await expect(
        supportService.createCorporateInquiry({ ...validDto, email: 'not-an-email' })
      ).rejects.toThrow(BadRequestException);

      await expect(
        supportService.createCorporateInquiry({ ...validDto, email: '' })
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid or short phone numbers', async () => {
      await expect(
        supportService.createCorporateInquiry({ ...validDto, phone: '123' })
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject missing city', async () => {
      await expect(
        supportService.createCorporateInquiry({ ...validDto, city: '' })
      ).rejects.toThrow(BadRequestException);
    });

    it('should not fail inquiry creation if notification dispatch encounters an error', async () => {
      mockNotificationService.dispatchCorporateInquiryAlert.mockRejectedValue(
        new Error('SMTP connection timed out')
      );

      const result = await supportService.createCorporateInquiry(validDto);
      expect(result).toBeDefined();
      expect(result.id).toBe('inq-uuid-1');
    });
  });

  describe('AdminService - Inquiries Retrieval & Status Updates', () => {
    it('should retrieve inquiries list with pagination and optional status filter', async () => {
      const resAll = await adminService.getCorporateInquiries({ page: 1, pageSize: 10 });
      expect(resAll.items.length).toBe(2);
      expect(resAll.total).toBe(2);

      const resFiltered = await adminService.getCorporateInquiries({ status: 'CONTACTED' });
      expect(resFiltered.items.length).toBe(1);
      expect(resFiltered.items[0].companyName).toBe('Globex Ltd');
    });

    it('should update status and append admin notes with audit trail log', async () => {
      const updated = await adminService.updateCorporateInquiryStatus(
        'inq-1',
        'CONTACTED',
        'admin-usr-1',
        'Spoke with Alice, scheduled demo on Friday'
      );

      expect(updated.status).toBe('CONTACTED');
      expect(updated.notes).toContain('[Admin]: Spoke with Alice');

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          actorUserId: 'admin-usr-1',
          action: 'UPDATE_INQUIRY_STATUS',
          entityType: 'CORPORATE_INQUIRY',
          entityId: 'inq-1',
          metadata: expect.objectContaining({
            previousStatus: 'PENDING',
            newStatus: 'CONTACTED',
            adminNotes: 'Spoke with Alice, scheduled demo on Friday',
          }),
        }),
      });
    });

    it('should reject unsupported status updates with BadRequestException', async () => {
      await expect(
        adminService.updateCorporateInquiryStatus('inq-1', 'INVALID_STATUS' as any)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when inquiry does not exist', async () => {
      await expect(
        adminService.updateCorporateInquiryStatus('non-existent-id', 'CLOSED')
      ).rejects.toThrow(NotFoundException);
    });
  });
});
