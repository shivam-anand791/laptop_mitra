import {
  filterOrdersByStatus,
  filterOrdersBySearch,
  validatePincode,
  canCancelOrder,
  canDownloadInvoice,
  getMobileStatusLabel,
} from '../utils/account-helpers';
import { Order } from '@laptopmitra/types';

describe('Order History Filters & Native Polish', () => {
  const mockOrders = [
    {
      id: 'ord-1',
      orderNumber: 'LM-2026-001',
      userId: 'u1',
      email: 'user@example.com',
      subtotal: 32000,
      discountAmount: 0,
      status: 'PENDING',
      paymentStatus: 'PENDING',
      paymentMethod: 'cod',
      finalAmount: 32000,
      createdAt: '2026-11-10T10:00:00Z',
      items: [
        {
          id: 'item-1',
          orderId: 'ord-1',
          productId: 'prod-1',
          quantity: 1,
          price: 32000,
          product: { name: 'Lenovo ThinkPad T480s i7' } as any,
        },
      ],
    },
    {
      id: 'ord-2',
      orderNumber: 'LM-2026-002',
      userId: 'u1',
      email: 'user@example.com',
      subtotal: 45000,
      discountAmount: 0,
      status: 'DELIVERED',
      paymentStatus: 'COMPLETED',
      paymentMethod: 'online',
      finalAmount: 45000,
      createdAt: '2026-11-05T10:00:00Z',
      items: [
        {
          id: 'item-2',
          orderId: 'ord-2',
          productId: 'prod-2',
          quantity: 1,
          price: 45000,
          product: { name: 'Dell Latitude 7490 Core i5' } as any,
        },
      ],
    },
    {
      id: 'ord-3',
      orderNumber: 'LM-2026-003',
      userId: 'u1',
      email: 'user@example.com',
      subtotal: 28000,
      discountAmount: 0,
      status: 'CANCELLED',
      paymentStatus: 'CANCELLED',
      paymentMethod: 'online',
      finalAmount: 28000,
      createdAt: '2026-10-25T10:00:00Z',
      items: [
        {
          id: 'item-3',
          orderId: 'ord-3',
          productId: 'prod-3',
          quantity: 1,
          price: 28000,
          product: { name: 'HP EliteBook 840 G6' } as any,
        },
      ],
    },
    {
      id: 'ord-4',
      orderNumber: 'LM-2026-004',
      userId: 'u1',
      email: 'user@example.com',
      subtotal: 51000,
      discountAmount: 0,
      status: 'DELIVERED',
      paymentStatus: 'COMPLETED',
      returnStatus: 'REQUESTED',
      paymentMethod: 'online',
      finalAmount: 51000,
      createdAt: '2026-11-01T10:00:00Z',
      items: [
        {
          id: 'item-4',
          orderId: 'ord-4',
          productId: 'prod-4',
          quantity: 1,
          price: 51000,
          product: { name: 'MacBook Air M1 16GB' } as any,
        },
      ],
    },
    {
      id: 'ord-5',
      orderNumber: 'LM-2026-005',
      userId: 'u1',
      email: 'user@example.com',
      subtotal: 38000,
      discountAmount: 0,
      status: 'SHIPPED',
      paymentStatus: 'COMPLETED',
      paymentMethod: 'online',
      finalAmount: 38000,
      createdAt: '2026-11-12T10:00:00Z',
      items: [
        {
          id: 'item-5',
          orderId: 'ord-5',
          productId: 'prod-5',
          quantity: 1,
          price: 38000,
          variantName: 'Dell Precision 3530 Xeon',
        },
      ],
    },
  ] as unknown as Order[];

  describe('filterOrdersByStatus', () => {
    it('returns all orders when status is ALL', () => {
      const result = filterOrdersByStatus(mockOrders, 'ALL');
      expect(result.length).toBe(5);
    });

    it('filters active in-progress orders (PENDING, CONFIRMED, SHIPPED)', () => {
      const result = filterOrdersByStatus(mockOrders, 'IN_PROGRESS');
      expect(result.length).toBe(2);
      expect(result.map((o) => o.orderNumber)).toEqual(['LM-2026-001', 'LM-2026-005']);
    });

    it('filters delivered orders', () => {
      const result = filterOrdersByStatus(mockOrders, 'DELIVERED');
      expect(result.length).toBe(2);
      expect(result.map((o) => o.orderNumber)).toEqual(['LM-2026-002', 'LM-2026-004']);
    });

    it('filters cancelled orders', () => {
      const result = filterOrdersByStatus(mockOrders, 'CANCELLED');
      expect(result.length).toBe(1);
      expect(result[0]?.orderNumber).toBe('LM-2026-003');
    });

    it('filters returns and refund requested orders', () => {
      const result = filterOrdersByStatus(mockOrders, 'RETURNS');
      expect(result.length).toBe(1);
      expect(result[0]?.orderNumber).toBe('LM-2026-004');
    });
  });

  describe('filterOrdersBySearch', () => {
    it('returns all orders when query is empty or whitespace', () => {
      expect(filterOrdersBySearch(mockOrders, '').length).toBe(5);
      expect(filterOrdersBySearch(mockOrders, '   ').length).toBe(5);
    });

    it('filters by order number partial match', () => {
      const result = filterOrdersBySearch(mockOrders, '003');
      expect(result.length).toBe(1);
      expect(result[0]?.orderNumber).toBe('LM-2026-003');
    });

    it('filters by product name', () => {
      const result = filterOrdersBySearch(mockOrders, 'ThinkPad');
      expect(result.length).toBe(1);
      expect(result[0]?.orderNumber).toBe('LM-2026-001');
    });

    it('filters by variant name', () => {
      const result = filterOrdersBySearch(mockOrders, 'Precision');
      expect(result.length).toBe(1);
      expect(result[0]?.orderNumber).toBe('LM-2026-005');
    });

    it('returns empty array when search matches nothing', () => {
      const result = filterOrdersBySearch(mockOrders, 'Asus ROG Strix');
      expect(result.length).toBe(0);
    });
  });

  describe('validatePincode', () => {
    it('accepts valid 6-digit Indian PIN codes', () => {
      expect(validatePincode('560103')).toBe(true);
      expect(validatePincode('110001')).toBe(true);
      expect(validatePincode('400001')).toBe(true);
    });

    it('rejects short PIN codes', () => {
      expect(validatePincode('56010')).toBe(false);
      expect(validatePincode('123')).toBe(false);
    });

    it('rejects PIN codes with alphabets or special characters', () => {
      expect(validatePincode('56010A')).toBe(false);
      expect(validatePincode('560-103')).toBe(false);
    });

    it('rejects null or undefined PIN codes', () => {
      expect(validatePincode(null)).toBe(false);
      expect(validatePincode(undefined)).toBe(false);
      expect(validatePincode('')).toBe(false);
    });
  });

  describe('Order Quick-Action Eligibility', () => {
    it('allows cancellation for PENDING or CONFIRMED orders', () => {
      expect(canCancelOrder('PENDING')).toBe(true);
      expect(canCancelOrder('CONFIRMED')).toBe(true);
      expect(canCancelOrder('SHIPPED')).toBe(false);
      expect(canCancelOrder('DELIVERED')).toBe(false);
      expect(canCancelOrder('CANCELLED')).toBe(false);
    });

    it('allows invoice download for completed prepaid orders', () => {
      const result = canDownloadInvoice({
        status: 'DELIVERED',
        paymentStatus: 'COMPLETED',
        paymentMethod: 'online',
      });
      expect(result.canDownload).toBe(true);
    });

    it('defers invoice download for COD orders until delivery collection', () => {
      const result = canDownloadInvoice({
        status: 'SHIPPED',
        paymentStatus: 'PENDING',
        paymentMethod: 'cod',
      });
      expect(result.canDownload).toBe(false);
      expect(result.note).toContain('cash collection on delivery');
    });

    it('renders accurate mobile status labels and badges', () => {
      const deliveredCfg = getMobileStatusLabel('DELIVERED', 'COMPLETED');
      expect(deliveredCfg.label).toBe('Delivered');

      const returnCfg = getMobileStatusLabel('DELIVERED', 'COMPLETED', 'REQUESTED');
      expect(returnCfg.label).toBe('Return Requested');

      const shippedCfg = getMobileStatusLabel('SHIPPED', 'COMPLETED');
      expect(shippedCfg.label).toBe('Shipped');
    });
  });
});
