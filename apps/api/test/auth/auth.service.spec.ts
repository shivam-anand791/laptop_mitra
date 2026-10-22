import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../../src/auth/auth.service';

jest.mock('../../src/firebase/firebase.service', () => ({
  FirebaseService: class FirebaseService {},
}));

jest.mock('../../src/prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('AuthService Firebase user mapping', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
  const randomService = { generateReferralCode: jest.fn(() => 'REF-CODE') };
  const firebaseService = {};
  const service = new AuthService(prisma as any, randomService as any, firebaseService as any);

  const existingUser = {
    id: 'local-1',
    firebaseUid: 'firebase-1',
    name: 'Existing profile',
    email: 'existing@example.com',
    emailVerified: new Date('2025-01-01T00:00:00Z'),
    authProvider: 'password',
    isGuest: false,
    role: 'CUSTOMER',
    status: 'ACTIVE',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates a verified Firebase identity without replacing absent profile values', async () => {
    prisma.user.findUnique.mockResolvedValue(existingUser);
    prisma.user.update.mockResolvedValue(existingUser);

    await service.syncUser({ uid: 'firebase-1', email_verified: false });

    expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'local-1' },
      data: expect.not.objectContaining({ email: null, emailVerified: null, name: null, phone: null }),
    }));
    const updateData = prisma.user.update.mock.calls[0][0].data;
    expect(updateData).not.toHaveProperty('email');
    expect(updateData).not.toHaveProperty('emailVerified');
    expect(updateData).not.toHaveProperty('name');
    expect(updateData).not.toHaveProperty('phone');
  });

  it('does not replace a stored email with an unverified Firebase email', async () => {
    prisma.user.findUnique.mockResolvedValue(existingUser);
    prisma.user.update.mockResolvedValue(existingUser);

    await service.syncUser({
      uid: 'firebase-1',
      email: 'unverified@example.com',
      email_verified: false,
    });

    expect(prisma.user.update.mock.calls[0][0].data).not.toHaveProperty('email');
  });

  it('rejects an explicitly blank name instead of erasing the profile', async () => {
    prisma.user.findUnique.mockResolvedValue(existingUser);

    await expect(service.syncUser({ uid: 'firebase-1' }, { name: '   ' })).rejects.toThrow(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('blocks inactive local accounts even when Firebase token is valid', async () => {
    prisma.user.findUnique.mockResolvedValue({ ...existingUser, status: 'SUSPENDED' });

    await expect(service.syncUser({ uid: 'firebase-1' })).rejects.toThrow(UnauthorizedException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('creates a database profile for a first Firebase sign-in', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'local-new', firebaseUid: 'firebase-new', role: 'CUSTOMER' });

    const result = await service.syncUser({
      uid: 'firebase-new',
      email: 'new@example.com',
      email_verified: true,
      name: 'New customer',
      firebase: { sign_in_provider: 'password' },
    }, { phone: '+911234567890' });

    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        firebaseUid: 'firebase-new',
        email: 'new@example.com',
        emailVerified: expect.any(Date),
        name: 'New customer',
        phone: '+911234567890',
        role: 'CUSTOMER',
        status: 'ACTIVE',
      }),
    }));
    expect(result.id).toBe('local-new');
  });

  it('returns the winner of a concurrent first-login create race', async () => {
    const createdByOtherRequest = { id: 'local-winner', firebaseUid: 'firebase-race', role: 'CUSTOMER' };
    prisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(createdByOtherRequest);
    prisma.user.create.mockRejectedValue({ code: 'P2002' });

    await expect(service.syncUser({ uid: 'firebase-race', email: 'race@example.com' }))
      .resolves.toEqual(createdByOtherRequest);
    expect(prisma.user.create).toHaveBeenCalledTimes(1);
  });
});
