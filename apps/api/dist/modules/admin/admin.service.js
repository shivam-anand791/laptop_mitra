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
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let AdminService = class AdminService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getAllUsers() {
        return this.prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                referralCode: true,
                referralEarnings: true,
                referralTier: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async updateUserStatus(userId, status) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        const validStatus = ['ACTIVE', 'SUSPENDED', 'DELETED'].includes(status) ? status : 'ACTIVE';
        return this.prisma.user.update({
            where: { id: userId },
            data: { status: validStatus },
        });
    }
    async getAllProducts() {
        return this.prisma.product.findMany({
            include: {
                category: true,
                images: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async getAllOrders() {
        return this.prisma.order.findMany({
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                items: {
                    include: {
                        product: true,
                    },
                },
                deliveries: true,
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async updateOrderStatus(orderId, status) {
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        const updateData = { status };
        if (status === 'DELIVERED') {
            updateData.paymentStatus = 'COMPLETED';
        }
        else if (status === 'CANCELLED') {
            updateData.paymentStatus = 'REFUNDED';
        }
        return this.prisma.order.update({
            where: { id: orderId },
            data: updateData,
        });
    }
    async getDashboardStats() {
        const [totalUsers, totalProducts, totalOrders, pendingOrders, deliveredOrders, completedOrders,] = await Promise.all([
            this.prisma.user.count(),
            this.prisma.product.count(),
            this.prisma.order.count(),
            this.prisma.order.count({ where: { status: 'PENDING' } }),
            this.prisma.order.count({ where: { status: 'DELIVERED' } }),
            this.prisma.order.findMany({
                where: { paymentStatus: 'COMPLETED' },
                select: { finalAmount: true },
            }),
        ]);
        const pendingOrdersData = await this.prisma.order.findMany({
            where: { paymentStatus: 'PENDING' },
            select: { finalAmount: true },
        });
        const revenueCompleted = completedOrders.reduce((sum, order) => sum + Number(order.finalAmount), 0);
        const revenuePending = pendingOrdersData.reduce((sum, order) => sum + Number(order.finalAmount), 0);
        return {
            totalUsers,
            totalProducts,
            totalOrders,
            pendingOrders,
            deliveredOrders,
            revenueCompleted,
            revenuePending,
        };
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AdminService);
//# sourceMappingURL=admin.service.js.map