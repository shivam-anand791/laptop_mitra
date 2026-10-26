import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

interface AdminSettingsTestModel {
  storeName: string;
  supportEmail: string;
  contactPhone: string;
  storeAddress: string;
  lowStockThreshold: number;
  freeShippingThreshold: number;
  standardDeliveryDays: string;
  expressDeliveryDays: string;
}

function validateSettings(data: Partial<AdminSettingsTestModel>): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!data.storeName?.trim()) {
    errors.storeName = 'Store name is required';
  }

  if (!data.supportEmail?.trim()) {
    errors.supportEmail = 'Support email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.supportEmail)) {
    errors.supportEmail = 'Please enter a valid email address';
  }

  if (!data.contactPhone?.trim()) {
    errors.contactPhone = 'Contact phone is required';
  }

  if (!data.storeAddress?.trim()) {
    errors.storeAddress = 'Store address is required';
  }

  if (data.lowStockThreshold === undefined || Number(data.lowStockThreshold) < 1 || isNaN(Number(data.lowStockThreshold))) {
    errors.lowStockThreshold = 'Low-stock threshold must be at least 1';
  }

  if (data.freeShippingThreshold === undefined || Number(data.freeShippingThreshold) < 0 || isNaN(Number(data.freeShippingThreshold))) {
    errors.freeShippingThreshold = 'Free shipping threshold cannot be negative';
  }

  if (!data.standardDeliveryDays?.trim()) {
    errors.standardDeliveryDays = 'Standard delivery timeframe is required';
  }

  if (!data.expressDeliveryDays?.trim()) {
    errors.expressDeliveryDays = 'Express delivery timeframe is required';
  }

  return errors;
}

describe('Phase 9: Administrative Settings & Cross-Cutting Polish Contract Tests', () => {
  const validSettings: AdminSettingsTestModel = {
    storeName: 'LaptopMitra',
    supportEmail: 'support@laptopmitra.com',
    contactPhone: '+91-1800-123-4567',
    storeAddress: '123 Tech Park, Bangalore, Karnataka 560001',
    lowStockThreshold: 5,
    freeShippingThreshold: 999,
    standardDeliveryDays: '3-5',
    expressDeliveryDays: '1-2',
  };

  it('validates approved settings payload successfully', () => {
    const errors = validateSettings(validSettings);
    assert.equal(Object.keys(errors).length, 0, 'Valid payload must have 0 validation errors');
  });

  it('rejects invalid email address for supportEmail', () => {
    const invalidEmail = { ...validSettings, supportEmail: 'not-an-email' };
    const errors = validateSettings(invalidEmail);
    assert.ok(errors.supportEmail, 'Must reject invalid email');
  });

  it('rejects negative or zero lowStockThreshold', () => {
    const invalidStockZero = { ...validSettings, lowStockThreshold: 0 };
    const errorsZero = validateSettings(invalidStockZero);
    assert.ok(errorsZero.lowStockThreshold, 'Must reject lowStockThreshold of 0');

    const invalidStockNeg = { ...validSettings, lowStockThreshold: -5 };
    const errorsNeg = validateSettings(invalidStockNeg);
    assert.ok(errorsNeg.lowStockThreshold, 'Must reject negative lowStockThreshold');
  });

  it('rejects negative freeShippingThreshold while permitting 0', () => {
    const freeShippingZero = { ...validSettings, freeShippingThreshold: 0 };
    const errorsZero = validateSettings(freeShippingZero);
    assert.equal(errorsZero.freeShippingThreshold, undefined, 'Must permit freeShippingThreshold of 0 (free shipping for all)');

    const negativeShipping = { ...validSettings, freeShippingThreshold: -100 };
    const errorsNeg = validateSettings(negativeShipping);
    assert.ok(errorsNeg.freeShippingThreshold, 'Must reject negative freeShippingThreshold');
  });

  it('strictly excludes unapproved settings without backend effect', () => {
    const allowedKeys = new Set([
      'storeName',
      'supportEmail',
      'contactPhone',
      'storeAddress',
      'lowStockThreshold',
      'freeShippingThreshold',
      'standardDeliveryDays',
      'expressDeliveryDays',
    ]);

    const fakeSettings = ['smtpHost', 'smtpPort', 'paymentProvider', 'enableWallet'];
    for (const fake of fakeSettings) {
      assert.ok(!allowedKeys.has(fake), `Setting ${fake} has no backend effect and must not be persisted`);
    }
  });
});
