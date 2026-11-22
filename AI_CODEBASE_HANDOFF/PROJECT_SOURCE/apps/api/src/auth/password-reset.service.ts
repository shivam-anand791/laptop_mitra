import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FirebaseService } from '../firebase/firebase.service';
import { MailService } from '../modules/mail/mail.service';
import {
  buildPasswordResetEmail,
  buildPasswordResetConfirmationEmail,
} from './password-reset.template';

const RESET_COOLDOWN_MS = 60_000;
const GENERIC_RESET_MESSAGE =
  'If an account exists with that email, a password reset link has been dispatched.';

@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);
  private readonly cooldowns = new Map<string, number>();

  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async sendResetLink(rawEmail: string): Promise<{ success: boolean; message: string }> {
    if (!rawEmail || typeof rawEmail !== 'string') {
      throw new BadRequestException('Please provide a valid email address.');
    }

    const email = rawEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('Please provide a valid email address.');
    }

    this.enforceCooldown(email);

    const maskedEmail = this.maskEmail(email);

    try {
      const appOrigin = this.getAppOrigin();
      const continueUrl = new URL('/reset-password', appOrigin).toString();

      let firebaseLink: string;
      try {
        firebaseLink = await this.firebaseService.generatePasswordResetLink(email, {
          url: continueUrl,
        });
      } catch (fbErr: any) {
        const code = fbErr?.code || '';
        const msg = fbErr?.message || '';
        // If the email doesn't exist in Firebase Auth, silently return generic success to prevent enumeration
        if (code === 'auth/user-not-found' || msg.includes('user-not-found') || msg.includes('no user record')) {
          this.logger.debug(
            `[PasswordReset] Requested for non-existent account (${maskedEmail}). Returning generic success response.`,
          );
          return { success: true, message: GENERIC_RESET_MESSAGE };
        }
        throw fbErr;
      }

      const firebaseLinkUrl = new URL(firebaseLink);
      const oobCode = firebaseLinkUrl.searchParams.get('oobCode');
      if (!oobCode) {
        throw new Error('Firebase did not return a password reset action code.');
      }

      const resetUrl = new URL('/reset-password', appOrigin);
      resetUrl.searchParams.set('mode', 'resetPassword');
      resetUrl.searchParams.set('oobCode', oobCode);

      // Attempt to resolve display name from Firebase to address the user respectfully
      let recipientName = email.split('@')[0];
      try {
        const userRecord = await this.firebaseService.getUserByEmail(email);
        if (userRecord.displayName?.trim()) {
          recipientName = userRecord.displayName.trim();
        }
      } catch {
        // Fall back to local part if lookup fails
      }

      const content = buildPasswordResetEmail({
        recipientName,
        resetUrl: resetUrl.toString(),
        logoUrl: new URL('/logo.png', appOrigin).toString(),
        supportEmail: this.configService.get<string>('SUPPORT_EMAIL') || 'support@laptopmitra.in',
        supportPhone: this.configService.get<string>('SUPPORT_PHONE') || '+91 7701993300',
      });

      const result = await this.mailService.sendMail({
        to: email,
        subject: content.subject,
        text: content.text,
        html: content.html,
        templateName: 'password-reset',
      });

      if (!result.success) {
        this.logger.error(
          `[PasswordReset] Reset email could not be sent to ${maskedEmail}: [${result.errorCode || 'UNKNOWN'}] ${result.error || 'Delivery failed'}`,
        );
      } else {
        this.logger.log(`[PasswordReset] Reset link dispatched to ${maskedEmail} via ${result.provider}.`);
      }

      return { success: true, message: GENERIC_RESET_MESSAGE };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `[PasswordReset] Failed processing reset for ${maskedEmail}: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
      // Return generic success to avoid leaking internal error states or user existence
      return { success: true, message: GENERIC_RESET_MESSAGE };
    }
  }

  async confirmReset(rawEmail: string): Promise<{ success: boolean; message: string }> {
    if (!rawEmail || typeof rawEmail !== 'string') {
      return { success: true, message: 'Password reset confirmed and active sessions revoked.' };
    }

    const email = rawEmail.trim().toLowerCase();
    const maskedEmail = this.maskEmail(email);

    try {
      const userRecord = await this.firebaseService.getUserByEmail(email);
      if (userRecord && userRecord.uid) {
        // Revoke all Firebase refresh tokens across devices
        await this.firebaseService.revokeRefreshTokens(userRecord.uid);
        this.logger.log(`[PasswordReset] Revoked refresh tokens for ${userRecord.uid} (${maskedEmail}).`);

        // Send security notification confirmation email
        const appOrigin = this.getAppOrigin();
        const content = buildPasswordResetConfirmationEmail({
          recipientName: userRecord.displayName?.trim() || email.split('@')[0],
          logoUrl: new URL('/logo.png', appOrigin).toString(),
          supportEmail: this.configService.get<string>('SUPPORT_EMAIL') || 'support@laptopmitra.in',
          supportPhone: this.configService.get<string>('SUPPORT_PHONE') || '+91 7701993300',
        });

        await this.mailService.sendMail({
          to: email,
          subject: content.subject,
          text: content.text,
          html: content.html,
          templateName: 'password-reset-confirmation',
        });
      }
    } catch (error) {
      this.logger.warn(
        `[PasswordReset] Confirmation post-hook notice: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }

    return { success: true, message: 'Password reset confirmed and active sessions revoked.' };
  }

  private enforceCooldown(email: string): void {
    const now = Date.now();
    for (const [key, expiresAt] of this.cooldowns) {
      if (expiresAt <= now) this.cooldowns.delete(key);
    }

    const expiresAt = this.cooldowns.get(email);
    if (expiresAt && expiresAt > now) {
      throw new HttpException(
        {
          message: 'Please wait before requesting another password reset link.',
          retryAfterSeconds: Math.ceil((expiresAt - now) / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    this.cooldowns.set(email, now + RESET_COOLDOWN_MS);
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

  private maskEmail(email: string): string {
    const parts = email.split('@');
    if (parts.length !== 2) return '***';
    const [local, domain] = parts;
    if (local.length <= 1) return `*@${domain}`;
    if (local.length === 2) return `${local[0]}*@${domain}`;
    return `${local[0]}***${local[local.length - 1]}@${domain}`;
  }
}

