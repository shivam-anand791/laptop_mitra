'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Order, OrderCounts } from '@/lib/types';
import { useSupportConfig } from '@/lib/support-config';
import {
  filterOrdersByStatus,
  filterOrdersByDate,
  filterOrdersBySearch,
} from '@/lib/account-helpers';
import {
  OrderCard,
  ConfirmDialog,
  SkeletonList,
  ErrorState,
} from '@/components/account';
import { ItemSituationHelpModal } from '@/components/account/ItemSituationHelpModal';
import {
  Search,
  X,
  Package,
  Calendar,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

type StatusTabId = 'ALL' | 'IN_PROGRESS' | 'DELIVERED' | 'CANCELLED' | 'RETURNS';
type DateRangeOption = 'ALL' | '30_DAYS' | '90_DAYS' | '2026' | '2025';

interface StatusTabConfig {
  id: StatusTabId;
  label: string;
}

const STATUS_TABS: StatusTabConfig[] = [
  { id: 'ALL', label: 'All Orders' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'DELIVERED', label: 'Delivered' },
  { id: 'CANCELLED', label: 'Cancelled' },
  { id: 'RETURNS', label: 'Returns' },
];

const DATE_OPTIONS: { id: DateRangeOption; label: string }[] = [
  { id: 'ALL', label: 'All Time' },
  { id: '30_DAYS', label: 'Last 30 Days' },
  { id: '90_DAYS', label: 'Last 3 Months' },
  { id: '2026', label: 'Year 2026' },
  { id: '2025', label: 'Year 2025' },
];

const RETURN_REASONS = [
  'Quality or performance issue',
  'Damaged or defective on arrival',
  'Different model or specs received',
  'Missing accessories or charger',
  'No longer needed / Changed mind',
];

export default function OrdersPage() {
  const router = useRouter();
  const { data: supportConfig } = useSupportConfig();

  // Primary data state
  const [orders, setOrders] = useState<Order[]>([]);
  const [serverCounts, setServerCounts] = useState<OrderCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [selectedStatus, setSelectedStatus] = useState<StatusTabId>('ALL');
  const [dateRange, setDateRange] = useState<DateRangeOption>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  // Interactive action states
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const [returningOrder, setReturningOrder] = useState<Order | null>(null);
  const [returnReason, setReturnReason] = useState(RETURN_REASONS[0]);
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  const [reorderingId, setReorderingId] = useState<string | null>(null);

  // Situation-aware help modal state
  const [selectedHelpOrder, setSelectedHelpOrder] = useState<Order | null>(null);
  const [selectedHelpItem, setSelectedHelpItem] = useState<any | null>(null);

  // Notification toast / alert banner
  const [banner, setBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showBanner = (type: 'success' | 'error', message: string) => {
    setBanner({ type, message });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      setBanner((prev) => (prev?.message === message ? null : prev));
    }, 6000);
  };

  // Data fetching
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, countsData] = await Promise.all([
        api.getOrders(),
        api.getOrderCounts().catch(() => null),
      ]);
      setOrders(data || []);
      if (countsData) {
        setServerCounts(countsData);
      }
    } catch (err: any) {
      setError(
        err?.message || 'Unable to load orders. Please check your internet connection.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();

    const onFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchOrders();
      }
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [fetchOrders]);

  // 60-second polling for active in-progress orders
  useEffect(() => {
    const hasInProgress = orders.some((o) =>
      ['PENDING', 'CONFIRMED', 'SHIPPING'].includes(o.status)
    );
    if (!hasInProgress) return;

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchOrders();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [orders, fetchOrders]);

  // Status Tab Counts (server-provided count for whole set)
  const statusCounts = useMemo(() => {
    if (serverCounts) {
      return serverCounts;
    }

    const counts: Record<StatusTabId, number> = {
      ALL: orders.length,
      IN_PROGRESS: 0,
      DELIVERED: 0,
      CANCELLED: 0,
      RETURNS: 0,
    };

    for (const o of orders) {
      if (['PENDING', 'CONFIRMED', 'SHIPPING'].includes(o.status)) {
        counts.IN_PROGRESS += 1;
      } else if (o.status === 'DELIVERED') {
        counts.DELIVERED += 1;
      } else if (o.status === 'CANCELLED') {
        counts.CANCELLED += 1;
      }

      if (
        (o.returnStatus && o.returnStatus !== 'NONE') ||
        o.status === 'REFUNDED'
      ) {
        counts.RETURNS += 1;
      }
    }

    return counts;
  }, [serverCounts, orders]);

  // Client-side filtering across status, date, search, and sort
  const filteredOrders = useMemo(() => {
    let result = filterOrdersByStatus(orders, selectedStatus);
    result = filterOrdersByDate(result, dateRange);
    result = filterOrdersBySearch(result, searchQuery);
    return [...result].sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });
  }, [orders, selectedStatus, dateRange, searchQuery, sortOrder]);

  // Handler: Cancel Order
  const handleConfirmCancel = async () => {
    if (!cancellingOrder) return;
    setIsCancelling(true);
    try {
      await api.cancelOrder(cancellingOrder.id);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === cancellingOrder.id
            ? {
                ...o,
                status: 'CANCELLED',
                paymentStatus:
                  o.paymentStatus === 'COMPLETED'
                    ? 'REFUND_PENDING'
                    : o.paymentStatus,
              }
            : o
        )
      );
      showBanner(
        'success',
        `Order ${cancellingOrder.orderNumber} has been successfully cancelled.`
      );
      setCancellingOrder(null);
    } catch (err: any) {
      showBanner(
        'error',
        err?.message || 'Failed to cancel this order. Please try again or contact support.'
      );
    } finally {
      setIsCancelling(false);
    }
  };

  // Handler: Return Request
  const handleConfirmReturn = async () => {
    if (!returningOrder) return;
    setIsSubmittingReturn(true);
    try {
      await api.requestOrderReturn(returningOrder.id, returnReason);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === returningOrder.id
            ? { ...o, returnStatus: 'REQUESTED' }
            : o
        )
      );
      showBanner(
        'success',
        `Return request for order ${returningOrder.orderNumber} submitted. ${
          supportConfig?.firstResponseSlaHours
            ? `Our team aims to respond within ${supportConfig.firstResponseSlaHours} hours.`
            : 'Our team will review your request.'
        }`
      );
      setReturningOrder(null);
    } catch (err: any) {
      showBanner(
        'error',
        err?.message || 'Failed to submit return request. Please contact support.'
      );
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  // Handler: Reorder / Buy Again
  const handleReorder = async (order: Order) => {
    setReorderingId(order.id);
    try {
      const res = await api.reorder(order.id);
      showBanner(
        'success',
        res.message || 'Items added to your cart successfully.'
      );
      router.push('/cart');
    } catch (err: any) {
      showBanner(
        'error',
        err?.message || 'Could not reorder items. Some items may be out of stock.'
      );
    } finally {
      setReorderingId(null);
    }
  };

  const clearAllFilters = () => {
    setSelectedStatus('ALL');
    setDateRange('ALL');
    setSearchQuery('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Notifications */}
      {banner && (
        <div
          role="status"
          aria-live="polite"
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-medium animate-in fade-in duration-200 ${
            banner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {banner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{banner.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="text-slate-400 hover:text-slate-700 p-1"
            aria-label="Dismiss message"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-2xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Orders &amp; Purchases
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Track dispatches, initiate returns, download GST invoices, and reorder certified laptops.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative min-w-[260px] sm:min-w-[300px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order ID or laptop model..."
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition bg-slate-50/50 hover:bg-white"
              aria-label="Search orders"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar: Status tabs & Date Range dropdown */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          {/* Status Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {STATUS_TABS.map((tab) => {
              const isSelected = selectedStatus === tab.id;
              const count = statusCounts[tab.id];

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedStatus(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap inline-flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 bg-slate-50 border border-slate-200/60'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected
                        ? 'bg-slate-800 text-slate-200'
                        : 'bg-slate-200/80 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Controls: Date range & Sort */}
          <div className="flex items-center gap-2.5 self-start sm:self-center flex-wrap">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRangeOption)}
                className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none hover:bg-slate-100 transition cursor-pointer"
                aria-label="Filter orders by date"
              >
                {DATE_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none hover:bg-slate-100 transition cursor-pointer"
                aria-label="Sort orders"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Orders List Container */}
      {loading ? (
        <SkeletonList count={3} />
      ) : error ? (
        <ErrorState
          title="Unable to load orders"
          message={error}
          onRetry={fetchOrders}
        />
      ) : orders.length === 0 ? (
        /* Empty State: Zero orders overall */
        <div className="text-center py-16 px-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto">
            <Package className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-base font-bold text-slate-900">No orders placed yet</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              When you purchase or rent certified laptops, your tracking and warranty details will appear here.
            </p>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            <Sparkles className="w-4 h-4" /> Explore Certified Laptops
          </Link>
        </div>
      ) : filteredOrders.length === 0 ? (
        /* Empty State: Filter yielded no results */
        <div className="text-center py-14 px-4 bg-white rounded-2xl border border-dashed border-slate-300 shadow-2xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 mx-auto">
            <Package className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-sm font-bold text-slate-900">No matching orders found</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              No orders matched your selected filters or search terms. Try clearing search keywords or selecting another status tab.
            </p>
          </div>
          <button
            type="button"
            onClick={clearAllFilters}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        /* Rendered Orders */
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onCancel={(ord) => setCancellingOrder(ord)}
              onReturn={(ord) => {
                setReturningOrder(ord);
                setReturnReason(RETURN_REASONS[0]);
              }}
              onReorder={handleReorder}
              onNeedHelp={(ord, it) => {
                setSelectedHelpOrder(ord);
                setSelectedHelpItem(it || ord.items?.[0] || null);
              }}
              isReordering={reorderingId === order.id}
            />
          ))}
        </div>
      )}

      {/* Confirm Dialog: Cancel Order */}
      <ConfirmDialog
        isOpen={!!cancellingOrder}
        title="Cancel Order"
        message={`Are you sure you want to cancel order #${cancellingOrder?.orderNumber}? If payment was already completed, a full refund will be automatically initiated to your original payment method.`}
        confirmLabel={isCancelling ? 'Cancelling...' : 'Yes, Cancel Order'}
        cancelLabel="Keep Order"
        isDestructive={true}
        isLoading={isCancelling}
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancellingOrder(null)}
      />

      {/* Return Request Modal */}
      {returningOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity"
          role="dialog"
          aria-modal="true"
          aria-labelledby="return-modal-title"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 border border-amber-100 flex items-center justify-center flex-shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="return-modal-title" className="text-base font-bold text-slate-900">
                    Request Return / Replacement
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Order #{returningOrder.orderNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReturningOrder(null)}
                disabled={isSubmittingReturn}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {supportConfig?.returnWindowDays
                ? `Submit your request within ${supportConfig.returnWindowDays} days of delivery. Please select the primary reason:`
                : 'Return eligibility follows the current policy. Please select the primary reason:'}
            </p>

            <div className="space-y-2 pt-1">
              <label className="text-[11px] font-semibold text-slate-700 block">
                Reason for return:
              </label>
              <select
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-600"
              >
                {RETURN_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReturningOrder(null)}
                disabled={isSubmittingReturn}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReturn}
                disabled={isSubmittingReturn}
                className="px-4 py-2 text-xs font-semibold bg-amber-800 hover:bg-amber-900 text-white rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isSubmittingReturn ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Situation-Aware Need Help Modal */}
      {selectedHelpOrder && selectedHelpItem && (
        <ItemSituationHelpModal
          isOpen={true}
          onClose={() => {
            setSelectedHelpOrder(null);
            setSelectedHelpItem(null);
          }}
          orderId={selectedHelpOrder.id}
          orderNumber={selectedHelpOrder.orderNumber}
          orderItemId={selectedHelpItem.id}
          productName={selectedHelpItem.product?.name || 'Refurbished Laptop'}
          purchaseMode={selectedHelpItem.purchaseMode}
          unitPrice={Number(selectedHelpItem.price)}
          initialShippingAddress={selectedHelpOrder.shippingAddress}
          initialPhone={selectedHelpOrder.phone || undefined}
          onActionSuccess={(msg) => showBanner('success', msg)}
          onOpenReturnModal={() => {
            setReturningOrder(selectedHelpOrder);
            setSelectedHelpOrder(null);
            setSelectedHelpItem(null);
          }}
        />
      )}
    </div>
  );
}
