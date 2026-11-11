import { PrismaClient } from '@prisma/client';
import { assertSafeDatabaseTarget, loadDatabaseEnvironment } from '../src/common/database-safety';

export const DEFAULT_RENTAL_TEST_PRODUCT_ID = 'prod-thinkpad-x1-carbon-g10';
export const RENTAL_TEST_TENURES = [6, 12] as const;

export interface RentalSeedPlanSpec {
  tenureMonths: 6 | 12;
  monthlyPrice: string;
  percentage: string;
  sellingPriceSnapshot: string;
}

export function assertRentalSeedEnvironment(env: NodeJS.ProcessEnv): void {
  // eslint-disable-next-line no-restricted-properties
  if (env.NODE_ENV === 'production') {
    throw new Error('Refusing to run rental test seed when NODE_ENV=production.');
  }
  // eslint-disable-next-line no-restricted-properties
  if (env.ALLOW_DEV_SEED !== 'true') {
    throw new Error('Refusing to run rental test seed without ALLOW_DEV_SEED=true.');
  }
}

export function parseRentalSeedProductId(argv: string[]): string {
  const idx = argv.indexOf('--product');
  if (idx !== -1 && argv[idx + 1]?.trim()) {
    return argv[idx + 1].trim();
  }
  const withEq = argv.find((arg) => arg.startsWith('--product='));
  if (withEq) {
    const val = withEq.split('=')[1]?.trim();
    if (val) return val;
  }
  return DEFAULT_RENTAL_TEST_PRODUCT_ID;
}

export function buildRentalSeedSpecs(sellingPrice: number): RentalSeedPlanSpec[] {
  const normalizedPrice = Number.isFinite(sellingPrice) && sellingPrice > 0 ? sellingPrice : 1000;
  const sellingPriceSnapshot = normalizedPrice.toFixed(2);

  return RENTAL_TEST_TENURES.map((tenureMonths) => {
    const percentage = tenureMonths === 6 ? 6.0 : 4.5;
    const computed = Math.max(10, Math.round((normalizedPrice * percentage) / 100));
    return {
      tenureMonths,
      monthlyPrice: computed.toFixed(2),
      percentage: percentage.toFixed(2),
      sellingPriceSnapshot,
    };
  });
}

export async function seedApprovedRentalPlans(
  prisma: PrismaClient,
  productId = DEFAULT_RENTAL_TEST_PRODUCT_ID,
  adminActorId = 'seed-rental-test',
): Promise<{ productId: string; productName: string; leasePriceMonthly: string; tenures: number[] }> {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    throw new Error(`Rental test product "${productId}" was not found in the development database.`);
  }

  const specs = buildRentalSeedSpecs(Number(product.price));
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    for (const spec of specs) {
      const existing = await tx.rentalPrice.findFirst({
        where: {
          productId: product.id,
          variantId: null,
          tenureMonths: spec.tenureMonths,
          status: { in: ['APPROVED', 'DRAFT'] },
        },
        orderBy: { createdAt: 'desc' },
      });

      const record = existing
        ? await tx.rentalPrice.update({
            where: { id: existing.id },
            data: {
              monthlyPrice: spec.monthlyPrice,
              sellingPriceSnapshot: spec.sellingPriceSnapshot,
              percentage: spec.percentage,
              status: 'APPROVED',
              sourceType: 'MANUAL',
              approvedBy: adminActorId,
              approvedAt: now,
              changeReason: 'Dev rental checkout verification seed',
            },
          })
        : await tx.rentalPrice.create({
            data: {
              productId: product.id,
              variantId: null,
              tenureMonths: spec.tenureMonths,
              monthlyPrice: spec.monthlyPrice,
              securityDeposit: '0.00',
              deliveryCharge: '0.00',
              sellingPriceSnapshot: spec.sellingPriceSnapshot,
              percentage: spec.percentage,
              status: 'APPROVED',
              sourceType: 'MANUAL',
              approvedBy: adminActorId,
              approvedAt: now,
              changeReason: 'Dev rental checkout verification seed',
            },
          });

      await tx.rentalPriceAudit.create({
        data: {
          rentalPriceId: record.id,
          action: 'APPROVED',
          newMonthlyPrice: record.monthlyPrice,
          newDeposit: '0.00',
          newDeliveryCharge: '0.00',
          adminId: adminActorId,
          reason: 'Dev rental checkout verification seed',
        },
      });
    }

    const twelveMonth = specs.find((s) => s.tenureMonths === 12) ?? specs[0];
    await tx.product.update({
      where: { id: product.id },
      data: { leasePriceMonthly: twelveMonth.monthlyPrice },
    });
  });

  const twelveMonth = specs.find((s) => s.tenureMonths === 12) ?? specs[0];
  return {
    productId: product.id,
    productName: product.name,
    leasePriceMonthly: twelveMonth.monthlyPrice,
    tenures: specs.map((s) => s.tenureMonths),
  };
}

async function main(): Promise<void> {
  // Never run against production or non-allowlisted databases.
  loadDatabaseEnvironment('development');
  assertSafeDatabaseTarget();
  // eslint-disable-next-line no-restricted-properties
  assertRentalSeedEnvironment(process.env);

  const productId = parseRentalSeedProductId(process.argv.slice(2));
  const prisma = new PrismaClient();
  try {
    const result = await seedApprovedRentalPlans(prisma, productId);
    console.log(
      `Seeded APPROVED rental plans (${result.tenures.join(', ')} months) for "${result.productName}" (${result.productId}); leasePriceMonthly=₹${result.leasePriceMonthly}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  void main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  });
}
