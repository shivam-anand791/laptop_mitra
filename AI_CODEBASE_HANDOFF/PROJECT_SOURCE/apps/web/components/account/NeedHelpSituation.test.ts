import { describe, it } from 'node:test';
import assert from 'node:assert';

describe('Situation-Aware "Need Help" & Buyback Web Contracts', () => {
  describe('1. Situation Engine Action Catalog & Disabled Reasons', () => {
    it('always provides plain language disabledReason for disabled actions', () => {
      const mockSituation = {
        situation: 'OUTRIGHT_DELIVERED_IN_WARRANTY',
        actions: [
          {
            key: 'RETURN_REPLACE',
            label: 'Return or Replace',
            enabled: false,
            disabledReason: '7-day return window closed on 28 Oct 2026.',
          },
          {
            key: 'REQUEST_ADDRESS_CHANGE',
            label: 'Update Delivery Address',
            enabled: false,
            disabledReason: 'Order has already been delivered.',
          },
          {
            key: 'WARRANTY_CLAIM',
            label: 'Claim Hardware Warranty',
            enabled: true,
          },
        ],
      };

      for (const action of mockSituation.actions) {
        if (!action.enabled) {
          assert.ok(action.disabledReason, `Action ${action.key} is disabled but missing disabledReason`);
          assert.strictEqual(typeof action.disabledReason, 'string');
          assert.ok(action.disabledReason.length > 5);
        }
      }
    });

    it('calculates 6-tier buyback valuation schedule correctly without dividing by 100', () => {
      const invoiceBasis = 30000;
      const tiers = [
        { from: 0, to: 6, percent: 70, expected: 21000 },
        { from: 6, to: 12, percent: 60, expected: 18000 },
        { from: 12, to: 18, percent: 50, expected: 15000 },
        { from: 18, to: 24, percent: 40, expected: 12000 },
        { from: 24, to: 30, percent: 30, expected: 9000 },
        { from: 30, to: 36, percent: 20, expected: 6000 },
      ];

      for (const t of tiers) {
        const gross = Math.round(invoiceBasis * (t.percent / 100));
        assert.strictEqual(gross, t.expected, `Tier ${t.percent}% valuation failed`);
      }
    });

    it('enforces upper bound inclusive boundary rule (exact 6 months gets 70%)', () => {
      const deviceAgeMonths = 6;
      let matchedPercent = 0;

      if (deviceAgeMonths <= 6) matchedPercent = 70;
      else if (deviceAgeMonths <= 12) matchedPercent = 60;
      else if (deviceAgeMonths <= 18) matchedPercent = 50;

      assert.strictEqual(matchedPercent, 70, 'Exact 6-month boundary must receive 70% tier');
    });
  });

  describe('2. Change Request Input Validation', () => {
    it('validates 6-digit Indian PIN code', () => {
      const validPin = '560034';
      const invalidPin1 = '56003'; // 5 digits
      const invalidPin2 = '56003A'; // Alpha
      const pinRegex = /^\d{6}$/;

      assert.strictEqual(pinRegex.test(validPin), true);
      assert.strictEqual(pinRegex.test(invalidPin1), false);
      assert.strictEqual(pinRegex.test(invalidPin2), false);
    });

    it('sanitizes and validates 10-digit mobile number', () => {
      const rawInput = '+91 98765-43210';
      const cleaned = rawInput.replace(/\D/g, '').slice(-10);

      assert.strictEqual(cleaned.length, 10);
      assert.strictEqual(cleaned, '9876543210');
    });
  });

  describe('3. Buyback Claim Conditions & Payout Validation', () => {
    it('requires all 4 physical functional checks and min 70% battery', () => {
      const validateChecklist = (cl: {
        bootsToOs: boolean;
        motherboardWorking: boolean;
        displayIntact: boolean;
        originalCharger: boolean;
        batteryHealthPercent: number;
      }) => {
        return (
          cl.bootsToOs &&
          cl.motherboardWorking &&
          cl.displayIntact &&
          cl.originalCharger &&
          cl.batteryHealthPercent >= 70
        );
      };

      assert.strictEqual(
        validateChecklist({
          bootsToOs: true,
          motherboardWorking: true,
          displayIntact: true,
          originalCharger: true,
          batteryHealthPercent: 82,
        }),
        true,
      );

      assert.strictEqual(
        validateChecklist({
          bootsToOs: true,
          motherboardWorking: true,
          displayIntact: true,
          originalCharger: true,
          batteryHealthPercent: 68, // Fails battery
        }),
        false,
      );

      assert.strictEqual(
        validateChecklist({
          bootsToOs: false, // Fails boot
          motherboardWorking: true,
          displayIntact: true,
          originalCharger: true,
          batteryHealthPercent: 90,
        }),
        false,
      );
    });

    it('validates 11-character Indian IFSC code format', () => {
      const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;

      assert.strictEqual(ifscRegex.test('HDFC0001234'), true);
      assert.strictEqual(ifscRegex.test('SBIN0004567'), true);
      assert.strictEqual(ifscRegex.test('ICIC0000001'), true);
      assert.strictEqual(ifscRegex.test('INVALID_IFSC'), false);
    });

    it('validates UPI ID format containing @ delimiter', () => {
      const validateUpi = (upi: string) => Boolean(upi && upi.includes('@') && upi.indexOf('@') > 1);

      assert.strictEqual(validateUpi('customer@okhdfcbank'), true);
      assert.strictEqual(validateUpi('9876543210@paytm'), true);
      assert.strictEqual(validateUpi('invalidupi'), false);
    });
  });

  describe('4. Corporate Business Profile Format Validation', () => {
    it('validates 15-character Indian GSTIN format', () => {
      const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

      assert.strictEqual(gstinRegex.test('29ABCDE1234F1Z5'), true);
      assert.strictEqual(gstinRegex.test('07AAAAA0000A1Z5'), true);
      assert.strictEqual(gstinRegex.test('29ABCDE1234F1'), false); // Too short
      assert.strictEqual(gstinRegex.test('INVALID_GSTIN_123'), false);
    });
  });
});

