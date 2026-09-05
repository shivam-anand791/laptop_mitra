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
    refresh(refreshToken: string, userId: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(req: any, refreshToken: string): Promise<{
        message: string;
    }>;
    getProfile(req: any): Promise<{
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
}
