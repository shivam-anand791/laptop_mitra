import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentEncryptionService } from '../../common/encryption/payment-encryption.service';
import { QrStorageService } from '../../common/storage/qr-storage.service';
import { NotificationService } from '../notifications/notification.service';
import { MailService } from '../mail/mail.service';
import { SavePayoutDetailsDto } from './dto/save-payout-details.dto';
import { WithdrawRequestDto } from './dto/withdraw-request.dto';
import {
  AvailableCouponsDto,
  BulkGenerateCouponsDto,
  CouponStatus,
  CouponType,
  CouponVisibility,
  CreateCouponDto,
  PreviewCouponDto,
  UpdateCouponDto,
} from './dto/coupon.dto';
import {
  allocateDiscountProportionally,
  AllocatableItem,
  AllocatedLine,
} from './coupon-allocation';

export type DiscountValidationResponse = {
  valid: boolean;
  discountType: 'percentage' | 'fixed' | 'free_shipping' | 'free_warranty' | null;
  discountValue: number;
  discountAmount: number;
  message: string;
  isReferral?: boolean;
};

export interface OrderDiscountResult {
  id: string;
  code: string;
  type: 'percentage' | 'fixed' | 'free_shipping' | 'free_warranty';
  discountAmountPaise: number;
  allocatedLines: AllocatedLine[];
}

@Injectable()
export class DiscountService {
  private readonly logger = new Logger(DiscountService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: PaymentEncryptionService,
    private readonly qrStorageService: QrStorageService,
    @Optional() private readonly notificationService?: NotificationService,
    @Optional() private readonly mailService?: MailService,
  ) {}

  // ---------------------------------------------------------------------------
  // Status Derivation (Pure Function)
  // ---------------------------------------------------------------------------
  deriveCouponStatus(coupon: any, now = new Date()): CouponStatus {
    if (coupon.status === CouponStatus.ARCHIVED) return CouponStatus.ARCHIVED;
    if (coupon.status === CouponStatus.DRAFT) return CouponStatus.DRAFT;
    if (coupon.status === CouponStatus.PAUSED || !coupon.isActive) return CouponStatus.PAUSED;

    if (coupon.validFrom && now < new Date(coupon.validFrom)) {
      return CouponStatus.SCHEDULED;
    }
    if (coupon.validUntil && now > new Date(coupon.validUntil)) {
      return CouponStatus.EXPIRED;
    }
    if (coupon.maxUses !== null && coupon.maxUses !== undefined && coupon.uses >= coupon.maxUses) {
      return CouponStatus.EXHAUSTED;
    }
    return CouponStatus.ACTIVE;
  }

  // ---------------------------------------------------------------------------
  // Customer: Discover Available Offers for a Cart
  // ---------------------------------------------------------------------------
  async getAvailableCoupons(userId: string | null, dto: AvailableCouponsDto) {
    const now = new Date();
    const rawCoupons = await this.prisma.discountCode.findMany({
      where: {
        status: { not: CouponStatus.ARCHIVED },
        visibility: { in: [CouponVisibility.PUBLIC, CouponVisibility.TARGETED] },
      },
      orderBy: [{ highlight: 'desc' }, { createdAt: 'desc' }],
    });

    let priorOrderCount = 0;
    const userRedemptionCounts: Record<string, number> = {};

    if (userId) {
      priorOrderCount = await this.prisma.order.count({
        where: {
          userId,
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
      });

      const redemptions = await this.prisma.discountRedemption.groupBy({
        by: ['discountCodeId'],
        where: { userId, status: 'REDEEMED' },
        _count: { id: true },
      });

      for (const r of redemptions) {
        userRedemptionCounts[r.discountCodeId] = r._count.id;
      }
    }

    const eligible: any[] = [];
    const ineligible: any[] = [];

    for (const coupon of rawCoupons) {
      const derivedStatus = this.deriveCouponStatus(coupon, now);

      // Targeted check: if targeted, only show if user is in targetedUserIds
      if (coupon.visibility === CouponVisibility.TARGETED) {
        const targetedIds = new Set(
          String(coupon.targetedUserIds || '')
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean),
        );
        if (!userId || !targetedIds.has(userId)) {
          continue; // Not meant for this user
        }
      }

      const evaluation = this.evaluateEligibility(
        coupon,
        dto.items,
        dto.referralCode,
        dto.paymentMethod,
        userId,
        priorOrderCount,
        userRedemptionCounts[coupon.id] || 0,
        derivedStatus,
      );

      const couponPayload = {
        id: coupon.id,
        code: coupon.code,
        title: coupon.title || coupon.name,
        description: coupon.description,
        type: coupon.type,
        value: Number(coupon.value),
        maxDiscountCap: coupon.maxDiscountCap ? Number(coupon.maxDiscountCap) : null,
        minOrderValue: coupon.minOrderValue ? Number(coupon.minOrderValue) : null,
        badgeText: coupon.badgeText || (coupon.type === 'percentage' ? `${coupon.value}% OFF` : `₹${coupon.value} OFF`),
        terms: coupon.terms,
        highlight: coupon.highlight,
        validUntil: coupon.validUntil,
        status: derivedStatus,
      };

      if (evaluation.eligible) {
        eligible.push({
          ...couponPayload,
          savingsAmount: evaluation.savingsAmount,
          allocatedLines: evaluation.allocatedLines,
        });
      } else {
        ineligible.push({
          ...couponPayload,
          reason: evaluation.reason,
          amountNeeded: evaluation.amountNeeded || 0,
        });
      }
    }

    // Sort eligible by highest savings first
    eligible.sort((a, b) => b.savingsAmount - a.savingsAmount);

    return { eligible, ineligible };
  }

  // ---------------------------------------------------------------------------
  // Customer: Validate & Preview Specific Coupon
  // ---------------------------------------------------------------------------
  async previewCoupon(userId: string | null, dto: PreviewCouponDto) {
    const normalizedCode = dto.code.trim().toUpperCase();
    const now = new Date();

    const coupon: any = await this.prisma.discountCode.findFirst({
      where: {
        code: { equals: normalizedCode, mode: 'insensitive' },
        status: { not: CouponStatus.ARCHIVED },
      },
    });

    if (!coupon) {
      throw new BadRequestException('Coupon code not found');
    }

    const derivedStatus = this.deriveCouponStatus(coupon, now);
    if (derivedStatus !== CouponStatus.ACTIVE) {
      if (derivedStatus === CouponStatus.SCHEDULED) {
        throw new BadRequestException('This coupon offer has not started yet');
      }
      if (derivedStatus === CouponStatus.EXPIRED) {
        throw new BadRequestException('This coupon code has expired');
      }
      if (derivedStatus === CouponStatus.EXHAUSTED) {
        throw new BadRequestException('This coupon has reached its maximum usage limit');
      }
      if (derivedStatus === CouponStatus.PAUSED) {
        throw new BadRequestException('This coupon is currently inactive');
      }
      throw new BadRequestException('Coupon is not available');
    }

    let priorOrderCount = 0;
    let userUses = 0;

    if (userId) {
      priorOrderCount = await this.prisma.order.count({
        where: {
          userId,
          status: { notIn: ['CANCELLED', 'REFUNDED'] },
        },
      });

      userUses = await this.prisma.discountRedemption.count({
        where: { discountCodeId: coupon.id, userId, status: 'REDEEMED' },
      });
    }

    const evaluation = this.evaluateEligibility(
      coupon,
      dto.items,
      dto.referralCode,
      dto.paymentMethod,
      userId,
      priorOrderCount,
      userUses,
      derivedStatus,
    );

    if (!evaluation.eligible) {
      throw new BadRequestException(evaluation.reason || 'This coupon cannot be applied to your cart');
    }

    const cartSubtotal = dto.items.reduce((s, it) => s + it.price * it.quantity, 0);

    return {
      valid: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        title: coupon.title || coupon.name,
        type: coupon.type,
        value: Number(coupon.value),
        maxDiscountCap: coupon.maxDiscountCap ? Number(coupon.maxDiscountCap) : null,
        badgeText: coupon.badgeText,
      },
      savingsAmount: evaluation.savingsAmount,
      cartSubtotal,
      finalPayable: Math.max(0, cartSubtotal - evaluation.savingsAmount),
      allocatedLines: evaluation.allocatedLines,
      message: `Coupon ${coupon.code} applied: Save ₹${evaluation.savingsAmount.toLocaleString('en-IN')}`,
    };
  }

  // ---------------------------------------------------------------------------
  // Internal Eligibility Evaluator (Deterministic & Shared)
  // ---------------------------------------------------------------------------
  private evaluateEligibility(
    coupon: any,
    items: any[],
    referralCode?: string,
    paymentMethod?: string,
    userId?: string | null,
    priorOrderCount = 0,
    userRedemptionCount = 0,
    status = CouponStatus.ACTIVE,
  ): {
    eligible: boolean;
    reason?: string;
    amountNeeded?: number;
    savingsAmount: number;
    allocatedLines: AllocatedLine[];
  } {
    if (status !== CouponStatus.ACTIVE) {
      return {
        eligible: false,
        reason: status === CouponStatus.SCHEDULED ? 'Offer starts soon' : 'Coupon expired or unavailable',
        savingsAmount: 0,
        allocatedLines: [],
      };
    }

    // Referral combination rule (Decision 1)
    if (referralCode?.trim() && !coupon.canCombineWithReferral) {
      return {
        eligible: false,
        reason: 'This coupon cannot be combined with a referral discount',
        savingsAmount: 0,
        allocatedLines: [],
      };
    }

    // Payment method restriction
    if (paymentMethod && coupon.allowedPaymentMethods && coupon.allowedPaymentMethods !== 'ANY') {
      const pm = String(paymentMethod).toUpperCase();
      const isOnline = pm === 'RAZORPAY' || pm === 'ONLINE' || pm === 'PREPAID';
      const requiresOnline = coupon.allowedPaymentMethods === 'ONLINE_ONLY' || coupon.allowedPaymentMethods === 'PREPAID';
      const requiresCod = coupon.allowedPaymentMethods === 'COD_ONLY' || coupon.allowedPaymentMethods === 'COD';

      if (requiresOnline && !isOnline) {
        return {
          eligible: false,
          reason: 'Valid on prepaid online payments only (UPI / Card / Netbanking)',
          savingsAmount: 0,
          allocatedLines: [],
        };
      }
      if (requiresCod && isOnline) {
        return {
          eligible: false,
          reason: 'Valid only on Cash on Delivery orders',
          savingsAmount: 0,
          allocatedLines: [],
        };
      }
    }

    // First order only restriction
    if (coupon.firstOrderOnly) {
      if (!userId) {
        return {
          eligible: false,
          reason: 'Sign in to claim this first-order coupon',
          savingsAmount: 0,
          allocatedLines: [],
        };
      }
      if (priorOrderCount > 0) {
        return {
          eligible: false,
          reason: 'Valid on first order only',
          savingsAmount: 0,
          allocatedLines: [],
        };
      }
    }

    // Per-user redemption limit
    if (coupon.maxUsesPerUser !== null && coupon.maxUsesPerUser !== undefined) {
      if (!userId && coupon.maxUsesPerUser === 1) {
        return {
          eligible: false,
          reason: 'Sign in to verify coupon eligibility',
          savingsAmount: 0,
          allocatedLines: [],
        };
      }
      if (userId && userRedemptionCount >= coupon.maxUsesPerUser) {
        return {
          eligible: false,
          reason: `You have already redeemed this coupon (${userRedemptionCount}/${coupon.maxUsesPerUser} uses)`,
          savingsAmount: 0,
          allocatedLines: [],
        };
      }
    }

    // Filter items according to scope, rent/lease, and warranty
    const allocatableItems: AllocatableItem[] = [];
    const appliesTo = (coupon.appliesTo || 'ALL').toUpperCase();
    const includedIds = new Set(
      String(coupon.appliesToIds || '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    );
    const excludedProductIds = new Set(
      String(coupon.excludedProductIds || '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    );
    const excludedCategoryIds = new Set(
      String(coupon.excludedCategoryIds || '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    );

    let totalEligibleBasePaise = 0;
    let totalEligibleQty = 0;
    let totalCartSubtotalPaise = 0;

    for (const it of items) {
      const unitPaise = Math.round(Number(it.price) * 100);
      const linePaise = unitPaise * it.quantity;
      totalCartSubtotalPaise += linePaise;

      // Purchase mode check: Decision 2 (Coupons apply to outright purchases only by default)
      if (it.purchaseMode === 'lease' && !coupon.allowRentLease) {
        continue;
      }

      const pId = String(it.productId || '').toLowerCase();
      const cId = String(it.categoryId || '').toLowerCase();
      const bId = String(it.brandId || '').toLowerCase();

      // Check exclusions
      if (excludedProductIds.has(pId) || (cId && excludedCategoryIds.has(cId))) {
        continue;
      }

      // Check inclusions
      let matches = false;
      if (appliesTo === 'ALL') {
        matches = true;
      } else if (appliesTo === 'PRODUCT') {
        matches = includedIds.has(pId);
      } else if (appliesTo === 'CATEGORY') {
        matches = Boolean(cId && includedIds.has(cId));
      } else if (appliesTo === 'BRAND') {
        matches = Boolean(bId && includedIds.has(bId));
      }

      if (matches) {
        allocatableItems.push({
          id: it.variantId || it.productId,
          eligiblePaise: linePaise,
        });
        totalEligibleBasePaise += linePaise;
        totalEligibleQty += it.quantity;
      }
    }

    if (allocatableItems.length === 0 || totalEligibleBasePaise === 0) {
      const hasOnlyLease = items.length > 0 && items.every((it) => it.purchaseMode === 'lease');
      const reason = hasOnlyLease && !coupon.allowRentLease
        ? 'This offer applies to outright purchase items only'
        : 'Coupon does not apply to any eligible items in your cart';
      return {
        eligible: false,
        reason,
        savingsAmount: 0,
        allocatedLines: [],
      };
    }

    // Minimum quantity check
    if (coupon.minQuantity && totalEligibleQty < coupon.minQuantity) {
      return {
        eligible: false,
        reason: `Add at least ${coupon.minQuantity} eligible items to unlock this offer`,
        savingsAmount: 0,
        allocatedLines: [],
      };
    }

    // Minimum spend check
    const minPaise = coupon.minOrderValue ? Math.round(Number(coupon.minOrderValue) * 100) : 0;
    if (totalCartSubtotalPaise < minPaise) {
      const diffRupees = Math.ceil((minPaise - totalCartSubtotalPaise) / 100);
      return {
        eligible: false,
        reason: `Add ₹${diffRupees.toLocaleString('en-IN')} more to unlock this coupon`,
        amountNeeded: diffRupees,
        savingsAmount: 0,
        allocatedLines: [],
      };
    }

    // Maximum spend check
    const maxPaise = coupon.maxOrderValue ? Math.round(Number(coupon.maxOrderValue) * 100) : null;
    if (maxPaise && totalCartSubtotalPaise > maxPaise) {
      return {
        eligible: false,
        reason: `Coupon is valid on orders up to ₹${Number(coupon.maxOrderValue).toLocaleString('en-IN')}`,
        savingsAmount: 0,
        allocatedLines: [],
      };
    }

    // Calculate discount amount
    let totalDiscountPaise = 0;
    const val = Number(coupon.value);

    if (coupon.type === CouponType.PERCENTAGE) {
      totalDiscountPaise = Math.round((totalEligibleBasePaise * val) / 100);
      const cap = coupon.maxDiscountCap || coupon.maxDiscountValue;
      if (cap) {
        const capPaise = Math.round(Number(cap) * 100);
        totalDiscountPaise = Math.min(totalDiscountPaise, capPaise);
      }
    } else if (coupon.type === CouponType.FIXED) {
      totalDiscountPaise = Math.min(Math.round(val * 100), totalEligibleBasePaise);
    } else if (coupon.type === CouponType.FREE_WARRANTY) {
      // Calculate warranty savings
      const warrantyTotalPaise = items.reduce((sum, it) => {
        if (it.hasWarranty && it.warrantyPrice) {
          return sum + Math.round(Number(it.warrantyPrice) * 100) * it.quantity;
        }
        return sum;
      }, 0);
      totalDiscountPaise = warrantyTotalPaise;
    }

    const allocatedLines = allocateDiscountProportionally(allocatableItems, totalDiscountPaise);
    const savingsAmount = Number((totalDiscountPaise / 100).toFixed(2));

    return {
      eligible: true,
      savingsAmount,
      allocatedLines,
    };
  }

  // ---------------------------------------------------------------------------
  // Order Transaction: Authoritative Validation
  // ---------------------------------------------------------------------------
  async validateOrderDiscount(
    transaction: any,
    code: string | undefined,
    userId: string,
    items: Array<{
      productId: string;
      variantId?: string;
      categoryId: string | null;
      brandId?: string;
      quantity: number;
      unitPricePaise: number;
      purchaseMode?: string;
      hasWarranty?: boolean;
      warrantyPrice?: number;
    }>,
    subtotalPaise: number,
    referralCode?: string,
    paymentMethod?: string,
  ): Promise<OrderDiscountResult | null> {
    const normalizedCode = code?.trim().toUpperCase();
    if (!normalizedCode) return null;

    const discount = await transaction.discountCode.findFirst({
      where: {
        code: { equals: normalizedCode, mode: 'insensitive' },
        status: { not: CouponStatus.ARCHIVED },
      },
    });

    if (!discount) {
      throw new BadRequestException('Invalid discount coupon code');
    }

    const derivedStatus = this.deriveCouponStatus(discount, new Date());
    if (derivedStatus !== CouponStatus.ACTIVE) {
      if (derivedStatus === CouponStatus.SCHEDULED) {
        throw new BadRequestException('Discount coupon not yet valid');
      }
      if (derivedStatus === CouponStatus.EXPIRED) {
        throw new BadRequestException('Discount coupon has expired');
      }
      if (derivedStatus === CouponStatus.EXHAUSTED) {
        throw new BadRequestException('Discount coupon has reached its maximum usage limit');
      }
      throw new BadRequestException('Discount coupon is currently inactive');
    }

    // Check prior orders
    const priorOrderCount = await transaction.order.count({
      where: {
        userId,
        status: { notIn: ['CANCELLED', 'REFUNDED'] },
      },
    });

    // Check per-user limit with transaction count
    const userUses = await transaction.discountRedemption.count({
      where: { discountCodeId: discount.id, userId, status: 'REDEEMED' },
    });

    const mappedItems = items.map((it) => ({
      productId: it.productId,
      variantId: it.variantId,
      categoryId: it.categoryId,
      brandId: it.brandId,
      quantity: it.quantity,
      price: it.unitPricePaise / 100,
      purchaseMode: it.purchaseMode as any,
      hasWarranty: it.hasWarranty,
      warrantyPrice: it.warrantyPrice,
    }));

    const evaluation = this.evaluateEligibility(
      discount,
      mappedItems,
      referralCode,
      paymentMethod,
      userId,
      priorOrderCount,
      userUses,
      derivedStatus,
    );

    if (!evaluation.eligible) {
      throw new BadRequestException(evaluation.reason || 'Discount coupon is not eligible for this order');
    }

    const discountAmountPaise = Math.round(evaluation.savingsAmount * 100);

    return {
      id: discount.id,
      code: discount.code,
      type: discount.type as any,
      discountAmountPaise,
      allocatedLines: evaluation.allocatedLines,
    };
  }

  // ---------------------------------------------------------------------------
  // Order Transaction: Atomic Consumption & Audit Snapshot
  // ---------------------------------------------------------------------------
  async consumeOrderDiscount(
    transaction: any,
    discountId: string,
    userId: string,
    orderId: string,
    orderSubtotalRupees: number,
    allocatedLines: AllocatedLine[] = [],
  ) {
    const discount = await transaction.discountCode.findUnique({ where: { id: discountId } });
    if (!discount || !discount.isActive) {
      throw new BadRequestException('Coupon code is no longer active');
    }

    // Check per-user limit
    if (discount.maxUsesPerUser !== null && discount.maxUsesPerUser !== undefined) {
      const currentUses = await transaction.discountRedemption.count({
        where: { discountCodeId: discountId, userId, status: 'REDEEMED' },
      });
      if (currentUses >= discount.maxUsesPerUser) {
        throw new BadRequestException('Coupon usage limit reached for this account');
      }
    }

    // Atomically increment total usage counter (concurrency safe)
    const updateWhere: any = { id: discountId, isActive: true };
    if (discount.maxUses !== null && discount.maxUses !== undefined) {
      updateWhere.uses = { lt: discount.maxUses };
    }

    const consumed = await transaction.discountCode.updateMany({
      where: updateWhere,
      data: {
        uses: { increment: 1 },
        dailyUses: { increment: 1 },
      },
    });

    if (consumed.count !== 1) {
      throw new ConflictException('Coupon code has just reached its maximum redemption limit');
    }

    const discountAmountPaise = allocatedLines.reduce((sum, l) => sum + l.allocatedDiscountPaise, 0);

    // Save immutable redemption ledger snapshot
    await transaction.discountRedemption.create({
      data: {
        discountCodeId: discountId,
        userId,
        orderId,
        status: 'REDEEMED',
        discountType: discount.type,
        discountValue: discount.value,
        discountAmount: (discountAmountPaise / 100).toFixed(2),
        orderSubtotal: orderSubtotalRupees.toFixed(2),
        allocatedLines: allocatedLines as any,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Cancellation & Expiry: Idempotent Restoration (No Hard Deletes)
  // ---------------------------------------------------------------------------
  async restoreOrderDiscount(
    transaction: any,
    orderId: string,
    reason = 'Order cancelled or expired',
  ): Promise<boolean> {
    const redemption = await transaction.discountRedemption.findUnique({
      where: { orderId },
    });

    if (!redemption || redemption.status === 'RESTORED') {
      return false; // Already restored or none applied
    }

    // 1. Decrement usage counter atomically
    await transaction.discountCode.updateMany({
      where: { id: redemption.discountCodeId, uses: { gt: 0 } },
      data: {
        uses: { decrement: 1 },
        dailyUses: { decrement: 1 },
      },
    });

    // 2. Mark redemption status as RESTORED (Never delete history)
    await transaction.discountRedemption.update({
      where: { id: redemption.id },
      data: {
        status: 'RESTORED',
        restoredAt: new Date(),
        restorationReason: reason,
      },
    });

    return true;
  }

  // ---------------------------------------------------------------------------
  // Admin: CRUD, Lifecycle, Bulk Generation & Audit Logging
  // ---------------------------------------------------------------------------
  async listAdminCoupons(query: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(query.limit || 20)));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status && query.status !== 'ALL') {
      where.status = query.status;
    }

    if (query.search?.trim()) {
      where.OR = [
        { code: { contains: query.search.trim(), mode: 'insensitive' } },
        { title: { contains: query.search.trim(), mode: 'insensitive' } },
        { description: { contains: query.search.trim(), mode: 'insensitive' } },
      ];
    }

    const [total, coupons] = await Promise.all([
      this.prisma.discountCode.count({ where }),
      this.prisma.discountCode.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { redemptions: { where: { status: 'REDEEMED' } } },
          },
        },
      }),
    ]);

    const now = new Date();
    const enriched = coupons.map((c) => ({
      ...c,
      computedStatus: this.deriveCouponStatus(c, now),
      activeRedemptionsCount: c._count.redemptions,
    }));

    return {
      data: enriched,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createCoupon(adminUserId: string, dto: CreateCouponDto) {
    const normalizedCode = dto.code.trim().toUpperCase();

    // Validation: 4-20 chars alphanumeric, no spaces
    if (!/^[A-Z0-9_-]{4,20}$/.test(normalizedCode)) {
      throw new BadRequestException(
        'Coupon code must be 4 to 20 uppercase alphanumeric characters (hyphens and underscores allowed).',
      );
    }

    const existing = await this.prisma.discountCode.findUnique({
      where: { code: normalizedCode },
    });
    if (existing) {
      throw new ConflictException(`Coupon code "${normalizedCode}" already exists.`);
    }

    const created = await this.prisma.discountCode.create({
      data: {
        code: normalizedCode,
        name: dto.title,
        title: dto.title,
        description: dto.description,
        internalNote: dto.internalNote,
        type: dto.type,
        value: dto.value,
        maxDiscountCap: dto.maxDiscountCap,
        maxDiscountValue: dto.maxDiscountCap,
        minOrderValue: dto.minOrderValue,
        maxOrderValue: dto.maxOrderValue,
        maxUses: dto.maxUses,
        maxUsesPerUser: dto.maxUsesPerUser || 1,
        appliesTo: dto.appliesTo || 'ALL',
        appliesToIds: dto.appliesToIds,
        excludedProductIds: dto.excludedProductIds,
        excludedCategoryIds: dto.excludedCategoryIds,
        allowRentLease: dto.allowRentLease ?? false,
        excludeWarranty: dto.excludeWarranty ?? true,
        allowedPaymentMethods: dto.allowedPaymentMethods || 'ANY',
        firstOrderOnly: dto.firstOrderOnly ?? false,
        targetedUserIds: dto.targetedUserIds,
        targetPincodes: dto.targetPincodes,
        minQuantity: dto.minQuantity,
        canCombineWithReferral: dto.canCombineWithReferral ?? false,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        visibility: dto.visibility || CouponVisibility.PUBLIC,
        badgeText: dto.badgeText,
        terms: dto.terms,
        highlight: dto.highlight ?? false,
        status: CouponStatus.ACTIVE,
      },
    });

    // Audit Log
    await (this.prisma as any).auditLog.create({
      data: {
        actorUserId: adminUserId,
        action: 'CREATE_COUPON',
        entityType: 'DISCOUNT_CODE',
        entityId: created.id,
        metadata: {
          code: created.code,
          type: created.type,
          value: created.value,
        },
      },
    });

    return created;
  }

  async getAdminCoupon(id: string) {
    const coupon: any = await this.prisma.discountCode.findUnique({
      where: { id },
      include: {
        redemptions: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, email: true, phone: true } },
            order: { select: { id: true, orderNumber: true, finalAmount: true, status: true } },
          },
        },
        _count: {
          select: { redemptions: { where: { status: 'REDEEMED' } } },
        },
      },
    });

    if (!coupon) throw new NotFoundException('Coupon not found');

    const totalDiscountGiven = await this.prisma.discountRedemption.aggregate({
      where: { discountCodeId: id, status: 'REDEEMED' },
      _sum: { discountAmount: true },
    });

    return {
      ...coupon,
      computedStatus: this.deriveCouponStatus(coupon),
      totalDiscountGiven: Number(totalDiscountGiven._sum.discountAmount || 0),
    };
  }

  async updateCoupon(adminUserId: string, id: string, dto: UpdateCouponDto) {
    const existing = await this.prisma.discountCode.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Coupon not found');

    const redemptionsCount = await this.prisma.discountRedemption.count({
      where: { discountCodeId: id, status: 'REDEEMED' },
    });

    const updated = await this.prisma.discountCode.update({
      where: { id },
      data: {
        title: dto.title,
        name: dto.title,
        description: dto.description,
        internalNote: dto.internalNote,
        type: dto.type,
        value: dto.value,
        maxDiscountCap: dto.maxDiscountCap,
        maxDiscountValue: dto.maxDiscountCap,
        minOrderValue: dto.minOrderValue,
        maxOrderValue: dto.maxOrderValue,
        maxUses: dto.maxUses,
        maxUsesPerUser: dto.maxUsesPerUser,
        appliesTo: dto.appliesTo,
        appliesToIds: dto.appliesToIds,
        excludedProductIds: dto.excludedProductIds,
        excludedCategoryIds: dto.excludedCategoryIds,
        allowRentLease: dto.allowRentLease,
        excludeWarranty: dto.excludeWarranty,
        allowedPaymentMethods: dto.allowedPaymentMethods,
        firstOrderOnly: dto.firstOrderOnly,
        targetedUserIds: dto.targetedUserIds,
        targetPincodes: dto.targetPincodes,
        minQuantity: dto.minQuantity,
        canCombineWithReferral: dto.canCombineWithReferral,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
        visibility: dto.visibility,
        badgeText: dto.badgeText,
        terms: dto.terms,
        highlight: dto.highlight,
      },
    });

    await (this.prisma as any).auditLog.create({
      data: {
        actorUserId: adminUserId,
        action: 'UPDATE_COUPON',
        entityType: 'DISCOUNT_CODE',
        entityId: id,
        metadata: {
          code: updated.code,
          changes: dto,
          existingRedemptionsCount: redemptionsCount,
        },
      },
    });

    return {
      ...updated,
      hasExistingRedemptions: redemptionsCount > 0,
      notice:
        redemptionsCount > 0
          ? 'Notice: This coupon already has redemptions. Updated terms will apply only to future orders.'
          : undefined,
    };
  }

  async updateCouponStatus(adminUserId: string, id: string, status: CouponStatus) {
    const existing = await this.prisma.discountCode.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Coupon not found');

    const updated = await this.prisma.discountCode.update({
      where: { id },
      data: {
        status,
        isActive: status === CouponStatus.ACTIVE,
      },
    });

    await (this.prisma as any).auditLog.create({
      data: {
        actorUserId: adminUserId,
        action: `CHANGE_STATUS_${status}`,
        entityType: 'DISCOUNT_CODE',
        entityId: id,
        metadata: { from: existing.status, to: status },
      },
    });

    return updated;
  }

  async bulkGenerateCoupons(adminUserId: string, dto: BulkGenerateCouponsDto) {
    const count = Math.min(500, Math.max(1, dto.quantity));
    const prefix = dto.prefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    const generatedCodes: string[] = [];
    const rows: any[] = [];

    for (let i = 0; i < count; i++) {
      const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
      const code = `${prefix}-${randomSuffix}`;
      generatedCodes.push(code);

      rows.push({
        code,
        name: dto.title,
        title: dto.title,
        internalNote: dto.internalNote || `Bulk generated by admin ${adminUserId}`,
        type: dto.type,
        value: dto.value,
        maxDiscountCap: dto.maxDiscountCap,
        maxDiscountValue: dto.maxDiscountCap,
        minOrderValue: dto.minOrderValue,
        maxUses: 1, // Single-use by design
        maxUsesPerUser: 1,
        status: CouponStatus.ACTIVE,
        visibility: CouponVisibility.PRIVATE, // Private code entry only
        validFrom: dto.validFrom ? new Date(dto.validFrom) : null,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
      });
    }

    await this.prisma.discountCode.createMany({
      data: rows,
      skipDuplicates: true,
    });

    await (this.prisma as any).auditLog.create({
      data: {
        actorUserId: adminUserId,
        action: 'BULK_GENERATE_COUPONS',
        entityType: 'DISCOUNT_CODE',
        entityId: prefix,
        metadata: { prefix, requested: count, generated: generatedCodes.length },
      },
    });

    return {
      message: `Successfully generated ${generatedCodes.length} single-use coupons.`,
      prefix,
      codes: generatedCodes,
    };
  }

  async getCouponRedemptions(couponId: string, page = 1, limit = 20) {
    const p = Math.max(1, Number(page));
    const lim = Math.min(100, Math.max(1, Number(limit)));
    const skip = (p - 1) * lim;

    const [total, redemptions] = await Promise.all([
      this.prisma.discountRedemption.count({ where: { discountCodeId: couponId } }),
      this.prisma.discountRedemption.findMany({
        where: { discountCodeId: couponId },
        skip,
        take: lim,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            select: { id: true, orderNumber: true, finalAmount: true, status: true, createdAt: true },
          },
          user: {
            select: { id: true, name: true, email: true, phone: true },
          },
        },
      }),
    ]);

    // Mask sensitive personal data for support/admin views
    const masked = redemptions.map((r) => {
      const email = r.user?.email || '';
      const maskedEmail = email
        ? email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => `${a}***${c}`)
        : 'N/A';
      const phone = r.user?.phone || '';
      const maskedPhone = phone ? phone.replace(/(\d{2})\d+(\d{2})/, '$1******$2') : 'N/A';

      return {
        id: r.id,
        orderNumber: r.order?.orderNumber || r.orderId.slice(-8),
        customerName: r.user?.name || 'Customer',
        customerEmail: maskedEmail,
        customerPhone: maskedPhone,
        discountAmount: Number(r.discountAmount),
        orderSubtotal: Number(r.orderSubtotal),
        status: r.status,
        restoredAt: r.restoredAt,
        restorationReason: r.restorationReason,
        createdAt: r.createdAt,
      };
    });

    return {
      data: masked,
      meta: { total, page: p, limit: lim, totalPages: Math.ceil(total / lim) },
    };
  }

  async exportCouponsCsv(): Promise<string> {
    const coupons = await this.prisma.discountCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { redemptions: { where: { status: 'REDEEMED' } } } },
      },
    });

    const headers = [
      'Code',
      'Title',
      'Type',
      'Value',
      'Max Discount Cap',
      'Min Order Value',
      'Uses',
      'Max Uses',
      'Status',
      'Visibility',
      'Valid From',
      'Valid Until',
      'Created At',
    ];

    const rows = coupons.map((c) => [
      `"${c.code}"`,
      `"${(c.title || c.name || '').replace(/"/g, '""')}"`,
      c.type,
      Number(c.value),
      c.maxDiscountCap ? Number(c.maxDiscountCap) : '',
      c.minOrderValue ? Number(c.minOrderValue) : '',
      c._count.redemptions,
      c.maxUses ?? 'Unlimited',
      this.deriveCouponStatus(c),
      c.visibility,
      c.validFrom ? new Date(c.validFrom).toISOString() : '',
      c.validUntil ? new Date(c.validUntil).toISOString() : '',
      new Date(c.createdAt).toISOString(),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  // ---------------------------------------------------------------------------
  // Backward Compatible Validate Endpoint (Legacy support for existing cart UI)
  // ---------------------------------------------------------------------------
  async validateDiscount(code?: string, cartTotal?: number): Promise<DiscountValidationResponse> {
    const normalizedCode = code?.trim();
    if (!normalizedCode) return this.invalidResult('Discount code is required');

    const total = Number(cartTotal ?? 0);
    if (!Number.isFinite(total) || total < 0) {
      return this.invalidResult('Cart total must be a valid positive number');
    }

    // Check referral code
    let referrer = await this.prisma.user.findFirst({
      where: { referralCode: { equals: normalizedCode, mode: 'insensitive' }, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!referrer) {
      const legacyCode = await this.prisma.referral.findFirst({
        where: { code: { equals: normalizedCode, mode: 'insensitive' }, status: 'ACTIVE' },
        select: { userId: true },
      });
      if (legacyCode) {
        referrer = await this.prisma.user.findFirst({
          where: { id: legacyCode.userId, status: 'ACTIVE' },
          select: { id: true },
        });
      }
    }
    if (referrer) {
      const discountValue = 500;
      return {
        valid: true,
        discountType: 'fixed',
        discountValue,
        discountAmount: Math.min(discountValue, total),
        message: 'Referral code applied: ₹500 off',
        isReferral: true,
      };
    }

    const discountCode: any = await this.prisma.discountCode.findFirst({
      where: { code: { equals: normalizedCode, mode: 'insensitive' } },
    });

    if (!discountCode) {
      return this.invalidResult('Invalid or inactive discount code');
    }

    const derivedStatus = this.deriveCouponStatus(discountCode);
    if (derivedStatus !== CouponStatus.ACTIVE) {
      if (derivedStatus === CouponStatus.EXPIRED) return this.invalidResult('Discount code has expired');
      if (derivedStatus === CouponStatus.SCHEDULED) return this.invalidResult('Discount code not yet valid');
      if (derivedStatus === CouponStatus.EXHAUSTED) return this.invalidResult('Discount code has reached maximum usage');
      return this.invalidResult('Discount code is not active');
    }

    if (discountCode.minOrderValue && total < Number(discountCode.minOrderValue)) {
      return this.invalidResult(
        `Minimum order value for ${discountCode.code} is ₹${Number(discountCode.minOrderValue).toLocaleString('en-IN')}`,
      );
    }

    const val = Number(discountCode.value);
    let discountAmount = 0;

    if (discountCode.type === 'percentage') {
      const uncapped = Number((total * (val / 100)).toFixed(2));
      const cap = discountCode.maxDiscountCap || discountCode.maxDiscountValue;
      discountAmount = cap ? Math.min(uncapped, Number(cap)) : uncapped;
      return {
        valid: true,
        discountType: 'percentage',
        discountValue: val,
        discountAmount,
        message: `Code applied: ${val}% off`,
      };
    }

    if (discountCode.type === 'fixed') {
      discountAmount = Math.min(val, total);
      return {
        valid: true,
        discountType: 'fixed',
        discountValue: val,
        discountAmount: Number(discountAmount.toFixed(2)),
        message: `Code applied: ₹${discountAmount.toLocaleString('en-IN')} off`,
      };
    }

    if (discountCode.type === 'free_shipping') {
      return {
        valid: true,
        discountType: 'free_shipping',
        discountValue: 0,
        discountAmount: 0,
        message: 'Free shipping applied',
      };
    }

    return this.invalidResult('Invalid discount code type');
  }

  // ---------------------------------------------------------------------------
  // Referral & Affiliate Program Methods (Preserved)
  // ---------------------------------------------------------------------------
  async getReferralStats(userId: string) {
    try {
      const [user, referredUsersCount, withdrawals] = await Promise.all([
        this.prisma.user.findUnique({ where: { id: userId } }),
        (this.prisma as any).referralRedemption.count({ where: { referrerUserId: userId } }),
        this.prisma.withdrawalRequest.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            amount: true,
            status: true,
            adminNotes: true,
            processedAt: true,
            createdAt: true,
          },
        }),
      ]);
      if (!user) throw new NotFoundException('User not found');

      const earnings = Number(user.referralEarnings || 0);
      const reserved = Number(user.referralReserved || 0);
      const withdrawn = Number(user.referralWithdrawn || 0);
      const availableBalance = Math.max(0, earnings - reserved - withdrawn);

      return {
        referralCode: user.referralCode,
        referralTier: user.referralTier,
        referredUsersCount,
        totalEarnings: earnings,
        availableBalance,
        totalWithdrawn: withdrawn,
        withdrawals,
      };
    } catch (error: any) {
      this.logger.error(`Failed to get referral stats for user ${userId}: ${error?.message || error}`);
      throw error;
    }
  }

  async getPayoutDetails(userId: string) {
    const details = await this.prisma.affiliatePaymentDetails.findUnique({
      where: { userId },
      select: {
        id: true,
        bankName: true,
        accountHolderName: true,
        accountNumberMasked: true,
        ifscCode: true,
        upiIdMasked: true,
        qrCodeKey: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!details) {
      return {
        configured: false,
        bankName: null,
        accountHolderName: null,
        accountNumberMasked: null,
        ifscCodeMasked: null,
        upiIdMasked: null,
        hasQrCode: false,
        updatedAt: null,
      };
    }

    let ifscCodeMasked: string | null = null;
    if (details.ifscCode) {
      try {
        const decryptedIfsc = this.encryptionService.decrypt(details.ifscCode);
        ifscCodeMasked = this.encryptionService.maskIfsc(decryptedIfsc);
      } catch {
        ifscCodeMasked = '••••••••';
      }
    }

    return {
      configured: true,
      bankName: details.bankName,
      accountHolderName: details.accountHolderName,
      accountNumberMasked: details.accountNumberMasked,
      ifscCodeMasked,
      upiIdMasked: details.upiIdMasked,
      hasQrCode: Boolean(details.qrCodeKey),
      updatedAt: details.updatedAt,
    };
  }

  async savePayoutDetails(userId: string, dto: SavePayoutDetailsDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== 'CUSTOMER') {
      throw new ForbiddenException('Only customer accounts may configure affiliate payout details');
    }

    const existing = await this.prisma.affiliatePaymentDetails.findUnique({ where: { userId } });

    // Validate bank details completeness
    const hasAnyBankField = Boolean(dto.bankName || dto.accountHolderName || dto.accountNumber || dto.ifscCode);
    if (hasAnyBankField) {
      if (!dto.bankName?.trim()) {
        throw new BadRequestException('Bank name is required when saving bank account details');
      }
      if (!dto.accountHolderName?.trim()) {
        throw new BadRequestException('Account holder name is required when saving bank account details');
      }
      if (!dto.accountNumber) {
        throw new BadRequestException('Account number is required when saving bank account details');
      }
      if (!dto.ifscCode) {
        throw new BadRequestException('IFSC code is required when saving bank account details');
      }
    }

    // Must configure at least one method
    const hasBank = Boolean(dto.accountNumber && dto.ifscCode);
    const hasUpi = Boolean(dto.upiId);
    const hasExistingQr = Boolean(existing?.qrCodeKey);

    if (!hasBank && !hasUpi && !hasExistingQr) {
      throw new BadRequestException('Please provide either bank account details or a UPI ID');
    }

    const encryptedAccount = dto.accountNumber ? this.encryptionService.encrypt(dto.accountNumber) : undefined;
    const maskedAccount = dto.accountNumber ? this.encryptionService.maskAccountNumber(dto.accountNumber) : undefined;
    const encryptedIfsc = dto.ifscCode ? this.encryptionService.encrypt(dto.ifscCode.trim().toUpperCase()) : undefined;
    const encryptedUpi = dto.upiId ? this.encryptionService.encrypt(dto.upiId.trim().toLowerCase()) : undefined;
    const maskedUpi = dto.upiId ? this.encryptionService.maskUpiId(dto.upiId.trim().toLowerCase()) : undefined;

    const updated = await this.prisma.affiliatePaymentDetails.upsert({
      where: { userId },
      create: {
        userId,
        bankName: dto.bankName?.trim() || null,
        accountHolderName: dto.accountHolderName?.trim() || null,
        accountNumber: encryptedAccount || null,
        accountNumberMasked: maskedAccount || null,
        ifscCode: encryptedIfsc || null,
        upiId: encryptedUpi || null,
        upiIdMasked: maskedUpi || null,
      },
      update: {
        ...(dto.bankName !== undefined ? { bankName: dto.bankName?.trim() || null } : {}),
        ...(dto.accountHolderName !== undefined ? { accountHolderName: dto.accountHolderName?.trim() || null } : {}),
        ...(encryptedAccount ? { accountNumber: encryptedAccount, accountNumberMasked: maskedAccount } : {}),
        ...(encryptedIfsc ? { ifscCode: encryptedIfsc } : {}),
        ...(encryptedUpi ? { upiId: encryptedUpi, upiIdMasked: maskedUpi } : {}),
      },
    });

    try {
      this.logger.log(`[AFFILIATE AUDIT] User #${userId} (${user.email || 'no-email'}) updated affiliate payout details`);
      if (this.mailService && user.email) {
        await this.mailService.sendMail({
          to: user.email,
          subject: '[Security Alert] Your LaptopMitra Affiliate Payout Details Were Updated',
          text: `Hello ${user.name || 'Valued Partner'},\n\nYour affiliate payout details were updated on ${new Date().toUTCString()}.\nIf you did not make this change, please contact LaptopMitra security support immediately.`,
        });
      }
    } catch (err: any) {
      this.logger.warn(`Could not log/email payout update: ${err?.message || err}`);
    }

    let ifscCodeMasked: string | null = null;
    if (updated.ifscCode) {
      try {
        const decryptedIfsc = this.encryptionService.decrypt(updated.ifscCode);
        ifscCodeMasked = this.encryptionService.maskIfsc(decryptedIfsc);
      } catch {
        ifscCodeMasked = '••••••••';
      }
    }

    return {
      configured: true,
      bankName: updated.bankName,
      accountHolderName: updated.accountHolderName,
      accountNumberMasked: updated.accountNumberMasked,
      ifscCodeMasked,
      upiIdMasked: updated.upiIdMasked,
      hasQrCode: Boolean(updated.qrCodeKey),
      updatedAt: updated.updatedAt,
    };
  }

  async uploadQrCode(userId: string, fileBuffer: Buffer) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== 'CUSTOMER') {
      throw new ForbiddenException('Only customer accounts may upload an affiliate payout QR code');
    }

    const existing = await this.prisma.affiliatePaymentDetails.findUnique({ where: { userId } });
    const newKey = await this.qrStorageService.saveQrImage(userId, fileBuffer, existing?.qrCodeKey);

    await this.prisma.affiliatePaymentDetails.upsert({
      where: { userId },
      create: {
        userId,
        qrCodeKey: newKey,
      },
      update: {
        qrCodeKey: newKey,
      },
    });

    try {
      this.logger.log(`[AFFILIATE AUDIT] User #${userId} (${user.email || 'no-email'}) uploaded a new payout QR code`);
      if (this.mailService && user.email) {
        await this.mailService.sendMail({
          to: user.email,
          subject: '[Security Alert] Your LaptopMitra Affiliate Payout QR Code Was Updated',
          text: `Hello ${user.name || 'Valued Partner'},\n\nA new payout QR code was uploaded to your affiliate account on ${new Date().toUTCString()}.\nIf you did not make this change, please contact LaptopMitra security support immediately.`,
        });
      }
    } catch (err: any) {
      this.logger.warn(`Could not log/email QR upload: ${err?.message || err}`);
    }

    return {
      success: true,
      hasQrCode: true,
    };
  }

  async requestWithdrawal(userId: string, input: WithdrawRequestDto | number) {
    const amount = typeof input === 'number' ? input : Number(input?.amount);
    if (!amount || typeof amount !== 'number' || !Number.isInteger(amount) || amount < 500) {
      throw new BadRequestException('Minimum withdrawal amount is ₹500');
    }

    return await this.prisma.$transaction(async (tx: any) => {
      // Row lock on User to prevent concurrent withdrawal race conditions
      const users = await tx.$queryRaw<any[]>`
        SELECT id, role, status, "referralEarnings", "referralReserved", "referralWithdrawn"
        FROM "User"
        WHERE id = ${userId}
        FOR UPDATE
      `;

      if (!users || users.length === 0) {
        throw new NotFoundException('User not found');
      }
      const user = users[0];

      if (user.role !== 'CUSTOMER') {
        throw new ForbiddenException('Only customer accounts may request affiliate withdrawals');
      }
      if (user.status !== 'ACTIVE') {
        throw new ForbiddenException('Account is not active');
      }

      // Check single pending withdrawal rule
      const pendingCount = await tx.withdrawalRequest.count({
        where: { userId, status: 'PENDING' },
      });
      if (pendingCount >= 1) {
        throw new BadRequestException('You already have a pending withdrawal request');
      }

      const earnings = Number(user.referralEarnings || 0);
      const reserved = Number(user.referralReserved || 0);
      const withdrawn = Number(user.referralWithdrawn || 0);
      const available = earnings - reserved - withdrawn;

      if (amount > available) {
        throw new BadRequestException(`Requested amount (₹${amount}) exceeds available balance (₹${available})`);
      }

      // Ensure payout details exist
      const payoutDetails = await tx.affiliatePaymentDetails.findUnique({
        where: { userId },
      });
      if (!payoutDetails || (!payoutDetails.accountNumber && !payoutDetails.upiId && !payoutDetails.qrCodeKey)) {
        throw new BadRequestException('Please configure your payout details before requesting withdrawal');
      }

      // Build encrypted snapshot with decrypted plain data for administrative payout processing
      const snapshot = {
        bankName: payoutDetails.bankName || null,
        accountHolderName: payoutDetails.accountHolderName || null,
        accountNumber: payoutDetails.accountNumber ? this.encryptionService.decrypt(payoutDetails.accountNumber) : null,
        ifscCode: payoutDetails.ifscCode ? this.encryptionService.decrypt(payoutDetails.ifscCode) : null,
        upiId: payoutDetails.upiId ? this.encryptionService.decrypt(payoutDetails.upiId) : null,
        qrCodeKey: payoutDetails.qrCodeKey || null,
        snapshotAt: new Date().toISOString(),
      };

      const encryptedSnapshot = this.encryptionService.encrypt(JSON.stringify(snapshot));

      // Increment reserved counter
      await tx.user.update({
        where: { id: userId },
        data: {
          referralReserved: { increment: amount },
        },
      });

      // Create withdrawal request
      const created = await tx.withdrawalRequest.create({
        data: {
          userId,
          amount,
          status: 'PENDING',
          paymentMethodSnapshot: encryptedSnapshot,
        },
        select: {
          id: true,
          amount: true,
          status: true,
          createdAt: true,
        },
      });

      return {
        id: created.id,
        amount: Number(created.amount),
        status: created.status,
        createdAt: created.createdAt,
      };
    });
  }

  private invalidResult(message: string): DiscountValidationResponse {
    return {
      valid: false,
      discountType: null,
      discountValue: 0,
      discountAmount: 0,
      message,
      isReferral: false,
    };
  }
}
