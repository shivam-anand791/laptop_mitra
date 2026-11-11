import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  ServiceUnavailableException,
  BadGatewayException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { TaxService } from '../tax/tax.service';
import * as crypto from 'crypto';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Razorpay = require('razorpay');

const RAZORPAY_KEY_ID_PATTERN = /^rzp_(test|live)_[A-Za-z0-9]+$/;

/**
 * Normalizes Razorpay env strings pasted with accidental whitespace, newlines,
 * wrapping quotes, or an accidental Bearer prefix.
 */
export function normalizeRazorpayEnvValue(value?: string | null): string {
  if (typeof value !== 'string') return '';
  let normalized = value.replace(/[\r\n]+/g, '').trim();
  if (/^bearer\s+/i.test(normalized)) {
    normalized = normalized.replace(/^bearer\s+/i, '').trim();
  }
  while (
    normalized.length >= 2
    && (
      (normalized.startsWith('"') && normalized.endsWith('"'))
      || (normalized.startsWith("'") && normalized.endsWith("'"))
      || (normalized.startsWith('`') && normalized.endsWith('`'))
    )
  ) {
    normalized = normalized.slice(1, -1).trim();
  }
  return normalized.replace(/^["'`]+|["'`]+$/g, '').trim();
}

/**
 * Masks a Razorpay Key ID for safe logging (prefix + last 4 chars only).
 */
export function maskRazorpayKeyId(keyId?: string | null): string {
  const normalized = normalizeRazorpayEnvValue(keyId);
  if (!normalized) return '<unset>';
  const prefixMatch = normalized.match(/^(rzp_(?:test|live)_)/);
  const prefix = prefixMatch ? prefixMatch[1] : '';
  const suffix = normalized.slice(-4);
  return prefix ? `${prefix}***${suffix}` : `***${suffix}`;
}

export function extractRazorpayErrorDetails(error: any): {
  statusCode: number | null;
  code: string | null;
  description: string;
} {
  const rawStatus = Number(error?.statusCode ?? error?.status);
  const statusCode = Number.isFinite(rawStatus) && rawStatus > 0 ? rawStatus : null;
  const code = error?.error?.code ? String(error.error.code) : error?.code ? String(error.code) : null;
  const description = String(
    error?.error?.description || error?.description || error?.message || 'Unknown gateway error',
  );
  return { statusCode, code, description };
}

export interface RefundPaymentOptions {
  amountPaise?: number;
  orderItemId?: string;
  adminUserId?: string;
  reason?: string;
  supersededAttempt?: boolean;
}

@Injectable()
export class PaymentService implements OnModuleInit {
  private readonly logger = new Logger(PaymentService.name);
  private readonly razorpay: any;
  private readonly keyId: string;
  private readonly keyMode: 'test' | 'live';

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly taxService: TaxService,
  ) {
    const keyId = normalizeRazorpayEnvValue(this.configService.get<string>('RAZORPAY_KEY_ID'));
    const keySecret = normalizeRazorpayEnvValue(this.configService.get<string>('RAZORPAY_KEY_SECRET'));
    const webhookSecret = normalizeRazorpayEnvValue(this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET'));
    const nodeEnv = normalizeRazorpayEnvValue(this.configService.get<string>('NODE_ENV'));
    const allowLiveKeys =
      normalizeRazorpayEnvValue(this.configService.get<string>('ALLOW_LIVE_PAYMENT_KEYS')).toLowerCase() === 'true';

    const missingVars = [
      !keyId ? 'RAZORPAY_KEY_ID' : null,
      !keySecret ? 'RAZORPAY_KEY_SECRET' : null,
      !webhookSecret ? 'RAZORPAY_WEBHOOK_SECRET' : null,
    ].filter(Boolean);

    if (missingVars.length > 0) {
      throw new UnauthorizedException(
        `Razorpay boot check failed: missing required env var(s): ${missingVars.join(', ')}`,
      );
    }

    if (!RAZORPAY_KEY_ID_PATTERN.test(keyId)) {
      throw new UnauthorizedException(
        `Razorpay boot check failed: RAZORPAY_KEY_ID (${maskRazorpayKeyId(keyId)}) must match /^rzp_(test|live)_/`,
      );
    }

    if (nodeEnv === 'production') {
      if (allowLiveKeys) {
        if (!keyId.startsWith('rzp_live_')) {
          throw new UnauthorizedException(
            `Razorpay boot check failed: Live Razorpay key (rzp_live_*) is required when ALLOW_LIVE_PAYMENT_KEYS=true (got ${maskRazorpayKeyId(keyId)})`,
          );
        }
      } else if (!keyId.startsWith('rzp_test_')) {
        throw new UnauthorizedException(
          `Razorpay boot check failed: Live Razorpay keys (${maskRazorpayKeyId(keyId)}) require NODE_ENV=production AND ALLOW_LIVE_PAYMENT_KEYS=true`,
        );
      }
    } else {
      if (keyId.startsWith('rzp_live_')) {
        throw new UnauthorizedException(
          `Razorpay boot check failed: Live Razorpay keys (${maskRazorpayKeyId(keyId)}) are not allowed outside production`,
        );
      }
      if (!keyId.startsWith('rzp_test_')) {
        throw new UnauthorizedException(
          `Razorpay boot check failed: Test Razorpay key (rzp_test_*) is required in non-production environments`,
        );
      }
    }

    this.razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
    this.keyId = keyId;
    this.keyMode = keyId.startsWith('rzp_live_') ? 'live' : 'test';
  }

  async onModuleInit(): Promise<void> {
    const nodeEnv = normalizeRazorpayEnvValue(this.configService.get<string>('NODE_ENV'));
    const startupCheckFlag = normalizeRazorpayEnvValue(
      this.configService.get<string>('RAZORPAY_STARTUP_CHECK'),
    ).toLowerCase();

    if (startupCheckFlag === 'false' || (nodeEnv === 'test' && startupCheckFlag !== 'true')) {
      return;
    }

    await this.verifyRazorpayStartupAuth();
  }

  async verifyRazorpayStartupAuth(): Promise<void> {
    if (typeof this.razorpay?.orders?.all !== 'function') {
      return;
    }

    const failOn401 =
      normalizeRazorpayEnvValue(this.configService.get<string>('RAZORPAY_STARTUP_FAIL_ON_401')).toLowerCase()
      === 'true';

    try {
      await this.razorpay.orders.all({ count: 1 });
      this.logger.log(
        `Razorpay startup self-check passed: keyMode=${this.keyMode}, keyId=${maskRazorpayKeyId(this.keyId)}`,
      );
    } catch (error: any) {
      const details = extractRazorpayErrorDetails(error);
      if (details.statusCode === 401) {
        this.logger.error(
          `Razorpay startup self-check FAILED [check=credentials_rejected]: keyMode=${this.keyMode}, keyId=${maskRazorpayKeyId(this.keyId)}, statusCode=401, code=${details.code || 'UNKNOWN'}, description=${details.description}. Verify RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET belong to the same Razorpay ${this.keyMode} key pair.`,
        );
        if (failOn401) {
          throw new UnauthorizedException(
            `Razorpay startup credentials check failed (credentials rejected for ${this.keyMode} key ${maskRazorpayKeyId(this.keyId)})`,
          );
        }
        return;
      }

      this.logger.warn(
        `Razorpay startup self-check encountered a non-401/transient error (service kept running): keyMode=${this.keyMode}, keyId=${maskRazorpayKeyId(this.keyId)}, statusCode=${details.statusCode ?? 'network'}, code=${details.code || 'TRANSIENT'}, description=${details.description}`,
      );
    }
  }

  getTaxPolicy() {
    return this.taxService.getPublicPolicy();
  }

  async createRentalSubscriptionForUser(orderId: string, userId: string, userRole: string) {
    if (userRole === 'GUEST') {
      throw new ForbiddenException('Please sign in with a customer account before making a payment.');
    }
    const order: any = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, rentalSubscription: true },
    });
    if (!order) throw new NotFoundException('Rental order not found');
    if (order.userId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('You can only authorize your own rental');
    }
    if (
      order.status !== 'PENDING'
      || !['PENDING', 'FAILED'].includes(order.paymentStatus)
      || order.paymentMethod !== 'razorpay_subscription'
      || order.inventoryStatus !== 'RESERVED'
      || !order.reservationExpiresAt
      || new Date(order.reservationExpiresAt).getTime() <= Date.now()
    ) {
      throw new BadRequestException('Rental is not eligible for mandate authorization');
    }
    if (!order.items?.length || order.items.some((item: any) => item.purchaseMode !== 'lease')) {
      throw new BadRequestException('Razorpay subscriptions are only available for rental orders');
    }

    const rental = order.rentalSubscription;
    if (!rental) throw new NotFoundException('Rental subscription record not found');
    if (rental.razorpaySubscriptionId) {
      return {
        subscriptionId: rental.razorpaySubscriptionId,
        amount: Math.round(Number(rental.monthlyAmount) * 100),
        currency: 'INR',
        keyId: this.keyId,
      };
    }

    const claimed = await this.prisma.rentalSubscription.updateMany({
      where: {
        id: rental.id,
        status: 'PENDING_AUTHORIZATION',
        razorpaySubscriptionId: null,
      },
      data: { status: 'CREATING' },
    });
    if (claimed.count !== 1) {
      throw new ConflictException('Rental authorization is already being initialized. Refresh the order before retrying.');
    }

    const amount = Math.round(Number(rental.monthlyAmount) * 100);
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw new BadRequestException('Rental monthly amount is invalid');
    }

    try {
      let planId = rental.razorpayPlanId;
      if (!planId) {
        const plan: any = await this.razorpay.plans.create({
          period: 'monthly',
          interval: 1,
          item: {
            name: `LaptopMitra rental ${order.orderNumber}`,
            amount,
            currency: 'INR',
            description: `Monthly rental for ${rental.tenureMonths} months`,
          },
        });
        planId = plan.id;
        await this.prisma.rentalSubscription.update({
          where: { id: rental.id },
          data: { razorpayPlanId: planId },
        });
      }

      const subscription: any = await this.razorpay.subscriptions.create({
        plan_id: planId,
        total_count: rental.tenureMonths,
        quantity: 1,
        customer_notify: 1,
        expire_by: Math.floor(new Date(order.reservationExpiresAt).getTime() / 1000),
        notes: {
          orderId: order.id,
          rentalSubscriptionId: rental.id,
        },
      });
      await this.prisma.rentalSubscription.update({
        where: { id: rental.id },
        data: {
          razorpaySubscriptionId: subscription.id,
          status: 'PENDING_AUTHORIZATION',
          mandateStatus: subscription.status || 'PENDING',
          nextChargeAt: subscription.charge_at ? new Date(Number(subscription.charge_at) * 1000) : null,
        },
      });

      return {
        subscriptionId: subscription.id,
        amount,
        currency: 'INR',
        keyId: this.keyId,
      };
    } catch (error: any) {
      await this.prisma.rentalSubscription.updateMany({
        where: { id: rental.id, status: 'CREATING', razorpaySubscriptionId: null },
        data: { status: 'PENDING_AUTHORIZATION' },
      });
      return this.handleRazorpayGatewayError(order.id, 'rental_subscription', error);
    }
  }

  async verifyRentalSubscription(
    orderId: string,
    subscriptionId: string,
    paymentId: string,
    signature: string,
    userId: string,
    userRole: string,
  ) {
    const rental: any = await this.prisma.rentalSubscription.findUnique({
      where: { orderId },
      include: { order: true },
    });
    if (!rental) throw new NotFoundException('Rental subscription not found');
    if (rental.userId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('You can only verify your own rental');
    }
    if (rental.firstPaymentId === paymentId && rental.status === 'ACTIVE') {
      return { success: true, message: 'Rental mandate and first payment already verified' };
    }
    if (rental.razorpaySubscriptionId !== subscriptionId || !subscriptionId || !paymentId || !signature) {
      throw new BadRequestException('Rental payment does not match the stored subscription');
    }

    const secret = normalizeRazorpayEnvValue(this.configService.get<string>('RAZORPAY_KEY_SECRET'));
    if (!secret) throw new UnauthorizedException('Razorpay secret not configured');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${paymentId}|${subscriptionId}`)
      .digest('hex');
    const provided = Buffer.from(signature, 'utf8');
    const expected = Buffer.from(expectedSignature, 'utf8');
    if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
      throw new BadRequestException('Invalid rental payment signature');
    }

    let subscription: any;
    let payment: any;
    try {
      [subscription, payment] = await Promise.all([
        this.razorpay.subscriptions.fetch(subscriptionId),
        this.razorpay.payments.fetch(paymentId),
      ]);
    } catch {
      throw new ServiceUnavailableException('Rental mandate status could not be confirmed');
    }
    if (
      subscription?.id !== rental.razorpaySubscriptionId
      || !['authenticated', 'active'].includes(String(subscription?.status || '').toLowerCase())
      || payment?.id !== paymentId
      || payment?.subscription_id !== subscriptionId
      || Number(payment?.amount) !== Math.round(Number(rental.monthlyAmount) * 100)
      || String(payment?.currency || '').toUpperCase() !== 'INR'
      || payment?.status !== 'captured'
    ) {
      throw new BadRequestException('Razorpay has not confirmed the rental mandate and first payment');
    }

    await this.completeRentalPayment(rental, subscription, payment);
    return { success: true, message: 'Rental mandate and first payment verified' };
  }

  private async completeRentalPayment(
    rental: any,
    subscription: any,
    payment: any,
  ) {
    const paymentId = String(payment?.id || '');
    const subscriptionId = String(subscription?.id || '');
    const amountPaise = Number(payment?.amount);
    if (
      !paymentId
      || subscriptionId !== rental.razorpaySubscriptionId
      || payment?.subscription_id !== subscriptionId
      || !Number.isSafeInteger(amountPaise)
      || String(payment?.currency || '').toUpperCase() !== 'INR'
    ) {
      throw new BadRequestException('Razorpay rental payment details are invalid');
    }

    const result = await this.prisma.$transaction(async (transaction: any) => {
      const current: any = await transaction.rentalSubscription.findUnique({
        where: { id: rental.id },
        include: { order: true, payments: { where: { status: 'COMPLETED' } } },
      });
      if (!current) throw new NotFoundException('Rental subscription not found');
      const existing = await transaction.rentalPayment.findUnique({
        where: { razorpayPaymentId: paymentId },
      });
      if (existing?.rentalSubscriptionId !== undefined && existing.rentalSubscriptionId !== rental.id) {
        throw new ConflictException('Razorpay payment is already linked to another rental');
      }
      if (existing?.status === 'COMPLETED') return { activated: false, duplicate: true };

      const expectedPaise = Math.round(Number(current.monthlyAmount) * 100);
      const order = current.order;
      const firstCharge = !current.firstPaymentId;
      const canActivate = firstCharge
        && order.status === 'PENDING'
        && ['PENDING', 'FAILED'].includes(order.paymentStatus)
        && order.paymentMethod === 'razorpay_subscription'
        && order.inventoryStatus === 'RESERVED'
        && !!order.reservationExpiresAt
        && new Date(order.reservationExpiresAt).getTime() > Date.now();
      const canRecordRecurring = !firstCharge
        && ['ACTIVE', 'PAYMENT_FAILED', 'TERMINATION_REQUESTED'].includes(current.status);
      const amountMatches = amountPaise === expectedPaise;
      const recordStatus = amountMatches && (canActivate || canRecordRecurring) ? 'COMPLETED' : 'REVIEW_REQUIRED';
      const cycleNumber = current.payments.length + 1;
      const taxAmount = Number(current.taxAmount);
      const pricingSnapshot = {
        ...(current.pricingSnapshot || {}),
        cycleNumber,
        transactionType: 'rental',
        amountPaise,
        taxAmountPaise: Math.round(taxAmount * 100),
      };
      if (existing) {
        await transaction.rentalPayment.update({
          where: { id: existing.id },
          data: { status: recordStatus, amount: (amountPaise / 100).toFixed(2), cycleNumber, pricingSnapshot },
        });
      } else {
        await transaction.rentalPayment.create({
          data: {
            rentalSubscriptionId: rental.id,
            razorpayPaymentId: paymentId,
            amount: (amountPaise / 100).toFixed(2),
            currency: 'INR',
            status: recordStatus,
            taxRate: current.taxRate,
            taxAmount: current.taxAmount,
            taxInclusive: current.taxInclusive,
            pricingSnapshot,
            cycleNumber,
          },
        });
      }

      if (recordStatus !== 'COMPLETED') {
        await transaction.rentalSubscription.update({
          where: { id: rental.id },
          data: { status: 'REVIEW_REQUIRED' },
        });
        return { activated: false, duplicate: false };
      }

      const nextChargeAt = subscription.charge_at
        ? new Date(Number(subscription.charge_at) * 1000)
        : subscription.current_end
          ? new Date(Number(subscription.current_end) * 1000)
          : null;
      await transaction.rentalSubscription.update({
        where: { id: rental.id },
        data: {
          status: current.status === 'TERMINATION_REQUESTED' ? 'TERMINATION_REQUESTED' : 'ACTIVE',
          mandateStatus: 'AUTHORIZED',
          ...(firstCharge ? { firstPaymentId: paymentId } : {}),
          nextChargeAt,
        },
      });

      if (firstCharge) {
        const orderUpdate = await transaction.order.updateMany({
          where: {
            id: order.id,
            status: 'PENDING',
            paymentStatus: { in: ['PENDING', 'FAILED'] },
            inventoryStatus: 'RESERVED',
            reservationExpiresAt: { gt: new Date() },
          },
          data: {
            status: 'CONFIRMED',
            paymentStatus: 'COMPLETED',
            paymentId,
            inventoryStatus: 'CONSUMED',
            reservationExpiresAt: null,
          },
        });
        if (orderUpdate.count !== 1) {
          throw new ConflictException('Rental order changed while applying the first payment');
        }
        await transaction.cartItem.deleteMany({ where: { cart: { userId: current.userId } } });
      }

      return { activated: firstCharge, duplicate: false };
    }, { isolationLevel: 'Serializable' });

    if (result.activated) {
      await this.notificationService.dispatchPaymentUpdate(rental.userId, rental.orderId, 'RENTAL_ACTIVATED', {
        orderNumber: rental.order?.orderNumber,
        monthlyAmount: Number(rental.monthlyAmount),
        tenureMonths: rental.tenureMonths,
      });
    }
    return result;
  }

  private async failRentalPayment(rental: any, payment: any) {
    if (!payment?.id) return;
    await this.prisma.$transaction(async (transaction: any) => {
      const existing = await transaction.rentalPayment.findUnique({
        where: { razorpayPaymentId: payment.id },
      });
      if (existing) {
        if (existing.rentalSubscriptionId !== rental.id || existing.status === 'COMPLETED') return;
        await transaction.rentalPayment.update({
          where: { id: existing.id },
          data: { status: 'FAILED' },
        });
      } else {
        await transaction.rentalPayment.create({
          data: {
            rentalSubscriptionId: rental.id,
            razorpayPaymentId: payment.id,
            amount: (Number(payment.amount || 0) / 100).toFixed(2),
            currency: payment.currency || 'INR',
            status: 'FAILED',
            taxRate: rental.taxRate,
            taxAmount: rental.taxAmount,
            taxInclusive: rental.taxInclusive,
            pricingSnapshot: {
              ...(rental.pricingSnapshot || {}),
              transactionType: 'rental',
              failedPayment: true,
            },
          },
        });
      }
      if (!['CANCELLED', 'COMPLETED', 'REVIEW_REQUIRED'].includes(rental.status)) {
        await transaction.rentalSubscription.update({
          where: { id: rental.id },
          data: { status: 'PAYMENT_FAILED', mandateStatus: 'HALTED' },
        });
      }
      if (!rental.firstPaymentId) {
        await transaction.order.updateMany({
          where: { id: rental.orderId, paymentStatus: 'PENDING', status: 'PENDING' },
          data: { paymentStatus: 'FAILED' },
        });
      }
    });
    await this.notificationService.dispatchPaymentUpdate(rental.userId, rental.orderId, 'FAILED', {
      orderNumber: rental.order?.orderNumber,
      amountPaise: Number(payment.amount || 0),
    });
  }

  async requestRentalTermination(subscriptionId: string, userId: string, userRole: string) {
    const rental: any = await this.prisma.rentalSubscription.findUnique({ where: { id: subscriptionId } });
    if (!rental) throw new NotFoundException('Rental subscription not found');
    if (rental.userId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('You can only request termination of your own rental');
    }
    if (rental.status === 'TERMINATION_REQUESTED') {
      return { message: 'Termination request is already awaiting admin review', status: rental.status };
    }
    if (rental.status !== 'ACTIVE') {
      throw new BadRequestException('Only active rentals can be submitted for termination review');
    }
    const result = await this.prisma.rentalSubscription.updateMany({
      where: { id: subscriptionId, userId: rental.userId, status: 'ACTIVE' },
      data: { status: 'TERMINATION_REQUESTED', terminationRequestedAt: new Date() },
    });
    if (result.count !== 1) throw new ConflictException('Rental status changed; refresh and try again');
    return { message: 'Termination request submitted for admin review', status: 'TERMINATION_REQUESTED' };
  }

  async getRentalTerminationRequests() {
    return this.prisma.rentalSubscription.findMany({
      where: { status: 'TERMINATION_REQUESTED' },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        order: { select: { id: true, orderNumber: true } },
      },
      orderBy: { terminationRequestedAt: 'asc' },
    });
  }

  async approveRentalTermination(subscriptionId: string) {
    const rental: any = await this.prisma.rentalSubscription.findUnique({ where: { id: subscriptionId } });
    if (!rental) throw new NotFoundException('Rental subscription not found');
    if (rental.status === 'CANCELLED') return { status: 'CANCELLED' };
    if (rental.status !== 'TERMINATION_REQUESTED' || !rental.razorpaySubscriptionId) {
      throw new BadRequestException('Rental has no termination request awaiting review');
    }

    let providerResult: any;
    try {
      providerResult = await this.razorpay.subscriptions.cancel(rental.razorpaySubscriptionId, {
        cancel_at_cycle_end: 0,
      });
    } catch {
      throw new ServiceUnavailableException('Razorpay could not confirm rental cancellation');
    }
    if (providerResult?.id !== rental.razorpaySubscriptionId) {
      throw new ServiceUnavailableException('Razorpay returned an unexpected subscription during cancellation');
    }
    await this.prisma.rentalSubscription.updateMany({
      where: { id: subscriptionId, status: 'TERMINATION_REQUESTED' },
      data: {
        status: 'CANCELLED',
        mandateStatus: 'CANCELLED',
        cancelledAt: new Date(),
        nextChargeAt: null,
      },
    });
    return { status: 'CANCELLED' };
  }

  async createOrderForUser(orderId: string, userId: string, userRole: string): Promise<any> {
    if (userRole === 'GUEST') {
      throw new ForbiddenException('Please sign in with a customer account before making a payment.');
    }
    if (!orderId) {
      throw new BadRequestException('orderId is required');
    }

    const order: any = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true, items: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Strict ownership verification (IDOR prevention)
    if (order.userId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('Forbidden: You can only pay for your own orders');
    }

    // Verify payable state
    if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
      throw new BadRequestException('Cannot create payment for a cancelled or refunded order');
    }

    if (order.paymentStatus === 'COMPLETED') {
      throw new BadRequestException('Order has already been paid');
    }
    if (order.paymentStatus === 'FAILED') {
      // A failed attempt may be retried while the same inventory reservation remains active.
    } else if (order.paymentStatus !== 'PENDING') {
      throw new BadRequestException('Order payment is not eligible for retry');
    }
    if (order.paymentMethod !== 'razorpay') {
      throw new BadRequestException('This order does not use Razorpay');
    }
    if (order.items?.some((item: any) => item.purchaseMode === 'lease')) {
      throw new BadRequestException('Rental orders require a Razorpay subscription');
    }
    if (
      order.inventoryStatus !== 'RESERVED'
      || !order.reservationExpiresAt
      || new Date(order.reservationExpiresAt).getTime() <= Date.now()
    ) {
      throw new BadRequestException('Order inventory reservation has expired');
    }

    // Calculate exact paise from server finalAmount (no float inaccuracies)
    const amountNum = typeof order.finalAmount === 'number'
      ? order.finalAmount
      : parseFloat(order.finalAmount?.toString() || '0');
    const amountInPaise = Math.round(amountNum * 100);

    if (amountInPaise < 100) {
      throw new BadRequestException('Minimum Razorpay payment amount is ₹1.00 (100 paise)');
    }

    // Idempotency: reuse existing valid Razorpay order if already created
    if (order.razorpayOrderId) {
      const existingPayment = await this.prisma.payment.findFirst({
        where: {
          orderId: order.id,
          razorpayOrderId: order.razorpayOrderId,
          status: 'PENDING',
          amount: amountInPaise,
          currency: 'INR',
        },
      });

      if (existingPayment) {
        return {
          id: order.razorpayOrderId,
          amount: amountInPaise,
          currency: 'INR',
          receipt: order.id,
          keyId: this.keyId,
        };
      }
    }

    let rzpOrder: any;
    try {
      rzpOrder = await this.razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: order.id,
        payment_capture: 1, // Auto-capture
      });
    } catch (error: any) {
      return this.handleRazorpayGatewayError(order.id, 'order', error);
    }

    // Persist razorpayOrderId on order and create payment record atomically
    await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: order.id },
        data: { razorpayOrderId: rzpOrder.id, paymentStatus: 'PENDING', paymentId: null },
      }),
      this.prisma.payment.create({
        data: {
          order: { connect: { id: order.id } },
          razorpayOrderId: rzpOrder.id,
          amount: amountInPaise,
          currency: 'INR',
          status: 'PENDING',
          receiptId: order.id,
        },
      }),
    ]);

    return {
      id: rzpOrder.id,
      amount: rzpOrder.amount || amountInPaise,
      currency: rzpOrder.currency || 'INR',
      receipt: order.id,
      keyId: this.keyId,
    };
  }

  async refundPayment(
    orderId: string,
    razorpayPaymentId?: string,
    options?: RefundPaymentOptions,
  ): Promise<{ status: string; refundId?: string; amountPaise?: number }> {
    const payment: any = await this.prisma.payment.findFirst({
      where: razorpayPaymentId
        ? { orderId, razorpayPaymentId }
        : { orderId, status: { in: ['COMPLETED', 'REFUND_FAILED', 'REFUND_PENDING', 'REFUNDED'] } },
      include: {
        order: {
          select: {
            id: true,
            userId: true,
            orderNumber: true,
            status: true,
            paymentStatus: true,
            razorpayOrderId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!payment) throw new NotFoundException('Captured payment record not found');
    const targetPaymentId = razorpayPaymentId || payment.razorpayPaymentId;
    if (!targetPaymentId) {
      throw new BadRequestException('Captured Razorpay payment ID is missing for this order');
    }
    if (payment.status === 'REFUNDED') {
      return { status: 'REFUNDED', refundId: payment.refundId || undefined, amountPaise: 0 };
    }

    const paidPaise = Math.round(Number(payment.amount));
    if (!Number.isSafeInteger(paidPaise) || paidPaise <= 0) {
      throw new BadRequestException('Invalid captured payment amount');
    }

    const refundedCancellations = (this.prisma as any).orderItemCancellation?.findMany
      ? await (this.prisma as any).orderItemCancellation.findMany({
          where: { orderId, refundStatus: 'REFUNDED' },
          select: { refundAmount: true },
        })
      : [];
    const dbRefundedPaise = (refundedCancellations || []).reduce(
      (sum: number, c: any) => sum + Math.round(Number(c.refundAmount || 0) * 100),
      0,
    );

    let providerRefundedPaise = 0;
    if (typeof this.razorpay?.payments?.fetch === 'function') {
      try {
        const providerPayment = await this.razorpay.payments.fetch(targetPaymentId);
        providerRefundedPaise = Math.round(Number(providerPayment?.amount_refunded || 0));
      } catch {
        // Fall back to DB refunded ledger if provider fetch is unavailable.
      }
    }

    const alreadyRefundedPaise = Math.max(dbRefundedPaise, providerRefundedPaise);
    const remainingPaise = Math.max(0, paidPaise - alreadyRefundedPaise);
    const orderUserId = payment.order?.userId;
    const orderNumber = payment.order?.orderNumber;

    // Case A: Partial refund for a specific cancelled order item
    if (options?.orderItemId) {
      const orderItem = await (this.prisma as any).orderItem?.findFirst?.({
        where: { id: options.orderItemId, orderId },
      });
      if (!orderItem) throw new NotFoundException('Order item not found');
      if (orderItem.status !== 'CANCELLED') {
        throw new BadRequestException('Only cancelled order items can be refunded');
      }
      if (orderItem.refundStatus === 'REFUNDED') {
        return {
          status: 'REFUNDED',
          amountPaise: Math.round(Number(orderItem.refundAmount || 0) * 100),
        };
      }
      if (orderItem.refundStatus === 'REFUND_PROCESSING') {
        return { status: 'REFUND_PENDING' };
      }
      if (!['REFUND_PENDING', 'REFUND_FAILED'].includes(orderItem.refundStatus || '')) {
        throw new BadRequestException('Order item is not eligible for refund');
      }
      if (!['COMPLETED', 'REFUND_FAILED', 'REFUND_PENDING'].includes(payment.status)) {
        throw new BadRequestException('Payment is not eligible for partial item refund');
      }

      const defaultItemPaise = Math.round(Number(orderItem.refundAmount || 0) * 100);
      const targetPaise = options.amountPaise ?? defaultItemPaise;
      if (!Number.isSafeInteger(targetPaise) || targetPaise <= 0) {
        throw new BadRequestException('No refundable amount remaining for this order item');
      }
      if (targetPaise > remainingPaise) {
        throw new BadRequestException(
          `Refund amount exceeds remaining refundable balance (₹${(remainingPaise / 100).toFixed(2)})`,
        );
      }

      const claimedItem = await (this.prisma as any).orderItem.updateMany({
        where: {
          id: orderItem.id,
          orderId,
          status: 'CANCELLED',
          refundStatus: { in: ['REFUND_PENDING', 'REFUND_FAILED'] },
        },
        data: { refundStatus: 'REFUND_PROCESSING' },
      });
      if (claimedItem.count !== 1) {
        const latestItem = await (this.prisma as any).orderItem.findFirst({ where: { id: orderItem.id } });
        return { status: latestItem?.refundStatus === 'REFUNDED' ? 'REFUNDED' : 'REFUND_PENDING' };
      }

      let providerRefund: any;
      try {
        providerRefund = await this.razorpay.payments.refund(targetPaymentId, {
          amount: targetPaise,
          notes: {
            orderId,
            orderItemId: orderItem.id,
            ...(options.reason ? { reason: options.reason } : {}),
          },
        });
      } catch {
        await this.prisma.$transaction(async (tx: any) => {
          await tx.orderItem.updateMany({
            where: { id: orderItem.id, refundStatus: 'REFUND_PROCESSING' },
            data: { refundStatus: 'REFUND_FAILED' },
          });
          await tx.orderItemCancellation?.updateMany?.({
            where: { orderItemId: orderItem.id, refundStatus: { in: ['REFUND_PENDING', 'REFUND_PROCESSING'] } },
            data: { refundStatus: 'REFUND_FAILED' },
          });
        });
        if (orderUserId) {
          await this.notificationService.dispatchPaymentUpdate(orderUserId, orderId, 'REFUND_FAILED', {
            orderNumber,
            amountPaise: targetPaise,
            reason: options.reason,
          });
        }
        return { status: 'REFUND_FAILED', amountPaise: targetPaise };
      }

      const completed = providerRefund?.status === 'processed';
      const nextItemStatus = completed ? 'REFUNDED' : 'REFUND_PENDING';
      const fullyRefunded = completed && alreadyRefundedPaise + targetPaise >= paidPaise;
      await this.prisma.$transaction(async (tx: any) => {
        await tx.orderItem.updateMany({
          where: { id: orderItem.id, refundStatus: 'REFUND_PROCESSING' },
          data: { refundStatus: nextItemStatus },
        });
        await tx.orderItemCancellation?.updateMany?.({
          where: { orderItemId: orderItem.id },
          data: { refundStatus: nextItemStatus },
        });
        await tx.payment.updateMany({
          where: { id: payment.id },
          data: {
            status: fullyRefunded ? 'REFUNDED' : payment.status,
            refundStatus: providerRefund?.status || 'pending',
            refundId: providerRefund?.id || undefined,
          },
        });
        if (completed) {
          await tx.order.updateMany({
            where: { id: orderId },
            data: { paymentStatus: fullyRefunded ? 'REFUNDED' : 'PARTIALLY_REFUNDED' },
          });
        }
        if (options.adminUserId && tx.auditLog?.create) {
          await tx.auditLog.create({
            data: {
              actorUserId: options.adminUserId,
              action: 'TRIGGER_PARTIAL_REFUND',
              entityType: 'ORDER_ITEM',
              entityId: orderItem.id,
              metadata: {
                orderId,
                amountPaise: targetPaise,
                refundId: providerRefund?.id || null,
                status: nextItemStatus,
                reason: options.reason || null,
              },
            },
          });
        }
      });

      if (orderUserId) {
        await this.notificationService.dispatchPaymentUpdate(
          orderUserId,
          orderId,
          completed ? 'REFUND_PROCESSED' : 'REFUND_FAILED',
          {
            orderNumber,
            amountPaise: targetPaise,
            refundId: providerRefund?.id,
            reason: options.reason,
          },
        );
      }
      return { status: nextItemStatus, refundId: providerRefund?.id, amountPaise: targetPaise };
    }

    // Case B: Full-order or explicit partial-amount refund
    if (payment.status === 'REFUND_PENDING') {
      return { status: 'REFUND_PENDING', refundId: payment.refundId || undefined };
    }
    if (!['COMPLETED', 'REFUND_FAILED'].includes(payment.status)) {
      throw new BadRequestException('Payment is not eligible for refund');
    }

    const targetPaise = options?.amountPaise ?? remainingPaise;
    if (!Number.isSafeInteger(targetPaise) || targetPaise <= 0) {
      if (remainingPaise <= 0) {
        await this.prisma.$transaction([
          (this.prisma as any).payment.updateMany({
            where: { id: payment.id },
            data: { status: 'REFUNDED', refundStatus: 'processed' },
          }),
          (this.prisma as any).order.updateMany({
            where: { id: orderId, paymentStatus: { in: ['REFUND_PENDING', 'REFUND_FAILED', 'PARTIALLY_REFUNDED'] } },
            data: { paymentStatus: 'REFUNDED' },
          }),
        ]);
        return { status: 'REFUNDED', amountPaise: 0 };
      }
      throw new BadRequestException('Refund amount must be a positive integer in paise');
    }
    if (targetPaise > remainingPaise) {
      throw new BadRequestException(
        `Refund amount exceeds remaining refundable balance (₹${(remainingPaise / 100).toFixed(2)})`,
      );
    }

    const previousPaymentStatus = payment.status;
    const claimed = await (this.prisma as any).payment.updateMany({
      where: {
        id: payment.id,
        orderId,
        razorpayPaymentId: targetPaymentId,
        status: { in: ['COMPLETED', 'REFUND_FAILED'] },
      },
      data: { status: 'REFUND_PENDING', refundStatus: 'pending' },
    });
    if (claimed.count !== 1) {
      const latest: any = await this.prisma.payment.findFirst({ where: { id: payment.id } });
      return { status: latest?.status === 'REFUNDED' ? 'REFUNDED' : 'REFUND_PENDING' };
    }

    let providerRefund: any;
    try {
      providerRefund = await this.razorpay.payments.refund(targetPaymentId, {
        amount: targetPaise,
        notes: {
          orderId,
          ...(options?.reason ? { reason: options.reason } : {}),
        },
      });
    } catch {
      const isSupersededPayment =
        Boolean(options?.supersededAttempt) ||
        Boolean(
          payment.order?.razorpayOrderId &&
            payment.razorpayOrderId &&
            payment.order.razorpayOrderId !== payment.razorpayOrderId,
        );
      await this.prisma.$transaction(async (tx: any) => {
        await tx.payment.updateMany({
          where: { id: payment.id, status: 'REFUND_PENDING' },
          data: { status: 'REFUND_FAILED', refundStatus: 'failed' },
        });
        if (!isSupersededPayment) {
          await tx.order.updateMany({
            where: { id: orderId, paymentStatus: { in: ['REFUND_PENDING', 'REFUND_FAILED'] } },
            data: { paymentStatus: 'REFUND_FAILED' },
          });
        }
      });
      if (orderUserId) {
        await this.notificationService.dispatchPaymentUpdate(orderUserId, orderId, 'REFUND_FAILED', {
          orderNumber,
          amountPaise: targetPaise,
          reason: options?.reason,
        });
      }
      return { status: 'REFUND_FAILED', amountPaise: targetPaise };
    }

    const completed = providerRefund?.status === 'processed';
    const isFullRefund = alreadyRefundedPaise + targetPaise >= paidPaise;
    const nextPaymentStatus = completed
      ? isFullRefund
        ? 'REFUNDED'
        : previousPaymentStatus === 'REFUND_FAILED'
          ? 'COMPLETED'
          : 'COMPLETED'
      : 'REFUND_PENDING';
    const nextOrderPaymentStatus = completed
      ? isFullRefund
        ? 'REFUNDED'
        : 'PARTIALLY_REFUNDED'
      : 'REFUND_PENDING';

    const isSupersededPayment =
      Boolean(options?.supersededAttempt) ||
      Boolean(
        payment.order?.razorpayOrderId &&
          payment.razorpayOrderId &&
          payment.order.razorpayOrderId !== payment.razorpayOrderId,
      );
    await this.prisma.$transaction(async (tx: any) => {
      await tx.payment.updateMany({
        where: { id: payment.id, status: 'REFUND_PENDING' },
        data: {
          status: nextPaymentStatus,
          refundStatus: providerRefund?.status || 'pending',
          refundId: providerRefund?.id || undefined,
        },
      });
      if (!isSupersededPayment) {
        await tx.order.updateMany({
          where: {
            id: orderId,
            paymentStatus: { in: ['REFUND_PENDING', 'REFUND_FAILED', 'COMPLETED', 'PAID', 'PARTIALLY_REFUNDED'] },
          },
          data: { paymentStatus: nextOrderPaymentStatus },
        });
      }
      if (completed && isFullRefund) {
        await tx.orderItem?.updateMany?.({
          where: { orderId, status: 'CANCELLED', refundStatus: { in: ['REFUND_PENDING', 'REFUND_FAILED'] } },
          data: { refundStatus: 'REFUNDED' },
        });
        await tx.orderItemCancellation?.updateMany?.({
          where: { orderId, refundStatus: { in: ['REFUND_PENDING', 'REFUND_FAILED'] } },
          data: { refundStatus: 'REFUNDED' },
        });
      }
      if (options?.adminUserId && tx.auditLog?.create) {
        await tx.auditLog.create({
          data: {
            actorUserId: options.adminUserId,
            action: 'TRIGGER_REFUND',
            entityType: 'ORDER',
            entityId: orderId,
            metadata: {
              amountPaise: targetPaise,
              refundId: providerRefund?.id || null,
              status: nextOrderPaymentStatus,
              reason: options.reason || null,
            },
          },
        });
      }
    });

    if (completed && orderUserId) {
      await this.notificationService.dispatchPaymentUpdate(orderUserId, orderId, 'REFUND_PROCESSED', {
        orderNumber,
        amountPaise: targetPaise,
        refundId: providerRefund?.id,
        reason: options?.reason,
      });
    }
    return {
      status: completed ? (isFullRefund ? 'REFUNDED' : 'PARTIALLY_REFUNDED') : 'REFUND_PENDING',
      refundId: providerRefund?.id,
      amountPaise: targetPaise,
    };
  }

  async verifyPayment(
    orderId: string,
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
    userId: string,
    userRole: string,
  ) {
    const order: any = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('Forbidden: Access denied');
    }

    if (order.status !== 'PENDING' || !['PENDING', 'FAILED'].includes(order.paymentStatus)) {
      if (order.paymentStatus === 'COMPLETED' && order.paymentId === razorpayPaymentId) {
        return { success: true, message: 'Payment already verified' };
      }
      throw new ConflictException('Order is not eligible for payment verification');
    }
    if (
      order.inventoryStatus !== 'RESERVED'
      || !order.reservationExpiresAt
      || new Date(order.reservationExpiresAt).getTime() <= Date.now()
    ) {
      throw new ConflictException('Order inventory reservation has expired');
    }

    // The order ID used to verify the HMAC must come from this persisted order,
    // never from a browser-supplied value alone.
    if (!order.razorpayOrderId || order.razorpayOrderId !== razorpayOrderId) {
      throw new BadRequestException('Payment does not belong to this order');
    }

    const paymentRecord = order.payments?.find(
      (payment: any) => payment.razorpayOrderId === order.razorpayOrderId
        && (
          (payment.status === 'PENDING' && !payment.razorpayPaymentId)
          || payment.status === 'FAILED'
        ),
    );
    if (!paymentRecord) {
      throw new BadRequestException('No pending payment exists for this order');
    }

    const expectedPaise = Math.round(Number(order.finalAmount) * 100);
    if (
      Math.round(Number(paymentRecord.amount)) !== expectedPaise
      || String(paymentRecord.currency || '').toUpperCase() !== 'INR'
    ) {
      throw new BadRequestException('Stored payment amount does not match this order');
    }

    const keySecret = normalizeRazorpayEnvValue(this.configService.get<string>('RAZORPAY_KEY_SECRET'));
    if (!keySecret) {
      throw new UnauthorizedException('Razorpay secret not configured');
    }

    // Timing-safe HMAC signature verification
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${order.razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    const sigBuffer = Buffer.from(razorpaySignature, 'utf8');
    const expBuffer = Buffer.from(expectedSignature, 'utf8');

    if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
      throw new BadRequestException('Invalid payment signature');
    }

    let providerPayment: any;
    try {
      providerPayment = await this.razorpay.payments.fetch(razorpayPaymentId);
    } catch {
      throw new ServiceUnavailableException('Payment status could not be confirmed');
    }

    if (
      providerPayment?.order_id !== order.razorpayOrderId
      || Number(providerPayment?.amount) !== expectedPaise
      || String(providerPayment?.currency || '').toUpperCase() !== 'INR'
      || providerPayment?.status !== 'captured'
    ) {
      throw new BadRequestException('Payment details do not match this order');
    }

    await this.prisma.$transaction(async (tx: any) => {
      const paymentWhere: any = paymentRecord.status === 'PENDING'
        ? {
            id: paymentRecord.id,
            orderId: order.id,
            razorpayOrderId: order.razorpayOrderId,
            status: 'PENDING',
            razorpayPaymentId: null,
          }
        : {
            id: paymentRecord.id,
            orderId: order.id,
            razorpayOrderId: order.razorpayOrderId,
            status: 'FAILED',
          };
      const paymentUpdate = await tx.payment.updateMany({
        where: paymentWhere,
        data: {
          status: 'COMPLETED',
          razorpayPaymentId,
          razorpaySignature,
        },
      });
      if (paymentUpdate.count !== 1) {
        throw new ConflictException('Payment was already processed');
      }

      const orderUpdate = await tx.order.updateMany({
        where: {
          id: order.id,
          userId: order.userId,
          razorpayOrderId: order.razorpayOrderId,
          status: 'PENDING',
          paymentStatus: { in: ['PENDING', 'FAILED'] },
          inventoryStatus: 'RESERVED',
          reservationExpiresAt: { gt: new Date() },
        },
        data: {
          paymentStatus: 'COMPLETED',
          status: 'CONFIRMED',
          inventoryStatus: 'CONSUMED',
          reservationExpiresAt: null,
          paymentId: razorpayPaymentId,
          razorpaySignature,
        },
      });
      if (orderUpdate.count !== 1) {
        throw new ConflictException('Order was already processed');
      }
      if (tx.cartItem) {
        await tx.cartItem.deleteMany({ where: { cart: { userId: order.userId } } });
      }
    }, { isolationLevel: 'Serializable' });

    await this.notificationService.dispatchPaymentUpdate(
      order.userId,
      order.id,
      'COMPLETED',
    );

    return { success: true, message: 'Payment verified successfully' };
  }

  verifyWebhookSignature(
    rawBody: Buffer | string,
    signature: string,
  ): boolean {
    const secret = normalizeRazorpayEnvValue(this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET'));
    if (!secret) {
      this.logger.error('RAZORPAY_WEBHOOK_SECRET is not configured');
      throw new BadRequestException('Webhook verification failed: secret not configured');
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    const sigBuffer = Buffer.from(signature, 'utf8');
    const expBuffer = Buffer.from(expectedSignature, 'utf8');

    if (sigBuffer.length !== expBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(sigBuffer, expBuffer);
  }

  private async handleRentalWebhook(payload: any, event: string): Promise<string | null> {
    const subscriptionEntity = payload?.payload?.subscription?.entity;
    const paymentEntity = payload?.payload?.payment?.entity;
    const subscriptionId = subscriptionEntity?.id || paymentEntity?.subscription_id;
    if (!subscriptionId) return null;

    const rental: any = await this.prisma.rentalSubscription.findUnique({
      where: { razorpaySubscriptionId: subscriptionId },
      include: { order: true },
    });
    if (!rental) return null;

    if (event === 'payment.captured' && paymentEntity?.subscription_id === subscriptionId) {
      let verifiedSubscription = subscriptionEntity;
      if (!verifiedSubscription) {
        try {
          verifiedSubscription = await this.razorpay.subscriptions.fetch(subscriptionId);
        } catch {
          throw new ServiceUnavailableException('Rental subscription status could not be confirmed');
        }
      }
      const result = await this.completeRentalPayment(rental, verifiedSubscription, paymentEntity);
      return result.duplicate ? 'rental_payment_already_processed' : result.activated ? 'rental_activated' : 'rental_payment_recorded';
    }

    if (event === 'payment.failed' && paymentEntity?.subscription_id === subscriptionId) {
      await this.failRentalPayment(rental, paymentEntity);
      return 'rental_payment_failed';
    }

    if (event === 'payment.authorized' && paymentEntity?.subscription_id === subscriptionId) {
      return 'rental_payment_authorized_pending_capture';
    }

    if (event === 'subscription.authenticated' || event === 'subscription.activated') {
      await this.prisma.rentalSubscription.updateMany({
        where: {
          id: rental.id,
          status: rental.status === 'TERMINATION_REQUESTED'
            ? 'TERMINATION_REQUESTED'
            : { notIn: ['CANCELLED', 'COMPLETED'] },
        },
        data: {
          mandateStatus: 'AUTHORIZED',
          ...(rental.firstPaymentId && rental.status !== 'TERMINATION_REQUESTED' ? { status: 'ACTIVE' } : {}),
          nextChargeAt: subscriptionEntity?.charge_at
            ? new Date(Number(subscriptionEntity.charge_at) * 1000)
            : rental.nextChargeAt,
        },
      });
      return 'rental_mandate_updated';
    }

    if (event === 'subscription.halted' || event === 'subscription.paused') {
      await this.prisma.rentalSubscription.updateMany({
        where: { id: rental.id, status: { notIn: ['CANCELLED', 'COMPLETED'] } },
        data: { status: 'PAYMENT_FAILED', mandateStatus: 'HALTED' },
      });
      return 'rental_mandate_halted';
    }

    if (event === 'subscription.cancelled' || event === 'subscription.completed') {
      const completed = event === 'subscription.completed';
      await this.prisma.rentalSubscription.updateMany({
        where: { id: rental.id, status: { notIn: ['CANCELLED', 'COMPLETED'] } },
        data: {
          status: completed ? 'COMPLETED' : 'CANCELLED',
          mandateStatus: completed ? 'AUTHORIZED' : 'CANCELLED',
          cancelledAt: completed ? null : new Date(),
          nextChargeAt: null,
        },
      });
      return completed ? 'rental_subscription_completed' : 'rental_subscription_cancelled';
    }

    if (event === 'subscription.charged') {
      return 'rental_charge_waiting_for_payment_capture';
    }
    return null;
  }

  async handlePaymentWebhook(
    rawBody?: Buffer | string,
    signature?: string,
  ): Promise<{ valid: boolean; event: string; data?: any }> {
    if (!signature) {
      throw new BadRequestException('Missing x-razorpay-signature header');
    }

    if (!rawBody || (Buffer.isBuffer(rawBody) && rawBody.length === 0)) {
      throw new BadRequestException('Missing raw request body');
    }

    const isValid = this.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      throw new BadRequestException('Invalid webhook signature');
    }

    let payload: any;
    try {
      const bodyString = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody);
      payload = JSON.parse(bodyString);
    } catch {
      throw new BadRequestException('Invalid webhook payload: JSON parse failed');
    }

    const event = payload?.event;
    const rentalEvent = await this.handleRentalWebhook(payload, event);
    if (rentalEvent) return { valid: true, event: rentalEvent };

    const refundEntity = payload?.payload?.refund?.entity;
    if (event === 'refund.processed' || event === 'refund.failed') {
      if (!refundEntity?.payment_id) return { valid: true, event: 'ignored_no_payment_id' };
      const payment: any = await this.prisma.payment.findFirst({
        where: { razorpayPaymentId: refundEntity.payment_id },
        include: { order: { select: { id: true, userId: true, orderNumber: true } } },
      });
      if (!payment) return { valid: true, event: 'refund_payment_not_found' };
      const refundAmountPaise = Number(refundEntity.amount || 0);
      const isFullPaymentRefund =
        refundAmountPaise <= 0 || refundAmountPaise >= Math.round(Number(payment.amount));
      const nextStatus = event === 'refund.processed' ? 'REFUNDED' : 'REFUND_FAILED';
      if (payment.status === nextStatus && (!refundEntity.id || payment.refundId === refundEntity.id)) {
        return { valid: true, event: 'already_processed' };
      }
      await this.prisma.$transaction(async (tx: any) => {
        await tx.payment.updateMany({
          where: { id: payment.id, status: { in: ['REFUND_PENDING', 'COMPLETED'] } },
          data: {
            status: event === 'refund.processed' && !isFullPaymentRefund ? 'COMPLETED' : nextStatus,
            refundStatus: event === 'refund.processed' ? 'processed' : 'failed',
            refundId: refundEntity.id || undefined,
          },
        });
        await tx.order.updateMany({
          where: {
            id: payment.orderId,
            paymentId: refundEntity.payment_id,
            paymentStatus: { in: ['REFUND_PENDING', 'COMPLETED', 'PARTIALLY_REFUNDED'] },
          },
          data: {
            paymentStatus:
              event === 'refund.processed' && !isFullPaymentRefund ? 'PARTIALLY_REFUNDED' : nextStatus,
          },
        });
        if (event === 'refund.processed' && isFullPaymentRefund) {
          await tx.orderItem?.updateMany?.({
            where: {
              orderId: payment.orderId,
              status: 'CANCELLED',
              refundStatus: { in: ['REFUND_PENDING', 'REFUND_PROCESSING'] },
            },
            data: { refundStatus: 'REFUNDED' },
          });
          await tx.orderItemCancellation?.updateMany?.({
            where: {
              orderId: payment.orderId,
              refundStatus: { in: ['REFUND_PENDING', 'REFUND_PROCESSING'] },
            },
            data: { refundStatus: 'REFUNDED' },
          });
        }
      });
      if (payment.order?.userId) {
        await this.notificationService.dispatchPaymentUpdate(
          payment.order.userId,
          payment.orderId,
          event === 'refund.processed' ? 'REFUND_PROCESSED' : 'REFUND_FAILED',
          {
            orderNumber: payment.order.orderNumber,
            amountPaise: refundAmountPaise > 0 ? refundAmountPaise : undefined,
            refundId: refundEntity.id,
          },
        );
      }
      return { valid: true, event: 'refund_status_updated' };
    }

    const paymentEntity = payload?.payload?.payment?.entity;
    const orderEntity = payload?.payload?.order?.entity;
    if (!paymentEntity && !(event === 'order.paid' && orderEntity?.id)) {
      return { valid: true, event: 'ignored_no_entity' };
    }
    const razorpayPaymentId = paymentEntity?.id;
    const razorpayOrderId = paymentEntity?.order_id || orderEntity?.id;

    if (event === 'payment.authorized') {
      // Authorization alone is not a captured payment and cannot confirm an order.
      return { valid: true, event: 'payment_authorized' };
    }

    const isCaptureEvent = event === 'payment.captured' || event === 'order.paid';
    const payment: any = razorpayOrderId
      ? await this.prisma.payment.findFirst({
        where: { razorpayOrderId },
        include: { order: true },
      })
      : (razorpayPaymentId
        ? await this.prisma.payment.findFirst({
          where: { razorpayPaymentId },
          include: { order: true },
        })
        : null);
    if (!payment?.order) return { valid: true, event: 'payment_record_not_found' };
    const order: any = payment.order;

    // Idempotency: Duplicate webhooks for already-processed terminal states
    if (
      isCaptureEvent
      && ['COMPLETED', 'REFUND_PENDING', 'REFUNDED'].includes(payment.status)
      && (
        (razorpayPaymentId && payment.razorpayPaymentId === razorpayPaymentId)
        || (event === 'order.paid' && payment.razorpayOrderId === razorpayOrderId && order.paymentStatus === 'COMPLETED')
      )
    ) {
      return { valid: true, event: 'already_processed' };
    }
    if (event === 'payment.failed' && payment.razorpayPaymentId === razorpayPaymentId && payment.status === 'FAILED') {
      return { valid: true, event: 'already_processed' };
    }

    // Idempotency: If order was already confirmed with this payment ID
    if (order.paymentStatus === 'COMPLETED' && order.paymentId === razorpayPaymentId) {
      return { valid: true, event: 'already_processed' };
    }

    // Out-of-order event protection: Never let an out-of-order or late failure regress a confirmed/completed order
    if (event === 'payment.failed' && (order.paymentStatus === 'COMPLETED' || order.status === 'CONFIRMED')) {
      return { valid: true, event: 'ignored_order_already_completed' };
    }

    if (event === 'payment.failed') {
      await this.prisma.$transaction([
        this.prisma.payment.updateMany({
          where: { id: payment.id, status: { in: ['PENDING', 'FAILED'] } },
          data: { status: 'FAILED', razorpayPaymentId },
        }),
        this.prisma.order.updateMany({
          where: {
            id: order.id,
            razorpayOrderId,
            status: 'PENDING',
            paymentStatus: { in: ['PENDING', 'FAILED'] },
          },
          data: { paymentStatus: 'FAILED', paymentId: razorpayPaymentId },
        }),
      ]);
      await this.notificationService.dispatchPaymentUpdate(order.userId, order.id, 'FAILED');
      return { valid: true, event: 'payment_failed' };
    }
    if (!isCaptureEvent) return { valid: true, event };

    const capturedPaymentId = razorpayPaymentId || payment.razorpayPaymentId || order.paymentId;
    if (!capturedPaymentId) {
      return { valid: true, event: 'ignored_no_payment_id' };
    }

    const expectedPaise = Math.round(Number(order.finalAmount) * 100);
    const actualPaise = Number(paymentEntity?.amount ?? orderEntity?.amount_paid ?? orderEntity?.amount);
    const paidCurrency = String(paymentEntity?.currency || orderEntity?.currency || '').toUpperCase();
    if (
      actualPaise !== expectedPaise
      || Math.round(Number(payment.amount)) !== expectedPaise
      || String(payment.currency || '').toUpperCase() !== 'INR'
      || paidCurrency !== 'INR'
    ) {
      this.logger.error(
        `Payment amount mismatch for order ${order.id}: expected ${expectedPaise} paise INR, got ${actualPaise} paise ${paidCurrency}`,
      );
      await this.prisma.$transaction([
        this.prisma.payment.updateMany({
          where: { id: payment.id, status: { in: ['PENDING', 'FAILED'] } },
          data: { status: 'FAILED', razorpayPaymentId },
        }),
        this.prisma.order.updateMany({
          where: {
            id: order.id,
            razorpayOrderId,
            status: 'PENDING',
            paymentStatus: { in: ['PENDING', 'FAILED'] },
          },
          data: { paymentStatus: 'FAILED', paymentId: razorpayPaymentId },
        }),
      ]);
      await this.notificationService.dispatchPaymentUpdate(order.userId, order.id, 'FAILED');
      return { valid: false, event: 'amount_mismatch' };
    }

    const isReservationActive = order.inventoryStatus === 'RESERVED'
      && (!order.reservationExpiresAt || new Date(order.reservationExpiresAt).getTime() > Date.now());

    const providerOrderStillCurrent = order.razorpayOrderId === razorpayOrderId;
    const orderCanBeConfirmed = providerOrderStillCurrent
      && order.status === 'PENDING'
      && ['PENDING', 'FAILED'].includes(order.paymentStatus)
      && isReservationActive;

    if (!providerOrderStillCurrent) {
      // Captured payment belongs to a superseded Razorpay order while a newer attempt exists.
      // Only mark that superseded Payment row and trigger its refund without overwriting Order.paymentStatus / Order.paymentId.
      await this.prisma.payment.updateMany({
        where: { id: payment.id, status: { in: ['PENDING', 'FAILED'] } },
        data: { status: 'COMPLETED', razorpayPaymentId: capturedPaymentId },
      });
      const refund = await this.refundPayment(order.id, capturedPaymentId, { supersededAttempt: true });
      return { valid: true, event: 'superseded_payment_refund', data: { refundStatus: refund.status } };
    }

    if (!orderCanBeConfirmed) {
      await this.prisma.$transaction([
        this.prisma.payment.updateMany({
          where: { id: payment.id, status: { in: ['PENDING', 'FAILED'] } },
          data: { status: 'COMPLETED', razorpayPaymentId: capturedPaymentId },
        }),
        this.prisma.order.updateMany({
          where: {
            id: order.id,
            paymentStatus: { in: ['PENDING', 'FAILED'] },
          },
          data: { paymentStatus: 'REFUND_PENDING', paymentId: capturedPaymentId },
        }),
      ]);
      const refund = await this.refundPayment(order.id, capturedPaymentId);
      return { valid: true, event: 'late_payment_refund', data: { refundStatus: refund.status } };
    }

    await this.prisma.$transaction(async (tx: any) => {
      await tx.payment.updateMany({
        where: { id: payment.id, status: { in: ['PENDING', 'FAILED'] } },
        data: { status: 'COMPLETED', razorpayPaymentId: capturedPaymentId },
      });
      const orderUpdate = await tx.order.updateMany({
        where: {
          id: order.id,
          razorpayOrderId,
          status: 'PENDING',
          paymentStatus: { in: ['PENDING', 'FAILED'] },
          inventoryStatus: 'RESERVED',
        },
        data: {
          paymentStatus: 'COMPLETED',
          status: 'CONFIRMED',
          inventoryStatus: 'CONSUMED',
          reservationExpiresAt: null,
          paymentId: capturedPaymentId,
        },
      });
      if (orderUpdate.count === 1 && tx.cartItem) {
        await tx.cartItem.deleteMany({ where: { cart: { userId: order.userId } } });
      }
    });

    await this.notificationService.dispatchPaymentUpdate(order.userId, order.id, 'COMPLETED');
    return { valid: true, event: 'payment_completed' };
  }

  async getOrderForUser(orderId: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: true } },
        payments: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return order;
  }

  private async handleRazorpayGatewayError(
    orderId: string,
    flow: 'order' | 'rental_subscription',
    error: any,
  ): Promise<never> {
    const details = extractRazorpayErrorDetails(error);
    const reasonLabel = details.statusCode === 401 ? 'authentication failed' : 'request failed';
    this.logger.error(
      `Razorpay ${reasonLabel} during ${flow} creation for order ${orderId}: statusCode=${details.statusCode ?? 'network'}, code=${details.code || 'UNKNOWN'}, description=${details.description}, keyMode=${this.keyMode}, keyId=${maskRazorpayKeyId(this.keyId)}`,
    );
    await this.releaseOrderAfterGatewayFailure(orderId);

    const isTransient = details.statusCode === null || details.statusCode >= 503;
    if (isTransient) {
      throw new ServiceUnavailableException({
        statusCode: 503,
        error: 'Service Unavailable',
        code: 'PAYMENT_PROVIDER_UNAVAILABLE',
        message: 'Payment provider unavailable',
      });
    }

    throw new BadGatewayException({
      statusCode: 502,
      error: 'Bad Gateway',
      code: 'PAYMENT_PROVIDER_UNAVAILABLE',
      message: 'Payment provider unavailable',
    });
  }

  private async releaseOrderAfterGatewayFailure(orderId: string): Promise<void> {
    try {
      await this.prisma.$transaction(async (tx: any) => {
        const order = await tx.order?.findUnique?.({
          where: { id: orderId },
          include: { items: true },
        });
        if (!order || order.status !== 'PENDING' || order.inventoryStatus !== 'RESERVED') {
          return;
        }

        const cancelled = await tx.order.updateMany({
          where: {
            id: orderId,
            status: 'PENDING',
            inventoryStatus: 'RESERVED',
            paymentStatus: { in: ['PENDING', 'FAILED'] },
          },
          data: {
            status: 'CANCELLED',
            paymentStatus: 'FAILED',
            inventoryStatus: 'RELEASED',
            reservationExpiresAt: null,
          },
        });
        if (cancelled?.count !== 1) return;

        await tx.payment?.updateMany?.({
          where: { orderId, status: 'PENDING' },
          data: { status: 'FAILED' },
        });
        await tx.rentalSubscription?.updateMany?.({
          where: {
            orderId,
            status: { in: ['PENDING_AUTHORIZATION', 'CREATING'] },
            razorpaySubscriptionId: null,
          },
          data: { status: 'CANCELLED' },
        });

        for (const item of order.items || []) {
          if (item.status === 'CANCELLED') continue;
          const inventoryModel = item.variantId ? tx.productVariant : tx.product;
          if (typeof inventoryModel?.update === 'function') {
            await inventoryModel.update({
              where: { id: item.variantId || item.productId },
              data: { stock: { increment: item.quantity } },
            });
          }
        }

        const redemption = await tx.discountRedemption?.findUnique?.({ where: { orderId } });
        if (redemption && redemption.status !== 'RESTORED') {
          await tx.discountCode?.updateMany?.({
            where: { id: redemption.discountCodeId, uses: { gt: 0 } },
            data: { uses: { decrement: 1 } },
          });
          await tx.discountRedemption?.update?.({
            where: { orderId },
            data: { status: 'RESTORED', restoredAt: new Date(), restoredReason: 'Gateway order creation failed' },
          });
        }
        await tx.referralRedemption?.deleteMany?.({ where: { orderId } });
      });
    } catch (cleanupError: any) {
      this.logger.warn(
        `Failed to clean up order ${orderId} after Razorpay gateway error: ${cleanupError?.message || cleanupError}`,
      );
    }
  }

  async getPaymentHistory(userId: string) {
    try {
      const payments = await this.prisma.payment.findMany({
        where: { order: { userId } },
        include: { order: true },
        orderBy: { createdAt: 'desc' },
      });
      return payments.map((p) => ({
        id: p.id,
        orderId: p.orderId,
        orderNumber: p.order?.orderNumber || `ORD-${p.orderId.slice(0, 6)}`,
        razorpayPaymentId: p.razorpayPaymentId,
        razorpayOrderId: p.razorpayOrderId,
        amount: typeof p.amount === 'number' ? p.amount / 100 : parseFloat(p.amount?.toString() || '0') / 100,
        currency: p.currency,
        status: p.status,
        refundStatus: p.status === 'REFUNDED' ? 'COMPLETED' : 'NONE',
        refundAmount: p.status === 'REFUNDED' ? Number(p.amount) / 100 : 0,
        createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
      }));
    } catch (err: any) {
      this.logger.error(`Database error getting payment history: ${err?.message || err}`);
      return [];
    }
  }
}
