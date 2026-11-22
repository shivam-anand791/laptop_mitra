'use client';

import React, { Suspense, useState, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useWarrantyRegister } from '../../../../lib/admin-queries';
import { formatDate } from '../../../../lib/format';
import PageHeader from '../../../../components/admin/PageHeader';
import DataTable, { Column } from '../../../../components/admin/DataTable';
import StatusBadge from '../../../../components/admin/StatusBadge';

function WarrantyRegisterContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentStatus = searchParams.get('status') || 'ALL';
  const currentSource = searchParams.get('source') || 'ALL';
  const currentPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading, error, refetch } = useWarrantyRegister({
    status: currentStatus === 'ALL' ? undefined : currentStatus,
    source: currentSource === 'ALL' ? undefined : currentSource,
    search: searchTerm.trim() || undefined,
    page: currentPage,
    pageSize: 15,
  });

  const updateFilters = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([k, v]) => {
      if (v === 'ALL' || !v) {
        params.delete(k);
      } else {
        params.set(k, v);
      }
    });
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    router.push(`${pathname}?${params.toString()}`);
  };

  const items = data?.items || [];
  const total = data?.total || 0;

  const columns: Column<any>[] = useMemo(
    () => [
      {
        key: 'serialNumber',
        header: 'Unit Serial',
        render: (item: any) => {
          const serial = item.soldUnit?.serialNumber;
          return serial ? (
            <Link
              href={`/admin/service/units/${encodeURIComponent(serial)}`}
              className="font-mono text-xs font-bold text-primary hover:underline bg-primary/10 dark:bg-primary/20 px-2 py-1 rounded inline-block"
            >
              {serial}
            </Link>
          ) : (
            <span className="font-mono text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded">
              No Serial (Override)
            </span>
          );
        },
      },
      {
        key: 'product',
        header: 'Product / Model',
        render: (item: any) => (
          <div className="space-y-0.5">
            <p className="font-medium text-gray-900 dark:text-white text-xs">
              {item.soldUnit?.product?.name || item.soldUnit?.modelSnapshot || 'Laptop'}
            </p>
            <p className="text-[11px] text-gray-500 font-mono">
              Brand: {item.soldUnit?.brandSnapshot || '—'}
            </p>
          </div>
        ),
      },
      {
        key: 'customer',
        header: 'Customer',
        render: (item: any) => {
          const user = item.soldUnit?.user;
          return (
            <div className="space-y-0.5 text-xs">
              <Link
                href={`/admin/users/${user?.id || ''}`}
                className="font-medium text-gray-900 dark:text-white hover:text-primary"
              >
                {user?.name || 'Customer'}
              </Link>
              <p className="text-[11px] text-gray-500">{user?.phone || user?.email || '—'}</p>
            </div>
          );
        },
      },
      {
        key: 'order',
        header: 'Order',
        render: (item: any) => {
          const order = item.soldUnit?.orderItem?.order;
          return order ? (
            <Link
              href={`/admin/orders/${order.id}`}
              className="text-xs font-mono text-primary hover:underline"
            >
              #{order.orderNumber || order.id.slice(-8)}
            </Link>
          ) : (
            <span className="text-gray-400 text-xs">—</span>
          );
        },
      },
      {
        key: 'source',
        header: 'Coverage Source',
        render: (item: any) => (
          <span
            className={`text-[11px] px-2 py-0.5 rounded font-semibold ${
              item.source === 'EXTENDED'
                ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
            }`}
          >
            {item.source} ({item.termsSnapshotMonths || 6}m)
          </span>
        ),
      },
      {
        key: 'dates',
        header: 'Valid Period',
        render: (item: any) => (
          <div className="text-xs space-y-0.5">
            <p className="text-gray-600 dark:text-gray-400">
              {formatDate(item.startDate)} → {formatDate(item.endDate)}
            </p>
          </div>
        ),
      },
      {
        key: 'remaining',
        header: 'Days Left',
        render: (item: any) => {
          const msLeft = new Date(item.endDate).getTime() - Date.now();
          const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
          if (item.status === 'EXPIRED' || daysLeft <= 0) {
            return (
              <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                Expired {Math.abs(daysLeft)}d ago
              </span>
            );
          }
          if (daysLeft <= 30) {
            return (
              <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                {daysLeft} days remaining
              </span>
            );
          }
          return (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {daysLeft} days remaining
            </span>
          );
        },
      },
      {
        key: 'status',
        header: 'Status',
        render: (item: any) => <StatusBadge status={item.status} />,
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Warranty Register"
        description="Central ledger of active, expired, and extended laptop warranty coverages."
      />

      {/* Filter and Search Bar */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="sm:col-span-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search serial number, customer, model..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <select
              value={currentStatus}
              onChange={(e) => updateFilters({ status: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Coverage</option>
              <option value="EXPIRED">Expired</option>
              <option value="VOIDED">Voided</option>
            </select>
          </div>

          <div>
            <select
              value={currentSource}
              onChange={(e) => updateFilters({ source: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="ALL">All Coverage Sources</option>
              <option value="BASE">Base (6 Months)</option>
              <option value="EXTENDED">Extended Warranty</option>
            </select>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={items}
        keyExtractor={(item: any) => item.id}
        isLoading={isLoading}
        pagination={{
          currentPage,
          totalItems: total,
          pageSize: 15,
          onPageChange: handlePageChange,
        }}
        emptyState={{
          title: 'No Warranty Records Found',
          description: 'No laptops match the chosen warranty criteria or have been delivered yet.',
        }}
      />
    </div>
  );
}

export default function WarrantyRegisterPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-gray-500">Loading warranty register...</div>}>
      <WarrantyRegisterContent />
    </Suspense>
  );
}
