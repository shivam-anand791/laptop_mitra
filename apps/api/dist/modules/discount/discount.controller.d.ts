import { DiscountService, DiscountValidationResponse } from './discount.service';
export declare class DiscountController {
    private readonly discountService;
    constructor(discountService: DiscountService);
    validateDiscount(body: {
        code?: string;
        cartTotal?: number;
    }): Promise<DiscountValidationResponse>;
    getReferralStats(user: any): Promise<{
        referralCode: string;
        referralTier: string;
        referralEarnings: number;
        referredUsersCount: number;
        referralLinkClickedCount: number;
        payoutHistory: {
            id: string;
            amount: number;
            date: string;
            status: string;
        }[];
    }>;
}
