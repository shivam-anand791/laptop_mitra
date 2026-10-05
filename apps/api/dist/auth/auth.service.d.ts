import { PrismaService } from '../prisma/prisma.service';
import { RandomService } from '../shared/random.service';
import { FirebaseService } from '../firebase/firebase.service';
import { SyncUserDto } from './dto/sync-user.dto';
export interface VerifiedFirebaseIdentity {
    uid: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    firebase?: {
        sign_in_provider?: string;
    };
}
export declare class AuthService {
    private readonly prisma;
    private readonly randomService;
    private readonly firebaseService;
    private readonly logger;
    constructor(prisma: PrismaService, randomService: RandomService, firebaseService: FirebaseService);
    login(body: {
        email?: string;
        password?: string;
    }): Promise<void>;
    register(body: {
        name?: string;
        email?: string;
        password?: string;
        referralCode?: string;
        phone?: string;
    }): Promise<void>;
    guestLogin(): Promise<void>;
    refreshToken(refreshToken?: string): Promise<void>;
    syncUser(identity: VerifiedFirebaseIdentity, profile?: SyncUserDto): Promise<{
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
    getUserProfile(userId: string): Promise<{
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
    updateUserProfile(userId: string, data: {
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
    signoutEverywhere(userId: string, firebaseUid?: string): Promise<{
        success: boolean;
        message: string;
    }>;
    deleteAccount(userId: string, firebaseUid?: string): Promise<{
        success: boolean;
        message: string;
    }>;
    linkGuestAccount(userId: string, data: {
        email: string;
        password?: string;
        name?: string;
    }): Promise<void>;
}
