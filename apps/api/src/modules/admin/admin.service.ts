import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

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

  async updateUserStatus(userId: string, status: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
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

  async updateOrderStatus(orderId: string, status: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const updateData: any = { status };

    // Update payment status based on order status
    if (status === 'DELIVERED') {
      updateData.paymentStatus = 'COMPLETED';
    } else if (status === 'CANCELLED') {
      updateData.paymentStatus = 'REFUNDED';
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: updateData,
    });
  }

  async getDashboardStats() {
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      pendingOrders,
      deliveredOrders,
      completedOrders,
    ] = await Promise.all([
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

    const revenueCompleted = completedOrders.reduce(
      (sum, order) => sum + Number(order.finalAmount),
      0,
    );

    const revenuePending = pendingOrdersData.reduce(
      (sum, order) => sum + Number(order.finalAmount),
      0,
    );

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
}
