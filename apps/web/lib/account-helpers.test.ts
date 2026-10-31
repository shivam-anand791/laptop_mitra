import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getOrderStatusConfig,
  getPaymentTextDescription,
  formatIndianRupees,
  canCancelOrder,
  canReturnOrder,
  canDownloadInvoice,
  filterOrdersByStatus,
  filterOrdersByDate,
  filterOrdersBySearch,
  getOrderTimelineSteps,
  getReturnStatusConfig,
  getReturnTimelineSteps,
  getTicketStatusConfig,
  validatePincode,
  validateGSTIN,
  validatePhone,
  isSessionRevoked,
} from './account-helpers.ts';

describe('Account Domain Helpers & Status Mapping Matrix', () => {
  describe('OrderStatusChip Matrix', () => {
    it('maps CONFIRMED to plain Confirmed label', () => {
      const config = getOrderStatusConfig('CONFIRMED');
      assert.equal(config.label, 'Confirmed');
      assert.ok(config.colorClasses.includes('text-blue-700'));
      assert.equal(config.iconName, 'CheckCircle2');
    });

    it('maps PENDING to Order Placed when unpaid', () => {
      const config = getOrderStatusConfig('PENDING', 'PENDING');
      assert.equal(config.label, 'Order Placed');
      assert.equal(config.iconName, 'Clock');
    });

    it('maps PENDING to Confirmed when payment is already completed online', () => {
      const config = getOrderStatusConfig('PENDING', 'COMPLETED');
      assert.equal(config.label, 'Confirmed');
      assert.equal(config.iconName, 'CheckCircle2');
    });

    it('maps SHIPPING to Shipped with truck icon', () => {
      const config = getOrderStatusConfig('SHIPPING');
      assert.equal(config.label, 'Shipped');
      assert.equal(config.iconName, 'Truck');
    });

    it('maps DELIVERED to Delivered with success colors', () => {
      const config = getOrderStatusConfig('DELIVERED');
      assert.equal(config.label, 'Delivered');
      assert.ok(config.colorClasses.includes('text-emerald-800'));
      assert.equal(config.iconName, 'CheckCircle2');
    });

    it('maps CANCELLED to Cancelled with rose colors', () => {
      const config = getOrderStatusConfig('CANCELLED');
      assert.equal(config.label, 'Cancelled');
      assert.ok(config.colorClasses.includes('text-rose-800'));
      assert.equal(config.iconName, 'XCircle');
    });

    it('prioritizes active return status over base order status', () => {
      const config = getOrderStatusConfig('DELIVERED', 'COMPLETED', 'REQUESTED');
      assert.equal(config.label, 'Return Requested');
      assert.ok(config.colorClasses.includes('text-amber-800'));
      assert.equal(config.iconName, 'RotateCcw');
    });

    it('prioritizes refunded return status over base order status', () => {
      const config = getOrderStatusConfig('DELIVERED', 'COMPLETED', 'REFUNDED');
      assert.equal(config.label, 'Refunded');
      assert.ok(config.colorClasses.includes('text-emerald-800'));
      assert.equal(config.iconName, 'RotateCcw');
    });
  });

  describe('PaymentText Formatting & Logic', () => {
    it('formats Indian rupees with currency symbol and Indian grouping without dividing by 100', () => {
      assert.equal(formatIndianRupees(34999), '₹34,999');
      assert.equal(formatIndianRupees('125000'), '₹1,25,000');
    });

    it('formats COD pending payment as To pay on delivery', () => {
      const res = getPaymentTextDescription(34999, 'PENDING', 'cod', 'PENDING');
      assert.equal(res.prefix, 'To pay on delivery:');
      assert.equal(res.amountText, '₹34,999');
    });

    it('formats COD delivered payment as Paid on delivery', () => {
      const res = getPaymentTextDescription(34999, 'COMPLETED', 'cod', 'DELIVERED');
      assert.equal(res.prefix, 'Paid on delivery:');
      assert.equal(res.amountText, '₹34,999');
    });

    it('formats prepaid completed payment as Paid online', () => {
      const res = getPaymentTextDescription(34999, 'COMPLETED', 'razorpay', 'SHIPPING');
      assert.equal(res.prefix, 'Paid online:');
      assert.equal(res.amountText, '₹34,999');
    });

    it('formats active return as Refund in progress', () => {
      const res = getPaymentTextDescription(34999, 'COMPLETED', 'razorpay', 'DELIVERED', 'REQUESTED');
      assert.equal(res.prefix, 'Refund in progress:');
      assert.equal(res.amountText, '₹34,999');
    });

    it('formats completed refund as Refunded to source / bank', () => {
      const res = getPaymentTextDescription(34999, 'COMPLETED', 'razorpay', 'DELIVERED', 'REFUNDED');
      assert.equal(res.prefix, 'Refunded to source / bank:');
      assert.equal(res.amountText, '₹34,999');
    });
  });

  describe('Action Eligibility Matrix', () => {
    it('allows cancel only for PENDING and CONFIRMED', () => {
      assert.equal(canCancelOrder('PENDING'), true);
      assert.equal(canCancelOrder('CONFIRMED'), true);
      assert.equal(canCancelOrder('SHIPPING'), false);
      assert.equal(canCancelOrder('DELIVERED'), false);
      assert.equal(canCancelOrder('CANCELLED'), false);
    });

    it('enforces 7-day return window from delivery date', () => {
      const now = new Date('2026-10-31T12:00:00Z');
      const deliveredWithinWindow = new Date('2026-10-26T12:00:00Z'); // 5 days ago
      const deliveredPastWindow = new Date('2026-10-20T12:00:00Z'); // 11 days ago

      assert.equal(
        canReturnOrder('DELIVERED', deliveredWithinWindow, 7, 'NONE', false, now).eligible,
        true,
      );

      const pastResult = canReturnOrder('DELIVERED', deliveredPastWindow, 7, 'NONE', false, now);
      assert.equal(pastResult.eligible, false);
      assert.ok(pastResult.reason?.includes('expired'));
    });

    it('disallows return on lease items', () => {
      const res = canReturnOrder('DELIVERED', new Date(), 7, 'NONE', true);
      assert.equal(res.eligible, false);
      assert.ok(res.reason?.includes('Leased'));
    });

    it('controls invoice download availability', () => {
      assert.equal(canDownloadInvoice('COMPLETED', 'CONFIRMED', false), true);
      assert.equal(canDownloadInvoice('PENDING', 'DELIVERED', false), true);
      assert.equal(canDownloadInvoice('PENDING', 'PENDING', false), false);
      assert.equal(canDownloadInvoice('COMPLETED', 'DELIVERED', true), false);
    });
  });

  describe('Order Filtering Matrix', () => {
    const sampleOrders = [
      { id: '1', orderNumber: 'LM-ORD-101', status: 'PENDING', returnStatus: 'NONE', createdAt: '2026-10-25T10:00:00Z', items: [{ product: { name: 'ThinkPad T480' } }] },
      { id: '2', orderNumber: 'LM-ORD-102', status: 'SHIPPING', returnStatus: 'NONE', createdAt: '2026-10-15T10:00:00Z', items: [{ product: { name: 'MacBook Pro M1' } }] },
      { id: '3', orderNumber: 'LM-ORD-103', status: 'DELIVERED', returnStatus: 'REQUESTED', createdAt: '2026-09-01T10:00:00Z', items: [{ product: { name: 'Dell Latitude 7490' } }] },
      { id: '4', orderNumber: 'LM-ORD-104', status: 'DELIVERED', returnStatus: 'NONE', createdAt: '2025-11-20T10:00:00Z', items: [{ product: { name: 'HP EliteBook 840' } }] },
      { id: '5', orderNumber: 'LM-ORD-105', status: 'CANCELLED', returnStatus: 'NONE', createdAt: '2025-05-10T10:00:00Z', items: [{ product: { name: 'ThinkPad X1 Carbon' } }] },
    ];

    it('filters orders by IN_PROGRESS grouping', () => {
      const filtered = filterOrdersByStatus(sampleOrders, 'IN_PROGRESS');
      assert.equal(filtered.length, 2);
      assert.deepEqual(filtered.map((o) => o.id), ['1', '2']);
    });

    it('filters orders by RETURNS grouping', () => {
      const filtered = filterOrdersByStatus(sampleOrders, 'RETURNS');
      assert.equal(filtered.length, 1);
      assert.equal(filtered[0].id, '3');
    });

    it('filters orders by DELIVERED and CANCELLED', () => {
      assert.equal(filterOrdersByStatus(sampleOrders, 'DELIVERED').length, 2);
      assert.equal(filterOrdersByStatus(sampleOrders, 'CANCELLED').length, 1);
    });

    it('filters orders by date range', () => {
      const refTime = new Date('2026-11-01T00:00:00Z').getTime();
      const last30 = filterOrdersByDate(sampleOrders, '30_DAYS', refTime);
      assert.equal(last30.length, 2); // 10-25 and 10-15

      const year2025 = filterOrdersByDate(sampleOrders, '2025', refTime);
      assert.equal(year2025.length, 2); // 104 and 105
    });

    it('filters orders by search query across order numbers and laptop names', () => {
      assert.equal(filterOrdersBySearch(sampleOrders, '102').length, 1);
      assert.equal(filterOrdersBySearch(sampleOrders, 'thinkpad').length, 2);
      assert.equal(filterOrdersBySearch(sampleOrders, 'macbook').length, 1);
      assert.equal(filterOrdersBySearch(sampleOrders, 'nonexistent').length, 0);
    });
  });

  describe('Order Timeline Stepper Matrix', () => {
    it('returns only 4 real steps for a standard delivered order without synthetic steps', () => {
      const steps = getOrderTimelineSteps({
        status: 'DELIVERED',
        paymentStatus: 'COMPLETED',
        createdAt: '2026-10-01T10:00:00Z',
        updatedAt: '2026-10-05T14:00:00Z',
        carrier: 'BlueDart Express',
        trackingNumber: 'BD-123456',
      });

      assert.equal(steps.length, 4);
      assert.deepEqual(steps.map((s) => s.label), ['Order Placed', 'Confirmed', 'Shipped', 'Delivered']);
      assert.ok(steps.every((s) => s.isCompleted));
      assert.ok(steps[2].description?.includes('BD-123456'));
    });

    it('returns Placed and Cancelled steps for a cancelled order', () => {
      const steps = getOrderTimelineSteps({
        status: 'CANCELLED',
        paymentStatus: 'COMPLETED',
        createdAt: '2026-10-01T10:00:00Z',
        updatedAt: '2026-10-02T11:00:00Z',
      });

      assert.equal(steps.length, 2);
      assert.equal(steps[0].label, 'Order Placed');
      assert.equal(steps[1].label, 'Order Cancelled');
      assert.equal(steps[1].isCancelled, true);
      assert.ok(steps[1].description?.includes('Refund initiated'));
    });

    it('appends Return Requested and Refund steps when a return record exists', () => {
      const steps = getOrderTimelineSteps({
        status: 'DELIVERED',
        paymentStatus: 'COMPLETED',
        returnStatus: 'REQUESTED',
        createdAt: '2026-10-01T10:00:00Z',
        updatedAt: '2026-10-06T12:00:00Z',
      });

      assert.equal(steps.length, 6);
      assert.equal(steps[4].label, 'Return Requested');
      assert.equal(steps[4].isCompleted, true);
      assert.equal(steps[5].label, 'Refund Processed');
      assert.equal(steps[5].isCompleted, false);
    });
  });

  describe('Return Status & Timeline Stepper Matrix', () => {
    it('maps all return statuses to plain-language labels and correct badge colors', () => {
      assert.equal(getReturnStatusConfig('REQUESTED').label, 'Return Requested');
      assert.equal(getReturnStatusConfig('PICKUP_SCHEDULED').label, 'Pickup Scheduled');
      assert.equal(getReturnStatusConfig('INSPECTING').label, 'Inspecting at Lab');
      assert.equal(getReturnStatusConfig('INSPECTION_PASSED').label, 'Inspection Passed');
      assert.equal(getReturnStatusConfig('REFUND_PENDING').label, 'Refund Processing');
      assert.equal(getReturnStatusConfig('REFUNDED').label, 'Refund Completed');
      assert.equal(getReturnStatusConfig('REPLACED').label, 'Replacement Dispatched');
      assert.equal(getReturnStatusConfig('REJECTED').label, 'Return Rejected');
    });

    it('generates real 4-step timeline for active return request without synthetic filler', () => {
      const steps = getReturnTimelineSteps({
        status: 'INSPECTING',
        createdAt: '2026-10-20T10:00:00Z',
        pickupScheduledAt: '2026-10-21T10:00:00Z',
        pickedUpAt: '2026-10-21T16:00:00Z',
        updatedAt: '2026-10-22T11:00:00Z',
      });

      assert.equal(steps.length, 4);
      assert.deepEqual(steps.map((s) => s.label), ['Request Submitted', 'Doorstep Pickup', 'Hub Inspection', 'Refund Processed']);
      assert.equal(steps[0].isCompleted, true);
      assert.equal(steps[1].isCompleted, true);
      assert.equal(steps[2].isCurrent, true);
      assert.equal(steps[3].isCompleted, false);
    });

    it('generates 2-step timeline for rejected returns', () => {
      const steps = getReturnTimelineSteps({
        status: 'REJECTED',
        createdAt: '2026-10-20T10:00:00Z',
        updatedAt: '2026-10-21T10:00:00Z',
      });

      assert.equal(steps.length, 2);
      assert.equal(steps[1].label, 'Return Rejected');
      assert.equal(steps[1].isCancelled, true);
    });
  });

  describe('Ticket Status Mapping Matrix', () => {
    it('maps all support ticket statuses to plain-language labels and correct badge colors', () => {
      assert.equal(getTicketStatusConfig('NEW').label, 'Submitted');
      assert.equal(getTicketStatusConfig('OPEN').label, 'Open');
      assert.equal(getTicketStatusConfig('WAITING_ON_CUSTOMER').label, 'Awaiting Your Reply');
      assert.equal(getTicketStatusConfig('IN_PROGRESS').label, 'Under Investigation');
      assert.equal(getTicketStatusConfig('RESOLVED').label, 'Resolved');
      assert.equal(getTicketStatusConfig('CLOSED').label, 'Closed');
      assert.equal(getTicketStatusConfig('REOPENED').label, 'Reopened');
    });
  });

  describe('Address & Account Validation Matrix', () => {
    it('validates 6-digit Indian PIN codes correctly', () => {
      assert.equal(validatePincode('560103'), true);
      assert.equal(validatePincode('110001'), true);
      assert.equal(validatePincode('56010'), false);
      assert.equal(validatePincode('5601039'), false);
      assert.equal(validatePincode('abc123'), false);
      assert.equal(validatePincode(''), false);
      assert.equal(validatePincode(null), false);
    });

    it('validates 15-character Indian GSTIN formats correctly', () => {
      assert.equal(validateGSTIN('29ABCDE1234F1Z5'), true);
      assert.equal(validateGSTIN('07AAAAA0000A1Z5'), true);
      assert.equal(validateGSTIN('29ABCDE1234F1Z'), false); // 14 chars
      assert.equal(validateGSTIN('INVALID_GSTIN'), false);
      assert.equal(validateGSTIN(''), false);
      assert.equal(validateGSTIN(null), false);
    });

    it('validates standard phone numbers', () => {
      assert.equal(validatePhone('+91 9876543210'), true);
      assert.equal(validatePhone('9876543210'), true);
      assert.equal(validatePhone('123'), false);
      assert.equal(validatePhone(''), false);
      assert.equal(validatePhone(null), false);
    });

    it('evaluates session revocation using token auth_time and User.sessionsRevokedAt', () => {
      const revokedAt = '2026-10-25T12:00:00Z'; // epoch: 1792929600
      const revokedSec = Math.floor(new Date(revokedAt).getTime() / 1000);

      // Token issued before revocation -> revoked
      assert.equal(isSessionRevoked(revokedSec - 100, revokedAt), true);

      // Token issued after revocation -> still valid
      assert.equal(isSessionRevoked(revokedSec + 100, revokedAt), false);

      // No sessionsRevokedAt set -> valid
      assert.equal(isSessionRevoked(revokedSec - 100, null), false);
      assert.equal(isSessionRevoked(revokedSec - 100, undefined), false);
    });
  });
});





