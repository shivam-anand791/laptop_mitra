import {
  DEFAULT_RENTAL_TEST_PRODUCT_ID,
  assertRentalSeedEnvironment,
  buildRentalSeedSpecs,
  parseRentalSeedProductId,
  seedApprovedRentalPlans,
} from '../../prisma/seed-rental-test';

describe('seed-rental-test helpers', () => {
  it('blocks execution when NODE_ENV=production or ALLOW_DEV_SEED is not true', () => {
    expect(() => assertRentalSeedEnvironment({ NODE_ENV: 'production', ALLOW_DEV_SEED: 'true' } as NodeJS.ProcessEnv)).toThrow(
      /NODE_ENV=production/,
    );
    expect(() => assertRentalSeedEnvironment({ NODE_ENV: 'development' } as NodeJS.ProcessEnv)).toThrow(
      /ALLOW_DEV_SEED=true/,
    );
    expect(() =>
      assertRentalSeedEnvironment({ NODE_ENV: 'development', ALLOW_DEV_SEED: 'true' } as NodeJS.ProcessEnv),
    ).not.toThrow();
  });

  it('parses optional --product argument and falls back to default test laptop ID', () => {
    expect(parseRentalSeedProductId([])).toBe(DEFAULT_RENTAL_TEST_PRODUCT_ID);
    expect(parseRentalSeedProductId(['--product', 'prod-custom-1'])).toBe('prod-custom-1');
    expect(parseRentalSeedProductId(['--product=prod-custom-2'])).toBe('prod-custom-2');
  });

  it('computes 6- and 12-month INR decimal monthly rental specs with floor >= 10.00', () => {
    const standardSpecs = buildRentalSeedSpecs(50000);
    expect(standardSpecs).toEqual([
      { tenureMonths: 6, monthlyPrice: '3000.00', percentage: '6.00', sellingPriceSnapshot: '50000.00' },
      { tenureMonths: 12, monthlyPrice: '2250.00', percentage: '4.50', sellingPriceSnapshot: '50000.00' },
    ]);

    const lowPriceSpecs = buildRentalSeedSpecs(1);
    expect(lowPriceSpecs[0].monthlyPrice).toBe('10.00');
    expect(lowPriceSpecs[1].monthlyPrice).toBe('10.00');
  });

  it('upserts 6- and 12-month APPROVED RentalPrice records, audits them, and updates product.leasePriceMonthly', async () => {
    const findFirst = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'rp-existing-12' });
    const create = jest.fn().mockResolvedValue({ id: 'rp-new-6', monthlyPrice: '3000.00' });
    const update = jest.fn().mockResolvedValue({ id: 'rp-existing-12', monthlyPrice: '2250.00' });
    const auditCreate = jest.fn().mockResolvedValue({});
    const productUpdate = jest.fn().mockResolvedValue({});

    const prismaMock = {
      product: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'prod-thinkpad-x1-carbon-g10',
          name: 'ThinkPad X1 Carbon G10',
          price: '50000.00',
        }),
      },
      $transaction: jest.fn(async (cb: (tx: any) => Promise<unknown>) =>
        cb({
          rentalPrice: { findFirst, create, update },
          rentalPriceAudit: { create: auditCreate },
          product: { update: productUpdate },
        }),
      ),
    } as any;

    const result = await seedApprovedRentalPlans(prismaMock, 'prod-thinkpad-x1-carbon-g10', 'admin-test');

    expect(result).toEqual({
      productId: 'prod-thinkpad-x1-carbon-g10',
      productName: 'ThinkPad X1 Carbon G10',
      leasePriceMonthly: '2250.00',
      tenures: [6, 12],
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tenureMonths: 6, status: 'APPROVED', approvedBy: 'admin-test' }),
      }),
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'rp-existing-12' },
        data: expect.objectContaining({ monthlyPrice: '2250.00', status: 'APPROVED', approvedBy: 'admin-test' }),
      }),
    );
    expect(auditCreate).toHaveBeenCalledTimes(2);
    expect(productUpdate).toHaveBeenCalledWith({
      where: { id: 'prod-thinkpad-x1-carbon-g10' },
      data: { leasePriceMonthly: '2250.00' },
    });
  });
});
