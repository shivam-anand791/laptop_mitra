import { NotificationService } from '../../src/modules/notifications/notification.service';

describe('NotificationService support notifications', () => {
  const createService = (
    tokens: Array<{ token: string }> = [],
    user: { email: string | null } | null = { email: 'customer@example.test' },
  ) => {
    const prisma = {
      deviceToken: { findMany: jest.fn().mockResolvedValue(tokens) },
      user: { findUnique: jest.fn().mockResolvedValue(user) },
    };
    const mailService = { sendMail: jest.fn().mockResolvedValue({ success: true }) };
    return {
      service: new NotificationService(prisma as any, undefined, mailService as any),
      prisma,
      mailService,
    };
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends a ticket resolution email and Expo push without exposing message content', async () => {
    const { service, mailService } = createService([{ token: 'ExponentPushToken[test]' }]);
    const fetch = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ status: 'ok' }] }),
    } as Response);

    await expect(
      service.dispatchSupportNotification('user-1', {
        type: 'ticket-resolved',
        ticketId: 'ticket-1',
        ticketNumber: 'LM-T-42',
        subject: 'Broken laptop',
      }),
    ).resolves.toEqual({ sent: 1, failed: 0 });

    expect(mailService.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'customer@example.test',
        subject: expect.stringContaining('Support ticket resolved'),
        text: expect.stringContaining('LM-T-42: Broken laptop'),
      }),
    );
    expect(fetch).toHaveBeenCalledWith(
      'https://exp.host/--/api/v2/push/send',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"ticketId":"ticket-1"'),
      }),
    );
  });

  it('does not call Expo when the user has no registered device tokens', async () => {
    const { service } = createService();
    const fetch = jest.spyOn(global, 'fetch');

    await expect(
      service.dispatchNotification('user-1', { title: 'Update', body: 'Ticket updated' }),
    ).resolves.toEqual({ sent: 0, failed: 0 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('reports Expo request failures without failing the support operation', async () => {
    const { service } = createService([{ token: 'ExponentPushToken[test]' }]);
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Expo unavailable'));

    await expect(
      service.dispatchNotification('user-1', { title: 'Update', body: 'Ticket updated' }),
    ).resolves.toEqual({ sent: 0, failed: 1 });
  });
});
