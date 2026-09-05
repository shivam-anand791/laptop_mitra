import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductService } from '../product/product.service';

@Injectable()
export class CartService {
  constructor(
    private prisma: PrismaService,
    private productService: ProductService,
  ) {}

  async getOrCreateCart(userId: string) {
    // Find existing cart for user, or create one
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

  async addItem(userId: string, productId: string, quantity: number = 1) {
    const cart = await this.getOrCreateCart(userId);
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with id ${productId} not found`);
    }

    // Check if item already in cart
    const existingItem = cart.items.find((item) => item.productId === productId);

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > product.stock && !product.allowBackorder) {
        throw new BadRequestException(`Only ${product.stock} items in stock`);
      }
      return this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
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
        priceAtAdd: product.price,
      },
      include: { product: true },
    });
  }

  async removeItem(userId: string, itemId: string) {
    // Verify the item belongs to this user's cart
    const cart = await this.getOrCreateCart(userId);
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { cart: true },
    });

    if (!item || item.cartId !== cart.id) {
      throw new NotFoundException('Item not found in cart');
    }

    await this.prisma.cartItem.delete({ where: { id: itemId } });
  }

  async updateQuantity(userId: string, itemId: string, quantity: number) {
    const cart = await this.getOrCreateCart(userId);
    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { product: true, cart: true },
    });

    if (!item || item.cartId !== cart.id) {
      throw new NotFoundException('Item not found in cart');
    }

    if (quantity <= 0) {
      await this.prisma.cartItem.delete({ where: { id: itemId } });
      return { ...item, quantity: 0 };
    }

    if (quantity > item.product.stock && !item.product.allowBackorder) {
      throw new BadRequestException(`Only ${item.product.stock} items in stock`);
    }

    return this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
      include: { product: true },
    });
  }

  async clearCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
  }

  async getCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);

    const total = cart.items.reduce((sum, item) => {
      const price = typeof item.priceAtAdd === 'object' ? Number(item.priceAtAdd) : item.priceAtAdd;
      return sum + price * item.quantity;
    }, 0);

    const itemCount = cart.items.reduce((count, item) => count + item.quantity, 0);

    return { cart, total: Number(total.toFixed(2)), itemCount };
  }
}
