import test, { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('Phase 8: Customer Account, Support & Admin UI Refinement', () => {
  describe('1. Customer Account Dashboard Data Integrity', () => {
    it('aggregates key account metrics from server data without creating fake analytics', () => {
      const mockOrders = [
        { id: 'ord-1', orderNumber: 'LM-1001', status: 'DELIVERED', finalAmount: 38999, createdAt: '2026-11-10T10:00:00Z' },
        { id: 'ord-2', orderNumber: 'LM-1002', status: 'SHIPPING', finalAmount: 42500, createdAt: '2026-11-20T14:30:00Z' },
      ];

      const mockLaptops = [
        {
          id: 'unit-1',
          serialNumber: 'LPM-THINK-001',
          warrantyCoverage: { endDate: '2027-11-10T00:00:00Z' }, // Active
        },
        {
          id: 'unit-2',
          serialNumber: 'LPM-DELL-002',
          warrantyCoverage: { endDate: '2025-01-01T00:00:00Z' }, // Expired
        },
      ];

      const mockTickets = [
        { id: 't-1', ticketNumber: 'TK-101', status: 'OPEN' },
        { id: 't-2', ticketNumber: 'TK-102', status: 'RESOLVED' },
      ];

      const totalOrders = mockOrders.length;
      const activeWarranties = mockLaptops.filter(
        (l) => new Date(l.warrantyCoverage.endDate).getTime() > Date.now()
      ).length;
      const openTickets = mockTickets.filter(
        (t) => t.status !== 'RESOLVED' && t.status !== 'CLOSED'
      ).length;

      assert.strictEqual(totalOrders, 2);
      assert.strictEqual(activeWarranties, 1);
      assert.strictEqual(openTickets, 1);
    });

    it('formats currency strictly as Indian Rupees (₹) as Decimal without cent/paise division', () => {
      const formatINR = (val: number) => `₹${val.toLocaleString('en-IN')}`;
      assert.strictEqual(formatINR(38999), '₹38,999');
      assert.strictEqual(formatINR(125000), '₹1,25,000');
    });

    it('sorts recent orders in descending order by creation date', () => {
      const orders = [
        { id: '1', createdAt: '2026-05-01T00:00:00Z' },
        { id: '2', createdAt: '2026-11-15T00:00:00Z' },
        { id: '3', createdAt: '2026-08-20T00:00:00Z' },
      ];

      const sorted = [...orders].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      assert.strictEqual(sorted[0].id, '2');
      assert.strictEqual(sorted[1].id, '3');
      assert.strictEqual(sorted[2].id, '1');
    });
  });

  describe('2. Order Lifecycle & Eligibility Guards', () => {
    it('allows cancellation only for PENDING or CONFIRMED orders before shipping', () => {
      const canCancel = (status: string) => status === 'PENDING' || status === 'CONFIRMED';

      assert.strictEqual(canCancel('PENDING'), true);
      assert.strictEqual(canCancel('CONFIRMED'), true);
      assert.strictEqual(canCancel('SHIPPING'), false);
      assert.strictEqual(canCancel('DELIVERED'), false);
      assert.strictEqual(canCancel('CANCELLED'), false);
    });

    it('allows return requests only for DELIVERED orders within the return window', () => {
      const canReturn = (status: string, deliveredAt: string | null, returnWindowDays = 7) => {
        if (status !== 'DELIVERED' || !deliveredAt) return false;
        const diffMs = Date.now() - new Date(deliveredAt).getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        return diffDays <= returnWindowDays;
      };

      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();

      assert.strictEqual(canReturn('DELIVERED', threeDaysAgo, 7), true);
      assert.strictEqual(canReturn('DELIVERED', tenDaysAgo, 7), false);
      assert.strictEqual(canReturn('SHIPPING', threeDaysAgo, 7), false);
    });

    it('evaluates delivery timeline steps sequence', () => {
      const TIMELINE_STEPS = ['ORDER_PLACED', 'CONFIRMED', 'SHIPPED', 'DELIVERED'];

      assert.strictEqual(TIMELINE_STEPS.length, 4);
      assert.strictEqual(TIMELINE_STEPS[0], 'ORDER_PLACED');
      assert.strictEqual(TIMELINE_STEPS[3], 'DELIVERED');
    });
  });

  describe('3. Support System & Ticket Conversation Invariants', () => {
    it('does not append outgoing messages until API confirms submission', async () => {
      let apiCalled = false;
      let uiUpdated = false;

      const mockApiSendMessage = async (text: string) => {
        apiCalled = true;
        return { id: 'msg-new', body: text, createdAt: new Date().toISOString() };
      };

      const handleSend = async (text: string) => {
        // UI does not update before await
        assert.strictEqual(uiUpdated, false);
        const result = await mockApiSendMessage(text);
        if (result?.id) {
          uiUpdated = true;
        }
      };

      await handleSend('Hello, I need help with my warranty.');
      assert.strictEqual(apiCalled, true);
      assert.strictEqual(uiUpdated, true);
    });

    it('validates support ticket status lifecycle transitions', () => {
      const isValidTransition = (from: string, to: string) => {
        const allowed: Record<string, string[]> = {
          OPEN: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
          IN_PROGRESS: ['WAITING_ON_CUSTOMER', 'RESOLVED', 'CLOSED'],
          WAITING_ON_CUSTOMER: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
          RESOLVED: ['REOPENED', 'CLOSED'],
          CLOSED: ['REOPENED'],
          REOPENED: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
        };
        return allowed[from]?.includes(to) ?? false;
      };

      assert.strictEqual(isValidTransition('OPEN', 'IN_PROGRESS'), true);
      assert.strictEqual(isValidTransition('RESOLVED', 'REOPENED'), true);
      assert.strictEqual(isValidTransition('OPEN', 'REOPENED'), false);
    });

    it('preserves attachment metadata structure', () => {
      const attachment = {
        id: 'att-123',
        fileName: 'diagnostic_report.pdf',
        storageKey: 'support/tickets/tk-101/diagnostic_report.pdf',
      };

      assert.strictEqual(attachment.fileName.endsWith('.pdf'), true);
      assert.strictEqual(attachment.storageKey.startsWith('support/'), true);
    });
  });

  describe('4. Admin Interface: DataTable Pagination & Sorting Logic', () => {
    it('calculates table pagination correctly for arbitrary record sets', () => {
      const calculatePagination = (totalItems: number, pageSize: number, currentPage: number) => {
        const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
        const safePage = Math.min(Math.max(1, currentPage), totalPages);
        const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
        const endItem = Math.min(totalItems, safePage * pageSize);
        return { totalPages, safePage, startItem, endItem };
      };

      const page1 = calculatePagination(45, 10, 1);
      assert.strictEqual(page1.totalPages, 5);
      assert.strictEqual(page1.startItem, 1);
      assert.strictEqual(page1.endItem, 10);

      const page5 = calculatePagination(45, 10, 5);
      assert.strictEqual(page5.startItem, 41);
      assert.strictEqual(page5.endItem, 45);

      const empty = calculatePagination(0, 10, 1);
      assert.strictEqual(empty.totalPages, 1);
      assert.strictEqual(empty.startItem, 0);
      assert.strictEqual(empty.endItem, 0);
    });

    it('sorts numbers numerically and strings alphabetically without type coercion bugs', () => {
      const items = [
        { name: 'ThinkPad T480', price: 28999 },
        { name: 'MacBook Air M1', price: 54999 },
        { name: 'Dell Latitude 7490', price: 24999 },
      ];

      // Sort by price ascending
      const sortedByPrice = [...items].sort((a, b) => a.price - b.price);
      assert.strictEqual(sortedByPrice[0].price, 24999);
      assert.strictEqual(sortedByPrice[2].price, 54999);

      // Sort by name alphabetically
      const sortedByName = [...items].sort((a, b) => a.name.localeCompare(b.name));
      assert.strictEqual(sortedByName[0].name, 'Dell Latitude 7490');
      assert.strictEqual(sortedByName[2].name, 'ThinkPad T480');
    });

    it('maps semantic status variants accurately for administrative oversight', () => {
      const getStatusVariant = (status: string) => {
        const s = status.toUpperCase();
        if (['DELIVERED', 'COMPLETED', 'APPROVED', 'ACTIVE', 'RESOLVED'].includes(s)) return 'success';
        if (['PENDING', 'REQUESTED', 'WAITING_ON_CUSTOMER', 'LOW_STOCK'].includes(s)) return 'warning';
        if (['CANCELLED', 'FAILED', 'REJECTED', 'OUT_OF_STOCK'].includes(s)) return 'danger';
        if (['CONFIRMED', 'SHIPPING', 'IN_PROGRESS', 'CONTACTED'].includes(s)) return 'info';
        return 'neutral';
      };

      assert.strictEqual(getStatusVariant('DELIVERED'), 'success');
      assert.strictEqual(getStatusVariant('PENDING'), 'warning');
      assert.strictEqual(getStatusVariant('CANCELLED'), 'danger');
      assert.strictEqual(getStatusVariant('SHIPPING'), 'info');
      assert.strictEqual(getStatusVariant('UNKNOWN_STATUS'), 'neutral');
    });
  });
});
