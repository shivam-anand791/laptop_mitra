export declare class RandomService {
    generateReferralCode(): string;
    generateOtp(length?: number): string;
    generateJwtSecret(): string;
    hashPassword(password: string): Promise<string>;
}
