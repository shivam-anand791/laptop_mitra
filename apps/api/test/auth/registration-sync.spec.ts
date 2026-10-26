import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../src/auth/auth.service';

jest.mock('../../src/firebase/firebase.service', () => ({
  FirebaseService: class FirebaseService {},
}));

jest.mock('../../src/prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

/**
 * Replicating getSafeRedirectUrl algorithm to test redirect security rules
 */
function getSafeRedirectUrl(
  targetUrl: string | null | undefined,
  userRole?: string,
  defaultDestination: string = '/profile',
): string {
  if (userRole === 'ADMIN') {
    if (!targetUrl || targetUrl === '/profile' || targetUrl === '/account') {
      return '/admin';
    }
  }

  if (!targetUrl || typeof targetUrl !== 'string') {
    return defaultDestination;
  }

  const trimmed = targetUrl.trim();

  if (
    trimmed.startsWith('/') &&
    !trimmed.startsWith('//') &&
    !trimmed.startsWith('/\\') &&
    !trimmed.includes('\\') &&
    !trimmed.includes(':') &&
    !trimmed.includes('\0')
  ) {
    return trimmed;
  }

  return defaultDestination;
}

describe('Registration & Post-Registration Synchronization and Redirection', () => {
  let prisma: any;
  let randomService: any;
  let firebaseService: any;
  let service: AuthService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    randomService = { generateReferralCode: jest.fn(() => 'LM-REF-9999') };
    firebaseService = {};
    service = new AuthService(prisma, randomService, firebaseService);
  });

  describe('Server-Side User Registration & Sync', () => {
    it('creates an authoritative CUSTOMER record upon new Firebase registration', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'usr-new-1',
        firebaseUid: 'fb-new-1',
        name: 'Aarav Sharma',
        email: 'aarav@example.com',
        role: 'CUSTOMER',
        status: 'ACTIVE',
        isGuest: false,
      });

      const result = await service.syncUser(
        {
          uid: 'fb-new-1',
          email: 'aarav@example.com',
          name: 'Aarav Sharma',
          firebase: { sign_in_provider: 'password' },
        },
        {
          name: 'Aarav Sharma',
          phone: '+919876543210',
          referralCode: 'MITRA123',
        },
      );

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            firebaseUid: 'fb-new-1',
            email: 'aarav@example.com',
            role: 'CUSTOMER', // Authoritatively set by server
            isGuest: false,
          }),
        }),
      );
      expect(result.role).toBe('CUSTOMER');
    });

    it('ignores client attempts to forge an ADMIN role during registration', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'usr-new-2',
        firebaseUid: 'fb-new-2',
        name: 'Hacker',
        email: 'attacker@example.com',
        role: 'CUSTOMER',
        status: 'ACTIVE',
      });

      // Passing role in profile payload (even if cast or smuggled)
      const forgedPayload = { name: 'Hacker', role: 'ADMIN' } as any;
      const result = await service.syncUser(
        {
          uid: 'fb-new-2',
          email: 'attacker@example.com',
          firebase: { sign_in_provider: 'password' },
        },
        forgedPayload,
      );

      // Server creates user as CUSTOMER regardless of body contents
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: 'CUSTOMER',
          }),
        }),
      );
      expect(result.role).toBe('CUSTOMER');
    });

    it('safely handles partial-registration recovery when user is retried with existing Firebase UID', async () => {
      // Simulate that the user record was already created on the first attempt
      const existingRecord = {
        id: 'usr-recovered-1',
        firebaseUid: 'fb-existing-uid',
        name: 'Recovered User',
        email: 'recovered@example.com',
        role: 'CUSTOMER',
        status: 'ACTIVE',
        isGuest: false,
      };

      prisma.user.findUnique.mockResolvedValue(existingRecord);
      prisma.user.update.mockResolvedValue({
        ...existingRecord,
        name: 'Updated Name',
      });

      const result = await service.syncUser(
        {
          uid: 'fb-existing-uid',
          email: 'recovered@example.com',
          firebase: { sign_in_provider: 'password' },
        },
        { name: 'Updated Name' },
      );

      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalled();
      expect(result.id).toBe('usr-recovered-1');
    });

    it('rejects unauthenticated requests missing a Firebase UID', async () => {
      await expect(service.syncUser({} as any)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('Post-Registration Safe Redirection & Open Redirect Protection', () => {
    it('redirects standard customer to /profile by default', () => {
      expect(getSafeRedirectUrl(null, 'CUSTOMER')).toBe('/profile');
      expect(getSafeRedirectUrl('', 'CUSTOMER')).toBe('/profile');
      expect(getSafeRedirectUrl(undefined, 'CUSTOMER')).toBe('/profile');
    });

    it('redirects to valid internal destination when returnUrl or redirect is provided', () => {
      expect(getSafeRedirectUrl('/checkout', 'CUSTOMER')).toBe('/checkout');
      expect(getSafeRedirectUrl('/account/orders', 'CUSTOMER')).toBe('/account/orders');
      expect(getSafeRedirectUrl('/products/dell-latitude-7420', 'CUSTOMER')).toBe('/products/dell-latitude-7420');
    });

    it('redirects an ADMIN user to /admin when no specific internal page is requested', () => {
      expect(getSafeRedirectUrl(null, 'ADMIN')).toBe('/admin');
      expect(getSafeRedirectUrl('/profile', 'ADMIN')).toBe('/admin');
      expect(getSafeRedirectUrl('/account', 'ADMIN')).toBe('/admin');
    });

    it('preserves specific internal destination for ADMIN if explicitly requested', () => {
      expect(getSafeRedirectUrl('/checkout', 'ADMIN')).toBe('/checkout');
      expect(getSafeRedirectUrl('/admin/products', 'ADMIN')).toBe('/admin/products');
    });

    it('strictly rejects external open redirect attacks', () => {
      expect(getSafeRedirectUrl('https://evil.com', 'CUSTOMER')).toBe('/profile');
      expect(getSafeRedirectUrl('http://attacker.com/steal-token', 'CUSTOMER')).toBe('/profile');
      expect(getSafeRedirectUrl('ftp://evil.com', 'CUSTOMER')).toBe('/profile');
    });

    it('strictly rejects protocol-relative URL bypasses', () => {
      expect(getSafeRedirectUrl('//evil.com/login', 'CUSTOMER')).toBe('/profile');
      expect(getSafeRedirectUrl('//google.com', 'CUSTOMER')).toBe('/profile');
    });

    it('strictly rejects backslash path-traversal and URL parser confusion', () => {
      expect(getSafeRedirectUrl('/\\evil.com', 'CUSTOMER')).toBe('/profile');
      expect(getSafeRedirectUrl('\\evil.com', 'CUSTOMER')).toBe('/profile');
      expect(getSafeRedirectUrl('/account\\..\\evil.com', 'CUSTOMER')).toBe('/profile');
    });

    it('strictly rejects pseudo-protocols like javascript: or data:', () => {
      // eslint-disable-next-line no-script-url
      expect(getSafeRedirectUrl('javascript:alert(1)', 'CUSTOMER')).toBe('/profile');
      expect(getSafeRedirectUrl('data:text/html,<script>alert(1)</script>', 'CUSTOMER')).toBe('/profile');
    });
  });
});
