import { Injectable, Logger, BadRequestException, ServiceUnavailableException, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationPreferences } from '../../types';
import { allowInMemoryFallback } from '../../common/fallback';
import { MailService } from '../mail/mail.service';

type SupportNotification =
  | { type: 'ticket-created'; ticketId: string; ticketNumber: string; subject: string }
  | { type: 'ticket-reply'; ticketId: string; ticketNumber: string; subject: string }
  | { type: 'ticket-status'; ticketId: string; ticketNumber: string; subject: string; status: string }
  | { type: 'ticket-resolved'; ticketId: string; ticketNumber: string; subject: string }
  | { type: 'ticket-reopened'; ticketId: string; ticketNumber: string; subject: string }
  | { type: 'return-status'; returnNumber: string; status: string }
  | { type: 'refund-reference'; returnNumber: string; reference: string };

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

  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly configService?: ConfigService,
    @Optional() private readonly mailService?: MailService,
  ) {}

  async getPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      await this.prisma.user.findUnique({ where: { id: userId } });
    } catch (error: any) {
      this.logger.error(`Database error while fetching notification preferences: ${error?.message || error}`);
      if (!allowInMemoryFallback()) {
        throw new ServiceUnavailableException('Notification service is temporarily unavailable');
      }
    }
    return inMemoryPreferences.get(userId) || DEFAULT_PREFERENCES;
  }

  async updatePreferences(userId: string, prefs: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    try {
      await this.prisma.user.findUnique({ where: { id: userId } });
    } catch (error: any) {
      this.logger.error(`Database error while updating notification preferences: ${error?.message || error}`);
      if (!allowInMemoryFallback()) {
        throw new ServiceUnavailableException('Notification service is temporarily unavailable');
      }
    }
    const current = inMemoryPreferences.get(userId) || DEFAULT_PREFERENCES;
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
    } catch (error: any) {
      this.logger.error(`Database error while registering device token: ${error?.message || error}`);
      if (!allowInMemoryFallback()) {
        throw new ServiceUnavailableException('Notification service is temporarily unavailable');
      }
    }

    return { message: 'Device token registered successfully' };
  }

  async dispatchNotification(userId: string, payload: {
    title: string;
    body: string;
    data?: Record<string, string>;
  }) {
    let tokens: Array<{ token: string }>;
    try {
      tokens = await this.prisma.deviceToken.findMany({
        where: { userId },
        select: { token: true },
      });
    } catch (error) {
      this.logger.error(
        `Failed to load push tokens for user ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return { sent: 0, failed: 1 };
    }

    if (tokens.length === 0) return { sent: 0, failed: 0 };

    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          tokens.map(({ token }) => ({
            to: token,
            title: payload.title,
            body: payload.body,
            data: payload.data,
            sound: 'default',
          })),
        ),
      });

      if (!response.ok) {
        this.logger.error(`Expo push service returned HTTP ${response.status}`);
        return { sent: 0, failed: tokens.length };
      }

      const result = (await response.json()) as {
        data?: Array<{ status?: string; message?: string }>;
      };
      const sent = result.data?.filter((item) => item.status === 'ok').length || 0;
      const failed = tokens.length - sent;
      if (failed > 0) {
        this.logger.error(`Expo push service rejected ${failed} notification(s) for user ${userId}`);
      }
      return { sent, failed };
    } catch (error) {
      this.logger.error(
        `Failed to dispatch push notification to user ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
      return { sent: 0, failed: tokens.length };
    }
  }

  async dispatchSupportNotification(userId: string, notification: SupportNotification) {
    let title: string;
    let subjectLine: string;
    let details: string;

    switch (notification.type) {
      case 'ticket-created':
        title = 'Support ticket received';
        subjectLine = `Ticket ${notification.ticketNumber}: ${notification.subject}`;
        details = '';
        break;
      case 'ticket-reply':
        title = 'New support reply';
        subjectLine = `Ticket ${notification.ticketNumber}: ${notification.subject}`;
        details = '';
        break;
      case 'ticket-status':
        title = 'Support ticket updated';
        subjectLine = `Ticket ${notification.ticketNumber}: ${notification.subject}`;
        details = `Status: ${notification.status}`;
        break;
      case 'ticket-resolved':
        title = 'Support ticket resolved';
        subjectLine = `Ticket ${notification.ticketNumber}: ${notification.subject}`;
        details = 'Please sign in to rate your support experience.';
        break;
      case 'ticket-reopened':
        title = 'Support ticket reopened';
        subjectLine = `Ticket ${notification.ticketNumber}: ${notification.subject}`;
        details = '';
        break;
      case 'return-status':
        title = `Return ${notification.status.toLowerCase()}`;
        subjectLine = `Return ${notification.returnNumber}`;
        details = `Status: ${notification.status}`;
        break;
      case 'refund-reference':
        title = 'Refund processed';
        subjectLine = `Return ${notification.returnNumber}`;
        details = `Refund reference: ${notification.reference}`;
        break;
    }
    const accountUrl = this.configService?.get<string>('WEB_APP_URL');
    const link = accountUrl
      ? 'ticketId' in notification
        ? `${accountUrl.replace(/\/$/, '')}/account/tickets/${notification.ticketId}`
        : `${accountUrl.replace(/\/$/, '')}/account/orders`
      : '';
    const text = [
      `Hello,`,
      '',
      title,
      subjectLine,
      details,
      '',
      link ? `View details: ${link}` : '',
      '',
      'LaptopMitra Support',
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });
      if (user?.email && this.mailService) {
        const result = await this.mailService.sendMail({
          to: user.email,
          subject: `[LaptopMitra] ${title} — ${subjectLine}`,
          text,
        });
        if (!result.success) {
          this.logger.error(`Support email delivery failed for user ${userId}: ${result.error || 'unknown error'}`);
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to prepare support email for user ${userId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    return this.dispatchNotification(userId, {
      title,
      body: `${subjectLine}${notification.type === 'refund-reference' ? '' : details ? ` — ${details}` : ''}`,
      data: {
        type: notification.type,
        ...('ticketId' in notification ? { ticketId: notification.ticketId } : { returnNumber: notification.returnNumber }),
      },
    });
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

  async dispatchPaymentUpdate(
    userId: string,
    orderId: string,
    status: string,
    meta?: {
      orderNumber?: string;
      amountPaise?: number;
      refundId?: string;
      reason?: string;
      monthlyAmount?: number;
      tenureMonths?: number;
    },
  ) {
    const normalizedStatus = String(status || '').toUpperCase();
    let orderNumber = meta?.orderNumber;
    let amountPaise = meta?.amountPaise;
    if (!orderNumber || amountPaise === undefined) {
      try {
        const orderRow = await this.prisma.order?.findUnique?.({
          where: { id: orderId },
          select: { orderNumber: true, finalAmount: true },
        });
        if (orderRow) {
          orderNumber = orderNumber || orderRow.orderNumber;
          if (amountPaise === undefined && orderRow.finalAmount !== undefined && orderRow.finalAmount !== null) {
            amountPaise = Math.round(Number(orderRow.finalAmount) * 100);
          }
        }
      } catch {
        // Ignore DB lookup errors so notifications never block payment flow
      }
    }
    const orderRef = orderNumber || orderId;
    const amountLine =
      typeof amountPaise === 'number' && amountPaise > 0
        ? `Amount: ₹${(amountPaise / 100).toFixed(2)}`
        : typeof meta?.monthlyAmount === 'number' && meta.monthlyAmount > 0
          ? `Monthly Rental: ₹${Number(meta.monthlyAmount).toFixed(2)}${meta?.tenureMonths ? ` (${meta.tenureMonths} months)` : ''}`
          : '';

    let emailTitle = 'Payment Update';
    let emailBody = `There is an update on payment for order ${orderRef}: ${normalizedStatus}.`;
    let templateName = 'payment-update';

    switch (normalizedStatus) {
      case 'COMPLETED':
      case 'PAID':
        emailTitle = 'Order Payment Confirmed';
        emailBody = `We have received your payment for order ${orderRef}. Your order is now confirmed.`;
        templateName = 'order-payment-confirmed';
        break;
      case 'FAILED':
        emailTitle = 'Payment Failed';
        emailBody = `Your recent payment attempt for order ${orderRef} did not succeed. Please retry from your orders page before your reservation expires.`;
        templateName = 'order-payment-failed';
        break;
      case 'REFUND_PROCESSED':
      case 'REFUNDED':
        emailTitle = 'Refund Processed';
        emailBody = `A refund for order ${orderRef} has been processed.${meta?.refundId ? ` Refund Reference: ${meta.refundId}.` : ''}`;
        templateName = 'order-refund-processed';
        break;
      case 'REFUND_FAILED':
        emailTitle = 'Refund Failed';
        emailBody = `We could not complete your refund for order ${orderRef}. Our team has been alerted and will review it.`;
        templateName = 'order-refund-failed';
        break;
      case 'RENTAL_ACTIVATED':
        emailTitle = 'Rental Subscription Activated';
        emailBody = `Your LaptopMitra AutoPay rental subscription for order ${orderRef} is now active.`;
        templateName = 'rental-subscription-activated';
        break;
    }

    try {
      let emailEnabled = true;
      try {
        const prefs = await this.getPreferences(userId);
        emailEnabled = prefs.emailOrderUpdates !== false;
      } catch {
        emailEnabled = (inMemoryPreferences.get(userId) || DEFAULT_PREFERENCES).emailOrderUpdates !== false;
      }

      if (emailEnabled && this.mailService) {
        const user = await this.prisma.user?.findUnique?.({
          where: { id: userId },
          select: { email: true, name: true },
        });
        if (user?.email) {
          const webAppUrl = (this.configService?.get<string>('WEB_APP_URL') || '').replace(/\/$/, '');
          const orderUrl = webAppUrl ? `${webAppUrl}/account/orders/${orderId}` : '';
          const greeting = user.name ? `Hello ${user.name},` : 'Hello,';
          const textLines = [
            greeting,
            '',
            emailTitle,
            emailBody,
            amountLine,
            meta?.reason ? `Reason: ${meta.reason}` : '',
            orderUrl ? `View order details: ${orderUrl}` : '',
            '',
            'Team LaptopMitra',
          ].filter(Boolean);

          const result = await this.mailService.sendMail({
            to: user.email,
            subject: `[LaptopMitra] ${emailTitle} — ${orderRef}`,
            text: textLines.join('\n'),
            templateName,
          });
          if (!result.success) {
            this.logger.warn(
              `Payment email (${templateName}) failed for user ${userId}, order ${orderId}: ${result.error || 'unknown error'}`,
            );
          }
        }
      }
    } catch (error) {
      this.logger.warn(
        `Failed to send payment confirmation email for user ${userId}, order ${orderId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    try {
      return await this.dispatchNotification(userId, {
        title: emailTitle,
        body: emailBody,
        data: {
          type: 'payment_update',
          orderId,
          status: normalizedStatus,
        },
      });
    } catch (error) {
      this.logger.warn(
        `Failed to dispatch push notification for user ${userId}, order ${orderId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { sent: 0, failed: 1 };
    }
  }

  async dispatchCorporateInquiryAlert(inquiry: {
    id: string;
    companyName: string;
    contactPerson: string;
    email: string;
    phone: string;
    mode: string;
    quantity: number;
    city: string;
    expectedTenure?: string | null;
  }) {
    const salesEmail =
      this.configService?.get<string>('SALES_INQUIRY_EMAIL') ||
      this.configService?.get<string>('SUPPORT_EMAIL') ||
      process.env.SALES_INQUIRY_EMAIL ||
      process.env.SUPPORT_EMAIL ||
      'sales@laptopmitra.com';

    this.logger.log(`[SALES LEAD ALERT] New B2B Corporate Inquiry #${inquiry.id} from "${inquiry.companyName}" (${inquiry.contactPerson}) dispatched to ${salesEmail}`);

    if (this.mailService) {
      const modeLabel = inquiry.mode === 'lease' ? 'Corporate Fleet Leasing' : 'Wholesale / Bulk Purchase';
      await this.mailService.sendMail({
        to: salesEmail,
        subject: `[B2B Corporate Lead] New ${modeLabel} Inquiry #${inquiry.id.slice(0, 8)} - ${inquiry.companyName}`,
        text: `New Corporate Inquiry Received:\n\nCompany: ${inquiry.companyName}\nContact Person: ${inquiry.contactPerson}\nEmail: ${inquiry.email}\nPhone: ${inquiry.phone}\nMode: ${inquiry.mode}\nQuantity: ${inquiry.quantity}\nCity: ${inquiry.city}\nExpected Tenure: ${inquiry.expectedTenure || 'N/A'}\nReference: ${inquiry.id}`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #0f172a; margin-top: 0;">🚀 New B2B Lead: ${inquiry.companyName}</h2>
            <p style="color: #475569;">A new corporate fleet / lease quote request has been submitted:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px;">
              <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold; width: 140px;">Company</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${inquiry.companyName}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Contact Person</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${inquiry.contactPerson}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Work Email</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;"><a href="mailto:${inquiry.email}">${inquiry.email}</a></td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Phone</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;"><a href="tel:${inquiry.phone}">${inquiry.phone}</a></td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Procurement Mode</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; text-transform: uppercase;">${inquiry.mode}</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Required Quantity</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${inquiry.quantity} Units</td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Delivery City</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${inquiry.city}</td></tr>
              ${inquiry.expectedTenure ? `<tr><td style="padding: 8px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">Tenure</td><td style="padding: 8px; border-bottom: 1px solid #f1f5f9;">${inquiry.expectedTenure}</td></tr>` : ''}
              <tr><td style="padding: 8px; font-weight: bold;">Inquiry Ref</td><td style="padding: 8px; font-family: monospace;">#${inquiry.id}</td></tr>
            </table>
            <p style="color: #64748b; font-size: 13px;">Review and manage inquiries in the Admin Portal under B2B Inquiries.</p>
          </div>
        `,
      });
    }

    return { sent: 1, recipient: salesEmail, inquiryId: inquiry.id };
  }

  async dispatchOrderStatusEmail(order: {
    id: string;
    orderNumber?: string | null;
    status: string;
    email?: string | null;
    user?: { name?: string | null; email?: string | null } | null;
    items?: Array<{ quantity: number; price: any; product?: { name?: string | null } | null }>;
    finalAmount?: any;
    deliveries?: Array<{ carrier?: string | null; trackingNumber?: string | null }>;
  }, targetStatus: string, trackingInfo?: { courierName?: string; trackingNumber?: string }) {
    const recipientEmail = order.email || order.user?.email;
    const recipientName = order.user?.name || 'Valued Customer';
    const orderRef = order.orderNumber || order.id.slice(0, 8).toUpperCase();
    const courier = trackingInfo?.courierName || order.deliveries?.[0]?.carrier || '';
    const tracking = trackingInfo?.trackingNumber || order.deliveries?.[0]?.trackingNumber || '';

    let color = '#4f46e5';
    let headline = 'Order Update';
    let subtext = 'There is an update on your order.';

    const normStatus = targetStatus.toUpperCase();
    if (normStatus === 'CONFIRMED') {
      color = '#16a34a';
      headline = 'Order Confirmed ✅';
      subtext = 'We have received your order and are preparing your hardware for dispatch!';
    } else if (normStatus === 'SHIPPING' || normStatus === 'SHIPPED') {
      color = '#2563eb';
      headline = 'Order Dispatched 🚚';
      subtext = 'Great news! Your package is packed and in transit with our courier partner.';
    } else if (normStatus === 'DELIVERED') {
      color = '#15803d';
      headline = 'Order Delivered 📦';
      subtext = 'Your package has been successfully delivered. Thank you for choosing LaptopMitra!';
    } else if (normStatus === 'CANCELLED') {
      color = '#dc2626';
      headline = 'Order Cancelled ❌';
      subtext = 'Your order has been cancelled. Any applicable refunds are being processed to your original payment method.';
    }

    const itemsSummary = (order.items || [])
      .map(
        (it) =>
          `${it.product?.name || 'Laptop Hardware'} (x${it.quantity}) - ₹${Number(it.price || 0).toLocaleString('en-IN')}`,
      )
      .join('<br>');

    const totalStr = order.finalAmount ? `₹${Number(order.finalAmount).toLocaleString('en-IN')}` : '';

    const trackingHtml =
      normStatus === 'SHIPPING' && tracking
        ? `
        <div style="background: #eff6ff; padding: 15px; border-left: 4px solid #2563eb; margin: 20px 0; border-radius: 4px;">
            <strong style="color: #1e40af;">Courier Dispatch Details:</strong><br>
            <strong>Courier Partner:</strong> ${courier || 'Express Logistics'}<br>
            <strong>Tracking ID (AWB):</strong> <span style="font-family: monospace; font-size: 14px;">${tracking}</span>
        </div>`
        : '';

    const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f6f8; padding: 40px 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
            <div style="background-color: ${color}; color: #ffffff; padding: 20px; text-align: center; font-weight: bold; font-size: 20px;">
                ${headline}
            </div>
            <div style="padding: 30px; color: #333333;">
                <h2 style="margin-top: 0; font-size: 18px; color: #111827;">Hi ${recipientName},</h2>
                <p style="font-size: 14px; line-height: 1.6; color: #4b5563;">${subtext}</p>
                <div style="background: #f9fafb; padding: 16px; border: 1px solid #e5e7eb; border-radius: 6px; margin: 20px 0; font-size: 13px; line-height: 1.6;">
                    <strong>Order Reference:</strong> #${orderRef}<br>
                    ${itemsSummary ? `<strong>Items:</strong><br>${itemsSummary}<br>` : ''}
                    ${totalStr ? `<div style="margin-top: 8px; border-top: 1px dashed #d1d5db; pt-2;"><strong>Total Amount:</strong> ${totalStr}</div>` : ''}
                </div>
                ${trackingHtml}
                <p style="font-size: 12px; color: #9ca3af; margin-top: 24px; border-top: 1px solid #f3f4f6; padding-top: 12px;">
                    Laptop Mitra — Certified Pre-Owned & Refurbished Laptops<br>
                    Need assistance? WhatsApp or call us at +91 7701993300
                </p>
            </div>
        </div>
    </div>`;

    this.logger.log(
      `[ORDER NOTIFICATION EMAIL] Dispatched to ${recipientEmail || 'unregistered email'} for Order #${orderRef}: status=${normStatus}, courier=${courier || 'N/A'}, tracking=${tracking || 'N/A'}`,
    );

    if (this.mailService && recipientEmail) {
      await this.mailService.sendMail({
        to: recipientEmail,
        subject: `[LaptopMitra] ${headline} - Order #${orderRef}`,
        text: `Hi ${recipientName},\n\n${subtext}\nOrder Reference: #${orderRef}\n${tracking ? `Tracking ID: ${tracking} (${courier})` : ''}\n\nThank you for choosing LaptopMitra!`,
        html,
      });
    }

    return {
      sent: 1,
      recipient: recipientEmail,
      orderId: order.id,
      orderRef,
      status: normStatus,
      courier,
      tracking,
      htmlPreview: html,
    };
  }

  /**
   * Service Lifecycle and Reminder Notifications
   */
  async sendServiceNotification(params: {
    userId: string;
    type: 'BOOKED' | 'RESCHEDULED' | 'CANCELLED' | 'COMPLETED' | 'REMINDER';
    job?: any;
    entitlement?: any;
    leadDays?: number;
    unit?: any;
  }) {
    const user = await this.prisma.user.findUnique({
      where: { id: params.userId },
      select: { id: true, name: true, email: true, phone: true },
    });

    if (!user) return { sent: 0, reason: 'User not found' };

    let subject = '';
    let headline = '';
    let bodyText = '';
    let headerColor = '#2563eb';

    switch (params.type) {
      case 'BOOKED':
        subject = `[LaptopMitra] Doorstep Service Appointment Confirmed — ${params.job?.jobNumber}`;
        headline = 'Doorstep Service Confirmed';
        headerColor = '#2563eb';
        bodyText = `Your doorstep 4-point general service appointment has been scheduled for ${params.job?.preferredDate} (${params.job?.preferredSlot?.replace(/_/g, ' ')}). Please ensure your data is backed up before device pickup.`;
        break;
      case 'RESCHEDULED':
        subject = `[LaptopMitra] Service Appointment Rescheduled — ${params.job?.jobNumber}`;
        headline = 'Appointment Rescheduled';
        headerColor = '#0284c7';
        bodyText = `Your service appointment has been updated to ${params.job?.preferredDate} (${params.job?.preferredSlot?.replace(/_/g, ' ')}).`;
        break;
      case 'CANCELLED':
        subject = `[LaptopMitra] Service Appointment Cancelled — ${params.job?.jobNumber}`;
        headline = 'Appointment Cancelled';
        headerColor = '#dc2626';
        bodyText = `Your service appointment ${params.job?.jobNumber} was cancelled. Your free service benefit has been restored to your account.`;
        break;
      case 'COMPLETED':
        subject = `[LaptopMitra] Certified Service Completed — Receipt #${params.job?.receiptNumber || 'RCP'}`;
        headline = 'Service Completed & Certified';
        headerColor = '#16a34a';
        bodyText = `Your laptop general service is complete! All 4 checklist inspection points (Internal Cleaning, Thermal Compound Repaste, Hardware Diagnostics, Battery Health Check) passed certification.`;
        break;
      case 'REMINDER':
        subject = `[LaptopMitra] Action Required: ${params.leadDays} Days Left to Claim Your Free Laptop Service`;
        headline = `Free Service Expiry (${params.leadDays} Days Left)`;
        headerColor = '#ea580c';
        bodyText = `Your 6-month free general laptop servicing window expires in ${params.leadDays} days. Schedule your appointment before the benefit expires.`;
        break;
    }

    const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; padding: 30px 0;">
      <div style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background-color: ${headerColor}; color: #ffffff; padding: 18px; text-align: center; font-weight: bold; font-size: 18px;">
          ${headline}
        </div>
        <div style="padding: 25px; color: #1e293b; font-size: 14px; line-height: 1.6;">
          <p>Hi ${user.name || 'Customer'},</p>
          <p>${bodyText}</p>
          ${params.job ? `
          <div style="background: #f1f5f9; padding: 14px; border-radius: 6px; margin: 18px 0; font-size: 13px;">
            <strong>Job Number:</strong> <span style="font-family: monospace;">${params.job.jobNumber}</span><br>
            ${params.job.receiptNumber ? `<strong>Receipt Number:</strong> <span style="font-family: monospace;">${params.job.receiptNumber}</span><br>` : ''}
            ${params.job.batteryHealthPercent ? `<strong>Battery Health:</strong> ${params.job.batteryHealthPercent}%<br>` : ''}
            ${params.job.preferredDate ? `<strong>Date & Slot:</strong> ${params.job.preferredDate} (${params.job.preferredSlot?.replace(/_/g, ' ')})<br>` : ''}
          </div>` : ''}
          <p style="font-size: 12px; color: #64748b; margin-top: 25px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
            Laptop Mitra Customer Care | questions? Call +91 7701993300
          </p>
        </div>
      </div>
    </div>`;

    if (this.mailService && user.email) {
      await this.mailService.sendMail({
        to: user.email,
        subject,
        text: `Hi ${user.name || 'Customer'},\n\n${bodyText}\n\nLaptopMitra Support Team`,
        html,
      });
    }

    // Push notification to user devices
    await this.dispatchNotification(user.id, {
      title: headline,
      body: bodyText,
      data: {
        type: params.type,
        jobId: params.job?.id,
      },
    });

    return { sent: 1, recipient: user.email };
  }
}
