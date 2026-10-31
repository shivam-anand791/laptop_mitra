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

  private resolveUnitPrice(product: any, purchaseMode: 'sell' | 'lease'): number {
    let basePrice: number;
    if (purchaseMode === 'lease') {
      if (product.leasePriceMonthly === null || product.leasePriceMonthly === undefined) {
        throw new BadRequestException('This product does not have a fixed monthly lease price. Please request a quote.');
      }
      basePrice = Number(product.leasePriceMonthly);
    } else {
      basePrice = Number(product.price);
    }

    return basePrice;
  }

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
  ) {
    const normalizedMode = purchaseMode === 'lease' ? 'lease' : 'sell';

    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      throw new BadRequestException('Quantity must be a positive whole number');
    }
    if (hasWarranty && normalizedMode === 'lease') {
      throw new BadRequestException('Extended warranty is only available for outright purchase, not for lease');
    }

    const cart = await this.getOrCreateCart(userId);
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
      const variantPrice = normalizedMode === 'lease' ? variant.leasePriceMonthly : variant.price;
      if (variantPrice === null || variantPrice === undefined) {
        throw new BadRequestException('This variant does not have a fixed monthly lease price. Please request a quote.');
      }
      unitPrice = Number(variantPrice);
    } else {
      unitPrice = this.resolveUnitPrice(product, normalizedMode);
    }
    const warrantyPrice = (hasWarranty && normalizedMode === 'sell') ? WARRANTY_PRICE_PER_UNIT : 0;
    const stock = variant?.stock ?? product.stock;
    const allowBackorder = variant?.allowBackorder ?? product.allowBackorder;

    // Variant identity is independent from legacy configuration identity.
    const existingItem = cart.items.find(
      (item) =>
        item.productId === productId &&
        (item.purchaseMode || 'sell') === normalizedMode &&
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
          ? `variant:${selectedVariantId}:${normalizedMode}`
          : `${productId}:${normalizedMode}:${normalizedConfig}`,
        quantity,
        priceAtAdd: unitPrice,
        purchaseMode: normalizedMode,
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
    const items = cart.items.map((item) => {
      const variantPrice = item.purchaseMode === 'lease'
        ? item.variant?.leasePriceMonthly
        : item.variant?.price;
      const unitPrice = variantPrice === null || variantPrice === undefined
        ? Number(item.priceAtAdd)
        : Number(variantPrice);
      return { ...item, priceAtAdd: unitPrice };
    });

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
