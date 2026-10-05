"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PaymentService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../prisma/prisma.service");
const notification_service_1 = require("../notifications/notification.service");
const crypto = require("crypto");
const Razorpay = require('razorpay');
let PaymentService = PaymentService_1 = class PaymentService {
    configService;
    prisma;
    notificationService;
    logger = new common_1.Logger(PaymentService_1.name);
    razorpay;
    constructor(configService, prisma, notificationService) {
        this.configService = configService;
        this.prisma = prisma;
        this.notificationService = notificationService;
        const keyId = this.configService.get('RAZORPAY_KEY_ID');
        const keySecret = this.configService.get('RAZORPAY_KEY_SECRET');
        if (!keyId || !keySecret) {
            throw new common_1.UnauthorizedException('Razorpay credentials not configured');
        }
        if (keyId.startsWith('rzp_live_') && this.configService.get('NODE_ENV') !== 'production') {
            throw new common_1.UnauthorizedException('Live Razorpay keys not allowed in development');
        }
        this.razorpay = new Razorpay({
            key_id: keyId,
            key_secret: keySecret,
        });
    }
    async createOrderForUser(orderId, userId, userRole) {
        if (!orderId) {
            throw new common_1.BadRequestException('orderId is required');
        }
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { payments: true },
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        if (order.userId !== userId && userRole !== 'ADMIN') {
            throw new common_1.ForbiddenException('Forbidden: You can only pay for your own orders');
        }
        if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
            throw new common_1.BadRequestException('Cannot create payment for a cancelled or refunded order');
        }
        if (order.paymentStatus === 'COMPLETED') {
            throw new common_1.BadRequestException('Order has already been paid');
        }
        const amountNum = typeof order.finalAmount === 'number'
            ? order.finalAmount
            : parseFloat(order.finalAmount?.toString() || '0');
        const amountInPaise = Math.round(amountNum * 100);
        if (amountInPaise <= 0) {
            throw new common_1.BadRequestException('Invalid order total amount');
        }
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
            payment_capture: 1,
        });
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
    async verifyPayment(orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature, userId, userRole) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        if (order.userId !== userId && userRole !== 'ADMIN') {
            throw new common_1.ForbiddenException('Forbidden: Access denied');
        }
        const keySecret = this.configService.get('RAZORPAY_KEY_SECRET');
        if (!keySecret) {
            throw new common_1.UnauthorizedException('Razorpay secret not configured');
        }
        const expectedSignature = crypto
            .createHmac('sha256', keySecret)
            .update(`${razorpayOrderId}|${razorpayPaymentId}`)
            .digest('hex');
        const sigBuffer = Buffer.from(razorpaySignature, 'utf8');
        const expBuffer = Buffer.from(expectedSignature, 'utf8');
        if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
            throw new common_1.BadRequestException('Invalid payment signature');
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
        await this.notificationService.dispatchPaymentUpdate(order.userId, order.id, 'COMPLETED');
        return { success: true, message: 'Payment verified successfully' };
    }
    async verifyWebhookSignature(payload, signature) {
        const secret = this.configService.get('RAZORPAY_WEBHOOK_SECRET');
        if (!secret) {
            this.logger.error('RAZORPAY_WEBHOOK_SECRET is not configured');
            return false;
        }
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');
        const sigBuffer = Buffer.from(signature, 'utf8');
        const expBuffer = Buffer.from(expectedSignature, 'utf8');
        if (sigBuffer.length !== expBuffer.length) {
            return false;
        }
        return crypto.timingSafeEqual(sigBuffer, expBuffer);
    }
    async handlePaymentWebhook(payload, signature) {
        const rawPayload = typeof payload === 'string' ? payload : JSON.stringify(payload);
        const isValid = await this.verifyWebhookSignature(rawPayload, signature);
        if (!isValid) {
            return { valid: false, event: 'invalid_signature' };
        }
        const event = payload.event;
        const paymentEntity = payload.payload?.payment?.entity;
        if (!paymentEntity) {
            return { valid: true, event: 'ignored_no_entity' };
        }
        switch (event) {
            case 'payment.authorized':
            case 'payment.captured': {
                const razorpayOrderId = paymentEntity.order_id;
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
                if (order.paymentStatus === 'COMPLETED') {
                    return { valid: true, event: 'already_processed', data: paymentEntity };
                }
                const expectedPaise = Math.round(Number(order.finalAmount) * 100);
                const actualPaise = Number(paymentEntity.amount);
                const paidCurrency = String(paymentEntity.currency || '').toUpperCase();
                if (actualPaise !== expectedPaise || paidCurrency !== 'INR') {
                    this.logger.error(`Payment amount mismatch for order ${order.id}: expected ${expectedPaise} INR, received ${actualPaise} ${paidCurrency}`);
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
                await this.notificationService.dispatchPaymentUpdate(order.userId, order.id, 'COMPLETED');
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
                        await this.notificationService.dispatchPaymentUpdate(order.userId, order.id, 'FAILED');
                    }
                }
                return { valid: true, event: 'payment_failed', data: paymentEntity };
            }
            default:
                return { valid: true, event, data: paymentEntity };
        }
    }
    async getOrderForUser(orderId, userId) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: { include: { product: true } },
                payments: true,
            },
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        if (order.userId !== userId) {
            throw new common_1.ForbiddenException('Access denied');
        }
        return order;
    }
    async getPaymentHistory(userId) {
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
        }
        catch (err) {
            this.logger.error(`Database error getting payment history: ${err?.message || err}`);
            return [];
        }
    }
};
exports.PaymentService = PaymentService;
exports.PaymentService = PaymentService = PaymentService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService,
        notification_service_1.NotificationService])
], PaymentService);
//# sourceMappingURL=payment.service.js.map