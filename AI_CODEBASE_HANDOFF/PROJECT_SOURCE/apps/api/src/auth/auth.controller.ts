import { Controller, Post, Put, Delete, Body, Get, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { AllowUnlinkedFirebaseUser } from '../decorators/allow-firebase-sync.decorator';
import { Public } from '../decorators/public.decorator';
import { SyncUserDto } from './dto/sync-user.dto';
import { CheckFirebaseRevocation } from '../decorators/check-firebase-revocation.decorator';
import { EmailVerificationService } from './email-verification.service';
import { PasswordResetService } from './password-reset.service';
import { OtpService } from './otp.service';
import { RequiresSchema } from '../common/guards/schema-gate.guard';

@ApiTags('Authentication')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly passwordResetService: PasswordResetService,
    private readonly otpService: OtpService,
  ) { }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() body: { email: string; password?: string }) {
    return this.authService.login(body);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('register')
  @ApiOperation({ summary: 'User registration' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async register(
    @Body() body: { name?: string; email: string; password?: string; referralCode?: string; phone?: string },
  ) {
    return this.authService.register(body);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('guest')
  @ApiOperation({ summary: 'Start a guest session' })
  @ApiResponse({ status: 200, description: 'Guest session created' })
  async guest() {
    return this.authService.guestLogin();
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh auth token' })
  @ApiResponse({ status: 200, description: 'Token refreshed' })
  async refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refreshToken(body?.refreshToken);
  }

  @Public()
  @Post('logout')
  @ApiOperation({ summary: 'User logout' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout() {
    return { success: true };
  }

  @Post('sync')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @AllowUnlinkedFirebaseUser()
  @ApiOperation({ summary: 'Synchronize a verified Firebase user with the local profile' })
  @ApiResponse({ status: 200, description: 'Local user profile synchronized' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async sync(@Req() req: any, @Body() body: SyncUserDto) {
    const user = await this.authService.syncUser(req.firebaseIdentity, body);
    return { user };
  }

  @Post('email-verification')
  @Throttle({ default: { limit: 3, ttl: 300000 } })
  @ApiOperation({ summary: 'Send a verification email to the authenticated Firebase account' })
  @ApiResponse({ status: 200, description: 'Verification email sent or account already verified' })
  @ApiResponse({ status: 429, description: 'Verification email resend cooldown is active' })
  async sendEmailVerification(@Req() req: any) {
    return this.emailVerificationService.send(req.firebaseIdentity.uid);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request a password reset link (generic anti-enumeration response)' })
  @ApiResponse({ status: 200, description: 'Reset request received' })
  @ApiResponse({ status: 429, description: 'Cooldown active' })
  async forgotPassword(@Body() body: { email: string }) {
    return this.passwordResetService.sendResetLink(body?.email);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reset-password/confirm')
  @ApiOperation({ summary: 'Confirm password reset post-hook to revoke sessions and send security alert' })
  @ApiResponse({ status: 200, description: 'Sessions revoked and security alert dispatched' })
  async confirmPasswordReset(@Body() body: { email: string }) {
    return this.passwordResetService.confirmReset(body?.email);
  }

  // ---------------------------------------------------------------------------
  // OTP Verification & Password Reset Endpoints (Option A)
  // ---------------------------------------------------------------------------

  @Post('otp/send-verification')
  @RequiresSchema('otp')
  @Throttle({ default: { limit: 3, ttl: 300000 } })
  @ApiOperation({ summary: 'Request 6-digit email verification OTP code' })
  @ApiResponse({ status: 200, description: 'OTP code sent' })
  @ApiResponse({ status: 429, description: 'Cooldown active' })
  async requestEmailVerificationOtp(@Req() req: any) {
    return this.otpService.requestEmailVerificationOtp(req.user.id, req.firebaseIdentity.uid);
  }

  @Post('otp/verify-email')
  @RequiresSchema('otp')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Verify 6-digit email verification OTP code' })
  @ApiResponse({ status: 200, description: 'Email verified' })
  @ApiResponse({ status: 400, description: 'Invalid or expired code' })
  async verifyEmailOtp(@Req() req: any, @Body() body: { code: string }) {
    return this.otpService.verifyEmailOtp(req.user.id, req.firebaseIdentity.uid, body?.code);
  }

  @Public()
  @RequiresSchema('otp')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('otp/forgot-password')
  @ApiOperation({ summary: 'Request 6-digit password reset OTP (generic anti-enumeration response)' })
  @ApiResponse({ status: 200, description: 'Reset code requested' })
  @ApiResponse({ status: 429, description: 'Cooldown active' })
  async requestPasswordResetOtp(@Body() body: { email: string }) {
    return this.otpService.requestPasswordResetOtp(body?.email);
  }

  @Public()
  @RequiresSchema('otp')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('otp/verify-reset-code')
  @ApiOperation({ summary: 'Verify 6-digit password reset OTP and obtain short-lived single-use grant token' })
  @ApiResponse({ status: 200, description: 'Code valid; grant token issued' })
  @ApiResponse({ status: 400, description: 'Invalid or expired code' })
  async verifyPasswordResetOtp(@Body() body: { email: string; code: string }) {
    return this.otpService.verifyPasswordResetOtp(body?.email, body?.code);
  }

  @Public()
  @RequiresSchema('otp')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('otp/reset-password')
  @ApiOperation({ summary: 'Reset password using single-use grant token and revoke active sessions' })
  @ApiResponse({ status: 200, description: 'Password reset successful; sessions revoked' })
  @ApiResponse({ status: 400, description: 'Invalid or expired grant token' })
  async resetPasswordWithGrant(
    @Body() body: { email: string; grantToken: string; newPassword: string },
  ) {
    return this.otpService.resetPasswordWithGrant(body?.email, body?.grantToken, body?.newPassword);
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@Req() req: any) {
    return this.authService.getUserProfile(req.user.id);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateProfile(
    @Req() req: any,
    @Body() body: { name?: string; phone?: string; dob?: string },
  ) {
    return this.authService.updateUserProfile(req.user.id, body);
  }

  @Post('signout-everywhere')
  @CheckFirebaseRevocation()
  @ApiOperation({ summary: 'Revoke all sessions and sign out everywhere' })
  @ApiResponse({ status: 200, description: 'Signed out everywhere' })
  async signoutEverywhere(@Req() req: any) {
    return this.authService.signoutEverywhere(req.user.id, req.user.firebaseUid);
  }

  @Delete('account')
  @CheckFirebaseRevocation()
  @ApiOperation({ summary: 'Delete user account and anonymize PII' })
  @ApiResponse({ status: 200, description: 'Account deleted' })
  async deleteAccount(@Req() req: any) {
    return this.authService.deleteAccount(req.user.id, req.user.firebaseUid);
  }

  @Post('link-guest')
  @ApiOperation({ summary: 'Link anonymous guest account to an email and credentials' })
  @ApiResponse({ status: 200, description: 'Account linked successfully' })
  async linkGuest(
    @Req() req: any,
    @Body() body: { email: string; password?: string; name?: string },
  ) {
    return this.authService.linkGuestAccount(req.user.id, body);
  }
}
