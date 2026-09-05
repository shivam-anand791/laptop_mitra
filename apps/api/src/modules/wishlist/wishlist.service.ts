import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WishlistService {
  constructor(private prisma: PrismaService) {}

  async getOrCreateWishlist(userId: string) {
    const existing = await this.prisma.wishlist.findFirst({
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

    if (existing) {
      return existing;
    }

    return this.prisma.wishlist.create({
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

  async addItem(userId: string, productId: string) {
    const wishlist = await this.getOrCreateWishlist(userId);
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException(`Product with id ${productId} not found`);
    }

    // Check if item already in wishlist
    const existingItem = wishlist.items.find((item) => item.productId === productId);
    if (existingItem) {
      throw new ConflictException('Item already in wishlist');
    }

    return this.prisma.wishlistItem.create({
      data: {
        wishlist: { connect: { id: wishlist.id } },
        product: { connect: { id: productId } },
      },
      include: { product: true },
    });
  }

  async removeItem(userId: string, itemId: string) {
    const wishlist = await this.getOrCreateWishlist(userId);
    const item = await this.prisma.wishlistItem.findUnique({
      where: { id: itemId },
      include: { wishlist: true },
    });

    if (!item || item.wishlistId !== wishlist.id) {
      throw new NotFoundException('Item not found in wishlist');
    }

    await this.prisma.wishlistItem.delete({ where: { id: itemId } });
  }

  async clearWishlist(userId: string) {
    const wishlist = await this.getOrCreateWishlist(userId);
    await this.prisma.wishlistItem.deleteMany({ where: { wishlistId: wishlist.id } });
  }

  async getWishlist(userId: string) {
    const wishlist = await this.getOrCreateWishlist(userId);
    const itemCount = wishlist.items.length;
    return { wishlist, itemCount };
  }
}
