import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
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

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const { currentPassword, newPassword } = changePasswordDto;

    // Get user with password
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(
      newPassword,
      parseInt(this.configService.get<string>('BCRYPT_ROUNDS', '12')),
    );

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
      },
    });

    return { message: 'Password changed successfully' };
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
