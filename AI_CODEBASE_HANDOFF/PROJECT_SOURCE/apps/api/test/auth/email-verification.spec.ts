import { EmailVerificationService } from '../../src/auth/email-verification.service';
import { buildVerificationEmail } from '../../src/auth/email-verification.template';

describe('EmailVerificationService', () => {
  const firebaseService = {
    getUserRecord: jest.fn(),
    generateEmailVerificationLink: jest.fn(),
  };
  const mailService = {
    sendMail: jest.fn(),
    sendSmtpMail: jest.fn(),
  };
  const configService = {
    get: jest.fn((key: string) => ({
      APP_PUBLIC_URL: 'http://localhost:3000',
      NODE_ENV: 'development',
      SUPPORT_EMAIL: 'help@example.com',
      ENABLE_EMAIL_VERIFICATION: 'true',
    })[key]),
  };
  let service: EmailVerificationService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EmailVerificationService(firebaseService as any, mailService as any, configService as any);
    firebaseService.getUserRecord.mockResolvedValue({
      uid: 'firebase-user-1',
      email: 'verified-target@example.com',
      emailVerified: false,
      disabled: false,
      displayName: 'A User',
    });
    firebaseService.generateEmailVerificationLink.mockResolvedValue(
      'https://project.firebaseapp.com/__/auth/action?mode=verifyEmail&oobCode=one-time-code&apiKey=public-key',
    );
    mailService.sendMail.mockResolvedValue({ provider: 'resend', success: true, messageId: 'message-1' });
  });

  it('uses the Firebase account email and wraps its action code in the configured app URL', async () => {
    await expect(service.send('firebase-user-1')).resolves.toEqual({ sent: true, alreadyVerified: false });
    expect(firebaseService.getUserRecord).toHaveBeenCalledWith('firebase-user-1');
    expect(firebaseService.generateEmailVerificationLink).toHaveBeenCalledWith(
      'verified-target@example.com',
      { url: 'http://localhost:3000/verify-email' },
    );
    expect(mailService.sendMail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'verified-target@example.com',
      subject: 'Verify your Laptop Mitra email address',
      templateName: 'email-verification',
      text: expect.stringContaining('http://localhost:3000/verify-email?mode=verifyEmail&oobCode=one-time-code'),
      html: expect.stringContaining('Verify Email'),
    }));
  });

  it('builds verification links using config-driven HTTPS base URL in production', async () => {
    configService.get.mockImplementation((key: string) => ({
      APP_PUBLIC_URL: 'https://laptop-mitra.vercel.app',
      NODE_ENV: 'production',
      ENABLE_EMAIL_VERIFICATION: 'true',
      SUPPORT_EMAIL: 'help@laptopmitra.in',
    })[key]);

    await expect(service.send('firebase-user-1')).resolves.toEqual({ sent: true, alreadyVerified: false });
    expect(firebaseService.generateEmailVerificationLink).toHaveBeenCalledWith(
      'verified-target@example.com',
      { url: 'https://laptop-mitra.vercel.app/verify-email' },
    );
    expect(mailService.sendMail).toHaveBeenCalledWith(expect.objectContaining({
      text: expect.stringContaining('https://laptop-mitra.vercel.app/verify-email?mode=verifyEmail&oobCode=one-time-code'),
    }));
  });

  it('does not send for already verified Firebase accounts', async () => {
    firebaseService.getUserRecord.mockResolvedValueOnce({
      email: 'verified-target@example.com',
      emailVerified: true,
      disabled: false,
    });
    await expect(service.send('firebase-user-1')).resolves.toEqual({ sent: false, alreadyVerified: true });
    expect(mailService.sendMail).not.toHaveBeenCalled();
  });

  it('fails closed and reports reason code when mail delivery fails', async () => {
    mailService.sendMail.mockResolvedValueOnce({
      provider: 'resend',
      success: false,
      errorCode: 'MAIL_DOMAIN_NOT_VERIFIED',
      error: 'Domain not verified',
      userMessage: 'The sending domain is not verified.',
    });
    await expect(service.send('firebase-user-1')).rejects.toMatchObject({
      status: 503,
      response: expect.objectContaining({
        error: 'MAIL_DOMAIN_NOT_VERIFIED',
        message: 'The sending domain is not verified.',
      }),
    });
  });

  it('applies a per-user cooldown after a successful send', async () => {
    await service.send('firebase-user-1');
    await expect(service.send('firebase-user-1')).rejects.toMatchObject({ status: 429 });
    expect(mailService.sendMail).toHaveBeenCalledTimes(1);
  });

  it('rejects production app URLs unless they use HTTPS', async () => {
    configService.get.mockImplementation((key: string) => ({
      APP_PUBLIC_URL: 'http://laptopmitra.example',
      NODE_ENV: 'production',
      ENABLE_EMAIL_VERIFICATION: 'true',
    })[key]);
    await expect(service.send('firebase-user-1')).rejects.toMatchObject({ status: 503 });
  });

  it('rejects sending when ENABLE_EMAIL_VERIFICATION is off', async () => {
    configService.get.mockImplementationOnce((key: string) => ({
      APP_PUBLIC_URL: 'http://localhost:3000',
      ENABLE_EMAIL_VERIFICATION: 'false',
    })[key]);
    await expect(service.send('firebase-user-1')).rejects.toThrow(
      'Email verification is temporarily disabled.',
    );
  });
});

describe('verification email template', () => {
  it('escapes untrusted greeting and includes a plain-text fallback link', () => {
    const email = buildVerificationEmail({
      recipientName: '<img src=x onerror=alert(1)>',
      verificationUrl: 'https://laptopmitra.example/verify-email?oobCode=abc',
      logoUrl: 'https://laptopmitra.example/logo.png',
      supportEmail: 'support@example.com',
      supportPhone: '+91 1234567890',
    });
    expect(email.html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(email.html).not.toContain('<img src=x');
    expect(email.text).toContain('https://laptopmitra.example/verify-email?oobCode=abc');
  });
});
