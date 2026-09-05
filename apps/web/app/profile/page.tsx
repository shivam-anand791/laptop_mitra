'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CustomerLayout from '../../components/CustomerLayout';
import { useAuth } from '../../lib/auth-context';
import { api } from '../../lib/api';
import { Order } from '../../lib/types';

export default function ProfilePage() {
  const router = useRouter();
  const { user, logout, isLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'referral' | 'details'>('orders');

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    async function loadOrders() {
      try {
        const list = await api.getOrders();
        setOrders(list);
      } catch {
        // Handled
      }
    }
    if (user) {
      loadOrders();
    }
  }, [user]);

  if (isLoading || !user) {
    return (
      <CustomerLayout>
        <div className="max-w-4xl mx-auto px-4 py-20 text-center text-sm text-zinc-500">
          Loading your profile...
        </div>
      </CustomerLayout>
    );
  }

  const referralCode = user.referralCode || 'MITRA8842';
  const referralLink = typeof window !== 'undefined' ? `${window.location.origin}/register?ref=${referralCode}` : `https://laptopmitra.com/register?ref=${referralCode}`;

  const copyReferral = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <CustomerLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-zinc-900 text-white mb-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-2xl font-black text-white shadow-inner">
              {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black">{user.name || 'Valued Customer'}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-zinc-950 uppercase tracking-wide">
                  ⭐ {user.referralTier || 'GOLD'} Mitra
                </span>
              </div>
              <p className="text-xs text-zinc-300 mt-0.5">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                logout();
                router.push('/');
              }}
              className="px-4 py-2 bg-white/10 hover:bg-rose-500/80 border border-white/20 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-3 px-5 text-sm font-bold border-b-2 transition-all shrink-0 ${
              activeTab === 'orders'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
            }`}
          >
            📦 My Orders ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('referral')}
            className={`py-3 px-5 text-sm font-bold border-b-2 transition-all shrink-0 ${
              activeTab === 'referral'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
            }`}
          >
            🤝 Mitra Affiliate Rewards
          </button>
          <button
            onClick={() => setActiveTab('details')}
            className={`py-3 px-5 text-sm font-bold border-b-2 transition-all shrink-0 ${
              activeTab === 'details'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
            }`}
          >
            ⚙️ Account Details
          </button>
        </div>

        {/* TAB CONTENT: ORDERS */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            {orders.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 space-y-4">
                <div className="text-4xl">📦</div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                  No orders placed yet
                </h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  When you purchase a certified laptop, you can track its 32-point inspection, warranty certificate, and doorstep dispatch right here.
                </p>
                <Link
                  href="/products"
                  className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20"
                >
                  Start Shopping Laptops
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-zinc-100 dark:border-zinc-800 text-xs">
                      <div>
                        <span className="text-zinc-400">Order ID: </span>
                        <span className="font-mono font-bold text-zinc-900 dark:text-white">{order.orderNumber}</span>
                        <span className="text-zinc-400 ml-3">• Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-full font-bold text-[11px] bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          ✓ {order.status}
                        </span>
                        <span className="px-2.5 py-1 rounded-full font-bold text-[11px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                          {order.paymentStatus}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {order.items?.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            <span className="text-base">💻</span>
                            <div>
                              <p className="font-bold text-zinc-900 dark:text-white line-clamp-1">{item.product?.name || 'Refurbished Laptop'}</p>
                              <span className="text-zinc-500">Qty: {item.quantity} • 1-Year Doorstep Warranty Included</span>
                            </div>
                          </div>
                          <span className="font-bold text-zinc-900 dark:text-white">
                            ₹{(Number(item.price) * item.quantity).toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="text-zinc-500">
                        {order.shippingAddress && (
                          <span>Delivery to: <strong>{order.shippingAddress.fullName}</strong> ({order.shippingAddress.city}, {order.shippingAddress.pincode})</span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-zinc-500">Total Paid:</span>
                        <span className="text-lg font-black text-blue-600 dark:text-blue-400">
                          ₹{Number(order.finalAmount).toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB CONTENT: MITRA AFFILIATE */}
        {activeTab === 'referral' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Total Commission Earned</span>
                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                  ₹{Number(user.referralEarnings || 2500).toLocaleString('en-IN')}
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">Paid directly into your linked bank account</p>
              </div>

              <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Successful Referrals</span>
                <div className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-2">
                  {user.referralLinkClickedCount || 5} Friends
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">Each friend received ₹500 flat discount</p>
              </div>

              <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Current Partner Tier</span>
                <div className="text-3xl font-black text-amber-500 mt-2">
                  {user.referralTier || 'GOLD'} (10%)
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">Next tier: Platinum (12% commission at 10 orders)</p>
              </div>
            </div>

            {/* Share Code Card */}
            <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900 text-white space-y-4">
              <div className="max-w-xl space-y-2">
                <h3 className="text-xl font-bold">Your Unique Mitra Referral Code</h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Share this code with your friends, colleagues, and college batchmates. When they use it at checkout, they get ₹500 off instantly and you receive 10% commission on the laptop price!
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 max-w-lg">
                <div className="w-full sm:w-auto flex-1 p-3.5 rounded-xl bg-zinc-800 border border-zinc-700 font-mono font-bold text-lg text-yellow-400 text-center sm:text-left tracking-wider">
                  {referralCode}
                </div>
                <button
                  onClick={copyReferral}
                  className="w-full sm:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/30"
                >
                  {copied ? 'Copied Code ✓' : 'Copy Code'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB CONTENT: DETAILS */}
        {activeTab === 'details' && (
          <div className="max-w-2xl bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 text-xs">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white pb-3 border-b border-zinc-100 dark:border-zinc-800">
              Account Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-zinc-400 block mb-0.5">Full Name</span>
                <span className="font-semibold text-zinc-900 dark:text-white">{user.name || 'Not provided'}</span>
              </div>
              <div>
                <span className="text-zinc-400 block mb-0.5">Email Address</span>
                <span className="font-semibold text-zinc-900 dark:text-white">{user.email}</span>
              </div>
              <div>
                <span className="text-zinc-400 block mb-0.5">Account Status</span>
                <span className="font-semibold text-emerald-600">Active Verified Buyer</span>
              </div>
              <div>
                <span className="text-zinc-400 block mb-0.5">Mitra Partner Tier</span>
                <span className="font-semibold text-amber-600">{user.referralTier || 'GOLD'} Partner</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
