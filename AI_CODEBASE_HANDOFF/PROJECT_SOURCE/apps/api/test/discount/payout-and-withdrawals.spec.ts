/// <reference types="jest" />
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentEncryptionService } from '../../src/common/encryption/payment-encryption.service';
import { QrStorageService } from '../../src/common/storage/qr-storage.service';
import { DiscountService } from '../../src/modules/discount/discount.service';
import { AdminService } from '../../src/modules/admin/admin.service';

describe('Phase 5.1 — Affiliate Payouts, Security, Encryption & Concurrency', () => {
  const validKeyHex = '502c1dc33a5f3356f9b1bfff8a10a4e228d16bf82c2d95b636b4959529991324'; // 32 bytes
  let encryptionService: PaymentEncryptionService;
  let qrStorageService: QrStorageService;
  let discountService: DiscountService;
  let adminService: AdminService;
  let mockPrisma: any;

  beforeEach(() => {
    const configServiceMock = {
      get: jest.fn().mockImplementation((key: string) => {
        if (key === 'PAYMENT_ENCRYPTION_KEY') return validKeyHex;
        return undefined;
      }),
    } as unknown as ConfigService;

    encryptionService = new PaymentEncryptionService(configServiceMock);
    qrStorageService = new QrStorageService();

    mockPrisma = {
      $transaction: jest.fn(async (cb: (tx: any) => Promise<any>) => cb(mockPrisma)),
      $queryRaw: jest.fn(),
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      affiliatePaymentDetails: {
        findUnique: jest.fn(),
        upsert: jest.fn(),
      },
      withdrawalRequest: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-log-1' }),
      },
    };

    discountService = new DiscountService(
      mockPrisma,
      encryptionService,
      qrStorageService,
    );
    adminService = new AdminService(
      mockPrisma,
      undefined,
      encryptionService,
      qrStorageService,
    );
  });

  describe('1. Key Validation & Encryption Security', () => {
    it('should fail startup immediately if PAYMENT_ENCRYPTION_KEY is missing', () => {
      const emptyConfig = { get: jest.fn().mockReturnValue('') } as any;
      expect(() => new PaymentEncryptionService(emptyConfig)).toThrow(
        /PAYMENT_ENCRYPTION_KEY is missing/
      );
    });

    it('should fail startup immediately if PAYMENT_ENCRYPTION_KEY is not exactly 32 bytes', () => {
      const shortConfig = { get: jest.fn().mockReturnValue('abcd1234') } as any;
      expect(() => new PaymentEncryptionService(shortConfig)).toThrow(
        /must decode to exactly 32 bytes/
      );
    });

    it('should encrypt and decrypt using AES-256-GCM with v1: version prefix', () => {
      const plain = '123456789012';
      const cipher = encryptionService.encrypt(plain);

      expect(cipher.startsWith('v1:')).toBe(true);
      const parts = cipher.split(':');
      expect(parts.length).toBe(4); // v1 : iv : tag : data

      const decrypted = encryptionService.decrypt(cipher);
      expect(decrypted).toBe(plain);
    });

    it('should mask sensitive account numbers and UPI IDs', () => {
      expect(encryptionService.maskAccountNumber('123456789012')).toBe('••••••••9012');
      expect(encryptionService.maskUpiId('rohan@oksbi')).toBe('ro••••@oksbi');
      expect(encryptionService.maskIfsc('SBIN0001234')).toBe('SBIN•••••34');
    });
  });

  describe('2. Customer Payout Details & Role Isolation', () => {
    it('should block non-CUSTOMER (e.g. GUEST) users with 403 Forbidden', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'guest-1',
        role: 'GUEST',
        status: 'ACTIVE',
      });

      await expect(
        discountService.savePayoutDetails('guest-1', {
          bankName: 'SBI',
          accountHolderName: 'Guest User',
          accountNumber: '123456789012',
          ifscCode: 'SBIN0001234',
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should require either bank details or UPI ID when saving payout details', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'cust-1',
        role: 'CUSTOMER',
        status: 'ACTIVE',
      });
      mockPrisma.affiliatePaymentDetails.findUnique.mockResolvedValue(null);

      await expect(
        discountService.savePayoutDetails('cust-1', {})
      ).rejects.toThrow(BadRequestException);
    });

    it('should save encrypted sensitive fields and return masked data only (no ciphertext leaked)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'cust-1',
        role: 'CUSTOMER',
        status: 'ACTIVE',
        email: 'user@example.com',
      });
      mockPrisma.affiliatePaymentDetails.findUnique.mockResolvedValue(null);
      mockPrisma.affiliatePaymentDetails.upsert.mockImplementation(({ create }: any) => {
        expect(create.accountNumber).toContain('v1:');
        expect(create.accountNumber).not.toBe('123456789012');
        expect(create.ifscCode).toContain('v1:');
        expect(create.upiId).toContain('v1:');
        return Promise.resolve({
          id: 'pay-1',
          bankName: create.bankName,
          accountHolderName: create.accountHolderName,
          accountNumberMasked: create.accountNumberMasked,
          ifscCode: create.ifscCode,
          upiIdMasked: create.upiIdMasked,
          qrCodeKey: null,
          updatedAt: new Date(),
        });
      });

      const res = await discountService.savePayoutDetails('cust-1', {
        bankName: 'HDFC Bank',
        accountHolderName: 'Rohan Sharma',
        accountNumber: '123456789012',
        ifscCode: 'HDFC0001234',
        upiId: 'rohan@okhdfcbank',
      });

      expect(res.configured).toBe(true);
      expect(res.accountNumberMasked).toBe('••••••••9012');
      expect(res.upiIdMasked).toBe('ro••••@okhdfcbank');
      expect(res.ifscCodeMasked).toBe('HDFC•••••34');
      // Verify raw ciphertext is never returned to the caller
      expect((res as any).accountNumber).toBeUndefined();
      expect((res as any).ifscCode).toBeUndefined();
      expect((res as any).upiId).toBeUndefined();
    });
  });

  describe('3. QR Magic Bytes Verification', () => {
    it('should accept valid PNG image bytes', () => {
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
      const res = qrStorageService.validateMagicBytes(pngHeader);
      expect(res.extension).toBe('png');
      expect(res.mimeType).toBe('image/png');
    });

    it('should accept valid JPEG image bytes', () => {
      const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
      const res = qrStorageService.validateMagicBytes(jpegHeader);
      expect(res.extension).toBe('jpg');
      expect(res.mimeType).toBe('image/jpeg');
    });

    it('should reject fake extensions or corrupted executable headers', () => {
      const fakeExe = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00', 'binary');
      expect(() => qrStorageService.validateMagicBytes(fakeExe)).toThrow(BadRequestException);
    });
  });

  describe('4. Withdrawal Requests & Balance Integrity', () => {
    it('should reject withdrawal amounts below MINIMUM_WITHDRAWAL_AMOUNT (₹500)', async () => {
      await expect(discountService.requestWithdrawal('cust-1', 400)).rejects.toThrow(
        /Minimum withdrawal amount is ₹500/
      );
    });

    it('should reject withdrawal when amount exceeds available balance', async () => {
      // User has 3000 earnings, 1500 reserved, 1000 withdrawn -> available = 500
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          id: 'cust-1',
          role: 'CUSTOMER',
          status: 'ACTIVE',
          referralEarnings: '3000',
          referralReserved: '1500',
          referralWithdrawn: '1000',
        },
      ]);
      mockPrisma.withdrawalRequest.count.mockResolvedValue(0);

      await expect(discountService.requestWithdrawal('cust-1', 1000)).rejects.toThrow(
        /exceeds available balance/
      );
    });

    it('should reject withdrawal when user already has a pending withdrawal', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          id: 'cust-1',
          role: 'CUSTOMER',
          status: 'ACTIVE',
          referralEarnings: '5000',
          referralReserved: '0',
          referralWithdrawn: '0',
        },
      ]);
      mockPrisma.withdrawalRequest.count.mockResolvedValue(1); // 1 pending exists

      await expect(discountService.requestWithdrawal('cust-1', 1000)).rejects.toThrow(
        /already have a pending withdrawal request/
      );
    });

    it('should reject withdrawal if no payout details are configured', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          id: 'cust-1',
          role: 'CUSTOMER',
          status: 'ACTIVE',
          referralEarnings: '5000',
          referralReserved: '0',
          referralWithdrawn: '0',
        },
      ]);
      mockPrisma.withdrawalRequest.count.mockResolvedValue(0);
      mockPrisma.affiliatePaymentDetails.findUnique.mockResolvedValue(null);

      await expect(discountService.requestWithdrawal('cust-1', 1000)).rejects.toThrow(
        /configure your payout details/
      );
    });

    it('should successfully reserve balance and create encrypted snapshot on valid withdrawal', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          id: 'cust-1',
          role: 'CUSTOMER',
          status: 'ACTIVE',
          referralEarnings: '5000',
          referralReserved: '500',
          referralWithdrawn: '1000',
        },
      ]);
      mockPrisma.withdrawalRequest.count.mockResolvedValue(0);
      mockPrisma.affiliatePaymentDetails.findUnique.mockResolvedValue({
        bankName: 'SBI',
        accountHolderName: 'Rohan Sharma',
        accountNumber: encryptionService.encrypt('123456789012'),
        ifscCode: encryptionService.encrypt('SBIN0001234'),
        upiId: null,
        qrCodeKey: null,
      });

      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.withdrawalRequest.create.mockImplementation(({ data }: any) => {
        expect(data.paymentMethodSnapshot.startsWith('v1:')).toBe(true);
        const decrypted = JSON.parse(encryptionService.decrypt(data.paymentMethodSnapshot));
        expect(decrypted.accountNumber).toBe('123456789012');
        expect(decrypted.ifscCode).toBe('SBIN0001234');

        return Promise.resolve({
          id: 'with-1',
          amount: data.amount,
          status: 'PENDING',
          createdAt: new Date(),
        });
      });

      const res = await discountService.requestWithdrawal('cust-1', 1500);

      expect(res.id).toBe('with-1');
      expect(res.amount).toBe(1500);
      expect(res.status).toBe('PENDING');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'cust-1' },
        data: { referralReserved: { increment: 1500 } },
      });
    });
  });

  describe('5. Admin Affiliate Management & Payout Processing', () => {
    it('should list affiliates with masked data only', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'u-1',
          name: 'Alice',
          email: 'alice@example.com',
          referralCode: 'MITRA101',
          referralTier: 'GOLD',
          referralEarnings: '10000',
          referralReserved: '1000',
          referralWithdrawn: '2000',
          referralLinkClickedCount: 15,
          createdAt: new Date(),
          _count: { withdrawalRequests: 3 },
          withdrawalRequests: [{ id: 'w-1' }],
        },
      ]);
      mockPrisma.user.count.mockResolvedValue(1);

      const res = await adminService.getAffiliates();
      expect(res.items.length).toBe(1);
      expect(res.items[0].availableBalance).toBe(7000);
      expect(res.items[0].pendingWithdrawalsCount).toBe(1);
    });

    it('should decrypt snapshot only via getWithdrawalPaymentDetails and create AuditLog', async () => {
      const plainData = {
        bankName: 'HDFC Bank',
        accountHolderName: 'Bob Builder',
        accountNumber: '987654321098',
        ifscCode: 'HDFC0001234',
        upiId: 'bob@okhdfc',
      };
      const cipher = encryptionService.encrypt(JSON.stringify(plainData));

      mockPrisma.withdrawalRequest.findUnique.mockResolvedValue({
        id: 'with-1',
        userId: 'u-bob',
        amount: '2000',
        status: 'PENDING',
        paymentMethodSnapshot: cipher,
        createdAt: new Date(),
        user: { id: 'u-bob', name: 'Bob Builder', email: 'bob@example.com' },
      });

      const res = await adminService.getWithdrawalPaymentDetails('with-1', 'admin-super');
      expect(res.paymentDetails.accountNumber).toBe('987654321098');
      expect(res.paymentDetails.ifscCode).toBe('HDFC0001234');

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'VIEW_PAYMENT_SNAPSHOT',
          actorUserId: 'admin-super',
          entityId: 'with-1',
        }),
      });
      // Crucial: plaintext secrets must NOT be in audit log metadata
      const auditCall = mockPrisma.auditLog.create.mock.calls[0][0];
      expect(JSON.stringify(auditCall.data.metadata)).not.toContain('987654321098');
    });

    it('should approve withdrawal: move reserved to withdrawn and log audit', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          id: 'with-1',
          userId: 'u-1',
          amount: '1000',
          status: 'PENDING',
        },
      ]);
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.withdrawalRequest.update.mockResolvedValue({
        id: 'with-1',
        userId: 'u-1',
        amount: '1000',
        status: 'APPROVED',
        adminNotes: 'Transferred via IMPS RRN 123456',
        processedAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await adminService.updateWithdrawalStatus(
        'with-1',
        'APPROVED',
        'admin-1',
        'Transferred via IMPS RRN 123456'
      );

      expect(res.status).toBe('APPROVED');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u-1' },
        data: {
          referralReserved: { decrement: 1000 },
          referralWithdrawn: { increment: 1000 },
        },
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'APPROVE_WITHDRAWAL',
          actorUserId: 'admin-1',
          entityId: 'with-1',
        }),
      });
    });

    it('should reject withdrawal: return reserved balance and require adminNotes', async () => {
      // Mandatory admin notes validation
      await expect(
        adminService.updateWithdrawalStatus('with-1', 'REJECTED', 'admin-1', '   ')
      ).rejects.toThrow(/Rejection notes/);

      mockPrisma.$queryRaw.mockResolvedValue([
        {
          id: 'with-1',
          userId: 'u-1',
          amount: '1000',
          status: 'PENDING',
        },
      ]);
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.withdrawalRequest.update.mockResolvedValue({
        id: 'with-1',
        userId: 'u-1',
        amount: '1000',
        status: 'REJECTED',
        adminNotes: 'Incorrect IFSC code',
        processedAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await adminService.updateWithdrawalStatus(
        'with-1',
        'REJECTED',
        'admin-1',
        'Incorrect IFSC code'
      );

      expect(res.status).toBe('REJECTED');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u-1' },
        data: {
          referralReserved: { decrement: 1000 },
        },
      });

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'REJECT_WITHDRAWAL',
          actorUserId: 'admin-1',
          entityId: 'with-1',
        }),
      });
    });

    it('should throw 409 Conflict if withdrawal has already been processed', async () => {
      mockPrisma.$queryRaw.mockResolvedValue([
        {
          id: 'with-1',
          userId: 'u-1',
          amount: '1000',
          status: 'APPROVED', // already approved
        },
      ]);

      await expect(
        adminService.updateWithdrawalStatus('with-1', 'APPROVED', 'admin-1')
      ).rejects.toThrow(ConflictException);
    });
  });
});
