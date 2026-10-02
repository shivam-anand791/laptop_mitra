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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const config_1 = require("@nestjs/config");
const bcrypt = require("bcrypt");
let UsersService = class UsersService {
    prisma;
    configService;
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
    }
    async findById(id) {
        const user = await this.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                gender: true,
                dob: true,
                address: true,
                city: true,
                state: true,
                pincode: true,
                referralCode: true,
                createdAt: true,
                updatedAt: true,
                role: true,
                status: true,
                imageUrl: true,
            },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return user;
    }
    async updateProfile(userId, updateProfileDto) {
        const { name, gender, dob } = updateProfileDto;
        const user = await this.prisma.user.update({
            where: { id: userId },
            data: {
                name,
                gender,
                dob: dob ? new Date(dob) : undefined,
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                gender: true,
                dob: true,
                address: true,
                city: true,
                state: true,
                pincode: true,
                referralCode: true,
                createdAt: true,
            },
        });
        return user;
    }
    async updateAddress(userId, updateAddressDto) {
        const { phone, address, city, state, pincode } = updateAddressDto;
        const user = await this.prisma.user.update({
            where: { id: userId },
            data: {
                phone,
                address,
                city,
                state,
                pincode,
            },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                address: true,
                city: true,
                state: true,
                pincode: true,
                referralCode: true,
                createdAt: true,
            },
        });
        return user;
    }
    async changePassword(userId, changePasswordDto) {
        const { currentPassword, newPassword } = changePasswordDto;
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, password: true },
        });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            throw new common_1.BadRequestException('Current password is incorrect');
        }
        const hashedPassword = await bcrypt.hash(newPassword, parseInt(this.configService.get('BCRYPT_ROUNDS', '12')));
        await this.prisma.user.update({
            where: { id: userId },
            data: {
                password: hashedPassword,
            },
        });
        return { message: 'Password changed successfully' };
    }
    async getUserStats(userId) {
        const [cartItems, wishlistCount, orderCount] = await Promise.all([
            this.prisma.cartItem.aggregate({
                where: { cart: { userId } },
                _sum: { quantity: true },
            }),
            this.prisma.wishlistItem.count({
                where: { wishlist: { userId } },
            }),
            this.prisma.order.count({
                where: { userId },
            }),
        ]);
        return {
            cartItems: cartItems._sum.quantity || 0,
            wishlistItems: wishlistCount,
            orders: orderCount,
        };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], UsersService);
//# sourceMappingURL=users.service.js.map