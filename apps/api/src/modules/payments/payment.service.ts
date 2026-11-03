import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
import { TaxService } from '../tax/tax.service';
import * as crypto from 'crypto';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Razorpay = require('razorpay');

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly razorpay: any;
  private readonly keyId: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly taxService: TaxService,
  ) {
    const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');

    if (!keyId || !keySecret) {
      throw new UnauthorizedException('Razorpay credentials not configured');
    }

    // Hard stop: refuse live keys in non-production
    if (keyId.startsWith('rzp_live_') && this.configService.get<string>('NODE_ENV') !== 'production') {
      throw new UnauthorizedException('Live Razorpay keys not allowed in development');
    }

    this.razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
    this.keyId = keyId;
  }

  getTaxPolicy() {
    return this.taxService.getPublicPolicy();
  }

  async createRentalSubscriptionForUser(orderId: string, userId: string, userRole: string) {
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

    const secret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
    if (!secret) throw new UnauthorizedException('Razorpay secret not configured');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${subscriptionId}|${paymentId}`)
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
      await this.notificationService.dispatchPaymentUpdate(rental.userId, rental.orderId, 'COMPLETED');
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

    if (amountInPaise <= 0) {
      throw new BadRequestException('Invalid order total amount');
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

    const rzpOrder = await this.razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: order.id,
      payment_capture: 1, // Auto-capture
    });

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

  async refundPayment(orderId: string, razorpayPaymentId: string): Promise<{ status: string }> {
    const payment: any = await this.prisma.payment.findFirst({
      where: { orderId, razorpayPaymentId },
    });
    if (!payment) throw new NotFoundException('Captured payment record not found');
    if (payment.status === 'REFUNDED') return { status: 'REFUNDED' };
    if (payment.status === 'REFUND_PENDING') return { status: 'REFUND_PENDING' };
    if (payment.status !== 'COMPLETED') {
      throw new BadRequestException('Payment is not eligible for refund');
    }

    const claimed = await (this.prisma as any).payment.updateMany({
      where: { id: payment.id, orderId, razorpayPaymentId, status: 'COMPLETED' },
      data: { status: 'REFUND_PENDING', refundStatus: 'pending' },
    });
    if (claimed.count !== 1) {
      const latest: any = await this.prisma.payment.findFirst({ where: { id: payment.id } });
      return { status: latest?.status === 'REFUNDED' ? 'REFUNDED' : 'REFUND_PENDING' };
    }

    let providerRefund: any;
    try {
      providerRefund = await this.razorpay.payments.refund(razorpayPaymentId, {
        amount: Math.round(Number(payment.amount)),
        notes: { orderId },
      });
    } catch {
      await this.prisma.$transaction([
        (this.prisma as any).payment.updateMany({
          where: { id: payment.id, status: 'REFUND_PENDING' },
          data: { status: 'REFUND_FAILED', refundStatus: 'failed' },
        }),
        (this.prisma as any).order.updateMany({
          where: { id: orderId, paymentStatus: 'REFUND_PENDING' },
          data: { paymentStatus: 'REFUND_FAILED' },
        }),
      ]);
      return { status: 'REFUND_FAILED' };
    }

    const completed = providerRefund?.status === 'processed';
    const nextStatus = completed ? 'REFUNDED' : 'REFUND_PENDING';
    await this.prisma.$transaction([
      (this.prisma as any).payment.updateMany({
        where: { id: payment.id, status: 'REFUND_PENDING' },
        data: {
          status: nextStatus,
          refundStatus: providerRefund?.status || 'pending',
          refundId: providerRefund?.id || undefined,
        },
      }),
      (this.prisma as any).order.updateMany({
        where: { id: orderId, paymentStatus: 'REFUND_PENDING' },
        data: { paymentStatus: nextStatus },
      }),
    ]);
    return { status: nextStatus };
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

    if (order.status !== 'PENDING' || order.paymentStatus !== 'PENDING') {
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
        && payment.status === 'PENDING'
        && !payment.razorpayPaymentId,
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

    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
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
      const paymentUpdate = await tx.payment.updateMany({
        where: {
          id: paymentRecord.id,
          orderId: order.id,
          razorpayOrderId: order.razorpayOrderId,
          status: 'PENDING',
          razorpayPaymentId: null,
        },
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
          paymentStatus: 'PENDING',
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
    const secret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET');
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
      const payment = await this.prisma.payment.findFirst({
        where: { razorpayPaymentId: refundEntity.payment_id },
      });
      if (!payment) return { valid: true, event: 'refund_payment_not_found' };
      const nextStatus = event === 'refund.processed' ? 'REFUNDED' : 'REFUND_FAILED';
      if (payment.status === nextStatus) {
        return { valid: true, event: 'already_processed' };
      }
      await this.prisma.$transaction([
        this.prisma.payment.updateMany({
          where: { id: payment.id, status: 'REFUND_PENDING' },
          data: {
            status: nextStatus,
            refundStatus: event === 'refund.processed' ? 'processed' : 'failed',
            refundId: refundEntity.id || undefined,
          },
        }),
        this.prisma.order.updateMany({
          where: {
            id: payment.orderId,
            paymentId: refundEntity.payment_id,
            paymentStatus: 'REFUND_PENDING',
          },
          data: { paymentStatus: nextStatus },
        }),
      ]);
      return { valid: true, event: 'refund_status_updated' };
    }

    const paymentEntity = payload?.payload?.payment?.entity;
    if (!paymentEntity) return { valid: true, event: 'ignored_no_entity' };
    const razorpayPaymentId = paymentEntity.id;
    const razorpayOrderId = paymentEntity.order_id;

    if (event === 'payment.authorized') {
      // Authorization alone is not a captured payment and cannot confirm an order.
      return { valid: true, event: 'payment_authorized' };
    }

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
    if (payment.razorpayPaymentId === razorpayPaymentId) {
      if (event === 'payment.captured' && ['COMPLETED', 'REFUND_PENDING', 'REFUNDED'].includes(payment.status)) {
        return { valid: true, event: 'already_processed' };
      }
      if (event === 'payment.failed' && payment.status === 'FAILED') {
        return { valid: true, event: 'already_processed' };
      }
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
    if (event !== 'payment.captured') return { valid: true, event };

    const expectedPaise = Math.round(Number(order.finalAmount) * 100);
    const actualPaise = Number(paymentEntity.amount);
    const paidCurrency = String(paymentEntity.currency || '').toUpperCase();
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

    if (!orderCanBeConfirmed) {
      await this.prisma.$transaction([
        this.prisma.payment.updateMany({
          where: { id: payment.id, status: { in: ['PENDING', 'FAILED'] } },
          data: { status: 'COMPLETED', razorpayPaymentId },
        }),
        this.prisma.order.updateMany({
          where: {
            id: order.id,
            paymentStatus: { in: ['PENDING', 'FAILED'] },
          },
          data: { paymentStatus: 'REFUND_PENDING', paymentId: razorpayPaymentId },
        }),
      ]);
      const refund = await this.refundPayment(order.id, razorpayPaymentId);
      return { valid: true, event: 'late_payment_refund', data: { refundStatus: refund.status } };
    }

    await this.prisma.$transaction([
      this.prisma.payment.updateMany({
        where: { id: payment.id, status: { in: ['PENDING', 'FAILED'] } },
        data: { status: 'COMPLETED', razorpayPaymentId },
      }),
      this.prisma.order.updateMany({
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
          paymentId: razorpayPaymentId,
        },
      }),
    ]);

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
