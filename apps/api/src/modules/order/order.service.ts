import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ServiceUnavailableException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { ProductService } from '../product/product.service';
import { NotificationService } from '../notifications/notification.service';
import { Order, OrderItem } from '../../types';
import { allowInMemoryFallback } from '../../common/fallback';

// In-memory orders for fallback
const inMemoryOrders: Map<string, Order[]> = new Map();

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private prisma: PrismaService,
    private cartService: CartService,
    private productService: ProductService,
    private notificationService: NotificationService,
  ) {}

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
  ): Promise<Order> {
    const { cart, total, itemCount } = await this.cartService.getCart(userId);

    if (itemCount === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const resolvedEmail = (email || shippingAddress?.email || user?.email)?.trim();
    const resolvedPhone = (phone || shippingAddress?.phone || user?.phone)?.trim();

    if (!resolvedEmail) {
      throw new BadRequestException('Email is required to place an order');
    }
    if (!resolvedPhone) {
      throw new BadRequestException('Phone number is required to place an order');
    }

    let discountAmount = 0;
    let discountType: string | null = null;
    let finalAmount = total;

    if (discountCode) {
      if (discountCode.toUpperCase() === 'FIRST10') {
        discountAmount = Math.round(total * 0.1);
        discountType = 'percentage';
        finalAmount = total - discountAmount;
      } else if (discountCode.toUpperCase() === 'WELCOME500') {
        discountAmount = 500;
        discountType = 'fixed';
        finalAmount = Math.max(0, total - discountAmount);
      }
    }

    let referralDiscount = 0;
    if (referralCode) {
      referralDiscount = Math.round(total * 0.05);
      finalAmount = Math.max(0, finalAmount - referralDiscount);
    }

    const orderId = `ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const orderNumber = `LM-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();

    const orderItems: OrderItem[] = cart.items.map((it) => ({
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      orderId,
      productId: it.productId,
      quantity: it.quantity,
      price: typeof it.priceAtAdd === 'number' ? it.priceAtAdd : parseFloat(it.priceAtAdd?.toString() || '0') || 0,
      product: it.product as any,
      warrantyStatus: 'ACTIVE',
      warrantyValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    }));

    const newOrder: Order = {
      id: orderId,
      orderNumber,
      userId,
      status: 'PENDING',
      paymentStatus: 'PENDING',
      paymentMethod: 'razorpay',
      paymentId: null,
      subtotal: total,
      discountAmount,
      discountType,
      referralCode: referralCode || null,
      referralDiscount,
      finalAmount,
      shippingAddress: shippingAddress || null,
      phone: resolvedPhone,
      email: resolvedEmail,
      notes: notes || null,
      trackingNumber: null,
      carrier: null,
      returnStatus: 'NONE',
      returnReason: null,
      items: orderItems,
      createdAt: now,
      updatedAt: now,
    };

    const orderCreateOp = this.prisma.order.create({
      data: {
        id: orderId,
        orderNumber,
        userId,
        status: newOrder.status,
        paymentStatus: newOrder.paymentStatus,
        paymentMethod: newOrder.paymentMethod,
        paymentId: newOrder.paymentId,
        subtotal: newOrder.subtotal,
        discountAmount: newOrder.discountAmount,
        discountType: newOrder.discountType,
        finalAmount: newOrder.finalAmount,
        shippingAddress: newOrder.shippingAddress || undefined,
        phone: newOrder.phone,
        email: newOrder.email,
        notes: newOrder.notes,
        referralCode: newOrder.referralCode,
        referralDiscount: newOrder.referralDiscount,
      },
    });

    const itemCreateOps = cart.items.map((it) => {
      const itemPrice = typeof it.priceAtAdd === 'number'
        ? it.priceAtAdd
        : parseFloat(it.priceAtAdd?.toString() || '0') || 0;
      return this.prisma.orderItem.create({
        data: {
          orderId,
          productId: it.productId,
          quantity: it.quantity,
          price: itemPrice,
        },
      });
    });

    try {
      await this.prisma.$transaction([orderCreateOp, ...itemCreateOps]);
    } catch (error: any) {
      this.logger.error(`Database error while creating order: ${error?.message || error}`);
      if (!allowInMemoryFallback()) {
        throw new ServiceUnavailableException('Order service is temporarily unavailable');
      }
    }

    const currentOrders = inMemoryOrders.get(userId) || [];
    currentOrders.unshift(newOrder);
    inMemoryOrders.set(userId, currentOrders);

    await this.cartService.clearCart(userId);
    try {
      await this.notificationService.dispatchOrderUpdate(userId, orderId, 'PENDING');
    } catch {
      // notification fallback
    }

    return newOrder;
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
    order.status = status as any;
    order.updatedAt = new Date().toISOString();
    try {
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status, updatedAt: new Date() },
      });
    } catch (error: any) {
      this.logger.error(`Database error while updating order status: ${error?.message || error}`);
      if (!allowInMemoryFallback()) {
        throw new ServiceUnavailableException('Order service is temporarily unavailable');
      }
    }
    return order;
  }

  async cancelOrder(id: string, userId: string, userRole: string): Promise<Order & { refundRequired?: boolean; refundMessage?: string | null }> {
    const order = await this.findOne(id, userId, userRole);

    const allowedStatuses = ['PENDING', 'CONFIRMED'];
    if (!allowedStatuses.includes(order.status)) {
      throw new BadRequestException(
        `Cannot cancel order in status "${order.status}". Cancellation is only allowed for PENDING or CONFIRMED orders.`,
      );
    }

    const wasPaid = order.paymentStatus === 'COMPLETED';
    order.status = 'CANCELLED';
    order.paymentStatus = 'REFUNDED';
    order.updatedAt = new Date().toISOString();

    const refundRequired = wasPaid;
    const refundMessage = wasPaid
      ? 'Payment was completed - refund needs to be processed via Razorpay'
      : null;

    try {
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED', paymentStatus: 'REFUNDED' },
      });

      // Restore product stock
      for (const item of order.items || []) {
        if (item.productId && item.quantity) {
          try {
            await this.prisma.product?.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } },
            });
          } catch {
            // best-effort product stock restore
          }
        }
      }
    } catch (error: any) {
      this.logger.error(`Database error while cancelling order: ${error?.message || error}`);
      if (!allowInMemoryFallback()) {
        throw new ServiceUnavailableException('Order service is temporarily unavailable');
      }
    }

    return {
      ...order,
      refundRequired,
      refundMessage,
    };
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
