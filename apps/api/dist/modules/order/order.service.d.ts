import { PrismaService } from '../../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { ProductService } from '../product/product.service';
import { NotificationService } from '../notifications/notification.service';
import { Order } from '../../types';
export declare class OrderService {
    private prisma;
    private cartService;
    private productService;
    private notificationService;
    constructor(prisma: PrismaService, cartService: CartService, productService: ProductService, notificationService: NotificationService);
    private normalizeOrder;
    createOrder(userId: string, referralCode?: string, discountCode?: string, shippingAddress?: any, phone?: string, notes?: string): Promise<Order>;
    findByUser(userId: string, status?: string): Promise<Order[]>;
    findOne(id: string, userId: string, userRole?: string): Promise<Order>;
    updateStatus(id: string, status: string, userId: string, userRole: string): Promise<Order>;
    cancelOrder(id: string, userId: string, userRole: string): Promise<Order & {
        refundRequired?: boolean;
        refundMessage?: string | null;
    }>;
    requestReturn(id: string, userId: string, reason: string): Promise<{
        message: string;
        returnStatus: string;
    }>;
    reorder(id: string, userId: string): Promise<{
        message: string;
        itemsAdded: number;
    }>;
    getInvoice(id: string, userId: string): Promise<{
        order: Order;
        invoiceNumber: string;
        issuedAt: string;
        seller: {
            name: string;
            gstin: string;
            address: string;
            phone: string;
            email: string;
        };
        taxBreakdown: {
            taxableAmount: number;
            cgst: number;
            sgst: number;
            totalTax: number;
            grandTotal: number;
        };
    }>;
    getTracking(id: string, userId: string): Promise<{
        orderId: string;
        orderNumber: string;
        status: string;
        carrier: string;
        trackingNumber: string;
        estimatedDelivery: string;
        timeline: {
            status: string;
            time: string;
            note: string;
        }[];
    }>;
}
