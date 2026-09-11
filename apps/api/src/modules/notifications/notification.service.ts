import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async registerDeviceToken(userId: string, token: string, platform?: string) {
    const normalizedToken = token?.trim();
    const normalizedPlatform = (platform || 'unknown').trim() || 'unknown';

    if (!normalizedToken) {
      throw new BadRequestException('Device token is required');
    }

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

    return { message: 'Device token registered successfully' };
  }

  async dispatchNotification(userId: string, payload: {
    title: string;
    body: string;
    data?: Record<string, string>;
  }) {
    const tokens = await this.prisma.deviceToken.findMany({
      where: { userId },
      select: { token: true },
    });

    const deviceTokens = tokens.map((token) => token.token).filter(Boolean);

    if (deviceTokens.length === 0) {
      return { sent: 0, message: 'No device tokens registered for user' };
    }

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: deviceTokens,
        sound: 'default',
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      this.logger.error(`Expo push failed for user ${userId}: ${JSON.stringify(result)}`);
      return {
        sent: 0,
        message: 'Failed to dispatch notification',
        error: result,
      };
    }

    this.logger.log(`Expo push dispatched for user ${userId}: ${JSON.stringify(result)}`);
    return {
      sent: deviceTokens.length,
      message: 'Notification dispatched successfully',
      result,
    };
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
