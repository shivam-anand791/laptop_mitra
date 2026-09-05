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
    refreshToken(userId: string, token: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(userId: string, token: string): Promise<{
        message: string;
    }>;
    getUserProfile(userId: string): Promise<{
        name: string;
        email: string;
        id: string;
        referralCode: string;
        role: string;
        status: string;
        imageUrl: string;
        createdAt: Date;
        referralEarnings: import("@prisma/client/runtime/library").Decimal;
        referralTier: string;
    }>;
    validateUser(email: string, password: string): Promise<any>;
}
