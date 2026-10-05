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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const random_service_1 = require("../shared/random.service");
const firebase_service_1 = require("../firebase/firebase.service");
let AuthService = AuthService_1 = class AuthService {
    prisma;
    randomService;
    firebaseService;
    logger = new common_1.Logger(AuthService_1.name);
    constructor(prisma, randomService, firebaseService) {
        this.prisma = prisma;
        this.randomService = randomService;
        this.firebaseService = firebaseService;
    }
    async login(body) {
        throw new common_1.BadRequestException('Direct passwordless authentication is disabled. Authenticate with Firebase and call /auth/sync.');
    }
    async register(body) {
        throw new common_1.BadRequestException('Direct registration without Firebase identity is disabled. Create user with Firebase and call /auth/sync.');
    }
    async guestLogin() {
        throw new common_1.BadRequestException('Direct guest token creation is disabled. Sign in anonymously with Firebase and call /auth/sync.');
    }
    async refreshToken(refreshToken) {
        throw new common_1.BadRequestException('Token refresh is handled directly via the Firebase Auth client SDK.');
    }
    async syncUser(identity, profile = {}) {
        if (!identity || !identity.uid) {
            throw new common_1.UnauthorizedException('Invalid Firebase identity: UID missing');
        }
        const signInProvider = identity.firebase?.sign_in_provider ?? (identity.email ? 'password' : 'anonymous');
        const isGuest = signInProvider === 'anonymous' || !identity.email;
        const cleanEmail = identity.email ? identity.email.trim().toLowerCase() : null;
        try {
            let existingUser = await this.prisma.user.findUnique({
                where: { firebaseUid: identity.uid },
            });
            if (!existingUser && cleanEmail && identity.email_verified === true) {
                const userByEmail = await this.prisma.user.findFirst({
                    where: { email: cleanEmail },
                });
                if (userByEmail && !userByEmail.firebaseUid) {
                    existingUser = await this.prisma.user.update({
                        where: { id: userByEmail.id },
                        data: {
                            firebaseUid: identity.uid,
                            emailVerified: userByEmail.emailVerified || new Date(),
                            authProvider: signInProvider,
                        },
                    });
                }
            }
            const name = profile.name === undefined ? undefined : profile.name.trim() || null;
            const phone = profile.phone === undefined ? undefined : profile.phone.trim() || null;
            if (existingUser) {
                if (existingUser.status !== 'ACTIVE') {
                    throw new common_1.UnauthorizedException('Account is inactive or suspended');
                }
                const verifiedAt = identity.email_verified
                    ? existingUser.emailVerified ?? new Date()
                    : null;
                return await this.prisma.user.update({
                    where: { id: existingUser.id },
                    data: {
                        email: cleanEmail,
                        emailVerified: verifiedAt,
                        authProvider: signInProvider,
                        isGuest: existingUser.isGuest && !isGuest ? false : existingUser.isGuest,
                        ...(name !== undefined ? { name } : {}),
                        ...(phone !== undefined ? { phone } : {}),
                        ...(existingUser.isGuest && !isGuest ? { role: 'CUSTOMER' } : {}),
                    },
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        emailVerified: true,
                        authProvider: true,
                        isGuest: true,
                        role: true,
                        status: true,
                        imageUrl: true,
                        phone: true,
                        createdAt: true,
                        referralCode: true,
                        referralEarnings: true,
                        referralTier: true,
                        firebaseUid: true,
                    },
                });
            }
            try {
                return await this.prisma.user.create({
                    data: {
                        firebaseUid: identity.uid,
                        name: name ?? identity.name?.trim() ?? (cleanEmail ? cleanEmail.split('@')[0].toUpperCase() : 'Guest Customer'),
                        email: cleanEmail,
                        emailVerified: identity.email_verified ? new Date() : null,
                        authProvider: signInProvider,
                        isGuest,
                        role: isGuest ? 'GUEST' : 'CUSTOMER',
                        phone: phone ?? null,
                        status: 'ACTIVE',
                        referralCode: this.randomService.generateReferralCode(),
                    },
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        emailVerified: true,
                        authProvider: true,
                        isGuest: true,
                        role: true,
                        status: true,
                        imageUrl: true,
                        phone: true,
                        createdAt: true,
                        referralCode: true,
                        referralEarnings: true,
                        referralTier: true,
                        firebaseUid: true,
                    },
                });
            }
            catch (createErr) {
                const recheck = await this.prisma.user.findUnique({
                    where: { firebaseUid: identity.uid },
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        emailVerified: true,
                        authProvider: true,
                        isGuest: true,
                        role: true,
                        status: true,
                        imageUrl: true,
                        phone: true,
                        createdAt: true,
                        referralCode: true,
                        referralEarnings: true,
                        referralTier: true,
                        firebaseUid: true,
                    },
                });
                if (recheck) {
                    return recheck;
                }
                throw createErr;
            }
        }
        catch (err) {
            if (err instanceof common_1.UnauthorizedException || err instanceof common_1.BadRequestException) {
                throw err;
            }
            this.logger.error(`Database error during user sync: ${err?.message || err}`);
            throw new common_1.ServiceUnavailableException('Authentication service temporarily unavailable');
        }
    }
    async getUserProfile(userId) {
        try {
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
                    emailVerified: true,
                    authProvider: true,
                    isGuest: true,
                    createdAt: true,
                    referralCode: true,
                    referralEarnings: true,
                    referralTier: true,
                    firebaseUid: true,
                },
            });
            if (!user) {
                throw new common_1.UnauthorizedException('User not found');
            }
            return user;
        }
        catch (err) {
            if (err instanceof common_1.UnauthorizedException) {
                throw err;
            }
            this.logger.error(`Database error getting user profile: ${err?.message || err}`);
            throw new common_1.ServiceUnavailableException('Service temporarily unavailable');
        }
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
        if (data.phone !== undefined) {
            updates.phone = data.phone?.trim() || null;
        }
        if (Object.keys(updates).length === 0) {
            return this.getUserProfile(userId);
        }
        try {
            await this.prisma.user.update({
                where: { id: userId },
                data: updates,
            });
            return this.getUserProfile(userId);
        }
        catch (err) {
            this.logger.error(`Database error updating user profile: ${err?.message || err}`);
            throw new common_1.ServiceUnavailableException('Service temporarily unavailable');
        }
    }
    async signoutEverywhere(userId, firebaseUid) {
        if (firebaseUid) {
            try {
                await this.firebaseService.revokeRefreshTokens(firebaseUid);
            }
            catch (err) {
                this.logger.warn(`Failed to revoke Firebase refresh tokens: ${err?.message || err}`);
            }
        }
        return { success: true, message: 'Signed out of all devices successfully' };
    }
    async deleteAccount(userId, firebaseUid) {
        try {
            await this.prisma.address.deleteMany({ where: { userId } });
            await this.prisma.deviceToken.deleteMany({ where: { userId } });
            await this.prisma.cart.deleteMany({ where: { userId } });
            await this.prisma.wishlist.deleteMany({ where: { userId } });
            await this.prisma.user.update({
                where: { id: userId },
                data: {
                    name: 'Deleted Customer',
                    email: `deleted_${userId.slice(0, 8)}@laptopmitra.local`,
                    phone: null,
                    status: 'DELETED',
                    isGuest: false,
                },
            });
        }
        catch (err) {
            this.logger.error(`Database error deleting user account: ${err?.message || err}`);
            throw new common_1.ServiceUnavailableException('Service temporarily unavailable');
        }
        if (firebaseUid) {
            try {
                await this.firebaseService.deleteUser(firebaseUid);
            }
            catch (err) {
                this.logger.warn(`Failed to delete Firebase user: ${err?.message || err}`);
            }
        }
        return { success: true, message: 'Account deleted and personal information anonymized' };
    }
    async linkGuestAccount(userId, data) {
        throw new common_1.BadRequestException('Account linking must be performed via Firebase Auth client SDK and verified via /auth/sync.');
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        random_service_1.RandomService,
        firebase_service_1.FirebaseService])
], AuthService);
//# sourceMappingURL=auth.service.js.map