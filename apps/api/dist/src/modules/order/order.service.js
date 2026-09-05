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
exports.OrderService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const cart_service_1 = require("../cart/cart.service");
const product_service_1 = require("../product/product.service");
let OrderService = class OrderService {
    prisma;
    cartService;
    productService;
    constructor(prisma, cartService, productService) {
        this.prisma = prisma;
        this.cartService = cartService;
        this.productService = productService;
    }
    async createOrder(userId, referralCode, discountCode, shippingAddress, phone, notes) {
        const { cart, total, itemCount } = await this.cartService.getCart(userId);
        if (itemCount === 0) {
            throw new common_1.BadRequestException('Cart is empty');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user || user.status !== 'ACTIVE') {
            throw new common_1.UnauthorizedException('User not found or inactive');
        }
        let discountAmount = 0;
        let discountType = null;
        let finalAmount = total;
        if (discountCode) {
            const dc = await this.prisma.discountCode.findUnique({
                where: { code: discountCode },
            });
            if (!dc || !dc.isActive) {
                throw new common_1.BadRequestException('Invalid or inactive discount code');
            }
            const now = new Date();
            if (dc.validFrom && now < new Date(dc.validFrom)) {
                throw new common_1.BadRequestException('Discount code not yet valid');
            }
            if (dc.validUntil && now > new Date(dc.validUntil)) {
                throw new common_1.BadRequestException('Discount code expired');
            }
            if (dc.maxUses && dc.uses >= dc.maxUses) {
                throw new common_1.BadRequestException('Discount code has reached maximum usage');
            }
            if (dc.maxUsesPerUser && dc.uses >= dc.maxUsesPerUser) {
                throw new common_1.BadRequestException('Discount code usage limit reached per user');
            }
            if (dc.type === 'percentage') {
                discountAmount = total * (Number(dc.value) / 100);
                if (dc.maxUsesPerUser) {
                }
                discountType = 'percentage';
            }
            else if (dc.type === 'fixed') {
                discountAmount = Number(dc.value);
                discountAmount = Math.min(discountAmount, total);
                discountType = 'fixed';
            }
            else if (dc.type === 'free_shipping') {
                discountAmount = 0;
                discountType = 'free_shipping';
            }
            finalAmount = total - discountAmount;
            await this.prisma.discountCode.update({
                where: { id: dc.id },
                data: { uses: dc.uses + 1 },
            });
        }
        let referralDiscount = 0;
        if (referralCode) {
            const referral = await this.prisma.referral.findUnique({
                where: { code: referralCode },
                include: { user: true },
            });
            if (referral && referral.status === 'ACTIVE') {
                referralDiscount = total * 0.1;
                referralDiscount = Math.min(referralDiscount, finalAmount);
                finalAmount = finalAmount - referralDiscount;
                await this.prisma.referral.update({
                    where: { id: referral.id },
                    data: {
                        earnings: { increment: referralDiscount },
                        referredUsers: { increment: 1 },
                    },
                });
            }
        }
        const orderData = {
            user: { connect: { id: userId } },
            status: 'PENDING',
            paymentStatus: 'PENDING',
            subtotal: total,
            discountAmount,
            discountType,
            finalAmount,
            shippingAddress,
            phone,
            email: user.email,
            notes,
            referralCode,
            referralDiscount,
            items: {
                create: [],
            },
            deliveries: {
                create: {
                    status: 'PENDING',
                },
            },
        };
        for (const item of cart.items) {
            const product = await this.prisma.product.findUnique({
                where: { id: item.productId },
            });
            if (!product) {
                throw new common_1.NotFoundException(`Product with id ${item.productId} not found`);
            }
            orderData.items.create.push({
                product: { connect: { id: product.id } },
                quantity: item.quantity,
                price: item.priceAtAdd,
            });
            const newStock = product.stock - item.quantity;
            await this.prisma.product.update({
                where: { id: product.id },
                data: { stock: newStock },
            });
        }
        const order = await this.prisma.order.create(orderData);
        await this.cartService.clearCart(userId);
        return order;
    }
    async findOne(id) {
        const order = await this.prisma.order.findUnique({
            where: { id },
            include: {
                user: true,
                items: {
                    include: { product: true },
                },
                deliveries: true,
                payments: true,
            },
        });
        if (!order) {
            throw new common_1.NotFoundException(`Order with id ${id} not found`);
        }
        return order;
    }
    async findByUser(userId, status) {
        const where = { userId };
        if (status) {
            where.status = status;
        }
        return await this.prisma.order.findMany({
            where,
            include: {
                items: {
                    include: { product: true },
                },
                deliveries: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async updateStatus(id, status) {
        const order = await this.prisma.order.findUnique({
            where: { id },
        });
        if (!order) {
            throw new common_1.NotFoundException(`Order with id ${id} not found`);
        }
        const updateData = { status };
        if (status === 'DELIVERED') {
            updateData.paymentStatus = 'COMPLETED';
        }
        else if (status === 'CANCELLED') {
            updateData.paymentStatus = 'REFUNDED';
        }
        return await this.prisma.order.update({
            where: { id },
            data: updateData,
        });
    }
};
exports.OrderService = OrderService;
exports.OrderService = OrderService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        cart_service_1.CartService,
        product_service_1.ProductService])
], OrderService);
//# sourceMappingURL=order.service.js.map