import { Injectable, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const Razorpay = require('razorpay');

@Injectable()
export class PaymentService {
  private readonly razorpay: any;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');

    if (!keyId || !keySecret) {
      throw new UnauthorizedException('Razorpay credentials not configured');
    }

    // Hard stop: refuse live keys in non-production (enforced by env schema anyway)
    if (keyId.startsWith('rzp_live_') && this.configService.get<string>('NODE_ENV') !== 'production') {
      throw new UnauthorizedException('Live Razorpay keys not allowed in development');
    }

    this.razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  async createOrder(amount: number, currency: string = 'INR', receipt: string): Promise<any> {
    // amount in smallest currency unit (paise for INR)
    const amountInPaise = Math.round(amount * 100);

    const order = await this.razorpay.orders.create({
      amount: amountInPaise,
      currency,
      receipt,
      payment_capture: 1, // Auto-capture
    });

    // Save payment record
    const orderId = receipt; // The receipt is our internal order ID
    await this.prisma.payment.create({
      data: {
        order: { connect: { id: orderId } },
        razorpayOrderId: order.id,
        amount: amountInPaise,
        currency,
        status: 'PENDING',
      },
    });

    return order;
  }

  async verifyWebhookSignature(
    payload: string,
    signature: string,
  ): Promise<boolean> {
    const secret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET');
    if (!secret) {
      throw new UnauthorizedException('Webhook secret not configured');
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return expectedSignature === signature;
  }

  async handlePaymentWebhook(
    payload: any,
    signature: string,
  ): Promise<{ valid: boolean; event: string; data?: any }> {
    const isValid = await this.verifyWebhookSignature(
      JSON.stringify(payload),
      signature,
    );

    if (!isValid) {
      return { valid: false, event: 'invalid_signature' };
    }

    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;

    // Handle different events
    switch (event) {
      case 'payment.authorized': {
        // Update payment status
        if (paymentEntity) {
          await this.prisma.payment.updateMany({
            where: { razorpayPaymentId: paymentEntity.id },
            data: { status: 'COMPLETED' },
          });

          // Update order payment status
          const payment = await this.prisma.payment.findFirst({
            where: { razorpayPaymentId: paymentEntity.id },
            include: { order: true },
          });

          if (payment?.order) {
            await this.prisma.order.update({
              where: { id: payment.order.id },
              data: {
                paymentStatus: 'COMPLETED',
                paymentId: paymentEntity.id,
              },
            });
          }
        }
        return { valid: true, event: 'payment_authorized', data: paymentEntity };
      }

      case 'payment.captured': {
        if (paymentEntity) {
          await this.prisma.payment.updateMany({
            where: { razorpayPaymentId: paymentEntity.id },
            data: { status: 'COMPLETED' },
          });

          const payment = await this.prisma.payment.findFirst({
            where: { razorpayPaymentId: paymentEntity.id },
            include: { order: true },
          });

          if (payment?.order) {
            await this.prisma.order.update({
              where: { id: payment.order.id },
              data: {
                paymentStatus: 'COMPLETED',
                paymentId: paymentEntity.id,
              },
            });
          }
        }
        return { valid: true, event: 'payment_captured', data: paymentEntity };
      }

      case 'payment.failed': {
        if (paymentEntity) {
          await this.prisma.payment.updateMany({
            where: { razorpayPaymentId: paymentEntity.id },
            data: { status: 'FAILED' },
          });

          const payment = await this.prisma.payment.findFirst({
            where: { razorpayPaymentId: paymentEntity.id },
            include: { order: true },
          });

          if (payment?.order) {
            await this.prisma.order.update({
              where: { id: payment.order.id },
              data: {
                paymentStatus: 'FAILED',
                paymentId: paymentEntity.id,
              },
            });
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

    // Verify ownership
    if (order.userId !== userId) {
      throw new UnauthorizedException('Access denied');
    }

    return order;
  }
}
