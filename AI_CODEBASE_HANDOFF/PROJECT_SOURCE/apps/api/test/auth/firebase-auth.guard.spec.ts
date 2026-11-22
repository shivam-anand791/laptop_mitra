import { ExecutionContext, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FirebaseAuthGuard } from '../../src/auth/guards/firebase-auth.guard';
import { ALLOW_UNLINKED_FIREBASE_USER_KEY } from '../../src/decorators/allow-firebase-sync.decorator';
import { CHECK_FIREBASE_REVOCATION_KEY } from '../../src/decorators/check-firebase-revocation.decorator';
import { PUBLIC_ROUTE_KEY } from '../../src/decorators/public.decorator';

jest.mock('../../src/firebase/firebase.service', () => ({
  FirebaseService: class FirebaseService {},
}));

jest.mock('../../src/prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

describe('FirebaseAuthGuard', () => {
  const identity = {
    uid: 'firebase-user-1',
    email: 'user@example.com',
    email_verified: true,
  };
  const localUser = {
    id: 'local-user-1',
    name: 'User',
    email: 'user@example.com',
    role: 'CUSTOMER',
    status: 'ACTIVE',
    referralCode: 'REF12345',
  };
  const metadata: Record<string, boolean> = {};
  const reflector = {
    getAllAndOverride: jest.fn((key: string) => metadata[key]),
  } as unknown as Reflector;
  const verifyIdToken = jest.fn();
  const findUnique = jest.fn();
  const guard = new FirebaseAuthGuard(
    reflector,
    { verifyIdToken } as any,
    { user: { findUnique } } as any,
  );

  const createContext = (authorization?: string) => {
    const request: any = { headers: {} };
    if (authorization !== undefined) {
      request.headers.authorization = authorization;
    }
    const context = {
      getHandler: () => ({}),
      getClass: () => class TestController {},
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    return { context, request };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(metadata).forEach((key) => delete metadata[key]);
    verifyIdToken.mockResolvedValue(identity);
    findUnique.mockResolvedValue(localUser);
  });

  it('rejects a missing bearer token', async () => {
    const { context } = createContext();

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it.each([
    'auth/invalid-id-token',
    'auth/id-token-expired',
    'auth/id-token-revoked',
  ])('returns a generic 401 for %s', async (code) => {
    verifyIdToken.mockRejectedValue(Object.assign(new Error('private verification detail'), { code }));
    const { context } = createContext('Bearer firebase-token');

    await expect(guard.canActivate(context)).rejects.toThrow('Unauthorized');
  });

  it('fails closed with a generic 503 when Firebase verification is unavailable', async () => {
    verifyIdToken.mockRejectedValue(new Error('internal provider detail'));
    const { context } = createContext('Bearer firebase-token');

    await expect(guard.canActivate(context)).rejects.toThrow(ServiceUnavailableException);
  });

  it('maps a valid Firebase identity to the local req.user', async () => {
    const { context, request } = createContext('Bearer firebase-token');

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(findUnique).toHaveBeenCalledWith({
      where: { firebaseUid: identity.uid },
      select: expect.objectContaining({ id: true, role: true, status: true }),
    });
    expect(request.user).toEqual(localUser);
    expect(request.firebaseIdentity).toEqual(identity);
  });

  it('requests revocation checking when route metadata marks an operation sensitive', async () => {
    metadata[CHECK_FIREBASE_REVOCATION_KEY] = true;
    const { context } = createContext('Bearer firebase-token');

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(verifyIdToken).toHaveBeenCalledWith('firebase-token', true);
  });

  it('allows a verified identity without a local user only on the sync route', async () => {
    findUnique.mockResolvedValue(null);
    metadata[ALLOW_UNLINKED_FIREBASE_USER_KEY] = true;
    const { context, request } = createContext('Bearer firebase-token');

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(request.firebaseIdentity).toEqual(identity);
    expect(request.user).toBeUndefined();
  });

  it('does not allow an unknown Firebase identity on other routes', async () => {
    findUnique.mockResolvedValue(null);
    const { context } = createContext('Bearer firebase-token');

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('does not map a Firebase UID to an unrelated local ID', async () => {
    findUnique.mockResolvedValue(null);
    const { context } = createContext('Bearer firebase-token');

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    expect(findUnique).toHaveBeenCalledTimes(1);
  });

  it('skips token verification for a public route', async () => {
    metadata[PUBLIC_ROUTE_KEY] = true;
    const { context } = createContext();

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(verifyIdToken).not.toHaveBeenCalled();
  });
});
