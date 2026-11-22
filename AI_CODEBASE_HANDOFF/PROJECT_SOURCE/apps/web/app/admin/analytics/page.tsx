'use client';

import React, { Suspense, useState, useTransition, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAdminAnalytics } from '../../../lib/admin-queries';
import { formatINR, formatDate, toNumber } from '../../../lib/format';
import PageHeader, { RangeOption } from '../../../components/admin/PageHeader';
import DataTable, { Column } from '../../../components/admin/DataTable';
import StatusBadge from '../../../components/admin/StatusBadge';
import AdminErrorState from '../../../components/admin/AdminErrorState';

interface TopProductItem {
  id: string;
  name: string;
  units: number;
  revenue: number;
}

function AnalyticsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const rawRange = searchParams.get('range');
  const currentRange: RangeOption = rawRange === '90d' || rawRange === '30d' ? rawRange : '7d';

  const [chartMode, setChartMode] = useState<'revenue' | 'orders'>('revenue');
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const handleRangeChange = (range: RangeOption) => {
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

  const {
    data,
    isLoading,
    error,
    refetch: refetchAnalytics,
  } = useAdminAnalytics({ range: currentRange });

  const totalRevenue = toNumber(data?.summary?.totalRevenue ?? data?.revenue?.total ?? 0);
  const totalOrders = toNumber(data?.summary?.totalOrders ?? data?.orders?.total ?? 0);
  const newUsers = toNumber(data?.summary?.totalNewUsers ?? data?.users?.newThisMonth ?? 0);
  const aov = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  const revenueByDay = useMemo(() => data?.revenueByDay ?? [], [data?.revenueByDay]);
  const ordersByDay = useMemo(() => data?.ordersByDay ?? [], [data?.ordersByDay]);
  const ordersByStatus = useMemo(() => data?.ordersByStatus ?? [], [data?.ordersByStatus]);
  const topProducts = useMemo(() => data?.topProducts ?? [], [data?.topProducts]);

  const activePoints = chartMode === 'revenue' ? revenueByDay : ordersByDay;
  const maxVal = useMemo(() => {
    if (!activePoints.length) return 1;
    const nums = activePoints.map((p: any) =>
      chartMode === 'revenue' ? Number(p.amount || 0) : Number(p.count || 0),
    );
    return Math.max(...nums, 1);
  }, [activePoints, chartMode]);

  // Columns for Top Selling Products DataTable
  const productColumns: Column<TopProductItem>[] = useMemo(
    () => [
      {
        key: 'name',
        header: 'Laptop Model',
        render: (item) => (
          <div>
            <div className="font-semibold text-gray-900 text-xs">{item.name}</div>
            <div className="text-[11px] text-gray-500 font-mono">ID: {item.id.slice(0, 8)}</div>
          </div>
        ),
      },
      {
        key: 'units',
        header: 'Units Sold',
        align: 'right',
        sortable: true,
        sortValue: (p) => p.units,
        render: (item) => (
          <span className="font-semibold text-gray-900 text-xs tabular-nums">
            {item.units} units
          </span>
        ),
      },
      {
        key: 'revenue',
        header: 'Total Revenue',
        align: 'right',
        sortable: true,
        sortValue: (p) => p.revenue,
        render: (item) => (
          <span className="font-bold text-gray-900 font-mono text-xs tabular-nums">
            {formatINR(item.revenue)}
          </span>
        ),
      },
    ],
    [],
  );

  if (error && !data) {
    return (
      <div className="py-12">
        <AdminErrorState
          title="Failed to Load Analytics"
          reason={error.message}
          onRetry={refetchAnalytics}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header with Range Selector */}
      <PageHeader
        title="Business Analytics"
        description="Aggregated revenue performance, fulfillment velocity, and customer growth"
        rangeSelector={{
          value: currentRange,
          onChange: handleRangeChange,
        }}
        actions={
          <button
            type="button"
            onClick={() => refetchAnalytics()}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Settled Revenue</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 font-mono tabular-nums">
            {isLoading ? '—' : formatINR(totalRevenue)}
          </p>
          <span className="text-[11px] text-gray-500">In selected {currentRange.toUpperCase()}</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Orders Placed</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">
            {isLoading ? '—' : totalOrders}
          </p>
          <span className="text-[11px] text-gray-500">Completed purchases</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Average Order Value</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 font-mono tabular-nums">
            {isLoading ? '—' : formatINR(aov)}
          </p>
          <span className="text-[11px] text-gray-500">Revenue per order</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">New User Signups</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">
            {isLoading ? '—' : newUsers}
          </p>
          <span className="text-[11px] text-gray-500">Accounts created in period</span>
        </div>
      </div>

      {/* Timeline Chart Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-200 mb-6">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              {chartMode === 'revenue' ? 'Revenue Timeline' : 'Order Volume Timeline'} ({currentRange.toUpperCase()})
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Daily aggregates from authoritative database transactions
            </p>
          </div>

          <div className="inline-flex rounded-md border border-gray-200 p-0.5 bg-gray-50 text-xs">
            <button
              type="button"
              onClick={() => setChartMode('revenue')}
              className={`px-3 py-1 rounded font-semibold transition-colors cursor-pointer ${
                chartMode === 'revenue'
                  ? 'bg-white text-primary shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Revenue (₹)
            </button>
            <button
              type="button"
              onClick={() => setChartMode('orders')}
              className={`px-3 py-1 rounded font-semibold transition-colors cursor-pointer ${
                chartMode === 'orders'
                  ? 'bg-white text-primary shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Order Count
            </button>
          </div>
        </div>

        {/* Clean SVG Chart */}
        {isLoading ? (
          <div className="h-64 flex items-center justify-center text-xs text-gray-400 animate-pulse">
            Loading analytics timeline...
          </div>
        ) : activePoints.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center">
            <p className="text-sm font-semibold text-gray-700">No activity recorded</p>
            <p className="text-xs text-gray-400 mt-1">Transactions will graph here as orders occur.</p>
          </div>
        ) : (
          <div className="relative">
            {(() => {
              const width = 800;
              const height = 240;
              const padLeft = 60;
              const padRight = 20;
              const padTop = 20;
              const padBottom = 35;
              const chartW = width - padLeft - padRight;
              const chartH = height - padTop - padBottom;
              const count = activePoints.length;
              const stepX = count > 1 ? chartW / (count - 1) : chartW;

              const pts = activePoints.map((item: any, idx: number) => {
                const val = chartMode === 'revenue' ? Number(item.amount || 0) : Number(item.count || 0);
                const x = padLeft + idx * stepX;
                const y = padTop + chartH - (maxVal > 0 ? (val / maxVal) * chartH : 0);
                return { x, y, val, date: item.date };
              });

              const polylineStr = pts.map((p: any) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
              const polygonStr = `${padLeft},${padTop + chartH} ${polylineStr} ${padLeft + (count - 1) * stepX},${padTop + chartH}`;

              return (
                <svg
                  viewBox={`0 0 ${width} ${height}`}
                  className="w-full h-auto overflow-visible select-none"
                  role="img"
                  aria-label="Performance trend chart"
                >
                  {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                    const y = padTop + chartH * (1 - ratio);
                    const gridVal = maxVal * ratio;
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
                          {chartMode === 'revenue' ? formatINR(gridVal) : Math.round(gridVal)}
                        </text>
                      </g>
                    );
                  })}

                  <polygon points={polygonStr} fill="#EFF6FF" />

                  <polyline
                    points={polylineStr}
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

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

            {hoveredIdx !== null && activePoints[hoveredIdx] && (
              <div className="mt-2 text-center text-xs text-gray-600 bg-gray-50 border border-gray-200 py-1 px-3 rounded-md inline-block mx-auto">
                <span className="font-semibold text-gray-900">{activePoints[hoveredIdx].date}:</span>{' '}
                <span className="font-mono text-primary font-bold">
                  {chartMode === 'revenue'
                    ? formatINR((activePoints[hoveredIdx] as any).amount || 0)
                    : `${(activePoints[hoveredIdx] as any).count || 0} orders`}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Split: Order Status Breakdown & Top-Selling Laptops */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown */}
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Order Status Breakdown</h3>
              <p className="text-xs text-gray-500">Distribution across fulfillment stages</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-primary border border-blue-200">
              {totalOrders} Orders
            </span>
          </div>

          {ordersByStatus.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400">
              No orders recorded in this time range.
            </div>
          ) : (
            <div className="space-y-3">
              {ordersByStatus.map((item) => {
                const pct = totalOrders > 0 ? ((item.count / totalOrders) * 100).toFixed(1) : '0';
                return (
                  <div key={item.status} className="flex items-center justify-between py-1 border-b border-gray-100 last:border-0">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={item.status} size="sm" />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900 text-xs tabular-nums">
                        {item.count} orders
                      </span>
                      <span className="text-xs text-gray-400 font-mono w-12 text-right tabular-nums">
                        {pct}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top-Selling Laptops DataTable */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Top-Selling Laptops</h3>
              <p className="text-xs text-gray-500">Ranked by volume in this period</p>
            </div>
          </div>

          <DataTable
            columns={productColumns}
            data={topProducts}
            keyExtractor={(prod) => prod.id || prod.name}
            emptyState={{
              title: 'No sales data',
              description: 'No laptops have been purchased during this time range.',
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 animate-pulse">
          <div className="h-10 bg-gray-200 rounded w-48" />
          <div className="h-72 bg-gray-200 rounded-lg" />
        </div>
      }
    >
      <AnalyticsPageContent />
    </Suspense>
  );
}
