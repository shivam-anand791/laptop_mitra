'use client';

import React, { Suspense, useState, useTransition, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAdminAnalytics } from '../../../lib/admin-queries';
import { formatINR, formatDate, toNumber } from '../../../lib/format';
import { QueryState } from '../../../components/admin/QueryState';

type AnalyticsRange = '7d' | '30d' | '90d';

const VALID_RANGES: AnalyticsRange[] = ['7d', '30d', '90d'];

const RANGE_LABELS: Record<AnalyticsRange, string> = {
  '7d': 'Past 7 Days',
  '30d': 'Past 30 Days',
  '90d': 'Past 90 Days',
};

// ---------------------------------------------------------------------------
// Stat Card Component
// ---------------------------------------------------------------------------

function StatCard({
  title,
  value,
  subtext,
  icon,
}: {
  title: string;
  value: string | number;
  subtext?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1 pr-3">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1.5 truncate">
            {value}
          </p>
          {subtext && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
              {subtext}
            </p>
          )}
        </div>
        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400 shrink-0">
          {icon}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading Skeleton Fallback (Prevents layout shift)
// ---------------------------------------------------------------------------

function AnalyticsLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-label="Loading analytics data">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 bg-gray-200 dark:bg-gray-800 rounded w-52" />
          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-64" />
        </div>
        <div className="h-10 bg-gray-200 dark:bg-gray-800 rounded-xl w-60" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
        ))}
      </div>

      <div className="h-80 bg-gray-200 dark:bg-gray-800 rounded-2xl" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-72 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
        <div className="h-72 bg-gray-200 dark:bg-gray-800 rounded-2xl" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SVG Timeline Chart (Revenue & Orders)
// ---------------------------------------------------------------------------

function RevenueTimelineChart({
  revenueData,
  ordersData,
  mode,
}: {
  revenueData: Array<{ date: string; amount: number }>;
  ordersData: Array<{ date: string; count: number }>;
  mode: 'revenue' | 'orders';
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const values = mode === 'revenue'
    ? revenueData.map((d) => d.amount)
    : ordersData.map((d) => d.count);

  const maxValue = Math.max(...values, 0);
  const totalValue = values.reduce((sum, v) => sum + v, 0);

  // If there's no activity across all days in range
  if (maxValue === 0 || totalValue === 0) {
    return (
      <div className="py-16 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 text-gray-400 flex items-center justify-center mx-auto mb-3 text-xl">
          📊
        </div>
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          No {mode === 'revenue' ? 'revenue' : 'order'} transactions recorded in this period
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Activity will automatically graph here as completed customer purchases occur.
        </p>
      </div>
    );
  }

  // SVG Chart Geometry
  const width = 800;
  const height = 240;
  const paddingX = 40;
  const paddingTop = 25;
  const paddingBottom = 40;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingTop - paddingBottom;

  const count = revenueData.length;
  const stepX = count > 1 ? chartWidth / (count - 1) : chartWidth;

  const points = values.map((val, idx) => {
    const x = paddingX + idx * stepX;
    const y = paddingTop + chartHeight - (maxValue > 0 ? (val / maxValue) * chartHeight : 0);
    return { x, y, val, date: revenueData[idx]?.date || '' };
  });

  const polylinePoints = points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPoints = `${paddingX},${paddingTop + chartHeight} ${polylinePoints} ${
    paddingX + (count - 1) * stepX
  },${paddingTop + chartHeight}`;

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto overflow-visible select-none"
        aria-label={`${mode === 'revenue' ? 'Revenue' : 'Orders'} trend over time`}
        role="img"
      >
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563EB" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = paddingTop + chartHeight * (1 - ratio);
          const gridVal = maxValue * ratio;
          return (
            <g key={ratio}>
              <line
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke="currentColor"
                strokeDasharray="4 4"
                className="text-gray-200 dark:text-gray-800"
                strokeWidth={1}
              />
              <text
                x={paddingX - 8}
                y={y + 3}
                textAnchor="end"
                className="text-[10px] fill-gray-400 dark:fill-gray-500 font-mono"
              >
                {mode === 'revenue' ? formatINR(gridVal) : Math.round(gridVal)}
              </text>
            </g>
          );
        })}

        {/* Gradient Area Fill */}
        <polygon points={areaPoints} fill="url(#chartGradient)" />

        {/* Solid Line Path */}
        <polyline
          fill="none"
          stroke="#2563EB"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          points={polylinePoints}
        />

        {/* Interactive Data Points & Hover Targets */}
        {points.map((p, idx) => {
          const isHovered = hoveredIdx === idx;
          // Step skip for dense ranges (e.g. 30d, 90d)
          const skipLabel = count > 14 && idx % Math.ceil(count / 7) !== 0 && idx !== count - 1;

          return (
            <g key={idx}>
              {/* Point circle */}
              <circle
                cx={p.x}
                cy={p.y}
                r={isHovered ? 6 : count > 30 ? 2 : 3.5}
                className="fill-white dark:fill-gray-900 stroke-blue-600 dark:stroke-blue-400 transition-all duration-150"
                strokeWidth={isHovered ? 3 : 2}
              />

              {/* Invisible large target for mouse hover */}
              <rect
                x={p.x - stepX / 2}
                y={paddingTop}
                width={stepX}
                height={chartHeight + paddingBottom}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />

              {/* X-axis date labels */}
              {!skipLabel && (
                <text
                  x={p.x}
                  y={height - 12}
                  textAnchor="middle"
                  className="text-[10px] fill-gray-500 dark:fill-gray-400 font-mono"
                >
                  {formatDate(p.date, { day: 'numeric', month: 'short' })}
                </text>
              )}
            </g>
          );
        })}

        {/* Active Hover Guide and Tooltip */}
        {hoveredIdx !== null && points[hoveredIdx] && (
          <g>
            <line
              x1={points[hoveredIdx].x}
              y1={paddingTop}
              x2={points[hoveredIdx].x}
              y2={paddingTop + chartHeight}
              stroke="#2563EB"
              strokeWidth={1.5}
              strokeDasharray="2 2"
            />
          </g>
        )}
      </svg>

      {/* Floating HTML Tooltip */}
      {hoveredIdx !== null && points[hoveredIdx] && (
        <div
          className="absolute z-20 pointer-events-none -translate-x-1/2 bg-gray-900 dark:bg-gray-800 text-white text-xs py-1.5 px-3 rounded-lg shadow-lg border border-gray-700"
          style={{
            left: `${(points[hoveredIdx].x / width) * 100}%`,
            top: '0px',
          }}
        >
          <div className="font-semibold text-gray-200">
            {formatDate(points[hoveredIdx].date, { weekday: 'short', day: 'numeric', month: 'short' })}
          </div>
          <div className="text-blue-400 font-bold mt-0.5">
            {mode === 'revenue'
              ? formatINR(points[hoveredIdx].val)
              : `${points[hoveredIdx].val} orders`}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Orders by Status Breakdown Component
// ---------------------------------------------------------------------------

function StatusDistributionChart({
  statusData,
  totalOrders,
}: {
  statusData: Array<{ status: string; count: number }>;
  totalOrders: number;
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return { bg: 'bg-green-500', fill: '#16A34A', text: 'text-green-600 dark:text-green-400' };
      case 'CONFIRMED':
      case 'SHIPPING':
        return { bg: 'bg-blue-500', fill: '#2563EB', text: 'text-blue-600 dark:text-blue-400' };
      case 'PENDING':
        return { bg: 'bg-amber-500', fill: '#D97706', text: 'text-amber-600 dark:text-amber-400' };
      case 'CANCELLED':
      case 'REFUNDED':
        return { bg: 'bg-red-500', fill: '#DC2626', text: 'text-red-600 dark:text-red-400' };
      default:
        return { bg: 'bg-gray-400', fill: '#94A3B8', text: 'text-gray-600 dark:text-gray-400' };
    }
  };

  if (statusData.length === 0 || totalOrders === 0) {
    return (
      <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
        No orders placed during this period.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Visual Proportional Bar */}
      <div
        className="h-3 w-full rounded-full overflow-hidden flex bg-gray-100 dark:bg-gray-800"
        role="progressbar"
        aria-label="Order status breakdown"
      >
        {statusData.map((item) => {
          const pct = totalOrders > 0 ? (item.count / totalOrders) * 100 : 0;
          if (pct === 0) return null;
          const { bg } = getStatusColor(item.status);
          return (
            <div
              key={item.status}
              style={{ width: `${pct}%` }}
              className={`${bg} h-full transition-all duration-300 first:rounded-l-full last:rounded-r-full`}
              title={`${item.status}: ${item.count} (${pct.toFixed(1)}%)`}
            />
          );
        })}
      </div>

      {/* Breakdown List */}
      <div className="space-y-2.5 pt-2">
        {statusData.map((item) => {
          const pct = totalOrders > 0 ? ((item.count / totalOrders) * 100).toFixed(1) : '0';
          const { bg, text } = getStatusColor(item.status);
          return (
            <div
              key={item.status}
              className="flex items-center justify-between text-sm py-1 border-b border-gray-100 dark:border-gray-800/80 last:border-0"
            >
              <div className="flex items-center space-x-2.5">
                <span className={`w-2.5 h-2.5 rounded-full ${bg} shrink-0`} aria-hidden="true" />
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {item.status}
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <span className={`font-bold ${text}`}>{item.count}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 w-12 text-right">
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Analytics Content Component
// ---------------------------------------------------------------------------

function AnalyticsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  // 1. Read range from URL
  const rawRange = searchParams.get('range');
  const currentRange: AnalyticsRange = VALID_RANGES.includes(rawRange as AnalyticsRange)
    ? (rawRange as AnalyticsRange)
    : '7d';

  const [chartMode, setChartMode] = useState<'revenue' | 'orders'>('revenue');
  const [showDataTable, setShowDataTable] = useState(false);

  // Range Selector Handler (URL-driven)
  const handleRangeChange = (range: AnalyticsRange) => {
    if (range === currentRange) return;
    const params = new URLSearchParams(searchParams.toString());
    if (range === '7d') {
      params.delete('range');
    } else {
      params.set('range', range);
    }

    startTransition(() => {
      const qs = params.toString();
      router.push(pathname + (qs ? `?${qs}` : ''), { scroll: false });
    });
  };

  // 2. Query authoritative data from GET /admin/analytics?range=...
  const {
    data,
    isLoading,
    error,
    refetch: refetchAnalytics,
  } = useAdminAnalytics({ range: currentRange });

  // Normalize response
  const totalRevenue = toNumber(data?.summary?.totalRevenue ?? data?.revenue?.total ?? 0);
  const totalOrders = toNumber(data?.summary?.totalOrders ?? data?.orders?.total ?? 0);
  const newUsers = toNumber(data?.summary?.totalNewUsers ?? data?.users?.newThisMonth ?? 0);
  const conversionRate = data?.orders?.conversionRate ?? 0;
  const lowStockCount = data?.products?.lowStock ?? 0;

  const revenueByDay = useMemo(() => data?.revenueByDay ?? [], [data?.revenueByDay]);
  const ordersByDay = useMemo(() => data?.ordersByDay ?? [], [data?.ordersByDay]);
  const ordersByStatus = useMemo(() => data?.ordersByStatus ?? [], [data?.ordersByStatus]);
  const topProducts = useMemo(() => data?.topProducts ?? [], [data?.topProducts]);

  return (
    <div className="space-y-6">
      {/* Header and URL-driven Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Business Analytics</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Aggregated revenue performance, fulfillment velocity, and customer growth
          </p>
        </div>

        {/* Range Buttons & Refresh */}
        <div className="flex items-center space-x-2">
          <div
            className="inline-flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700"
            role="group"
            aria-label="Analytics date range selector"
          >
            {VALID_RANGES.map((range) => {
              const active = currentRange === range;
              return (
                <button
                  key={range}
                  onClick={() => handleRangeChange(range)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                    active
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                  aria-pressed={active}
                >
                  {range.toUpperCase()}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => refetchAnalytics()}
            className="btn btn-secondary text-xs flex items-center space-x-1.5 py-1.5 px-2.5"
            title="Refresh analytics data"
            aria-label="Refresh analytics data"
          >
            <span>↻</span>
          </button>
        </div>
      </div>

      <QueryState
        isLoading={isLoading}
        error={error}
        isEmpty={false}
        onRetry={refetchAnalytics}
      >
        {/* KPI Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title={`Revenue (${RANGE_LABELS[currentRange]})`}
            value={formatINR(totalRevenue)}
            subtext="Settled online & COD transactions"
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-2.21 0-4.21.78-5.83 2.15L5 12l1.17 1.85A7.954 7.954 0 0012 16c2.21 0 4.21-.78 5.83-2.15L19 12l-1.17-1.85A7.954 7.954 0 0012 8z" />
              </svg>
            }
          />
          <StatCard
            title={`Orders Placed`}
            value={totalOrders}
            subtext={`${conversionRate}% completion rate`}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            }
          />
          <StatCard
            title="New User Signups"
            value={newUsers}
            subtext={`Registered in ${currentRange}`}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            }
          />
          <StatCard
            title="Inventory Watch"
            value={data?.products?.total ?? 0}
            subtext={lowStockCount > 0 ? `${lowStockCount} items low stock (≤5)` : 'Stock healthy across catalog'}
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
          />
        </div>

        {/* Timeline Chart Card */}
        <div className="card p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">
                Performance Over Time ({RANGE_LABELS[currentRange]})
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Daily sales and order count aggregates from authoritative database records
              </p>
            </div>

            {/* Toggle between Revenue and Orders + Toggle Data Table */}
            <div className="flex items-center space-x-2">
              <div className="inline-flex bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg border border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setChartMode('revenue')}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-all ${
                    chartMode === 'revenue'
                      ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'
                  }`}
                  aria-pressed={chartMode === 'revenue'}
                >
                  Revenue (₹)
                </button>
                <button
                  onClick={() => setChartMode('orders')}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-md transition-all ${
                    chartMode === 'orders'
                      ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'
                  }`}
                  aria-pressed={chartMode === 'orders'}
                >
                  Order Count
                </button>
              </div>

              <button
                onClick={() => setShowDataTable(!showDataTable)}
                className="btn btn-secondary text-xs px-2.5 py-1"
                aria-expanded={showDataTable}
              >
                {showDataTable ? 'Hide Table' : 'Data Table'}
              </button>
            </div>
          </div>

          {/* Accessible SVG Line Chart */}
          <RevenueTimelineChart
            revenueData={revenueByDay}
            ordersData={ordersByDay}
            mode={chartMode}
          />

          {/* Accessible Data Table Fallback */}
          {showDataTable && (
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-800">
              <h3 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                Tabular Daily Breakdown
              </h3>
              <div className="table-container max-h-60 overflow-y-auto">
                <table className="table min-w-full text-xs">
                  <thead>
                    <tr>
                      <th scope="col">Date</th>
                      <th scope="col">Settled Revenue</th>
                      <th scope="col">Orders Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {revenueByDay.map((r, i) => (
                      <tr key={r.date}>
                        <td className="font-mono text-gray-700 dark:text-gray-300">
                          {formatDate(r.date)}
                        </td>
                        <td className="font-semibold text-gray-900 dark:text-white">
                          {formatINR(r.amount)}
                        </td>
                        <td className="text-gray-600 dark:text-gray-400">
                          {ordersByDay[i]?.count ?? 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Split: Orders by Status & Top Products */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Order Status Distribution */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  Order Status Breakdown
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Distribution across fulfillment lifecycle
                </p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300">
                {totalOrders} Total Orders
              </span>
            </div>

            <StatusDistributionChart
              statusData={ordersByStatus}
              totalOrders={totalOrders}
            />
          </div>

          {/* Top Selling Products */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  Top-Selling Laptops
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Ranked by units sold in this time range
                </p>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300">
                Best Sellers
              </span>
            </div>

            {topProducts.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                No laptops sold during this period.
              </div>
            ) : (
              <div className="space-y-3">
                {topProducts.map((prod, idx) => (
                  <div
                    key={prod.id || prod.name}
                    className="flex items-center justify-between text-sm py-2 border-b border-gray-100 dark:border-gray-800/80 last:border-0"
                  >
                    <div className="flex items-center space-x-3 min-w-0 pr-3">
                      <span
                        className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                          idx === 0
                            ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                            : idx === 1
                              ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                              : idx === 2
                                ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        #{idx + 1}
                      </span>
                      <div className="min-w-0 truncate">
                        <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                          {prod.name}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                          {prod.units} units sold
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-gray-900 dark:text-white">
                        {formatINR(prod.revenue)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </QueryState>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Export with Suspense Wrapper for Next.js App Router useSearchParams
// ---------------------------------------------------------------------------

export default function AdminAnalyticsPage() {
  return (
    <Suspense fallback={<AnalyticsLoadingSkeleton />}>
      <AnalyticsPageContent />
    </Suspense>
  );
}
