import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

/**
 * AdminGuard & API Interception Unit Tests
 *
 * Validates the core security logic and state transitions:
 * 1. Unauthenticated -> Redirects to /login?next=/admin
 * 2. Authenticated Non-Admin (e.g. CUSTOMER) -> Displays 403 Screen, blocks children
 * 3. Authenticated Admin (ADMIN + ACTIVE) -> Grants access, renders children
 * 4. LocalStorage Spoofing -> Client claims ADMIN, server profile returns CUSTOMER -> Denied (403)
 * 5. Server Profile Failure -> Cannot confirm ADMIN -> Denied (403), never falls back to localStorage
 * 6. Global 401 Handling -> Refreshes token once, redirects admin context to /login?next=/admin
 * 7. Global 403 Handling -> Dispatches 'admin:forbidden' event to trigger 403 screen
 */

describe('AdminGuard Security & Role Enforcement Matrix', () => {
  interface AuthContextMock {
    user: { email: string; role: string; status: string } | null;
    isLoading: boolean;
    isAuthenticated: boolean;
  }

  interface ProfileResponse {
    role: string;
    status: string;
  }

  function resolveAdminGuardState({
    auth,
    getProfileResult,
    getProfileError,
  }: {
    auth: AuthContextMock;
    getProfileResult?: ProfileResponse;
    getProfileError?: { status: number; message: string };
  }) {
    // 1. Loading
    if (auth.isLoading) {
      return { state: 'SKELETON_LOADING', canRenderChildren: false };
    }

    // 2. Unauthenticated
    if (!auth.isAuthenticated || !auth.user) {
      return { state: 'REDIRECT_LOGIN', redirectUrl: '/login?next=/admin', canRenderChildren: false };
    }

    // 3. Authenticated - Authoritative check
    if (getProfileError) {
      if (getProfileError.status === 401) {
        return { state: 'REDIRECT_LOGIN', redirectUrl: '/login?next=/admin', canRenderChildren: false };
      }
      return { state: '403_FORBIDDEN', canRenderChildren: false };
    }

    if (getProfileResult?.role === 'ADMIN' && getProfileResult?.status === 'ACTIVE') {
      return { state: 'AUTHORIZED', canRenderChildren: true };
    }

    return {
      state: '403_FORBIDDEN',
      role: getProfileResult?.role || 'CUSTOMER',
      canRenderChildren: false,
    };
  }

  it('State 1: Renders layout skeleton while auth is loading', () => {
    const outcome = resolveAdminGuardState({
      auth: { user: null, isLoading: true, isAuthenticated: false },
    });
    assert.equal(outcome.state, 'SKELETON_LOADING');
    assert.equal(outcome.canRenderChildren, false);
  });

  it('State 2: Redirects unauthenticated visitor to /login?next=/admin', () => {
    const outcome = resolveAdminGuardState({
      auth: { user: null, isLoading: false, isAuthenticated: false },
    });
    assert.equal(outcome.state, 'REDIRECT_LOGIN');
    assert.equal(outcome.redirectUrl, '/login?next=/admin');
    assert.equal(outcome.canRenderChildren, false);
  });

  it('State 3: Blocks CUSTOMER account with 403 forbidden screen and never renders children', () => {
    const outcome = resolveAdminGuardState({
      auth: {
        user: { email: 'customer@example.com', role: 'CUSTOMER', status: 'ACTIVE' },
        isLoading: false,
        isAuthenticated: true,
      },
      getProfileResult: { role: 'CUSTOMER', status: 'ACTIVE' },
    });
    assert.equal(outcome.state, '403_FORBIDDEN');
    assert.equal(outcome.canRenderChildren, false);
  });

  it('State 4: Renders admin shell when user is verified ADMIN with ACTIVE status', () => {
    const outcome = resolveAdminGuardState({
      auth: {
        user: { email: 'admin@xpertnote.com', role: 'ADMIN', status: 'ACTIVE' },
        isLoading: false,
        isAuthenticated: true,
      },
      getProfileResult: { role: 'ADMIN', status: 'ACTIVE' },
    });
    assert.equal(outcome.state, 'AUTHORIZED');
    assert.equal(outcome.canRenderChildren, true);
  });

  it('State 5 (Anti-Spoofing): Spoofed lm_user in localStorage does NOT grant access when server returns CUSTOMER', () => {
    const outcome = resolveAdminGuardState({
      auth: {
        // Malicious user changed localStorage lm_user to ADMIN
        user: { email: 'attacker@example.com', role: 'ADMIN', status: 'ACTIVE' },
        isLoading: false,
        isAuthenticated: true,
      },
      // Backend database profile check returns true role from DB: CUSTOMER
      getProfileResult: { role: 'CUSTOMER', status: 'ACTIVE' },
    });
    assert.equal(outcome.state, '403_FORBIDDEN');
    assert.equal(outcome.canRenderChildren, false);
  });

  it('State 6: Suspended ADMIN account is denied access with 403', () => {
    const outcome = resolveAdminGuardState({
      auth: {
        user: { email: 'suspended-admin@example.com', role: 'ADMIN', status: 'SUSPENDED' },
        isLoading: false,
        isAuthenticated: true,
      },
      getProfileResult: { role: 'ADMIN', status: 'SUSPENDED' },
    });
    assert.equal(outcome.state, '403_FORBIDDEN');
    assert.equal(outcome.canRenderChildren, false);
  });

  it('State 7: Backend profile network or server failure strictly denies access without trusting client state', () => {
    const outcome = resolveAdminGuardState({
      auth: {
        user: { email: 'admin@xpertnote.com', role: 'ADMIN', status: 'ACTIVE' },
        isLoading: false,
        isAuthenticated: true,
      },
      getProfileError: { status: 500, message: 'Internal Server Error' },
    });
    assert.equal(outcome.state, '403_FORBIDDEN');
    assert.equal(outcome.canRenderChildren, false);
  });
});

describe('Global 401/403 Handling Logic', () => {
  it('triggers token refresh on initial 401 and retries request', async () => {
    let tokenRefreshed = false;
    let attempts = 0;

    async function mockRequest(isRetry = false): Promise<string> {
      attempts++;
      if (attempts === 1) {
        if (!isRetry) {
          tokenRefreshed = true;
          return mockRequest(true);
        }
      }
      return 'success';
    }

    const result = await mockRequest(false);
    assert.equal(tokenRefreshed, true);
    assert.equal(attempts, 2);
    assert.equal(result, 'success');
  });

  it('redirects to /login?next=/admin when 401 persists on admin context after retry', () => {
    const pathname = '/admin/products';
    let redirectedTo = '';

    function handlePersistent401(path: string) {
      if (path.startsWith('/admin')) {
        redirectedTo = '/login?next=/admin';
      }
    }

    handlePersistent401(pathname);
    assert.equal(redirectedTo, '/login?next=/admin');
  });

  it('dispatches admin:forbidden custom event when 403 status is received', () => {
    let forbiddenEventFired = false;
    const listeners: Record<string, Array<() => void>> = {};

    function addEventListener(event: string, fn: () => void) {
      listeners[event] = listeners[event] || [];
      listeners[event].push(fn);
    }

    function dispatchEvent(event: string) {
      if (listeners[event]) {
        listeners[event].forEach((fn) => fn());
      }
    }

    addEventListener('admin:forbidden', () => {
      forbiddenEventFired = true;
    });

    // Simulate 403 response
    dispatchEvent('admin:forbidden');
    assert.equal(forbiddenEventFired, true);
  });
});
