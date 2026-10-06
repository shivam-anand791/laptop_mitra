import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
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

    const order = await this.prisma.order.findUnique({
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
          razorpayOrderId: order.razorpayOrderId,
          status: 'PENDING',
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
        data: { razorpayOrderId: rzpOrder.id },
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

  async verifyPayment(
    orderId: string,
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
    userId: string,
    userRole: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId && userRole !== 'ADMIN') {
      throw new ForbiddenException('Forbidden: Access denied');
    }

    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
    if (!keySecret) {
      throw new UnauthorizedException('Razorpay secret not configured');
    }

    // Timing-safe HMAC signature verification
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    const sigBuffer = Buffer.from(razorpaySignature, 'utf8');
    const expBuffer = Buffer.from(expectedSignature, 'utf8');

    if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
      throw new BadRequestException('Invalid payment signature');
    }

    await this.prisma.$transaction([
      this.prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'COMPLETED',
          status: order.status === 'PENDING' ? 'CONFIRMED' : order.status,
          paymentId: razorpayPaymentId,
          razorpaySignature,
        },
      }),
      this.prisma.payment.updateMany({
        where: { orderId: order.id, razorpayOrderId },
        data: {
          status: 'COMPLETED',
          razorpayPaymentId,
          razorpaySignature,
        },
      }),
    ]);

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
    const paymentEntity = payload?.payload?.payment?.entity;

    if (!paymentEntity) {
      return { valid: true, event: 'ignored_no_entity' };
    }

    const razorpayPaymentId = paymentEntity.id;
    const razorpayOrderId = paymentEntity.order_id;

    // Idempotency: if payment with this razorpayPaymentId is already COMPLETED, avoid re-processing
    if (razorpayPaymentId) {
      const existingPayment = await this.prisma.payment.findFirst({
        where: { razorpayPaymentId, status: 'COMPLETED' },
      });
      if (existingPayment) {
        return { valid: true, event: 'already_processed', data: paymentEntity };
      }
    }

    switch (event) {
      case 'payment.authorized':
      case 'payment.captured': {
        if (!razorpayOrderId) {
          return { valid: true, event: 'ignored_no_order_id' };
        }

        const order = await this.prisma.order.findFirst({
          where: { razorpayOrderId },
        });

        if (!order) {
          this.logger.warn(`Webhook received for unknown Razorpay order: ${razorpayOrderId}`);
          return { valid: true, event: 'order_not_found', data: paymentEntity };
        }

        // Idempotency: if order is already marked COMPLETED or matches this paymentId, avoid duplicate mutation
        if (order.paymentStatus === 'COMPLETED' || (razorpayPaymentId && order.paymentId === razorpayPaymentId)) {
          return { valid: true, event: 'already_processed', data: paymentEntity };
        }

        // Integrity: verify paid amount and currency against database order
        const expectedPaise = Math.round(Number(order.finalAmount) * 100);
        const actualPaise = Number(paymentEntity.amount);
        const paidCurrency = String(paymentEntity.currency || '').toUpperCase();

        if (actualPaise !== expectedPaise || paidCurrency !== 'INR') {
          this.logger.error(
            `Payment amount mismatch for order ${order.id}: expected ${expectedPaise} INR, received ${actualPaise} ${paidCurrency}`,
          );
          await this.prisma.payment.updateMany({
            where: { razorpayOrderId },
            data: { status: 'FAILED', razorpayPaymentId: paymentEntity.id },
          });
          return { valid: false, event: 'amount_mismatch' };
        }

        await this.prisma.$transaction([
          this.prisma.order.update({
            where: { id: order.id },
            data: {
              paymentStatus: 'COMPLETED',
              status: order.status === 'PENDING' ? 'CONFIRMED' : order.status,
              paymentId: paymentEntity.id,
            },
          }),
          this.prisma.payment.updateMany({
            where: { razorpayOrderId },
            data: {
              status: 'COMPLETED',
              razorpayPaymentId: paymentEntity.id,
            },
          }),
        ]);

        await this.notificationService.dispatchPaymentUpdate(
          order.userId,
          order.id,
          'COMPLETED',
        );

        return { valid: true, event: 'payment_completed', data: paymentEntity };
      }

      case 'payment.failed': {
        const razorpayOrderId = paymentEntity.order_id;
        if (razorpayOrderId) {
          const order = await this.prisma.order.findFirst({
            where: { razorpayOrderId },
          });

          await this.prisma.payment.updateMany({
            where: { razorpayOrderId },
            data: {
              status: 'FAILED',
              razorpayPaymentId: paymentEntity.id,
            },
          });

          if (order && order.paymentStatus !== 'COMPLETED') {
            await this.prisma.order.update({
              where: { id: order.id },
              data: {
                paymentStatus: 'FAILED',
                paymentId: paymentEntity.id,
              },
            });

            await this.notificationService.dispatchPaymentUpdate(
              order.userId,
              order.id,
              'FAILED',
            );
          }
        }
        return { valid: true, event: 'payment_failed', data: paymentEntity };
      }

      default:
        return { valid: true, event, data: paymentEntity };
    }
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
