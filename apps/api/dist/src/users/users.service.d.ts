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
        name: string | null;
        email: string;
        password: string;
        id: string;
        referralCode: string;
        emailVerified: Date | null;
        role: string;
        status: string;
        imageUrl: string | null;
        createdAt: Date;
        updatedAt: Date;
        referralEarnings: import("@prisma/client/runtime/library").Decimal;
        referralTier: string;
        referralLinkClickedCount: number;
        otp: string | null;
        otpExpiresAt: Date | null;
        otpAttemptCount: number;
    }>;
    updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<{
        name: string | null;
        email: string;
        password: string;
        id: string;
        referralCode: string;
        emailVerified: Date | null;
        role: string;
        status: string;
        imageUrl: string | null;
        createdAt: Date;
        updatedAt: Date;
        referralEarnings: import("@prisma/client/runtime/library").Decimal;
        referralTier: string;
        referralLinkClickedCount: number;
        otp: string | null;
        otpExpiresAt: Date | null;
        otpAttemptCount: number;
    }>;
    updateAddress(userId: string, updateAddressDto: UpdateAddressDto): Promise<{
        name: string | null;
        email: string;
        password: string;
        id: string;
        referralCode: string;
        emailVerified: Date | null;
        role: string;
        status: string;
        imageUrl: string | null;
        createdAt: Date;
        updatedAt: Date;
        referralEarnings: import("@prisma/client/runtime/library").Decimal;
        referralTier: string;
        referralLinkClickedCount: number;
        otp: string | null;
        otpExpiresAt: Date | null;
        otpAttemptCount: number;
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
