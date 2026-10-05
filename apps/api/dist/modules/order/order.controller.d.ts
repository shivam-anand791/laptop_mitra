import { OrderService } from './order.service';
export declare class OrderController {
    private readonly orderService;
    constructor(orderService: OrderService);
    createOrder(user: any, body: {
        referralCode?: string;
        discountCode?: string;
        shippingAddress?: any;
        phone?: string;
        notes?: string;
    }): Promise<import("../../types").Order>;
    getOrders(user: any, status?: string): Promise<import("../../types").Order[]>;
    getOrder(user: any, id: string): Promise<import("../../types").Order>;
    updateStatus(user: any, id: string, status: string): Promise<import("../../types").Order>;
    cancelOrder(user: any, id: string): Promise<import("../../types").Order & {
        refundRequired?: boolean;
        refundMessage?: string | null;
    }>;
    requestReturn(user: any, id: string, reason: string): Promise<{
        message: string;
        returnStatus: string;
    }>;
    reorder(user: any, id: string): Promise<{
        message: string;
        itemsAdded: number;
    }>;
    getInvoice(user: any, id: string): Promise<{
        order: import("../../types").Order;
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
    getTracking(user: any, id: string): Promise<{
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
