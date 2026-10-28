'use client';

import React, { Suspense, useState, useEffect, useTransition, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAdminOrders, useAdminStats } from '../../../lib/admin-queries';
import { AdminOrder, ORDER_STATUSES, parseShippingAddress } from '../../../lib/types';
import { formatINR, formatDate } from '../../../lib/format';
import PageHeader from '../../../components/admin/PageHeader';
import DataTable, { Column } from '../../../components/admin/DataTable';
import StatusBadge from '../../../components/admin/StatusBadge';
import AdminErrorState from '../../../components/admin/AdminErrorState';

function OrdersContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // URL query params
  const currentStatus = searchParams.get('status') || 'all';
  const currentPaymentStatus = searchParams.get('paymentStatus') || 'all';
  const currentSearch = searchParams.get('search') || '';
  const currentFrom = searchParams.get('from') || '';
  const currentTo = searchParams.get('to') || '';
  const currentPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

  const [searchInput, setSearchInput] = useState(currentSearch);
  const [prevSearchParam, setPrevSearchParam] = useState(currentSearch);

  if (prevSearchParam !== currentSearch) {
    setPrevSearchParam(currentSearch);
    setSearchInput(currentSearch);
  }

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

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchInput !== currentSearch) {
        updateUrlFilters({ search: searchInput, page: '1' });
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [searchInput, currentSearch, updateUrlFilters]);

  // Query stats & orders
  const { data: stats, isLoading: statsLoading } = useAdminStats();

  const queryParams = useMemo(
    () => ({
      page: currentPage,
      pageSize: 20,
      status: currentStatus !== 'all' ? currentStatus : undefined,
      paymentStatus: currentPaymentStatus !== 'all' ? currentPaymentStatus : undefined,
      search: currentSearch || undefined,
      from: currentFrom || undefined,
      to: currentTo || undefined,
    }),
    [currentPage, currentStatus, currentPaymentStatus, currentSearch, currentFrom, currentTo],
  );

  const {
    data: ordersData,
    isLoading: ordersLoading,
    error: ordersError,
    refetch: refetchOrders,
  } = useAdminOrders(queryParams);

  const ordersList: AdminOrder[] = Array.isArray(ordersData)
    ? ordersData
    : ordersData?.items ?? [];
  const totalOrders = Array.isArray(ordersData)
    ? ordersData.length
    : ordersData?.total ?? 0;
  const pageSize = Array.isArray(ordersData) ? 20 : ordersData?.pageSize ?? 20;

  // CSV Export
  const [isExporting, setIsExporting] = useState(false);
  const handleExportCSV = () => {
    if (ordersList.length === 0) return;
    setIsExporting(true);
    try {
      const headers = ['Order Number', 'Date', 'Customer', 'Email', 'Items', 'Total (INR)', 'Order Status', 'Payment Status'];
      const rows = ordersList.map((o) => [
        o.orderNumber || o.id,
        new Date(o.createdAt).toISOString().split('T')[0],
        `"${(o.user?.name || o.email || 'Customer').replace(/"/g, '""')}"`,
        `"${(o.email || '').replace(/"/g, '""')}"`,
        o.items?.length || 1,
        o.finalAmount,
        o.status,
        o.paymentStatus,
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `laptopmitra_orders_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  const hasActiveFilters = Boolean(
    (currentStatus && currentStatus !== 'all') ||
      (currentPaymentStatus && currentPaymentStatus !== 'all') ||
      currentSearch ||
      currentFrom ||
      currentTo,
  );

  const handleClearFilters = () => {
    setSearchInput('');
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
  };

  // Columns definition
  const columns: Column<AdminOrder>[] = useMemo(
    () => [
      {
        key: 'orderNumber',
        header: 'Order #',
        sortable: true,
        render: (order) => (
          <Link
            href={`/admin/orders/${order.id}`}
            className="font-mono text-xs font-bold text-primary hover:underline"
          >
            #{order.orderNumber || order.id.slice(-8)}
          </Link>
        ),
      },
      {
        key: 'customer',
        header: 'Customer',
        render: (order) => {
          const addr = parseShippingAddress(order.shippingAddress);
          const name = order.user?.name || addr.fullName || order.email?.split('@')[0] || 'Customer';
          return (
            <div>
              <div className="font-medium text-gray-900 text-xs">{name}</div>
              <div className="text-[11px] text-gray-500 truncate max-w-[180px]">{order.email}</div>
            </div>
          );
        },
      },
      {
        key: 'createdAt',
        header: 'Date',
        sortable: true,
        sortValue: (order) => new Date(order.createdAt).getTime(),
        render: (order) => (
          <span className="text-xs text-gray-600 whitespace-nowrap tabular-nums">
            {formatDate(order.createdAt)}
          </span>
        ),
      },
      {
        key: 'items',
        header: 'Items',
        render: (order) => {
          const count = order.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 1;
          return <span className="text-xs text-gray-600 tabular-nums">{count} items</span>;
        },
      },
      {
        key: 'finalAmount',
        header: 'Amount',
        align: 'right',
        sortable: true,
        sortValue: (order) => Number(order.finalAmount),
        render: (order) => (
          <span className="font-semibold text-gray-900 font-mono text-xs tabular-nums">
            {formatINR(order.finalAmount)}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (order) => <StatusBadge status={order.status} size="sm" />,
      },
      {
        key: 'paymentStatus',
        header: 'Payment',
        render: (order) => <StatusBadge status={order.paymentStatus} size="sm" />,
      },
      {
        key: 'actions',
        header: 'Action',
        align: 'right',
        render: (order) => (
          <Link
            href={`/admin/orders/${order.id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-blue-800 transition-colors"
          >
            <span>Manage</span>
            <span>→</span>
          </Link>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Orders"
        description="Fulfillment queues, shipment dispatches, and authoritative customer sales records"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={isExporting || ordersList.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
            </button>
            <button
              type="button"
              onClick={() => refetchOrders()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              title="Refresh orders list"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>
          </div>
        }
      />

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Orders</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">
            {statsLoading ? '—' : stats?.totalOrders ?? '0'}
          </p>
          <span className="text-[11px] text-gray-500">Authoritative database count</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending Orders</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">
            {statsLoading ? '—' : stats?.pendingOrders ?? '0'}
          </p>
          <span className="text-[11px] text-amber-700 font-medium">Requires fulfillment</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Delivered Orders</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">
            {statsLoading ? '—' : stats?.deliveredOrders ?? '0'}
          </p>
          <span className="text-[11px] text-emerald-700 font-medium">Successfully completed</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Completed Revenue</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 font-mono tabular-nums">
            {statsLoading ? '—' : formatINR(stats?.revenueCompleted ?? 0)}
          </p>
          <span className="text-[11px] text-gray-500">Settled customer payments</span>
        </div>
      </div>

      {/* Orders DataTable */}
      <DataTable
        columns={columns}
        data={ordersList}
        keyExtractor={(order) => order.id}
        isLoading={ordersLoading}
        error={ordersError ? ordersError.message : null}
        onRetry={refetchOrders}
        filterBar={
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
              {/* Search */}
              <div className="lg:col-span-4">
                <input
                  type="text"
                  placeholder="Search by order #, email, phone, name..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-gray-200 rounded-md bg-white text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="Search orders"
                />
              </div>

              {/* Status */}
              <div className="lg:col-span-2">
                <select
                  value={currentStatus}
                  onChange={(e) => updateUrlFilters({ status: e.target.value, page: '1' })}
                  className="w-full text-xs px-3 py-2 border border-gray-200 rounded-md bg-white text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
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

              {/* Payment Status */}
              <div className="lg:col-span-2">
                <select
                  value={currentPaymentStatus}
                  onChange={(e) => updateUrlFilters({ paymentStatus: e.target.value, page: '1' })}
                  className="w-full text-xs px-3 py-2 border border-gray-200 rounded-md bg-white text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
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

              {/* Date From */}
              <div className="lg:col-span-2">
                <input
                  type="date"
                  value={currentFrom}
                  onChange={(e) => updateUrlFilters({ from: e.target.value, page: '1' })}
                  className="w-full text-xs px-3 py-2 border border-gray-200 rounded-md bg-white text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  title="From Date"
                  aria-label="From Date"
                />
              </div>

              {/* Date To */}
              <div className="lg:col-span-2">
                <input
                  type="date"
                  value={currentTo}
                  onChange={(e) => updateUrlFilters({ to: e.target.value, page: '1' })}
                  className="w-full text-xs px-3 py-2 border border-gray-200 rounded-md bg-white text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  title="To Date"
                  aria-label="To Date"
                />
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                <span className="text-gray-500">Active filters applied. Showing matching orders.</span>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="text-primary hover:underline font-semibold cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>
        }
        pagination={{
          currentPage,
          totalItems: totalOrders,
          pageSize,
          onPageChange: (newPage) => updateUrlFilters({ page: String(newPage) }),
        }}
        emptyState={{
          title: 'No orders found',
          description: hasActiveFilters
            ? 'No orders matched your selected filter criteria. Try clearing search or resetting status.'
            : 'There are currently no customer orders in the system.',
          action: hasActiveFilters
            ? {
                label: 'Reset Filters',
                onClick: handleClearFilters,
              }
            : undefined,
        }}
      />
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 animate-pulse">
          <div className="h-10 bg-gray-200 rounded w-48" />
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg" />
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded-lg" />
        </div>
      }
    >
      <OrdersContent />
    </Suspense>
  );
}
