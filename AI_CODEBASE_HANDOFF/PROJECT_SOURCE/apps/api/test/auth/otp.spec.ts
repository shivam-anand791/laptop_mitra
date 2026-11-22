import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { OtpService } from '../../src/auth/otp.service';

describe('OtpService (Option A)', () => {
  let service: OtpService;
  let mockPrisma: any;
  let mockFirebaseService: any;
  let mockMailService: any;
  let mockConfigService: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({ id: 'user_dev_1' }),
      },
      otpChallenge: {
        findFirst: jest.fn(),
        create: jest.fn().mockResolvedValue({ id: 'chal_1' }),
        update: jest.fn().mockResolvedValue({ id: 'chal_1' }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };

    mockFirebaseService = {
      updateUser: jest.fn().mockResolvedValue({ uid: 'fb_uid_1' }),
      revokeRefreshTokens: jest.fn().mockResolvedValue(undefined),
      getUserByEmail: jest.fn(),
    };

    mockMailService = {
      sendMail: jest.fn().mockResolvedValue({
        provider: 'resend',
        success: true,
        messageId: 're_test_otp_123',
      }),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'APP_PUBLIC_URL') return 'https://laptop-mitra.vercel.app';
        if (key === 'NODE_ENV') return 'production';
        if (key === 'OTP_PEPPER') return 'test-static-pepper';
        if (key === 'SUPPORT_EMAIL') return 'support@laptopmitra.in';
        if (key === 'SUPPORT_PHONE') return '+91 7701993300';
        return undefined;
      }),
    };

    service = new OtpService(
      mockPrisma,
      mockFirebaseService,
      mockMailService,
      mockConfigService,
    );
  });

  describe('requestEmailVerificationOtp', () => {
    it('creates hashed challenge and dispatches branded email with 60s cooldown', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_1',
        email: 'customer@laptopmitra.in',
        name: 'Rahul',
        emailVerified: null,
      });
      mockPrisma.otpChallenge.findFirst.mockResolvedValue(null); // No recent challenge

      const res = await service.requestEmailVerificationOtp('user_1', 'fb_uid_1');

      expect(res.success).toBe(true);
      expect(res.cooldownSeconds).toBe(60);
      expect(mockPrisma.otpChallenge.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user_1',
            email: 'customer@laptopmitra.in',
            purpose: 'EMAIL_VERIFICATION',
            maxAttempts: 5,
          }),
        }),
      );
      expect(mockMailService.sendMail).toHaveBeenCalledTimes(1);
      const call = mockMailService.sendMail.mock.calls[0][0];
      expect(call.to).toBe('customer@laptopmitra.in');
      expect(call.templateName).toBe('otp-verification');
    });

    it('rejects with 429 when requesting within the 60-second cooldown window', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_1',
        email: 'customer@laptopmitra.in',
        emailVerified: null,
      });
      mockPrisma.otpChallenge.findFirst.mockResolvedValue({
        id: 'chal_recent',
        createdAt: new Date(Date.now() - 30 * 1000), // 30s ago
      });

      await expect(service.requestEmailVerificationOtp('user_1', 'fb_uid_1')).rejects.toThrow(HttpException);
    });
  });

  describe('verifyEmailOtp', () => {
    it('verifies valid code, updates Firebase emailVerified, and marks user in DB', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_1',
        email: 'customer@laptopmitra.in',
        firebaseUid: 'fb_uid_1',
      });

      // Calculate matching hash using the same pepper
      const code = '654321';
      const codeHash = (service as any).hashCode(code);

      mockPrisma.otpChallenge.findFirst.mockResolvedValue({
        id: 'chal_active',
        userId: 'user_1',
        email: 'customer@laptopmitra.in',
        codeHash,
        attempts: 0,
        maxAttempts: 5,
        isConsumed: false,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      const res = await service.verifyEmailOtp('user_1', 'fb_uid_1', code);

      expect(res.success).toBe(true);
      expect(mockPrisma.otpChallenge.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'chal_active' },
          data: expect.objectContaining({ isConsumed: true }),
        }),
      );
      expect(mockFirebaseService.updateUser).toHaveBeenCalledWith('fb_uid_1', { emailVerified: true });
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user_1' },
          data: expect.objectContaining({ emailVerified: expect.any(Date) }),
        }),
      );
    });

    it('increments attempts on incorrect code and rejects', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_1',
        email: 'customer@laptopmitra.in',
        firebaseUid: 'fb_uid_1',
      });

      const correctCodeHash = (service as any).hashCode('111111');

      mockPrisma.otpChallenge.findFirst.mockResolvedValue({
        id: 'chal_active',
        userId: 'user_1',
        codeHash: correctCodeHash,
        attempts: 2,
        maxAttempts: 5,
        isConsumed: false,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      await expect(service.verifyEmailOtp('user_1', 'fb_uid_1', '999999')).rejects.toThrow(
        BadRequestException,
      );

      expect(mockPrisma.otpChallenge.update).toHaveBeenCalledWith({
        where: { id: 'chal_active' },
        data: { attempts: 3, isConsumed: false },
      });
    });

    it('burns challenge permanently when attempts reaches max limit (5)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user_1',
        email: 'customer@laptopmitra.in',
        firebaseUid: 'fb_uid_1',
      });

      const correctCodeHash = (service as any).hashCode('111111');

      mockPrisma.otpChallenge.findFirst.mockResolvedValue({
        id: 'chal_active',
        userId: 'user_1',
        codeHash: correctCodeHash,
        attempts: 4, // 5th attempt will burn it
        maxAttempts: 5,
        isConsumed: false,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      await expect(service.verifyEmailOtp('user_1', 'fb_uid_1', '000000')).rejects.toThrow(
        /Maximum attempts reached/,
      );

      expect(mockPrisma.otpChallenge.update).toHaveBeenCalledWith({
        where: { id: 'chal_active' },
        data: { attempts: 5, isConsumed: true },
      });
    });
  });

  describe('requestPasswordResetOtp (Anti-Enumeration)', () => {
    it('returns identical generic success message and dispatches no email for non-existent account', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockFirebaseService.getUserByEmail.mockRejectedValue(new Error('User not found'));
      mockPrisma.otpChallenge.findFirst.mockResolvedValue(null);

      const res = await service.requestPasswordResetOtp('ghost@laptopmitra.in');

      expect(res.success).toBe(true);
      expect(res.message).toBe('If an account exists with that email, a verification code has been dispatched.');
      expect(mockMailService.sendMail).not.toHaveBeenCalled();
      expect(mockPrisma.otpChallenge.create).not.toHaveBeenCalled();
    });
  });

  describe('verifyPasswordResetOtp & resetPasswordWithGrant', () => {
    it('issues single-use grant token upon valid OTP, then applies reset and revokes sessions', async () => {
      const email = 'customer@laptopmitra.in';
      const code = '777888';
      const codeHash = (service as any).hashCode(code);

      mockPrisma.otpChallenge.findFirst.mockResolvedValueOnce({
        id: 'chal_reset_1',
        email,
        purpose: 'PASSWORD_RESET',
        codeHash,
        attempts: 0,
        maxAttempts: 5,
        isConsumed: false,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });

      // Step 1: Verify OTP code
      const verifyRes = await service.verifyPasswordResetOtp(email, code);
      expect(verifyRes.success).toBe(true);
      expect(verifyRes.grantToken).toBeDefined();
      expect(typeof verifyRes.grantToken).toBe('string');

      // Step 2: Reset password with issued grant token
      const grantToken = verifyRes.grantToken;
      const grantTokenHash = (service as any).hashCode(grantToken);

      mockPrisma.otpChallenge.findFirst.mockResolvedValueOnce({
        id: 'chal_reset_1',
        email,
        purpose: 'PASSWORD_RESET',
        grantTokenHash,
        grantExpiresAt: new Date(Date.now() + 4 * 60 * 1000),
      });

      mockFirebaseService.getUserByEmail.mockResolvedValue({
        uid: 'user_dev_888',
        email,
        displayName: 'Amit Patel',
      });

      const resetRes = await service.resetPasswordWithGrant(email, grantToken, 'NewSecure#Pass2026!');

      expect(resetRes.success).toBe(true);
      // Burn grant
      expect(mockPrisma.otpChallenge.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'chal_reset_1' },
          data: expect.objectContaining({ grantTokenHash: null }),
        }),
      );
      // Update Firebase user password
      expect(mockFirebaseService.updateUser).toHaveBeenCalledWith('user_dev_888', {
        password: 'NewSecure#Pass2026!',
      });
      // Revoke all existing sessions
      expect(mockFirebaseService.revokeRefreshTokens).toHaveBeenCalledWith('user_dev_888');
      // Dispatch confirmation email
      expect(mockMailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: email,
          templateName: 'password-reset-confirmation',
        }),
      );
    });

    it('rejects weak passwords according to security requirements', async () => {
      await expect(
        service.resetPasswordWithGrant('customer@laptopmitra.in', 'fake-grant', 'weak'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});

