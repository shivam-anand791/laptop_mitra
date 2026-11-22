'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useAdminStats, useAdminRecentOrders, useAdminAnalytics, useAdminInquiries } from '../../lib/admin-queries';
import { formatINR, formatNumber, formatDate } from '../../lib/format';
import { AdminOrder } from '../../lib/types';
import { api } from '../../lib/api';
import PageHeader, { RangeOption } from '../../components/admin/PageHeader';
import DataTable, { Column } from '../../components/admin/DataTable';
import StatusBadge from '../../components/admin/StatusBadge';
import AdminErrorState from '../../components/admin/AdminErrorState';

export default function AdminDashboard() {
  const [range, setRange] = useState<RangeOption>('7d');
  const [chartMetric, setChartMetric] = useState<'revenue' | 'orders'>('revenue');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [pendingWithdrawalsCount, setPendingWithdrawalsCount] = useState<number>(0);

  // Queries
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useAdminStats({ refetchInterval: 60000 });

  const {
    data: recentOrdersData,
    isLoading: recentOrdersLoading,
    error: recentOrdersError,
    refetch: refetchRecentOrders,
  } = useAdminRecentOrders(5);

  const {
    data: analytics,
    isLoading: analyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics,
  } = useAdminAnalytics({ range });

  const {
    data: inquiriesData,
    refetch: refetchInquiries,
  } = useAdminInquiries({ status: 'PENDING', pageSize: 1 });

  // Fetch pending withdrawals count from affiliates
  useEffect(() => {
    let isMounted = true;
    api
      .getAdminAffiliates({ pageSize: 100 })
      .then((res) => {
        if (!isMounted || !res?.items) return;
        const count = res.items.reduce(
          (acc: number, curr: any) => acc + (Number(curr.pendingWithdrawalsCount) || 0),
          0,
        );
        setPendingWithdrawalsCount(count);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefreshAll = () => {
    refetchStats();
    refetchRecentOrders();
    refetchAnalytics();
    refetchInquiries();
  };

  const recentOrders: AdminOrder[] = useMemo(() => {
    if (!recentOrdersData) return [];
    if (Array.isArray(recentOrdersData)) return recentOrdersData;
    return (recentOrdersData as { items?: AdminOrder[] }).items || [];
  }, [recentOrdersData]);

  // KPI Calculations
  const revenueValue = analytics?.summary?.totalRevenue ?? stats?.revenueCompleted ?? 0;
  const ordersCount = analytics?.summary?.totalOrders ?? stats?.totalOrders ?? 0;
  const aovValue = ordersCount > 0 ? Math.round(revenueValue / ordersCount) : 0;
  const newUsersCount = analytics?.summary?.totalNewUsers ?? 0;

  // Chart Data preparation
  const chartPoints = useMemo(() => {
    if (!analytics) return [];
    const source = chartMetric === 'revenue' ? analytics.revenueByDay : analytics.ordersByDay;
    return source || [];
  }, [analytics, chartMetric]);

  const maxChartVal = useMemo(() => {
    if (!chartPoints.length) return 0;
    const values = chartPoints.map((p: any) => (chartMetric === 'revenue' ? p.amount : p.count));
    return Math.max(...values, 1);
  }, [chartPoints, chartMetric]);

  // Shared DataTable Columns for Recent Orders
  const orderColumns: Column<AdminOrder>[] = useMemo(
    () => [
      {
        key: 'orderNumber',
        header: 'Order #',
        render: (order) => (
          <Link
            href={`/admin/orders?search=${order.orderNumber}`}
            className="font-semibold text-primary hover:underline font-mono text-xs"
          >
            {order.orderNumber}
          </Link>
        ),
      },
      {
        key: 'customer',
        header: 'Customer',
        render: (order) => {
          const name = order.user?.name || order.email || 'Customer';
          return (
            <div>
              <div className="font-medium text-gray-900 truncate max-w-[180px]">{name}</div>
              {order.phone && <div className="text-xs text-gray-500">{order.phone}</div>}
            </div>
          );
        },
      },
      {
        key: 'createdAt',
        header: 'Date',
        render: (order) => (
          <span className="text-xs text-gray-600 tabular-nums">
            {formatDate(order.createdAt)}
          </span>
        ),
      },
      {
        key: 'items',
        header: 'Items',
        render: (order) => {
          const count =
            order.items?.reduce((sum, it) => sum + (it.quantity || 1), 0) ||
            order.items?.length ||
            1;
          return <span className="text-xs text-gray-600 tabular-nums">{count} items</span>;
        },
      },
      {
        key: 'finalAmount',
        header: 'Total',
        align: 'right',
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
    ],
    [],
  );

  if (statsError && !stats) {
    return (
      <div className="py-12">
        <AdminErrorState
          title="Failed to Load Dashboard"
          reason={statsError.message}
          onRetry={handleRefreshAll}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <PageHeader
        title="Admin Dashboard"
        description="Operational overview, fulfillment velocity, and authoritative commerce metrics"
        badge={
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-primary border border-blue-200">
            Live
          </span>
        }
        actions={
          <button
            type="button"
            onClick={handleRefreshAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
            title="Refresh dashboard metrics"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>
        }
      />

      {/* ── (1) NEEDS ATTENTION ROW ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
            Needs Attention
          </h2>
          <span className="text-xs text-gray-400">Action items requiring administrative response</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Pending Orders */}
          <Link
            href="/admin/orders?status=PENDING"
            className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-400 transition-colors group"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Pending Orders
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums group-hover:text-primary transition-colors">
                  {statsLoading ? '—' : formatNumber(stats?.pendingOrders || 0)}
                </p>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                  (stats?.pendingOrders || 0) > 0
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                {(stats?.pendingOrders || 0) > 0 ? 'Fulfill now' : 'Caught up'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">Awaiting fulfillment & dispatch</p>
          </Link>

          {/* New Inquiries */}
          <Link
            href="/admin/inquiries?status=PENDING"
            className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-400 transition-colors group"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  New Inquiries
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums group-hover:text-primary transition-colors">
                  {formatNumber(inquiriesData?.total || 0)}
                </p>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                  (inquiriesData?.total || 0) > 0
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                {(inquiriesData?.total || 0) > 0 ? 'Quote needed' : 'Caught up'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">B2B procurement requests</p>
          </Link>

          {/* Pending Withdrawals */}
          <Link
            href="/admin/affiliates"
            className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-400 transition-colors group"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Pending Payouts
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums group-hover:text-primary transition-colors">
                  {formatNumber(pendingWithdrawalsCount)}
                </p>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                  pendingWithdrawalsCount > 0
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                {pendingWithdrawalsCount > 0 ? 'Review now' : 'None pending'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">Affiliate withdrawal requests</p>
          </Link>

          {/* Low Stock Products */}
          <Link
            href="/admin/products?lowStock=true"
            className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-400 transition-colors group"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Low Stock
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums group-hover:text-primary transition-colors">
                  {statsLoading ? '—' : formatNumber(stats?.lowStockProducts || 0)}
                </p>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                  (stats?.lowStockProducts || 0) > 0
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
                }`}
              >
                {(stats?.lowStockProducts || 0) > 0 ? 'Restock' : 'Healthy'}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-2">Laptops with ≤ 5 units in inventory</p>
          </Link>
        </div>
      </div>

      {/* ── (2) KPI ROW ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500">
            Performance Metrics
          </h2>
          <span className="text-xs text-gray-400">Authoritative settled transaction volume</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Revenue */}
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Revenue
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1.5 font-mono tabular-nums">
              {statsLoading ? '—' : formatINR(revenueValue)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Settled online payments & completed COD
            </p>
          </div>

          {/* Orders */}
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Orders
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1.5 tabular-nums">
              {statsLoading ? '—' : formatNumber(ordersCount)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {stats?.ordersToday ? `${stats.ordersToday} placed today` : 'All time order volume'}
            </p>
          </div>

          {/* Average Order Value (AOV) */}
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Average Order Value
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1.5 font-mono tabular-nums">
              {statsLoading ? '—' : formatINR(aovValue)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Average cart ticket size across orders
            </p>
          </div>

          {/* Total Customers */}
          <div className="p-4 bg-white border border-gray-200 rounded-lg">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Total Customers
            </p>
            <p className="text-2xl font-bold text-gray-900 mt-1.5 tabular-nums">
              {statsLoading ? '—' : formatNumber(stats?.totalUsers || 0)}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {newUsersCount > 0 ? `${newUsersCount} registered in ${range}` : 'Verified platform users'}
            </p>
          </div>
        </div>
      </div>

      {/* ── (3) REVENUE & ORDERS CHART ── */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              {chartMetric === 'revenue' ? 'Revenue Timeline' : 'Order Volume Timeline'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Aggregated daily trends from authoritative database records
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Metric Toggle */}
            <div className="inline-flex rounded-md border border-gray-200 p-0.5 bg-gray-50 text-xs">
              <button
                type="button"
                onClick={() => setChartMetric('revenue')}
                className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer ${
                  chartMetric === 'revenue'
                    ? 'bg-white text-primary shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Revenue
              </button>
              <button
                type="button"
                onClick={() => setChartMetric('orders')}
                className={`px-2.5 py-1 rounded font-semibold transition-colors cursor-pointer ${
                  chartMetric === 'orders'
                    ? 'bg-white text-primary shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Orders
              </button>
            </div>

            {/* Range Selector */}
            <div className="inline-flex rounded-md border border-gray-200 p-0.5 bg-gray-50 text-xs">
              {(['7d', '30d', '90d'] as RangeOption[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRange(r)}
                  className={`px-2.5 py-1 rounded uppercase font-semibold transition-colors cursor-pointer ${
                    range === r
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SVG Chart */}
        <div className="pt-6 pb-2">
          {analyticsLoading ? (
            <div className="h-64 flex items-center justify-center text-xs text-gray-400 animate-pulse">
              Loading analytics chart...
            </div>
          ) : chartPoints.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center">
              <p className="text-sm font-semibold text-gray-700">No transactions recorded</p>
              <p className="text-xs text-gray-400 mt-1">
                Data will plot automatically as orders are placed.
              </p>
            </div>
          ) : (
            <div className="relative">
              {/* Geometry */}
              {(() => {
                const width = 800;
                const height = 220;
                const padLeft = 60;
                const padRight = 20;
                const padTop = 20;
                const padBottom = 35;
                const chartW = width - padLeft - padRight;
                const chartH = height - padTop - padBottom;
                const count = chartPoints.length;
                const stepX = count > 1 ? chartW / (count - 1) : chartW;

                const pts = chartPoints.map((item: any, idx: number) => {
                  const val = chartMetric === 'revenue' ? Number(item.amount || 0) : Number(item.count || 0);
                  const x = padLeft + idx * stepX;
                  const y = padTop + chartH - (maxChartVal > 0 ? (val / maxChartVal) * chartH : 0);
                  return { x, y, val, date: item.date };
                });

                const polylineStr = pts.map((p: any) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
                const polygonStr = `${padLeft},${padTop + chartH} ${polylineStr} ${padLeft + (count - 1) * stepX},${padTop + chartH}`;

                return (
                  <svg
                    viewBox={`0 0 ${width} ${height}`}
                    className="w-full h-auto overflow-visible select-none"
                    role="img"
                    aria-label="Revenue and Orders Chart"
                  >
                    {/* Horizontal Gridlines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                      const y = padTop + chartH * (1 - ratio);
                      const gridVal = maxChartVal * ratio;
                      return (
                        <g key={ratio}>
                          <line
                            x1={padLeft}
                            y1={y}
                            x2={width - padRight}
                            y2={y}
                            stroke="#E2E8F0"
                            strokeDasharray="3 3"
                            strokeWidth={1}
                          />
                          <text
                            x={padLeft - 8}
                            y={y + 3}
                            textAnchor="end"
                            className="text-[10px] fill-gray-400 font-mono"
                          >
                            {chartMetric === 'revenue'
                              ? formatINR(gridVal)
                              : Math.round(gridVal)}
                          </text>
                        </g>
                      );
                    })}

                    {/* Area Polygon */}
                    <polygon points={polygonStr} fill="#EFF6FF" />

                    {/* Clean Solid Line */}
                    <polyline
                      points={polylineStr}
                      fill="none"
                      stroke="#2563EB"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Interactive Points */}
                    {pts.map((pt: any, idx: number) => {
                      const isHovered = hoveredIdx === idx;
                      return (
                        <g key={pt.date}>
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={isHovered ? 5 : 3}
                            fill="#FFFFFF"
                            stroke="#2563EB"
                            strokeWidth={2}
                            className="cursor-pointer transition-all"
                            onMouseEnter={() => setHoveredIdx(idx)}
                            onMouseLeave={() => setHoveredIdx(null)}
                          />

                          {/* Date Label on X Axis */}
                          {(count <= 10 || idx % Math.ceil(count / 7) === 0) && (
                            <text
                              x={pt.x}
                              y={padTop + chartH + 18}
                              textAnchor="middle"
                              className="text-[10px] fill-gray-400 font-mono"
                            >
                              {pt.date.slice(5)}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                );
              })()}

              {/* Tooltip Overlay */}
              {hoveredIdx !== null && chartPoints[hoveredIdx] && (
                <div className="mt-2 text-center text-xs text-gray-600 bg-gray-50 border border-gray-200 py-1 px-3 rounded-md inline-block mx-auto">
                  <span className="font-semibold text-gray-900">
                    {chartPoints[hoveredIdx].date}:
                  </span>{' '}
                  <span className="font-mono text-primary font-bold">
                    {chartMetric === 'revenue'
                      ? formatINR((chartPoints[hoveredIdx] as any).amount || 0)
                      : `${(chartPoints[hoveredIdx] as any).count || 0} orders`}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── (4) RECENT ORDERS TABLE ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Recent Orders</h3>
            <p className="text-xs text-gray-500">Latest customer orders requiring processing</p>
          </div>
          <Link
            href="/admin/orders"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-blue-800 transition-colors"
          >
            <span>View all orders</span>
            <span>→</span>
          </Link>
        </div>

        <DataTable
          columns={orderColumns}
          data={recentOrders}
          keyExtractor={(order) => order.id}
          isLoading={recentOrdersLoading}
          error={recentOrdersError ? recentOrdersError.message : null}
          onRetry={refetchRecentOrders}
          emptyState={{
            title: 'No recent orders',
            description: 'Customer orders will appear here as purchases are completed.',
            action: {
              label: 'View Storefront',
              href: '/',
            },
          }}
        />
      </div>
    </div>
  );
}
