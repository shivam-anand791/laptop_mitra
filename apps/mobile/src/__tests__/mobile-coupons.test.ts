describe('Mobile Coupons & Promo Code Architecture Tests', () => {
  describe('1. Cart Discount Calculation & Boundaries', () => {
    it('applies coupon discount strictly against outright purchase subtotal', () => {
      const subtotal = 38000;
      const couponSavings = 1500;
      const netPayable = Math.max(0, subtotal - couponSavings);

      expect(netPayable).toBe(36500);
      expect(netPayable).toBeGreaterThanOrEqual(0);
    });

    it('safely clamps net payable to zero if coupon discount exceeds cart value', () => {
      const subtotal = 1200;
      const couponSavings = 2000;
      const netPayable = Math.max(0, subtotal - couponSavings);

      expect(netPayable).toBe(0);
    });

    it('isolates rental Advance monthly charge from outright purchase coupon discount', () => {
      const outrightDirectPurchase = 25000;
      const rentalMonth1Advance = 3000;
      const couponDiscount = 1000;

      const netOutright = Math.max(0, outrightDirectPurchase - couponDiscount);
      const totalDueNow = netOutright + rentalMonth1Advance;

      expect(netOutright).toBe(24000);
      expect(totalDueNow).toBe(27000);
    });
  });

  describe('2. Offers Sheet Unlock & Badge Formatting', () => {
    it('calculates rupee amount needed to unlock a coupon with minimum order value', () => {
      const cartSubtotal = 22000;
      const couponMinOrderValue = 35000;

      const amountNeeded = Math.max(0, couponMinOrderValue - cartSubtotal);
      expect(amountNeeded).toBe(13000);
    });

    it('formats coupon badges accurately in Indian Rupees', () => {
      const percentCoupon = { type: 'percentage', value: 20, maxDiscountCap: 2500 };
      const flatCoupon = { type: 'fixed', value: 1000 };

      const percentBadge = `${percentCoupon.value}% OFF (Max ₹${percentCoupon.maxDiscountCap.toLocaleString('en-IN')})`;
      const flatBadge = `₹${flatCoupon.value.toLocaleString('en-IN')} OFF`;

      expect(percentBadge).toBe('20% OFF (Max ₹2,500)');
      expect(flatBadge).toBe('₹1,000 OFF');
    });
  });

  describe('3. Checkout Payment Method Constraints (Online Only vs COD Parity)', () => {
    const evaluateCodAvailability = (
      isDelhiNcr: boolean,
      coupon?: { allowedPaymentMethods?: string } | null,
    ) => {
      const isCouponOnlineOnly =
        coupon?.allowedPaymentMethods === 'ONLINE_ONLY' ||
        coupon?.allowedPaymentMethods === 'PREPAID';

      return {
        isDelhiNcr,
        isCouponOnlineOnly,
        codAllowed: isDelhiNcr && !isCouponOnlineOnly,
        prepaidAllowed: true,
      };
    };

    it('disables COD even in Delhi NCR when an online-only coupon is applied', () => {
      const result = evaluateCodAvailability(true, {
        allowedPaymentMethods: 'ONLINE_ONLY',
      });

      expect(result.isDelhiNcr).toBe(true);
      expect(result.isCouponOnlineOnly).toBe(true);
      expect(result.codAllowed).toBe(false);
      expect(result.prepaidAllowed).toBe(true);
    });

    it('restores COD in Delhi NCR when an online-only coupon is removed', () => {
      const result = evaluateCodAvailability(true, null);

      expect(result.isDelhiNcr).toBe(true);
      expect(result.isCouponOnlineOnly).toBe(false);
      expect(result.codAllowed).toBe(true);
      expect(result.prepaidAllowed).toBe(true);
    });

    it('keeps COD disabled for non-NCR addresses regardless of coupon status', () => {
      const withCoupon = evaluateCodAvailability(false, {
        allowedPaymentMethods: 'ANY',
      });
      const withoutCoupon = evaluateCodAvailability(false, null);

      expect(withCoupon.codAllowed).toBe(false);
      expect(withoutCoupon.codAllowed).toBe(false);
    });
  });

  describe('4. Order Payload Separation', () => {
    it('sets discountCode for coupon orders and leaves referralCode undefined', () => {
      const applied = { code: 'SAVE1000', type: 'coupon' };
      const payload: { discountCode?: string | undefined; referralCode?: string | undefined } = {
        discountCode: applied.type === 'coupon' ? applied.code : undefined,
        referralCode: applied.type === 'referral' ? applied.code : undefined,
      };

      expect(payload.discountCode).toBe('SAVE1000');
      expect(payload.referralCode).toBeUndefined();
    });

    it('sets referralCode for referral discounts and leaves discountCode undefined', () => {
      const applied = { code: 'MITRA1234', type: 'referral' };
      const payload: { discountCode?: string | undefined; referralCode?: string | undefined } = {
        discountCode: applied.type === 'coupon' ? applied.code : undefined,
        referralCode: applied.type === 'referral' ? applied.code : undefined,
      };

      expect(payload.discountCode).toBeUndefined();
      expect(payload.referralCode).toBe('MITRA1234');
    });
  });
});
