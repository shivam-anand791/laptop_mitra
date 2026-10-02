import { PrismaService } from '../../prisma/prisma.service';
export declare class NotificationService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
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
        error?: undefined;
        result?: undefined;
    } | {
        sent: number;
        message: string;
        error: any;
        result?: undefined;
    } | {
        sent: number;
        message: string;
        result: any;
        error?: undefined;
    }>;
    dispatchOrderUpdate(userId: string, orderId: string, status: string): Promise<{
        sent: number;
        message: string;
        error?: undefined;
        result?: undefined;
    } | {
        sent: number;
        message: string;
        error: any;
        result?: undefined;
    } | {
        sent: number;
        message: string;
        result: any;
        error?: undefined;
    }>;
    dispatchPaymentUpdate(userId: string, orderId: string, status: string): Promise<{
        sent: number;
        message: string;
        error?: undefined;
        result?: undefined;
    } | {
        sent: number;
        message: string;
        error: any;
        result?: undefined;
    } | {
        sent: number;
        message: string;
        result: any;
        error?: undefined;
    }>;
}
