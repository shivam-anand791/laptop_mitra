'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatINR, formatNumber } from '@/lib/format';
import PageHeader from '@/components/admin/PageHeader';
import DataTable, { Column } from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';

interface AffiliateItem {
  id: string;
  name: string | null;
  email: string | null;
  referralCode: string | null;
  referralTier: string | null;
  totalEarnings: number;
  reservedBalance: number;
  withdrawnBalance: number;
  availableBalance: number;
  linkClicks: number;
  createdAt: string;
  totalWithdrawalsCount: number;
  pendingWithdrawalsCount: number;
}

export default function AdminAffiliatesPage() {
  const [affiliates, setAffiliates] = useState<AffiliateItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchAffiliates = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAdminAffiliates({
        page,
        pageSize,
        search: debouncedSearch || undefined,
      });
      const items = (data?.items || []).map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        referralCode: u.referralCode,
        referralTier: u.referralTier,
        totalEarnings: Number(u.referralEarnings) || 0,
        reservedBalance: Number(u.referralReserved) || 0,
        withdrawnBalance: Number(u.referralWithdrawn) || 0,
        availableBalance: Number(u.availableBalance) || 0,
        linkClicks: Number(u.clicksCount) || 0,
        createdAt: u.createdAt,
        totalWithdrawalsCount: Number(u.totalWithdrawalsCount) || 0,
        pendingWithdrawalsCount: Number(u.pendingWithdrawalsCount) || 0,
      }));
      setAffiliates(items);
      setTotal(data?.total || 0);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch affiliate ledger.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAffiliates();
  }, [page, debouncedSearch]);

  // Aggregate KPI stats
  const totalReserved = useMemo(
    () => affiliates.reduce((acc, curr) => acc + curr.reservedBalance, 0),
    [affiliates],
  );
  const totalPaidOut = useMemo(
    () => affiliates.reduce((acc, curr) => acc + curr.withdrawnBalance, 0),
    [affiliates],
  );
  const pendingRequestsTotal = useMemo(
    () => affiliates.reduce((acc, curr) => acc + curr.pendingWithdrawalsCount, 0),
    [affiliates],
  );

  // DataTable Columns definition
  const columns: Column<AffiliateItem>[] = useMemo(
    () => [
      {
        key: 'partner',
        header: 'Affiliate Partner',
        render: (affiliate) => (
          <div>
            <Link
              href={`/admin/affiliates/${affiliate.id}`}
              className="font-semibold text-gray-900 text-xs hover:text-primary transition-colors block"
            >
              {affiliate.name || 'Unnamed Partner'}
            </Link>
            <div className="text-[11px] text-gray-500 font-mono truncate max-w-[180px]">
              {affiliate.email || affiliate.id}
            </div>
          </div>
        ),
      },
      {
        key: 'referralCode',
        header: 'Referral Code',
        render: (affiliate) => (
          <span className="font-mono font-semibold text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
            {affiliate.referralCode || 'N/A'}
          </span>
        ),
      },
      {
        key: 'totalEarnings',
        header: 'Total Earned',
        align: 'right',
        sortable: true,
        sortValue: (a) => a.totalEarnings,
        render: (affiliate) => (
          <span className="font-semibold text-gray-900 font-mono text-xs tabular-nums">
            {formatINR(affiliate.totalEarnings)}
          </span>
        ),
      },
      {
        key: 'reservedBalance',
        header: 'Reserved (Pending)',
        align: 'right',
        sortable: true,
        sortValue: (a) => a.reservedBalance,
        render: (affiliate) =>
          affiliate.reservedBalance > 0 ? (
            <span className="font-semibold text-amber-700 font-mono text-xs tabular-nums">
              {formatINR(affiliate.reservedBalance)}
            </span>
          ) : (
            <span className="text-gray-400 font-mono text-xs tabular-nums">₹0</span>
          ),
      },
      {
        key: 'withdrawnBalance',
        header: 'Paid Out',
        align: 'right',
        sortable: true,
        sortValue: (a) => a.withdrawnBalance,
        render: (affiliate) => (
          <span className="text-gray-600 font-mono text-xs tabular-nums">
            {formatINR(affiliate.withdrawnBalance)}
          </span>
        ),
      },
      {
        key: 'availableBalance',
        header: 'Available',
        align: 'right',
        sortable: true,
        sortValue: (a) => a.availableBalance,
        render: (affiliate) => (
          <span className="font-bold text-emerald-700 font-mono text-xs tabular-nums">
            {formatINR(affiliate.availableBalance)}
          </span>
        ),
      },
      {
        key: 'queue',
        header: 'Review Queue',
        align: 'center',
        render: (affiliate) =>
          affiliate.pendingWithdrawalsCount > 0 ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200 tabular-nums">
              {affiliate.pendingWithdrawalsCount} pending
            </span>
          ) : (
            <span className="text-xs text-gray-400">Up to date</span>
          ),
      },
      {
        key: 'action',
        header: 'Action',
        align: 'right',
        render: (affiliate) => (
          <Link
            href={`/admin/affiliates/${affiliate.id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-blue-800 transition-colors"
          >
            <span>Review</span>
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
        title="Affiliate Partners & Payouts"
        description="Monitor commission accruals, audit payout requests, and manage partner financial ledgers"
        actions={
          <button
            type="button"
            onClick={fetchAffiliates}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>
        }
      />

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Partners</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">
            {formatNumber(total)}
          </p>
          <span className="text-[11px] text-gray-500">Registered affiliate promoters</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending Payouts</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 tabular-nums">
            {formatNumber(pendingRequestsTotal)}
          </p>
          <span className="text-[11px] text-amber-700 font-medium">Awaiting admin review</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Reserved Pipeline</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 font-mono tabular-nums">
            {formatINR(totalReserved)}
          </p>
          <span className="text-[11px] text-gray-500">Under review / processing</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Settled Payouts</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 font-mono tabular-nums">
            {formatINR(totalPaidOut)}
          </p>
          <span className="text-[11px] text-emerald-700 font-medium">Disbursed to bank / UPI</span>
        </div>
      </div>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={affiliates}
        keyExtractor={(item) => item.id}
        isLoading={loading}
        error={error}
        onRetry={fetchAffiliates}
        filterBar={
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search by partner name, email, or referral code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-gray-200 rounded-md bg-white text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Search affiliates"
              />
            </div>
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="text-xs text-primary font-medium hover:underline cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        }
        pagination={{
          currentPage: page,
          totalItems: total,
          pageSize,
          onPageChange: (newPage) => setPage(newPage),
        }}
        emptyState={{
          title: 'No affiliate partners found',
          description: search
            ? 'No partners match your current search query.'
            : 'No affiliate partner accounts have been created yet.',
        }}
      />
    </div>
  );
}
