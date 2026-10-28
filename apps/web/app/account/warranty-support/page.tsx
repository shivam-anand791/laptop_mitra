'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Order } from '@/lib/types';
import {
  ShieldCheck,
  ShieldAlert,
  LifeBuoy,
  Plus,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';

export default function WarrantySupportPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      setLoading(true);
      try {
        const data = await api.getOrders();
        setOrders(data || []);
      } catch {
        setOrders([]);
      } finally {
        setLoading(false);
      }
    }
    loadOrders();
  }, []);

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Warranty Coverage & Claims
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Every certified refurbished laptop includes a complimentary 6-Month (180-day) hardware warranty.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/account/tickets"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition shadow-xs"
          >
            <LifeBuoy className="w-4 h-4 text-blue-600" />
            View My Tickets
          </Link>
          <Link
            href="/help/guided-flow?category=WARRANTY_REPAIR"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Claim Warranty
          </Link>
        </div>
      </div>

      {/* ── 6-Month Warranty Promise Card ── */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-md">
        <div className="max-w-2xl relative z-10">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold uppercase tracking-wider mb-3">
            <ShieldCheck className="w-3.5 h-3.5" /> 180-Day Comprehensive Protection
          </span>
          <h3 className="text-xl font-bold mb-2">
            Full Motherboard, Display & Battery Hardware Coverage
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed mb-6">
            If your laptop experiences any logic board failure, panel lines, or battery degradation within 6 months of delivery, our certified repair engineers will repair or replace parts at zero cost.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/help/warranty-repair/6-month-standard-warranty-coverage"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold border border-white/20 transition"
            >
              Read Full Warranty Terms <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/help/guided-flow?category=RETURN_REFUND"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" /> 7-Day Return / Defect Form
            </Link>
          </div>
        </div>
      </div>

      {/* ── Active Hardware Warranties List ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900">
          Your Purchased Hardware & Warranty Status
        </h3>

        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">No Orders Found</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Once you purchase a certified laptop, its 6-month warranty will be tracked here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((ord) => {
              const orderDate = new Date(ord.createdAt);
              const warrantyEnd = new Date(orderDate.getTime() + 180 * 24 * 60 * 60 * 1000);
              const isActive = new Date() <= warrantyEnd;
              const daysLeft = isActive ? Math.ceil((warrantyEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0;

              return (
                <div
                  key={ord.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                      <ShieldCheck className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">
                          Order #{ord.orderNumber}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {isActive ? `${daysLeft} Days Active` : 'Warranty Expired'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Purchased on {orderDate.toLocaleDateString('en-IN')} • Coverage valid until {warrantyEnd.toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/help/guided-flow?orderId=${ord.id}&category=WARRANTY_REPAIR`}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
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
