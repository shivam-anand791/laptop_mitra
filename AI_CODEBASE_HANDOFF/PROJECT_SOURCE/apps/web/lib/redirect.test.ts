import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidInternalRedirect,
  canAccessPath,
  getDefaultRoleDestination,
  getSafeRedirectUrl,
} from './redirect.ts';

describe('Redirect Validator & Role-Aware Routing Matrix', () => {
  describe('isValidInternalRedirect', () => {
    it('accepts valid internal relative paths', () => {
      assert.equal(isValidInternalRedirect('/admin'), true);
      assert.equal(isValidInternalRedirect('/products/macbook-air-m1'), true);
      assert.equal(isValidInternalRedirect('/profile?tab=orders&page=2'), true);
      assert.equal(isValidInternalRedirect('/cart#checkout'), true);
      assert.equal(isValidInternalRedirect('/'), true);
    });

    it('rejects empty, non-string, or whitespace-only inputs', () => {
      assert.equal(isValidInternalRedirect(null), false);
      assert.equal(isValidInternalRedirect(undefined), false);
      assert.equal(isValidInternalRedirect(''), false);
      assert.equal(isValidInternalRedirect('   '), false);
      assert.equal(isValidInternalRedirect(123 as any), false);
    });

    it('rejects paths not starting with a leading slash', () => {
      assert.equal(isValidInternalRedirect('admin'), false);
      assert.equal(isValidInternalRedirect('products/macbook'), false);
      assert.equal(isValidInternalRedirect('www.laptopmitra.com'), false);
    });

    it('rejects protocol-relative URLs (//)', () => {
      assert.equal(isValidInternalRedirect('//evil.com'), false);
      assert.equal(isValidInternalRedirect('//laptopmitra.com/admin'), false);
      assert.equal(isValidInternalRedirect('///evil.com'), false);
    });

    it('rejects backslashes in raw and percent-encoded forms', () => {
      assert.equal(isValidInternalRedirect('/\\evil.com'), false);
      assert.equal(isValidInternalRedirect('\\evil.com'), false);
      assert.equal(isValidInternalRedirect('/admin\\orders'), false);
      assert.equal(isValidInternalRedirect('/%5cevil.com'), false);
      assert.equal(isValidInternalRedirect('/%5Cevil.com'), false);
      assert.equal(isValidInternalRedirect('/test/%5c/path'), false);
    });

    it('rejects absolute URLs with protocol schemes', () => {
      assert.equal(isValidInternalRedirect('https://evil.com'), false);
      assert.equal(isValidInternalRedirect('http://localhost:3000'), false);
      assert.equal(isValidInternalRedirect('javascript:alert(1)'), false);
      assert.equal(isValidInternalRedirect('data:text/html,evil'), false);
      assert.equal(isValidInternalRedirect('mailto:phish@evil.com'), false);
    });

    it('rejects scheme injection inside path segments', () => {
      assert.equal(isValidInternalRedirect('/javascript:alert(1)'), false);
      assert.equal(isValidInternalRedirect('/https://evil.com'), false);
      assert.equal(isValidInternalRedirect('/data:text/html'), false);
      assert.equal(isValidInternalRedirect('/%2f/evil.com'), false);
    });

    it('rejects null bytes and control characters', () => {
      assert.equal(isValidInternalRedirect('/admin\0evil'), false);
      assert.equal(isValidInternalRedirect('/admin%00evil'), false);
    });
  });

  describe('canAccessPath', () => {
    it('allows storefront and customer routes for all roles', () => {
      assert.equal(canAccessPath('/', 'CUSTOMER'), true);
      assert.equal(canAccessPath('/products/prod-1', 'CUSTOMER'), true);
      assert.equal(canAccessPath('/cart', 'GUEST'), true);
      assert.equal(canAccessPath('/profile', 'CUSTOMER'), true);
      assert.equal(canAccessPath('/products', 'ADMIN'), true);
      assert.equal(canAccessPath('/products', 'SUPPORT'), true);
    });

    it('allows full /admin access for ADMIN role only', () => {
      assert.equal(canAccessPath('/admin', 'ADMIN'), true);
      assert.equal(canAccessPath('/admin/orders', 'ADMIN'), true);
      assert.equal(canAccessPath('/admin/users', 'ADMIN'), true);
      assert.equal(canAccessPath('/admin/settings', 'ADMIN'), true);
      assert.equal(canAccessPath('/admin/support', 'ADMIN'), true);
    });

    it('restricts SUPPORT role strictly to support and returns modules', () => {
      assert.equal(canAccessPath('/admin/support', 'SUPPORT'), true);
      assert.equal(canAccessPath('/admin/support/ticket-123', 'SUPPORT'), true);
      assert.equal(canAccessPath('/admin/returns', 'SUPPORT'), true);
      // General admin overview, orders, settings are forbidden for SUPPORT
      assert.equal(canAccessPath('/admin', 'SUPPORT'), false);
      assert.equal(canAccessPath('/admin/users', 'SUPPORT'), false);
      assert.equal(canAccessPath('/admin/settings', 'SUPPORT'), false);
      assert.equal(canAccessPath('/admin/orders', 'SUPPORT'), false);
    });

    it('forbids /admin routes for CUSTOMER and GUEST roles', () => {
      assert.equal(canAccessPath('/admin', 'CUSTOMER'), false);
      assert.equal(canAccessPath('/admin/orders', 'CUSTOMER'), false);
      assert.equal(canAccessPath('/admin/support', 'CUSTOMER'), false);
      assert.equal(canAccessPath('/admin', 'GUEST'), false);
      assert.equal(canAccessPath('/admin', undefined), false);
    });
  });

  describe('getDefaultRoleDestination', () => {
    it('returns /admin for ADMIN', () => {
      assert.equal(getDefaultRoleDestination('ADMIN'), '/admin');
      assert.equal(getDefaultRoleDestination('admin'), '/admin');
    });

    it('returns /admin/support for SUPPORT', () => {
      assert.equal(getDefaultRoleDestination('SUPPORT'), '/admin/support');
      assert.equal(getDefaultRoleDestination('support'), '/admin/support');
    });

    it('returns /profile for CUSTOMER, GUEST, and default', () => {
      assert.equal(getDefaultRoleDestination('CUSTOMER'), '/profile');
      assert.equal(getDefaultRoleDestination('GUEST'), '/profile');
      assert.equal(getDefaultRoleDestination(undefined), '/profile');
    });
  });

  describe('getSafeRedirectUrl', () => {
    it('routes ADMIN to /admin on login/root/profile default destinations', () => {
      assert.equal(getSafeRedirectUrl(null, 'ADMIN'), '/admin');
      assert.equal(getSafeRedirectUrl('', 'ADMIN'), '/admin');
      assert.equal(getSafeRedirectUrl('/', 'ADMIN'), '/admin');
      assert.equal(getSafeRedirectUrl('/profile', 'ADMIN'), '/admin');
      assert.equal(getSafeRedirectUrl('/account', 'ADMIN'), '/admin');
      assert.equal(getSafeRedirectUrl('/login', 'ADMIN'), '/admin');
    });

    it('preserves specific deep internal targets for ADMIN', () => {
      assert.equal(getSafeRedirectUrl('/admin/orders?status=PENDING', 'ADMIN'), '/admin/orders?status=PENDING');
      assert.equal(getSafeRedirectUrl('/products/macbook-air-m1', 'ADMIN'), '/products/macbook-air-m1');
    });

    it('routes SUPPORT to /admin/support on default paths', () => {
      assert.equal(getSafeRedirectUrl(null, 'SUPPORT'), '/admin/support');
      assert.equal(getSafeRedirectUrl('/', 'SUPPORT'), '/admin/support');
      assert.equal(getSafeRedirectUrl('/profile', 'SUPPORT'), '/admin/support');
      assert.equal(getSafeRedirectUrl('/admin', 'SUPPORT'), '/admin/support');
    });

    it('preserves valid target for CUSTOMER, falling back to /profile on invalid or root', () => {
      assert.equal(getSafeRedirectUrl('/products/thinkpad-t14', 'CUSTOMER'), '/products/thinkpad-t14');
      assert.equal(getSafeRedirectUrl('/', 'CUSTOMER'), '/profile');
      assert.equal(getSafeRedirectUrl(null, 'CUSTOMER'), '/profile');
    });

    it('neutralizes malicious external redirect targets by returning role fallback', () => {
      assert.equal(getSafeRedirectUrl('https://malicious.com', 'ADMIN'), '/admin');
      assert.equal(getSafeRedirectUrl('//evil.com/admin', 'ADMIN'), '/admin');
      assert.equal(getSafeRedirectUrl('/\\evil.com', 'CUSTOMER'), '/profile');
      assert.equal(getSafeRedirectUrl('javascript:alert(1)', 'CUSTOMER'), '/profile');
      assert.equal(getSafeRedirectUrl('/%5cevil.com', 'SUPPORT'), '/admin/support');
    });
  });
});
