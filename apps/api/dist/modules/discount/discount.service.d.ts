import { PrismaService } from '../../prisma/prisma.service';
export type DiscountValidationResponse = {
    valid: boolean;
    discountType: 'percentage' | 'fixed' | 'free_shipping' | null;
    discountValue: number;
    discountAmount: number;
    message: string;
};
export declare class DiscountService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    validateDiscount(code?: string, cartTotal?: number): Promise<DiscountValidationResponse>;
    private invalidResult;
}
