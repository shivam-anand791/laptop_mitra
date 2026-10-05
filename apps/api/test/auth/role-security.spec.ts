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

import { ForbiddenException, BadRequestException, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../src/guards/roles.guard';
import { AuthService } from '../../src/auth/auth.service';
import { UsersService } from '../../src/users/users.service';
import { FirebaseAuthGuard } from '../../src/auth/guards/firebase-auth.guard';
import { extractHost } from '../../scripts/promote-admin';

describe('Role Security & Privilege Escalation Prevention', () => {
  describe('Database-only Role Enforcement (Guard & Request Context)', () => {
    it('sets request.user.role strictly from the database, ignoring token custom claims or body', async () => {
      const dbUser = {
        id: 'user-db-1',
        name: 'Regular Customer',
        email: 'user@example.com',
        role: 'CUSTOMER',
        status: 'ACTIVE',
        referralCode: 'REF123',
      };

      const prisma = {
        user: {
          findUnique: jest.fn().mockResolvedValue(dbUser),
        },
      };

      const firebaseService = {
        verifyIdToken: jest.fn().mockResolvedValue({
          uid: 'firebase-uid-1',
          role: 'ADMIN', // Attacker put role: 'ADMIN' in custom claims
          admin: true,
        }),
      };

      const reflector = {
        getAllAndOverride: jest.fn().mockReturnValue(false),
      } as unknown as Reflector;

      const guard = new FirebaseAuthGuard(reflector, firebaseService as any, prisma as any);

      const request: any = {
        headers: { authorization: 'Bearer valid.jwt.token' },
        body: { role: 'ADMIN', status: 'ACTIVE' },
      };

      const context = {
        getHandler: () => ({}),
        getClass: () => class TestController {},
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as unknown as ExecutionContext;

      const allowed = await guard.canActivate(context);
      expect(allowed).toBe(true);

      // The role MUST come strictly from dbUser, NOT the token custom claim or body
      expect(request.user.role).toBe('CUSTOMER');
      expect(request.user.role).not.toBe('ADMIN');
    });
  });

  describe('Protection against Client-controlled Privilege Escalation in Services', () => {
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
      createCustomToken: jest.fn().mockResolvedValue('token'),
    };

    const authService = new AuthService(
      prisma as any,
      randomService as any,
      firebaseService as any,
    );

    const usersService = new UsersService(prisma as any);

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('syncUser ignores client-supplied role, status, or firebaseUid in profile body', async () => {
      userFindUnique.mockResolvedValue({
        id: 'user-1',
        firebaseUid: 'real-uid',
        email: 'user@example.com',
        role: 'CUSTOMER',
        status: 'ACTIVE',
        isGuest: false,
        emailVerified: new Date(),
      });

      userUpdate.mockImplementation(async ({ data }) => ({
        id: 'user-1',
        ...data,
      }));

      await authService.syncUser(
        {
          uid: 'real-uid',
          email: 'user@example.com',
          email_verified: true,
        },
        {
          name: 'New Name',
          role: 'ADMIN',
          status: 'SUSPENDED',
          firebaseUid: 'spoofed-uid',
        } as any,
      );

      expect(userUpdate).toHaveBeenCalled();
      const updateData = userUpdate.mock.calls[0][0].data;
      expect(updateData).not.toHaveProperty('role');
      expect(updateData).not.toHaveProperty('status');
      expect(updateData.firebaseUid).toBeUndefined();
    });

    it('updateUserProfile in AuthService cannot modify role, status, or firebaseUid', async () => {
      userFindUnique.mockResolvedValue({
        id: 'user-1',
        name: 'Updated Name',
        email: 'user@example.com',
        role: 'CUSTOMER',
        status: 'ACTIVE',
      });

      await authService.updateUserProfile('user-1', {
        name: 'Updated Name',
        role: 'ADMIN',
        status: 'SUSPENDED',
        firebaseUid: 'spoofed-uid',
      } as any);

      expect(userUpdate).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { name: 'Updated Name' },
      });
      const updateData = userUpdate.mock.calls[0][0].data;
      expect(updateData).not.toHaveProperty('role');
      expect(updateData).not.toHaveProperty('status');
      expect(updateData).not.toHaveProperty('firebaseUid');
    });

    it('updateProfile in UsersService cannot modify role, status, or firebaseUid', async () => {
      userUpdate.mockResolvedValue({
        id: 'user-1',
        name: 'New Name',
      });

      await usersService.updateProfile('user-1', {
        name: 'New Name',
        role: 'ADMIN',
        status: 'SUSPENDED',
        firebaseUid: 'spoofed-uid',
      } as any);

      expect(userUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: {
            name: 'New Name',
            gender: undefined,
            dob: undefined,
          },
        }),
      );
      const updateData = userUpdate.mock.calls[0][0].data;
      expect(updateData).not.toHaveProperty('role');
      expect(updateData).not.toHaveProperty('status');
      expect(updateData).not.toHaveProperty('firebaseUid');
    });

    it('guest upgrading to a real account keeps data intact and promotes GUEST to CUSTOMER', async () => {
      const guestUser = {
        id: 'guest-user-1',
        firebaseUid: 'anon-uid',
        email: null,
        name: 'Guest Customer',
        role: 'GUEST',
        status: 'ACTIVE',
        isGuest: true,
        referralCode: 'GUESTREF',
        referralEarnings: 0,
        createdAt: new Date('2026-01-01'),
      };

      userFindUnique.mockResolvedValue(guestUser);
      userUpdate.mockImplementation(async ({ data }) => ({
        ...guestUser,
        ...data,
      }));

      const upgraded = await authService.syncUser(
        {
          uid: 'anon-uid',
          email: 'realuser@laptopmitra.com',
          email_verified: true,
          firebase: { sign_in_provider: 'password' },
        },
        { name: 'Real Customer' },
      );

      expect(userUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'guest-user-1' },
          data: expect.objectContaining({
            email: 'realuser@laptopmitra.com',
            isGuest: false,
            role: 'CUSTOMER',
            name: 'Real Customer',
          }),
        }),
      );
      expect(upgraded.id).toBe('guest-user-1');
      expect(upgraded.role).toBe('CUSTOMER');
      expect(upgraded.isGuest).toBe(false);
    });
  });

  describe('Route Authorization for GUEST Role', () => {
    const rolesGuard = (requiredRoles: string[]) => {
      const reflector = {
        getAllAndMerge: jest.fn(() => requiredRoles),
      } as unknown as Reflector;
      return new RolesGuard(reflector);
    };

    const makeContext = (userRole: string) =>
      ({
        getHandler: () => ({}),
        getClass: () => class TestController {},
        switchToHttp: () => ({
          getRequest: () => ({ user: { id: 'test-user', role: userRole } }),
        }),
      } as unknown as ExecutionContext);

    it('rejects GUEST users from reaching admin routes (Roles: ADMIN)', () => {
      const guard = rolesGuard(['ADMIN']);
      expect(() => guard.canActivate(makeContext('GUEST'))).toThrow(ForbiddenException);
    });

    it('rejects GUEST users from creating payments (Roles: CUSTOMER, ADMIN)', () => {
      const guard = rolesGuard(['CUSTOMER', 'ADMIN']);
      expect(() => guard.canActivate(makeContext('GUEST'))).toThrow(ForbiddenException);
    });

    it('rejects GUEST users from writing product data (Roles: ADMIN)', () => {
      const guard = rolesGuard(['ADMIN']);
      expect(() => guard.canActivate(makeContext('GUEST'))).toThrow(ForbiddenException);
    });

    it('allows CUSTOMER users on payment routes', () => {
      const guard = rolesGuard(['CUSTOMER', 'ADMIN']);
      expect(guard.canActivate(makeContext('CUSTOMER'))).toBe(true);
    });

    it('allows ADMIN users on admin and product write routes', () => {
      const guard = rolesGuard(['ADMIN']);
      expect(guard.canActivate(makeContext('ADMIN'))).toBe(true);
    });
  });

  describe('promote-admin script safety', () => {
    it('extractHost correctly extracts hostname and port without credentials', () => {
      expect(extractHost('postgresql://admin:superSecret123@db.example.com:5432/mydb?sslmode=require'))
        .toBe('db.example.com:5432');
      expect(extractHost('postgres://user:pass@localhost:5432/lm_test'))
        .toBe('localhost:5432');
      expect(extractHost('postgres://postgres:pwd@10.0.0.5/prod'))
        .toBe('10.0.0.5');
      expect(extractHost(undefined))
        .toBe('unknown (DATABASE_URL not set)');
    });
  });
});
