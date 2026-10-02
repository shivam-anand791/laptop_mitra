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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcrypt");
const prisma_service_1 = require("../prisma/prisma.service");
const random_service_1 = require("../shared/random.service");
let AuthService = class AuthService {
    prisma;
    jwtService;
    randomService;
    constructor(prisma, jwtService, randomService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.randomService = randomService;
    }
    async register(registerDto) {
        const { name, email, password, phone } = registerDto;
        const existingUser = await this.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            throw new common_1.ConflictException('Email already registered');
        }
        const hashedPassword = await bcrypt.hash(password, 12);
        const referralCode = this.randomService.generateReferralCode();
        const user = await this.prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                referralCode,
                phone: phone || null,
            },
        });
        const payload = { sub: user.id, email: user.email, role: user.role };
        const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
        const refreshToken = this.jwtService.sign(payload, { expiresIn: '30d' });
        await this.prisma.refreshToken.create({
            data: {
                userId: user.id,
                token: refreshToken,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
        });
        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        };
    }
    async login(loginDto) {
        const { email, password } = loginDto;
        const user = await this.prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                name: true,
                email: true,
                password: true,
                role: true,
                status: true,
            },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (user.status !== 'ACTIVE') {
            throw new common_1.UnauthorizedException('Account is suspended');
        }
        const payload = { sub: user.id, email: user.email, role: user.role };
        const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
        const refreshToken = this.jwtService.sign(payload, { expiresIn: '30d' });
        await this.prisma.refreshToken.create({
            data: {
                userId: user.id,
                token: refreshToken,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
        });
        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        };
    }
    async guestLogin() {
        const email = `guest-${(0, node_crypto_1.randomUUID)()}@guest.laptopmitra.invalid`;
        const password = await bcrypt.hash((0, node_crypto_1.randomBytes)(32).toString('hex'), 12);
        const user = await this.prisma.user.create({
            data: {
                name: 'Guest',
                email,
                password,
                role: 'USER',
                referralCode: this.randomService.generateReferralCode(),
            },
        });
        const payload = { sub: user.id, email: user.email, role: user.role };
        const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
        const refreshToken = this.jwtService.sign(payload, { expiresIn: '30d' });
        await this.prisma.refreshToken.create({
            data: {
                userId: user.id,
                token: refreshToken,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
        });
        return {
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        };
    }
    async refreshToken(token) {
        const refreshToken = await this.prisma.refreshToken.findUnique({
            where: { token },
            include: { user: true },
        });
        if (!refreshToken || refreshToken.expiresAt < new Date()) {
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
        if (refreshToken.user.status !== 'ACTIVE') {
            throw new common_1.UnauthorizedException('User account is not active');
        }
        await this.prisma.refreshToken.delete({ where: { id: refreshToken.id } });
        const payload = {
            sub: refreshToken.user.id,
            email: refreshToken.user.email,
            role: refreshToken.user.role,
        };
        const newAccessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
        const newRefreshToken = this.jwtService.sign(payload, { expiresIn: '30d' });
        await this.prisma.refreshToken.create({
            data: {
                userId: refreshToken.user.id,
                token: newRefreshToken,
                expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
        });
        return {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        };
    }
    async logout(userId, token) {
        await this.prisma.refreshToken.deleteMany({ where: { token, userId } });
        return { message: 'Logged out successfully' };
    }
    async getUserProfile(userId) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                role: true,
                status: true,
                imageUrl: true,
                createdAt: true,
                referralCode: true,
                referralEarnings: true,
                referralTier: true,
            },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        return user;
    }
    async updateUserProfile(userId, data) {
        const updates = {};
        if (data.name !== undefined) {
            const trimmedName = data.name.trim();
            if (!trimmedName) {
                throw new common_1.BadRequestException('Name cannot be empty');
            }
            updates.name = trimmedName;
        }
        if (data.email !== undefined) {
            const trimmedEmail = data.email.trim().toLowerCase();
            if (!trimmedEmail) {
                throw new common_1.BadRequestException('Email cannot be empty');
            }
            const existingUser = await this.prisma.user.findUnique({
                where: { email: trimmedEmail },
            });
            if (existingUser && existingUser.id !== userId) {
                throw new common_1.ConflictException('Email already registered');
            }
            updates.email = trimmedEmail;
        }
        if (data.phone !== undefined) {
            updates.phone = data.phone?.trim() || null;
        }
        if (Object.keys(updates).length === 0) {
            return this.getUserProfile(userId);
        }
        await this.prisma.user.update({
            where: { id: userId },
            data: updates,
        });
        return this.getUserProfile(userId);
    }
    async changePassword(userId, data) {
        const currentPassword = data.currentPassword?.trim();
        const newPassword = data.newPassword?.trim();
        if (!currentPassword) {
            throw new common_1.BadRequestException('Current password is required');
        }
        if (!newPassword) {
            throw new common_1.BadRequestException('New password is required');
        }
        if (newPassword.length < 6) {
            throw new common_1.BadRequestException('New password must be at least 6 characters long');
        }
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, password: true },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            throw new common_1.UnauthorizedException('Current password is incorrect');
        }
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await this.prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword },
        });
        return { message: 'Password changed successfully' };
    }
    async validateUser(email, password) {
        const user = await this.prisma.user.findUnique({
            where: { email },
            select: {
                id: true,
                name: true,
                email: true,
                password: true,
                role: true,
                status: true,
            },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (user.status !== 'ACTIVE') {
            throw new common_1.UnauthorizedException('Account is suspended');
        }
        const { password: _pass, ...result } = user;
        return result;
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        random_service_1.RandomService])
], AuthService);
//# sourceMappingURL=auth.service.js.map