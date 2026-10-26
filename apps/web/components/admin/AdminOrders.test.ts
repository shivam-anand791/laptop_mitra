import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ORDER_TRANSITION_MAP,
  ORDER_STATUSES,
} from '../../../../packages/types/src/index.ts';
import type { OrderStatus } from '../../../../packages/types/src/index.ts';
import { formatINR, toNumber } from '../../lib/format.ts';

// Shipping address parser under test
function parseShippingAddress(address: unknown): {
  fullName?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  landmark?: string;
} {
  if (!address) return {};
  if (typeof address === 'string') {
    try {
      return JSON.parse(address);
    } catch {
      return { address };
    }
  }
  if (typeof address === 'object') {
    return address as { fullName?: string; phone?: string; address?: string; city?: string; state?: string; pincode?: string; landmark?: string };
  }
  return {};
}

describe('Phase 6: Admin Orders List & Detail Contract Tests', () => {
  it('strictly adheres to the authoritative ORDER_TRANSITION_MAP state machine', () => {
    // 1. PENDING can advance to CONFIRMED or CANCELLED
    assert.deepEqual(ORDER_TRANSITION_MAP.PENDING, ['CONFIRMED', 'CANCELLED']);

    // 2. CONFIRMED can advance to SHIPPING or CANCELLED
    assert.deepEqual(ORDER_TRANSITION_MAP.CONFIRMED, ['SHIPPING', 'CANCELLED']);

    // 3. SHIPPING can advance only to DELIVERED
    assert.deepEqual(ORDER_TRANSITION_MAP.SHIPPING, ['DELIVERED']);

    // 4. DELIVERED can advance only to REFUNDED
    assert.deepEqual(ORDER_TRANSITION_MAP.DELIVERED, ['REFUNDED']);

    // 5. CANCELLED and REFUNDED are terminal statuses
    assert.deepEqual(ORDER_TRANSITION_MAP.CANCELLED, []);
    assert.deepEqual(ORDER_TRANSITION_MAP.REFUNDED, []);

    // 6. Every status in ORDER_STATUSES is present in ORDER_TRANSITION_MAP
    for (const status of ORDER_STATUSES) {
      assert.ok(status in ORDER_TRANSITION_MAP, `Missing status ${status} in transition map`);
    }
  });

  it('correctly identifies destructive state transitions requiring confirmation modals', () => {
    const isDestructiveTransition = (status: OrderStatus): boolean => {
      return status === 'CANCELLED' || status === 'REFUNDED';
    };

    assert.equal(isDestructiveTransition('CANCELLED'), true);
    assert.equal(isDestructiveTransition('REFUNDED'), true);
    assert.equal(isDestructiveTransition('CONFIRMED'), false);
    assert.equal(isDestructiveTransition('SHIPPING'), false);
    assert.equal(isDestructiveTransition('DELIVERED'), false);
  });

  it('formats currency correctly without dividing rupees by 100', () => {
    // Hard rule: subtotal, discountAmount, and finalAmount are in RUPEES, NOT paise.
    assert.equal(formatINR(59999).replace(/\s/g, ' '), '₹59,999');
    assert.equal(formatINR('1200.50').replace(/\s/g, ' '), '₹1,201'); // rounded to 0 fraction digits in INR display
    assert.equal(formatINR(0).replace(/\s/g, ' '), '₹0');
    assert.equal(toNumber('49999.00'), 49999);
  });

  it('safely parses diverse shipping address shapes (string, object, null)', () => {
    // 1. JSON stringified object
    const stringified = JSON.stringify({
      fullName: 'Vikram Sharma',
      address: '123 MG Road, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560038',
      phone: '9876543210',
    });
    const parsedFromString = parseShippingAddress(stringified);
    assert.equal(parsedFromString.fullName, 'Vikram Sharma');
    assert.equal(parsedFromString.city, 'Bengaluru');
    assert.equal(parsedFromString.pincode, '560038');

    // 2. Structured address object
    const structured = {
      fullName: 'Priya Patel',
      address: 'Plot 45, SG Highway',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pincode: '380015',
    };
    const parsedFromObject = parseShippingAddress(structured);
    assert.equal(parsedFromObject.fullName, 'Priya Patel');
    assert.equal(parsedFromObject.state, 'Gujarat');

    // 3. Fallback for null or undefined
    assert.deepEqual(parseShippingAddress(null), {});
    assert.deepEqual(parseShippingAddress(undefined), {});

    // 4. Raw non-JSON text string
    const rawText = 'Flat 201, Green Heights, Pune';
    assert.equal(parseShippingAddress(rawText).address, rawText);
  });

  it('calculates correct pagination bounds and page counts', () => {
    const calculatePagination = (total: number, pageSize: number, currentPage: number) => {
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const safePage = Math.max(1, Math.min(currentPage, totalPages));
      const startIndex = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
      const endIndex = Math.min(safePage * pageSize, total);
      return { totalPages, safePage, startIndex, endIndex };
    };

    // Case 1: 45 orders with page size 20 on page 1
    const p1 = calculatePagination(45, 20, 1);
    assert.equal(p1.totalPages, 3);
    assert.equal(p1.startIndex, 1);
    assert.equal(p1.endIndex, 20);

    // Case 2: 45 orders with page size 20 on page 3 (last page)
    const p3 = calculatePagination(45, 20, 3);
    assert.equal(p3.startIndex, 41);
    assert.equal(p3.endIndex, 45);

    // Case 3: 0 orders
    const p0 = calculatePagination(0, 20, 1);
    assert.equal(p0.totalPages, 1);
    assert.equal(p0.startIndex, 0);
    assert.equal(p0.endIndex, 0);
  });

  it('serializes and filters URL query parameters correctly', () => {
    const serializeFilters = (filters: Record<string, string | null | undefined>) => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all' && value.trim() !== '') {
          params.set(key, value);
        }
      });
      return params.toString();
    };

    // When status is 'all' and payment is 'COMPLETED'
    const qs1 = serializeFilters({
      status: 'all',
      paymentStatus: 'COMPLETED',
      search: '10001',
      page: '1',
    });
    assert.equal(qs1, 'paymentStatus=COMPLETED&search=10001&page=1');

    // When search is whitespace and status is PENDING
    const qs2 = serializeFilters({
      status: 'PENDING',
      paymentStatus: 'all',
      search: '   ',
      from: '2026-10-01',
      to: '2026-10-23',
    });
    assert.equal(qs2, 'status=PENDING&from=2026-10-01&to=2026-10-23');
  });
});
