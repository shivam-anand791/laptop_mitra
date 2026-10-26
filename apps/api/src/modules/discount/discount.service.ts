import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type DiscountValidationResponse = {
  valid: boolean;
  discountType: 'percentage' | 'fixed' | 'free_shipping' | null;
  discountValue: number;
  discountAmount: number;
  message: string;
};

export interface OrderDiscountResult {
  id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'free_shipping';
  discountAmountPaise: number;
}

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

    const discountCode: any = await this.prisma.discountCode.findFirst({
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
      const uncapped = Number((total * (discountValue / 100)).toFixed(2));
      const discountAmount = discountCode.maxDiscountValue === null || discountCode.maxDiscountValue === undefined
        ? uncapped
        : Math.min(uncapped, Number(discountCode.maxDiscountValue));

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

  async validateOrderDiscount(
    transaction: any,
    code: string | undefined,
    userId: string,
    items: Array<{ productId: string; categoryId: string | null; quantity: number; unitPricePaise: number }>,
    subtotalPaise: number,
  ): Promise<OrderDiscountResult | null> {
    const normalizedCode = code?.trim();
    if (!normalizedCode) return null;

    const discount = await transaction.discountCode.findFirst({
      where: { code: { equals: normalizedCode, mode: 'insensitive' } },
    });
    if (!discount || !discount.isActive) {
      throw new BadRequestException('Invalid or inactive discount code');
    }

    const now = new Date();
    if (discount.validFrom && now < new Date(discount.validFrom)) {
      throw new BadRequestException('Discount code not yet valid');
    }
    if (discount.validUntil && now > new Date(discount.validUntil)) {
      throw new BadRequestException('Discount code expired');
    }
    if (discount.maxUses !== null && discount.maxUses !== undefined && discount.uses >= discount.maxUses) {
      throw new BadRequestException('Discount code has reached maximum usage');
    }
    if (discount.maxUsesPerUser !== null && discount.maxUsesPerUser !== undefined) {
      const userUses = await transaction.discountRedemption.count({
        where: { discountCodeId: discount.id, userId },
      });
      if (userUses >= discount.maxUsesPerUser) {
        throw new BadRequestException('Discount code usage limit reached for this account');
      }
    }

    const minimumPaise = discount.minOrderValue === null || discount.minOrderValue === undefined
      ? 0
      : Math.round(Number(discount.minOrderValue) * 100);
    if (subtotalPaise < minimumPaise) {
      throw new BadRequestException('Order does not meet the minimum value for this discount');
    }

    const applicableTo = discount.appliesTo?.toLowerCase() || 'all';
    const applicableIds = new Set(
      String(discount.appliesToIds || '').split(',').map((id) => id.trim()).filter(Boolean),
    );
    let eligibleSubtotalPaise = 0;
    for (const item of items) {
      const applies = applicableTo === 'all'
        || (applicableTo === 'product' && applicableIds.has(item.productId))
        || (applicableTo === 'category' && item.categoryId !== null && applicableIds.has(item.categoryId));
      if (applies) eligibleSubtotalPaise += item.unitPricePaise * item.quantity;
    }
    if (eligibleSubtotalPaise === 0) {
      throw new BadRequestException('Discount code does not apply to the items in this order');
    }

    const type = discount.type as OrderDiscountResult['type'];
    const value = Number(discount.value);
    if (!Number.isFinite(value) || value < 0 || !['percentage', 'fixed', 'free_shipping'].includes(type)) {
      throw new BadRequestException('Discount code has invalid configuration');
    }

    let discountAmountPaise = 0;
    if (type === 'percentage') {
      discountAmountPaise = Math.round(eligibleSubtotalPaise * value / 100);
      if (discount.maxDiscountValue !== null && discount.maxDiscountValue !== undefined) {
        discountAmountPaise = Math.min(
          discountAmountPaise,
          Math.round(Number(discount.maxDiscountValue) * 100),
        );
      }
    } else if (type === 'fixed') {
      discountAmountPaise = Math.min(Math.round(value * 100), eligibleSubtotalPaise);
    }

    return {
      id: discount.id,
      code: discount.code,
      type,
      discountAmountPaise,
    };
  }

  async consumeOrderDiscount(transaction: any, discountId: string, userId: string, orderId: string) {
    const discount = await transaction.discountCode.findUnique({ where: { id: discountId } });
    if (!discount || !discount.isActive) {
      throw new BadRequestException('Discount code is no longer available');
    }

    const updateWhere: any = { id: discountId, isActive: true };
    if (discount.maxUses !== null && discount.maxUses !== undefined) updateWhere.uses = { lt: discount.maxUses };
    const consumed = await transaction.discountCode.updateMany({
      where: updateWhere,
      data: { uses: { increment: 1 } },
    });
    if (consumed.count !== 1) {
      throw new BadRequestException('Discount code has reached maximum usage');
    }

    await transaction.discountRedemption.create({
      data: { discountCodeId: discountId, userId, orderId },
    });
  }

  async getReferralStats(userId: string) {
    try {
      const [user, referredUsersCount] = await Promise.all([
        this.prisma.user.findUnique({ where: { id: userId } }),
        (this.prisma as any).referralRedemption.count({ where: { referrerUserId: userId } }),
      ]);
      if (!user) throw new NotFoundException('User not found');
      return {
        referralCode: user.referralCode,
        referralTier: user.referralTier,
        referralEarnings: Number(user.referralEarnings),
        referredUsersCount,
        referralLinkClickedCount: user.referralLinkClickedCount,
        payoutHistory: [],
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new ServiceUnavailableException('Referral statistics are temporarily unavailable');
    }
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

