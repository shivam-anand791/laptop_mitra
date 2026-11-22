import { BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { PasswordResetService } from '../../src/auth/password-reset.service';

describe('PasswordResetService (Phase 3)', () => {
  let service: PasswordResetService;
  let mockFirebaseService: any;
  let mockMailService: any;
  let mockConfigService: any;

  beforeEach(() => {
    mockFirebaseService = {
      generatePasswordResetLink: jest.fn(),
      getUserByEmail: jest.fn(),
      revokeRefreshTokens: jest.fn().mockResolvedValue(undefined),
    };

    mockMailService = {
      sendMail: jest.fn().mockResolvedValue({
        provider: 'resend',
        success: true,
        messageId: 're_test_reset_123',
      }),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'APP_PUBLIC_URL') return 'https://laptop-mitra.vercel.app';
        if (key === 'NODE_ENV') return 'production';
        if (key === 'SUPPORT_EMAIL') return 'support@laptopmitra.in';
        if (key === 'SUPPORT_PHONE') return '+91 7701993300';
        return undefined;
      }),
    };

    service = new PasswordResetService(
      mockFirebaseService,
      mockMailService,
      mockConfigService,
    );
  });

  describe('sendResetLink (Anti-Enumeration & Link Generation)', () => {
    it('dispatches branded password reset email and returns generic message for registered user', async () => {
      mockFirebaseService.generatePasswordResetLink.mockResolvedValue(
        'https://laptopmitra.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=oob_valid_reset_code&apiKey=AIzaSy_fake',
      );
      mockFirebaseService.getUserByEmail.mockResolvedValue({
        uid: 'user_dev_001',
        email: 'customer@laptopmitra.in',
        displayName: 'Rahul Sharma',
      });

      const response = await service.sendResetLink('customer@laptopmitra.in');

      expect(response.success).toBe(true);
      expect(response.message).toBe(
        'If an account exists with that email, a password reset link has been dispatched.',
      );

      // Verify continue URL passed to Firebase Admin
      expect(mockFirebaseService.generatePasswordResetLink).toHaveBeenCalledWith(
        'customer@laptopmitra.in',
        { url: 'https://laptop-mitra.vercel.app/reset-password' },
      );

      // Verify MailService called with branded reset URL containing oobCode
      expect(mockMailService.sendMail).toHaveBeenCalledTimes(1);
      const mailCall = mockMailService.sendMail.mock.calls[0][0];
      expect(mailCall.to).toBe('customer@laptopmitra.in');
      expect(mailCall.templateName).toBe('password-reset');
      expect(mailCall.html).toContain('oobCode=oob_valid_reset_code');
      expect(mailCall.html).toContain('https://laptop-mitra.vercel.app/reset-password');
      expect(mailCall.html).toContain('Rahul Sharma');
    });

    it('returns the IDENTICAL generic message without sending email when account does not exist (Anti-Enumeration)', async () => {
      const notFoundErr: any = new Error('There is no user record corresponding to the provided identifier.');
      notFoundErr.code = 'auth/user-not-found';
      mockFirebaseService.generatePasswordResetLink.mockRejectedValue(notFoundErr);

      const response = await service.sendResetLink('nonexistent@laptopmitra.in');

      expect(response.success).toBe(true);
      expect(response.message).toBe(
        'If an account exists with that email, a password reset link has been dispatched.',
      );
      // No email should be dispatched
      expect(mockMailService.sendMail).not.toHaveBeenCalled();
    });

    it('enforces a 60-second cooldown per email to prevent spamming', async () => {
      mockFirebaseService.generatePasswordResetLink.mockResolvedValue(
        'https://laptopmitra.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=oob_code_1',
      );

      await service.sendResetLink('cooldown@laptopmitra.in');

      await expect(service.sendResetLink('cooldown@laptopmitra.in')).rejects.toThrow(
        HttpException,
      );

      try {
        await service.sendResetLink('cooldown@laptopmitra.in');
      } catch (err: any) {
        expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
        expect(err.getResponse().message).toContain('Please wait before requesting another password reset link.');
      }
    });

    it('rejects invalid email formats with 400 Bad Request', async () => {
      await expect(service.sendResetLink('not-an-email')).rejects.toThrow(BadRequestException);
      await expect(service.sendResetLink('')).rejects.toThrow(BadRequestException);
    });

    it('refuses non-HTTPS origins in production configuration', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'APP_PUBLIC_URL') return 'http://insecure-domain.com';
        if (key === 'NODE_ENV') return 'production';
        return undefined;
      });

      const insecureService = new PasswordResetService(
        mockFirebaseService,
        mockMailService,
        mockConfigService,
      );

      mockFirebaseService.generatePasswordResetLink.mockResolvedValue(
        'https://laptopmitra.firebaseapp.com/__/auth/action?mode=resetPassword&oobCode=oob_code_1',
      );

      // Should safely return generic message and not crash
      const res = await insecureService.sendResetLink('user@laptopmitra.in');
      expect(res.success).toBe(true);
      // Mail should not be dispatched over insecure origin
      expect(mockMailService.sendMail).not.toHaveBeenCalled();
    });
  });

  describe('confirmReset (Session Revocation & Confirmation Email)', () => {
    it('revokes refresh tokens and sends confirmation alert for verified account', async () => {
      mockFirebaseService.getUserByEmail.mockResolvedValue({
        uid: 'user_dev_999',
        email: 'customer@laptopmitra.in',
        displayName: 'Rahul Sharma',
      });

      const response = await service.confirmReset('customer@laptopmitra.in');

      expect(response.success).toBe(true);
      expect(mockFirebaseService.revokeRefreshTokens).toHaveBeenCalledWith('user_dev_999');
      expect(mockMailService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'customer@laptopmitra.in',
          templateName: 'password-reset-confirmation',
          subject: expect.stringContaining('Security Alert'),
        }),
      );
    });

    it('handles non-existent or unrecognized email gracefully without throwing', async () => {
      mockFirebaseService.getUserByEmail.mockRejectedValue(new Error('User not found'));

      const response = await service.confirmReset('ghost@laptopmitra.in');

      expect(response.success).toBe(true);
      expect(mockFirebaseService.revokeRefreshTokens).not.toHaveBeenCalled();
    });
  });
});

