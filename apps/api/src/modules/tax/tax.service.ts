import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type TaxTransactionType = 'purchase' | 'rental';

export interface TaxConfiguration {
  gstEnabled: boolean;
  gstRate: number;
  gstAppliesToPurchases: boolean;
  gstAppliesToRentals: boolean;
  gstPriceInclusive: boolean;
}

const DEFAULT_TAX_CONFIGURATION: TaxConfiguration = {
  gstEnabled: false,
  gstRate: 18,
  gstAppliesToPurchases: false,
  gstAppliesToRentals: false,
  gstPriceInclusive: false,
};

@Injectable()
export class TaxService {
  constructor(private readonly prisma: PrismaService) {}

  async getConfiguration(): Promise<TaxConfiguration> {
    const rows = await this.prisma.$queryRaw<Array<{ key: string; value: string }>>`
      SELECT "key", "value" FROM "system_settings"
      WHERE "key" IN (
        'gstEnabled',
        'gstRate',
        'gstAppliesToPurchases',
        'gstAppliesToRentals',
        'gstPriceInclusive'
      )
    `;
    const values = new Map(rows.map(({ key, value }) => [key, value]));
    const gstRate = Number(values.get('gstRate') ?? DEFAULT_TAX_CONFIGURATION.gstRate);
    if (!Number.isFinite(gstRate) || gstRate < 0 || gstRate > 100) {
      throw new BadRequestException('Configured GST rate must be between 0 and 100');
    }
    const booleanKeys = [
      'gstEnabled',
      'gstAppliesToPurchases',
      'gstAppliesToRentals',
      'gstPriceInclusive',
    ] as const;
    for (const key of booleanKeys) {
      const value = values.get(key);
      if (value !== undefined && value !== 'true' && value !== 'false') {
        throw new BadRequestException(`Configured ${key} value must be true or false`);
      }
    }

    return {
      gstEnabled: values.get('gstEnabled') === 'true',
      gstRate,
      gstAppliesToPurchases: values.get('gstAppliesToPurchases') === 'true',
      gstAppliesToRentals: values.get('gstAppliesToRentals') === 'true',
      gstPriceInclusive: values.get('gstPriceInclusive') === 'true',
    };
  }

  calculate(amountPaise: number, transactionType: TaxTransactionType, configuration: TaxConfiguration) {
    if (!Number.isSafeInteger(amountPaise) || amountPaise < 0) {
      throw new BadRequestException('Taxable amount must be a non-negative whole number of paise');
    }

    const applies = configuration.gstEnabled && (
      transactionType === 'purchase'
        ? configuration.gstAppliesToPurchases
        : configuration.gstAppliesToRentals
    );
    const inclusive = applies && configuration.gstPriceInclusive;
    const rate = applies ? configuration.gstRate : 0;
    const taxAmountPaise = applies
      ? Math.round(amountPaise * rate / (inclusive ? 100 + rate : 100))
      : 0;

    return {
      transactionType,
      gstEnabled: applies,
      taxRate: rate,
      taxAmountPaise,
      taxableAmountPaise: inclusive ? amountPaise - taxAmountPaise : amountPaise,
      totalAmountPaise: inclusive ? amountPaise : amountPaise + taxAmountPaise,
      taxInclusive: inclusive,
    };
  }

  async getPublicPolicy() {
    const config = await this.getConfiguration();
    return {
      enabled: config.gstEnabled,
      rate: config.gstRate,
      appliesToPurchases: config.gstAppliesToPurchases,
      appliesToRentals: config.gstAppliesToRentals,
      priceInclusive: config.gstPriceInclusive,
    };
  }
}
