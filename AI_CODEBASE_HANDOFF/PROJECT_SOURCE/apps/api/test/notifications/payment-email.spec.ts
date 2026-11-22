import { NotificationService } from '../../src/modules/notifications/notification.service';

describe('NotificationService payment confirmation emails', () => {
  let prisma: any;
  let mailService: any;
  let configService: any;
  let service: NotificationService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue({
          email: 'customer@example.com',
          name: 'Asha',
        }),
      },
      deviceToken: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    mailService = {
      sendMail: jest.fn().mockResolvedValue({ provider: 'resend', success: true, messageId: 'msg_1' }),
    };
    configService = {
      get: jest.fn().mockImplementation((k: string) =>
        k === 'WEB_APP_URL' ? 'https://laptop-mitra.vercel.app' : null,
      ),
    };
    service = new NotificationService(prisma, configService, mailService);
  });

  it('sends confirmation emails for paid, failed, refund processed, refund failed, and rental activated', async () => {
    await service.dispatchPaymentUpdate('user-1', 'ord-1', 'COMPLETED', {
      orderNumber: 'LM-1001',
      amountPaise: 4599900,
    });
    expect(mailService.sendMail).toHaveBeenLastCalledWith(
      expect.objectContaining({
        to: 'customer@example.com',
        templateName: 'order-payment-confirmed',
        subject: expect.stringContaining('Order Payment Confirmed'),
        text: expect.stringContaining('₹45999.00'),
      }),
    );

    await service.dispatchPaymentUpdate('user-1', 'ord-1', 'FAILED', {
      orderNumber: 'LM-1001',
      amountPaise: 4599900,
    });
    expect(mailService.sendMail).toHaveBeenLastCalledWith(
      expect.objectContaining({
        templateName: 'order-payment-failed',
        subject: expect.stringContaining('Payment Failed'),
      }),
    );

    await service.dispatchPaymentUpdate('user-1', 'ord-1', 'REFUND_PROCESSED', {
      orderNumber: 'LM-1001',
      amountPaise: 150000,
      refundId: 'rfnd_999',
    });
    expect(mailService.sendMail).toHaveBeenLastCalledWith(
      expect.objectContaining({
        templateName: 'order-refund-processed',
        text: expect.stringContaining('rfnd_999'),
      }),
    );

    await service.dispatchPaymentUpdate('user-1', 'ord-1', 'REFUND_FAILED', {
      orderNumber: 'LM-1001',
      amountPaise: 150000,
    });
    expect(mailService.sendMail).toHaveBeenLastCalledWith(
      expect.objectContaining({
        templateName: 'order-refund-failed',
        subject: expect.stringContaining('Refund Failed'),
      }),
    );

    await service.dispatchPaymentUpdate('user-1', 'ord-rent-1', 'RENTAL_ACTIVATED', {
      orderNumber: 'LM-R-1',
      monthlyAmount: 2499,
      tenureMonths: 6,
    });
    expect(mailService.sendMail).toHaveBeenLastCalledWith(
      expect.objectContaining({
        templateName: 'rental-subscription-activated',
        text: expect.stringContaining('₹2499.00'),
      }),
    );
  });

  it('respects notification preferences (emailOrderUpdates = false)', async () => {
    await service.updatePreferences('user-optout', { emailOrderUpdates: false });
    await service.dispatchPaymentUpdate('user-optout', 'ord-2', 'COMPLETED', {
      orderNumber: 'LM-1002',
      amountPaise: 100000,
    });
    expect(mailService.sendMail).not.toHaveBeenCalled();
  });

  it('never fails the payment flow if MailService throws or returns failure', async () => {
    mailService.sendMail.mockRejectedValueOnce(new Error('Resend HTTP 500'));
    await expect(
      service.dispatchPaymentUpdate('user-1', 'ord-3', 'COMPLETED', {
        orderNumber: 'LM-1003',
        amountPaise: 100000,
      }),
    ).resolves.toBeDefined();

    mailService.sendMail.mockResolvedValueOnce({ provider: 'resend', success: false, error: 'quota' });
    await expect(
      service.dispatchPaymentUpdate('user-1', 'ord-3', 'FAILED', {
        orderNumber: 'LM-1003',
      }),
    ).resolves.toBeDefined();
  });
});

