import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
export declare class PaymentService {
    private configService;
    private prisma;
    private readonly razorpay;
    constructor(configService: ConfigService, prisma: PrismaService);
    createOrder(amount: number, currency: string, receipt: string): Promise<any>;
    verifyWebhookSignature(payload: string, signature: string): Promise<boolean>;
    handlePaymentWebhook(payload: any, signature: string): Promise<{
        valid: boolean;
        event: string;
        data?: any;
    }>;
    getOrderForUser(orderId: string, userId: string): Promise<{
        items: ({
            product: {
                description: string | null;
                name: string;
                id: string;
                status: string;
                createdAt: Date;
                updatedAt: Date;
                tags: string | null;
                sku: string;
                shortDescription: string | null;
                slug: string;
                price: import("@prisma/client/runtime/library").Decimal;
                compareAtPrice: import("@prisma/client/runtime/library").Decimal | null;
                barcode: string | null;
                stock: number;
                allowBackorder: boolean;
                metadata: import("@prisma/client/runtime/library").JsonValue | null;
                isFeatured: boolean;
                isNewArrival: boolean;
                categoryId: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            quantity: number;
            price: import("@prisma/client/runtime/library").Decimal;
            productId: string;
            orderId: string;
        })[];
        payments: {
            id: string;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            orderId: string;
            razorpayOrderId: string | null;
            razorpaySignature: string | null;
            razorpayPaymentId: string | null;
            amount: import("@prisma/client/runtime/library").Decimal;
            currency: string;
            receiptId: string | null;
            attemptCount: number;
        }[];
    } & {
        email: string;
        phone: string | null;
        id: string;
        referralCode: string | null;
        status: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        orderNumber: string;
        paymentStatus: string;
        paymentMethod: string | null;
        paymentId: string | null;
        razorpayOrderId: string | null;
        razorpaySignature: string | null;
        subtotal: import("@prisma/client/runtime/library").Decimal;
        discountAmount: import("@prisma/client/runtime/library").Decimal;
        discountType: string | null;
        finalAmount: import("@prisma/client/runtime/library").Decimal;
        shippingAddress: import("@prisma/client/runtime/library").JsonValue | null;
        notes: string | null;
        referralDiscount: import("@prisma/client/runtime/library").Decimal;
    }>;
}
