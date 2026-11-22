'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Order } from '@/lib/types';
import { useSupportConfig } from '@/lib/support-config';
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
  ChevronDown,
  CheckCircle2,
  Clock,
  Truck,
  Wrench,
  Check,
} from 'lucide-react';

const SERVICE_TIMELINE = [
  { step: '01', title: 'Claim Registered', desc: 'Raise ticket with fault category & description online.', icon: ShieldCheck },
  { step: '02', title: 'Remote Triage', desc: 'Hardware specialist runs remote diagnostic within 24h.', icon: Clock },
  { step: '03', title: 'Doorstep Pickup', desc: 'Insured BlueDart courier pickup from your location.', icon: Truck },
  { step: '04', title: 'Lab Bench Servicing', desc: 'Cleanroom component repair or genuine OEM part swap.', icon: Wrench },
  { step: '05', title: 'QA & Return Delivery', desc: 'Passes full 32-point burn-in bench test & returned.', icon: CheckCircle2 },
];

export default function WarrantySupportPage() {
  const { data: supportConfig } = useSupportConfig();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accordionOpen, setAccordionOpen] = useState<'covered' | 'excluded' | 'sla' | null>('covered');

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
              Review the coverage period and claim options for your purchased laptops.
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
            href="/help"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition"
          >
            Read Warranty Terms <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          </Link>
          <Link
            href="/account/returns"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" /> Return policy
          </Link>
        </div>
      </div>

      {/* 5-Stage Service Process Timeline */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-2xs space-y-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 block">Seamless Resolution Flow</span>
          <h2 className="text-base font-bold text-slate-900 mt-0.5">5-Stage Warranty Service Journey</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {SERVICE_TIMELINE.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={item.step} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 relative">
                <div className="flex items-center justify-between">
                  <span className="w-6 h-6 rounded-lg bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                    {item.step}
                  </span>
                  <Icon className="w-4 h-4 text-slate-400" />
                </div>
                <h3 className="text-xs font-bold text-slate-900">{item.title}</h3>
                <p className="text-[11px] text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Interactive Warranty Coverage Accordion */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-2xs space-y-4">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Policy Clarity</span>
          <h2 className="text-base font-bold text-slate-900 mt-0.5">Coverage Breakdown &amp; Exclusions</h2>
        </div>

        <div className="space-y-2.5">
          {/* Group 1: What is Covered */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setAccordionOpen(accordionOpen === 'covered' ? null : 'covered')}
              className="w-full p-4 text-left flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition cursor-pointer"
            >
              <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <span className="text-emerald-600">✓</span> What is 100% Covered Under Warranty?
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${accordionOpen === 'covered' ? 'rotate-180' : ''}`} />
            </button>
            {accordionOpen === 'covered' && (
              <div className="p-4 bg-white text-xs text-slate-600 space-y-2 border-t border-slate-200 leading-relaxed">
                <p>• <strong>Logic Board &amp; Integrated Chips:</strong> Motherboard circuitry, CPU/GPU throttling anomalies, charging ICs, power rails.</p>
                <p>• <strong>Display Panel:</strong> Backlight failure, dead pixel lines appearing during normal use, inverter boards.</p>
                <p>• <strong>Internal Power Subsystem:</strong> Inability to hold charge, rapid discharge exceeding factory degradation tolerance.</p>
                <p>• <strong>Peripherals:</strong> Keypad switch failure, trackpad sensor unresponsive, internal cooling fan motor failure.</p>
              </div>
            )}
          </div>

          {/* Group 2: Exclusions */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setAccordionOpen(accordionOpen === 'excluded' ? null : 'excluded')}
              className="w-full p-4 text-left flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition cursor-pointer"
            >
              <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <span className="text-rose-500">✕</span> What is Excluded from Warranty?
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${accordionOpen === 'excluded' ? 'rotate-180' : ''}`} />
            </button>
            {accordionOpen === 'excluded' && (
              <div className="p-4 bg-white text-xs text-slate-600 space-y-2 border-t border-slate-200 leading-relaxed">
                <p>• <strong>Physical Damage:</strong> Broken screen glass from drops, cracked hinges, dented chassis.</p>
                <p>• <strong>Liquid Damage:</strong> Water/beverage spills, chemical corrosion on internal components.</p>
                <p>• <strong>Unauthorized Modifications:</strong> Tampering with warranty void stickers or third-party unauthorized repairs.</p>
                <p>• <strong>Software &amp; OS:</strong> User installed viruses, malware, or operating system corruptions.</p>
              </div>
            )}
          </div>

          {/* Group 3: Service Turnaround SLA */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setAccordionOpen(accordionOpen === 'sla' ? null : 'sla')}
              className="w-full p-4 text-left flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition cursor-pointer"
            >
              <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <span className="text-blue-600">⏱</span> Turnaround Times &amp; Doorstep Logistics
              </span>
              <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${accordionOpen === 'sla' ? 'rotate-180' : ''}`} />
            </button>
            {accordionOpen === 'sla' && (
              <div className="p-4 bg-white text-xs text-slate-600 space-y-2 border-t border-slate-200 leading-relaxed">
                <p>• <strong>Remote Triage:</strong> Hardware support response within 24 business hours.</p>
                <p>• <strong>Doorstep Pickup:</strong> Insured BlueDart transit with custom foam protective box provided.</p>
                <p>• <strong>Lab Service Duration:</strong> Typical hardware repair / part replacement completed in 3–5 working days.</p>
                <p>• <strong>Return Shipping:</strong> Express air shipping back to your destination with live tracking notifications.</p>
              </div>
            )}
          </div>
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

              const standardWarrantyDays = supportConfig?.standardWarrantyDays;
              const warrantyDays = standardWarrantyDays
                ? standardWarrantyDays * (hasExtension ? 2 : 1)
                : 0;
              const warrantyMonths = Math.max(1, Math.round(warrantyDays / 30));
              const warrantyLabel = hasExtension
                ? `Extended Assured Warranty (${warrantyMonths} months)`
                : `${warrantyMonths}-Month Assured Warranty`;

              const orderDate = new Date(ord.createdAt);
              const warrantyEnd = new Date(orderDate.getTime() + warrantyDays * 24 * 60 * 60 * 1000);
              const isActive = warrantyDays > 0 && new Date() <= warrantyEnd && ord.status !== 'CANCELLED';
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
                          {isLease ? 'Quarterly Enterprise Servicing' : supportConfig ? warrantyLabel : 'Coverage period unavailable'}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-slate-900 truncate">
                        {firstItem?.product?.name || 'Certified Refurbished Laptop'}
                      </h3>

                      <p className="text-xs text-slate-500">
                        Purchased on {orderDate.toLocaleDateString('en-IN')}
                        {supportConfig && ` • Coverage valid until ${warrantyEnd.toLocaleDateString('en-IN')}`}
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
