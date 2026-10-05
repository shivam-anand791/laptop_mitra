import { SupportService } from './support.service';
export declare class SupportController {
    private readonly supportService;
    constructor(supportService: SupportService);
    getTickets(user: any): Promise<import("./support.service").SupportTicket[]>;
    getTicket(user: any, id: string): Promise<import("./support.service").SupportTicket>;
    createTicket(user: any, body: {
        subject: string;
        orderId?: string;
        message: string;
        category?: string;
        priority?: 'LOW' | 'MEDIUM' | 'HIGH';
    }): Promise<import("./support.service").SupportTicket>;
    addMessage(user: any, id: string, body: {
        message: string;
        attachments?: string[];
    }): Promise<import("./support.service").SupportTicketMessage>;
    getWarrantyStatus(user: any, orderItemId: string): Promise<{
        orderItemId: string;
        warrantyStatus: "ACTIVE" | "EXPIRED" | "CLAIM_IN_PROGRESS";
        coverageType: string;
        validUntil: string;
        terms: string;
        claimEligible: boolean;
    }>;
}
