import { Controller, Post, Put, Delete, Body, Get, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { AllowUnlinkedFirebaseUser } from '../decorators/allow-firebase-sync.decorator';
import { Public } from '../decorators/public.decorator';
import { SyncUserDto } from './dto/sync-user.dto';

@ApiTags('Authentication')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

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
    @Body() body: { name?: string; phone?: string },
  ) {
    return this.authService.updateUserProfile(req.user.id, body);
  }

  @Post('signout-everywhere')
  @ApiOperation({ summary: 'Revoke all sessions and sign out everywhere' })
  @ApiResponse({ status: 200, description: 'Signed out everywhere' })
  async signoutEverywhere(@Req() req: any) {
    return this.authService.signoutEverywhere(req.user.id, req.user.firebaseUid);
  }

  @Delete('account')
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

