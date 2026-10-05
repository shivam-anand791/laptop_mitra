import { NotificationService } from './notification.service';
import { NotificationPreferences } from '../../types';
export declare class NotificationController {
    private readonly notificationService;
    constructor(notificationService: NotificationService);
    registerToken(req: any, body: {
        token: string;
        platform?: string;
    }): Promise<{
        message: string;
    }>;
    getPreferences(req: any): Promise<NotificationPreferences>;
    updatePreferences(req: any, body: Partial<NotificationPreferences>): Promise<NotificationPreferences>;
}
