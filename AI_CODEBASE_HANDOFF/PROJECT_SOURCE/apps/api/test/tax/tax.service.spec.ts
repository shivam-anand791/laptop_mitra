import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import { TaxService } from '../../src/modules/tax/tax.service';

describe('TaxService', () => {
  const prisma = {
    $queryRaw: jest.fn().mockResolvedValue([]),
  } as unknown as PrismaService;
  const taxService = new TaxService(prisma);

  it('defaults to GST disabled and does not add tax unless enabled for the transaction type', async () => {
    const config = await taxService.getConfiguration();

    expect(config).toEqual({
      gstEnabled: false,
      gstRate: 18,
      gstAppliesToPurchases: false,
      gstAppliesToRentals: false,
      gstPriceInclusive: false,
    });
    expect(taxService.calculate(10000, 'purchase', config)).toMatchObject({
      taxAmountPaise: 0,
      taxableAmountPaise: 10000,
      totalAmountPaise: 10000,
      taxInclusive: false,
    });
  });

  it('adds exclusive tax only to configured transaction types', () => {
    const config = {
      gstEnabled: true,
      gstRate: 18,
      gstAppliesToPurchases: true,
      gstAppliesToRentals: false,
      gstPriceInclusive: false,
    };

    expect(taxService.calculate(10000, 'purchase', config)).toMatchObject({
      taxAmountPaise: 1800,
      taxableAmountPaise: 10000,
      totalAmountPaise: 11800,
      taxInclusive: false,
    });
    expect(taxService.calculate(10000, 'rental', config).totalAmountPaise).toBe(10000);
  });

  it('extracts inclusive tax from the configured amount and rejects invalid paise', () => {
    const config = {
      gstEnabled: true,
      gstRate: 18,
      gstAppliesToPurchases: false,
      gstAppliesToRentals: true,
      gstPriceInclusive: true,
    };

    expect(taxService.calculate(11800, 'rental', config)).toMatchObject({
      taxAmountPaise: 1800,
      taxableAmountPaise: 10000,
      totalAmountPaise: 11800,
      taxInclusive: true,
    });
    expect(() => taxService.calculate(1.5, 'purchase', config)).toThrow(BadRequestException);
    expect(() => taxService.calculate(-1, 'purchase', config)).toThrow(BadRequestException);
  });
});
