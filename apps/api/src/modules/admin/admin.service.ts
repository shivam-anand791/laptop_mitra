import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
  Logger,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FirebaseService } from '../../firebase/firebase.service';
import { PaymentEncryptionService } from '../../common/encryption/payment-encryption.service';
import { QrStorageService } from '../../common/storage/qr-storage.service';
import {
  ORDER_STATUSES,
  OrderStatus,
  USER_STATUSES,
  UserStatus,
  USER_ROLES,
  UserRole,
  ORDER_TRANSITION_MAP,
} from '../../common/constants';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { AdminProductQueryDto } from './dto/admin-product-query.dto';
import { AdminOrderQueryDto } from './dto/admin-order-query.dto';
import { AdminAnalyticsQueryDto } from './dto/admin-analytics-query.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    @Optional() private firebaseService?: FirebaseService,
    @Optional() private encryptionService?: PaymentEncryptionService,
    @Optional() private qrStorageService?: QrStorageService,
    @Optional() private notificationService?: NotificationService,
  ) {}

  async getAllUsers(query?: AdminUserQueryDto) {
    const page = Math.max(1, Number(query?.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (query?.status) {
      where.status = query.status;
    }
    if (query?.role) {
      where.role = query.role;
    }
    if (query?.search && query.search.trim()) {
      const search = query.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { referralCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          referralCode: true,
          referralEarnings: true,
          referralTier: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  async getUserSupportHistory(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const [tickets, returns] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          ticketNumber: true,
          subject: true,
          category: true,
          status: true,
          createdAt: true,
          resolvedAt: true,
          csatScore: true,
          csatComment: true,
        },
      }),
      this.prisma.returnRequest.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          returnNumber: true,
          type: true,
          status: true,
          reason: true,
          createdAt: true,
          order: { select: { orderNumber: true } },
          ticket: { select: { ticketNumber: true } },
        },
      }),
    ]);

    const categoryCounts = tickets.reduce<Record<string, number>>((counts, ticket) => {
      counts[ticket.category] = (counts[ticket.category] || 0) + 1;
      return counts;
    }, {});

    return {
      user,
      ticketCount: tickets.length,
      returnCount: returns.length,
      categoryCounts,
      tickets,
      returns,
    };
  }

  async updateUserStatus(userId: string, status: string, currentAdminId?: string) {
    if (!USER_STATUSES.includes(status as UserStatus)) {
      throw new BadRequestException(`Status must be one of: ${USER_STATUSES.join(', ')}`);
    }

    if (currentAdminId && userId === currentAdminId && status !== 'ACTIVE') {
      throw new BadRequestException('Admins cannot deactivate or suspend their own account');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (currentAdminId && userId === currentAdminId && status !== user.status) {
      throw new BadRequestException('Admins cannot modify their own status');
    }

    if (user.role === 'ADMIN' && currentAdminId && userId !== currentAdminId) {
      throw new BadRequestException('Cannot modify status of another administrator');
    }

    if (user.status === status) {
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        updatedAt: user.updatedAt,
      };
    }

    try {
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { status },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          updatedAt: true,
        },
      });

      if ((status === 'SUSPENDED' || status === 'DELETED') && user.firebaseUid && this.firebaseService) {
        try {
          await this.firebaseService.revokeRefreshTokens(user.firebaseUid);
          this.logger.log(`Revoked Firebase refresh tokens for suspended user ${userId}`);
        } catch (revokeErr: any) {
          this.logger.warn(`Failed to revoke Firebase refresh tokens for user ${userId}: ${revokeErr?.message || revokeErr}`);
        }
      }

      this.logger.log(
        `[AUDIT] User status updated: adminId=${currentAdminId || 'system'}, targetUserId=${userId}, oldStatus=${user.status}, newStatus=${status}, timestamp=${new Date().toISOString()}`
      );

      return updatedUser;
    } catch (err: any) {
      if (err instanceof BadRequestException || err instanceof NotFoundException) {
        throw err;
      }
      this.logger.error(`Database error during updateUserStatus: ${err?.message || err}`);
      throw new ServiceUnavailableException('Database write failed during user status update');
    }
  }

  async updateUserRole(userId: string, role: string, currentAdminId?: string) {
    if (!USER_ROLES.includes(role as UserRole)) {
      throw new BadRequestException(`Role must be one of: ${USER_ROLES.join(', ')}`);
    }

    if (currentAdminId && userId === currentAdminId) {
      throw new BadRequestException('Administrators cannot modify their own role (self-demotion prohibited)');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === role) {
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        updatedAt: user.updatedAt,
      };
    }

    try {
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { role },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          updatedAt: true,
        },
      });

      this.logger.log(
        `[AUDIT] User role updated: adminId=${currentAdminId || 'system'}, targetUserId=${userId}, oldRole=${user.role}, newRole=${role}, timestamp=${new Date().toISOString()}`
      );

      return updatedUser;
    } catch (err: any) {
      if (err instanceof BadRequestException || err instanceof NotFoundException) {
        throw err;
      }
      this.logger.error(`Database error during updateUserRole: ${err?.message || err}`);
      throw new ServiceUnavailableException('Database write failed during user role update');
    }
  }

  async getAllProducts(query?: AdminProductQueryDto) {
    const page = Math.max(1, Number(query?.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (query?.status) {
      where.status = query.status;
    }
    if (query?.categoryId) {
      where.categoryId = query.categoryId;
    }
    if (query?.lowStock) {
      where.stock = { lte: 5 };
    }
    if (query?.search && query.search.trim()) {
      const search = query.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        include: {
          category: true,
          images: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  async createProduct(data: {
    name: string;
    price: number | string;
    sku: string;
    stock?: number;
    description?: string;
    shortDescription?: string;
    categoryId?: string;
    status?: string;
    isFeatured?: boolean;
    isNewArrival?: boolean;
    imageUrl?: string;
    leasePriceMonthly?: number | string;
    bulkSellPrice?: number | string;
    bulkLeasePrice?: number | string;
    metadata?: any;
  }) {
    if (!data.name || !data.sku || data.price === undefined) {
      throw new BadRequestException('Name, price, and SKU are required');
    }

    const price = typeof data.price === 'string' ? parseFloat(data.price) : data.price;
    if (isNaN(price) || price < 0) {
      throw new BadRequestException('Price must be a valid positive number');
    }

    const existing = await this.prisma.product.findUnique({ where: { sku: data.sku } });
    if (existing) {
      throw new BadRequestException(`Product with SKU "${data.sku}" already exists`);
    }

    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '') + `-${Date.now().toString().slice(-4)}`;

    return this.prisma.product.create({
      data: {
        name: data.name,
        slug,
        sku: data.sku,
        price,
        stock: data.stock !== undefined ? Number(data.stock) : 0,
        leasePriceMonthly: data.leasePriceMonthly !== undefined && data.leasePriceMonthly !== null && data.leasePriceMonthly !== '' ? Number(data.leasePriceMonthly) : null,
        bulkSellPrice: data.bulkSellPrice !== undefined && data.bulkSellPrice !== null && data.bulkSellPrice !== '' ? Number(data.bulkSellPrice) : null,
        bulkLeasePrice: data.bulkLeasePrice !== undefined && data.bulkLeasePrice !== null && data.bulkLeasePrice !== '' ? Number(data.bulkLeasePrice) : null,
        description: data.description || null,
        shortDescription: data.shortDescription || null,
        categoryId: data.categoryId || null,
        status: data.status || 'ACTIVE',
        isFeatured: !!data.isFeatured,
        isNewArrival: !!data.isNewArrival,
        metadata: data.metadata || null,
        ...(data.imageUrl
          ? {
              images: {
                create: [
                  {
                    url: data.imageUrl,
                    altText: data.name,
                    isPrimary: true,
                    sortOrder: 0,
                  },
                ],
              },
            }
          : {}),
      },
      include: {
        category: true,
        images: true,
      },
    });
  }

  async updateProduct(id: string, data: any) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.isFeatured !== undefined) updateData.isFeatured = !!data.isFeatured;
    if (data.isNewArrival !== undefined) updateData.isNewArrival = !!data.isNewArrival;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.shortDescription !== undefined) updateData.shortDescription = data.shortDescription;
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
    if (data.stock !== undefined) {
      const stock = Number(data.stock);
      if (isNaN(stock) || stock < 0) throw new BadRequestException('Stock must be a positive integer');
      updateData.stock = stock;
    }
    if (data.price !== undefined) {
      const price = typeof data.price === 'string' ? parseFloat(data.price) : Number(data.price);
      if (isNaN(price) || price < 0) throw new BadRequestException('Price must be a positive number');
      updateData.price = price;
    }
    if (data.leasePriceMonthly !== undefined) {
      updateData.leasePriceMonthly = data.leasePriceMonthly !== null && data.leasePriceMonthly !== '' ? Number(data.leasePriceMonthly) : null;
    }
    if (data.bulkSellPrice !== undefined) {
      updateData.bulkSellPrice = data.bulkSellPrice !== null && data.bulkSellPrice !== '' ? Number(data.bulkSellPrice) : null;
    }
    if (data.bulkLeasePrice !== undefined) {
      updateData.bulkLeasePrice = data.bulkLeasePrice !== null && data.bulkLeasePrice !== '' ? Number(data.bulkLeasePrice) : null;
    }

    return this.prisma.product.update({
      where: { id },
      data: updateData,
      include: {
        category: true,
        images: true,
      },
    });
  }

  async deleteProduct(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Check if referenced by order items
    const orderItemsCount = await this.prisma.orderItem.count({ where: { productId: id } });
    if (orderItemsCount > 0) {
      // Soft-deactivate if order history references it
      return this.prisma.product.update({
        where: { id },
        data: { status: 'DISCONTINUED' },
      });
    }

    // Clean up dependent cart & wishlist items then delete product
    await this.prisma.cartItem.deleteMany({ where: { productId: id } });
    await this.prisma.wishlistItem.deleteMany({ where: { productId: id } });
    await this.prisma.productImage.deleteMany({ where: { productId: id } });

    return this.prisma.product.delete({ where: { id } });
  }

  async getAllOrders(query?: AdminOrderQueryDto) {
    const page = Math.max(1, Number(query?.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (query?.status) {
      where.status = query.status;
    }
    if (query?.paymentStatus) {
      where.paymentStatus = query.paymentStatus;
    }
    if (query?.from || query?.to) {
      where.createdAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }
    if (query?.search && query.search.trim()) {
      const search = query.search.trim();
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        select: {
          id: true,
          orderNumber: true,
          userId: true,
          status: true,
          paymentStatus: true,
          paymentMethod: true,
          subtotal: true,
          discountAmount: true,
          finalAmount: true,
          shippingAddress: true,
          phone: true,
          email: true,
          notes: true,
          createdAt: true,
          updatedAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: {
            select: {
              id: true,
              productId: true,
              quantity: true,
              price: true,
              product: {
                select: {
                  name: true,
                },
              },
            },
          },
          deliveries: {
            select: {
              id: true,
              status: true,
              shippedAt: true,
              deliveredAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  async getOrder(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            status: true,
          },
        },
        items: {
          include: {
            product: {
              include: {
                images: true,
                category: true,
              },
            },
          },
        },
        deliveries: {
          orderBy: { createdAt: 'desc' },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        discountRedemption: {
          include: {
            discountCode: true,
          },
        },
        referralRedemption: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async updateOrderStatus(
    orderId: string,
    status: string,
    adminId?: string,
    courierData?: { courierName?: string; trackingNumber?: string },
  ) {
    if (!ORDER_STATUSES.includes(status as OrderStatus)) {
      throw new BadRequestException(`Status must be one of: ${ORDER_STATUSES.join(', ')}`);
    }

    const targetStatus = status as OrderStatus;

    if (targetStatus === 'SHIPPING') {
      const courierName = courierData?.courierName?.trim();
      const trackingNumber = courierData?.trackingNumber?.trim();
      if (!courierName || !trackingNumber) {
        throw new BadRequestException(
          'Courier name and tracking number are required when moving order to SHIPPING',
        );
      }
    }

    const initialOrder = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        deliveries: true,
      },
    });

    if (!initialOrder) {
      throw new NotFoundException(`Order with id ${orderId} not found`);
    }

    const allowedTransitions = ORDER_TRANSITION_MAP[initialOrder.status as OrderStatus] || [];
    if (!allowedTransitions.includes(targetStatus)) {
      throw new BadRequestException(
        `Cannot transition order from "${initialOrder.status}" to "${targetStatus}". Allowed transitions: ${
          allowedTransitions.length > 0 ? allowedTransitions.join(', ') : 'none (terminal status)'
        }`
      );
    }

    try {
      const updatedOrder = await this.prisma.$transaction(async (tx) => {
        const currentOrder = await tx.order.findUnique({
          where: { id: orderId },
          include: {
            items: true,
            deliveries: true,
          },
        });

        if (!currentOrder) {
          throw new NotFoundException(`Order with id ${orderId} not found`);
        }

        const validTransitionsInTx = ORDER_TRANSITION_MAP[currentOrder.status as OrderStatus] || [];
        if (!validTransitionsInTx.includes(targetStatus)) {
          throw new BadRequestException(
            `Cannot transition order from "${currentOrder.status}" to "${targetStatus}"`
          );
        }

        // 1. Stock restoration when moving to CANCELLED
        if (targetStatus === 'CANCELLED') {
          for (const item of currentOrder.items) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } },
            });
          }
        }

        // 2. Payment status rules:
        // - COMPLETED on DELIVERED only if paymentMethod is cod
        // - REFUNDED on CANCELLED only if paymentStatus was COMPLETED
        // - Never touch paymentStatus for online payments
        let newPaymentStatus: string | undefined = undefined;
        if (targetStatus === 'DELIVERED') {
          if (currentOrder.paymentMethod?.toLowerCase() === 'cod') {
            newPaymentStatus = 'COMPLETED';
          }
        } else if (targetStatus === 'CANCELLED') {
          if (currentOrder.paymentStatus === 'COMPLETED') {
            newPaymentStatus = 'REFUNDED';
          }
        }

        // 3. Update matching Delivery record when relevant
        const existingDelivery = currentOrder.deliveries?.[0];
        const trimmedCourier = courierData?.courierName?.trim();
        const trimmedTracking = courierData?.trackingNumber?.trim();

        if (targetStatus === 'SHIPPING') {
          if (existingDelivery) {
            await tx.delivery.update({
              where: { id: existingDelivery.id },
              data: {
                status: 'SHIPPED',
                carrier: trimmedCourier,
                trackingNumber: trimmedTracking,
                shippedAt: existingDelivery.shippedAt || new Date(),
              },
            });
          } else {
            await tx.delivery.create({
              data: {
                orderId,
                status: 'SHIPPED',
                carrier: trimmedCourier,
                trackingNumber: trimmedTracking,
                shippedAt: new Date(),
              },
            });
          }
        } else if (trimmedCourier || trimmedTracking) {
          if (existingDelivery) {
            await tx.delivery.update({
              where: { id: existingDelivery.id },
              data: {
                ...(trimmedCourier ? { carrier: trimmedCourier } : {}),
                ...(trimmedTracking ? { trackingNumber: trimmedTracking } : {}),
              },
            });
          }
        } else if (targetStatus === 'DELIVERED') {
          if (existingDelivery) {
            await tx.delivery.update({
              where: { id: existingDelivery.id },
              data: {
                status: 'DELIVERED',
                deliveredAt: existingDelivery.deliveredAt || new Date(),
              },
            });
          } else {
            await tx.delivery.create({
              data: {
                orderId,
                status: 'DELIVERED',
                deliveredAt: new Date(),
              },
            });
          }
        } else if (targetStatus === 'CANCELLED') {
          if (existingDelivery) {
            await tx.delivery.update({
              where: { id: existingDelivery.id },
              data: {
                status: 'RETURNED',
              },
            });
          }
        }

        // 4. Update the Order record
        const updateData: any = {
          status: targetStatus,
          ...(newPaymentStatus ? { paymentStatus: newPaymentStatus } : {}),
          updatedAt: new Date(),
        };

        const orderResult = await tx.order.update({
          where: { id: orderId },
          data: updateData,
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
        });

        // 5. Audit trail log
        this.logger.log(
          `[AUDIT] Order status updated: adminId=${adminId || 'system'}, orderId=${orderId}, oldStatus=${currentOrder.status}, newStatus=${targetStatus}, oldPaymentStatus=${currentOrder.paymentStatus}, newPaymentStatus=${orderResult.paymentStatus}, timestamp=${new Date().toISOString()}`
        );

        return orderResult;
      });

      // 6. Trigger branded status email notification (non-blocking for DB consistency)
      if (['CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELLED'].includes(targetStatus)) {
        try {
          await this.notificationService?.dispatchOrderStatusEmail(updatedOrder, targetStatus, courierData);
        } catch (emailErr: any) {
          this.logger.warn(`Failed to dispatch status email for order ${orderId}: ${emailErr?.message || emailErr}`);
        }
      }

      return updatedOrder;
    } catch (err: any) {
      if (err instanceof BadRequestException || err instanceof NotFoundException) {
        throw err;
      }
      this.logger.error(`Database error during updateOrderStatus: ${err?.message || err}`);
      throw new ServiceUnavailableException('Database write failed during order status update');
    }
  }


  async getDashboardStats() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalProducts,
      totalOrders,
      pendingOrders,
      deliveredOrders,
      lowStockProducts,
      ordersToday,
      revenueCompletedAgg,
      revenuePendingAgg,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.product.count(),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: 'PENDING' } }),
      this.prisma.order.count({ where: { status: 'DELIVERED' } }),
      this.prisma.product.count({ where: { stock: { lte: 5 } } }),
      this.prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
      this.prisma.order.aggregate({
        where: { paymentStatus: 'COMPLETED' },
        _sum: { finalAmount: true },
      }),
      this.prisma.order.aggregate({
        where: { paymentStatus: 'PENDING' },
        _sum: { finalAmount: true },
      }),
    ]);

    const revenueCompleted = Number(revenueCompletedAgg._sum?.finalAmount || 0);
    const revenuePending = Number(revenuePendingAgg._sum?.finalAmount || 0);

    return {
      totalUsers,
      totalProducts,
      totalOrders,
      pendingOrders,
      deliveredOrders,
      revenueCompleted,
      revenuePending,
      lowStockProducts,
      ordersToday,
      revenue: {
        completed: revenueCompleted,
        pending: revenuePending,
      },
    };
  }

  async getAnalytics(query?: AdminAnalyticsQueryDto) {
    const range = query?.range || '7d';
    const days = range === '90d' ? 90 : range === '30d' ? 30 : 7;
    const now = new Date();
    const startDate = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);

    // Build zero-filled day array
    const dayKeys: string[] = [];
    const revenueMap = new Map<string, number>();
    const ordersMap = new Map<string, number>();
    const usersMap = new Map<string, number>();

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().split('T')[0];
      dayKeys.push(key);
      revenueMap.set(key, 0);
      ordersMap.set(key, 0);
      usersMap.set(key, 0);
    }
    // 1. Fetch counts in first batch
    const [totalUsers, activeUsers, totalOrders, totalProducts, lowStockProducts] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { status: 'ACTIVE' } }),
        this.prisma.order.count(),
        this.prisma.product.count(),
        this.prisma.product.count({ where: { stock: { lte: 5 } } }),
      ]);

    // 2. Fetch range records in second batch
    const [ordersInRange, usersInRange, topSellingItems] = await Promise.all([
      this.prisma.order.findMany({
        where: { createdAt: { gte: startDate } },
        select: {
          id: true,
          status: true,
          paymentStatus: true,
          finalAmount: true,
          createdAt: true,
        },
      }),
      this.prisma.user.findMany({
        where: { createdAt: { gte: startDate } },
        select: {
          id: true,
          createdAt: true,
        },
      }),
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: {
          createdAt: { gte: startDate },
        },
        _sum: { quantity: true, price: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
    ]);

    let totalRevenue = 0;
    ordersInRange.forEach((o) => {
      const dayKey = new Date(o.createdAt).toISOString().split('T')[0];
      if (ordersMap.has(dayKey)) {
        ordersMap.set(dayKey, (ordersMap.get(dayKey) || 0) + 1);
      }
      if (o.paymentStatus === 'COMPLETED') {
        const amount = Number(o.finalAmount || 0);
        totalRevenue += amount;
        if (revenueMap.has(dayKey)) {
          revenueMap.set(dayKey, (revenueMap.get(dayKey) || 0) + amount);
        }
      }
    });

    usersInRange.forEach((u) => {
      const dayKey = new Date(u.createdAt).toISOString().split('T')[0];
      if (usersMap.has(dayKey)) {
        usersMap.set(dayKey, (usersMap.get(dayKey) || 0) + 1);
      }
    });

    const revenueByDay = dayKeys.map((date) => ({
      date,
      amount: revenueMap.get(date) || 0,
    }));

    const ordersByDay = dayKeys.map((date) => ({
      date,
      count: ordersMap.get(date) || 0,
    }));

    const newUsersByDay = dayKeys.map((date) => ({
      date,
      count: usersMap.get(date) || 0,
    }));

    const statusMap = new Map<string, number>();
    ordersInRange.forEach((o) => {
      statusMap.set(o.status, (statusMap.get(o.status) || 0) + 1);
    });
    const ordersByStatus = Array.from(statusMap.entries()).map(([status, count]) => ({
      status,
      count,
    }));

    // Top 5 products by units sold
    const topProducts: Array<{ id: string; name: string; units: number; revenue: number }> = [];
    const bestSellers: Array<{ name: string; sales: number }> = [];

    if (topSellingItems.length > 0) {
      const productIds = topSellingItems.map((item) => item.productId);
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true },
      });
      const nameMap = new Map(products.map((p) => [p.id, p.name]));
      topSellingItems.forEach((item) => {
        const name = nameMap.get(item.productId) || 'Unknown Product';
        const units = item._sum?.quantity || 0;
        const revenue = Number(item._sum?.price || 0);
        topProducts.push({
          id: item.productId,
          name,
          units,
          revenue,
        });
        bestSellers.push({
          name,
          sales: units,
        });
      });
    }

    const pendingOrders = ordersInRange.filter((o) => o.status === 'PENDING').length;
    const deliveredOrders = ordersInRange.filter((o) => o.status === 'DELIVERED').length;
    const cancelledOrders = ordersInRange.filter((o) => ['CANCELLED', 'REFUNDED'].includes(o.status)).length;
    const conversionRate = ordersInRange.length > 0
      ? Number(((deliveredOrders / ordersInRange.length) * 100).toFixed(1))
      : 0;

    return {
      range,
      revenueByDay,
      ordersByDay,
      ordersByStatus,
      topProducts,
      newUsersByDay,
      summary: {
        totalRevenue,
        totalOrders: ordersInRange.length,
        totalNewUsers: usersInRange.length,
      },
      // Backwards-compatible nested objects for existing UI components
      revenue: {
        daily: revenueByDay,
        total: totalRevenue,
        growth: 0,
      },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        completed: deliveredOrders,
        cancelled: cancelledOrders,
        conversionRate,
      },
      users: {
        total: totalUsers,
        active: activeUsers,
        newThisMonth: usersInRange.length,
        growth: 0,
      },
      products: {
        total: totalProducts,
        lowStock: lowStockProducts,
        bestSellers,
      },
    };
  }

  async getSettings() {
    const defaults = {
      storeName: 'LaptopMitra',
      supportEmail: 'support@laptopmitra.com',
      contactPhone: '+91-1800-123-4567',
      storeAddress: '123 Tech Park, Bangalore, Karnataka 560001',
      lowStockThreshold: 5,
      freeShippingThreshold: 999,
      standardDeliveryDays: '3-5',
      expressDeliveryDays: '1-2',
    };

    try {
      const rows = await this.prisma.$queryRaw<Array<{ key: string; value: string }>>`
        SELECT "key", "value" FROM "system_settings"
      `;

      const settings: Record<string, any> = { ...defaults };
      for (const row of rows) {
        if (row.key === 'lowStockThreshold' || row.key === 'freeShippingThreshold') {
          settings[row.key] = Number(row.value);
        } else {
          settings[row.key] = row.value;
        }
      }
      return settings;
    } catch (err: any) {
      this.logger.warn(`Failed to read system_settings, falling back to defaults: ${err?.message || err}`);
      return defaults;
    }
  }

  async updateSettings(dto: UpdateSettingsDto, adminId?: string) {
    try {
      for (const [key, val] of Object.entries(dto)) {
        if (val !== undefined && val !== null) {
          const stringVal = String(val);
          await this.prisma.$executeRaw`
            INSERT INTO "system_settings" ("key", "value", "updatedAt")
            VALUES (${key}, ${stringVal}, NOW())
            ON CONFLICT ("key")
            DO UPDATE SET "value" = ${stringVal}, "updatedAt" = NOW()
          `;
        }
      }

      this.logger.log(`[AUDIT] Platform settings updated by adminId=${adminId || 'system'}`);
      return await this.getSettings();
    } catch (err: any) {
      this.logger.error(`Failed to update system_settings: ${err?.message || err}`);
      throw new ServiceUnavailableException('Database error saving administrative settings');
    }
  }

  async getCorporateInquiries(params?: { status?: string; page?: number; pageSize?: number }) {
    const page = Math.max(1, params?.page || 1);
    const pageSize = Math.max(1, Math.min(100, params?.pageSize || 20));
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (params?.status && params.status !== 'all') {
      where.status = params.status;
    }

    const [items, total] = await Promise.all([
      this.prisma.corporateInquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.corporateInquiry.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  async updateCorporateInquiryStatus(
    id: string,
    status: 'PENDING' | 'CONTACTED' | 'QUOTED' | 'CLOSED',
    adminId?: string,
    adminNotes?: string,
  ) {
    const allowed = ['PENDING', 'CONTACTED', 'QUOTED', 'CLOSED'];
    if (!allowed.includes(status)) {
      throw new BadRequestException(`Status must be one of: ${allowed.join(', ')}`);
    }

    const existing = await this.prisma.corporateInquiry.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Corporate inquiry with id ${id} not found`);
    }

    const updated = await this.prisma.corporateInquiry.update({
      where: { id },
      data: {
        status,
        ...(adminNotes ? { notes: existing.notes ? `${existing.notes}\n[Admin]: ${adminNotes}` : `[Admin]: ${adminNotes}` } : {}),
      },
    });

    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserId: adminId || null,
          action: 'UPDATE_INQUIRY_STATUS',
          entityType: 'CORPORATE_INQUIRY',
          entityId: id,
          metadata: {
            previousStatus: existing.status,
            newStatus: status,
            adminNotes: adminNotes || null,
          },
        },
      });
    } catch (auditErr: any) {
      this.logger.warn(`Failed to create audit log for inquiry update: ${auditErr?.message || auditErr}`);
    }

    return updated;
  }

  // ---------------------------------------------------------------------------
  // Affiliate & Payout Management (Section 5.1)
  // ---------------------------------------------------------------------------

  async getAffiliates(query?: { page?: number; pageSize?: number; search?: string }) {
    const page = Math.max(1, Number(query?.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query?.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const where: any = {
      role: 'CUSTOMER',
    };

    if (query?.search && query.search.trim()) {
      const search = query.search.trim();
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { referralCode: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ referralEarnings: 'desc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          name: true,
          email: true,
          referralCode: true,
          referralTier: true,
          referralEarnings: true,
          referralReserved: true,
          referralWithdrawn: true,
          referralLinkClickedCount: true,
          createdAt: true,
          _count: {
            select: {
              withdrawalRequests: true,
            },
          },
          withdrawalRequests: {
            where: { status: 'PENDING' },
            select: { id: true },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    const items = users.map((u) => {
      const earnings = Number(u.referralEarnings || 0);
      const reserved = Number(u.referralReserved || 0);
      const withdrawn = Number(u.referralWithdrawn || 0);
      const availableBalance = Math.max(0, earnings - reserved - withdrawn);

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        referralCode: u.referralCode,
        referralTier: u.referralTier,
        referralEarnings: earnings,
        referralReserved: reserved,
        referralWithdrawn: withdrawn,
        availableBalance,
        clicksCount: u.referralLinkClickedCount,
        pendingWithdrawalsCount: u.withdrawalRequests.length,
        totalWithdrawalsCount: u._count.withdrawalRequests,
        createdAt: u.createdAt,
      };
    });

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  async getAffiliateDetail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        role: true,
        referralCode: true,
        referralTier: true,
        referralEarnings: true,
        referralReserved: true,
        referralWithdrawn: true,
        referralLinkClickedCount: true,
        createdAt: true,
        affiliatePaymentDetails: {
          select: {
            id: true,
            bankName: true,
            accountHolderName: true,
            accountNumberMasked: true,
            ifscCode: true,
            upiIdMasked: true,
            qrCodeKey: true,
            updatedAt: true,
          },
        },
        withdrawalRequests: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            amount: true,
            status: true,
            adminNotes: true,
            processedAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`Affiliate user with ID ${userId} not found`);
    }

    const earnings = Number(user.referralEarnings || 0);
    const reserved = Number(user.referralReserved || 0);
    const withdrawn = Number(user.referralWithdrawn || 0);
    const availableBalance = Math.max(0, earnings - reserved - withdrawn);

    let ifscCodeMasked: string | null = null;
    if (user.affiliatePaymentDetails?.ifscCode && this.encryptionService) {
      try {
        const decryptedIfsc = this.encryptionService.decrypt(user.affiliatePaymentDetails.ifscCode);
        ifscCodeMasked = this.encryptionService.maskIfsc(decryptedIfsc);
      } catch {
        ifscCodeMasked = '••••••••';
      }
    }

    const payoutDetails = user.affiliatePaymentDetails
      ? {
          bankName: user.affiliatePaymentDetails.bankName,
          accountHolderName: user.affiliatePaymentDetails.accountHolderName,
          accountNumberMasked: user.affiliatePaymentDetails.accountNumberMasked,
          ifscCodeMasked,
          upiIdMasked: user.affiliatePaymentDetails.upiIdMasked,
          hasQrCode: Boolean(user.affiliatePaymentDetails.qrCodeKey),
          updatedAt: user.affiliatePaymentDetails.updatedAt,
        }
      : null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      status: user.status,
      role: user.role,
      referralCode: user.referralCode,
      referralTier: user.referralTier,
      referralEarnings: earnings,
      referralReserved: reserved,
      referralWithdrawn: withdrawn,
      availableBalance,
      referralLinkClickedCount: user.referralLinkClickedCount,
      payoutDetails,
      ledger: user.withdrawalRequests.map((w) => ({
        id: w.id,
        amount: Number(w.amount),
        status: w.status,
        adminNotes: w.adminNotes,
        processedAt: w.processedAt,
        createdAt: w.createdAt,
      })),
      createdAt: user.createdAt,
    };
  }

  async getWithdrawalPaymentDetails(withdrawalId: string, adminId?: string) {
    const withdrawal = await this.prisma.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!withdrawal) {
      throw new NotFoundException(`Withdrawal request with ID ${withdrawalId} not found`);
    }

    if (!this.encryptionService) {
      throw new ServiceUnavailableException('Payment encryption service is unavailable');
    }

    const decryptedSnapshot = this.encryptionService.decrypt(withdrawal.paymentMethodSnapshot);
    let parsedSnapshot: any;
    try {
      parsedSnapshot = JSON.parse(decryptedSnapshot);
    } catch {
      throw new BadRequestException('Corrupted payment snapshot data');
    }

    // Write audit log entry (NO plain decrypted secrets in metadata!)
    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserId: adminId || null,
          action: 'VIEW_PAYMENT_SNAPSHOT',
          entityType: 'WITHDRAWAL_REQUEST',
          entityId: withdrawalId,
          metadata: {
            withdrawalAmount: Number(withdrawal.amount),
            recipientUserId: withdrawal.userId,
            viewedAt: new Date().toISOString(),
          },
        },
      });
    } catch (auditErr: any) {
      this.logger.warn(`Could not create audit log for snapshot view: ${auditErr?.message || auditErr}`);
    }

    return {
      withdrawalId: withdrawal.id,
      userId: withdrawal.userId,
      user: withdrawal.user,
      amount: Number(withdrawal.amount),
      status: withdrawal.status,
      adminNotes: withdrawal.adminNotes,
      processedAt: withdrawal.processedAt,
      createdAt: withdrawal.createdAt,
      paymentDetails: parsedSnapshot,
    };
  }

  async getWithdrawalQrFile(withdrawalId: string, adminId?: string) {
    const withdrawal = await this.prisma.withdrawalRequest.findUnique({
      where: { id: withdrawalId },
    });

    if (!withdrawal) {
      throw new NotFoundException(`Withdrawal request with ID ${withdrawalId} not found`);
    }

    if (!this.encryptionService || !this.qrStorageService) {
      throw new ServiceUnavailableException('Encryption or storage service is unavailable');
    }

    const decryptedSnapshot = this.encryptionService.decrypt(withdrawal.paymentMethodSnapshot);
    let parsed: any;
    try {
      parsed = JSON.parse(decryptedSnapshot);
    } catch {
      throw new BadRequestException('Corrupted payment snapshot data');
    }

    if (!parsed.qrCodeKey) {
      throw new NotFoundException('No QR code attached to this withdrawal request');
    }

    // Write audit log entry
    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserId: adminId || null,
          action: 'VIEW_PAYMENT_QR',
          entityType: 'WITHDRAWAL_REQUEST',
          entityId: withdrawalId,
          metadata: {
            qrCodeKey: parsed.qrCodeKey,
            viewedAt: new Date().toISOString(),
          },
        },
      });
    } catch (auditErr: any) {
      this.logger.warn(`Could not create audit log for QR view: ${auditErr?.message || auditErr}`);
    }

    return this.qrStorageService.getQrFile(parsed.qrCodeKey);
  }

  async updateWithdrawalStatus(
    withdrawalId: string,
    status: 'APPROVED' | 'REJECTED',
    adminId?: string,
    adminNotes?: string,
  ) {
    if (status !== 'APPROVED' && status !== 'REJECTED') {
      throw new BadRequestException("Status must be either 'APPROVED' or 'REJECTED'");
    }

    if (status === 'REJECTED' && (!adminNotes || !adminNotes.trim())) {
      throw new BadRequestException('Rejection notes (adminNotes) are mandatory when rejecting a withdrawal request');
    }

    return await this.prisma.$transaction(async (tx) => {
      // Row lock on WithdrawalRequest to prevent race conditions & double processing
      const rows = await tx.$queryRaw<any[]>`
        SELECT id, "userId", amount, status
        FROM "WithdrawalRequest"
        WHERE id = ${withdrawalId}
        FOR UPDATE
      `;

      if (!rows || rows.length === 0) {
        throw new NotFoundException(`Withdrawal request with ID ${withdrawalId} not found`);
      }

      const withdrawal = rows[0];

      if (withdrawal.status !== 'PENDING') {
        throw new ConflictException(
          `Withdrawal request has already been processed with status "${withdrawal.status}"`
        );
      }

      const amount = Number(withdrawal.amount);
      const userId = withdrawal.userId;

      if (status === 'APPROVED') {
        // Move amount from reserved to withdrawn
        await tx.user.update({
          where: { id: userId },
          data: {
            referralReserved: { decrement: amount },
            referralWithdrawn: { increment: amount },
          },
        });
      } else {
        // REJECTED: return reserved funds back to available balance
        await tx.user.update({
          where: { id: userId },
          data: {
            referralReserved: { decrement: amount },
          },
        });
      }

      const updated = await tx.withdrawalRequest.update({
        where: { id: withdrawalId },
        data: {
          status,
          adminNotes: adminNotes?.trim() || null,
          processedAt: new Date(),
        },
      });

      // Write audit log entry
      await tx.auditLog.create({
        data: {
          actorUserId: adminId || null,
          action: status === 'APPROVED' ? 'APPROVE_WITHDRAWAL' : 'REJECT_WITHDRAWAL',
          entityType: 'WITHDRAWAL_REQUEST',
          entityId: withdrawalId,
          metadata: {
            amount,
            previousStatus: withdrawal.status,
            newStatus: status,
            adminNotes: adminNotes?.trim() || null,
          },
        },
      });

      return {
        id: updated.id,
        userId: updated.userId,
        amount: Number(updated.amount),
        status: updated.status,
        adminNotes: updated.adminNotes,
        processedAt: updated.processedAt,
        updatedAt: updated.updatedAt,
      };
    });
  }
}
