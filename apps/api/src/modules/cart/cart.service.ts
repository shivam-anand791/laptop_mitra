import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductService } from '../product/product.service';

export const CONFIG_UPGRADE_SELL_DELTA = 4000;
export const CONFIG_UPGRADE_LEASE_DELTA = 500;
export const WARRANTY_PRICE_PER_UNIT = 1999;

@Injectable()
export class CartService {
  constructor(
    private prisma: PrismaService,
    private productService: ProductService,
  ) {}

  private resolveUnitPrice(product: any, purchaseMode: 'sell' | 'lease', configuration: string): number {
    let basePrice: number;
    if (purchaseMode === 'lease') {
      if (product.leasePriceMonthly === null || product.leasePriceMonthly === undefined) {
        throw new BadRequestException('This product does not have a fixed monthly lease price. Please request a quote.');
      }
      basePrice = Number(product.leasePriceMonthly);
    } else {
      basePrice = Number(product.price);
    }

    let upgradeDelta = 0;
    if (configuration === 'ram-16gb') {
      upgradeDelta = purchaseMode === 'sell' ? CONFIG_UPGRADE_SELL_DELTA : CONFIG_UPGRADE_LEASE_DELTA;
    }

    return basePrice + upgradeDelta;
  }

  async getOrCreateCart(userId: string) {
    const existingCart = await this.prisma.cart.findFirst({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: { images: true },
            },
          },
        },
      },
    });

    if (existingCart) {
      return existingCart;
    }

    return this.prisma.cart.create({
      data: {
        user: { connect: { id: userId } },
      },
      include: {
        items: {
          include: {
            product: {
              include: { images: true },
            },
          },
        },
      },
    });
  }

  async addItem(
    userId: string,
    productId: string,
    quantity: number = 1,
    purchaseMode: 'sell' | 'lease' = 'sell',
    configuration: string = 'default',
    hasWarranty: boolean = false,
  ) {
    const normalizedMode = purchaseMode === 'lease' ? 'lease' : 'sell';
    const normalizedConfig = configuration === 'ram-16gb' || configuration === '16gb-pro' || configuration === '16GB Pro' ? 'ram-16gb' : 'default';

    if (hasWarranty && normalizedMode === 'lease') {
      throw new BadRequestException('Extended warranty is only available for outright purchase, not for lease');
    }

    const cart = await this.getOrCreateCart(userId);
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with id ${productId} not found`);
    }

    const unitPrice = this.resolveUnitPrice(product, normalizedMode, normalizedConfig);
    const warrantyPrice = (hasWarranty && normalizedMode === 'sell') ? WARRANTY_PRICE_PER_UNIT : 0;

    // Check if matching item (same product, mode, and configuration) already in cart
    const existingItem = cart.items.find(
      (item) =>
        item.productId === productId &&
        (item.purchaseMode || 'sell') === normalizedMode &&
        (item.configuration || 'default') === normalizedConfig,
    );

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > product.stock && !product.allowBackorder) {
        throw new BadRequestException(`Only ${product.stock} items in stock`);
      }
      return this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          hasWarranty: hasWarranty !== undefined ? hasWarranty : existingItem.hasWarranty,
          warrantyPrice: (hasWarranty ?? existingItem.hasWarranty) && normalizedMode === 'sell' ? WARRANTY_PRICE_PER_UNIT : 0,
        },
        include: { product: true },
      });
    }

    // Check stock
    if (quantity > product.stock && !product.allowBackorder) {
      throw new BadRequestException(`Only ${product.stock} items in stock`);
    }

    return this.prisma.cartItem.create({
      data: {
        cart: { connect: { id: cart.id } },
        product: { connect: { id: productId } },
        quantity,
        priceAtAdd: unitPrice,
        purchaseMode: normalizedMode,
        configuration: normalizedConfig,
        hasWarranty: !!hasWarranty && normalizedMode === 'sell',
        warrantyPrice,
      },
      include: { product: true },
    });
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await this.getOrCreateCart(userId);
    let item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });

    if (!item || item.cartId !== cart.id) {
      item = await this.prisma.cartItem.findFirst({
        where: { cartId: cart.id, productId: itemId },
        include: { cart: true },
      });
    }

    if (!item || item.cartId !== cart.id) {
      throw new NotFoundException('Item not found in cart');
    }

    await this.prisma.cartItem.delete({ where: { id: item.id } });
  }

  async updateItem(userId: string, itemId: string, updates: { quantity?: number; hasWarranty?: boolean }) {
    const cart = await this.getOrCreateCart(userId);
    let item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { product: true, cart: true },
    });

    if (!item || item.cartId !== cart.id) {
      item = await this.prisma.cartItem.findFirst({
        where: { cartId: cart.id, productId: itemId },
        include: { product: true, cart: true },
      });
    }

    if (!item || item.cartId !== cart.id) {
      throw new NotFoundException('Item not found in cart');
    }

    if (updates.quantity !== undefined && updates.quantity <= 0) {
      await this.prisma.cartItem.delete({ where: { id: item.id } });
      return { ...item, quantity: 0 };
    }

    const data: any = {};
    if (updates.quantity !== undefined) {
      if (updates.quantity > item.product.stock && !item.product.allowBackorder) {
        throw new BadRequestException(`Only ${item.product.stock} items in stock`);
      }
      data.quantity = updates.quantity;
    }

    if (updates.hasWarranty !== undefined) {
      if (updates.hasWarranty && item.purchaseMode === 'lease') {
        throw new BadRequestException('Extended warranty is only available for outright purchase, not for lease');
      }
      data.hasWarranty = updates.hasWarranty;
      data.warrantyPrice = updates.hasWarranty ? WARRANTY_PRICE_PER_UNIT : 0;
    }

    return this.prisma.cartItem.update({
      where: { id: item.id },
      data,
      include: { product: true },
    });
  }

  async updateQuantity(userId: string, itemId: string, quantity: number) {
    return this.updateItem(userId, itemId, { quantity });
  }

  async clearCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  }

  async getCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);

    let oneTimeTotal = 0;
    let monthlyTotal = 0;

    for (const item of cart.items) {
      const price = typeof item.priceAtAdd === 'object' ? Number(item.priceAtAdd) : Number(item.priceAtAdd);
      const warranty = item.hasWarranty
        ? (typeof item.warrantyPrice === 'object' ? Number(item.warrantyPrice) : Number(item.warrantyPrice || 0))
        : 0;
      const lineTotal = (price + warranty) * item.quantity;

      if (item.purchaseMode === 'lease') {
        monthlyTotal += lineTotal;
      } else {
        oneTimeTotal += lineTotal;
      }
    }

    const total = oneTimeTotal + monthlyTotal;
    const itemCount = cart.items.reduce((count, item) => count + item.quantity, 0);

    return {
      id: cart.id,
      userId: cart.userId,
      items: cart.items,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
      cart,
      total: Number(total.toFixed(2)),
      oneTimeTotal: Number(oneTimeTotal.toFixed(2)),
      monthlyTotal: Number(monthlyTotal.toFixed(2)),
      itemCount,
    };
  }
}
