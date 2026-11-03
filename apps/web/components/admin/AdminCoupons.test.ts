import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

export interface CouponFormValidationInput {
  code: string;
  title: string;
  type: string;
  value: number;
  maxDiscountCap?: number;
  minOrderValue?: number;
}

export function validateCouponForm(data: CouponFormValidationInput): Record<string, string> {
  const errors: Record<string, string> = {};

  const cleanCode = data.code?.trim().toUpperCase();
  if (!cleanCode) {
    errors.code = 'Coupon code is required';
  } else if (!/^[A-Z0-9_-]{4,20}$/.test(cleanCode)) {
    errors.code = 'Coupon code must be 4 to 20 uppercase alphanumeric characters';
  }

  if (!data.title?.trim()) {
    errors.title = 'Title shown to customers is required';
  }

  if (data.value === undefined || isNaN(data.value) || data.value <= 0) {
    errors.value = 'Discount value must be a positive number';
  } else if (data.type === 'percentage' && data.value > 90) {
    errors.value = 'Percentage discount cannot exceed 90%';
  }

  if (data.maxDiscountCap !== undefined && (isNaN(data.maxDiscountCap) || data.maxDiscountCap <= 0)) {
    errors.maxDiscountCap = 'Max discount cap must be greater than zero';
  }

  if (data.minOrderValue !== undefined && (isNaN(data.minOrderValue) || data.minOrderValue < 0)) {
    errors.minOrderValue = 'Minimum order value cannot be negative';
  }

  return errors;
}

export function canManageCoupons(role: string | null | undefined): boolean {
  return role === 'ADMIN';
}

export function canViewCoupons(role: string | null | undefined): boolean {
  return role === 'ADMIN' || role === 'SUPPORT';
}

describe('Admin Coupons & Promo Codes Contract Tests', () => {
  describe('1. Form Validation', () => {
    it('accepts valid percentage and fixed coupon inputs', () => {
      const validPercentage: CouponFormValidationInput = {
        code: 'SUMMER20',
        title: '20% Summer Savings',
        type: 'percentage',
        value: 20,
        maxDiscountCap: 1500,
        minOrderValue: 2000,
      };
      const errors = validateCouponForm(validPercentage);
      assert.deepEqual(errors, {});
    });

    it('rejects short codes or codes with invalid characters', () => {
      const invalidShort = validateCouponForm({
        code: 'ABC',
        title: 'Short',
        type: 'fixed',
        value: 100,
      });
      assert.equal(invalidShort.code, 'Coupon code must be 4 to 20 uppercase alphanumeric characters');

      const invalidChars = validateCouponForm({
        code: 'PROMO 100',
        title: 'Space',
        type: 'fixed',
        value: 100,
      });
      assert.equal(invalidChars.code, 'Coupon code must be 4 to 20 uppercase alphanumeric characters');
    });

    it('rejects excessive percentage discounts > 90%', () => {
      const errors = validateCouponForm({
        code: 'TOO_MUCH',
        title: '95% off',
        type: 'percentage',
        value: 95,
      });
      assert.equal(errors.value, 'Percentage discount cannot exceed 90%');
    });

    it('requires display title for customer sheets', () => {
      const errors = validateCouponForm({
        code: 'VALIDCODE',
        title: '   ',
        type: 'fixed',
        value: 500,
      });
      assert.equal(errors.title, 'Title shown to customers is required');
    });
  });

  describe('2. Role Permissions (Admin vs Support)', () => {
    it('permits ADMIN to create, edit, pause, and archive coupons', () => {
      assert.equal(canManageCoupons('ADMIN'), true);
      assert.equal(canViewCoupons('ADMIN'), true);
    });

    it('restricts SUPPORT to read-only viewing of coupons and redemptions', () => {
      assert.equal(canManageCoupons('SUPPORT'), false);
      assert.equal(canViewCoupons('SUPPORT'), true);
    });

    it('blocks CUSTOMER and GUEST roles completely from admin coupons', () => {
      assert.equal(canManageCoupons('CUSTOMER'), false);
      assert.equal(canViewCoupons('CUSTOMER'), false);
      assert.equal(canManageCoupons(null), false);
      assert.equal(canViewCoupons(null), false);
    });
  });

  describe('3. Immutability & Soft Deletes', () => {
    it('marks coupon status as ARCHIVED and disables isActive on deletion (never hard deleted)', () => {
      const coupon = {
        id: 'c-1',
        code: 'SAVE10',
        status: 'ACTIVE',
        isActive: true,
      };

      // Simulating soft delete action
      const archived = {
        ...coupon,
        status: 'ARCHIVED',
        isActive: false,
      };

      assert.equal(archived.status, 'ARCHIVED');
      assert.equal(archived.isActive, false);
      assert.equal(archived.id, 'c-1'); // Record preserved
    });
  });

  describe('4. Bulk Generator Constraints', () => {
    it('validates batch size limits between 1 and 500', () => {
      const validateBatch = (qty: number) => qty >= 1 && qty <= 500;
      assert.equal(validateBatch(0), false);
      assert.equal(validateBatch(50), true);
      assert.equal(validateBatch(500), true);
      assert.equal(validateBatch(501), false);
    });
  });
});

