import { NotificationService } from './notification.service';
export declare class NotificationController {
    private readonly notificationService;
    constructor(notificationService: NotificationService);
    registerToken(req: any, body: {
        token: string;
        platform?: string;
    }): Promise<{
        message: string;
    }>;
}
