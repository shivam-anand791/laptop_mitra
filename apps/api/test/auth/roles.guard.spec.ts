import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../src/guards/roles.guard';

describe('RolesGuard guest restrictions', () => {
  const requiredRoles = ['CUSTOMER', 'ADMIN'];
  const reflector = {
    getAllAndMerge: jest.fn(() => requiredRoles),
  } as unknown as Reflector;
  const guard = new RolesGuard(reflector);

  const createContext = (user: { id: string; role: string } | undefined) => ({
    getHandler: () => ({}),
    getClass: () => class TestController {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  }) as unknown as ExecutionContext;

  it('rejects anonymous Firebase guest users from customer-only routes', async () => {
    expect(() => guard.canActivate(createContext({ id: 'guest-user', role: 'GUEST' })))
      .toThrow(ForbiddenException);
  });

  it('allows linked Firebase customer accounts', async () => {
    expect(guard.canActivate(createContext({ id: 'customer-user', role: 'CUSTOMER' })))
      .toBe(true);
  });
});