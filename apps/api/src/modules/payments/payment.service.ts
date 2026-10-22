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
import * as crypto from 'crypto';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Razorpay = require('razorpay');

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly razorpay: any;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
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
  }

  async createOrderForUser(orderId: string, userId: string, userRole: string): Promise<any> {
    if (!orderId) {
      throw new BadRequestException('orderId is required');
    }

    const order: any = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
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
    const refundEntity = payload?.payload?.refund?.entity;
    if (event === 'refund.processed' || event === 'refund.failed') {
      if (!refundEntity?.payment_id) return { valid: true, event: 'ignored_no_payment_id' };
      const payment = await this.prisma.payment.findFirst({
        where: { razorpayPaymentId: refundEntity.payment_id },
      });
      if (!payment) return { valid: true, event: 'refund_payment_not_found' };
      const nextStatus = event === 'refund.processed' ? 'REFUNDED' : 'REFUND_FAILED';
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
      : null;
    if (!payment?.order) return { valid: true, event: 'payment_record_not_found' };
    const order: any = payment.order;

    if (payment.razorpayPaymentId === razorpayPaymentId
      && ['COMPLETED', 'REFUND_PENDING', 'REFUNDED'].includes(payment.status)) {
      return { valid: true, event: 'already_processed' };
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
      this.logger.error(`Payment amount mismatch for order ${order.id}`);
      await this.prisma.payment.updateMany({
        where: { id: payment.id, status: { in: ['PENDING', 'FAILED'] } },
        data: { status: 'FAILED', razorpayPaymentId },
      });
      return { valid: false, event: 'amount_mismatch' };
    }

    const providerOrderStillCurrent = order.razorpayOrderId === razorpayOrderId;
    const orderCanBeConfirmed = providerOrderStillCurrent
      && order.status === 'PENDING'
      && ['PENDING', 'FAILED'].includes(order.paymentStatus)
      && order.inventoryStatus === 'RESERVED';

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
            status: 'CANCELLED',
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
