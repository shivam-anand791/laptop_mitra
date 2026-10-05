import { ConfigService } from '@nestjs/config';
import { DecodedIdToken } from 'firebase-admin/auth';
export declare class FirebaseService {
    private readonly configService;
    private readonly logger;
    private readonly auth;
    private readonly checkRevoked;
    constructor(configService: ConfigService);
    createCustomToken(uid: string, developerClaims?: object): Promise<string>;
    verifyIdToken(idToken: string): Promise<DecodedIdToken>;
    revokeRefreshTokens(uid: string): Promise<void>;
    deleteUser(uid: string): Promise<void>;
    private getCredential;
}
