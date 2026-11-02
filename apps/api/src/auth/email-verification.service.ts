import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FirebaseService } from '../firebase/firebase.service';
import { MailService } from '../modules/mail/mail.service';
import { buildVerificationEmail } from './email-verification.template';

const RESEND_COOLDOWN_MS = 60_000;

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);
  private readonly cooldowns = new Map<string, number>();

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async send(uid: string): Promise<{ sent: boolean; alreadyVerified: boolean }> {
    let firebaseUser;
    try {
      firebaseUser = await this.firebaseService.getUserRecord(uid);
    } catch {
      throw new BadRequestException('The authenticated Firebase account could not be found.');
    }

    if (firebaseUser.disabled) {
      throw new BadRequestException('This account cannot request email verification.');
    }
    if (!firebaseUser.email) {
      throw new BadRequestException('This Firebase account does not have an email address.');
    }
    if (firebaseUser.emailVerified) {
      return { sent: false, alreadyVerified: true };
    }

    this.enforceCooldown(uid);

    try {
      const appOrigin = this.getAppOrigin();
      const continueUrl = new URL('/verify-email', appOrigin).toString();
      const firebaseLink = await this.firebaseService.generateEmailVerificationLink(
        firebaseUser.email,
        { url: continueUrl },
      );
      const firebaseLinkUrl = new URL(firebaseLink);
      const oobCode = firebaseLinkUrl.searchParams.get('oobCode');
      if (firebaseLinkUrl.searchParams.get('mode') !== 'verifyEmail' || !oobCode) {
        throw new Error('Firebase did not return a verification action code.');
      }

      const verificationUrl = new URL('/verify-email', appOrigin);
      verificationUrl.searchParams.set('mode', 'verifyEmail');
      verificationUrl.searchParams.set('oobCode', oobCode);
      const content = buildVerificationEmail({
        recipientName: firebaseUser.displayName?.trim() || firebaseUser.email,
        verificationUrl: verificationUrl.toString(),
        logoUrl: new URL('/logo.png', appOrigin).toString(),
        supportEmail: this.configService.get<string>('SUPPORT_EMAIL') || 'support@laptopmitra.in',
        supportPhone: this.configService.get<string>('SUPPORT_PHONE') || '+91 7701993300',
      });

      let result = await this.mailService.sendSmtpMail({
        to: firebaseUser.email,
        subject: content.subject,
        text: content.text,
        html: content.html,
      });

      if (!result.success && this.mailService.getActiveProvider?.() === 'resend') {
        result = await this.mailService.sendMail({
          to: firebaseUser.email,
          subject: content.subject,
          text: content.text,
          html: content.html,
        });
      }

      if (!result.success) {
        throw new Error(result.error || 'Email delivery failed.');
      }

      return { sent: true, alreadyVerified: false };
    } catch (error) {
      this.logger.error(`Verification email could not be sent: ${error instanceof Error ? error.message : 'unknown error'}`);
      throw new ServiceUnavailableException('Verification email could not be sent. Please try again shortly.');
    }
  }

  private enforceCooldown(uid: string): void {
    const now = Date.now();
    for (const [key, expiresAt] of this.cooldowns) {
      if (expiresAt <= now) this.cooldowns.delete(key);
    }

    const expiresAt = this.cooldowns.get(uid);
    if (expiresAt && expiresAt > now) {
      throw new HttpException({
        message: 'Please wait before requesting another verification email.',
        retryAfterSeconds: Math.ceil((expiresAt - now) / 1000),
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    // shortcut: cooldown is process-local; move it to shared storage if the API runs multiple instances.
    this.cooldowns.set(uid, now + RESEND_COOLDOWN_MS);
  }

  private getAppOrigin(): string {
    const rawUrl = this.configService.get<string>('APP_PUBLIC_URL')?.trim();
    if (!rawUrl) throw new Error('APP_PUBLIC_URL is not configured.');

    const url = new URL(rawUrl);
    const isLocalHost = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    if (
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash ||
      (isProduction && url.protocol !== 'https:') ||
      (!isProduction && url.protocol !== 'https:' && !(url.protocol === 'http:' && isLocalHost))
    ) {
      throw new Error('APP_PUBLIC_URL must be an origin only and use HTTPS outside localhost development.');
    }

    return url.origin;
  }
}
