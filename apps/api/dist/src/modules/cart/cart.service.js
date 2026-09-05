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
exports.CartService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const product_service_1 = require("../product/product.service");
let CartService = class CartService {
    prisma;
    productService;
    constructor(prisma, productService) {
        this.prisma = prisma;
        this.productService = productService;
    }
    async getOrCreateCart(userId) {
        const existingCart = await this.prisma.cart.findFirst({
            where: { userId },
            include: {
                items: {
                    include: {
                        product: {
                            include: { images: true },
                        },
                    },
                },
            },
        });
        if (existingCart) {
            return existingCart;
        }
        return this.prisma.cart.create({
            data: {
                user: { connect: { id: userId } },
            },
            include: {
                items: {
                    include: {
                        product: {
                            include: { images: true },
                        },
                    },
                },
            },
        });
    }
    async addItem(userId, productId, quantity = 1) {
        const cart = await this.getOrCreateCart(userId);
        const product = await this.prisma.product.findUnique({
            where: { id: productId },
        });
        if (!product) {
            throw new common_1.NotFoundException(`Product with id ${productId} not found`);
        }
        const existingItem = cart.items.find((item) => item.productId === productId);
        if (existingItem) {
            const newQuantity = existingItem.quantity + quantity;
            if (newQuantity > product.stock && !product.allowBackorder) {
                throw new common_1.BadRequestException(`Only ${product.stock} items in stock`);
            }
            return this.prisma.cartItem.update({
                where: { id: existingItem.id },
                data: { quantity: newQuantity },
                include: { product: true },
            });
        }
        if (quantity > product.stock && !product.allowBackorder) {
            throw new common_1.BadRequestException(`Only ${product.stock} items in stock`);
        }
        return this.prisma.cartItem.create({
            data: {
                cart: { connect: { id: cart.id } },
                product: { connect: { id: productId } },
                quantity,
                priceAtAdd: product.price,
            },
            include: { product: true },
        });
    }
    async removeItem(userId, itemId) {
        const cart = await this.getOrCreateCart(userId);
        const item = await this.prisma.cartItem.findUnique({
            where: { id: itemId },
            include: { cart: true },
        });
        if (!item || item.cartId !== cart.id) {
            throw new common_1.NotFoundException('Item not found in cart');
        }
        await this.prisma.cartItem.delete({ where: { id: itemId } });
    }
    async updateQuantity(userId, itemId, quantity) {
        const cart = await this.getOrCreateCart(userId);
        const item = await this.prisma.cartItem.findUnique({
            where: { id: itemId },
            include: { product: true, cart: true },
        });
        if (!item || item.cartId !== cart.id) {
            throw new common_1.NotFoundException('Item not found in cart');
        }
        if (quantity <= 0) {
            await this.prisma.cartItem.delete({ where: { id: itemId } });
            return { ...item, quantity: 0 };
        }
        if (quantity > item.product.stock && !item.product.allowBackorder) {
            throw new common_1.BadRequestException(`Only ${item.product.stock} items in stock`);
        }
        return this.prisma.cartItem.update({
            where: { id: itemId },
            data: { quantity },
            include: { product: true },
        });
    }
    async clearCart(userId) {
        const cart = await this.getOrCreateCart(userId);
        await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    }
    async getCart(userId) {
        const cart = await this.getOrCreateCart(userId);
        const total = cart.items.reduce((sum, item) => {
            const price = typeof item.priceAtAdd === 'object' ? Number(item.priceAtAdd) : item.priceAtAdd;
            return sum + price * item.quantity;
        }, 0);
        const itemCount = cart.items.reduce((count, item) => count + item.quantity, 0);
        return { cart, total: Number(total.toFixed(2)), itemCount };
    }
};
exports.CartService = CartService;
exports.CartService = CartService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        product_service_1.ProductService])
], CartService);
//# sourceMappingURL=cart.service.js.map