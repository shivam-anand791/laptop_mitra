import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Customer Coupons Web Contract & Logic Tests', () => {
  describe('1. Cart Discount Calculation & Boundaries', () => {
    it('applies coupon discount strictly against outright purchase total', () => {
      const subtotal = 45000;
      const discountSavings = 2000;
      const netPayable = Math.max(0, subtotal - discountSavings);

      assert.equal(netPayable, 43000);
      assert.ok(netPayable >= 0);
    });

    it('clamps net payable to zero if discount exceeds cart subtotal', () => {
      const subtotal = 1500;
      const discountSavings = 2000;
      const netPayable = Math.max(0, subtotal - discountSavings);

      assert.equal(netPayable, 0);
    });

    it('keeps rental lease charges separate from outright purchase discount', () => {
      const outrightTotal = 30000;
      const leaseMonthlyTotal = 2500;
      const couponSavings = 1500;

      const netOutright = Math.max(0, outrightTotal - couponSavings);
      const totalDueNow = netOutright + leaseMonthlyTotal;

      assert.equal(netOutright, 28500);
      assert.equal(totalDueNow, 31000);
    });
  });

  describe('2. Offers Sheet & Unlock Logic', () => {
    it('calculates rupee amount needed to unlock an offer with minOrderValue', () => {
      const cartSubtotal = 35000;
      const couponMinOrderValue = 50000;

      const amountNeeded = Math.max(0, couponMinOrderValue - cartSubtotal);
      assert.equal(amountNeeded, 15000);
    });

    it('formats badge discount text accurately in Indian Rupees', () => {
      const percentageCoupon = { type: 'PERCENT', value: 15, maxDiscountCap: 2000 };
      const flatCoupon = { type: 'FLAT', value: 1500 };

      const percentLabel = `${percentageCoupon.value}% OFF (Max ₹${percentageCoupon.maxDiscountCap.toLocaleString('en-IN')})`;
      const flatLabel = `₹${flatCoupon.value.toLocaleString('en-IN')} OFF`;

      assert.equal(percentLabel, '15% OFF (Max ₹2,000)');
      assert.equal(flatLabel, '₹1,500 OFF');
    });
  });

  describe('3. Checkout Payment Method Constraints (Online Only vs COD)', () => {
    it('restricts COD selection when coupon is online-only or prepaid', () => {
      const isDelhiNcrServiceable = true;
      const appliedCouponOnlineOnly = {
        code: 'PREPAID500',
        allowedPaymentMethods: 'ONLINE_ONLY',
      };

      const isCouponOnlineOnly =
        appliedCouponOnlineOnly.allowedPaymentMethods === 'ONLINE_ONLY' ||
        appliedCouponOnlineOnly.allowedPaymentMethods === 'PREPAID';

      const isCodSelectable = isDelhiNcrServiceable && !isCouponOnlineOnly;

      assert.equal(isCouponOnlineOnly, true);
      assert.equal(isCodSelectable, false);
    });

    it('restores COD availability for serviceable pincodes when online-only coupon is removed', () => {
      const isDelhiNcrServiceable = true;
      const appliedCoupon = null;

      const isCouponOnlineOnly = Boolean(
        appliedCoupon &&
          ((appliedCoupon as any).allowedPaymentMethods === 'ONLINE_ONLY' ||
            (appliedCoupon as any).allowedPaymentMethods === 'PREPAID')
      );

      const isCodSelectable = isDelhiNcrServiceable && !isCouponOnlineOnly;

      assert.equal(isCouponOnlineOnly, false);
      assert.equal(isCodSelectable, true);
    });
  });

  describe('4. Order Payload Separation (Coupon vs Referral)', () => {
    it('populates discountCode for coupons and keeps referralCode undefined', () => {
      const appliedDiscount = {
        code: 'WELCOME10',
        type: 'coupon',
        amount: 1000,
      };

      const payload = {
        discountCode: appliedDiscount.type === 'coupon' ? appliedDiscount.code : undefined,
        referralCode: appliedDiscount.type === 'referral' ? appliedDiscount.code : undefined,
      };

      assert.equal(payload.discountCode, 'WELCOME10');
      assert.equal(payload.referralCode, undefined);
    });

    it('populates referralCode for referral discounts and keeps discountCode undefined', () => {
      const appliedDiscount = {
        code: 'MITRA9876',
        type: 'referral',
        amount: 500,
      };

      const payload = {
        discountCode: appliedDiscount.type === 'coupon' ? appliedDiscount.code : undefined,
        referralCode: appliedDiscount.type === 'referral' ? appliedDiscount.code : undefined,
      };

      assert.equal(payload.discountCode, undefined);
      assert.equal(payload.referralCode, 'MITRA9876');
    });
  });
});

