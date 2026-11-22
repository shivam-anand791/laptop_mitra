import { EmailVerificationService } from '../../src/auth/email-verification.service';

describe('Auth Email Reproduction Matrix (Phase 0 & 1 Verification)', () => {
  const mockFirebase = {
    getUserRecord: jest.fn(),
    generateEmailVerificationLink: jest.fn(),
  };

  const createService = (mailServiceMock: any, configOverrides: Record<string, string> = {}) => {
    const configMap: Record<string, string> = {
      APP_PUBLIC_URL: 'http://localhost:3000',
      NODE_ENV: 'development',
      ENABLE_EMAIL_VERIFICATION: 'true',
      ...configOverrides,
    };
    const configService = {
      get: jest.fn((k: string) => configMap[k]),
    };
    return new EmailVerificationService(mockFirebase as any, mailServiceMock as any, configService as any);
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFirebase.getUserRecord.mockResolvedValue({
      uid: 'user_dev_001',
      email: 'customer@example.com',
      displayName: 'Customer Demo',
      emailVerified: false,
      disabled: false,
    });
    mockFirebase.generateEmailVerificationLink.mockResolvedValue(
      'https://laptop-mitra.firebaseapp.com/__/auth/action?mode=verifyEmail&oobCode=oob_test_12345&apiKey=dummy_key',
    );
  });

  it('Scenario 1: Success (Mock captures outgoing email)', async () => {
    const captured: any[] = [];
    const mockMail = {
      sendMail: jest.fn().mockImplementation(async (opts) => {
        captured.push(opts);
        return { provider: 'resend', success: true, messageId: 'msg_success_001' };
      }),
      getActiveProvider: () => 'resend',
    };

    const service = createService(mockMail);
    const result = await service.send('user_dev_001');

    expect(result).toEqual({ sent: true, alreadyVerified: false });
    expect(captured).toHaveLength(1);
    expect(captured[0].to).toBe('customer@example.com');
    expect(captured[0].subject).toContain('Verify your Laptop Mitra');
    expect(captured[0].templateName).toBe('email-verification');
    expect(captured[0].text).toContain('http://localhost:3000/verify-email?mode=verifyEmail&oobCode=oob_test_12345');
  });

  it('Scenario 2: Provider 403 (Domain not verified / recipient not allowed)', async () => {
    const mockMail = {
      sendMail: jest.fn().mockResolvedValue({
        provider: 'resend',
        success: false,
        errorCode: 'MAIL_DOMAIN_NOT_VERIFIED',
        error: '403 Forbidden: domain not verified. You can only send testing emails to your own account address.',
        userMessage: 'The email sending domain is not verified. Please verify DNS records in Resend.',
      }),
      getActiveProvider: () => 'resend',
    };

    const service = createService(mockMail);
    await expect(service.send('user_dev_001')).rejects.toMatchObject({
      status: 503,
      response: expect.objectContaining({
        error: 'MAIL_DOMAIN_NOT_VERIFIED',
        message: 'The email sending domain is not verified. Please verify DNS records in Resend.',
      }),
    });
  });

  it('Scenario 3: Timeout (e.g. transport connection timeout or unavailable)', async () => {
    const mockMail = {
      sendMail: jest.fn().mockResolvedValue({
        provider: 'resend',
        success: false,
        errorCode: 'MAIL_PROVIDER_UNAVAILABLE',
        error: 'Connection timeout after 10000ms',
        userMessage: 'The email delivery service is temporarily unavailable. Please try again shortly.',
      }),
      getActiveProvider: () => 'resend',
    };

    const service = createService(mockMail);
    await expect(service.send('user_dev_001')).rejects.toMatchObject({
      status: 503,
      response: expect.objectContaining({
        error: 'MAIL_PROVIDER_UNAVAILABLE',
        message: 'The email delivery service is temporarily unavailable. Please try again shortly.',
      }),
    });
  });

  it('Scenario 4: Missing configuration (ENABLE_EMAIL_VERIFICATION is false/unset)', async () => {
    const mockMail = {
      sendMail: jest.fn(),
      getActiveProvider: () => 'stdout',
    };

    const service = createService(mockMail, { ENABLE_EMAIL_VERIFICATION: 'false' });
    await expect(service.send('user_dev_001')).rejects.toMatchObject({
      status: 503,
      message: 'Email verification is temporarily disabled.',
    });
    expect(mockMail.sendMail).not.toHaveBeenCalled();
  });
});
