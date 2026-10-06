jest.mock('@nestjs/config', () => ({
  ConfigService: class ConfigService {},
}));

jest.mock('firebase-admin/app', () => ({
  cert: jest.fn(),
  getApps: jest.fn(() => []),
  initializeApp: jest.fn(),
}));

jest.mock('firebase-admin/auth', () => ({
  getAuth: jest.fn(() => ({
    verifyIdToken: jest.fn(),
    createCustomToken: jest.fn(),
  })),
}));

import { AuthService } from '../../src/auth/auth.service';
import { RandomService } from '../../src/shared/random.service';
import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';

describe('AuthService', () => {
  const userFindUnique = jest.fn();
  const userFindFirst = jest.fn();
  const userCreate = jest.fn();
  const userUpdate = jest.fn();
  const prisma = {
    user: {
      findUnique: userFindUnique,
      findFirst: userFindFirst,
      create: userCreate,
      update: userUpdate,
    },
  };
  const randomService = {
    generateReferralCode: jest.fn().mockReturnValue('REF12345'),
  };
  const firebaseService = {
    createCustomToken: jest.fn().mockResolvedValue('mock-token-123'),
  };
  const authService = new AuthService(
    prisma as any,
    randomService as unknown as RandomService,
    firebaseService as any,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    randomService.generateReferralCode.mockReturnValue('REF12345');
    firebaseService.createCustomToken.mockResolvedValue('mock-token-123');
    userFindUnique.mockResolvedValue(null);
    userFindFirst.mockResolvedValue(null);
    userCreate.mockImplementation(async ({ data, select }) => ({
      id: 'local-user-1',
      status: 'ACTIVE',
      ...data,
    }));
    userUpdate.mockImplementation(async ({ where, data, select }) => ({
      id: where.id || 'local-user-1',
      status: 'ACTIVE',
      ...data,
    }));
  });

  it('maps a verified Firebase token to an existing local user', async () => {
    const verifiedAt = new Date('2026-01-01T00:00:00.000Z');
    const existingUser = {
      id: 'local-user-1',
      firebaseUid: 'firebase-123',
      role: 'ADMIN',
      isGuest: false,
      status: 'ACTIVE',
      emailVerified: verifiedAt,
    };
    userFindUnique.mockResolvedValue(existingUser);

    const user = await authService.syncUser(
      {
        uid: 'firebase-123',
        email: 'Admin@Example.com',
        email_verified: true,
        firebase: { sign_in_provider: 'google.com' },
      },
      { name: 'Updated Admin', phone: '+1 555 123 4567' },
    );

    expect(userFindUnique).toHaveBeenCalledWith({
      where: { firebaseUid: 'firebase-123' },
    });
    expect(userUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'local-user-1' },
      data: expect.objectContaining({
        email: 'admin@example.com',
        authProvider: 'google.com',
        name: 'Updated Admin',
        phone: '+1 555 123 4567',
      }),
    }));
    expect(user).toMatchObject({ id: 'local-user-1' });
  });

  it('creates a first-time local user from verified identity claims with default role CUSTOMER', async () => {
    const user = await authService.syncUser(
      {
        uid: 'firebase-new',
        email: 'new@example.com',
        email_verified: true,
        firebase: { sign_in_provider: 'password' },
      },
      { name: 'New User' },
    );

    expect(userCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        firebaseUid: 'firebase-new',
        name: 'New User',
        email: 'new@example.com',
        emailVerified: expect.any(Date),
        authProvider: 'password',
        isGuest: false,
        role: 'CUSTOMER',
        referralCode: 'REF12345',
        status: 'ACTIVE',
      }),
    }));
    expect(user).toMatchObject({ id: 'local-user-1', firebaseUid: 'firebase-new' });
  });

  it('creates anonymous Firebase identities as guests with role GUEST', async () => {
    await authService.syncUser(
      {
        uid: 'firebase-anon',
        firebase: { sign_in_provider: 'anonymous' },
      },
      {},
    );

    expect(userCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        firebaseUid: 'firebase-anon',
        email: null,
        authProvider: 'anonymous',
        isGuest: true,
        role: 'GUEST',
      }),
    }));
  });

  it('links seeded user by email ONLY if email_verified is true and row has no firebaseUid', async () => {
    const seededAdmin = {
      id: 'seeded-admin-1',
      email: 'admin@laptopmitra.com',
      firebaseUid: null,
      role: 'ADMIN',
      status: 'ACTIVE',
      emailVerified: null,
    };
    userFindUnique.mockResolvedValueOnce(null); // No user by firebaseUid
    userFindFirst.mockResolvedValueOnce(seededAdmin); // Found unlinked seeded user
    userUpdate.mockResolvedValueOnce({ ...seededAdmin, firebaseUid: 'firebase-admin-uid' });

    await authService.syncUser(
      {
        uid: 'firebase-admin-uid',
        email: 'admin@laptopmitra.com',
        email_verified: true,
        firebase: { sign_in_provider: 'password' },
      },
      {},
    );

    expect(userUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'seeded-admin-1' },
      data: expect.objectContaining({
        firebaseUid: 'firebase-admin-uid',
      }),
    }));
  });

  it('refuses email-based linking if email_verified is false', async () => {
    const seededAdmin = {
      id: 'seeded-admin-1',
      email: 'admin@laptopmitra.com',
      firebaseUid: null,
      role: 'ADMIN',
      status: 'ACTIVE',
    };
    userFindUnique.mockResolvedValueOnce(null);
    userFindFirst.mockResolvedValueOnce(seededAdmin);

    await authService.syncUser(
      {
        uid: 'firebase-unverified-attacker',
        email: 'admin@laptopmitra.com',
        email_verified: false,
        firebase: { sign_in_provider: 'password' },
      },
      {},
    );

    // Must NOT link to seeded-admin-1; must create a separate user
    expect(userUpdate).not.toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'seeded-admin-1' },
    }));
    expect(userCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        firebaseUid: 'firebase-unverified-attacker',
      }),
    }));
  });

  it('never accepts a client-sent role, email or firebaseUid from the profile body', async () => {
    userFindUnique.mockResolvedValue({
      id: 'local-user-1',
      firebaseUid: 'firebase-customer',
      role: 'CUSTOMER',
      isGuest: false,
      status: 'ACTIVE',
      emailVerified: null,
    });

    await authService.syncUser(
      {
        uid: 'firebase-customer',
        email: 'user@example.com',
        email_verified: true,
        firebase: { sign_in_provider: 'password' },
      },
      { name: 'Customer', role: 'ADMIN', email: 'hacked@admin.com', firebaseUid: 'spoofed' } as any,
    );

    const updateArgs = userUpdate.mock.calls[0][0];
    expect(updateArgs.data.email).toBe('user@example.com'); // from token
    expect(updateArgs.data).not.toHaveProperty('role');
    expect(updateArgs.data).not.toHaveProperty('firebaseUid');
  });

  it('handles database errors by throwing ServiceUnavailableException with no synthetic users', async () => {
    userFindUnique.mockRejectedValue(new Error('Connection pool exhausted'));

    await expect(
      authService.syncUser({
        uid: 'firebase-fail',
        email: 'fail@example.com',
      }),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('rejects direct passwordless login calls', async () => {
    await expect(authService.login({ email: 'admin@example.com' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('rejects direct unverified registration calls', async () => {
    await expect(authService.register({ email: 'new@example.com' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('handles race conditions during concurrent first-time logins', async () => {
    const createdUser = {
      id: 'user-concurrent-1',
      firebaseUid: 'firebase-concurrent',
      email: 'race@example.com',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      emailVerified: new Date(),
    };
    userFindUnique
      .mockResolvedValueOnce(null) // first check by UID returns null
      .mockResolvedValueOnce(createdUser); // recheck after unique conflict returns the created user

    userFindFirst.mockResolvedValue(null);
    userCreate.mockRejectedValueOnce(new Error('Unique constraint failed on the fields: (`firebaseUid`)'));

    const user = await authService.syncUser({
      uid: 'firebase-concurrent',
      email: 'race@example.com',
      email_verified: true,
    });

    expect(user).toMatchObject({ id: 'user-concurrent-1', firebaseUid: 'firebase-concurrent' });
  });
});