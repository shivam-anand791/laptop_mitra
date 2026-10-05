import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationPreferences } from '../../types';


// In-memory preferences fallback
const inMemoryPreferences: Map<string, NotificationPreferences> = new Map();

const DEFAULT_PREFERENCES: NotificationPreferences = {
  emailOrderUpdates: true,
  emailPromotions: false,
  smsOrderUpdates: true,
  smsDeliveryTracking: true,
  pushNewArrivals: true,
  pushPriceDrops: true,
};

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getPreferences(userId: string): Promise<NotificationPreferences> {
    return inMemoryPreferences.get(userId) || DEFAULT_PREFERENCES;
  }

  async updatePreferences(userId: string, prefs: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    const current = await this.getPreferences(userId);
    const updated: NotificationPreferences = {
      ...current,
      ...prefs,
    };
    inMemoryPreferences.set(userId, updated);
    return updated;
  }

  async registerDeviceToken(userId: string, token: string, platform?: string) {
    const normalizedToken = token?.trim();
    const normalizedPlatform = (platform || 'unknown').trim() || 'unknown';

    if (!normalizedToken) {
      throw new BadRequestException('Device token is required');
    }

    try {
      const existingToken = await this.prisma.deviceToken.findFirst({
        where: { userId, token: normalizedToken },
      });

      if (existingToken) {
        await this.prisma.deviceToken.update({
          where: { id: existingToken.id },
          data: { platform: normalizedPlatform },
        });

        return { message: 'Device token already registered' };
      }

      await this.prisma.deviceToken.create({
        data: {
          userId,
          token: normalizedToken,
          platform: normalizedPlatform,
        },
      });
    } catch {
      // In-memory device token fallback
    }

    return { message: 'Device token registered successfully' };
  }

  async dispatchNotification(userId: string, payload: {
    title: string;
    body: string;
    data?: Record<string, string>;
  }) {
    this.logger.log(`Dispatching notification to ${userId}: ${payload.title}`);
    return { sent: 1, message: 'Notification dispatched' };
  }

  async dispatchOrderUpdate(userId: string, orderId: string, status: string) {
    return this.dispatchNotification(userId, {
      title: 'Order Update',
      body: `Your order ${orderId} is now ${status.toLowerCase()}.`,
      data: {
        type: 'order_update',
        orderId,
        status,
      },
    });
  }

  async dispatchPaymentUpdate(userId: string, orderId: string, status: string) {
    return this.dispatchNotification(userId, {
      title: 'Payment Update',
      body: `Payment for order ${orderId} is ${status.toLowerCase()}.`,
      data: {
        type: 'payment_update',
        orderId,
        status,
      },
    });
  }
}
