import {
  getMobileStatusLabel,
  formatIndianRupees,
  canCancelOrder,
  canReturnOrder,
  canDownloadInvoice,
  getRealTrackingSteps,
  getDeliveryEstimateText,
  getWarrantyDisplayText,
} from '../utils/account-helpers';

describe('Mobile Account Area Domain Logic & Eligibility Tests', () => {
  describe('Status Labels & Plain Language Formatting', () => {
    it('returns Confirmed without inspecting jargon', () => {
      const res = getMobileStatusLabel('CONFIRMED');
      expect(res.label).toBe('Confirmed');
      expect(res.icon).toBe('checkmark-circle-outline');
    });

    it('returns Order Placed for initial pending order', () => {
      const res = getMobileStatusLabel('PENDING', 'PENDING');
      expect(res.label).toBe('Order Placed');
      expect(res.icon).toBe('time-outline');
    });

    it('returns Confirmed when pending order is already paid online', () => {
      const res = getMobileStatusLabel('PENDING', 'COMPLETED');
      expect(res.label).toBe('Confirmed');
    });

    it('returns Return Requested when an active return exists', () => {
      const res = getMobileStatusLabel('DELIVERED', 'COMPLETED', 'REQUESTED');
      expect(res.label).toBe('Return Requested');
    });

    it('returns Refunded when return is completed', () => {
      const res = getMobileStatusLabel('DELIVERED', 'COMPLETED', 'REFUNDED');
      expect(res.label).toBe('Refunded');
    });
  });

  describe('Order Action Eligibility Rules', () => {
    it('permits cancellation only on PENDING or CONFIRMED', () => {
      expect(canCancelOrder('PENDING')).toBe(true);
      expect(canCancelOrder('CONFIRMED')).toBe(true);
      expect(canCancelOrder('SHIPPING')).toBe(false);
      expect(canCancelOrder('DELIVERED')).toBe(false);
      expect(canCancelOrder('CANCELLED')).toBe(false);
    });

    it('enforces 7-day return window from delivery date', () => {
      const now = new Date('2026-10-31T12:00:00Z');
      const deliveredWithinWindow = new Date('2026-10-26T12:00:00Z'); // 5 days ago
      const deliveredPastWindow = new Date('2026-10-20T12:00:00Z'); // 11 days ago

      expect(
        canReturnOrder({
          status: 'DELIVERED',
          deliveredAt: deliveredWithinWindow,
          returnWindowDays: 7,
          now,
        }).eligible,
      ).toBe(true);

      const pastResult = canReturnOrder({
        status: 'DELIVERED',
        deliveredAt: deliveredPastWindow,
        returnWindowDays: 7,
        now,
      });
      expect(pastResult.eligible).toBe(false);
      expect(pastResult.reason).toBe('Return window expired');
    });

    it('rejects returns on leased items and guides to support', () => {
      const result = canReturnOrder({
        status: 'DELIVERED',
        deliveredAt: new Date(),
        returnWindowDays: 7,
        isLease: true,
      });
      expect(result.eligible).toBe(false);
      expect(result.reason).toContain('support');
    });

    it('rejects returns when a return is already in progress', () => {
      const result = canReturnOrder({
        status: 'DELIVERED',
        deliveredAt: new Date(),
        returnWindowDays: 7,
        returnStatus: 'REQUESTED',
      });
      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('Return already in progress');
    });
  });

  describe('Invoice Download Eligibility (Decision D)', () => {
    it('blocks invoice downloads on lease orders and gives plain notice', () => {
      const res = canDownloadInvoice({
        status: 'DELIVERED',
        paymentStatus: 'COMPLETED',
        items: [{ purchaseMode: 'lease' }],
      });
      expect(res.canDownload).toBe(false);
      expect(res.note).toBe('Lease invoices are issued monthly by our billing team');
    });

    it('blocks invoice downloads on unpaid COD orders', () => {
      const res = canDownloadInvoice({
        status: 'SHIPPING',
        paymentStatus: 'PENDING',
        paymentMethod: 'cod',
        items: [{ purchaseMode: 'buy' }],
      });
      expect(res.canDownload).toBe(false);
      expect(res.note).toContain('cash collection');
    });

    it('permits invoice downloads on prepaid delivered orders', () => {
      const res = canDownloadInvoice({
        status: 'DELIVERED',
        paymentStatus: 'COMPLETED',
        paymentMethod: 'razorpay',
        items: [{ purchaseMode: 'buy' }],
      });
      expect(res.canDownload).toBe(true);
    });
  });

  describe('Real Progress Tracking (Correction 1)', () => {
    it('generates strictly data-backed 4-step delivery pipeline with zero synthetic steps', () => {
      const steps = getRealTrackingSteps({
        status: 'SHIPPING',
        createdAt: '2026-10-01T10:00:00Z',
        updatedAt: '2026-10-02T12:00:00Z',
      });

      expect(steps.map((s) => s.label)).toEqual(['Order Placed', 'Confirmed', 'Shipped', 'Delivered']);
      expect(steps[0]!.isCompleted).toBe(true);
      expect(steps[1]!.isCompleted).toBe(true);
      expect(steps[2]!.isCompleted).toBe(true);
      expect(steps[2]!.isCurrent).toBe(true);
      expect(steps[3]!.isCompleted).toBe(false);
    });

    it('includes return and refund steps when a return record exists', () => {
      const steps = getRealTrackingSteps({
        status: 'DELIVERED',
        returnStatus: 'REQUESTED',
        createdAt: '2026-10-01T10:00:00Z',
        updatedAt: '2026-10-05T12:00:00Z',
      });

      expect(steps.map((s) => s.label)).toEqual([
        'Order Placed',
        'Confirmed',
        'Shipped',
        'Delivered',
        'Return Requested',
        'Refund Processed',
      ]);
      expect(steps[4]!.isCompleted).toBe(true);
      expect(steps[5]!.isCompleted).toBe(false);
    });
  });

  describe('Delivery Estimate & Warranty Text (Decisions A & B)', () => {
    it('renders confirmed delivery estimate date or fallback text', () => {
      expect(getDeliveryEstimateText(null)).toBe("We'll confirm your delivery date soon");
      expect(getDeliveryEstimateText('2026-11-05T12:00:00Z')).toContain('Estimated delivery:');
    });

    it('renders data-driven warranty duration without hardcoded 1-Year', () => {
      expect(getWarrantyDisplayText(6, false)).toBe('6-Month Standard Warranty');
      expect(getWarrantyDisplayText(6, true)).toBe('12-Month Coverage (Standard + Add-on)');
    });
  });

  describe('Plain Language Currency & Pricing', () => {
    it('formats Indian rupees without dividing by 100', () => {
      expect(formatIndianRupees(34999)).toBe('₹34,999');
      expect(formatIndianRupees('125000')).toBe('₹1,25,000');
      expect(formatIndianRupees(null)).toBe('₹0');
    });
  });
});
