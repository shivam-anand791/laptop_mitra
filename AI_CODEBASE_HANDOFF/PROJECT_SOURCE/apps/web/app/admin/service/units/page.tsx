'use client';

import React, { Suspense, useState, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSoldUnits } from '../../../../lib/admin-queries';
import { formatDate } from '../../../../lib/format';
import PageHeader from '../../../../components/admin/PageHeader';
import DataTable, { Column } from '../../../../components/admin/DataTable';
import StatusBadge from '../../../../components/admin/StatusBadge';

function SoldUnitsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentStatus = searchParams.get('status') || 'ALL';
  const currentPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isLoading, error, refetch } = useSoldUnits({
    status: currentStatus === 'ALL' ? undefined : currentStatus,
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
        header: 'Serial Number',
        render: (item: any) => {
          const serial = item.serialNumber;
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
              {item.product?.name || item.modelSnapshot || 'Laptop'}
            </p>
            <p className="text-[11px] text-gray-500 font-mono">
              Brand: {item.brandSnapshot} • Unit {item.unitIndex}
            </p>
          </div>
        ),
      },
      {
        key: 'customer',
        header: 'Customer',
        render: (item: any) => {
          const user = item.user;
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
        header: 'Order Reference',
        render: (item: any) => {
          const order = item.orderItem?.order;
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
        key: 'dispatchedAt',
        header: 'Dispatched Date',
        render: (item: any) => (
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {item.dispatchedAt ? formatDate(item.dispatchedAt) : '—'}
          </span>
        ),
      },
      {
        key: 'warrantyCoverage',
        header: 'Warranty Status',
        render: (item: any) => {
          const warranty = item.warrantyCoverage;
          if (!warranty) {
            return <span className="text-[11px] text-gray-400">Not active</span>;
          }
          return <StatusBadge status={warranty.status} />;
        },
      },
      {
        key: 'status',
        header: 'Unit Status',
        render: (item: any) => <StatusBadge status={item.status} />,
      },
      {
        key: 'actions',
        header: 'Actions',
        render: (item: any) => {
          const serial = item.serialNumber;
          return serial ? (
            <Link
              href={`/admin/service/units/${encodeURIComponent(serial)}`}
              className="text-xs font-medium text-primary hover:underline"
            >
              View 360 →
            </Link>
          ) : (
            <span className="text-xs text-gray-400">—</span>
          );
        },
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sold Units Directory"
        description="Physical unit inventory tracking, serial assignment registry, and lifecycle records."
      />

      {/* Filter and Search Bar */}
      <div className="card p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search serial number, customer name, brand, model..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <select
              value={currentStatus}
              onChange={(e) => updateFilters({ status: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="ALL">All Unit Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="RETURNED">Returned</option>
              <option value="REFUNDED">Refunded</option>
              <option value="BOUGHT_BACK">Bought Back</option>
              <option value="REPLACED">Replaced</option>
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
          title: 'No Units Found',
          description: 'No laptops have been assigned serial numbers or dispatched yet.',
        }}
      />
    </div>
  );
}

export default function SoldUnitsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-gray-500">Loading sold units...</div>}>
      <SoldUnitsContent />
    </Suspense>
  );
}
