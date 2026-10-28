import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentEncryptionService } from '../../common/encryption/payment-encryption.service';
import { QrStorageService } from '../../common/storage/qr-storage.service';
import { NotificationService } from '../notifications/notification.service';
import { MailService } from '../mail/mail.service';
import { SavePayoutDetailsDto } from './dto/save-payout-details.dto';
import {
  MINIMUM_WITHDRAWAL_AMOUNT,
  MAX_PENDING_WITHDRAWAL_REQUESTS,
} from './dto/withdraw-request.dto';

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
  private readonly logger = new Logger(DiscountService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: PaymentEncryptionService,
    private readonly qrStorageService: QrStorageService,
    @Optional() private readonly notificationService?: NotificationService,
    @Optional() private readonly mailService?: MailService,
  ) {}

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
        referralEarnings: earnings,
        referralReserved: reserved,
        referralWithdrawn: withdrawn,
        availableBalance,
        referredUsersCount,
        referralLinkClickedCount: user.referralLinkClickedCount,
        payoutHistory: withdrawals.map((w) => ({
          id: w.id,
          amount: Number(w.amount),
          date: w.createdAt.toISOString(),
          status: w.status,
          adminNotes: w.adminNotes || undefined,
          processedAt: w.processedAt ? w.processedAt.toISOString() : undefined,
        })),
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new ServiceUnavailableException('Referral statistics are temporarily unavailable');
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
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #0f172a; margin-top: 0;">Security Alert: Payout Details Updated</h2>
              <p style="color: #475569;">Hello <strong>${user.name || 'Partner'}</strong>,</p>
              <p style="color: #475569;">Your affiliate payout details (Bank / UPI) were updated on <strong>${new Date().toLocaleString('en-IN')}</strong>.</p>
              <p style="color: #dc2626; font-size: 13px;">If you did not authorize this change, please contact LaptopMitra support immediately.</p>
            </div>
          `,
        });
      }
    } catch (err: any) {
      this.logger.warn(`Could not log/email payout details update: ${err?.message || err}`);
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

  async requestWithdrawal(userId: string, amount: number) {
    if (!amount || typeof amount !== 'number' || !Number.isInteger(amount) || amount < MINIMUM_WITHDRAWAL_AMOUNT) {
      throw new BadRequestException(`Minimum withdrawal amount is ₹${MINIMUM_WITHDRAWAL_AMOUNT}`);
    }

    return await this.prisma.$transaction(async (tx) => {
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
      if (pendingCount >= MAX_PENDING_WITHDRAWAL_REQUESTS) {
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
    };
  }
}


