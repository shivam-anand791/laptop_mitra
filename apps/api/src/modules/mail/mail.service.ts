import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';
import {
  MailErrorCode,
  MailHealthStatus,
  MailSendResult,
  SendMailOptions,
} from './mail.interfaces';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private activeProvider: 'resend' | 'smtp' | 'stdout' = 'stdout';
  private resendClient?: Resend;
  private smtpTransporter?: nodemailer.Transporter;
  private defaultFrom: string = 'LaptopMitra <noreply@laptopmitra.com>';
  private senderDomain: string = 'laptopmitra.com';
  private isDegraded: boolean = false;
  private degradedReason?: string;

  // Resend Free Tier Quota & Failure Rate Tracking (100/day limit)
  private readonly DAILY_SEND_LIMIT = 100;
  private dailySendCount = 0;
  private currentSendDate = new Date().toISOString().slice(0, 10);
  private recentFailureCount = 0;
  private recentSuccessCount = 0;

  private static readonly FREE_MAIL_DOMAINS = new Set([
    'gmail.com',
    'yahoo.com',
    'hotmail.com',
    'outlook.com',
    'live.com',
    'icloud.com',
    'aol.com',
    'zoho.com',
    'proton.me',
    'protonmail.com',
    'mail.com',
    'yandex.com',
    'gmx.com',
  ]);

  constructor(@Optional() private readonly configService?: ConfigService) {}

  async onModuleInit() {
    this.initializeTransport();
    if (this.activeProvider === 'smtp') {
      try {
        await this.smtpTransporter?.verify();
        this.logger.log('[MailService:SMTP] SMTP connection verified.');
      } catch (err: any) {
        this.logger.error(`[MailService:SMTP] Connection verification failed: ${err?.message || err}`);
        this.isDegraded = true;
        this.degradedReason = `SMTP connection failed: ${err?.message || err}`;
      }
    }
  }

  private getEnv(key: string): string | undefined {
    if (this.configService) {
      return this.configService.get<string>(key);
    }
    return process.env[key];
  }

  public static extractSenderDomain(from: string): string {
    const match = from.match(/<([^>]+)>/) || [null, from];
    const email = (match[1] || from).trim();
    const atIdx = email.lastIndexOf('@');
    if (atIdx === -1) return '';
    return email.slice(atIdx + 1).toLowerCase();
  }

  public static isFreeMailDomain(domain: string): boolean {
    return MailService.FREE_MAIL_DOMAINS.has(domain.toLowerCase());
  }

  public static maskEmail(email: string): string {
    if (!email || typeof email !== 'string') return '***';
    const trimmed = email.trim();
    const atIdx = trimmed.indexOf('@');
    if (atIdx === -1) return '***';
    const local = trimmed.slice(0, atIdx);
    const domain = trimmed.slice(atIdx + 1);
    if (local.length <= 1) return `*@${domain}`;
    if (local.length === 2) return `${local[0]}*@${domain}`;
    return `${local[0]}***${local[local.length - 1]}@${domain}`;
  }

  private initializeTransport() {
    const nodeEnv = this.getEnv('NODE_ENV') || 'development';
    const isProduction = nodeEnv === 'production';
    const isRender = !!this.getEnv('RENDER');
    const mailDriver = (this.getEnv('MAIL_DRIVER') || '').toLowerCase();
    const allowRealEmails = this.getEnv('ALLOW_REAL_EMAILS') === 'true';
    const resendApiKey = this.getEnv('RESEND_API_KEY');
    const rawMailFrom = this.getEnv('MAIL_FROM') || this.getEnv('EMAIL_FROM');

    if (rawMailFrom) {
      this.defaultFrom = rawMailFrom;
    }
    this.senderDomain = MailService.extractSenderDomain(this.defaultFrom);

    // 1. Production Validation
    if (isProduction) {
      if (MailService.isFreeMailDomain(this.senderDomain)) {
        this.isDegraded = true;
        this.degradedReason = `MAIL_FROM is on free-mail domain "${this.senderDomain}". In production, a custom verified domain is required to pass SPF/DKIM/DMARC.`;
        this.logger.error(`[MailService:StartupValidation] REJECTED: ${this.degradedReason}`);
      }

      // Check hosting signal: Render blocks outbound SMTP ports 25, 465, 587 on free instances
      if (mailDriver === 'smtp') {
        if (isRender || isProduction) {
          this.isDegraded = true;
          this.degradedReason = `SMTP requested in production/Render. Render blocks outbound SMTP ports (25/465/587). Production must use Resend HTTP API.`;
          this.logger.error(`[MailService] Refusing to initialize SMTP in production: ${this.degradedReason}`);
          this.activeProvider = 'stdout';
          return;
        }
      }
    }

    // 2. STDOUT override when disabled or requested as console
    if (mailDriver === 'console' || (!allowRealEmails && !isProduction)) {
      this.activeProvider = 'stdout';
      this.logger.log(
        `[MailService] Initialized in STDOUT mode (${mailDriver === 'console' ? 'MAIL_DRIVER=console' : 'ALLOW_REAL_EMAILS is not true'})`,
      );
      return;
    }

    // 3. Resend HTTP API (Primary production provider)
    if (resendApiKey && mailDriver !== 'smtp') {
      try {
        this.resendClient = new Resend(resendApiKey);
        this.activeProvider = 'resend';
        this.logger.log(
          `[MailService] Initialized with primary provider: Resend (Sender domain: "${this.senderDomain}", Provider: resend)`,
        );
        return;
      } catch (err: any) {
        this.logger.error(`[MailService] Failed to initialize Resend client: ${err?.message || err}`);
        this.isDegraded = true;
        this.degradedReason = `Resend init failed: ${err?.message || err}`;
      }
    }

    // 4. Nodemailer SMTP (Available for local development only)
    if (mailDriver === 'smtp' && !isProduction && !isRender) {
      const smtpHost = this.getEnv('SMTP_HOST');
      const smtpUser = this.getEnv('SMTP_USER');
      const smtpPass = this.getEnv('SMTP_PASS');
      const smtpPort = parseInt(this.getEnv('SMTP_PORT') || '587', 10);

      if (smtpHost && smtpUser && smtpPass) {
        try {
          this.smtpTransporter = this.createSmtpTransporter();
          if (this.getEnv('SMTP_FROM')) {
            this.defaultFrom = this.getEnv('SMTP_FROM')!;
            this.senderDomain = MailService.extractSenderDomain(this.defaultFrom);
          }
          this.activeProvider = 'smtp';
          this.logger.log(
            `[MailService] Initialized with local dev SMTP provider (${smtpHost}:${smtpPort}, Sender domain: "${this.senderDomain}")`,
          );
          return;
        } catch (err: any) {
          this.logger.error(`[MailService] Failed to initialize SMTP transporter: ${err?.message || err}`);
          this.isDegraded = true;
          this.degradedReason = `SMTP init failed: ${err?.message || err}`;
        }
      }
    }

    // 5. Unconfigured Fallback
    this.activeProvider = 'stdout';
    if (isProduction) {
      this.isDegraded = true;
      this.degradedReason = 'Neither valid RESEND_API_KEY nor verified MAIL_FROM domain is configured in production.';
    }
    this.logger.warn(
      `========================================================================================\n` +
      `[MailService] WARNING: No active outbound email transport configured!\n` +
      `RESEND_API_KEY is ${resendApiKey ? 'provided' : 'MISSING'}. Sender domain is "${this.senderDomain}".\n` +
      `Operating in STDOUT fallback mode.\n` +
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

  getSenderDomain(): string {
    return this.senderDomain;
  }

  getHealthStatus(): MailHealthStatus {
    if (this.activeProvider === 'stdout' && this.isProductionEnv()) {
      return 'not configured';
    }
    if (this.isDegraded) {
      return 'degraded';
    }
    if (this.activeProvider === 'resend' || this.activeProvider === 'smtp') {
      return 'ok';
    }
    return 'not configured';
  }

  getDailyMetrics() {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== this.currentSendDate) {
      this.dailySendCount = 0;
      this.currentSendDate = today;
      this.recentFailureCount = 0;
      this.recentSuccessCount = 0;
    }
    return {
      sendsToday: this.dailySendCount,
      dailyLimit: this.DAILY_SEND_LIMIT,
      recentSuccessCount: this.recentSuccessCount,
      recentFailureCount: this.recentFailureCount,
      isDegraded: this.isDegraded,
      degradedReason: this.degradedReason,
    };
  }

  private recordSendAttempt(success: boolean): void {
    const today = new Date().toISOString().slice(0, 10);
    if (today !== this.currentSendDate) {
      this.dailySendCount = 0;
      this.currentSendDate = today;
      this.recentFailureCount = 0;
      this.recentSuccessCount = 0;
    }

    if (success) {
      this.dailySendCount++;
      this.recentSuccessCount++;
      if (this.dailySendCount >= 80 && this.dailySendCount < this.DAILY_SEND_LIMIT) {
        this.logger.warn(
          `[MailService:QuotaWarning] Daily send volume reached ${this.dailySendCount}/${this.DAILY_SEND_LIMIT} (80% of free tier quota).`,
        );
      } else if (this.dailySendCount >= this.DAILY_SEND_LIMIT) {
        this.logger.error(
          `[MailService:QuotaExceeded] Daily send limit reached (${this.dailySendCount}/${this.DAILY_SEND_LIMIT}). Future sends may be rejected by provider.`,
        );
      }
    } else {
      this.recentFailureCount++;
      const totalRecent = this.recentSuccessCount + this.recentFailureCount;
      if (totalRecent >= 5 && this.recentFailureCount / totalRecent >= 0.5) {
        this.isDegraded = true;
        this.degradedReason = `Elevated delivery failure rate: ${this.recentFailureCount}/${totalRecent} failed.`;
        this.logger.error(
          `[MailService:Monitoring] Elevated failure rate detected: ${this.recentFailureCount}/${totalRecent} recent attempts failed.`,
        );
      }
    }
  }

  private isProductionEnv(): boolean {
    return (this.getEnv('NODE_ENV') || 'development') === 'production';
  }

  private parseResendError(message: string): { errorCode: MailErrorCode; userMessage: string; isTransient: boolean } {
    const lower = (message || '').toLowerCase();
    if (
      lower.includes('domain is not verified') ||
      (lower.includes('domain') && lower.includes('not verified')) ||
      lower.includes('verify your domain')
    ) {
      return {
        errorCode: 'MAIL_DOMAIN_NOT_VERIFIED',
        userMessage: 'The email sending domain is not verified. Please verify DNS records in Resend.',
        isTransient: false,
      };
    }
    if (
      lower.includes('can only send testing emails to your own account') ||
      lower.includes('testing emails') ||
      lower.includes('recipient not allowed')
    ) {
      return {
        errorCode: 'MAIL_RECIPIENT_NOT_ALLOWED',
        userMessage: 'In test mode, emails can only be sent to the verified account owner address.',
        isTransient: false,
      };
    }
    if (lower.includes('rate limit') || lower.includes('too many requests') || lower.includes('429')) {
      return {
        errorCode: 'MAIL_RATE_LIMITED',
        userMessage: 'Email delivery rate limit reached. Please wait a moment before trying again.',
        isTransient: true,
      };
    }
    if (
      lower.includes('timeout') ||
      lower.includes('econnrefused') ||
      lower.includes('enotfound') ||
      lower.includes('500') ||
      lower.includes('502') ||
      lower.includes('503') ||
      lower.includes('504')
    ) {
      return {
        errorCode: 'MAIL_PROVIDER_UNAVAILABLE',
        userMessage: 'The email delivery service is temporarily unavailable. Please try again shortly.',
        isTransient: true,
      };
    }
    return {
      errorCode: 'MAIL_PROVIDER_UNAVAILABLE',
      userMessage: 'Unable to send email right now. Please try again shortly.',
      isTransient: false,
    };
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async verifySmtpConnection(): Promise<void> {
    if (this.isProductionEnv() || this.getEnv('RENDER')) {
      throw new Error('SMTP is not permitted on this hosting platform.');
    }
    if (this.activeProvider !== 'smtp') {
      throw new Error('SMTP delivery is not enabled.');
    }
    if (!this.smtpTransporter) this.smtpTransporter = this.createSmtpTransporter();
    await this.smtpTransporter.verify();
  }

  async sendSmtpMail(options: SendMailOptions): Promise<MailSendResult> {
    if (this.isProductionEnv() || this.getEnv('RENDER')) {
      return {
        provider: 'smtp',
        success: false,
        errorCode: 'MAIL_PROVIDER_UNAVAILABLE',
        error: 'SMTP is blocked on this hosting environment. Use Resend HTTP API.',
        userMessage: 'SMTP transport is not available in production.',
      };
    }

    if (this.activeProvider !== 'smtp') {
      return {
        provider: 'smtp',
        success: false,
        errorCode: 'MAIL_NOT_CONFIGURED',
        error: 'SMTP delivery is not enabled.',
        userMessage: 'SMTP delivery is not configured.',
      };
    }

    const from = options.from || this.defaultFrom;
    const to = Array.isArray(options.to) ? options.to : [options.to];
    const maskedTo = to.map(MailService.maskEmail).join(', ');

    try {
      if (!this.smtpTransporter) this.smtpTransporter = this.createSmtpTransporter();
      const info = await this.smtpTransporter.sendMail({
        from,
        to: to.join(', '),
        subject: options.subject,
        text: options.text || '',
        html: options.html,
      });
      this.logger.log(`[MailService:SMTP] Email sent to ${maskedTo} (MessageId: ${info.messageId})`);
      this.recordSendAttempt(true);
      return { provider: 'smtp', messageId: info.messageId, success: true };
    } catch (err: any) {
      this.logger.error(`[MailService:SMTP] Delivery failed to ${maskedTo}: ${err?.message || err}`);
      this.recordSendAttempt(false);
      return {
        provider: 'smtp',
        success: false,
        errorCode: 'MAIL_PROVIDER_UNAVAILABLE',
        error: err?.message || String(err),
        userMessage: 'Local SMTP delivery failed.',
      };
    }
  }

  async sendMail(options: SendMailOptions): Promise<MailSendResult> {
    const from = options.from || this.defaultFrom;
    const to = Array.isArray(options.to) ? options.to : [options.to];
    const maskedTo = to.map(MailService.maskEmail).join(', ');
    const isProduction = this.isProductionEnv();

    // 1. Dispatch via Resend HTTP API with backoff retry on transient errors
    if (this.activeProvider === 'resend' && this.resendClient) {
      const maxAttempts = 3;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const { data, error } = await this.resendClient.emails.send({
            from,
            to,
            subject: options.subject,
            text: options.text || '',
            html: options.html,
          });

          if (error) {
            const parsed = this.parseResendError(error.message);
            if (parsed.isTransient && attempt < maxAttempts) {
              const backoff = attempt * 500;
              this.logger.warn(`[MailService:Resend] Transient error (attempt ${attempt}/${maxAttempts}): ${error.message}. Retrying in ${backoff}ms...`);
              await this.delay(backoff);
              continue;
            }
            this.logger.error(`[MailService:Resend] Delivery failed to ${maskedTo}: [${parsed.errorCode}] ${error.message}`);
            this.recordSendAttempt(false);
            return {
              provider: 'resend',
              success: false,
              errorCode: parsed.errorCode,
              error: error.message,
              userMessage: parsed.userMessage,
            };
          }

          this.logger.log(`[MailService:Resend] Email sent to ${maskedTo} (ID: ${data?.id})`);
          this.recordSendAttempt(true);
          return {
            provider: 'resend',
            messageId: data?.id,
            success: true,
          };
        } catch (err: any) {
          const rawMsg = err?.message || String(err);
          const parsed = this.parseResendError(rawMsg);
          if (parsed.isTransient && attempt < maxAttempts) {
            const backoff = attempt * 500;
            this.logger.warn(`[MailService:Resend] Exception (attempt ${attempt}/${maxAttempts}): ${rawMsg}. Retrying in ${backoff}ms...`);
            await this.delay(backoff);
            continue;
          }
          this.logger.error(`[MailService:Resend] Exception sending email to ${maskedTo}: ${rawMsg}`);
          this.recordSendAttempt(false);
          return {
            provider: 'resend',
            success: false,
            errorCode: parsed.errorCode,
            error: rawMsg,
            userMessage: parsed.userMessage,
          };
        }
      }
    }

    // 2. Dispatch via local development SMTP
    if (this.activeProvider === 'smtp' && this.smtpTransporter && !isProduction) {
      return this.sendSmtpMail(options);
    }

    // 3. STDOUT Fallback — Honest Results & Secrets Protection
    if (isProduction) {
      // In production, NEVER falsely claim an email was sent! Never leak credentials/OTPs/links in logs!
      this.logger.warn(
        `[MailService:STDOUT Fallback] Email requested in PRODUCTION but no active provider is operational.\n` +
        `  Template: ${options.templateName || 'general'}\n` +
        `  Recipient: ${maskedTo}\n` +
        `  Subject: ${options.subject}\n` +
        `  Notice: Body, tokens, and credentials redacted.`
      );
      this.recordSendAttempt(false);
      return {
        provider: 'stdout',
        success: false,
        errorCode: 'MAIL_NOT_CONFIGURED',
        error: 'Email delivery is not configured in production.',
        userMessage: 'Email delivery service is currently unconfigured.',
      };
    }

    // In local development, print outgoing email for developer inspection
    this.logger.log(
      `\n------------------- [OUTGOING EMAIL (DEV STDOUT)] -------------------\n` +
      `From:     ${from}\n` +
      `To:       ${maskedTo}\n` +
      `Subject:  ${options.subject}\n` +
      `Template: ${options.templateName || 'general'}\n` +
      `Body:\n${options.text || options.html || '(empty)'}\n` +
      `--------------------------------------------------------------------\n`
    );

    this.recordSendAttempt(true);
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
      templateName: 'admin-test',
      subject: `[LaptopMitra] Transport Diagnostics (${this.activeProvider.toUpperCase()})`,
      text: `LaptopMitra Mail Delivery Diagnostic.\nActive Provider: ${this.activeProvider}\nSender Domain: ${this.senderDomain}\nDispatched at: ${timestamp}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0f172a; margin-top: 0;">LaptopMitra Mail Delivery Diagnostic</h2>
          <p style="color: #475569; font-size: 15px; line-height: 1.5;">This diagnostic verification email confirms outbound email transport is operational.</p>
          <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; font-size: 14px; color: #334155;"><strong>Active Provider:</strong> ${this.activeProvider.toUpperCase()}</p>
            <p style="margin: 4px 0 0; font-size: 14px; color: #334155;"><strong>Sender Domain:</strong> ${this.senderDomain}</p>
            <p style="margin: 4px 0 0; font-size: 14px; color: #334155;"><strong>Dispatched At:</strong> ${timestamp}</p>
          </div>
        </div>
      `,
    });
  }
}
