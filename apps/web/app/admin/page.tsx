'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useAdminStats, useAdminRecentOrders } from '../../lib/admin-queries';
import { formatINR, formatNumber, formatDate } from '../../lib/format';
import { QueryState } from '../../components/admin/QueryState';
import { AdminOrder } from '../../lib/types';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  icon: React.ReactNode;
  bgColor?: string;
  href: string;
  badge?: React.ReactNode;
}

function StatCard({
  title,
  value,
  change,
  icon,
  bgColor = 'bg-blue-100 dark:bg-blue-900/30',
  href,
  badge,
}: StatCardProps) {
  return (
    <Link
      href={href}
      className="card group hover:border-blue-500/50 hover:shadow-md transition-all duration-200 block"
    >
      <div className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 truncate uppercase tracking-wider">
                {title}
              </p>
              {badge}
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1.5 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {value}
            </p>
            {change && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
                {change}
              </p>
            )}
          </div>
          <div className={`p-3 rounded-xl shrink-0 ${bgColor} group-hover:scale-105 transition-transform duration-200`}>
            {icon}
          </div>
        </div>
      </div>
    </Link>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
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

function PaymentStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: 'badge-warning',
    PROCESSING: 'badge-info',
    COMPLETED: 'badge-success',
    FAILED: 'badge-danger',
    REFUNDED: 'badge-gray',
  };
  return <span className={`badge ${styles[status] || 'badge-gray'}`}>{status}</span>;
}

function UsersIcon() {
  return (
    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function ProductsIcon() {
  return (
    <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

function OrdersIcon() {
  return (
    <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function AlertTriangleIcon() {
  return (
    <svg className="w-5 h-5 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" role="status" aria-label="Loading dashboard metrics">
      {/* Stat Cards Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card p-5 space-y-3">
            <div className="flex justify-between items-center">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl" />
            </div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
          </div>
        ))}
      </div>

      {/* Revenue Section Skeleton */}
      <div className="card p-6 space-y-4">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-28 bg-gray-100 dark:bg-gray-800 rounded-xl" />
          <div className="h-28 bg-gray-100 dark:bg-gray-800 rounded-xl" />
        </div>
      </div>

      {/* Recent Orders Skeleton */}
      <div className="card p-6 space-y-4">
        <div className="flex justify-between">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-24" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-100 dark:bg-gray-800 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const {
    data: stats,
    isLoading: statsLoading,
    isFetching: statsFetching,
    error: statsError,
    dataUpdatedAt,
    refetch: refetchStats,
  } = useAdminStats({ refetchInterval: 60000 });

  const {
    data: recentOrdersData,
    isLoading: recentOrdersLoading,
    isFetching: recentOrdersFetching,
    refetch: refetchRecentOrders,
  } = useAdminRecentOrders(5);

  const handleRefresh = () => {
    refetchStats();
    refetchRecentOrders();
  };

  const isRefreshing = statsFetching || recentOrdersFetching;

  const recentOrders: AdminOrder[] = useMemo(() => {
    if (!recentOrdersData) return [];
    if (Array.isArray(recentOrdersData)) return recentOrdersData;
    return (recentOrdersData as { items?: AdminOrder[] }).items || [];
  }, [recentOrdersData]);

  const lastUpdatedText = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : 'Just now';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
            <span className="badge badge-primary text-[10px] uppercase font-semibold">Live</span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Authoritative PostgreSQL backend statistics · Last updated: <span className="font-medium text-gray-700 dark:text-gray-300">{lastUpdatedText}</span> (auto-refreshes every 60s)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn btn-secondary text-xs flex items-center gap-1.5"
            title="Refresh metrics from backend"
          >
            <span className={`inline-block ${isRefreshing ? 'animate-spin' : ''}`}>↻</span>
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      <QueryState
        isLoading={statsLoading}
        error={statsError}
        onRetry={handleRefresh}
        emptyTitle="No Statistics Available"
        emptyMessage="Unable to calculate administrative metrics at this moment."
      >
        {stats ? (
          <div className="space-y-6">
            {/* Stat Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard
                title="Total Users"
                value={formatNumber(stats.totalUsers)}
                href="/admin/users"
                change="Customer & partner accounts"
                icon={<UsersIcon />}
                bgColor="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
              />
              <StatCard
                title="Total Products"
                value={formatNumber(stats.totalProducts)}
                href="/admin/products"
                change="Catalog inventory items"
                icon={<ProductsIcon />}
                bgColor="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
              />
              <StatCard
                title="Total Orders"
                value={formatNumber(stats.totalOrders)}
                href="/admin/orders"
                change={stats.ordersToday > 0 ? `${formatNumber(stats.ordersToday)} placed today` : 'All recorded orders'}
                icon={<OrdersIcon />}
                bgColor="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
              />
              <StatCard
                title="Pending Orders"
                value={formatNumber(stats.pendingOrders)}
                href="/admin/orders?status=PENDING"
                change={stats.pendingOrders > 0 ? `${stats.pendingOrders} awaiting fulfillment` : 'All caught up'}
                badge={
                  stats.pendingOrders > 0 ? (
                    <span className="badge badge-warning text-[10px] px-1.5 py-0.5">Requires attention</span>
                  ) : null
                }
                icon={<ClockIcon />}
                bgColor="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
              />
              <StatCard
                title="Delivered Orders"
                value={formatNumber(stats.deliveredOrders)}
                href="/admin/orders?status=DELIVERED"
                change="Successfully completed"
                icon={<CheckCircleIcon />}
                bgColor="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
              />
              <StatCard
                title="Low Stock Products"
                value={formatNumber(stats.lowStockProducts)}
                href="/admin/products?lowStock=true"
                change={
                  stats.lowStockProducts > 0
                    ? `${stats.lowStockProducts} items with ≤ 5 units`
                    : 'Healthy stock levels'
                }
                badge={
                  stats.lowStockProducts > 0 ? (
                    <span className="badge badge-danger text-[10px] px-1.5 py-0.5">Critical</span>
                  ) : null
                }
                icon={<AlertTriangleIcon />}
                bgColor="bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"
              />
            </div>

            {/* Revenue Section */}
            <div className="card">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Financial Overview</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Authoritative settled and pipeline transaction volume</p>
                  </div>
                  <Link href="/admin/analytics" className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium">
                    <span>View Analytics</span>
                    <span>→</span>
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-green-50 dark:bg-green-950/20 p-5 rounded-xl border border-green-200 dark:border-green-800/40">
                    <p className="text-xs uppercase font-bold tracking-wider text-green-700 dark:text-green-400 mb-1">
                      Delivered & Completed Revenue
                    </p>
                    <p className="text-3xl font-black text-green-800 dark:text-green-300">
                      {formatINR(stats.revenueCompleted ?? stats.revenue?.completed ?? 0)}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-500 mt-2">
                      Settled through verified online payments & completed COD deliveries.
                    </p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950/20 p-5 rounded-xl border border-amber-200 dark:border-amber-800/40">
                    <p className="text-xs uppercase font-bold tracking-wider text-amber-700 dark:text-amber-400 mb-1">
                      Pending Orders Pipeline
                    </p>
                    <p className="text-3xl font-black text-amber-800 dark:text-amber-300">
                      {formatINR(stats.revenuePending ?? stats.revenue?.pending ?? 0)}
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-2">
                      Orders in confirmed, processing, or shipment states pending final settlement.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Orders Section */}
            <div className="card">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Orders</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Latest 5 orders placed across website and mobile apps</p>
                  </div>
                  <Link
                    href="/admin/orders"
                    className="btn btn-secondary text-xs flex items-center gap-1.5 font-medium"
                  >
                    <span>View all orders</span>
                    <span>→</span>
                  </Link>
                </div>

                {recentOrdersLoading ? (
                  <div className="space-y-3 py-4">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full animate-pulse" />
                    <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded w-full animate-pulse" />
                    <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded w-full animate-pulse" />
                    <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded w-full animate-pulse" />
                  </div>
                ) : recentOrders.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                    No recent orders found.
                  </div>
                ) : (
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Order #</th>
                          <th>Customer</th>
                          <th>Date</th>
                          <th>Items</th>
                          <th>Total</th>
                          <th>Status</th>
                          <th>Payment</th>
                          <th className="text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentOrders.map((order) => {
                          const customerName = order.user?.name || order.email || 'Guest';
                          const itemsCount =
                            order.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) ||
                            order.items?.length ||
                            0;
                          return (
                            <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                              <td className="font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                                <Link href={`/admin/orders?search=${order.orderNumber}`} className="hover:underline">
                                  {order.orderNumber}
                                </Link>
                              </td>
                              <td>
                                <div className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[180px]">
                                  {customerName}
                                </div>
                                {order.phone && (
                                  <div className="text-xs text-gray-500 dark:text-gray-400">{order.phone}</div>
                                )}
                              </td>
                              <td className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                {formatDate(order.createdAt)}
                              </td>
                              <td className="text-xs text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                {itemsCount} {itemsCount === 1 ? 'item' : 'items'}
                              </td>
                              <td className="font-bold text-gray-900 dark:text-white whitespace-nowrap">
                                {formatINR(order.finalAmount)}
                              </td>
                              <td>
                                <OrderStatusBadge status={order.status} />
                              </td>
                              <td>
                                <PaymentStatusBadge status={order.paymentStatus} />
                              </td>
                              <td className="text-right whitespace-nowrap">
                                <Link
                                  href={`/admin/orders?search=${order.orderNumber}`}
                                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                  Details
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Management Actions */}
            <div className="card">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Management Actions</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Link href="/admin/products" className="btn btn-secondary justify-center text-center">
                    Catalog & Stock
                  </Link>
                  <Link href="/admin/orders" className="btn btn-secondary justify-center text-center">
                    Manage Orders
                  </Link>
                  <Link href="/admin/users" className="btn btn-secondary justify-center text-center">
                    User Accounts
                  </Link>
                  <Link href="/admin/analytics" className="btn btn-secondary justify-center text-center">
                    Sales Analytics
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <DashboardSkeleton />
        )}
      </QueryState>
    </div>
  );
}
