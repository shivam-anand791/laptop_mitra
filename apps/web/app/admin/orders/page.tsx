'use client';

import React, { Suspense, useState, useEffect, useTransition, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAdminOrders, useAdminStats } from '../../../lib/admin-queries';
import { AdminOrder, ORDER_STATUSES, parseShippingAddress } from '../../../lib/types';
import { formatINR, formatDate, toNumber } from '../../../lib/format';
import { QueryState } from '../../../components/admin/QueryState';
import Button from '../../../components/ui/Button';

// ---------------------------------------------------------------------------
// Status Badge Components
// ---------------------------------------------------------------------------

export function OrderStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: 'badge-warning',
    CONFIRMED: 'badge-info',
    SHIPPING: 'badge-primary',
    DELIVERED: 'badge-success',
    CANCELLED: 'badge-danger',
    REFUNDED: 'badge-gray',
  };
  return <span className={`badge ${styles[status] || 'badge-gray'}`}>{status}</span>;
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: 'badge-warning',
    PROCESSING: 'badge-info',
    COMPLETED: 'badge-success',
    FAILED: 'badge-danger',
    REFUNDED: 'badge-gray',
  };
  return <span className={`badge ${styles[status] || 'badge-gray'}`}>{status}</span>;
}

// ---------------------------------------------------------------------------
// Skeleton Loading Fallback
// ---------------------------------------------------------------------------

function OrdersLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-48" />
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-64" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
        ))}
      </div>
      <div className="h-14 bg-gray-200 dark:bg-gray-800 rounded-xl" />
      <div className="h-96 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Content
// ---------------------------------------------------------------------------

function OrdersPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // 1. Read filter values from URL query string
  const currentStatus = searchParams.get('status') || 'all';
  const currentPaymentStatus = searchParams.get('paymentStatus') || 'all';
  const currentSearch = searchParams.get('search') || '';
  const currentFrom = searchParams.get('from') || '';
  const currentTo = searchParams.get('to') || '';
  const currentPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

  // Local state for debounced search input
  const [searchInput, setSearchInput] = useState(currentSearch);
  const [prevSearchParam, setPrevSearchParam] = useState(currentSearch);

  // Synchronize state when URL query param changes without effect cascading renders
  if (prevSearchParam !== currentSearch) {
    setPrevSearchParam(currentSearch);
    setSearchInput(currentSearch);
  }

  // URL Query String Updater
  const updateUrlFilters = useCallback(
    (updates: Record<string, string | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (!value || value === 'all' || value.trim?.() === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });

      startTransition(() => {
        const queryString = params.toString();
        router.push(pathname + (queryString ? `?${queryString}` : ''), { scroll: false });
      });
    },
    [searchParams, pathname, router],
  );

  // Debounce search input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchInput !== currentSearch) {
        updateUrlFilters({ search: searchInput, page: '1' });
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput, currentSearch, updateUrlFilters]);

  // Handlers for filter controls
  const handleStatusChange = (status: string) => {
    updateUrlFilters({ status, page: '1' });
  };

  const handlePaymentChange = (paymentStatus: string) => {
    updateUrlFilters({ paymentStatus, page: '1' });
  };

  const handleDateChange = (from: string, to: string) => {
    updateUrlFilters({ from, to, page: '1' });
  };

  const handlePageChange = (page: number) => {
    updateUrlFilters({ page: String(page) });
  };

  const handleClearFilters = () => {
    setSearchInput('');
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
  };

  // 2. Fetch authoritative stats and paginated orders
  const { data: stats, isLoading: statsLoading } = useAdminStats();

  const queryParams = useMemo(() => ({
    page: currentPage,
    pageSize: 20,
    status: currentStatus !== 'all' ? currentStatus : undefined,
    paymentStatus: currentPaymentStatus !== 'all' ? currentPaymentStatus : undefined,
    search: currentSearch || undefined,
    from: currentFrom || undefined,
    to: currentTo || undefined,
  }), [currentPage, currentStatus, currentPaymentStatus, currentSearch, currentFrom, currentTo]);

  const {
    data: ordersData,
    isLoading: ordersLoading,
    error: ordersError,
    refetch: refetchOrders,
    isPlaceholderData,
  } = useAdminOrders(queryParams);

  // Normalize response shape (API returns { items, total, page, pageSize })
  const ordersList: AdminOrder[] = Array.isArray(ordersData)
    ? ordersData
    : ordersData?.items ?? [];
  const totalOrders = Array.isArray(ordersData)
    ? ordersData.length
    : ordersData?.total ?? 0;
  const pageSize = Array.isArray(ordersData) ? 20 : ordersData?.pageSize ?? 20;
  const totalPages = Math.max(1, Math.ceil(totalOrders / pageSize));

  // CSV Export handler for currently filtered visible page
  const [isExporting, setIsExporting] = useState(false);
  const handleExportCSV = () => {
    if (ordersList.length === 0) return;
    setIsExporting(true);
    try {
      const headers = ['Order Number', 'Customer Name', 'Email', 'Phone', 'Date', 'Items Count', 'Final Amount (INR)', 'Status', 'Payment Status', 'Payment Method'];
      const rows = ordersList.map((o) => {
        const addr = parseShippingAddress(o.shippingAddress);
        return [
          `"${o.orderNumber || o.id}"`,
          `"${o.user?.name || addr.fullName || ''}"`,
          `"${o.email || o.user?.email || ''}"`,
          `"${o.phone || addr.phone || ''}"`,
          `"${new Date(o.createdAt).toISOString()}"`,
          `"${o.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0}"`,
          `"${toNumber(o.finalAmount)}"`,
          `"${o.status}"`,
          `"${o.paymentStatus}"`,
          `"${o.paymentMethod || 'COD'}"`,
        ];
      });

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `laptopmitra-orders-page-${currentPage}-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsExporting(false);
    }
  };

  const hasActiveFilters =
    currentStatus !== 'all' ||
    currentPaymentStatus !== 'all' ||
    Boolean(currentSearch) ||
    Boolean(currentFrom) ||
    Boolean(currentTo);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Order Management</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Real-time orders, state transitions, and fulfillment verification
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetchOrders()}
            className="btn btn-secondary text-xs flex items-center space-x-1.5"
            title="Refresh orders from backend"
          >
            <span>↻</span>
            <span>Refresh</span>
          </button>
          <button
            onClick={handleExportCSV}
            disabled={ordersList.length === 0 || isExporting}
            className="btn btn-secondary text-xs flex items-center space-x-1.5 disabled:opacity-50"
            title="Export currently visible page of orders as CSV"
          >
            <span>📥</span>
            <span>{isExporting ? 'Exporting...' : 'Export Page CSV'}</span>
          </button>
        </div>
      </div>

      {/* Summary Cards (Authoritative from GET /admin/dashboard/stats) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-4 transition-all">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total Orders</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {statsLoading ? '...' : stats?.totalOrders ?? '—'}
          </p>
          <span className="text-[11px] text-gray-500">Authoritative database count</span>
        </div>

        <div className="card p-4 transition-all">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Pending Fulfillment</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {statsLoading ? '...' : stats?.pendingOrders ?? '—'}
          </p>
          <span className="text-[11px] text-gray-500">Requires processing</span>
        </div>

        <div className="card p-4 transition-all">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Delivered Orders</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {statsLoading ? '...' : stats?.deliveredOrders ?? '—'}
          </p>
          <span className="text-[11px] text-gray-500">Completed deliveries</span>
        </div>

        <div className="card p-4 transition-all">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Completed Revenue</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {statsLoading ? '...' : formatINR(stats?.revenueCompleted ?? 0)}
          </p>
          <span className="text-[11px] text-gray-500">Paid orders</span>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="card p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Search Input */}
          <div className="lg:col-span-4">
            <input
              type="text"
              placeholder="Search by order #, email, phone, name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="input w-full text-xs"
              aria-label="Search orders"
            />
          </div>

          {/* Status Filter */}
          <div className="lg:col-span-2">
            <select
              value={currentStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="input w-full text-xs"
              aria-label="Filter by order status"
            >
              <option value="all">All Order Statuses</option>
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Filter */}
          <div className="lg:col-span-2">
            <select
              value={currentPaymentStatus}
              onChange={(e) => handlePaymentChange(e.target.value)}
              className="input w-full text-xs"
              aria-label="Filter by payment status"
            >
              <option value="all">All Payment Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESSING">Processing</option>
              <option value="FAILED">Failed</option>
              <option value="REFUNDED">Refunded</option>
            </select>
          </div>

          {/* Date Range: From */}
          <div className="lg:col-span-2">
            <input
              type="date"
              value={currentFrom}
              onChange={(e) => handleDateChange(e.target.value, currentTo)}
              className="input w-full text-xs"
              title="From Date"
              aria-label="From Date"
            />
          </div>

          {/* Date Range: To */}
          <div className="lg:col-span-2">
            <input
              type="date"
              value={currentTo}
              onChange={(e) => handleDateChange(currentFrom, e.target.value)}
              className="input w-full text-xs"
              title="To Date"
              aria-label="To Date"
            />
          </div>
        </div>

        {/* Active Filters Pill / Reset */}
        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800 text-xs">
            <div className="text-gray-500">
              Active filters applied. Showing matching orders.
            </div>
            <button
              onClick={handleClearFilters}
              className="text-primary hover:underline font-medium"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Orders Table Container */}
      <QueryState
        isLoading={ordersLoading && !isPlaceholderData}
        error={ordersError}
        isEmpty={ordersList.length === 0}
        onRetry={() => refetchOrders()}
        emptyTitle="No orders found"
        emptyMessage={
          hasActiveFilters
            ? 'No orders matched the selected filter criteria. Try clearing search or resetting status.'
            : 'There are currently no orders registered in the system.'
        }
        emptyAction={
          hasActiveFilters ? (
            <Button size="sm" variant="secondary" onClick={handleClearFilters}>
              Reset Filters
            </Button>
          ) : undefined
        }
      >
        <div className={`table-container card transition-opacity duration-150 ${isPlaceholderData ? 'opacity-60' : 'opacity-100'}`}>
          <table className="table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Items</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Payment</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {ordersList.map((order) => {
                const totalItemQty =
                  order.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 1;
                const addr = parseShippingAddress(order.shippingAddress);
                const customerName =
                  order.user?.name ||
                  addr.fullName ||
                  order.email?.split('@')[0] ||
                  'Customer';

                return (
                  <tr key={order.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                    {/* Order Number */}
                    <td>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-mono text-xs font-bold text-primary hover:underline"
                      >
                        #{order.orderNumber || order.id.slice(-8)}
                      </Link>
                    </td>

                    {/* Customer */}
                    <td>
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white block text-xs">
                          {customerName}
                        </span>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 truncate block max-w-[180px]">
                          {order.email}
                        </span>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">
                      {formatDate(order.createdAt)}
                    </td>

                    {/* Items */}
                    <td className="text-xs text-gray-600 dark:text-gray-300">
                      {totalItemQty} {totalItemQty === 1 ? 'item' : 'items'}
                    </td>

                    {/* Amount */}
                    <td className="text-gray-900 dark:text-white font-bold text-xs whitespace-nowrap">
                      {formatINR(order.finalAmount)}
                    </td>

                    {/* Status Badge */}
                    <td>
                      <OrderStatusBadge status={order.status} />
                    </td>

                    {/* Payment Badge */}
                    <td>
                      <PaymentStatusBadge status={order.paymentStatus} />
                    </td>

                    {/* View Action Link */}
                    <td className="text-right">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="btn btn-secondary text-xs py-1 px-2.5 inline-block"
                        aria-label={`View details for order ${order.orderNumber}`}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Responsive Pagination Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 card p-4 text-xs">
          <div className="text-gray-500 dark:text-gray-400">
            Showing <span className="font-semibold text-gray-900 dark:text-white">{ordersList.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</span> to{' '}
            <span className="font-semibold text-gray-900 dark:text-white">
              {Math.min(currentPage * pageSize, totalOrders)}
            </span>{' '}
            of <span className="font-semibold text-gray-900 dark:text-white">{totalOrders}</span> orders
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1 || isPlaceholderData}
              className="btn btn-secondary text-xs px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              ← Previous
            </button>

            <span className="px-2 text-gray-600 dark:text-gray-300 font-medium">
              Page {currentPage} of {totalPages}
            </span>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages || isPlaceholderData}
              className="btn btn-secondary text-xs px-3 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              Next →
            </button>
          </div>
        </div>
      </QueryState>
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<OrdersLoadingSkeleton />}>
      <OrdersPageContent />
    </Suspense>
  );
}
