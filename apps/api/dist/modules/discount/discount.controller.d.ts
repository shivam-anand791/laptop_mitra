import { DiscountService, DiscountValidationResponse } from './discount.service';
export declare class DiscountController {
    private readonly discountService;
    constructor(discountService: DiscountService);
    validateDiscount(body: {
        code?: string;
        cartTotal?: number;
    }): Promise<DiscountValidationResponse>;
}
