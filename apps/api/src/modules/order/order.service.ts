import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  ServiceUnavailableException,
  Logger,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { ProductService } from '../product/product.service';
import { NotificationService } from '../notifications/notification.service';
import { Order, OrderItem } from '../../types';
import { DiscountService } from '../discount/discount.service';
import { PaymentService } from '../payments/payment.service';
import { AdminService } from '../admin/admin.service';
import { PincodeService } from '../shipping/pincode.service';
import { TaxService } from '../tax/tax.service';
import { LeaseService } from './lease.service';
import { Prisma } from '@prisma/client';
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
    private pincodeService: PincodeService,
    private taxService: TaxService,
    private paymentService?: PaymentService,
    @Optional() private adminService?: AdminService,
    @Optional() private leaseService?: LeaseService,
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
      const itWarrantyPrice = typeof it.warrantyPrice === 'number' ? it.warrantyPrice : parseFloat(it.warrantyPrice?.toString() || '0') || 0;
      return {
        id: it.id,
        orderId: o.id,
        productId: it.productId,
        variantId: it.variantId || null,
        variantSku: it.variantSku || null,
        variantName: it.variantName || null,
        variantAttributes: it.variantAttributes || null,
        quantity: it.quantity,
        price: itPrice,
        purchaseMode: it.purchaseMode || 'sell',
        tenureMonths: it.tenureMonths || null,
        configuration: it.configuration || 'default',
        hasWarranty: !!it.hasWarranty,
        warrantyPrice: itWarrantyPrice,
        product: it.product ? {
          ...it.product,
          price: typeof it.product.price === 'number' ? it.product.price : parseFloat(it.product.price?.toString() || '0') || 0,
        } : undefined,
        warrantyStatus: it.hasWarranty ? 'EXTENDED_ACTIVE' : 'ACTIVE',
        warrantyValidUntil: new Date(new Date(o.createdAt || Date.now()).setFullYear(new Date(o.createdAt || Date.now()).getFullYear() + (it.hasWarranty ? 2 : 1))).toISOString().split('T')[0],
      };
    });

    const delivery = Array.isArray(o.deliveries) && o.deliveries.length > 0 ? o.deliveries[0] : null;

    const parsedShipping = typeof o.shippingAddress === 'string'
      ? (() => { try { return JSON.parse(o.shippingAddress); } catch { return null; } })()
      : (o.shippingAddress && typeof o.shippingAddress === 'object' ? o.shippingAddress : null);

    const returnReq = Array.isArray(o.returnRequests) && o.returnRequests.length > 0 ? o.returnRequests[0] : null;
    const returnStatus = o.returnStatus || returnReq?.status || parsedShipping?.returnStatus || 'NONE';
    const returnReason = o.returnReason || returnReq?.reason || parsedShipping?.returnReason || null;

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
      taxRate: Number(o.taxRate || 0),
      taxAmount: Number(o.taxAmount || 0),
      taxInclusive: !!o.taxInclusive,
      pricingSnapshot: o.pricingSnapshot || null,
      rentalSubscription: o.rentalSubscription ? {
        ...o.rentalSubscription,
        monthlyAmount: Number(o.rentalSubscription.monthlyAmount),
        totalCommitment: Number(o.rentalSubscription.totalCommitment),
        taxRate: Number(o.rentalSubscription.taxRate),
        taxAmount: Number(o.rentalSubscription.taxAmount),
        payments: (o.rentalSubscription.payments || []).map((payment: any) => ({
          ...payment,
          amount: Number(payment.amount),
          taxRate: Number(payment.taxRate),
          taxAmount: Number(payment.taxAmount),
        })),
      } : null,
      shippingAddress: parsedShipping,
      phone: o.phone || null,
      email: o.email || '',
      notes: o.notes || null,
      trackingNumber: delivery?.trackingNumber || o.trackingNumber || null,
      carrier: delivery?.carrier || o.carrier || null,
      returnStatus,
      returnReason,
      deliveries: Array.isArray(o.deliveries) ? o.deliveries : [],
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
    idempotencyKey?: string,
    savedAddressId?: string,
    cartItems?: any[],
  ): Promise<Order> {
    if (savedAddressId) {
      const savedAddress = await this.prisma.address.findFirst({
        where: { id: savedAddressId, userId },
      });
      if (!savedAddress) {
        throw new NotFoundException('Saved delivery address not found');
      }

      // Use the authenticated customer's stored address as the order source of truth.
      shippingAddress = {
        fullName: savedAddress.fullName || user?.name || '',
        phone: savedAddress.phone || user?.phone || phone || '',
        address: savedAddress.address,
        landmark: savedAddress.landmark || undefined,
        city: savedAddress.city || '',
        state: savedAddress.state || '',
        pincode: savedAddress.pincode || '',
      };
    }

    const resolvedEmail = (email || shippingAddress?.email || user?.email)?.trim();
    const resolvedPhone = (savedAddressId
      ? shippingAddress?.phone || user?.phone || phone
      : phone || shippingAddress?.phone || user?.phone)?.trim();

    if (!resolvedEmail) {
      throw new BadRequestException('Email is required to place an order');
    }
    if (!resolvedPhone) {
      throw new BadRequestException('Phone number is required to place an order');
    }
    if (!['razorpay', 'cod'].includes(paymentMethod)) {
      throw new BadRequestException('Unsupported payment method');
    }

    if (idempotencyKey?.trim()) {
      const cleanKey = idempotencyKey.trim();
      try {
        const recentOrders = await this.prisma.order.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            items: {
            include: {
              product: {
                include: {
                  images: { where: { isPrimary: true }, take: 1 },
                },
              },
            },
          },
            deliveries: true,
            payments: true,
          },
        });
        const existing = recentOrders.find((o: any) => {
          const addr = o.shippingAddress;
          return addr && typeof addr === 'object' && addr._idempotencyKey === cleanKey;
        });
        if (existing) {
          return this.normalizeOrder(existing);
        }
      } catch {
        // Proceed with order creation if DB query fails
      }

      const memOrders = inMemoryOrders.get(userId) || [];
      const memExisting = memOrders.find((o: any) => {
        const addr = o.shippingAddress;
        return addr && typeof addr === 'object' && addr._idempotencyKey === cleanKey;
      });
      if (memExisting) {
        return memExisting;
      }
    }

    // Backend Pincode verification & Delhi NCR COD enforcement
    const pinCheck = await this.pincodeService.validateOrderShipping(shippingAddress, paymentMethod);
    shippingAddress.city = pinCheck.city || shippingAddress.city;
    shippingAddress.district = pinCheck.district || shippingAddress.district;
    shippingAddress.state = pinCheck.state || shippingAddress.state;
    shippingAddress.pincode = pinCheck.pincode;

    let order: any;
    try {
      order = await this.runSerializable(async (transaction) => {
        const cart = await transaction.cart.findFirst({
          where: { userId },
          include: {
            items: {
              include: {
                variant: true,
                product: {
                  include: { variants: { where: { isActive: true, isDefault: true }, take: 1 } },
                },
              },
            },
          },
        });
        if (!cart?.items?.length) throw new BadRequestException('Cart is empty');

        const purchaseModes = new Set(cart.items.map((item: any) => item.purchaseMode === 'lease' ? 'lease' : 'sell'));
        if (purchaseModes.size !== 1) {
          throw new BadRequestException('Buy and rent items must be checked out separately. Your cart was not changed.');
        }
        const transactionType = purchaseModes.has('lease') ? 'rental' : 'purchase';
        const resolvedPaymentMethod = transactionType === 'rental' ? 'razorpay_subscription' : paymentMethod;
        if (transactionType === 'rental' && paymentMethod === 'cod') {
          throw new BadRequestException('Rental orders require a Razorpay AutoPay mandate and cannot use COD.');
        }
        if (transactionType === 'rental' && (discountCode?.trim() || referralCode?.trim())) {
          throw new BadRequestException('Discounts and referral codes are not available for rental subscriptions.');
        }

        const rentalItems = cart.items.filter((item: any) => item.purchaseMode === 'lease');
        if (rentalItems.some((item: any) => ![1, 3, 6, 12, 24].includes(Number(item.tenureMonths)))) {
          throw new BadRequestException('Every rental item must have a supported tenure selected.');
        }
        const rentalTenures = new Set(rentalItems.map((item: any) => Number(item.tenureMonths)));
        if (rentalTenures.size > 1) {
          throw new BadRequestException('All rental items in one subscription must use the same tenure.');
        }

        let subtotalPaise = 0;
        const pricedItems = await Promise.all(cart.items.map(async (item: any) => {
          const quantity = Number(item.quantity);
          if (!Number.isSafeInteger(quantity) || quantity <= 0) {
            throw new BadRequestException('Cart contains an invalid quantity');
          }
          if (!item.product || item.product.status !== 'ACTIVE') {
            throw new BadRequestException('A product in your cart is no longer available');
          }

          const mode = item.purchaseMode === 'lease' ? 'lease' : 'sell';
          const config = 'default';
          const variant = item.variant || item.product.variants?.[0] || null;

          if (item.variantId && (!variant || variant.id !== item.variantId || variant.productId !== item.productId || !variant.isActive)) {
            throw new BadRequestException('A selected product configuration is no longer available');
          }

          if (item.hasWarranty && mode === 'lease') {
            throw new BadRequestException('Extended warranty cannot be applied to leased products');
          }

          let unitPrice: number;
          let tenureMonths: number | null = null;
          if (variant) {
            if (mode === 'lease') {
              tenureMonths = Number(item.tenureMonths);
              const approvedPrice = await transaction.rentalPrice.findFirst({
                where: {
                  productId: item.productId,
                  variantId: variant.id,
                  tenureMonths,
                  status: 'APPROVED',
                  sourceType: 'MANUAL',
                  auditHistory: { some: { action: 'APPROVED' } },
                },
                orderBy: { approvedAt: 'desc' },
              });
              if (!approvedPrice?.approvedAt) {
                throw new BadRequestException(`Configuration "${variant.name}" has no approved rental price for this tenure.`);
              }
              unitPrice = Number(approvedPrice.monthlyPrice);
            } else {
              unitPrice = Number(variant.price);
            }
          } else {
            if (mode === 'lease') {
              tenureMonths = Number(item.tenureMonths);
              const approvedPrice = await transaction.rentalPrice.findFirst({
                where: {
                  productId: item.productId,
                  variantId: null,
                  tenureMonths,
                  status: 'APPROVED',
                  sourceType: 'MANUAL',
                  auditHistory: { some: { action: 'APPROVED' } },
                },
                orderBy: { approvedAt: 'desc' },
              });
              if (!approvedPrice?.approvedAt) {
                throw new BadRequestException(`Product "${item.product.name}" has no approved rental price for this tenure.`);
              }
              unitPrice = Number(approvedPrice.monthlyPrice);
            } else {
              unitPrice = Number(item.product.price);
            }
          }
          if (!Number.isFinite(unitPrice) || unitPrice < 0) {
            throw new BadRequestException('A product in your cart has invalid pricing');
          }

          const warrantyUnitPrice = (item.hasWarranty && mode === 'sell') ? 1999 : 0;
          const unitPricePaise = Math.round(unitPrice * 100);
          const warrantyUnitPricePaise = Math.round(warrantyUnitPrice * 100);

          subtotalPaise += (unitPricePaise + warrantyUnitPricePaise) * quantity;
          return {
            productId: item.productId,
            categoryId: item.product.categoryId,
            quantity,
            unitPricePaise,
            warrantyUnitPricePaise,
            purchaseMode: mode,
            tenureMonths,
            configuration: config,
            variant,
            hasWarranty: !!item.hasWarranty && mode === 'sell',
            product: item.product,
          };
        }));
        if (!Number.isSafeInteger(subtotalPaise) || subtotalPaise <= 0) {
          throw new BadRequestException('Order total is invalid');
        }

        for (const item of pricedItems) {
          const stockWhere: any = item.variant
            ? { id: item.variant.id, productId: item.productId, isActive: true }
            : { id: item.productId, status: 'ACTIVE' };
          const allowBackorder = item.variant?.allowBackorder ?? item.product.allowBackorder;
          if (!allowBackorder) stockWhere.stock = { gte: item.quantity };
          const inventoryModel = item.variant ? transaction.productVariant : transaction.product;
          const reserved = await inventoryModel.updateMany({
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
          referralCode,
          resolvedPaymentMethod,
        );
        const couponDiscountPaise = coupon?.discountAmountPaise || 0;

        const lineAllocationMap = new Map<string, number>();
        if (coupon && coupon.allocatedLines) {
          for (const line of coupon.allocatedLines) {
            lineAllocationMap.set(line.id, line.allocatedDiscountPaise);
          }
        }

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
          if (!referral) {
            const legacyCode = await transaction.referral.findFirst({
              where: {
                code: { equals: normalizedReferral, mode: 'insensitive' },
                status: 'ACTIVE',
              },
              select: { userId: true },
            });
            if (legacyCode) {
              referral = await transaction.user.findFirst({
                where: { id: legacyCode.userId, status: 'ACTIVE' },
              });
            }
          }
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
        const afterDiscountPaise = Math.max(0, subtotalPaise - discountPaise);
        const taxConfiguration = await this.taxService.getConfiguration();
        const tax = this.taxService.calculate(afterDiscountPaise, transactionType, taxConfiguration);
        const finalPaise = tax.totalAmountPaise;
        const now = new Date();
        const reservationExpiresAt = resolvedPaymentMethod !== 'cod'
          ? new Date(now.getTime() + OrderService.RESERVATION_TTL_MS)
          : null;
        const created = await transaction.order.create({
          data: {
            userId,
            status: 'PENDING',
            paymentStatus: 'PENDING',
            paymentMethod: resolvedPaymentMethod,
            subtotal: (subtotalPaise / 100).toFixed(2),
            discountAmount: (discountPaise / 100).toFixed(2),
            discountType: coupon && referral
              ? `${coupon.type}+referral`
              : coupon?.type || (referralDiscountPaise ? 'referral' : null),
            finalAmount: (finalPaise / 100).toFixed(2),
            taxRate: tax.taxRate.toFixed(2),
            taxAmount: (tax.taxAmountPaise / 100).toFixed(2),
            taxInclusive: tax.taxInclusive,
            pricingSnapshot: {
              version: 1,
              currency: 'INR',
              transactionType,
              subtotalPaise,
              discountPaise,
              taxableAmountPaise: tax.taxableAmountPaise,
              taxRate: tax.taxRate,
              taxAmountPaise: tax.taxAmountPaise,
              taxInclusive: tax.taxInclusive,
              totalAmountPaise: finalPaise,
            },
            shippingAddress: shippingAddress
              ? { ...shippingAddress, ...(idempotencyKey ? { _idempotencyKey: idempotencyKey.trim() } : {}) }
              : (idempotencyKey ? { _idempotencyKey: idempotencyKey.trim() } : undefined),
            phone: resolvedPhone,
            email: resolvedEmail,
            notes: notes || null,
            referralCode: referralDiscountPaise ? referral.referralCode : null,
            referralDiscount: (referralDiscountPaise / 100).toFixed(2),
            inventoryStatus: resolvedPaymentMethod === 'cod' ? 'CONSUMED' : 'RESERVED',
            reservationExpiresAt,
            items: {
              create: pricedItems.map((item: any) => {
                const itemAllocatedPaise = lineAllocationMap.get(item.variant?.id || item.productId) || 0;
                const itemAllocatedRupees = itemAllocatedPaise / 100;
                const unitNetRupees = Math.max(0, (item.unitPricePaise / 100) - (itemAllocatedRupees / (item.quantity || 1)));
                return {
                  productId: item.productId,
                  ...(item.variant ? {
                    variantId: item.variant.id,
                    variantSku: item.variant.sku,
                    variantName: item.variant.name,
                    variantAttributes: item.variant.attributes,
                  } : {}),
                  quantity: item.quantity,
                  price: (item.unitPricePaise / 100).toFixed(2),
                  allocatedDiscount: itemAllocatedRupees.toFixed(2),
                  netPrice: unitNetRupees.toFixed(2),
                  purchaseMode: item.purchaseMode,
                  tenureMonths: item.tenureMonths,
                  configuration: item.configuration,
                  hasWarranty: item.hasWarranty,
                  warrantyPrice: (item.warrantyUnitPricePaise / 100).toFixed(2),
                };
              }),
            },
          },
          include: { items: { include: { product: true } } },
        });

        if (transactionType === 'rental') {
          const tenureMonths = rentalTenures.values().next().value as number;
          const monthlyAmount = finalPaise / 100;
          await transaction.rentalSubscription.create({
            data: {
              orderId: created.id,
              userId,
              tenureMonths,
              monthlyAmount: monthlyAmount.toFixed(2),
              totalCommitment: (monthlyAmount * tenureMonths).toFixed(2),
              taxRate: tax.taxRate.toFixed(2),
              taxAmount: (tax.taxAmountPaise / 100).toFixed(2),
              taxInclusive: tax.taxInclusive,
              pricingSnapshot: {
                ...created.pricingSnapshot,
                monthlyAmountPaise: finalPaise,
                totalCommitmentPaise: finalPaise * tenureMonths,
              },
            },
          });
        }

        if (coupon) {
          await this.discountService.consumeOrderDiscount(
            transaction,
            coupon.id,
            userId,
            created.id,
            subtotalPaise / 100,
            coupon.allocatedLines,
          );
        }
        if (referral && referralDiscountPaise > 0) {
          await transaction.referralRedemption.create({
            data: {
              referrerUserId: referral.id,
              referredUserId: userId,
              orderId: created.id,
              referralCode: referral.referralCode,
              discountAmount: (referralDiscountPaise / 100).toFixed(2),
            },
          });
        }

        // COD is complete at order creation. Keep prepaid carts until payment
        // verification succeeds so a dismissed or failed payment remains retryable.
        if (paymentMethod === 'cod') {
          await transaction.cartItem.deleteMany({ where: { cartId: cart.id } });
        }
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
        if (status === 'IN_PROGRESS') {
          where.status = { in: ['PENDING', 'CONFIRMED', 'SHIPPING'] };
        } else if (status === 'RETURNS') {
          where.OR = [
            { returnRequests: { some: {} } },
            { status: 'REFUNDED' },
          ];
        } else {
          where.status = status;
        }
      }
      const dbOrders = await this.prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: { where: { isPrimary: true }, take: 1 },
                },
              },
            },
          },
          deliveries: true,
          payments: true,
          returnRequests: { orderBy: { createdAt: 'desc' }, take: 1 },
          rentalSubscription: { include: { payments: { orderBy: { createdAt: 'asc' } } } },
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

  async getOrderCountsByUser(userId: string): Promise<{
    ALL: number;
    IN_PROGRESS: number;
    DELIVERED: number;
    CANCELLED: number;
    RETURNS: number;
  }> {
    try {
      const orders = await this.prisma.order.findMany({
        where: { userId },
        select: {
          status: true,
          returnRequests: { select: { id: true, status: true }, take: 1 },
        },
      });

      const counts = {
        ALL: orders.length,
        IN_PROGRESS: 0,
        DELIVERED: 0,
        CANCELLED: 0,
        RETURNS: 0,
      };

      for (const o of orders) {
        if (['PENDING', 'CONFIRMED', 'SHIPPING'].includes(o.status)) {
          counts.IN_PROGRESS += 1;
        } else if (o.status === 'DELIVERED') {
          counts.DELIVERED += 1;
        } else if (o.status === 'CANCELLED') {
          counts.CANCELLED += 1;
        }

        const hasReturn = (o.returnRequests && o.returnRequests.length > 0) || o.status === 'REFUNDED';
        if (hasReturn) {
          counts.RETURNS += 1;
        }
      }

      return counts;
    } catch (error: any) {
      this.logger.error(`Database error getting order counts: ${error?.message || error}`);
      const memory = inMemoryOrders.get(userId) || [];
      return {
        ALL: memory.length,
        IN_PROGRESS: memory.filter((o) => ['PENDING', 'CONFIRMED', 'SHIPPING'].includes(o.status)).length,
        DELIVERED: memory.filter((o) => o.status === 'DELIVERED').length,
        CANCELLED: memory.filter((o) => o.status === 'CANCELLED').length,
        RETURNS: memory.filter((o) => (o.returnStatus && o.returnStatus !== 'NONE') || o.status === 'REFUNDED').length,
      };
    }
  }

  async findOne(id: string, userId: string, userRole?: string): Promise<Order> {
    try {
      const dbOrder = await this.prisma.order.findUnique({
        where: { id },
        include: {
          items: {
            include: {
              product: {
                include: {
                  images: { where: { isPrimary: true }, take: 1 },
                },
              },
            },
          },
          deliveries: true,
          payments: true,
          returnRequests: { orderBy: { createdAt: 'desc' }, take: 1 },
          rentalSubscription: { include: { payments: { orderBy: { createdAt: 'asc' } } } },
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

  async updateStatus(
    id: string,
    status: string,
    userId: string,
    userRole: string,
    courierData?: { courierName?: string; trackingNumber?: string },
  ): Promise<Order> {
    if (userRole !== 'ADMIN') {
      throw new ForbiddenException('Insufficient permissions');
    }
    if (this.adminService) {
      const updated = await this.adminService.updateOrderStatus(id, status, userId, courierData);
      return this.normalizeOrder(updated);
    }
    const order = await this.findOne(id, userId, userRole);
    const allowedTransitions: Record<string, string[]> = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['SHIPPING', 'CANCELLED'],
      SHIPPING: ['DELIVERED'],
      DELIVERED: ['REFUNDED'],
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
      if (order.paymentMethod === 'razorpay_subscription') {
        throw new BadRequestException('Rental orders cannot be cancelled here. Submit a rental termination request for admin review.');
      }

      const wasPaid = order.paymentStatus === 'COMPLETED' || order.paymentStatus === 'PAID';
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
          const inventoryModel = item.variantId ? transaction.productVariant : transaction.product;
          await inventoryModel.update({
            where: { id: item.variantId || item.productId },
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

  /**
   * Proposal E: Item-level pre-dispatch cancellation.
   * Cancels a single order item, proportionally reverses allocated coupon discounts,
   * refunds warranty add-on, recalculates order totals with original snapshot preservation,
   * releases item inventory, and cancels the whole order if it was the last active item.
   */
  async cancelOrderItem(
    orderId: string,
    orderItemId: string,
    userId: string,
    userRole: string,
    reason: string,
  ): Promise<any> {
    return this.prisma.$transaction(async (tx: any) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          items: true,
          payments: true,
          discountRedemption: { include: { discountCode: true } },
        },
      });

      if (!order) throw new NotFoundException(`Order with id ${orderId} not found`);
      if (userRole !== 'ADMIN' && userRole !== 'SUPPORT' && order.userId !== userId) {
        throw new ForbiddenException('Access denied: You can only cancel items in your own orders');
      }

      if (!['PENDING', 'CONFIRMED'].includes(order.status)) {
        throw new BadRequestException(
          `Cannot cancel items while order is in status "${order.status}". Pre-dispatch cancellation only.`,
        );
      }

      const item = order.items.find((it: any) => it.id === orderItemId);
      if (!item) throw new NotFoundException(`Item ${orderItemId} not found in order ${orderId}`);

      if (item.status === 'CANCELLED') {
        return {
          order: this.normalizeOrder(order),
          cancelledItem: item,
          message: 'Item has already been cancelled.',
        };
      }

      const activeItems = order.items.filter((it: any) => it.status !== 'CANCELLED');
      const isLastActiveItem = activeItems.length <= 1;

      // Item financial calculations
      const itemBasePrice = Number(item.price) * item.quantity;
      const itemWarrantyPrice = item.hasWarranty ? Number(item.warrantyPrice || 0) * item.quantity : 0;
      const itemGrossTotal = itemBasePrice + itemWarrantyPrice;

      // Proportional discount reversal without invalidating coupon minOrder on remaining items
      const totalActiveBase = activeItems.reduce(
        (sum: number, it: any) => sum + Number(it.price) * it.quantity,
        0,
      );
      const allocatedDiscount = totalActiveBase > 0
        ? Math.round((itemBasePrice / totalActiveBase) * Number(order.discountAmount))
        : 0;

      const itemNetPayable = Math.max(0, itemGrossTotal - allocatedDiscount);

      const wasPaid = order.paymentStatus === 'COMPLETED' || order.paymentStatus === 'PAID';
      let refundAmount = 0;
      let refundStatus = 'NOT_APPLICABLE';

      if (wasPaid) {
        refundAmount = itemNetPayable;
        refundStatus = 'REFUND_PENDING';
      }

      // 1. Release inventory if held
      const inventoryWasHeld = ['RESERVED', 'CONSUMED'].includes(order.inventoryStatus);
      if (inventoryWasHeld) {
        const inventoryModel = item.variantId ? tx.productVariant : tx.product;
        await inventoryModel.update({
          where: { id: item.variantId || item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }

      // 2. If leased item, terminate lease contract and waive installments
      if (tx.leaseContract) {
        await tx.leaseContract.updateMany({
          where: { orderItemId: item.id, status: 'ACTIVE' },
          data: { status: 'TERMINATED' },
        });
      }
      if (tx.leaseInstallment) {
        await tx.leaseInstallment.updateMany({
          where: { contract: { orderItemId: item.id }, status: 'PENDING' },
          data: { status: 'WAIVED' },
        });
      }

      // 3. Update OrderItem
      const updatedItem = await tx.orderItem.update({
        where: { id: item.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelReason: reason || 'Customer requested item cancellation',
          cancelledBy: userId,
          refundAmount: new Prisma.Decimal(refundAmount),
          refundStatus,
        },
      });

      // 4. Record immutable audit record
      await tx.orderItemCancellation.create({
        data: {
          orderItemId: item.id,
          orderId: order.id,
          cancelledBy: userId,
          reason: reason || 'Customer requested item cancellation',
          refundAmount: new Prisma.Decimal(refundAmount),
          refundStatus,
          restockedQuantity: item.quantity,
        },
      });

      // 5. Update Order totals
      if (isLastActiveItem) {
        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: {
            status: 'CANCELLED',
            paymentStatus: wasPaid ? 'REFUND_PENDING' : order.paymentStatus,
            inventoryStatus: inventoryWasHeld ? 'RELEASED' : order.inventoryStatus,
            originalSubtotal: order.originalSubtotal ?? order.subtotal,
            originalFinalAmount: order.originalFinalAmount ?? order.finalAmount,
          },
          include: { items: true, payments: true },
        });
        return {
          order: this.normalizeOrder(updatedOrder),
          cancelledItem: updatedItem,
          orderCancelled: true,
          refundAmount,
          refundStatus,
        };
      } else {
        const remainingActive = activeItems.filter((it: any) => it.id !== item.id);
        const newSubtotal = remainingActive.reduce(
          (sum: number, it: any) =>
            sum + Number(it.price) * it.quantity + (it.hasWarranty ? Number(it.warrantyPrice || 0) * it.quantity : 0),
          0,
        );
        const newDiscountAmount = Math.max(0, Number(order.discountAmount) - allocatedDiscount);
        const taxRate = Number(order.taxRate || 0);
        const newTaxAmount = taxRate > 0
          ? Math.round((newSubtotal - newDiscountAmount) * (taxRate / 100))
          : 0;
        const newFinalAmount = Math.max(0, newSubtotal - newDiscountAmount + newTaxAmount);

        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: {
            subtotal: new Prisma.Decimal(newSubtotal),
            discountAmount: new Prisma.Decimal(newDiscountAmount),
            taxAmount: new Prisma.Decimal(newTaxAmount),
            finalAmount: new Prisma.Decimal(newFinalAmount),
            originalSubtotal: order.originalSubtotal ?? order.subtotal,
            originalFinalAmount: order.originalFinalAmount ?? order.finalAmount,
          },
          include: { items: true, payments: true },
        });

        return {
          order: this.normalizeOrder(updatedOrder),
          cancelledItem: updatedItem,
          orderCancelled: false,
          refundAmount,
          refundStatus,
        };
      }
    });
  }

  private async releaseOrderPromotions(transaction: any, orderId: string) {
    if (this.discountService?.restoreOrderDiscount) {
      await this.discountService.restoreOrderDiscount(transaction, orderId, 'Order cancelled or expired');
    }
    await transaction.referralRedemption.deleteMany({ where: { orderId } });
  }

  async expireAbandonedReservations(now = new Date()): Promise<number> {
    try {
      const expired = await (this.prisma as any).order.findMany({
        where: {
          status: 'PENDING',
          OR: [
            { paymentMethod: 'razorpay' },
            {
              paymentMethod: 'razorpay_subscription',
              rentalSubscription: {
                is: { status: 'PENDING_AUTHORIZATION', razorpaySubscriptionId: null },
              },
            },
          ],
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
            const inventoryModel = item.variantId ? transaction.productVariant : transaction.product;
            await inventoryModel.update({
              where: { id: item.variantId || item.productId },
              data: { stock: { increment: item.quantity } },
            });
          }
          await this.releaseOrderPromotions(transaction, order.id);
          return true;
        });
        if (released) releasedCount += 1;
      }
      return releasedCount;
    } catch (err: any) {
      this.logger.warn(`Checkout reservation expiry check skipped: ${err?.message || err}`);
      return 0;
    }
  }

  async requestReturn(id: string, userId: string, reason: string): Promise<{ message: string; returnStatus: string }> {
    const order = await this.findOne(id, userId);

    if (order.status !== 'DELIVERED') {
      throw new BadRequestException('Returns are only available for delivered orders within the 7-day replacement window.');
    }

    // Leased items cannot be returned via self-serve returns
    if (order.items?.some((item: any) => item.purchaseMode === 'lease')) {
      throw new BadRequestException(
        'Leased items cannot be returned through self-serve returns. Please raise a lease support ticket to arrange servicing, renewal, or device return.',
      );
    }

    // Idempotent: if return was already requested, return current status without error
    if (order.returnStatus === 'REQUESTED') {
      return {
        message: 'Return / Replacement request already submitted. Our courier executive will arrange inspection within 24-48 hours.',
        returnStatus: 'REQUESTED',
      };
    }

    // 7-day window enforcement from delivered timestamp
    const deliveries = (order as any).deliveries || [];
    const delivery = deliveries.length > 0 ? deliveries[0] : null;
    // 7-day window enforcement: must use Delivery.deliveredAt, never order.updatedAt
    const deliveredAt = delivery?.deliveredAt ?? (order.status === 'DELIVERED' ? order.createdAt : null);
    if (!deliveredAt) {
      throw new BadRequestException('Order must be delivered before initiating a return request');
    }
    const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
    const deliveredIST = new Date(new Date(deliveredAt).getTime() + IST_OFFSET_MS);
    const deadlineIST = new Date(deliveredIST);
    deadlineIST.setUTCDate(deadlineIST.getUTCDate() + 7);
    deadlineIST.setUTCHours(23, 59, 59, 999);
    const deadlineUTC = new Date(deadlineIST.getTime() - IST_OFFSET_MS);
    if (Date.now() > deadlineUTC.getTime()) {
      throw new BadRequestException('Return window has expired. Returns and replacements are only allowed within 7 days of delivery.');
    }

    const currentShipping = (order.shippingAddress && typeof order.shippingAddress === 'object') ? order.shippingAddress : {};
    const updatedShipping = {
      ...currentShipping,
      returnStatus: 'REQUESTED',
      returnReason: reason,
      returnRequestedAt: new Date().toISOString(),
    };

    try {
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          shippingAddress: updatedShipping,
          notes: order.notes
            ? `${order.notes}\n[Return Requested: ${new Date().toISOString()}] Reason: ${reason}`
            : `[Return Requested: ${new Date().toISOString()}] Reason: ${reason}`,
          updatedAt: new Date(),
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to persist return request for order ${id}: ${err?.message || err}`);
      if (!allowInMemoryFallback()) {
        throw new ServiceUnavailableException('Failed to submit return request');
      }
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
    const taxAmount = Number(order.taxAmount || 0);

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
        taxableAmount: Number((Number(order.finalAmount) - taxAmount).toFixed(2)),
        taxRate: Number(order.taxRate || 0),
        taxAmount,
        taxInclusive: !!order.taxInclusive,
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
