import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type DiscountValidationResponse = {
  valid: boolean;
  discountType: 'percentage' | 'fixed' | 'free_shipping' | null;
  discountValue: number;
  discountAmount: number;
  message: string;
};

@Injectable()
export class DiscountService {
  constructor(private readonly prisma: PrismaService) {}

  async validateDiscount(code?: string, cartTotal?: number): Promise<DiscountValidationResponse> {
    const normalizedCode = code?.trim();

    if (!normalizedCode) {
      return this.invalidResult('Discount code is required');
    }

    const total = Number(cartTotal ?? 0);

    if (!Number.isFinite(total) || total < 0) {
      return this.invalidResult('Cart total must be a valid positive number');
    }

    const discountCode = await this.prisma.discountCode.findFirst({
      where: {
        code: {
          equals: normalizedCode,
          mode: 'insensitive',
        },
      },
    });

    if (!discountCode || !discountCode.isActive) {
      return this.invalidResult('Invalid or inactive discount code');
    }

    const now = new Date();

    if (discountCode.validFrom && now < new Date(discountCode.validFrom)) {
      return this.invalidResult('Discount code not yet valid');
    }

    if (discountCode.validUntil && now > new Date(discountCode.validUntil)) {
      return this.invalidResult('Discount code expired');
    }

    if (discountCode.maxUses && discountCode.uses >= discountCode.maxUses) {
      return this.invalidResult('Discount code has reached maximum usage');
    }

    if (discountCode.minOrderValue && total < Number(discountCode.minOrderValue)) {
      return this.invalidResult(
        `Minimum order value for ${discountCode.code} is ₹${Number(discountCode.minOrderValue).toLocaleString('en-IN')}`,
      );
    }

    const discountType = discountCode.type as 'percentage' | 'fixed' | 'free_shipping';
    const discountValue = Number(discountCode.value);

    if (discountType === 'percentage') {
      const discountAmount = Number((total * (discountValue / 100)).toFixed(2));

      return {
        valid: true,
        discountType,
        discountValue,
        discountAmount,
        message: `Code applied: ${discountValue}% off`,
      };
    }

    if (discountType === 'fixed') {
      const discountAmount = Math.min(discountValue, total);

      return {
        valid: true,
        discountType,
        discountValue,
        discountAmount: Number(discountAmount.toFixed(2)),
        message: `Code applied: ₹${discountAmount.toLocaleString('en-IN')} off`,
      };
    }

    if (discountType === 'free_shipping') {
      return {
        valid: true,
        discountType,
        discountValue: 0,
        discountAmount: 0,
        message: 'Free shipping applied',
      };
    }

    return this.invalidResult('Invalid discount code type');
  }

  private invalidResult(message: string): DiscountValidationResponse {
    return {
      valid: false,
      discountType: null,
      discountValue: 0,
      discountAmount: 0,
      message,
    };
  }
}
