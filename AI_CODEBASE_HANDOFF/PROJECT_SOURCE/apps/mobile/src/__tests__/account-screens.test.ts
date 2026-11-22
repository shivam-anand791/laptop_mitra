describe('Phase 2 Account Hub Screen Logic & Helpers', () => {
  describe('Payment Status Badge Helpers', () => {
    function getPaymentStatusBadge(status?: string | null) {
      const s = (status || '').toUpperCase();
      if (s === 'COMPLETED' || s === 'PAID' || s === 'CAPTURED' || s === 'SUCCESS') {
        return { label: 'Paid', bg: '#f0fdf4', text: '#16a34a' };
      }
      if (s === 'PENDING' || s === 'AUTHORIZED') {
        return { label: 'Pending', bg: '#fef3c7', text: '#d97706' };
      }
      if (s === 'FAILED' || s === 'CANCELLED') {
        return { label: 'Failed', bg: '#fef2f2', text: '#dc2626' };
      }
      return { label: s || 'Processed', bg: '#f1f5f9', text: '#64748b' };
    }

    it('classifies successful payment states as Paid', () => {
      expect(getPaymentStatusBadge('PAID').label).toBe('Paid');
      expect(getPaymentStatusBadge('COMPLETED').label).toBe('Paid');
      expect(getPaymentStatusBadge('CAPTURED').label).toBe('Paid');
    });

    it('classifies pending states as Pending', () => {
      expect(getPaymentStatusBadge('PENDING').label).toBe('Pending');
      expect(getPaymentStatusBadge('AUTHORIZED').label).toBe('Pending');
    });

    it('classifies failed states as Failed', () => {
      expect(getPaymentStatusBadge('FAILED').label).toBe('Failed');
      expect(getPaymentStatusBadge('CANCELLED').label).toBe('Failed');
    });
  });

  describe('Returns Tab Filtering & Status Classification', () => {
    const sampleReturns = [
      { id: 'ret-1', status: 'REFUNDED', returnNumber: 'RET-001' },
      { id: 'ret-2', status: 'PICKUP_SCHEDULED', returnNumber: 'RET-002' },
      { id: 'ret-3', status: 'REJECTED', returnNumber: 'RET-003' },
      { id: 'ret-4', status: 'IN_TRANSIT', returnNumber: 'RET-004' },
      { id: 'ret-5', status: 'REPLACED', returnNumber: 'RET-005' },
    ];

    function filterReturns(returns: typeof sampleReturns, tab: 'ALL' | 'ACTIVE' | 'COMPLETED' | 'CLOSED') {
      return returns.filter((r) => {
        const s = r.status.toUpperCase();
        if (tab === 'ACTIVE') {
          return !['REFUNDED', 'REPLACED', 'REJECTED', 'CANCELLED', 'INSPECTION_FAILED'].includes(s);
        }
        if (tab === 'COMPLETED') {
          return ['REFUNDED', 'REPLACED'].includes(s);
        }
        if (tab === 'CLOSED') {
          return ['REJECTED', 'CANCELLED', 'INSPECTION_FAILED'].includes(s);
        }
        return true;
      });
    }

    it('filters active returns in progress', () => {
      const active = filterReturns(sampleReturns, 'ACTIVE');
      expect(active.map((r) => r.id)).toEqual(['ret-2', 'ret-4']);
    });

    it('filters completed returns', () => {
      const completed = filterReturns(sampleReturns, 'COMPLETED');
      expect(completed.map((r) => r.id)).toEqual(['ret-1', 'ret-5']);
    });

    it('filters closed or rejected returns', () => {
      const closed = filterReturns(sampleReturns, 'CLOSED');
      expect(closed.map((r) => r.id)).toEqual(['ret-3']);
    });
  });

  describe('Service Job Status Badges', () => {
    function getServiceJobBadge(status?: string | null) {
      const s = (status || '').toUpperCase();
      if (s === 'COMPLETED') return { label: 'Completed', text: '#16a34a' };
      if (s === 'CANCELLED') return { label: 'Cancelled', text: '#dc2626' };
      if (s === 'IN_PROGRESS' || s === 'TECHNICIAN_ASSIGNED') return { label: 'In Progress', text: '#d97706' };
      return { label: 'Booked', text: '#2563eb' };
    }

    it('maps completed and cancelled service appointments', () => {
      expect(getServiceJobBadge('COMPLETED').label).toBe('Completed');
      expect(getServiceJobBadge('CANCELLED').label).toBe('Cancelled');
      expect(getServiceJobBadge('TECHNICIAN_ASSIGNED').label).toBe('In Progress');
      expect(getServiceJobBadge('BOOKED').label).toBe('Booked');
    });
  });

  describe('Notification Preferences State Immutability', () => {
    it('toggles individual channels without mutating untouched channels', () => {
      const initialPrefs = {
        emailOrderUpdates: true,
        emailPromotions: false,
        smsOrderUpdates: true,
        smsDeliveryTracking: true,
        pushNewArrivals: false,
        pushPriceDrops: true,
      };

      const updated = {
        ...initialPrefs,
        emailPromotions: !initialPrefs.emailPromotions,
      };

      expect(updated.emailPromotions).toBe(true);
      expect(updated.emailOrderUpdates).toBe(true);
      expect(updated.pushPriceDrops).toBe(true);
    });
  });
});

