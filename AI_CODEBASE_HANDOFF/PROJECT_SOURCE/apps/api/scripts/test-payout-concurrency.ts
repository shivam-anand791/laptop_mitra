import { PrismaClient } from '@prisma/client';
import { assertSafeDatabaseTarget, loadDatabaseEnvironment } from '../src/common/database-safety';
import { PaymentEncryptionService } from '../src/common/encryption/payment-encryption.service';
import { QrStorageService } from '../src/common/storage/qr-storage.service';
import { DiscountService } from '../src/modules/discount/discount.service';
import { AdminService } from '../src/modules/admin/admin.service';

async function runRealDatabaseConcurrencySuite() {
  loadDatabaseEnvironment('development');
  assertSafeDatabaseTarget();

  console.log('========================================================================');
  console.log('  PAYOUT & WITHDRAWAL REAL POSTGRESQL CONCURRENCY TEST SUITE');
  console.log('========================================================================');

  const prisma = new PrismaClient();
  await prisma.$connect();
  console.log('✔ Connected to PostgreSQL database successfully.');

  const configServiceMock = {
    get: (key: string) => process.env[key] || '502c1dc33a5f3356f9b1bfff8a10a4e228d16bf82c2d95b636b4959529991324',
  } as any;

  const encryptionService = new PaymentEncryptionService(configServiceMock);
  const qrStorageService = new QrStorageService();
  const discountService = new DiscountService(prisma as any, encryptionService, qrStorageService);
  const adminService = new AdminService(prisma as any, undefined, encryptionService, qrStorageService);

  const testUserId = `test-concurrency-${Date.now()}`;
  const testAdminId = `admin-concurrency-${Date.now()}`;

  try {
    // 1. Setup Test User
    console.log(`\n[Setup] Creating test user #${testUserId} with ₹1,000 earnings...`);
    await prisma.user.create({
      data: {
        id: testUserId,
        firebaseUid: `uid-${testUserId}`,
        email: `${testUserId}@example.test`,
        referralCode: `REF${Date.now().toString().slice(-6)}`,
        name: 'Concurrency Tester',
        role: 'CUSTOMER',
        status: 'ACTIVE',
        referralEarnings: 1000,
        referralReserved: 0,
        referralWithdrawn: 0,
      },
    });

    // Setup Payout Details
    await discountService.savePayoutDetails(testUserId, {
      bankName: 'HDFC Bank',
      accountHolderName: 'Concurrency Test User',
      accountNumber: '112233445566',
      ifscCode: 'HDFC0001234',
      upiId: 'tester@okhdfc',
    });
    console.log('✔ Payout details configured and AES-256-GCM encrypted.');

    // -------------------------------------------------------------------------
    // TEST 1: Concurrent Withdrawal Requests (Double-Spend Prevention)
    // -------------------------------------------------------------------------
    console.log('\n--- TEST 1: Firing 5 Concurrent Withdrawal Requests of ₹1,000 in Parallel ---');
    console.log('Available Balance: ₹1,000. Each request asks for ₹1,000.');
    console.log('Expectation: Exactly 1 succeeds via row lock; 4 must be rejected.');

    const parallelWithdrawals = await Promise.allSettled([
      discountService.requestWithdrawal(testUserId, 1000),
      discountService.requestWithdrawal(testUserId, 1000),
      discountService.requestWithdrawal(testUserId, 1000),
      discountService.requestWithdrawal(testUserId, 1000),
      discountService.requestWithdrawal(testUserId, 1000),
    ]);

    let successCount = 0;
    let rejectedCount = 0;
    let createdWithdrawalId: string | null = null;

    parallelWithdrawals.forEach((res, index) => {
      if (res.status === 'fulfilled') {
        successCount++;
        createdWithdrawalId = res.value.id;
        console.log(`  Req #${index + 1}: [SUCCESS] Granted withdrawal ID: ${res.value.id}`);
      } else {
        rejectedCount++;
        console.log(`  Req #${index + 1}: [REJECTED] ${res.reason?.message || res.reason}`);
      }
    });

    console.log(`\nResults: ${successCount} Succeeded, ${rejectedCount} Rejected.`);
    if (successCount !== 1 || rejectedCount !== 4) {
      throw new Error(`Concurrency violation! Expected exactly 1 success and 4 rejections, but got ${successCount} successes.`);
    }

    // Verify User Balance in DB
    const userAfter = await prisma.user.findUnique({ where: { id: testUserId } });
    console.log(`Database User State:
  - referralEarnings:  ₹${userAfter?.referralEarnings}
  - referralReserved:  ₹${userAfter?.referralReserved}
  - referralWithdrawn: ₹${userAfter?.referralWithdrawn}
  - Available Balance: ₹${Number(userAfter?.referralEarnings) - Number(userAfter?.referralReserved) - Number(userAfter?.referralWithdrawn)}`);

    if (Number(userAfter?.referralReserved) !== 1000) {
      throw new Error(`Integrity error! Reserved balance should be exactly 1000, got ${userAfter?.referralReserved}`);
    }
    console.log('✔ TEST 1 PASSED: Double-spending completely prevented by PostgreSQL FOR UPDATE row locking.');

    // -------------------------------------------------------------------------
    // TEST 2: Concurrent Admin Payout Processing (Double-Processing Prevention)
    // -------------------------------------------------------------------------
    if (!createdWithdrawalId) {
      throw new Error('No withdrawal ID was created in Test 1.');
    }

    console.log('\n--- TEST 2: Firing 4 Concurrent APPROVED Updates on Same Withdrawal in Parallel ---');
    console.log(`Target Withdrawal: #${createdWithdrawalId} (Status: PENDING)`);
    console.log('Expectation: Exactly 1 transaction processes the status; other 3 fail with 409 Conflict.');

    const parallelAdminActions = await Promise.allSettled([
      adminService.updateWithdrawalStatus(createdWithdrawalId, 'APPROVED', testAdminId, 'Payment IMPS ref 001'),
      adminService.updateWithdrawalStatus(createdWithdrawalId, 'APPROVED', testAdminId, 'Payment IMPS ref 002'),
      adminService.updateWithdrawalStatus(createdWithdrawalId, 'APPROVED', testAdminId, 'Payment IMPS ref 003'),
      adminService.updateWithdrawalStatus(createdWithdrawalId, 'APPROVED', testAdminId, 'Payment IMPS ref 004'),
    ]);

    let adminSuccessCount = 0;
    let adminConflictCount = 0;

    parallelAdminActions.forEach((res, index) => {
      if (res.status === 'fulfilled') {
        adminSuccessCount++;
        console.log(`  Admin Tx #${index + 1}: [SUCCESS] Updated status to: ${res.value.status}`);
      } else {
        adminConflictCount++;
        console.log(`  Admin Tx #${index + 1}: [CONFLICT/REJECTED] ${res.reason?.message || res.reason}`);
      }
    });

    console.log(`\nAdmin Results: ${adminSuccessCount} Succeeded, ${adminConflictCount} Conflicts.`);
    if (adminSuccessCount !== 1 || adminConflictCount !== 3) {
      throw new Error(`Admin concurrency violation! Expected exactly 1 success and 3 conflicts, got ${adminSuccessCount} successes.`);
    }

    // Verify Final Database Balance
    const userFinal = await prisma.user.findUnique({ where: { id: testUserId } });
    console.log(`Final Database User State:
  - referralEarnings:  ₹${userFinal?.referralEarnings}
  - referralReserved:  ₹${userFinal?.referralReserved}
  - referralWithdrawn: ₹${userFinal?.referralWithdrawn}
  - Available Balance: ₹${Number(userFinal?.referralEarnings) - Number(userFinal?.referralReserved) - Number(userFinal?.referralWithdrawn)}`);

    if (Number(userFinal?.referralReserved) !== 0 || Number(userFinal?.referralWithdrawn) !== 1000) {
      throw new Error(`Balance mutation mismatch! Expected referralReserved: 0, referralWithdrawn: 1000.`);
    }
    console.log('✔ TEST 2 PASSED: Admin double-processing prevented by PostgreSQL FOR UPDATE row locking.');

    console.log('\n========================================================================');
    console.log('  ALL REAL POSTGRESQL PARALLEL CONCURRENCY TESTS PASSED (100%)');
    console.log('========================================================================');
  } finally {
    console.log('\n[Teardown] Cleaning up test records...');
    await prisma.withdrawalRequest.deleteMany({ where: { userId: testUserId } });
    await prisma.affiliatePaymentDetails.deleteMany({ where: { userId: testUserId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
    await prisma.$disconnect();
    console.log('✔ Test records removed; append-only audit entries retained.');
  }
}

runRealDatabaseConcurrencySuite().catch((err) => {
  console.error('\n❌ Concurrency test failed:', err);
  process.exit(1);
});
