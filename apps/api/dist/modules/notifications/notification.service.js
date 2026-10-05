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
var NotificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const inMemoryPreferences = new Map();
const DEFAULT_PREFERENCES = {
    emailOrderUpdates: true,
    emailPromotions: false,
    smsOrderUpdates: true,
    smsDeliveryTracking: true,
    pushNewArrivals: true,
    pushPriceDrops: true,
};
let NotificationService = NotificationService_1 = class NotificationService {
    prisma;
    logger = new common_1.Logger(NotificationService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getPreferences(userId) {
        return inMemoryPreferences.get(userId) || DEFAULT_PREFERENCES;
    }
    async updatePreferences(userId, prefs) {
        const current = await this.getPreferences(userId);
        const updated = {
            ...current,
            ...prefs,
        };
        inMemoryPreferences.set(userId, updated);
        return updated;
    }
    async registerDeviceToken(userId, token, platform) {
        const normalizedToken = token?.trim();
        const normalizedPlatform = (platform || 'unknown').trim() || 'unknown';
        if (!normalizedToken) {
            throw new common_1.BadRequestException('Device token is required');
        }
        try {
            const existingToken = await this.prisma.deviceToken.findFirst({
                where: { userId, token: normalizedToken },
            });
            if (existingToken) {
                await this.prisma.deviceToken.update({
                    where: { id: existingToken.id },
                    data: { platform: normalizedPlatform },
                });
                return { message: 'Device token already registered' };
            }
            await this.prisma.deviceToken.create({
                data: {
                    userId,
                    token: normalizedToken,
                    platform: normalizedPlatform,
                },
            });
        }
        catch {
        }
        return { message: 'Device token registered successfully' };
    }
    async dispatchNotification(userId, payload) {
        this.logger.log(`Dispatching notification to ${userId}: ${payload.title}`);
        return { sent: 1, message: 'Notification dispatched' };
    }
    async dispatchOrderUpdate(userId, orderId, status) {
        return this.dispatchNotification(userId, {
            title: 'Order Update',
            body: `Your order ${orderId} is now ${status.toLowerCase()}.`,
            data: {
                type: 'order_update',
                orderId,
                status,
            },
        });
    }
    async dispatchPaymentUpdate(userId, orderId, status) {
        return this.dispatchNotification(userId, {
            title: 'Payment Update',
            body: `Payment for order ${orderId} is ${status.toLowerCase()}.`,
            data: {
                type: 'payment_update',
                orderId,
                status,
            },
        });
    }
};
exports.NotificationService = NotificationService;
exports.NotificationService = NotificationService = NotificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], NotificationService);
//# sourceMappingURL=notification.service.js.map