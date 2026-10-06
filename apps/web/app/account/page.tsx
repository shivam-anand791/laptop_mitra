'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Order, WishlistItem } from '@/lib/types';
import {
  Package,
  Heart,
  Share2,
  ShieldCheck,
  ArrowRight,
  Clock,
  Truck,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';

export default function AccountDashboardPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [referralStats, setReferralStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      try {
        const [ordersRes, wishlistRes, referralRes] = await Promise.allSettled([
          api.getOrders(),
          api.getWishlist(),
          api.getReferralStats(),
        ]);

        if (ordersRes.status === 'fulfilled') setOrders(ordersRes.value || []);
        if (wishlistRes.status === 'fulfilled') setWishlist(wishlistRes.value || []);
        if (referralRes.status === 'fulfilled') setReferralStats(referralRes.value);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const handleCopyReferral = () => {
    const code = referralStats?.referralCode || user?.referralCode || 'MITRA2026';
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const recentOrder = orders[0];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-blue-200 mb-3 border border-white/10">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            100% Certified E-Commerce Experience
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Hello, {user?.name?.split(' ')[0] || 'Member'}! 👋
          </h2>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            Welcome to your LaptopMitra command center. Track shipments, download GST invoices, manage certified warranties, and check your referral payouts in real time.
          </p>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Snapshot Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/account/orders"
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-400 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Orders</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-3">{orders.length}</p>
          <span className="text-xs text-blue-600 font-semibold inline-flex items-center gap-1 mt-1">
            View orders history <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </Link>

        <Link
          href="/account/wishlist"
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-rose-400 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Saved in Wishlist</span>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 transition">
              <Heart className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-3">{wishlist.length}</p>
          <span className="text-xs text-rose-600 font-semibold inline-flex items-center gap-1 mt-1">
            Manage saved items <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </Link>

        <Link
          href="/account/referral"
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-amber-400 transition group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Mitra Earnings</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition">
              <Share2 className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-900 mt-3">
            ₹{Number(referralStats?.referralEarnings || user?.referralEarnings || 2500).toLocaleString('en-IN')}
          </p>
          <span className="text-xs text-amber-600 font-semibold inline-flex items-center gap-1 mt-1">
            View payout ledger <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      </div>

      {/* Recent Order & Mitra Quick Share in Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Order Spotlight */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent Order</h3>
              <p className="text-xs text-slate-500 mt-0.5">Your most recent device acquisition</p>
            </div>
            <Link
              href="/account/orders"
              className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              All Orders ({orders.length}) →
            </Link>
          </div>

          {loading ? (
            <div className="py-8 flex items-center justify-center text-slate-400 text-sm">
              <Clock className="w-5 h-5 animate-spin mr-2" /> Loading latest status...
            </div>
          ) : recentOrder ? (
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs text-slate-500 font-medium">Order Number</span>
                  <p className="text-sm font-bold text-slate-900">{recentOrder.orderNumber}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 font-medium">Total Amount</span>
                  <p className="text-sm font-bold text-slate-900">
                    ₹{Number(recentOrder.finalAmount).toLocaleString('en-IN')}
                  </p>
                </div>
                <div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                    recentOrder.status === 'DELIVERED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : recentOrder.status === 'SHIPPING'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {recentOrder.status === 'DELIVERED' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Truck className="w-3.5 h-3.5" />}
                    {recentOrder.status}
                  </span>
                </div>
              </div>

              {recentOrder.items && recentOrder.items.length > 0 && (
                <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 overflow-hidden flex items-center justify-center p-1">
                      <img
                        src={recentOrder.items[0]?.product?.images?.[0]?.url || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=200'}
                        alt="Product"
                        className="object-contain w-full h-full"
                      />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-slate-900 line-clamp-1">
                        {recentOrder.items[0]?.product?.name || 'Certified Refurbished Laptop'}
                      </p>
                      <p className="text-xs text-slate-500">
                        Qty: {recentOrder.items[0]?.quantity || 1} • 1-Year Assured Warranty Included
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <Link
                  href={`/account/orders/${recentOrder.id}`}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1"
                >
                  View Order Details, Tracking & Invoice →
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <Package className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No orders placed yet</p>
              <p className="text-xs text-slate-500 mt-1">Explore our certified enterprise laptops catalog</p>
              <Link
                href="/products"
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
              >
                Browse Catalog
              </Link>
            </div>
          )}
        </div>

        {/* Mitra Partner Referral Card */}
        <div className="bg-gradient-to-br from-indigo-900 to-blue-950 text-white rounded-2xl p-6 border border-indigo-800 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">Affiliate Program</span>
              <span className="text-xs bg-amber-400/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-400/30">
                Gold Tier
              </span>
            </div>
            <h3 className="text-lg font-black text-white">Mitra Rewards</h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              Earn ₹500 - ₹2,500 on every laptop purchased by your friends, colleagues, or business clients using your exclusive code.
            </p>

            <div className="mt-5 bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/10 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold">Your Referral Code</span>
                <p className="text-base font-mono font-black text-white tracking-widest">
                  {referralStats?.referralCode || user?.referralCode || 'MITRA2026'}
                </p>
              </div>
              <button
                onClick={handleCopyReferral}
                className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
                title="Copy Code"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Link
            href="/account/referral"
            className="mt-6 text-xs font-bold text-center text-indigo-200 hover:text-white bg-white/5 hover:bg-white/10 py-2.5 rounded-xl border border-white/10 transition"
          >
            Open Affiliate Dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}
