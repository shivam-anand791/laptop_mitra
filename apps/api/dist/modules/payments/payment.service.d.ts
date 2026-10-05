import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationService } from '../notifications/notification.service';
export declare class PaymentService {
    private readonly configService;
    private readonly prisma;
    private readonly notificationService;
    private readonly logger;
    private readonly razorpay;
    constructor(configService: ConfigService, prisma: PrismaService, notificationService: NotificationService);
    createOrderForUser(orderId: string, userId: string, userRole: string): Promise<any>;
    verifyPayment(orderId: string, razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string, userId: string, userRole: string): Promise<{
        success: boolean;
        message: string;
    }>;
    verifyWebhookSignature(payload: string, signature: string): Promise<boolean>;
    handlePaymentWebhook(payload: any, signature: string): Promise<{
        valid: boolean;
        event: string;
        data?: any;
    }>;
    getOrderForUser(orderId: string, userId: string): Promise<{
        items: ({
            product: {
                tags: string | null;
                description: string | null;
                name: string;
                id: string;
                status: string;
                createdAt: Date;
                updatedAt: Date;
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
        phone: string | null;
        id: string;
        email: string;
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
    getPaymentHistory(userId: string): Promise<{
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
}
