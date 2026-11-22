import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../../src/modules/mail/mail.service';
import { Resend } from 'resend';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    verify: jest.fn().mockResolvedValue(true),
    sendMail: jest.fn().mockResolvedValue({ messageId: 'smtp-message-1' }),
  })),
}));

jest.mock('resend', () => {
  return {
    Resend: jest.fn().mockImplementation(() => ({
      emails: {
        send: jest.fn().mockResolvedValue({ data: { id: 'msg_resend_123' }, error: null }),
      },
    })),
  };
});

describe('MailService (Phase 1 Transport Fix)', () => {
  let mailService: MailService;
  let mockConfig: Record<string, string>;

  const createModule = async (configs: Record<string, string> = {}) => {
    mockConfig = { ...configs };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => mockConfig[key] || undefined),
          },
        },
      ],
    }).compile();

    return module.get<MailService>(MailService);
  };

  beforeEach(async () => {
    mailService = await createModule();
  });

  describe('Provider Selection & Hosting Signal', () => {
    it('should default to stdout fallback when no credentials are provided', async () => {
      await mailService.onModuleInit();
      expect(mailService.getActiveProvider()).toBe('stdout');
      expect(mailService.getHealthStatus()).toBe('not configured');
    });

    it('should activate Resend provider when RESEND_API_KEY is supplied', async () => {
      mailService = await createModule({
        RESEND_API_KEY: 're_test_1234567890',
        MAIL_FROM: 'LaptopMitra <noreply@laptopmitra.com>',
        ALLOW_REAL_EMAILS: 'true',
      });

      await mailService.onModuleInit();
      expect(mailService.getActiveProvider()).toBe('resend');
      expect(mailService.getDefaultFrom()).toBe('LaptopMitra <noreply@laptopmitra.com>');
      expect(mailService.getSenderDomain()).toBe('laptopmitra.com');
      expect(mailService.getHealthStatus()).toBe('ok');
    });

    it('refuses to start SMTP when hosting signal is Render (RENDER=true)', async () => {
      mailService = await createModule({
        NODE_ENV: 'production',
        RENDER: 'true',
        MAIL_DRIVER: 'smtp',
        SMTP_HOST: 'smtp.gmail.com',
        SMTP_USER: 'user@example.com',
        SMTP_PASS: 'secret',
      });

      await mailService.onModuleInit();
      expect(mailService.getActiveProvider()).toBe('stdout');
      expect(mailService.getHealthStatus()).toBe('not configured');
      await expect(mailService.verifySmtpConnection()).rejects.toThrow(
        'SMTP is not permitted on this hosting platform',
      );
    });

    it('refuses to start SMTP in production even without explicit RENDER signal', async () => {
      mailService = await createModule({
        NODE_ENV: 'production',
        MAIL_DRIVER: 'smtp',
        SMTP_HOST: 'smtp.gmail.com',
        SMTP_USER: 'user@example.com',
        SMTP_PASS: 'secret',
      });

      await mailService.onModuleInit();
      expect(mailService.getActiveProvider()).toBe('stdout');
      expect(mailService.getHealthStatus()).toBe('not configured');
    });

    it('permits SMTP in local development mode', async () => {
      mailService = await createModule({
        NODE_ENV: 'development',
        MAIL_DRIVER: 'smtp',
        SMTP_HOST: 'localhost',
        SMTP_USER: 'dev',
        SMTP_PASS: 'devpass',
        ALLOW_REAL_EMAILS: 'true',
      });

      await mailService.onModuleInit();
      expect(mailService.getActiveProvider()).toBe('smtp');
      expect(mailService.getHealthStatus()).toBe('ok');
    });
  });

  describe('Startup Validation in Production', () => {
    it('marks mail status as degraded if MAIL_FROM uses a free-mail domain in production', async () => {
      mailService = await createModule({
        NODE_ENV: 'production',
        RESEND_API_KEY: 're_test_1234567890',
        MAIL_FROM: 'Laptop Mitra <laptopmitra@gmail.com>',
      });

      await mailService.onModuleInit();
      expect(mailService.getActiveProvider()).toBe('resend');
      expect(mailService.getSenderDomain()).toBe('gmail.com');
      expect(mailService.getHealthStatus()).toBe('degraded');
    });

    it('marks mail status as ok if MAIL_FROM uses a verified custom domain in production', async () => {
      mailService = await createModule({
        NODE_ENV: 'production',
        RESEND_API_KEY: 're_test_1234567890',
        MAIL_FROM: 'Laptop Mitra <noreply@mail.laptopmitra.in>',
      });

      await mailService.onModuleInit();
      expect(mailService.getActiveProvider()).toBe('resend');
      expect(mailService.getSenderDomain()).toBe('mail.laptopmitra.in');
      expect(mailService.getHealthStatus()).toBe('ok');
    });
  });

  describe('Honest Results & Reason-Coded Errors', () => {
    it('never reports success in production stdout fallback mode', async () => {
      mailService = await createModule({
        NODE_ENV: 'production',
      });
      await mailService.onModuleInit();

      const result = await mailService.sendMail({
        to: 'buyer@example.com',
        subject: 'Order Confirmed',
        text: 'Your order details',
      });

      expect(result.success).toBe(false);
      expect(result.provider).toBe('stdout');
      expect(result.errorCode).toBe('MAIL_NOT_CONFIGURED');
      expect(result.userMessage).toContain('unconfigured');
    });

    it('maps Resend domain verification error to MAIL_DOMAIN_NOT_VERIFIED', async () => {
      const mockSend = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Validation error: sending domain is not verified in Resend.' },
      });
      (Resend as unknown as jest.Mock).mockImplementationOnce(() => ({
        emails: { send: mockSend },
      }));

      mailService = await createModule({
        RESEND_API_KEY: 're_test_123',
        MAIL_FROM: 'noreply@unverified.com',
        ALLOW_REAL_EMAILS: 'true',
      });
      await mailService.onModuleInit();

      const result = await mailService.sendMail({
        to: 'user@example.com',
        subject: 'Verify',
        text: 'Link',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('MAIL_DOMAIN_NOT_VERIFIED');
      expect(result.userMessage).toContain('domain is not verified');
    });

    it('maps Resend sandbox recipient error to MAIL_RECIPIENT_NOT_ALLOWED', async () => {
      const mockSend = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'You can only send testing emails to your own account address.' },
      });
      (Resend as unknown as jest.Mock).mockImplementationOnce(() => ({
        emails: { send: mockSend },
      }));

      mailService = await createModule({
        RESEND_API_KEY: 're_test_123',
        MAIL_FROM: 'noreply@laptopmitra.com',
        ALLOW_REAL_EMAILS: 'true',
      });
      await mailService.onModuleInit();

      const result = await mailService.sendMail({
        to: 'stranger@example.com',
        subject: 'Verify',
        text: 'Link',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('MAIL_RECIPIENT_NOT_ALLOWED');
      expect(result.userMessage).toContain('account owner address');
    });

    it('retries on transient 429 rate limit errors with backoff', async () => {
      const mockSend = jest
        .fn()
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'API rate limit exceeded (429 too many requests)' },
        })
        .mockResolvedValueOnce({
          data: { id: 'msg_success_after_retry' },
          error: null,
        });

      (Resend as unknown as jest.Mock).mockImplementationOnce(() => ({
        emails: { send: mockSend },
      }));

      mailService = await createModule({
        RESEND_API_KEY: 're_test_123',
        MAIL_FROM: 'noreply@laptopmitra.com',
        ALLOW_REAL_EMAILS: 'true',
      });
      await mailService.onModuleInit();

      const result = await mailService.sendMail({
        to: 'user@example.com',
        subject: 'Verify',
        text: 'Link',
      });

      expect(mockSend).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg_success_after_retry');
    });
  });

  describe('Domain & Masking Helpers', () => {
    it('correctly extracts domains from display names or raw emails', () => {
      expect(MailService.extractSenderDomain('Laptop Mitra <verify@mail.laptopmitra.in>')).toBe('mail.laptopmitra.in');
      expect(MailService.extractSenderDomain('sales@laptopmitra.com')).toBe('laptopmitra.com');
      expect(MailService.extractSenderDomain('invalid-format')).toBe('');
    });

    it('masks email addresses preserving only first and last local characters', () => {
      expect(MailService.maskEmail('customer@laptopmitra.in')).toBe('c***r@laptopmitra.in');
      expect(MailService.maskEmail('a@b.com')).toBe('*@b.com');
      expect(MailService.maskEmail('me@example.com')).toBe('m*@example.com');
      expect(MailService.maskEmail('dev@example.com')).toBe('d***v@example.com');
    });
  });
});
