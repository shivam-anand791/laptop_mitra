import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
export declare class UsersService {
    private prisma;
    private configService;
    constructor(prisma: PrismaService, configService: ConfigService);
    findById(id: string): Promise<{
        address: string;
        name: string;
        email: string;
        phone: string;
        id: string;
        referralCode: string;
        role: string;
        status: string;
        imageUrl: string;
        gender: string;
        dob: Date;
        city: string;
        state: string;
        pincode: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<{
        address: string;
        name: string;
        email: string;
        phone: string;
        id: string;
        referralCode: string;
        gender: string;
        dob: Date;
        city: string;
        state: string;
        pincode: string;
        createdAt: Date;
    }>;
    updateAddress(userId: string, updateAddressDto: UpdateAddressDto): Promise<{
        address: string;
        name: string;
        email: string;
        phone: string;
        id: string;
        referralCode: string;
        city: string;
        state: string;
        pincode: string;
        createdAt: Date;
    }>;
    changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<{
        message: string;
    }>;
    getUserStats(userId: string): Promise<{
        cartItems: number;
        wishlistItems: number;
        orders: number;
    }>;
}
