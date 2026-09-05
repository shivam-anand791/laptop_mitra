import { Injectable, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { ProductService } from '../product/product.service';

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private cartService: CartService,
    private productService: ProductService,
  ) {}

  async createOrder(userId: string, referralCode?: string, discountCode?: string, shippingAddress?: any, phone?: string, notes?: string) {
    // Get cart
    const { cart, total, itemCount } = await this.cartService.getCart(userId);

    if (itemCount === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Get user and validate
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User not found or inactive');
    }

    // Apply discount code if provided
    let discountAmount = 0;
    let discountType: string | null = null;
    let finalAmount = total;

    if (discountCode) {
      const dc = await this.prisma.discountCode.findUnique({
        where: { code: discountCode },
      });

      if (!dc || !dc.isActive) {
        throw new BadRequestException('Invalid or inactive discount code');
      }

      // Check validity
      const now = new Date();
      if (dc.validFrom && now < new Date(dc.validFrom)) {
        throw new BadRequestException('Discount code not yet valid');
      }
      if (dc.validUntil && now > new Date(dc.validUntil)) {
        throw new BadRequestException('Discount code expired');
      }

      // Check usage limits
      if (dc.maxUses && dc.uses >= dc.maxUses) {
        throw new BadRequestException('Discount code has reached maximum usage');
      }
      if (dc.maxUsesPerUser && dc.uses >= dc.maxUsesPerUser) {
        throw new BadRequestException('Discount code usage limit reached per user');
      }

      // Apply discount based on type
      if (dc.type === 'percentage') {
        discountAmount = total * (Number(dc.value) / 100);
        if (dc.maxUsesPerUser) {
          // Max discount cap check
        }
        discountType = 'percentage';
      } else if (dc.type === 'fixed') {
        discountAmount = Number(dc.value);
        discountAmount = Math.min(discountAmount, total);
        discountType = 'fixed';
      } else if (dc.type === 'free_shipping') {
        discountAmount = 0;
        discountType = 'free_shipping';
      }

      finalAmount = total - discountAmount;

      // Increment usage
      await this.prisma.discountCode.update({
        where: { id: dc.id },
        data: { uses: dc.uses + 1 },
      });
    }

    // Apply referral discount if provided
    let referralDiscount = 0;

    if (referralCode) {
      const referral = await this.prisma.referral.findUnique({
        where: { code: referralCode },
        include: { user: true },
      });

      if (referral && referral.status === 'ACTIVE') {
        referralDiscount = total * 0.1; // 10% referral discount
        referralDiscount = Math.min(referralDiscount, finalAmount);
        finalAmount = finalAmount - referralDiscount;

        // Add to referral earnings
        await this.prisma.referral.update({
          where: { id: referral.id },
          data: {
            earnings: { increment: referralDiscount },
            referredUsers: { increment: 1 },
          },
        });
      }
    }

    // Create order
    const orderData: any = {
      user: { connect: { id: userId } },
      status: 'PENDING',
      paymentStatus: 'PENDING',
      subtotal: total,
      discountAmount,
      discountType,
      finalAmount,
      shippingAddress,
      phone,
      email: user.email,
      notes,
      referralCode,
      referralDiscount,
      items: {
        create: [],
      },
      deliveries: {
        create: {
          status: 'PENDING',
        },
      },
    };

    // Create order items from cart
    for (const item of cart.items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new NotFoundException(`Product with id ${item.productId} not found`);
      }

      orderData.items.create.push({
        product: { connect: { id: product.id } },
        quantity: item.quantity,
        price: item.priceAtAdd,
      });

      // Reduce product stock
      const newStock = product.stock - item.quantity;
      await this.prisma.product.update({
        where: { id: product.id },
        data: { stock: newStock },
      });
    }

    const order = await this.prisma.order.create(orderData);

    // Clear cart
    await this.cartService.clearCart(userId);

    return order;
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
        items: {
          include: { product: true },
        },
        deliveries: true,
        payments: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with id ${id} not found`);
    }

    return order;
  }

  async findByUser(userId: string, status?: string) {
    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    return await this.prisma.order.findMany({
      where,
      include: {
        items: {
          include: { product: true },
        },
        deliveries: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: string, status: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException(`Order with id ${id} not found`);
    }

    const updateData: any = { status };

    if (status === 'DELIVERED') {
      updateData.paymentStatus = 'COMPLETED';
    } else if (status === 'CANCELLED') {
      updateData.paymentStatus = 'REFUNDED';
    }

    return await this.prisma.order.update({
      where: { id },
      data: updateData,
    });
  }
}
