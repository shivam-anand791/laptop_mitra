import { AuthService } from './auth.service';
import { SyncUserDto } from './dto/sync-user.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(body: {
        email: string;
        password?: string;
    }): Promise<void>;
    register(body: {
        name?: string;
        email: string;
        password?: string;
        referralCode?: string;
        phone?: string;
    }): Promise<void>;
    guest(): Promise<void>;
    refresh(body: {
        refreshToken: string;
    }): Promise<void>;
    logout(): Promise<{
        success: boolean;
    }>;
    sync(req: any, body: SyncUserDto): Promise<{
        name: string;
        phone: string;
        id: string;
        email: string;
        firebaseUid: string;
        referralCode: string;
        emailVerified: Date;
        authProvider: string;
        isGuest: boolean;
        role: string;
        status: string;
        imageUrl: string;
        createdAt: Date;
        referralEarnings: import("@prisma/client/runtime/library").Decimal;
        referralTier: string;
    }>;
    getProfile(req: any): Promise<{
        name: string;
        phone: string;
        id: string;
        email: string;
        firebaseUid: string;
        referralCode: string;
        emailVerified: Date;
        authProvider: string;
        isGuest: boolean;
        role: string;
        status: string;
        imageUrl: string;
        createdAt: Date;
        referralEarnings: import("@prisma/client/runtime/library").Decimal;
        referralTier: string;
    }>;
    updateProfile(req: any, body: {
        name?: string;
        phone?: string;
    }): Promise<{
        name: string;
        phone: string;
        id: string;
        email: string;
        firebaseUid: string;
        referralCode: string;
        emailVerified: Date;
        authProvider: string;
        isGuest: boolean;
        role: string;
        status: string;
        imageUrl: string;
        createdAt: Date;
        referralEarnings: import("@prisma/client/runtime/library").Decimal;
        referralTier: string;
    }>;
    signoutEverywhere(req: any): Promise<{
        success: boolean;
        message: string;
    }>;
    deleteAccount(req: any): Promise<{
        success: boolean;
        message: string;
    }>;
    linkGuest(req: any, body: {
        email: string;
        password?: string;
        name?: string;
    }): Promise<void>;
}
