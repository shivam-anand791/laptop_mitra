import { PaymentService } from './payment.service';
export declare class PaymentController {
    private readonly paymentService;
    constructor(paymentService: PaymentService);
    createRazorpayOrder(user: any, amount: number, orderId: string): Promise<any>;
    handleRazorpayWebhook(payload: any, signature: string): Promise<{
        valid: boolean;
        event: string;
        data?: any;
    }>;
}
