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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../prisma/prisma.service");
const crypto = require("crypto");
const Razorpay = require('razorpay');
let PaymentService = class PaymentService {
    configService;
    prisma;
    razorpay;
    constructor(configService, prisma) {
        this.configService = configService;
        this.prisma = prisma;
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
    async createOrder(amount, currency = 'INR', receipt) {
        const amountInPaise = Math.round(amount * 100);
        const order = await this.razorpay.orders.create({
            amount: amountInPaise,
            currency,
            receipt,
            payment_capture: 1,
        });
        const orderId = receipt;
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
    async verifyWebhookSignature(payload, signature) {
        const secret = this.configService.get('RAZORPAY_WEBHOOK_SECRET');
        if (!secret) {
            throw new common_1.UnauthorizedException('Webhook secret not configured');
        }
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');
        return expectedSignature === signature;
    }
    async handlePaymentWebhook(payload, signature) {
        const isValid = await this.verifyWebhookSignature(JSON.stringify(payload), signature);
        if (!isValid) {
            return { valid: false, event: 'invalid_signature' };
        }
        const event = payload.event;
        const paymentEntity = payload.payload?.payment?.entity;
        switch (event) {
            case 'payment.authorized': {
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
            throw new common_1.UnauthorizedException('Access denied');
        }
        return order;
    }
};
exports.PaymentService = PaymentService;
exports.PaymentService = PaymentService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], PaymentService);
//# sourceMappingURL=payment.service.js.map