import { PaymentService } from './payment.service';
export declare class PaymentController {
    private readonly paymentService;
    constructor(paymentService: PaymentService);
    createRazorpayOrder(user: any, orderId: string, _clientAmount?: number): Promise<any>;
    verifyPayment(user: any, body: {
        orderId: string;
        razorpayOrderId: string;
        razorpayPaymentId: string;
        razorpaySignature: string;
    }): Promise<{
        success: boolean;
        message: string;
    }>;
    getPaymentHistory(user: any): Promise<{
        id: string;
        orderId: string;
        orderNumber: string;
        razorpayPaymentId: string;
        razorpayOrderId: string;
        amount: number;
        currency: string;
        status: string;
        refundStatus: string;
        refundAmount: number;
        createdAt: string;
    }[]>;
    handleRazorpayWebhook(payload: any, signature: string): Promise<{
        valid: boolean;
        event: string;
        data?: any;
    }>;
}
