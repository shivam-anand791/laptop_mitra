'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Order } from '@/lib/types';
import { SkeletonList, ErrorState } from '@/components/account';
import {
  ShieldCheck,
  LifeBuoy,
  Plus,
  Package,
  ExternalLink,
  RotateCcw,
  Sparkles,
  Laptop,
} from 'lucide-react';

export default function WarrantySupportPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getOrders();
      setOrders(data || []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load your orders. Please check your connection.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Warranty Coverage &amp; Claims
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Every certified refurbished laptop includes LaptopMitra Assured Warranty with doorstep diagnostics and part replacement.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <Link
              href="/account/tickets"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              <LifeBuoy className="w-4 h-4 text-blue-600" />
              View My Tickets
            </Link>
            <Link
              href="/help/guided-flow?category=WARRANTY_REPAIR"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition shadow-xs"
            >
              <Plus className="w-4 h-4" />
              Claim Warranty
            </Link>
          </div>
        </div>
      </div>

      {/* Clean Warranty Promise Card (No dark banner, no gradients per owner rule) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-2xs space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-2xl">
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Assured Hardware Protection
            </span>
            <h2 className="text-base font-bold text-slate-900">
              Motherboard, Panel &amp; Battery Coverage Included
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed pt-1">
              If your certified laptop experiences logic board anomalies, display panel lines, or battery degradation within your coverage period, our certified repair lab will service or replace parts with zero labor charge.
            </p>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3">
          <Link
            href="/help/warranty-repair/6-month-standard-warranty-coverage"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition"
          >
            Read Warranty Terms <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </Link>
          <Link
            href="/account/returns"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" /> 7-Day Replacement Policy
          </Link>
        </div>
      </div>

      {/* Active Hardware Warranties List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-2xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Your Purchased Hardware &amp; Active Coverage
        </h2>

        {loading ? (
          <SkeletonList count={2} />
        ) : error ? (
          <ErrorState
            title="Unable to load warranty status"
            message={error}
            onRetry={loadOrders}
          />
        ) : orders.length === 0 ? (
          <div className="text-center py-12 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
            <Laptop className="w-10 h-10 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No Orders Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Once you purchase a certified laptop, its assured warranty duration and claim actions will be tracked here.
            </p>
            <div className="pt-2">
              <Link
                href="/products"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" /> Explore Certified Laptops
              </Link>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {orders.map((ord) => {
              const firstItem = ord.items?.[0];
              const isLease = firstItem?.purchaseMode === 'lease';
              const hasExtension = !!firstItem?.hasWarranty;

              // Base warranty defaults to 6 months (180 days), add-on extends total to 12 months (365 days)
              const warrantyDays = hasExtension ? 365 : 180;
              const warrantyLabel = hasExtension
                ? '12-Month Assured Warranty'
                : '6-Month Assured Warranty';

              const orderDate = new Date(ord.createdAt);
              const warrantyEnd = new Date(orderDate.getTime() + warrantyDays * 24 * 60 * 60 * 1000);
              const isActive = new Date() <= warrantyEnd && ord.status !== 'CANCELLED';
              const daysLeft = isActive ? Math.ceil((warrantyEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

              const primaryImage =
                firstItem?.product?.images?.find((img: any) => img.isPrimary)?.url ||
                firstItem?.product?.images?.[0]?.url ||
                null;

              return (
                <div
                  key={ord.id}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center p-1.5 flex-shrink-0">
                      {primaryImage ? (
                        <img
                          src={primaryImage}
                          alt="Laptop"
                          className="object-contain w-full h-full rounded"
                        />
                      ) : (
                        <Laptop className="w-6 h-6 text-slate-400" />
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-slate-900 font-mono">
                          Order #{ord.orderNumber}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {isActive ? `${daysLeft} Days Active` : 'Warranty Expired'}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">
                          {isLease ? 'Quarterly Enterprise Servicing' : warrantyLabel}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-slate-900 truncate">
                        {firstItem?.product?.name || 'Certified Refurbished Laptop'}
                      </h3>

                      <p className="text-xs text-slate-500">
                        Purchased on {orderDate.toLocaleDateString('en-IN')} • Coverage valid until {warrantyEnd.toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                    <Link
                      href={`/help/guided-flow?orderId=${ord.id}&category=WARRANTY_REPAIR`}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition shadow-xs inline-flex items-center gap-1"
                    >
                      File Claim →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
