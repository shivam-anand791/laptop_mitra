import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../../src/modules/mail/mail.service';

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

  it('should default to stdout fallback when no credentials are provided', () => {
    mailService.onModuleInit();
    expect(mailService.getActiveProvider()).toBe('stdout');
  });

  it('should log and return stdout mock result on sendMail in fallback mode', async () => {
    mailService.onModuleInit();
    const result = await mailService.sendMail({
      to: 'recipient@example.com',
      subject: 'Test Subject',
      text: 'Hello World',
    });

    expect(result.provider).toBe('stdout');
    expect(result.success).toBe(true);
    expect(result.messageId).toMatch(/^stdout-/);
  });

  it('should activate Resend provider when RESEND_API_KEY is supplied', () => {
    mockConfig['RESEND_API_KEY'] = 're_test_1234567890';
    mockConfig['MAIL_FROM'] = 'LaptopMitra <noreply@laptopmitra.com>';

    mailService.onModuleInit();
    expect(mailService.getActiveProvider()).toBe('resend');
    expect(mailService.getDefaultFrom()).toBe('LaptopMitra <noreply@laptopmitra.com>');
  });

  it('should activate SMTP provider when SMTP credentials are supplied without Resend', () => {
    mockConfig['SMTP_HOST'] = 'smtp.resend.com';
    mockConfig['SMTP_PORT'] = '587';
    mockConfig['SMTP_USER'] = 'resend';
    mockConfig['SMTP_PASS'] = 're_test_smtp_pass';

    mailService.onModuleInit();
    expect(mailService.getActiveProvider()).toBe('smtp');
  });
});
