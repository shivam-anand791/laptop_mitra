import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { RandomService } from '../shared/random.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private prisma;
    private jwtService;
    private randomService;
    constructor(prisma: PrismaService, jwtService: JwtService, randomService: RandomService);
    register(registerDto: RegisterDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            name: string;
            email: string;
            role: string;
        };
    }>;
    login(loginDto: LoginDto): Promise<{
        accessToken: string;
        refreshToken: string;
        user: {
            id: string;
            name: string;
            email: string;
            role: string;
        };
    }>;
    refreshToken(token: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(userId: string, token: string): Promise<{
        message: string;
    }>;
    getUserProfile(userId: string): Promise<{
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
    updateUserProfile(userId: string, data: {
        name?: string;
        email?: string;
        phone?: string;
    }): Promise<{
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
    changePassword(userId: string, data: {
        currentPassword: string;
        newPassword: string;
    }): Promise<{
        message: string;
    }>;
    validateUser(email: string, password: string): Promise<any>;
}
