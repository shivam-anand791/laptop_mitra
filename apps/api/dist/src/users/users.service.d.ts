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
        name: string;
        email: string;
        phone: string;
        id: string;
        referralCode: string;
        role: string;
        status: string;
        imageUrl: string;
        address: string;
        city: string;
        state: string;
        pincode: string;
        gender: string;
        dob: Date;
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<{
        name: string;
        email: string;
        phone: string;
        id: string;
        referralCode: string;
        address: string;
        city: string;
        state: string;
        pincode: string;
        gender: string;
        dob: Date;
        createdAt: Date;
    }>;
    updateAddress(userId: string, updateAddressDto: UpdateAddressDto): Promise<{
        name: string;
        email: string;
        phone: string;
        id: string;
        referralCode: string;
        address: string;
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
