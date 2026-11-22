import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PaymentEncryptionService } from '../../src/common/encryption/payment-encryption.service';
import { QrStorageService } from '../../src/common/storage/qr-storage.service';
import { DiscountService } from '../../src/modules/discount/discount.service';
import { AdminService } from '../../src/modules/admin/admin.service';
import { resetIntegrationDatabase } from './database';

describe('PostgreSQL payout concurrency', () => {
  let prisma: PrismaClient;
  let discountService: DiscountService;
  let adminService: AdminService;
  let adminId: string;

  beforeAll(async () => {
    prisma = new PrismaClient();
    await prisma.$connect();

    const config = { get: () => '00'.repeat(32) } as unknown as ConfigService;
    const encryptionService = new PaymentEncryptionService(config);
    const qrStorageService = new QrStorageService();
    discountService = new DiscountService(prisma as never, encryptionService, qrStorageService);
    adminService = new AdminService(prisma as never, undefined, encryptionService, qrStorageService);

    const admin = await prisma.user.create({
      data: {
        email: 'integration-admin@example.test',
        firebaseUid: `integration-admin-${Date.now()}`,
        referralCode: `IA${Date.now()}`,
        name: 'Integration Admin',
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });
    adminId = admin.id;
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    resetIntegrationDatabase();
  });

  async function createEarningUser() {
    return prisma.user.create({
      data: {
        email: `payout-${randomUUID()}@example.test`,
        firebaseUid: `payout-${randomUUID()}`,
        referralCode: `P${randomUUID().replace(/-/g, '').slice(0, 10)}`,
        name: 'Integration Payout User',
        role: 'CUSTOMER',
        status: 'ACTIVE',
        referralEarnings: 1000,
        referralReserved: 0,
        referralWithdrawn: 0,
      },
    });
  }

  async function addPayoutDetails(userId: string) {
    await discountService.savePayoutDetails(userId, {
      bankName: 'Test Bank',
      accountHolderName: 'Integration User',
      accountNumber: '112233445566',
      ifscCode: 'HDFC0001234',
      upiId: 'integration@okhdfc',
    });
  }

  it('allows only one concurrent withdrawal request for the available balance', async () => {
    const user = await createEarningUser();
    await addPayoutDetails(user.id);

    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => discountService.requestWithdrawal(user.id, 1000)),
    );
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(4);

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(Number(updated.referralReserved)).toBe(1000);
    expect(Number(updated.referralEarnings) - Number(updated.referralReserved) - Number(updated.referralWithdrawn)).toBe(0);
  });

  it('processes a pending withdrawal only once under concurrent approval', async () => {
    const user = await createEarningUser();
    await addPayoutDetails(user.id);
    const withdrawal = await discountService.requestWithdrawal(user.id, 1000);

    const results = await Promise.allSettled(
      Array.from({ length: 4 }, (_, index) =>
        adminService.updateWithdrawalStatus(
          withdrawal.id,
          'APPROVED',
          adminId,
          `Integration reference ${index}`,
        ),
      ),
    );
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(3);

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(Number(updated.referralReserved)).toBe(0);
    expect(Number(updated.referralWithdrawn)).toBe(1000);
  });
});
