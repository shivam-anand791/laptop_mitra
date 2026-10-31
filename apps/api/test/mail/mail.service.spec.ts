import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../../src/modules/mail/mail.service';

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    verify: jest.fn().mockResolvedValue(true),
    sendMail: jest.fn().mockResolvedValue({ messageId: 'smtp-message-1' }),
  })),
}));

describe('MailService', () => {
  let mailService: MailService;
  let mockConfig: Record<string, string>;

  beforeEach(async () => {
    mockConfig = {};
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

    mailService = module.get<MailService>(MailService);
  });

  it('should default to stdout fallback when no credentials are provided', async () => {
    await mailService.onModuleInit();
    expect(mailService.getActiveProvider()).toBe('stdout');
  });

  it('should log and return stdout mock result on sendMail in fallback mode', async () => {
    await mailService.onModuleInit();
    const result = await mailService.sendMail({
      to: 'recipient@example.com',
      subject: 'Test Subject',
      text: 'Hello World',
    });

    expect(result.provider).toBe('stdout');
    expect(result.success).toBe(true);
    expect(result.messageId).toMatch(/^stdout-/);
  });

  it('should activate Resend provider when RESEND_API_KEY is supplied', async () => {
    mockConfig['RESEND_API_KEY'] = 're_test_1234567890';
    mockConfig['MAIL_FROM'] = 'LaptopMitra <noreply@laptopmitra.com>';
    mockConfig['ALLOW_REAL_EMAILS'] = 'true';

    await mailService.onModuleInit();
    expect(mailService.getActiveProvider()).toBe('resend');
    expect(mailService.getDefaultFrom()).toBe('LaptopMitra <noreply@laptopmitra.com>');
  });

  it('should activate SMTP provider when SMTP is explicitly selected', async () => {
    mockConfig['MAIL_DRIVER'] = 'smtp';
    mockConfig['SMTP_HOST'] = 'smtp.resend.com';
    mockConfig['SMTP_PORT'] = '587';
    mockConfig['SMTP_SECURE'] = 'false';
    mockConfig['SMTP_USER'] = 'resend';
    mockConfig['SMTP_PASS'] = 're_test_smtp_pass';
    mockConfig['SMTP_FROM'] = 'Laptop Mitra <verify@example.com>';
    mockConfig['ALLOW_REAL_EMAILS'] = 'true';

    await mailService.onModuleInit();
    expect(mailService.getActiveProvider()).toBe('smtp');
    expect(mailService.getDefaultFrom()).toBe('Laptop Mitra <verify@example.com>');
    await expect(mailService.verifySmtpConnection()).resolves.toBeUndefined();
    await expect(mailService.sendSmtpMail({
      to: 'recipient@example.com',
      subject: 'Verify',
      text: 'Verification link',
    })).resolves.toMatchObject({ provider: 'smtp', success: true });
  });

  it('keeps real delivery disabled even when provider credentials are configured', async () => {
    mockConfig['RESEND_API_KEY'] = 're_test_1234567890';
    mockConfig['ALLOW_REAL_EMAILS'] = 'false';

    await mailService.onModuleInit();

    expect(mailService.getActiveProvider()).toBe('stdout');
  });
});
