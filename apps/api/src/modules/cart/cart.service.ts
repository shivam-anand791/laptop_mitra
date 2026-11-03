import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductService } from '../product/product.service';

export const WARRANTY_PRICE_PER_UNIT = 1999;

@Injectable()
export class CartService {
  constructor(
    private prisma: PrismaService,
    private productService: ProductService,
  ) {}

  async getOrCreateCart(userId: string) {
    const existingCart = await this.prisma.cart.findFirst({
      where: { userId },
      include: {
        items: {
          include: {
            variant: { include: { images: true } },
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
            variant: { include: { images: true } },
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
    variantId?: string,
    tenureMonths?: number,
  ) {
    const normalizedMode = purchaseMode === 'lease' ? 'lease' : 'sell';

    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      throw new BadRequestException('Quantity must be a positive whole number');
    }
    if (hasWarranty && normalizedMode === 'lease') {
      throw new BadRequestException('Extended warranty is only available for outright purchase, not for lease');
    }

    const cart = await this.getOrCreateCart(userId);
    if (cart.items.some((item) => (item.purchaseMode === 'lease' ? 'lease' : 'sell') !== normalizedMode)) {
      throw new BadRequestException('Buy and rent items must be kept in separate carts. Your current cart was not changed.');
    }
    if (normalizedMode === 'lease' && ![1, 3, 6, 12, 24].includes(Number(tenureMonths))) {
      throw new BadRequestException('Choose a supported rental tenure before adding this item.');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { variants: { where: { isActive: true, isDefault: true }, take: 1 } },
    });

    if (!product) {
      throw new NotFoundException(`Product with id ${productId} not found`);
    }

    const selectedVariantId = variantId || product.variants?.[0]?.id;
    const normalizedConfig = 'default';
    const variant = selectedVariantId
      ? await this.prisma.productVariant.findUnique({ where: { id: selectedVariantId }, include: { images: true } })
      : null;
    if (selectedVariantId && (!variant || variant.productId !== productId || !variant.isActive)) {
      throw new BadRequestException('Selected product variant is unavailable');
    }

    let unitPrice: number;
    if (variant) {
      if (normalizedMode === 'lease') {
        const approvedPrice = await this.prisma.rentalPrice.findFirst({
          where: {
            productId,
            variantId: variant.id,
            tenureMonths: Number(tenureMonths),
            status: 'APPROVED',
            sourceType: 'MANUAL',
            auditHistory: { some: { action: 'APPROVED' } },
          },
          orderBy: { approvedAt: 'desc' },
        });
        if (!approvedPrice?.approvedAt) {
          throw new BadRequestException('This configuration has no approved rental price for the selected tenure.');
        }
        unitPrice = Number(approvedPrice.monthlyPrice);
      } else {
        unitPrice = Number(variant.price);
      }
    } else {
      if (normalizedMode === 'lease') {
        const approvedPrice = await this.prisma.rentalPrice.findFirst({
          where: {
            productId,
            variantId: null,
            tenureMonths: Number(tenureMonths),
            status: 'APPROVED',
            sourceType: 'MANUAL',
            auditHistory: { some: { action: 'APPROVED' } },
          },
          orderBy: { approvedAt: 'desc' },
        });
        if (!approvedPrice?.approvedAt) {
          throw new BadRequestException('This product has no approved rental price for the selected tenure.');
        }
        unitPrice = Number(approvedPrice.monthlyPrice);
      } else {
        unitPrice = Number(product.price);
      }
    }
    const warrantyPrice = (hasWarranty && normalizedMode === 'sell') ? WARRANTY_PRICE_PER_UNIT : 0;
    const stock = variant?.stock ?? product.stock;
    const allowBackorder = variant?.allowBackorder ?? product.allowBackorder;

    // Variant identity is independent from legacy configuration identity.
    const existingItem = cart.items.find(
      (item) =>
        item.productId === productId &&
        (item.purchaseMode || 'sell') === normalizedMode &&
        (item.tenureMonths || null) === (normalizedMode === 'lease' ? Number(tenureMonths) : null) &&
        (item.variantId || null) === (selectedVariantId || null) &&
        (item.configuration || 'default') === normalizedConfig,
    );

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > stock && !allowBackorder) {
        throw new BadRequestException(`Only ${stock} items in stock`);
      }
      return this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          hasWarranty: hasWarranty !== undefined ? hasWarranty : existingItem.hasWarranty,
          warrantyPrice: (hasWarranty ?? existingItem.hasWarranty) && normalizedMode === 'sell' ? WARRANTY_PRICE_PER_UNIT : 0,
        },
        include: { product: true, variant: { include: { images: true } } },
      });
    }

    // Check stock
    if (quantity > stock && !allowBackorder) {
      throw new BadRequestException(`Only ${stock} items in stock`);
    }

    return this.prisma.cartItem.create({
      data: {
        cart: { connect: { id: cart.id } },
        product: { connect: { id: productId } },
        ...(selectedVariantId ? { variant: { connect: { id: selectedVariantId } } } : {}),
        lineKey: selectedVariantId
          ? `variant:${selectedVariantId}:${normalizedMode}:${tenureMonths || 'none'}`
          : `${productId}:${normalizedMode}:${normalizedConfig}:${tenureMonths || 'none'}`,
        quantity,
        priceAtAdd: unitPrice,
        purchaseMode: normalizedMode,
        tenureMonths: normalizedMode === 'lease' ? Number(tenureMonths) : null,
        configuration: normalizedConfig,
        hasWarranty: !!hasWarranty && normalizedMode === 'sell',
        warrantyPrice,
      },
      include: { product: true, variant: { include: { images: true } } },
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
      include: { product: true, variant: true, cart: true },
    });

    if (!item || item.cartId !== cart.id) {
      item = await this.prisma.cartItem.findFirst({
        where: { cartId: cart.id, productId: itemId },
        include: { product: true, variant: true, cart: true },
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
      const stock = item.variant?.stock ?? item.product.stock;
      const allowBackorder = item.variant?.allowBackorder ?? item.product.allowBackorder;
      if (updates.quantity > stock && !allowBackorder) {
        throw new BadRequestException(`Only ${stock} items in stock`);
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
      include: { product: true, variant: { include: { images: true } } },
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
    const items = await Promise.all(cart.items.map(async (item) => {
      if (item.purchaseMode === 'lease') {
        const approvedPrice = await this.prisma.rentalPrice.findFirst({
          where: {
            productId: item.productId,
            variantId: item.variantId || null,
            tenureMonths: item.tenureMonths,
            status: 'APPROVED',
            sourceType: 'MANUAL',
          },
          orderBy: { approvedAt: 'desc' },
        });
        if (!approvedPrice?.approvedAt) {
          throw new BadRequestException('This rental no longer has an approved price for the selected tenure.');
        }
        return { ...item, priceAtAdd: Number(approvedPrice.monthlyPrice) };
      }

      const currentPrice = item.variant?.price ?? item.product.price;
      return { ...item, priceAtAdd: Number(currentPrice) };
    }));

    for (const item of items) {
      const price = Number(item.priceAtAdd);
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
      items,
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
