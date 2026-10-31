import { EmailVerificationService } from '../../src/auth/email-verification.service';
import { buildVerificationEmail } from '../../src/auth/email-verification.template';

describe('EmailVerificationService', () => {
  const firebaseService = {
    getUserRecord: jest.fn(),
    generateEmailVerificationLink: jest.fn(),
  };
  const mailService = { sendSmtpMail: jest.fn() };
  const configService = {
    get: jest.fn((key: string) => ({
      APP_PUBLIC_URL: 'http://localhost:3000',
      NODE_ENV: 'development',
      SUPPORT_EMAIL: 'help@example.com',
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
    mailService.sendSmtpMail.mockResolvedValue({ provider: 'smtp', success: true, messageId: 'message-1' });
  });

  it('uses the Firebase account email and wraps its action code in the configured app URL', async () => {
    await expect(service.send('firebase-user-1')).resolves.toEqual({ sent: true, alreadyVerified: false });
    expect(firebaseService.getUserRecord).toHaveBeenCalledWith('firebase-user-1');
    expect(firebaseService.generateEmailVerificationLink).toHaveBeenCalledWith(
      'verified-target@example.com',
      { url: 'http://localhost:3000/verify-email' },
    );
    expect(mailService.sendSmtpMail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'verified-target@example.com',
      subject: 'Verify your Laptop Mitra email address',
      text: expect.stringContaining('http://localhost:3000/verify-email?mode=verifyEmail&oobCode=one-time-code'),
      html: expect.stringContaining('Verify Email'),
    }));
  });

  it('does not send for already verified Firebase accounts', async () => {
    firebaseService.getUserRecord.mockResolvedValueOnce({
      email: 'verified-target@example.com',
      emailVerified: true,
      disabled: false,
    });
    await expect(service.send('firebase-user-1')).resolves.toEqual({ sent: false, alreadyVerified: true });
    expect(mailService.sendSmtpMail).not.toHaveBeenCalled();
  });

  it('fails closed when SMTP delivery fails', async () => {
    mailService.sendSmtpMail.mockResolvedValueOnce({ provider: 'smtp', success: false, error: 'offline' });
    await expect(service.send('firebase-user-1')).rejects.toMatchObject({ status: 503 });
  });

  it('applies a per-user cooldown after a successful send', async () => {
    await service.send('firebase-user-1');
    await expect(service.send('firebase-user-1')).rejects.toMatchObject({ status: 429 });
    expect(mailService.sendSmtpMail).toHaveBeenCalledTimes(1);
  });

  it('rejects production app URLs unless they use HTTPS', async () => {
    configService.get.mockImplementation((key: string) => ({
      APP_PUBLIC_URL: 'http://laptopmitra.example',
      NODE_ENV: 'production',
    })[key]);
    await expect(service.send('firebase-user-1')).rejects.toMatchObject({ status: 503 });
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
