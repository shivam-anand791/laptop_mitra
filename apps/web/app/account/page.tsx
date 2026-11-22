'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Order } from '@/lib/types';
import { OrderStatusChip } from '@/components/account';
import { formatIndianRupees } from '@/lib/account-helpers';
import {
  Package,
  Laptop,
  LifeBuoy,
  Wallet,
  ArrowRight,
  ShieldCheck,
  Wrench,
  Clock,
  Sparkles,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Truck,
  RotateCcw,
  Tag,
  Share2,
} from 'lucide-react';

interface DashboardStats {
  orders: Order[];
  laptops: any[];
  tickets: any[];
  affiliateStats: any | null;
}

export default function AccountDashboardPage() {
  const { user, firebaseUser } = useAuth();
  const [data, setData] = useState<DashboardStats>({
    orders: [],
    laptops: [],
    tickets: [],
    affiliateStats: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ordersRes, laptopsRes, ticketsRes, referralRes] = await Promise.all([
        api.getOrders().catch(() => []),
        api.getUserLaptops().catch(() => []),
        api.getTickets().catch(() => []),
        api.getReferralStats().catch(() => null),
      ]);

      setData({
        orders: Array.isArray(ordersRes) ? ordersRes : [],
        laptops: Array.isArray(laptopsRes) ? laptopsRes : [],
        tickets: Array.isArray(ticketsRes) ? ticketsRes : [],
        affiliateStats: referralRes,
      });
    } catch (err: any) {
      setError(err?.message || 'Unable to load account dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const totalOrders = data.orders.length;
  const recentOrders = useMemo(() => {
    return [...data.orders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);
  }, [data.orders]);

  const activeWarrantiesCount = useMemo(() => {
    return data.laptops.filter((lap) => {
      if (!lap?.warrantyCoverage?.endDate) return false;
      return new Date(lap.warrantyCoverage.endDate).getTime() > Date.now();
    }).length;
  }, [data.laptops]);

  const openTicketsCount = useMemo(() => {
    return data.tickets.filter((t) => {
      const s = (t.status || '').toUpperCase();
      return s !== 'RESOLVED' && s !== 'CLOSED';
    }).length;
  }, [data.tickets]);

  const walletBalance = data.affiliateStats?.availableBalance ?? 0;

  const displayName = user?.name || user?.email?.split('@')[0] || 'Valued Member';

  return (
    <div className="space-y-6">
      {/* ── Welcome Greeting & Verification Banner ── */}
      <div className="bg-[#FFFDF9] rounded-2xl p-6 sm:p-7 border border-[#E6DFD5] shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#2563EB]">
              Account Overview
            </span>
            {firebaseUser?.emailVerified && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Verified Customer
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Welcome back, {displayName}!
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Monitor your orders, device passports, official warranties, and affiliate rewards in one place.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-center">
          <Link
            href="/products"
            className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
          >
            <span>Explore Laptops</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchDashboardData}
            className="font-bold underline text-red-700 hover:text-red-900 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── 4 KPI Metric Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Orders Card */}
        <Link
          href="/account/orders"
          className="bg-[#FFFDF9] p-5 rounded-2xl border border-[#E6DFD5] shadow-2xs hover:border-[#2563EB]/40 hover:shadow-xs transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-700">
              Total Orders
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#2563EB] flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {loading ? (
              <div className="h-7 w-12 bg-slate-100 animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-black text-slate-900 tabular-nums">
                {totalOrders}
              </div>
            )}
            <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <span>View purchase history</span>
              <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </p>
          </div>
        </Link>

        {/* Active Warranties */}
        <Link
          href="/account/laptops"
          className="bg-[#FFFDF9] p-5 rounded-2xl border border-[#E6DFD5] shadow-2xs hover:border-[#2563EB]/40 hover:shadow-xs transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-700">
              Registered Devices
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Laptop className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {loading ? (
              <div className="h-7 w-12 bg-slate-100 animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-black text-slate-900 tabular-nums">
                {data.laptops.length}
              </div>
            )}
            <p className="text-[11px] text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <span>{activeWarrantiesCount} active warranty</span>
            </p>
          </div>
        </Link>

        {/* Support Tickets */}
        <Link
          href="/account/tickets"
          className="bg-[#FFFDF9] p-5 rounded-2xl border border-[#E6DFD5] shadow-2xs hover:border-[#2563EB]/40 hover:shadow-xs transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-700">
              Support Inquiries
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <LifeBuoy className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {loading ? (
              <div className="h-7 w-12 bg-slate-100 animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-black text-slate-900 tabular-nums">
                {openTicketsCount}
              </div>
            )}
            <p className="text-[11px] text-slate-400 mt-1">
              {openTicketsCount === 0 ? 'All tickets resolved' : 'Awaiting resolution'}
            </p>
          </div>
        </Link>

        {/* Mitra Affiliate Wallet */}
        <Link
          href="/account/referral"
          className="bg-[#FFFDF9] p-5 rounded-2xl border border-[#E6DFD5] shadow-2xs hover:border-[#2563EB]/40 hover:shadow-xs transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-700">
              Affiliate Wallet
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            {loading ? (
              <div className="h-7 w-20 bg-slate-100 animate-pulse rounded" />
            ) : (
              <div className="text-2xl font-black text-slate-900 tabular-nums">
                {formatIndianRupees(walletBalance)}
              </div>
            )}
            <p className="text-[11px] text-slate-400 mt-1">Available to withdraw</p>
          </div>
        </Link>
      </div>

      {/* ── Recent Orders Section ── */}
      <div className="bg-[#FFFDF9] rounded-2xl border border-[#E6DFD5] shadow-2xs overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Recent Orders</h2>
              <p className="text-xs text-slate-500">Track shipments and view invoices</p>
            </div>
          </div>
          <Link
            href="/account/orders"
            className="text-xs font-bold text-[#2563EB] hover:text-blue-700 flex items-center gap-1 transition"
          >
            <span>View All ({totalOrders})</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          {loading ? (
            <div className="p-6 space-y-4">
              <div className="h-16 bg-slate-100 rounded-xl animate-pulse" />
              <div className="h-16 bg-slate-100 rounded-xl animate-pulse" />
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="p-10 text-center space-y-3">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                <Package className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-800">No Orders Placed Yet</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Explore our certified refurbished laptops backed by 32-point engineering testing and 1-year warranty.
              </p>
              <Link
                href="/products"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2563EB] text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition"
              >
                <span>Browse Laptops</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            recentOrders.map((order) => {
              const firstItem = order.items?.[0];
              const dateStr = order.createdAt
                ? new Date(order.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'Recent';

              const imgRaw = (firstItem?.product as any)?.images?.[0];
              const itemImageUrl = typeof imgRaw === 'string' ? imgRaw : imgRaw?.url || (firstItem?.product as any)?.image;

              return (
                <div
                  key={order.id}
                  className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-white rounded-xl border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                      {itemImageUrl ? (
                        <Image
                          src={itemImageUrl}
                          alt={firstItem?.product?.name || 'Product'}
                          width={56}
                          height={56}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Laptop className="w-6 h-6 text-slate-400" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/account/orders/${order.id}`}
                          className="text-sm font-bold text-slate-900 hover:text-[#2563EB] transition"
                        >
                          Order #{order.orderNumber}
                        </Link>
                        <OrderStatusChip status={order.status} />
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1">
                        {firstItem?.product?.name || 'Certified Laptop'}
                        {order.items && order.items.length > 1
                          ? ` + ${order.items.length - 1} more item`
                          : ''}
                      </p>
                      <p className="text-[11px] text-slate-400">Placed on {dateStr}</p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                    <span className="text-sm font-black text-slate-900 tabular-nums">
                      {formatIndianRupees(order.finalAmount || order.totalAmount || 0)}
                    </span>
                    <Link
                      href={`/account/orders/${order.id}`}
                      className="text-xs font-bold text-[#2563EB] hover:underline"
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Registered Devices Snapshot & Free Service Banner ── */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-blue-900 to-[#0B1F4B] text-white shadow-xs relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-blue-200 backdrop-blur-md">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
            <span>LaptopMitra Device Passport & Certified Bench</span>
          </div>
          <h3 className="text-lg sm:text-xl font-black">
            1 Complimentary Deep Service with Every Laptop
          </h3>
          <p className="text-xs text-blue-100 leading-relaxed">
            Every device includes complimentary fan dusting, thermal paste renewal, and complete diagnostics within 6 months of delivery.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              href="/account/laptops"
              className="px-4 py-2 bg-white text-[#0B1F4B] rounded-xl text-xs font-bold hover:bg-blue-50 transition flex items-center gap-1.5"
            >
              <Wrench className="w-3.5 h-3.5 text-[#2563EB]" />
              <span>Manage Devices & Book Service</span>
            </Link>
            <Link
              href="/buyback-guarantee"
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold backdrop-blur-md transition flex items-center gap-1.5"
            >
              <span>Check Guaranteed Buyback Value</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Self-Serve Quick Shortcuts ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          href="/account/orders"
          className="p-4 rounded-xl bg-[#FFFDF9] border border-[#E6DFD5] hover:border-[#2563EB]/40 transition group space-y-1"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#2563EB] flex items-center justify-center">
            <Truck className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold text-slate-900 group-hover:text-[#2563EB] transition">
            Delivery Tracking
          </p>
          <p className="text-[11px] text-slate-500">Live courier tracking</p>
        </Link>

        <Link
          href="/account/warranty-support"
          className="p-4 rounded-xl bg-[#FFFDF9] border border-[#E6DFD5] hover:border-[#2563EB]/40 transition group space-y-1"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-600 transition">
            Warranty Support
          </p>
          <p className="text-[11px] text-slate-500">Claims & 5-step journey</p>
        </Link>

        <Link
          href="/account/coupons"
          className="p-4 rounded-xl bg-[#FFFDF9] border border-[#E6DFD5] hover:border-[#2563EB]/40 transition group space-y-1"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <Tag className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold text-slate-900 group-hover:text-amber-600 transition">
            Coupons & Offers
          </p>
          <p className="text-[11px] text-slate-500">Active promo codes</p>
        </Link>

        <Link
          href="/account/referral"
          className="p-4 rounded-xl bg-[#FFFDF9] border border-[#E6DFD5] hover:border-[#2563EB]/40 transition group space-y-1"
        >
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
            <Share2 className="w-4 h-4" />
          </div>
          <p className="text-xs font-bold text-slate-900 group-hover:text-purple-600 transition">
            Mitra Affiliate
          </p>
          <p className="text-[11px] text-slate-500">Invite & earn rewards</p>
        </Link>
      </div>
    </div>
  );
}
