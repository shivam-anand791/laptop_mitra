import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
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
    refresh(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(req: any, refreshToken: string): Promise<{
        message: string;
    }>;
    getProfile(req: any): Promise<{
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
    updateProfile(req: any, body: {
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
    changePassword(req: any, body: {
        currentPassword: string;
        newPassword: string;
    }): Promise<{
        message: string;
    }>;
}
