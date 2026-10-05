import { PrismaService } from '../../prisma/prisma.service';
export interface SupportTicketMessage {
    id: string;
    ticketId: string;
    sender: 'USER' | 'SUPPORT' | 'SYSTEM';
    message: string;
    attachments?: string[];
    createdAt: string;
}
export interface SupportTicket {
    id: string;
    ticketNumber: string;
    userId: string;
    orderId?: string | null;
    orderNumber?: string | null;
    subject: string;
    category: 'WARRANTY' | 'ORDER' | 'PAYMENT' | 'GENERAL' | string;
    status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    messages: SupportTicketMessage[];
    createdAt: string;
    updatedAt: string;
}
export declare class SupportService {
    private prisma;
    constructor(prisma: PrismaService);
    getUserTickets(userId: string): Promise<SupportTicket[]>;
    getTicketById(id: string, userId: string): Promise<SupportTicket>;
    createTicket(userId: string, data: {
        subject: string;
        orderId?: string;
        message: string;
        category?: string;
        priority?: 'LOW' | 'MEDIUM' | 'HIGH';
    }): Promise<SupportTicket>;
    addMessage(ticketId: string, userId: string, message: string, attachments?: string[]): Promise<SupportTicketMessage>;
    getWarrantyStatus(userId: string, orderItemId: string): Promise<{
        orderItemId: string;
        warrantyStatus: 'ACTIVE' | 'EXPIRED' | 'CLAIM_IN_PROGRESS';
        coverageType: string;
        validUntil: string;
        terms: string;
        claimEligible: boolean;
    }>;
}
