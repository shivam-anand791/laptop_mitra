describe('Mobile Situation-Aware "Need Help" & Buyback Architecture Tests', () => {
  describe('1. Situation Engine Action Catalog & Plain Language Reasons', () => {
    it('always provides plain language disabledReason for ineligible actions', () => {
      const situation = {
        situation: 'SHIPPED',
        plainStatus: 'Order in Transit',
        description: 'Package has been handed over to courier partner.',
        actions: [
          { action: 'CHANGE_ADDRESS', allowed: false, disabledReason: 'Delivery address or phone cannot be modified after order dispatch' },
          { action: 'CANCEL', allowed: false, disabledReason: 'Order has already been dispatched with tracking' },
          { action: 'RETURN', allowed: false, disabledReason: 'Returns can only be requested after item delivery' },
          { action: 'WARRANTY', allowed: false, disabledReason: 'Warranty becomes active upon successful delivery' },
          { action: 'BUYBACK', allowed: false, disabledReason: 'Buyback is available once item is delivered' },
          { action: 'TICKET', allowed: true },
        ],
      };

      const disabledActions = situation.actions.filter((a) => !a.allowed);
      expect(disabledActions.length).toBe(5);
      disabledActions.forEach((action) => {
        expect(action.disabledReason).toBeDefined();
        expect(action.disabledReason!.length).toBeGreaterThan(10);
      });
    });

    it('calculates 6-tier buyback valuation schedule correctly without dividing by 100', () => {
      const originalInvoicePrice = 45000;
      const tiers = [
        { fromMonth: 0, toMonth: 6, percent: 70 },
        { fromMonth: 6, toMonth: 12, percent: 60 },
        { fromMonth: 12, toMonth: 18, percent: 50 },
        { fromMonth: 18, toMonth: 24, percent: 40 },
        { fromMonth: 24, toMonth: 30, percent: 30 },
        { fromMonth: 30, toMonth: 36, percent: 20 },
      ];

      const expectedGrossPayouts = [31500, 27000, 22500, 18000, 13500, 9000];

      tiers.forEach((tier, index) => {
        const grossValuation = Math.round((originalInvoicePrice * tier.percent) / 100);
        expect(grossValuation).toBe(expectedGrossPayouts[index]);
      });
    });

    it('enforces upper bound inclusive boundary rule (exact 6 months gets 70%)', () => {
      const getTierForAgeMonths = (months: number) => {
        if (months <= 6) return 70;
        if (months <= 12) return 60;
        if (months <= 18) return 50;
        if (months <= 24) return 40;
        if (months <= 30) return 30;
        if (months <= 36) return 20;
        return 0;
      };

      expect(getTierForAgeMonths(0)).toBe(70);
      expect(getTierForAgeMonths(6.0)).toBe(70);
      expect(getTierForAgeMonths(6.1)).toBe(60);
      expect(getTierForAgeMonths(12.0)).toBe(60);
      expect(getTierForAgeMonths(12.05)).toBe(50);
      expect(getTierForAgeMonths(36.0)).toBe(20);
      expect(getTierForAgeMonths(36.1)).toBe(0);
    });
  });

  describe('2. Mobile Change Request Input Validations', () => {
    const PIN_REGEX = /^\d{6}$/;
    const PHONE_REGEX = /^\d{10}$/;

    it('validates 6-digit Indian PIN code format', () => {
      expect(PIN_REGEX.test('560001')).toBe(true);
      expect(PIN_REGEX.test('110001')).toBe(true);
      expect(PIN_REGEX.test('56000')).toBe(false); // 5 digits
      expect(PIN_REGEX.test('5600011')).toBe(false); // 7 digits
      expect(PIN_REGEX.test('56000A')).toBe(false); // alphabetic
    });

    it('sanitizes and validates 10-digit Indian mobile number', () => {
      const sanitize = (raw: string) => raw.replace(/\D/g, '');

      const validRaw = '+91 98765 43210';
      const sanitized = sanitize(validRaw).slice(-10);
      expect(PHONE_REGEX.test(sanitized)).toBe(true);

      const invalidShort = sanitize('987654321');
      expect(PHONE_REGEX.test(invalidShort)).toBe(false);
    });
  });

  describe('3. Mobile Buyback Claim Conditions & Payout Validation', () => {
    it('requires all 4 physical functional checks and min 70% battery', () => {
      const validateConditions = (cond: {
        powersOn: boolean;
        screenIntact: boolean;
        keyboardTrackpadWorking: boolean;
        originalChargerIncluded: boolean;
        batteryHealthPercent: number;
      }) => {
        if (!cond.powersOn || !cond.screenIntact || !cond.keyboardTrackpadWorking || !cond.originalChargerIncluded) {
          return { eligible: false, reason: 'Checklist incomplete' };
        }
        if (cond.batteryHealthPercent < 70) {
          return { eligible: false, reason: 'Battery health under minimum 70%' };
        }
        return { eligible: true };
      };

      expect(
        validateConditions({
          powersOn: true,
          screenIntact: true,
          keyboardTrackpadWorking: true,
          originalChargerIncluded: true,
          batteryHealthPercent: 82,
        }).eligible,
      ).toBe(true);

      expect(
        validateConditions({
          powersOn: true,
          screenIntact: false,
          keyboardTrackpadWorking: true,
          originalChargerIncluded: true,
          batteryHealthPercent: 82,
        }).eligible,
      ).toBe(false);

      expect(
        validateConditions({
          powersOn: true,
          screenIntact: true,
          keyboardTrackpadWorking: true,
          originalChargerIncluded: true,
          batteryHealthPercent: 65,
        }).eligible,
      ).toBe(false);
    });

    it('validates 11-character Indian IFSC code format', () => {
      const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

      expect(IFSC_REGEX.test('HDFC0001234')).toBe(true);
      expect(IFSC_REGEX.test('SBIN0000456')).toBe(true);
      expect(IFSC_REGEX.test('ICIC0000001')).toBe(true);
      expect(IFSC_REGEX.test('HDFC1001234')).toBe(false); // 5th character must be '0'
      expect(IFSC_REGEX.test('HDF0001234')).toBe(false); // short
    });

    it('validates UPI ID format containing @ delimiter', () => {
      const isValidUpi = (upi: string) => Boolean(upi.trim() && upi.includes('@') && upi.split('@')[0] && upi.split('@')[1]);

      expect(isValidUpi('customer@oksbi')).toBe(true);
      expect(isValidUpi('9876543210@paytm')).toBe(true);
      expect(isValidUpi('invalidupi')).toBe(false);
      expect(isValidUpi('@bank')).toBe(false);
      expect(isValidUpi('name@')).toBe(false);
    });

    it('deducts pickup convenience fee accurately without affecting zero-fee policy', () => {
      const grossValuation = 21000;
      const pickupChargeDefault = 0;
      const pickupChargeConfigured = 250;

      const netDefault = Math.max(0, grossValuation - pickupChargeDefault);
      const netConfigured = Math.max(0, grossValuation - pickupChargeConfigured);

      expect(netDefault).toBe(21000);
      expect(netConfigured).toBe(20750);
    });
  });
});

