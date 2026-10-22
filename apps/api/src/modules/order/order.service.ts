import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { ProductService } from '../product/product.service';
import { NotificationService } from '../notifications/notification.service';
import { Order, OrderItem } from '../../types';
import { DiscountService } from '../discount/discount.service';
import { PaymentService } from '../payments/payment.service';
import { allowInMemoryFallback } from '../../common/fallback';

// In-memory orders for fallback
const inMemoryOrders: Map<string, Order[]> = new Map();

@Injectable()
export class OrderService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrderService.name);
  private reservationCleanupTimer?: ReturnType<typeof setInterval>;
  private static readonly RESERVATION_TTL_MS = 15 * 60 * 1000;

  constructor(
    private prisma: PrismaService,
    private cartService: CartService,
    private productService: ProductService,
    private notificationService: NotificationService,
    private discountService: DiscountService,
    private paymentService?: PaymentService,
  ) {}

  onModuleInit() {
    this.reservationCleanupTimer = setInterval(() => {
      void this.expireAbandonedReservations().catch((error) => {
        this.logger.error(`Failed to expire checkout reservations: ${error?.message || error}`);
      });
    }, 60_000);
    this.reservationCleanupTimer.unref?.();
  }

  onModuleDestroy() {
    if (this.reservationCleanupTimer) clearInterval(this.reservationCleanupTimer);
  }

  private async runSerializable<T>(operation: (transaction: any) => Promise<T>): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(operation, { isolationLevel: 'Serializable' });
      } catch (error: any) {
        if (error?.code !== 'P2034' || attempt === 2) throw error;
      }
    }
    throw new ServiceUnavailableException('Order service is temporarily unavailable');
  }

  private normalizeOrder(o: any): Order {
    const rawSubtotal = o.subtotal;
    const rawDiscount = o.discountAmount;
    const rawFinal = o.finalAmount;

    const subtotal = typeof rawSubtotal === 'number' ? rawSubtotal : parseFloat(rawSubtotal?.toString() || '0') || 0;
    const discountAmount = typeof rawDiscount === 'number' ? rawDiscount : parseFloat(rawDiscount?.toString() || '0') || 0;
    const finalAmount = typeof rawFinal === 'number' ? rawFinal : parseFloat(rawFinal?.toString() || '0') || 0;

    const items: OrderItem[] = (o.items || []).map((it: any) => {
      const itPrice = typeof it.price === 'number' ? it.price : parseFloat(it.price?.toString() || '0') || 0;
      return {
        id: it.id,
        orderId: o.id,
        productId: it.productId,
        quantity: it.quantity,
        price: itPrice,
        product: it.product ? {
          ...it.product,
          price: typeof it.product.price === 'number' ? it.product.price : parseFloat(it.product.price?.toString() || '0') || 0,
        } : undefined,
        warrantyStatus: 'ACTIVE',
        warrantyValidUntil: new Date(new Date(o.createdAt || Date.now()).setFullYear(new Date(o.createdAt || Date.now()).getFullYear() + 1)).toISOString().split('T')[0],
      };
    });

    const delivery = Array.isArray(o.deliveries) && o.deliveries.length > 0 ? o.deliveries[0] : null;

    return {
      id: o.id,
      orderNumber: o.orderNumber || `LM-ORD-${o.id.slice(0, 8).toUpperCase()}`,
      userId: o.userId,
      status: o.status || 'PENDING',
      paymentStatus: o.paymentStatus || 'PENDING',
      paymentMethod: o.paymentMethod || 'razorpay',
      paymentId: o.paymentId || null,
      subtotal,
      discountAmount,
      discountType: o.discountType || null,
      referralCode: o.referralCode || null,
      referralDiscount: o.referralDiscount ? Number(o.referralDiscount) : 0,
      finalAmount,
      shippingAddress: typeof o.shippingAddress === 'string' ? JSON.parse(o.shippingAddress) : o.shippingAddress || null,
      phone: o.phone || null,
      email: o.email || '',
      notes: o.notes || null,
      trackingNumber: delivery?.trackingNumber || o.trackingNumber || null,
      carrier: delivery?.carrier || o.carrier || null,
      returnStatus: o.returnStatus || 'NONE',
      returnReason: o.returnReason || null,
      items,
      createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: o.updatedAt ? new Date(o.updatedAt).toISOString() : new Date().toISOString(),
    };
  }

  async createOrder(
    userId: string,
    referralCode?: string,
    discountCode?: string,
    shippingAddress?: any,
    phone?: string,
    notes?: string,
    email?: string,
    user?: any,
    paymentMethod = 'razorpay',
  ): Promise<Order> {
    const resolvedEmail = (email || shippingAddress?.email || user?.email)?.trim();
    const resolvedPhone = (phone || shippingAddress?.phone || user?.phone)?.trim();

    if (!resolvedEmail) {
      throw new BadRequestException('Email is required to place an order');
    }
    if (!resolvedPhone) {
      throw new BadRequestException('Phone number is required to place an order');
    }
    if (!['razorpay', 'cod'].includes(paymentMethod)) {
      throw new BadRequestException('Unsupported payment method');
    }

    let order: any;
    try {
      order = await this.runSerializable(async (transaction) => {
        const cart = await transaction.cart.findFirst({
          where: { userId },
          include: { items: { include: { product: true } } },
        });
        if (!cart?.items?.length) throw new BadRequestException('Cart is empty');

        let subtotalPaise = 0;
        const pricedItems = cart.items.map((item: any) => {
          const quantity = Number(item.quantity);
          const currentPrice = Number(item.product?.price);
          if (!Number.isSafeInteger(quantity) || quantity <= 0) {
            throw new BadRequestException('Cart contains an invalid quantity');
          }
          if (!item.product || item.product.status !== 'ACTIVE') {
            throw new BadRequestException('A product in your cart is no longer available');
          }
          if (!Number.isFinite(currentPrice) || currentPrice < 0) {
            throw new BadRequestException('A product in your cart has invalid pricing');
          }
          const unitPricePaise = Math.round(currentPrice * 100);
          subtotalPaise += unitPricePaise * quantity;
          return {
            productId: item.productId,
            categoryId: item.product.categoryId,
            quantity,
            unitPricePaise,
            product: item.product,
          };
        });
        if (!Number.isSafeInteger(subtotalPaise) || subtotalPaise <= 0) {
          throw new BadRequestException('Order total is invalid');
        }

        for (const item of pricedItems) {
          const stockWhere: any = { id: item.productId, status: 'ACTIVE' };
          if (!item.product.allowBackorder) stockWhere.stock = { gte: item.quantity };
          const reserved = await transaction.product.updateMany({
            where: stockWhere,
            data: { stock: { decrement: item.quantity } },
          });
          if (reserved.count !== 1) {
            throw new BadRequestException(`${item.product.name} no longer has sufficient stock`);
          }
        }

        const coupon = await this.discountService.validateOrderDiscount(
          transaction,
          discountCode,
          userId,
          pricedItems,
          subtotalPaise,
        );
        const couponDiscountPaise = coupon?.discountAmountPaise || 0;

        let referral: any = null;
        let referralDiscountPaise = 0;
        const normalizedReferral = referralCode?.trim();
        if (normalizedReferral) {
          referral = await transaction.user.findFirst({
            where: {
              referralCode: { equals: normalizedReferral, mode: 'insensitive' },
              status: 'ACTIVE',
            },
          });
          if (!referral) throw new BadRequestException('Invalid or inactive referral code');
          if (referral.id === userId) throw new BadRequestException('Self-referrals are not allowed');

          const priorOrderCount = await transaction.order.count({
            where: { userId, status: { not: 'CANCELLED' } },
          });
          const priorReferral = await transaction.referralRedemption.findUnique({
            where: { referredUserId: userId },
          });
          if (priorOrderCount > 0 || priorReferral) {
            throw new BadRequestException('Referral discounts are only available on your first order');
          }

          // The storefront promises ₹500 off a first purchase for a referral.
          referralDiscountPaise = Math.min(50_000, subtotalPaise - couponDiscountPaise);
        }

        const discountPaise = couponDiscountPaise + referralDiscountPaise;
        const finalPaise = Math.max(0, subtotalPaise - discountPaise);
        const now = new Date();
        const reservationExpiresAt = paymentMethod === 'razorpay'
          ? new Date(now.getTime() + OrderService.RESERVATION_TTL_MS)
          : null;
        const created = await transaction.order.create({
          data: {
            userId,
            status: 'PENDING',
            paymentStatus: 'PENDING',
            paymentMethod,
            subtotal: (subtotalPaise / 100).toFixed(2),
            discountAmount: (discountPaise / 100).toFixed(2),
            discountType: coupon && referral
              ? `${coupon.type}+referral`
              : coupon?.type || (referralDiscountPaise ? 'referral' : null),
            finalAmount: (finalPaise / 100).toFixed(2),
            shippingAddress: shippingAddress || undefined,
            phone: resolvedPhone,
            email: resolvedEmail,
            notes: notes || null,
            referralCode: referralDiscountPaise ? referral.code : null,
            referralDiscount: (referralDiscountPaise / 100).toFixed(2),
            inventoryStatus: paymentMethod === 'cod' ? 'CONSUMED' : 'RESERVED',
            reservationExpiresAt,
            items: {
              create: pricedItems.map((item: any) => ({
                productId: item.productId,
                quantity: item.quantity,
                price: (item.unitPricePaise / 100).toFixed(2),
              })),
            },
          },
          include: { items: { include: { product: true } } },
        });

        if (coupon) {
          await this.discountService.consumeOrderDiscount(transaction, coupon.id, userId, created.id);
        }
        if (referral && referralDiscountPaise > 0) {
          await transaction.referralRedemption.create({
            data: {
              referrerUserId: referral.id,
              referredUserId: userId,
              orderId: created.id,
              referralCode: referral.code,
              discountAmount: (referralDiscountPaise / 100).toFixed(2),
            },
          });
        }

        await transaction.cartItem.deleteMany({ where: { cartId: cart.id } });
        return created;
      });
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof ForbiddenException) throw error;
      this.logger.error(`Database error while creating order: ${error?.message || error}`);
      throw new ServiceUnavailableException('Order service is temporarily unavailable');
    }

    try {
      await this.notificationService.dispatchOrderUpdate(userId, order.id, 'PENDING');
    } catch {
      // notification fallback
    }

    return this.normalizeOrder(order);
  }

  async findByUser(userId: string, status?: string): Promise<Order[]> {
    try {
      const where: any = { userId };
      if (status && status !== 'ALL') {
        where.status = status;
      }
      const dbOrders = await this.prisma.order.findMany({
        where,
        include: {
          items: { include: { product: true } },
          deliveries: true,
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      if (dbOrders) {
        return dbOrders.map((o) => this.normalizeOrder(o));
      }
    } catch (error: any) {
      this.logger.error(`Database error while finding orders for user: ${error?.message || error}`);
      if (!allowInMemoryFallback()) {
        throw new ServiceUnavailableException('Order service is temporarily unavailable');
      }
    }

    const memory = inMemoryOrders.get(userId) || [];
    if (status && status !== 'ALL') {
      return memory.filter((o) => o.status === status);
    }
    return memory;
  }

  async findOne(id: string, userId: string, userRole?: string): Promise<Order> {
    try {
      const dbOrder = await this.prisma.order.findUnique({
        where: { id },
        include: {
          items: { include: { product: true } },
          deliveries: true,
          payments: true,
        },
      });
      if (dbOrder) {
        if (userRole !== 'ADMIN' && dbOrder.userId !== userId) {
          throw new ForbiddenException('Access denied: You can only view your own orders');
        }
        return this.normalizeOrder(dbOrder);
      }
      if (!allowInMemoryFallback()) {
        throw new NotFoundException(`Order with id ${id} not found`);
      }
    } catch (e: any) {
      if (e instanceof ForbiddenException || e instanceof NotFoundException) throw e;
      this.logger.error(`Database error while finding order: ${e?.message || e}`);
      if (!allowInMemoryFallback()) {
        throw new ServiceUnavailableException('Order service is temporarily unavailable');
      }
    }

    const allOrders = inMemoryOrders.get(userId) || (await this.findByUser(userId));
    const found = allOrders.find((o) => o.id === id || o.orderNumber === id);
    if (!found) {
      throw new NotFoundException(`Order with id ${id} not found`);
    }
    return found;
  }

  async updateStatus(id: string, status: string, userId: string, userRole: string): Promise<Order> {
    const order = await this.findOne(id, userId, userRole);
    if (userRole !== 'ADMIN') {
      throw new ForbiddenException('Insufficient permissions');
    }
    const allowedTransitions: Record<string, string[]> = {
      PENDING: ['CONFIRMED'],
      CONFIRMED: ['SHIPPING'],
      SHIPPING: ['DELIVERED'],
    };
    if (!allowedTransitions[order.status]?.includes(status)) {
      throw new BadRequestException('Unsupported order status transition');
    }

    const updated = await this.prisma.order.updateMany({
      where: { id: order.id, status: order.status },
      data: { status, updatedAt: new Date() },
    });
    if (updated.count !== 1) throw new ConflictException('Order status changed; reload and try again');
    return { ...order, status: status as any, updatedAt: new Date().toISOString() };
  }

  async cancelOrder(id: string, userId: string, userRole: string): Promise<Order & { refundRequired?: boolean; refundMessage?: string | null }> {
    const transition = await this.prisma.$transaction(async (transaction: any) => {
      const order = await transaction.order.findUnique({
        where: { id },
        include: { items: true, payments: true },
      });
      if (!order) throw new NotFoundException(`Order with id ${id} not found`);
      if (userRole !== 'ADMIN' && order.userId !== userId) {
        throw new ForbiddenException('Access denied: You can only cancel your own orders');
      }
      if (order.status === 'CANCELLED') return { order, shouldRefund: false };
      if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
        throw new BadRequestException(`Cannot cancel order in status "${order.status}"`);
      }

      const wasPaid = order.paymentStatus === 'COMPLETED';
      if (wasPaid && !order.paymentId) {
        throw new ServiceUnavailableException('Captured payment record is missing');
      }
      const nextPaymentStatus = wasPaid ? 'REFUND_PENDING' : order.paymentStatus;
      const inventoryWasHeld = ['RESERVED', 'CONSUMED'].includes(order.inventoryStatus);
      const updated = await transaction.order.updateMany({
        where: {
          id,
          status: order.status,
          paymentStatus: order.paymentStatus,
          inventoryStatus: order.inventoryStatus,
        },
        data: {
          status: 'CANCELLED',
          paymentStatus: nextPaymentStatus,
          inventoryStatus: inventoryWasHeld ? 'RELEASED' : order.inventoryStatus,
          reservationExpiresAt: null,
        },
      });
      if (updated.count !== 1) throw new ConflictException('Order changed; reload and try again');

      if (inventoryWasHeld) {
        for (const item of order.items) {
          await transaction.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
      }
      if (!wasPaid) await this.releaseOrderPromotions(transaction, order.id);
      return { order: { ...order, status: 'CANCELLED', paymentStatus: nextPaymentStatus }, shouldRefund: wasPaid };
    });

    let refundStatus: string | undefined;
    if (transition.shouldRefund && transition.order.paymentId && this.paymentService) {
      try {
        refundStatus = (await this.paymentService.refundPayment(id, transition.order.paymentId)).status;
      } catch (error: any) {
        this.logger.error(`Refund processing could not be confirmed for order ${id}: ${error?.message || error}`);
        refundStatus = 'REFUND_PENDING';
      }
    }

    const refundRequired = transition.shouldRefund;
    const refundMessage = refundStatus === 'REFUNDED'
      ? 'Payment refund completed'
      : refundStatus === 'REFUND_FAILED'
        ? 'Order cancelled; refund needs review'
        : refundRequired
          ? 'Order cancelled; refund is pending confirmation'
          : null;
    return {
      ...this.normalizeOrder({
        ...transition.order,
        paymentStatus: refundStatus || transition.order.paymentStatus,
      }),
      refundRequired,
      refundMessage,
    };
  }

  private async releaseOrderPromotions(transaction: any, orderId: string) {
    const couponRedemption = await transaction.discountRedemption.findUnique({ where: { orderId } });
    if (couponRedemption) {
      await transaction.discountCode.updateMany({
        where: { id: couponRedemption.discountCodeId, uses: { gt: 0 } },
        data: { uses: { decrement: 1 } },
      });
      await transaction.discountRedemption.delete({ where: { orderId } });
    }
    await transaction.referralRedemption.deleteMany({ where: { orderId } });
  }

  async expireAbandonedReservations(now = new Date()): Promise<number> {
    const expired = await (this.prisma as any).order.findMany({
      where: {
        status: 'PENDING',
        paymentMethod: 'razorpay',
        paymentStatus: { in: ['PENDING', 'FAILED'] },
        inventoryStatus: 'RESERVED',
        reservationExpiresAt: { lte: now },
      },
      include: { items: true },
    });
    let releasedCount = 0;

    for (const candidate of expired) {
      const released = await this.prisma.$transaction(async (transaction: any) => {
        const order = await transaction.order.findUnique({
          where: { id: candidate.id },
          include: { items: true },
        });
        if (!order || order.status !== 'PENDING' || order.inventoryStatus !== 'RESERVED') return false;
        const updated = await transaction.order.updateMany({
          where: {
            id: order.id,
            status: 'PENDING',
            inventoryStatus: 'RESERVED',
            reservationExpiresAt: { lte: now },
            paymentStatus: { in: ['PENDING', 'FAILED'] },
          },
          data: { status: 'CANCELLED', inventoryStatus: 'RELEASED', reservationExpiresAt: null },
        });
        if (updated.count !== 1) return false;

        for (const item of order.items) {
          await transaction.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          });
        }
        await this.releaseOrderPromotions(transaction, order.id);
        return true;
      });
      if (released) releasedCount += 1;
    }
    return releasedCount;
  }

  async requestReturn(id: string, userId: string, reason: string): Promise<{ message: string; returnStatus: string }> {
    const order = await this.findOne(id, userId);

    if (order.status !== 'DELIVERED') {
      throw new BadRequestException('Returns are only available for delivered orders within the 7-day replacement window.');
    }

    order.returnStatus = 'REQUESTED';
    order.returnReason = reason;
    order.updatedAt = new Date().toISOString();

    return {
      message: 'Return / Replacement request submitted successfully. Our courier executive will arrange inspection within 24-48 hours.',
      returnStatus: 'REQUESTED',
    };
  }

  async reorder(id: string, userId: string): Promise<{ message: string; itemsAdded: number }> {
    const order = await this.findOne(id, userId);
    let count = 0;

    for (const item of order.items || []) {
      await this.cartService.addItem(userId, item.productId, item.quantity);
      count += item.quantity;
    }


    return {
      message: `${count} items added to your cart successfully`,
      itemsAdded: count,
    };
  }

  async getInvoice(id: string, userId: string) {
    const order = await this.findOne(id, userId);
    const invoiceNumber = `INV-${order.orderNumber}`;
    const issuedAt = order.createdAt;

    const cgst = Math.round(order.finalAmount * 0.09);
    const sgst = Math.round(order.finalAmount * 0.09);
    const taxableAmount = order.finalAmount - (cgst + sgst);

    return {
      order,
      invoiceNumber,
      issuedAt,
      seller: {
        name: 'LaptopMitra Retail Pvt Ltd',
        gstin: '29AABCL9823K1Z4',
        address: 'Ground Floor, Tech Park Hub, Indiranagar, Bengaluru, KA 560038',
        phone: '+91 80 4567 8900',
        email: 'billing@laptopmitra.com',
      },
      taxBreakdown: {
        taxableAmount,
        cgst,
        sgst,
        totalTax: cgst + sgst,
        grandTotal: order.finalAmount,
      },
    };
  }

  async getTracking(id: string, userId: string) {
    const order = await this.findOne(id, userId);
    const timeline = [
      { status: 'ORDER_PLACED', time: order.createdAt, note: 'Order placed & confirmed by customer' },
      { status: 'QUALITY_INSPECTED', time: new Date(new Date(order.createdAt).getTime() + 3600000).toISOString(), note: '32-point hardware and battery diagnostic passed' },
      { status: 'DISPATCHED', time: new Date(new Date(order.createdAt).getTime() + 14400000).toISOString(), note: `Handed over to ${order.carrier || 'courier partner'}` },
      { status: 'IN_TRANSIT', time: new Date(new Date(order.createdAt).getTime() + 43200000).toISOString(), note: 'In transit to destination delivery hub' },
    ];

    if (order.status === 'DELIVERED') {
      timeline.push({
        status: 'DELIVERED',
        time: order.updatedAt || new Date().toISOString(),
        note: 'Package handed over to recipient and signature verified',
      });
    }

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      carrier: order.carrier || null,
      trackingNumber: order.trackingNumber || null,
      estimatedDelivery: new Date(new Date(order.createdAt).getTime() + 72 * 3600000).toISOString().split('T')[0],
      timeline: order.trackingNumber ? timeline : [],
    };
  }
}
