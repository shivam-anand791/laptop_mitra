'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { SkeletonList, ErrorState } from '@/components/account';
import {
  formatIndianRupees,
  getReturnStatusConfig,
} from '@/lib/account-helpers';
import {
  RotateCcw,
  Package,
  ArrowRight,
  Search,
  X,
  Truck,
  Sparkles,
  Calendar,
} from 'lucide-react';

type ReturnFilterTab = 'ALL' | 'ACTIVE' | 'COMPLETED' | 'CLOSED';

const TABS: { id: ReturnFilterTab; label: string }[] = [
  { id: 'ALL', label: 'All Requests' },
  { id: 'ACTIVE', label: 'In Progress' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'CLOSED', label: 'Rejected / Cancelled' },
];

export default function AccountReturnsPage() {
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTab, setSelectedTab] = useState<ReturnFilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadReturns = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getReturns();
      setReturns(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load return requests. Please check your connection.');
      setReturns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReturns();
  }, []);

  const counts = useMemo(() => {
    const c: Record<ReturnFilterTab, number> = {
      ALL: returns.length,
      ACTIVE: 0,
      COMPLETED: 0,
      CLOSED: 0,
    };

    for (const r of returns) {
      const s = (r.status || '').toUpperCase();
      if (['REFUNDED', 'REPLACED'].includes(s)) {
        c.COMPLETED += 1;
      } else if (['REJECTED', 'CANCELLED', 'INSPECTION_FAILED'].includes(s)) {
        c.CLOSED += 1;
      } else {
        c.ACTIVE += 1;
      }
    }

    return c;
  }, [returns]);

  const filteredReturns = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return returns.filter((r) => {
      // 1. Tab filter
      const s = (r.status || '').toUpperCase();
      if (selectedTab === 'ACTIVE') {
        if (['REFUNDED', 'REPLACED', 'REJECTED', 'CANCELLED', 'INSPECTION_FAILED'].includes(s)) return false;
      } else if (selectedTab === 'COMPLETED') {
        if (!['REFUNDED', 'REPLACED'].includes(s)) return false;
      } else if (selectedTab === 'CLOSED') {
        if (!['REJECTED', 'CANCELLED', 'INSPECTION_FAILED'].includes(s)) return false;
      }

      // 2. Search query
      if (q) {
        const retNum = (r.returnNumber || r.id || '').toLowerCase();
        const ordNum = (r.order?.orderNumber || '').toLowerCase();
        const reason = (r.reason || '').toLowerCase();
        const itemMatch = r.items?.some((it: any) =>
          it.orderItem?.product?.name?.toLowerCase().includes(q)
        );
        if (!retNum.includes(q) && !ordNum.includes(q) && !reason.includes(q) && !itemMatch) {
          return false;
        }
      }

      return true;
    });
  }, [returns, selectedTab, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header Container */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-2xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-blue-600" />
              Returns &amp; Replacements
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Track doorstep pickup, central lab diagnostics, and refund settlements under LaptopMitra&apos;s 7-Day Guarantee.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative min-w-[260px] sm:min-w-[300px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Return #, Order # or laptop model..."
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition bg-slate-50/50 hover:bg-white"
              aria-label="Search return requests"
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

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none pt-3 border-t border-slate-100">
          {TABS.map((tab) => {
            const isSelected = selectedTab === tab.id;
            const count = counts[tab.id];

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedTab(tab.id)}
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
      </div>

      {/* Main List */}
      {loading ? (
        <SkeletonList count={3} />
      ) : error ? (
        <ErrorState
          title="Unable to load returns"
          message={error}
          onRetry={loadReturns}
        />
      ) : returns.length === 0 ? (
        /* Empty State: Zero returns */
        <div className="text-center py-16 px-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-800 mx-auto">
            <RotateCcw className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-base font-bold text-slate-900">No Return Requests</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              You do not have any active or past return requests. Every certified laptop purchase is covered by our 7-Day Guarantee.
            </p>
          </div>
          <Link
            href="/account/orders"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            <Package className="w-4 h-4" /> View My Orders
          </Link>
        </div>
      ) : filteredReturns.length === 0 ? (
        /* Empty Filter State */
        <div className="text-center py-14 px-4 bg-white rounded-2xl border border-dashed border-slate-300 shadow-2xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 mx-auto">
            <RotateCcw className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-sm font-bold text-slate-900">No matching returns</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              No return requests matched your search keywords or filter tab.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedTab('ALL');
              setSearchQuery('');
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        /* Rendered Cards */
        <div className="space-y-4">
          {filteredReturns.map((ret) => {
            const statusConfig = getReturnStatusConfig(ret.status);
            const firstItem = ret.items?.[0]?.orderItem;
            const primaryImage =
              firstItem?.product?.images?.find((img: any) => img.isPrimary)?.url ||
              firstItem?.product?.images?.[0]?.url ||
              null;

            const dateStr = ret.createdAt
              ? new Date(ret.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : '';

            const refundAmount = ret.refundAmount || ret.order?.finalAmount;

            return (
              <div
                key={ret.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 transition shadow-2xs overflow-hidden flex flex-col justify-between"
              >
                {/* Header */}
                <div className="bg-slate-50/90 px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                    <div>
                      <span className="text-slate-400 block text-[11px]">Requested</span>
                      <span className="font-semibold text-slate-800">{dateStr}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Return ID</span>
                      <span className="font-mono font-bold text-slate-900">
                        {ret.returnNumber || `RET-${ret.id.slice(0, 8).toUpperCase()}`}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px]">Linked Order</span>
                      <Link
                        href={`/account/orders/${ret.orderId}`}
                        className="font-mono font-semibold text-blue-600 hover:underline"
                      >
                        #{ret.order?.orderNumber || ret.orderId?.slice(0, 8)}
                      </Link>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusConfig.colorClasses}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.badgeBg}`} />
                    {statusConfig.label}
                  </span>
                </div>

                {/* Body Row */}
                <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center p-1.5 flex-shrink-0">
                      {primaryImage ? (
                        <img
                          src={primaryImage}
                          alt="Product"
                          className="object-contain w-full h-full rounded"
                        />
                      ) : (
                        <Package className="w-6 h-6 text-slate-400" />
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                            ret.type === 'REPLACEMENT'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {ret.type || 'REFUND'}
                        </span>
                        <h3 className="font-bold text-sm text-slate-900 truncate">
                          {firstItem?.product?.name || 'Certified Laptop'}
                        </h3>
                      </div>

                      <p className="text-xs text-slate-600">
                        Reason: <span className="font-medium text-slate-800">{ret.reason}</span>
                      </p>

                      <p className="text-xs text-slate-500 flex items-center gap-1.5 pt-0.5">
                        <Truck className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        {ret.status === 'REFUNDED' ? (
                          <span className="text-emerald-700 font-semibold">Refund credited</span>
                        ) : ret.pickupScheduledAt ? (
                          <span>
                            Doorstep pickup scheduled:{' '}
                            <strong className="text-slate-800">
                              {new Date(ret.pickupScheduledAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </strong>
                          </span>
                        ) : (
                          <span>Complimentary reverse pickup will be arranged</span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="text-left sm:text-right flex-shrink-0 space-y-1">
                    {refundAmount && (
                      <div>
                        <span className="text-[11px] text-slate-400 block">Settlement Value</span>
                        <p className="text-base font-bold text-slate-900">
                          {formatIndianRupees(refundAmount)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Action */}
                <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    Complimentary Doorstep Inspection &amp; Pickup
                  </span>

                  <Link
                    href={`/account/returns/${ret.id}`}
                    className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-semibold transition inline-flex items-center gap-1 shadow-2xs"
                  >
                    View Return Details <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
