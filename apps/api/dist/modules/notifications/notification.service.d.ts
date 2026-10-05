import { PrismaService } from '../../prisma/prisma.service';
import { NotificationPreferences } from '../../types';
export declare class NotificationService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    getPreferences(userId: string): Promise<NotificationPreferences>;
    updatePreferences(userId: string, prefs: Partial<NotificationPreferences>): Promise<NotificationPreferences>;
    registerDeviceToken(userId: string, token: string, platform?: string): Promise<{
        message: string;
    }>;
    dispatchNotification(userId: string, payload: {
        title: string;
        body: string;
        data?: Record<string, string>;
    }): Promise<{
        sent: number;
        message: string;
    }>;
    dispatchOrderUpdate(userId: string, orderId: string, status: string): Promise<{
        sent: number;
        message: string;
    }>;
    dispatchPaymentUpdate(userId: string, orderId: string, status: string): Promise<{
        sent: number;
        message: string;
    }>;
}
