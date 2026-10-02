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
exports.WishlistService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let WishlistService = class WishlistService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getOrCreateWishlist(userId) {
        const existing = await this.prisma.wishlist.findFirst({
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
        if (existing) {
            return existing;
        }
        return this.prisma.wishlist.create({
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
    async addItem(userId, productId) {
        const wishlist = await this.getOrCreateWishlist(userId);
        const product = await this.prisma.product.findUnique({
            where: { id: productId },
        });
        if (!product) {
            throw new common_1.NotFoundException(`Product with id ${productId} not found`);
        }
        const existingItem = wishlist.items.find((item) => item.productId === productId);
        if (existingItem) {
            throw new common_1.ConflictException('Item already in wishlist');
        }
        return this.prisma.wishlistItem.create({
            data: {
                wishlist: { connect: { id: wishlist.id } },
                product: { connect: { id: productId } },
            },
            include: { product: true },
        });
    }
    async removeItem(userId, itemId) {
        const wishlist = await this.getOrCreateWishlist(userId);
        const item = await this.prisma.wishlistItem.findUnique({
            where: { id: itemId },
            include: { wishlist: true },
        });
        if (!item || item.wishlistId !== wishlist.id) {
            throw new common_1.NotFoundException('Item not found in wishlist');
        }
        await this.prisma.wishlistItem.delete({ where: { id: itemId } });
    }
    async clearWishlist(userId) {
        const wishlist = await this.getOrCreateWishlist(userId);
        await this.prisma.wishlistItem.deleteMany({ where: { wishlistId: wishlist.id } });
    }
    async getWishlist(userId) {
        const wishlist = await this.getOrCreateWishlist(userId);
        const itemCount = wishlist.items.length;
        return { wishlist, itemCount };
    }
};
exports.WishlistService = WishlistService;
exports.WishlistService = WishlistService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WishlistService);
//# sourceMappingURL=wishlist.service.js.map