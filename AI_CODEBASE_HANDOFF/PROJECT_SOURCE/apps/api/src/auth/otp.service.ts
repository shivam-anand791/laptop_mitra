import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { FirebaseService } from '../firebase/firebase.service';
import { MailService } from '../modules/mail/mail.service';
import {
  buildOtpVerificationEmail,
  buildOtpPasswordResetEmail,
} from './otp.template';
import { buildPasswordResetConfirmationEmail } from './password-reset.template';

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const OTP_COOLDOWN_MS = 60 * 1000; // 60 seconds
const GRANT_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;

const GENERIC_OTP_RESET_MSG =
  'If an account exists with that email, a verification code has been dispatched.';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);
  private readonly pepper: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly firebaseService: FirebaseService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {
    this.pepper =
      this.configService.get<string>('OTP_PEPPER') ||
      'laptopmitra-security-pepper-v1-static-salt';
  }

  /**
   * Request 6-digit email verification OTP for an authenticated account
   */
  async requestEmailVerificationOtp(
    userId: string,
    firebaseUid: string,
  ): Promise<{ success: boolean; message: string; cooldownSeconds: number }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, emailVerified: true },
    });

    if (!user || !user.email) {
      throw new BadRequestException('User account or email address not found.');
    }

    if (user.emailVerified) {
      return {
        success: true,
        message: 'This account email is already verified.',
        cooldownSeconds: 0,
      };
    }

    const email = user.email.trim().toLowerCase();
    const maskedEmail = this.maskEmail(email);

    // 1. Enforce cooldown on recent active challenge
    await this.enforceCooldown(email, 'EMAIL_VERIFICATION');

    // 2. Invalidate any existing active challenges for this user and purpose
    await this.prisma.otpChallenge.updateMany({
      where: {
        email,
        purpose: 'EMAIL_VERIFICATION',
        isConsumed: false,
      },
      data: { isConsumed: true },
    });

    // 3. Generate 6-digit cryptographically secure numeric code
    const rawOtp = crypto.randomInt(100000, 999999).toString();
    const codeHash = this.hashCode(rawOtp);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    await this.prisma.otpChallenge.create({
      data: {
        userId: user.id,
        email,
        codeHash,
        purpose: 'EMAIL_VERIFICATION',
        maxAttempts: MAX_ATTEMPTS,
        expiresAt,
      },
    });

    // 4. Dispatch branded email without logging the raw OTP code
    const appOrigin = this.getAppOrigin();
    const content = buildOtpVerificationEmail({
      recipientName: user.name?.trim() || email.split('@')[0],
      otpCode: rawOtp,
      logoUrl: new URL('/logo.png', appOrigin).toString(),
      supportEmail: this.configService.get<string>('SUPPORT_EMAIL') || 'support@laptopmitra.in',
      supportPhone: this.configService.get<string>('SUPPORT_PHONE') || '+91 7701993300',
    });

    const result = await this.mailService.sendMail({
      to: email,
      subject: content.subject,
      text: content.text,
      html: content.html,
      templateName: 'otp-verification',
    });

    if (!result.success) {
      this.logger.error(
        `[OtpService] Verification email failed for ${maskedEmail}: ${result.error || 'delivery error'}`,
      );
      throw new HttpException(
        {
          statusCode:
            result.errorCode === 'MAIL_RATE_LIMITED'
              ? HttpStatus.TOO_MANY_REQUESTS
              : HttpStatus.SERVICE_UNAVAILABLE,
          message: 'Unable to dispatch verification code right now. Please try again shortly.',
          code: result.errorCode || 'MAIL_PROVIDER_UNAVAILABLE',
        },
        result.errorCode === 'MAIL_RATE_LIMITED'
          ? HttpStatus.TOO_MANY_REQUESTS
          : HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    this.logger.log(`[OtpService] Verification code dispatched to ${maskedEmail} via ${result.provider}.`);

    return {
      success: true,
      message: 'A 6-digit verification code has been sent to your email.',
      cooldownSeconds: 60,
    };
  }

  /**
   * Verify 6-digit email verification OTP
   */
  async verifyEmailOtp(
    userId: string,
    firebaseUid: string,
    submittedCode: string,
  ): Promise<{ success: boolean; message: string }> {
    if (!submittedCode || typeof submittedCode !== 'string' || !/^\d{6}$/.test(submittedCode.trim())) {
      throw new BadRequestException('Please provide a valid 6-digit numeric verification code.');
    }

    const code = submittedCode.trim();

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firebaseUid: true },
    });

    if (!user || !user.email) {
      throw new BadRequestException('User profile not found.');
    }

    const email = user.email.trim().toLowerCase();
    const maskedEmail = this.maskEmail(email);

    // Look for active challenge
    const challenge = await this.prisma.otpChallenge.findFirst({
      where: {
        userId,
        purpose: 'EMAIL_VERIFICATION',
        isConsumed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!challenge) {
      throw new BadRequestException('No active verification code found or the code has expired. Please request a new code.');
    }

    if (challenge.attempts >= challenge.maxAttempts) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { isConsumed: true },
      });
      throw new BadRequestException('Too many incorrect attempts. This code has been invalidated. Please request a new one.');
    }

    // Constant-time hash comparison
    const candidateHash = this.hashCode(code);
    const isMatch = this.timingSafeHashMatch(candidateHash, challenge.codeHash);

    if (!isMatch) {
      const nextAttempts = challenge.attempts + 1;
      const willBurn = nextAttempts >= challenge.maxAttempts;

      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: {
          attempts: nextAttempts,
          isConsumed: willBurn,
        },
      });

      if (willBurn) {
        throw new BadRequestException('Incorrect verification code. Maximum attempts reached. Please request a new code.');
      }

      const remaining = challenge.maxAttempts - nextAttempts;
      throw new BadRequestException(`Incorrect verification code. ${remaining} attempt(s) remaining.`);
    }

    // Mark challenge as consumed
    await this.prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: {
        isConsumed: true,
        consumedAt: new Date(),
      },
    });

    // Mark email verified in Firebase Auth
    try {
      await this.firebaseService.updateUser(user.firebaseUid, { emailVerified: true });
    } catch (fbErr: any) {
      this.logger.warn(`[OtpService] Firebase emailVerified update notice: ${fbErr?.message || fbErr}`);
    }

    // Mark email verified in local database
    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: new Date() },
    });

    this.logger.log(`[OtpService] Email verified successfully for user ${user.id} (${maskedEmail}).`);

    return {
      success: true,
      message: 'Your email address has been verified successfully.',
    };
  }

  /**
   * Request 6-digit password reset OTP (generic anti-enumeration response)
   */
  async requestPasswordResetOtp(
    rawEmail: string,
  ): Promise<{ success: boolean; message: string; cooldownSeconds: number }> {
    if (!rawEmail || typeof rawEmail !== 'string') {
      throw new BadRequestException('Please provide a valid email address.');
    }

    const email = rawEmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('Please provide a valid email address.');
    }

    const maskedEmail = this.maskEmail(email);

    // Enforce cooldown
    await this.enforceCooldown(email, 'PASSWORD_RESET');

    // Check account existence without leaking
    let userExists = false;
    let recipientName = email.split('@')[0];
    let userId: string | undefined;

    try {
      const localUser = await this.prisma.user.findFirst({
        where: { email },
        select: { id: true, name: true },
      });
      if (localUser) {
        userExists = true;
        userId = localUser.id;
        if (localUser.name?.trim()) recipientName = localUser.name.trim();
      } else {
        const fbUser = await this.firebaseService.getUserByEmail(email);
        if (fbUser) {
          userExists = true;
          if (fbUser.displayName?.trim()) recipientName = fbUser.displayName.trim();
        }
      }
    } catch {
      userExists = false;
    }

    // Anti-enumeration: if no account exists, return generic response without sending email
    if (!userExists) {
      this.logger.debug(`[OtpService] Reset OTP requested for non-existent account (${maskedEmail}).`);
      return {
        success: true,
        message: GENERIC_OTP_RESET_MSG,
        cooldownSeconds: 60,
      };
    }

    // Invalidate previous reset challenges for this email
    await this.prisma.otpChallenge.updateMany({
      where: {
        email,
        purpose: 'PASSWORD_RESET',
        isConsumed: false,
      },
      data: { isConsumed: true },
    });

    // Generate 6-digit numeric OTP
    const rawOtp = crypto.randomInt(100000, 999999).toString();
    const codeHash = this.hashCode(rawOtp);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    await this.prisma.otpChallenge.create({
      data: {
        userId,
        email,
        codeHash,
        purpose: 'PASSWORD_RESET',
        maxAttempts: MAX_ATTEMPTS,
        expiresAt,
      },
    });

    // Dispatch branded email without logging raw OTP
    const appOrigin = this.getAppOrigin();
    const content = buildOtpPasswordResetEmail({
      recipientName,
      otpCode: rawOtp,
      logoUrl: new URL('/logo.png', appOrigin).toString(),
      supportEmail: this.configService.get<string>('SUPPORT_EMAIL') || 'support@laptopmitra.in',
      supportPhone: this.configService.get<string>('SUPPORT_PHONE') || '+91 7701993300',
    });

    const result = await this.mailService.sendMail({
      to: email,
      subject: content.subject,
      text: content.text,
      html: content.html,
      templateName: 'otp-password-reset',
    });

    if (result.success) {
      this.logger.log(`[OtpService] Password reset code dispatched to ${maskedEmail} via ${result.provider}.`);
    } else {
      this.logger.error(`[OtpService] Delivery failed for ${maskedEmail}: ${result.error || 'send error'}`);
    }

    return {
      success: true,
      message: GENERIC_OTP_RESET_MSG,
      cooldownSeconds: 60,
    };
  }

  /**
   * Verify password reset OTP code; upon match, burns code and issues short-lived single-use grant token
   */
  async verifyPasswordResetOtp(
    rawEmail: string,
    submittedCode: string,
  ): Promise<{ success: boolean; grantToken: string }> {
    if (!rawEmail || typeof rawEmail !== 'string') {
      throw new BadRequestException('Please provide a valid email address.');
    }
    if (!submittedCode || typeof submittedCode !== 'string' || !/^\d{6}$/.test(submittedCode.trim())) {
      throw new BadRequestException('Please provide a valid 6-digit numeric code.');
    }

    const email = rawEmail.trim().toLowerCase();
    const code = submittedCode.trim();

    const challenge = await this.prisma.otpChallenge.findFirst({
      where: {
        email,
        purpose: 'PASSWORD_RESET',
        isConsumed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!challenge) {
      throw new BadRequestException('No active password reset code found or the code has expired. Please request a new code.');
    }

    if (challenge.attempts >= challenge.maxAttempts) {
      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: { isConsumed: true },
      });
      throw new BadRequestException('Too many incorrect attempts. This code has expired. Please request a new one.');
    }

    const candidateHash = this.hashCode(code);
    const isMatch = this.timingSafeHashMatch(candidateHash, challenge.codeHash);

    if (!isMatch) {
      const nextAttempts = challenge.attempts + 1;
      const willBurn = nextAttempts >= challenge.maxAttempts;

      await this.prisma.otpChallenge.update({
        where: { id: challenge.id },
        data: {
          attempts: nextAttempts,
          isConsumed: willBurn,
        },
      });

      if (willBurn) {
        throw new BadRequestException('Incorrect verification code. Maximum attempts reached. Please request a new code.');
      }

      const remaining = challenge.maxAttempts - nextAttempts;
      throw new BadRequestException(`Incorrect code. ${remaining} attempt(s) remaining.`);
    }

    // Burn the OTP code immediately and generate single-use 5-minute grant token
    const rawGrantToken = crypto.randomBytes(32).toString('hex');
    const grantTokenHash = this.hashCode(rawGrantToken);
    const grantExpiresAt = new Date(Date.now() + GRANT_TTL_MS);

    await this.prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: {
        isConsumed: true,
        consumedAt: new Date(),
        grantTokenHash,
        grantExpiresAt,
      },
    });

    return {
      success: true,
      grantToken: rawGrantToken,
    };
  }

  /**
   * Reset password using single-use grant token, updating Firebase Admin and revoking refresh tokens
   */
  async resetPasswordWithGrant(
    rawEmail: string,
    grantToken: string,
    newPassword: string,
  ): Promise<{ success: boolean; message: string }> {
    if (!rawEmail || typeof rawEmail !== 'string') {
      throw new BadRequestException('Please provide a valid email address.');
    }
    if (!grantToken || typeof grantToken !== 'string') {
      throw new BadRequestException('Invalid or expired reset grant token. Please request a new code.');
    }

    this.validatePasswordRules(newPassword);

    const email = rawEmail.trim().toLowerCase();
    const maskedEmail = this.maskEmail(email);
    const grantTokenHash = this.hashCode(grantToken);

    // Find active grant
    const challenge = await this.prisma.otpChallenge.findFirst({
      where: {
        email,
        purpose: 'PASSWORD_RESET',
        grantTokenHash,
        grantExpiresAt: { gt: new Date() },
      },
    });

    if (!challenge) {
      throw new BadRequestException('The reset session has expired or was already used. Please request a new code.');
    }

    // Burn grant immediately to prevent replay
    await this.prisma.otpChallenge.update({
      where: { id: challenge.id },
      data: {
        grantTokenHash: null,
        grantExpiresAt: new Date(),
      },
    });

    // Lookup user in Firebase
    let userRecord;
    try {
      userRecord = await this.firebaseService.getUserByEmail(email);
    } catch {
      throw new BadRequestException('User account could not be found.');
    }

    // 1. Update password in Firebase Admin
    await this.firebaseService.updateUser(userRecord.uid, { password: newPassword });

    // 2. Revoke refresh tokens across all sessions/devices
    await this.firebaseService.revokeRefreshTokens(userRecord.uid);
    this.logger.log(`[OtpService] Password reset via OTP grant for ${userRecord.uid} (${maskedEmail}). Sessions revoked.`);

    // 3. Dispatch security notification email
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

    return {
      success: true,
      message: 'Your password has been reset successfully. All active sessions have been signed out.',
    };
  }

  private async enforceCooldown(email: string, purpose: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET'): Promise<void> {
    const recentChallenge = await this.prisma.otpChallenge.findFirst({
      where: {
        email,
        purpose,
        createdAt: { gt: new Date(Date.now() - OTP_COOLDOWN_MS) },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentChallenge) {
      const elapsedMs = Date.now() - recentChallenge.createdAt.getTime();
      const remainingSec = Math.ceil((OTP_COOLDOWN_MS - elapsedMs) / 1000);
      throw new HttpException(
        {
          message: `Please wait ${remainingSec} second(s) before requesting another code.`,
          retryAfterSeconds: remainingSec,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private hashCode(value: string): string {
    return crypto.createHmac('sha256', this.pepper).update(value).digest('hex');
  }

  private timingSafeHashMatch(a: string, b: string): boolean {
    if (!a || !b || a.length !== b.length) return false;
    try {
      return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
    } catch {
      return false;
    }
  }

  private validatePasswordRules(password: string): void {
    if (!password || password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long.');
    }
    if (!/[a-z]/.test(password)) {
      throw new BadRequestException('Password must contain at least one lowercase letter.');
    }
    if (!/[A-Z]/.test(password)) {
      throw new BadRequestException('Password must contain at least one uppercase letter.');
    }
    if (!/[0-9]/.test(password)) {
      throw new BadRequestException('Password must contain at least one number.');
    }
    if (!/[@$!%*?&]/.test(password)) {
      throw new BadRequestException('Password must contain at least one special character (@$!%*?&).');
    }
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

