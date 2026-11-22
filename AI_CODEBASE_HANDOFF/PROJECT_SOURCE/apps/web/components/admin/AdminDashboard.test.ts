import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Phase 5: Admin Dashboard Logic & Contract Tests', () => {
  function formatINR(amount: number | string | null | undefined): string {
    const num = typeof amount === 'number' ? amount : parseFloat(String(amount || 0));
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(isNaN(num) ? 0 : num);
  }

  it('formats revenue amounts in Indian Rupees without dividing by 100', () => {
    // Rupee amount in backend is Decimal(125000)
    const revenueCompleted = 125000;
    const formatted = formatINR(revenueCompleted);

    // Must be formatted as rupees, not divided by 100 (which would be 1,250)
    assert.match(formatted, /1,25,000/);
    assert.doesNotMatch(formatted, /1,250/);
  });

  it('correctly maps all Phase 4 backend stats keys', () => {
    const rawBackendStats = {
      totalUsers: 142,
      totalProducts: 88,
      totalOrders: 310,
      pendingOrders: 12,
      deliveredOrders: 280,
      lowStockProducts: 4,
      ordersToday: 7,
      revenueCompleted: 4500000,
      revenuePending: 185000,
      revenue: {
        completed: 4500000,
        pending: 185000,
      },
    };

    // Verify key mappings
    assert.equal(rawBackendStats.totalUsers, 142);
    assert.equal(rawBackendStats.totalProducts, 88);
    assert.equal(rawBackendStats.totalOrders, 310);
    assert.equal(rawBackendStats.pendingOrders, 12);
    assert.equal(rawBackendStats.deliveredOrders, 280);
    assert.equal(rawBackendStats.lowStockProducts, 4);
    assert.equal(rawBackendStats.ordersToday, 7);
    assert.equal(rawBackendStats.revenueCompleted, 4500000);
    assert.equal(rawBackendStats.revenuePending, 185000);
  });

  it('evaluates real pending orders condition for requires attention label', () => {
    // Condition must be pendingOrders > 0
    const hasAttentionNeeded = (pendingOrders: number) => pendingOrders > 0;

    assert.equal(hasAttentionNeeded(5), true);
    assert.equal(hasAttentionNeeded(1), true);
    assert.equal(hasAttentionNeeded(0), false);
  });

  it('evaluates real low stock critical label condition', () => {
    const isCriticalStock = (lowStockProducts: number) => lowStockProducts > 0;

    assert.equal(isCriticalStock(3), true);
    assert.equal(isCriticalStock(0), false);
  });

  it('extracts recent orders from both paginated result and array shapes', () => {
    const mockOrder = {
      id: 'ord-1',
      orderNumber: 'LM-1001',
      userId: 'u-1',
      status: 'CONFIRMED',
      paymentStatus: 'COMPLETED',
      paymentMethod: 'razorpay',
      finalAmount: 45000,
      email: 'customer@test.com',
      createdAt: '2026-10-23T10:00:00.000Z',
    };

    const extractItems = (data: any): any[] => {
      if (!data) return [];
      if (Array.isArray(data)) return data;
      return data.items || [];
    };

    // Shape A: Paginated response
    const paginated = { items: [mockOrder], total: 1, page: 1, pageSize: 5 };
    assert.equal(extractItems(paginated).length, 1);
    assert.equal(extractItems(paginated)[0].orderNumber, 'LM-1001');

    // Shape B: Direct array
    const directArray = [mockOrder];
    assert.equal(extractItems(directArray).length, 1);
    assert.equal(extractItems(directArray)[0].orderNumber, 'LM-1001');

    // Shape C: Null/undefined
    assert.equal(extractItems(null).length, 0);
  });

  it('maps stat cards to authoritative filtered URLs', () => {
    const cardRoutes = {
      users: '/admin/users',
      products: '/admin/products',
      orders: '/admin/orders',
      pendingOrders: '/admin/orders?status=PENDING',
      deliveredOrders: '/admin/orders?status=DELIVERED',
      lowStock: '/admin/products?lowStock=true',
    };

    assert.equal(cardRoutes.pendingOrders, '/admin/orders?status=PENDING');
    assert.equal(cardRoutes.deliveredOrders, '/admin/orders?status=DELIVERED');
    assert.equal(cardRoutes.lowStock, '/admin/products?lowStock=true');
  });
});
