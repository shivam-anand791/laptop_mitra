import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
  ) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        gender: true,
        dob: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        referralCode: true,
        createdAt: true,
        updatedAt: true,
        role: true,
        status: true,
        imageUrl: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const { name, gender, dob } = updateProfileDto;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name,
        gender,
        dob: dob ? new Date(dob) : undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        gender: true,
        dob: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        referralCode: true,
        createdAt: true,
      },
    });

    return user;
  }

  async updateAddress(userId: string, updateAddressDto: UpdateAddressDto) {
    const { phone, address, city, state, pincode } = updateAddressDto;

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        phone,
        address,
        city,
        state,
        pincode,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        state: true,
        pincode: true,
        referralCode: true,
        createdAt: true,
      },
    });

    return user;
  }

  async getUserStats(userId: string) {
    const [cartItems, wishlistCount, orderCount] = await Promise.all([
      this.prisma.cartItem.aggregate({
        where: { cart: { userId } },
        _sum: { quantity: true },
      }),
      this.prisma.wishlistItem.count({
        where: { wishlist: { userId } },
      }),
      this.prisma.order.count({
        where: { userId },
      }),
    ]);

    return {
      cartItems: cartItems._sum.quantity || 0,
      wishlistItems: wishlistCount,
      orders: orderCount,
    };
  }
}
