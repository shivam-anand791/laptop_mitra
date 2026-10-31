import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';
import { MailSendResult, SendMailOptions } from './mail.interfaces';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private activeProvider: 'resend' | 'smtp' | 'stdout' = 'stdout';
  private resendClient?: Resend;
  private smtpTransporter?: nodemailer.Transporter;
  private defaultFrom: string = 'LaptopMitra <noreply@laptopmitra.com>';

  constructor(@Optional() private readonly configService?: ConfigService) {}

  async onModuleInit() {
    this.initializeTransport();
    if (this.activeProvider === 'smtp') {
      try {
        await this.smtpTransporter?.verify();
        this.logger.log('[MailService:SMTP] SMTP connection verified.');
      } catch (err: any) {
        this.logger.error(`[MailService:SMTP] Connection verification failed: ${err?.message || err}`);
      }
    }
  }

  private getEnv(key: string): string | undefined {
    if (this.configService) {
      return this.configService.get<string>(key);
    }
    return process.env[key];
  }

  private initializeTransport() {
    const mailDriver = this.getEnv('MAIL_DRIVER');
    const allowRealEmails = this.getEnv('ALLOW_REAL_EMAILS') === 'true';
    const resendApiKey = this.getEnv('RESEND_API_KEY');
    const mailFrom = this.getEnv('MAIL_FROM') || this.getEnv('EMAIL_FROM');
    if (mailFrom) {
      this.defaultFrom = mailFrom;
    }

    if (mailDriver === 'console' || !allowRealEmails) {
      this.activeProvider = 'stdout';
      this.logger.log(
        `[MailService] Initialized in STDOUT mode (${mailDriver === 'console' ? 'MAIL_DRIVER=console' : 'ALLOW_REAL_EMAILS is not true'})`,
      );
      return;
    }

    const smtpHost = this.getEnv('SMTP_HOST');
    const smtpPort = parseInt(this.getEnv('SMTP_PORT') || '587', 10);
    const smtpUser = this.getEnv('SMTP_USER');
    const smtpPass = this.getEnv('SMTP_PASS');

    if (resendApiKey && mailDriver !== 'smtp') {
      try {
        this.resendClient = new Resend(resendApiKey);
        this.activeProvider = 'resend';
        this.logger.log(`[MailService] Initialized with primary provider: Resend (Default From: "${this.defaultFrom}")`);
        return;
      } catch (err: any) {
        this.logger.error(`[MailService] Failed to initialize Resend client: ${err?.message || err}`);
      }
    }

    if (mailDriver === 'smtp' && smtpHost && smtpUser && smtpPass) {
      try {
        this.smtpTransporter = this.createSmtpTransporter();
        if (this.getEnv('SMTP_FROM')) this.defaultFrom = this.getEnv('SMTP_FROM')!;
        this.activeProvider = 'smtp';
        this.logger.log(`[MailService] Initialized with SMTP provider (${smtpHost}:${smtpPort}, Default From: "${this.defaultFrom}")`);
        return;
      } catch (err: any) {
        this.logger.error(`[MailService] Failed to initialize SMTP transporter: ${err?.message || err}`);
      }
    }

    this.activeProvider = 'stdout';
    this.logger.warn(
      `========================================================================================\n` +
      `[MailService] WARNING: No active email transport configured!\n` +
      `Neither RESEND_API_KEY nor SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASS) are set.\n` +
      `Operating in STDOUT fallback mode: outgoing emails will be logged to console only.\n` +
      `To activate real delivery, provide RESEND_API_KEY and MAIL_FROM in environment variables.\n` +
      `========================================================================================`
    );
  }

  private createSmtpTransporter(): nodemailer.Transporter {
    const host = this.getEnv('SMTP_HOST');
    const user = this.getEnv('SMTP_USER');
    const pass = this.getEnv('SMTP_PASS');
    const port = Number(this.getEnv('SMTP_PORT') || 587);
    const secureValue = this.getEnv('SMTP_SECURE')?.toLowerCase();

    if (!host || !user || !pass || !Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS must be configured.');
    }
    if (secureValue && secureValue !== 'true' && secureValue !== 'false') {
      throw new Error('SMTP_SECURE must be true or false.');
    }

    return nodemailer.createTransport({
      host,
      port,
      secure: secureValue ? secureValue === 'true' : port === 465,
      auth: { user, pass },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
    });
  }

  getActiveProvider(): 'resend' | 'smtp' | 'stdout' {
    return this.activeProvider;
  }

  getDefaultFrom(): string {
    return this.defaultFrom;
  }

  async verifySmtpConnection(): Promise<void> {
    if (this.getEnv('MAIL_DRIVER') !== 'smtp' || this.getEnv('ALLOW_REAL_EMAILS') !== 'true') {
      throw new Error('SMTP delivery is not enabled. Set MAIL_DRIVER=smtp and ALLOW_REAL_EMAILS=true.');
    }
    if (!this.smtpTransporter) this.smtpTransporter = this.createSmtpTransporter();
    await this.smtpTransporter.verify();
  }

  async sendSmtpMail(options: SendMailOptions): Promise<MailSendResult> {
    if (this.getEnv('MAIL_DRIVER') !== 'smtp' || this.getEnv('ALLOW_REAL_EMAILS') !== 'true') {
      return { provider: 'smtp', success: false, error: 'SMTP delivery is not enabled.' };
    }

    const from = this.getEnv('SMTP_FROM');
    if (!from) {
      return { provider: 'smtp', success: false, error: 'SMTP_FROM is not configured.' };
    }

    try {
      if (!this.smtpTransporter) this.smtpTransporter = this.createSmtpTransporter();
      const info = await this.smtpTransporter.sendMail({
        from: options.from || from,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        text: options.text || '',
        html: options.html,
      });
      this.logger.log(`[MailService:SMTP] Email sent (MessageId: ${info.messageId})`);
      return { provider: 'smtp', messageId: info.messageId, success: true };
    } catch (err: any) {
      this.logger.error(`[MailService:SMTP] Delivery failed: ${err?.message || err}`);
      return { provider: 'smtp', success: false, error: err?.message || String(err) };
    }
  }

  async sendMail(options: SendMailOptions): Promise<MailSendResult> {
    const from = options.from || this.defaultFrom;
    const to = Array.isArray(options.to) ? options.to : [options.to];

    if (this.activeProvider === 'resend' && this.resendClient) {
      try {
        const { data, error } = await this.resendClient.emails.send({
          from,
          to,
          subject: options.subject,
          text: options.text || '',
          html: options.html,
        });

        if (error) {
          this.logger.error(`[MailService:Resend] Failed to send email to ${to.join(', ')}: ${error.message}`);
          return {
            provider: 'resend',
            success: false,
            error: error.message,
          };
        }

        this.logger.log(`[MailService:Resend] Email sent to ${to.join(', ')} (ID: ${data?.id})`);
        return {
          provider: 'resend',
          messageId: data?.id,
          success: true,
        };
      } catch (err: any) {
        this.logger.error(`[MailService:Resend] Exception sending email: ${err?.message || err}`);
        return {
          provider: 'resend',
          success: false,
          error: err?.message || String(err),
        };
      }
    }

    if (this.activeProvider === 'smtp' && this.smtpTransporter) {
      try {
        const info = await this.smtpTransporter.sendMail({
          from,
          to: to.join(', '),
          subject: options.subject,
          text: options.text,
          html: options.html,
        });

        this.logger.log(`[MailService:SMTP] Email sent to ${to.join(', ')} (MessageId: ${info.messageId})`);
        return {
          provider: 'smtp',
          messageId: info.messageId,
          success: true,
        };
      } catch (err: any) {
        this.logger.error(`[MailService:SMTP] Exception sending email: ${err?.message || err}`);
        return {
          provider: 'smtp',
          success: false,
          error: err?.message || String(err),
        };
      }
    }

    // Stdout Fallback
    this.logger.log(
      `\n------------------- [OUTGOING EMAIL (STDOUT FALLBACK)] -------------------\n` +
      `From:    ${from}\n` +
      `To:      ${to.join(', ')}\n` +
      `Subject: ${options.subject}\n` +
      `Body:\n${options.text || options.html || '(empty)'}\n` +
      `--------------------------------------------------------------------------\n`
    );

    return {
      provider: 'stdout',
      messageId: `stdout-${Date.now()}`,
      success: true,
    };
  }

  async sendTestEmail(recipientEmail: string): Promise<MailSendResult> {
    const timestamp = new Date().toISOString();
    return this.sendMail({
      to: recipientEmail,
      subject: `[LaptopMitra] Verification & Test Email (${this.activeProvider.toUpperCase()})`,
      text: `Hello,\n\nThis is a verification test email from LaptopMitra MailService.\nActive Provider: ${this.activeProvider}\nDispatched at: ${timestamp}\n\nIf you received this email, outbound delivery is working properly.`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0f172a; margin-top: 0;">LaptopMitra Mail Delivery Test</h2>
          <p style="color: #475569; font-size: 15px; line-height: 1.5;">This is a verification test email sent from the LaptopMitra platform.</p>
          <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; color: #334155;"><strong>Active Provider:</strong> ${this.activeProvider.toUpperCase()}</p>
            <p style="margin: 4px 0 0; font-size: 14px; color: #334155;"><strong>Timestamp:</strong> ${timestamp}</p>
            <p style="margin: 4px 0 0; font-size: 14px; color: #334155;"><strong>Default From:</strong> ${this.defaultFrom}</p>
          </div>
          <p style="color: #64748b; font-size: 13px;">If you received this message, outbound mail transport is configured and operational.</p>
        </div>
      `,
    });
  }
}
