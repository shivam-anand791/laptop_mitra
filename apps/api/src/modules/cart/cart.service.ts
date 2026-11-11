import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductService } from '../product/product.service';
import { MAX_CART_ITEM_QUANTITY, SUPPORTED_LEASE_TENURES } from './dto/cart.dto';

export const WARRANTY_PRICE_PER_UNIT = 1999;

export interface CartSettings {
  warrantyPricePerUnit: number;
  standardDeliveryDays: string;
  expressDeliveryDays: string;
  freeShippingThreshold: number;
}

export const DEFAULT_CART_SETTINGS: CartSettings = {
  warrantyPricePerUnit: WARRANTY_PRICE_PER_UNIT,
  standardDeliveryDays: '3-5',
  expressDeliveryDays: '1-2',
  freeShippingThreshold: 999,
};

const CART_INCLUDE = {
  items: {
    include: {
      variant: { include: { images: true } },
      product: {
        include: { images: true },
      },
    },
  },
} as const;

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    private prisma: PrismaService,
    private productService: ProductService,
  ) {}

  async readCartSettings(): Promise<CartSettings> {
    if (typeof (this.prisma as any)?.$queryRaw !== 'function') {
      return { ...DEFAULT_CART_SETTINGS };
    }

    try {
      const rows = await this.prisma.$queryRaw<Array<{ key: string; value: string }>>`
        SELECT "key", "value" FROM "system_settings"
        WHERE "key" IN (
          'warrantyPricePerUnit',
          'standardDeliveryDays',
          'expressDeliveryDays',
          'freeShippingThreshold'
        )
      `;

      const map = new Map(
        Array.isArray(rows) ? rows.map((row) => [row.key, row.value]) : [],
      );

      const parsedWarranty = Number(map.get('warrantyPricePerUnit'));
      const parsedFreeShipping = Number(map.get('freeShippingThreshold'));

      return {
        warrantyPricePerUnit:
          Number.isFinite(parsedWarranty) && parsedWarranty >= 0
            ? parsedWarranty
            : DEFAULT_CART_SETTINGS.warrantyPricePerUnit,
        standardDeliveryDays:
          map.get('standardDeliveryDays')?.trim() || DEFAULT_CART_SETTINGS.standardDeliveryDays,
        expressDeliveryDays:
          map.get('expressDeliveryDays')?.trim() || DEFAULT_CART_SETTINGS.expressDeliveryDays,
        freeShippingThreshold:
          Number.isFinite(parsedFreeShipping) && parsedFreeShipping >= 0
            ? parsedFreeShipping
            : DEFAULT_CART_SETTINGS.freeShippingThreshold,
      };
    } catch (error: any) {
      this.logger.warn(
        `Failed to read cart settings from system_settings, using defaults: ${error?.message || error}`,
      );
      return { ...DEFAULT_CART_SETTINGS };
    }
  }

  private async ensureUserExists(userId: string): Promise<void> {
    if (!userId || typeof userId !== 'string') {
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        code: 'USER_SYNC_REQUIRED',
        message: 'Account profile not found. User sync required.',
      });
    }

    if (typeof (this.prisma as any)?.user?.findUnique !== 'function') {
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, status: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        code: 'USER_SYNC_REQUIRED',
        message: 'Account profile not found. User sync required.',
      });
    }
  }

  async getOrCreateCart(userId: string) {
    await this.ensureUserExists(userId);

    const existingCart = await this.prisma.cart.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: CART_INCLUDE,
    });

    if (existingCart) {
      return existingCart;
    }

    if (typeof (this.prisma as any)?.$transaction === 'function') {
      try {
        return await this.prisma.$transaction(async (tx) => {
          if (typeof (tx as any).$executeRaw === 'function') {
            await (tx as any)
              .$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`cart:${userId}`}))`;
          }
          const insideTx = await tx.cart.findFirst({
            where: { userId },
            orderBy: { createdAt: 'asc' },
            include: CART_INCLUDE,
          });
          if (insideTx) {
            return insideTx;
          }
          return tx.cart.create({
            data: {
              user: { connect: { id: userId } },
            },
            include: CART_INCLUDE,
          });
        });
      } catch (error: any) {
        if (error?.code === 'P2002') {
          const retryCart = await this.prisma.cart.findFirst({
            where: { userId },
            orderBy: { createdAt: 'asc' },
            include: CART_INCLUDE,
          });
          if (retryCart) return retryCart;
        }
        if (error?.code === 'P2025' || error?.code === 'P2003') {
          throw new UnauthorizedException({
            statusCode: 401,
            error: 'Unauthorized',
            code: 'USER_SYNC_REQUIRED',
            message: 'Account profile not found. User sync required.',
          });
        }
        throw error;
      }
    }

    try {
      return await this.prisma.cart.create({
        data: {
          user: { connect: { id: userId } },
        },
        include: CART_INCLUDE,
      });
    } catch (error: any) {
      if (error?.code === 'P2002') {
        const retryCart = await this.prisma.cart.findFirst({
          where: { userId },
          orderBy: { createdAt: 'asc' },
          include: CART_INCLUDE,
        });
        if (retryCart) return retryCart;
      }
      if (error?.code === 'P2025' || error?.code === 'P2003') {
        throw new UnauthorizedException({
          statusCode: 401,
          error: 'Unauthorized',
          code: 'USER_SYNC_REQUIRED',
          message: 'Account profile not found. User sync required.',
        });
      }
      throw error;
    }
  }

  private normalizeConfiguration(configuration?: string): string {
    if (!configuration) return 'default';
    const trimmed = configuration.trim();
    if (!trimmed || !/^[a-zA-Z0-9_-]{1,64}$/.test(trimmed)) {
      throw new BadRequestException('Invalid configuration selection');
    }
    // Legacy configuration labels do not change pricing; canonicalized to default.
    return 'default';
  }

  private buildLineKey(
    productId: string,
    normalizedMode: 'sell' | 'lease',
    normalizedConfig: string,
    selectedVariantId?: string,
    tenureMonths?: number,
  ): string {
    return selectedVariantId
      ? `variant:${selectedVariantId}:${normalizedMode}:${tenureMonths || 'none'}`
      : `${productId}:${normalizedMode}:${normalizedConfig}:${tenureMonths || 'none'}`;
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
    if (!productId || typeof productId !== 'string') {
      throw new BadRequestException('Valid productId is required');
    }
    if (purchaseMode !== undefined && purchaseMode !== 'sell' && purchaseMode !== 'lease') {
      throw new BadRequestException('purchaseMode must be sell or lease');
    }
    const normalizedMode: 'sell' | 'lease' = purchaseMode === 'lease' ? 'lease' : 'sell';

    if (!Number.isSafeInteger(quantity) || quantity <= 0 || quantity > MAX_CART_ITEM_QUANTITY) {
      throw new BadRequestException(
        `Quantity must be a whole number between 1 and ${MAX_CART_ITEM_QUANTITY}`,
      );
    }
    if (hasWarranty && normalizedMode === 'lease') {
      throw new BadRequestException(
        'Extended warranty is only available for outright purchase, not for lease',
      );
    }
    if (
      normalizedMode === 'lease' &&
      !SUPPORTED_LEASE_TENURES.includes(Number(tenureMonths) as (typeof SUPPORTED_LEASE_TENURES)[number])
    ) {
      throw new BadRequestException('Choose a supported rental tenure before adding this item.');
    }

    const normalizedConfig = this.normalizeConfiguration(configuration);
    const cart = await this.getOrCreateCart(userId);
    if (
      cart.items.some(
        (item) => (item.purchaseMode === 'lease' ? 'lease' : 'sell') !== normalizedMode,
      )
    ) {
      throw new BadRequestException(
        'Buy and rent items must be kept in separate carts. Your current cart was not changed.',
      );
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { variants: { where: { isActive: true, isDefault: true }, take: 1 } },
    });

    if (!product) {
      throw new NotFoundException(`Product with id ${productId} not found`);
    }
    if (product.status && product.status !== 'ACTIVE') {
      throw new BadRequestException('This product is currently unavailable for purchase.');
    }

    const selectedVariantId = variantId || product.variants?.[0]?.id;
    const variant = selectedVariantId
      ? await this.prisma.productVariant.findUnique({
          where: { id: selectedVariantId },
          include: { images: true },
        })
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
          throw new BadRequestException(
            'This configuration has no approved rental price for the selected tenure.',
          );
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
          throw new BadRequestException(
            'This product has no approved rental price for the selected tenure.',
          );
        }
        unitPrice = Number(approvedPrice.monthlyPrice);
      } else {
        unitPrice = Number(product.price);
      }
    }

    const settings = await this.readCartSettings();
    const effectiveWarranty = !!hasWarranty && normalizedMode === 'sell';
    const warrantyPrice = effectiveWarranty ? settings.warrantyPricePerUnit : 0;
    const stock = variant?.stock ?? product.stock;
    const allowBackorder = variant?.allowBackorder ?? product.allowBackorder;
    const lineKey = this.buildLineKey(
      productId,
      normalizedMode,
      normalizedConfig,
      selectedVariantId,
      tenureMonths,
    );

    if (
      typeof (this.prisma as any)?.$transaction === 'function' &&
      typeof (this.prisma as any)?.cartItem?.upsert === 'function'
    ) {
      return this.prisma.$transaction(async (tx) => {
        if (typeof (tx as any).$executeRaw === 'function') {
          await (tx as any)
            .$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`cart-item:${cart.id}:${lineKey}`}))`;
        }
        const existing = await tx.cartItem.findUnique({
          where: { cartId_lineKey: { cartId: cart.id, lineKey } },
        });

        const nextHasWarranty =
          hasWarranty !== undefined ? effectiveWarranty : Boolean(existing?.hasWarranty);
        const nextWarrantyPrice =
          nextHasWarranty && normalizedMode === 'sell' ? settings.warrantyPricePerUnit : 0;

        const upserted = await tx.cartItem.upsert({
          where: { cartId_lineKey: { cartId: cart.id, lineKey } },
          create: {
            cart: { connect: { id: cart.id } },
            product: { connect: { id: productId } },
            ...(selectedVariantId ? { variant: { connect: { id: selectedVariantId } } } : {}),
            lineKey,
            quantity,
            priceAtAdd: unitPrice,
            purchaseMode: normalizedMode,
            tenureMonths: normalizedMode === 'lease' ? Number(tenureMonths) : null,
            configuration: normalizedConfig,
            hasWarranty: effectiveWarranty,
            warrantyPrice,
          },
          update: {
            quantity: { increment: quantity },
            priceAtAdd: unitPrice,
            hasWarranty: nextHasWarranty,
            warrantyPrice: nextWarrantyPrice,
          },
          include: { product: { include: { images: true } }, variant: { include: { images: true } } },
        });

        if (upserted.quantity > MAX_CART_ITEM_QUANTITY) {
          throw new BadRequestException(
            `Maximum quantity per item is ${MAX_CART_ITEM_QUANTITY}`,
          );
        }
        if (upserted.quantity > stock && !allowBackorder) {
          throw new BadRequestException(`Only ${stock} items in stock`);
        }

        return upserted;
      });
    }

    // Fallback path for lightweight unit-test mocks without $transaction / upsert
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
      if (newQuantity > MAX_CART_ITEM_QUANTITY) {
        throw new BadRequestException(`Maximum quantity per item is ${MAX_CART_ITEM_QUANTITY}`);
      }
      if (newQuantity > stock && !allowBackorder) {
        throw new BadRequestException(`Only ${stock} items in stock`);
      }
      const nextWarranty =
        hasWarranty !== undefined ? effectiveWarranty : existingItem.hasWarranty;
      return this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          priceAtAdd: unitPrice,
          hasWarranty: nextWarranty,
          warrantyPrice:
            nextWarranty && normalizedMode === 'sell' ? settings.warrantyPricePerUnit : 0,
        },
        include: { product: true, variant: { include: { images: true } } },
      });
    }

    if (quantity > stock && !allowBackorder) {
      throw new BadRequestException(`Only ${stock} items in stock`);
    }

    return this.prisma.cartItem.create({
      data: {
        cart: { connect: { id: cart.id } },
        product: { connect: { id: productId } },
        ...(selectedVariantId ? { variant: { connect: { id: selectedVariantId } } } : {}),
        lineKey,
        quantity,
        priceAtAdd: unitPrice,
        purchaseMode: normalizedMode,
        tenureMonths: normalizedMode === 'lease' ? Number(tenureMonths) : null,
        configuration: normalizedConfig,
        hasWarranty: effectiveWarranty,
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

  async updateItem(
    userId: string,
    itemId: string,
    updates: { quantity?: number; hasWarranty?: boolean },
  ) {
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

    if (updates.quantity !== undefined) {
      if (!Number.isSafeInteger(updates.quantity) || updates.quantity < 0) {
        throw new BadRequestException('Quantity must be a non-negative whole number');
      }
      if (updates.quantity === 0) {
        await this.prisma.cartItem.delete({ where: { id: item.id } });
        return { ...item, quantity: 0 };
      }
      if (updates.quantity > MAX_CART_ITEM_QUANTITY) {
        throw new BadRequestException(`Maximum quantity per item is ${MAX_CART_ITEM_QUANTITY}`);
      }
    }

    const data: Record<string, any> = {};
    if (updates.quantity !== undefined) {
      const stock = item.variant?.stock ?? item.product?.stock ?? 0;
      const allowBackorder = item.variant?.allowBackorder ?? item.product?.allowBackorder ?? false;
      if (updates.quantity > stock && !allowBackorder) {
        throw new BadRequestException(`Only ${stock} items in stock`);
      }
      data.quantity = updates.quantity;
    }

    if (updates.hasWarranty !== undefined) {
      if (updates.hasWarranty && item.purchaseMode === 'lease') {
        throw new BadRequestException(
          'Extended warranty is only available for outright purchase, not for lease',
        );
      }
      const settings = await this.readCartSettings();
      data.hasWarranty = updates.hasWarranty;
      data.warrantyPrice = updates.hasWarranty ? settings.warrantyPricePerUnit : 0;
    }

    return this.prisma.cartItem.update({
      where: { id: item.id },
      data,
      include: { product: { include: { images: true } }, variant: { include: { images: true } } },
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
    const [cart, settings] = await Promise.all([
      this.getOrCreateCart(userId),
      this.readCartSettings(),
    ]);

    let oneTimeTotal = 0;
    let monthlyTotal = 0;
    const items = await Promise.all(
      (cart.items ?? []).map(async (item) => {
        const safeProduct = item.product
          ? {
              ...item.product,
              images: Array.isArray((item.product as any).images)
                ? (item.product as any).images
                : [],
            }
          : null;
        const safeVariant = item.variant
          ? {
              ...item.variant,
              images: Array.isArray((item.variant as any).images)
                ? (item.variant as any).images
                : [],
            }
          : null;

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
            throw new BadRequestException(
              'This rental no longer has an approved price for the selected tenure.',
            );
          }
          return {
            ...item,
            product: safeProduct,
            variant: safeVariant,
            priceAtAdd: Number(approvedPrice.monthlyPrice),
          };
        }

        const currentPrice = item.variant?.price ?? item.product?.price ?? item.priceAtAdd ?? 0;
        const resolvedWarrantyPrice =
          item.hasWarranty && Number(item.warrantyPrice || 0) === 0
            ? settings.warrantyPricePerUnit
            : Number(item.warrantyPrice || 0);

        return {
          ...item,
          product: safeProduct,
          variant: safeVariant,
          priceAtAdd: Number(currentPrice),
          warrantyPrice: item.hasWarranty ? resolvedWarrantyPrice : 0,
        };
      }),
    );

    for (const item of items) {
      const price = Number(item.priceAtAdd);
      const warranty = item.hasWarranty
        ? typeof item.warrantyPrice === 'object'
          ? Number(item.warrantyPrice)
          : Number(item.warrantyPrice || 0)
        : 0;
      const lineTotal = (price + warranty) * item.quantity;

      if (item.purchaseMode === 'lease') {
        monthlyTotal += lineTotal;
      } else {
        oneTimeTotal += lineTotal;
      }
    }

    const total = oneTimeTotal + monthlyTotal;
    const itemCount = (cart.items ?? []).reduce((count, item) => count + item.quantity, 0);

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
      settings,
    };
  }
}
