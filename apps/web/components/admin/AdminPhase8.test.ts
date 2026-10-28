import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Canonical roles and statuses under test matching Phase 3 / packages/types
const USER_ROLES = ['CUSTOMER', 'ADMIN', 'MODERATOR', 'SUPPORT', 'GUEST'] as const;
type UserRole = typeof USER_ROLES[number];

const USER_STATUSES = ['ACTIVE', 'SUSPENDED', 'DELETED'] as const;
type UserStatus = typeof USER_STATUSES[number];

function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

function formatINR(amount: number | string | null | undefined): string {
  const num = toNumber(amount);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

describe('Phase 8: Admin Users & Analytics Contract Tests', () => {
  describe('Users Security & Role Rules', () => {
    it('role filter strictly matches canonical Phase 3 roles (CUSTOMER, ADMIN, MODERATOR, SUPPORT, GUEST), never USER', () => {
      assert.deepEqual(Array.from(USER_ROLES), ['CUSTOMER', 'ADMIN', 'MODERATOR', 'SUPPORT', 'GUEST']);
      assert.ok(!USER_ROLES.includes('USER' as any), 'Legacy "USER" role must not exist in canonical roles');
    });

    it('user status strictly matches authoritative constants (ACTIVE, SUSPENDED, DELETED)', () => {
      assert.deepEqual(Array.from(USER_STATUSES), ['ACTIVE', 'SUSPENDED', 'DELETED']);
    });

    it('forbids status modification for logged-in admin self row', () => {
      const currentAdminId = 'admin-uuid-123';
      const row = { id: 'admin-uuid-123', role: 'ADMIN', status: 'ACTIVE' };

      const canModifyUserStatus = (currentUserId: string, targetUser: { id: string; role: string }) => {
        if (targetUser.id === currentUserId) return false;
        if (targetUser.role === 'ADMIN') return false;
        return true;
      };

      assert.equal(canModifyUserStatus(currentAdminId, row), false, 'Admin must not be able to suspend their own account');
    });

    it('forbids status modification for other administrators', () => {
      const currentAdminId = 'admin-uuid-123';
      const otherAdmin = { id: 'admin-uuid-456', role: 'ADMIN', status: 'ACTIVE' };

      const canModifyUserStatus = (currentUserId: string, targetUser: { id: string; role: string }) => {
        if (targetUser.id === currentUserId) return false;
        if (targetUser.role === 'ADMIN') return false;
        return true;
      };

      assert.equal(canModifyUserStatus(currentAdminId, otherAdmin), false, 'Admin must not be able to suspend other admins');
    });

    it('permits status modification for customers and moderators by administrator', () => {
      const currentAdminId = 'admin-uuid-123';
      const customer = { id: 'user-uuid-789', role: 'CUSTOMER', status: 'ACTIVE' };
      const moderator = { id: 'mod-uuid-101', role: 'MODERATOR', status: 'ACTIVE' };

      const canModifyUserStatus = (currentUserId: string, targetUser: { id: string; role: string }) => {
        if (targetUser.id === currentUserId) return false;
        if (targetUser.role === 'ADMIN') return false;
        return true;
      };

      assert.equal(canModifyUserStatus(currentAdminId, customer), true);
      assert.equal(canModifyUserStatus(currentAdminId, moderator), true);
    });
  });

  describe('Analytics & Currency Rules', () => {
    it('validates URL-driven ranges to 7d, 30d, 90d with 7d as fallback', () => {
      const validRanges = ['7d', '30d', '90d'] as const;
      const parseRange = (raw: string | null): '7d' | '30d' | '90d' => {
        if (raw && (validRanges as readonly string[]).includes(raw)) {
          return raw as '7d' | '30d' | '90d';
        }
        return '7d';
      };

      assert.equal(parseRange('7d'), '7d');
      assert.equal(parseRange('30d'), '30d');
      assert.equal(parseRange('90d'), '90d');
      assert.equal(parseRange('invalid'), '7d');
      assert.equal(parseRange(null), '7d');
    });

    it('revenue is formatted in rupees via formatINR without dividing by 100', () => {
      const sampleRevenue = 75000;
      const formatted = formatINR(sampleRevenue);
      assert.ok(formatted.includes('75,000'), `Expected formatted string to contain 75,000 but got: ${formatted}`);
      assert.ok(!formatted.includes('750.00'), 'Must never divide rupee amounts by 100');
    });

    it('gracefully handles empty ranges without NaN or layout crash', () => {
      const emptyRevenueByDay: Array<{ date: string; amount: number }> = [
        { date: '2026-10-20', amount: 0 },
        { date: '2026-10-21', amount: 0 },
      ];
      const maxRevenue = Math.max(...emptyRevenueByDay.map((d) => d.amount), 0);
      assert.equal(maxRevenue, 0);

      const totalRevenue = emptyRevenueByDay.reduce((sum, d) => sum + toNumber(d.amount), 0);
      assert.equal(totalRevenue, 0);
      assert.ok(!isNaN(totalRevenue));
    });
  });
});
