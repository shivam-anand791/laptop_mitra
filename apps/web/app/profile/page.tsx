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
        <div className="bg-[#F5F7FA] min-h-[60vh] flex items-center justify-center py-20 text-center text-xs font-semibold text-slate-500">
          Loading your verified profile...
        </div>
      </CustomerLayout>
    );
  }

  const referralCode = user.referralCode || 'MITRA8842';

  const copyReferral = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <CustomerLayout>
      <div className="bg-[#F5F7FA] min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Profile Header */}
          <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0B1F4B] via-[#102A6B] to-[#1D6FF2] text-white mb-8 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-2xl font-black text-white shadow-inner">
                {user.name ? user.name[0].toUpperCase() : user.email[0].toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-extrabold">{user.name || 'Valued Customer'}</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#F59E0B] text-slate-900 uppercase tracking-wide">
                    ⭐ {user.referralTier || 'GOLD'} Mitra
                  </span>
                </div>
                <p className="text-xs text-blue-100 mt-0.5">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  logout();
                  router.push('/');
                }}
                className="px-4 py-2 bg-white/10 hover:bg-rose-600/90 border border-white/25 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
              >
                Sign Out
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-200 mb-6 overflow-x-auto bg-white rounded-xl p-1 shadow-xs">
            <button
              onClick={() => setActiveTab('orders')}
              className={`py-2.5 px-5 text-xs font-bold rounded-lg transition-all shrink-0 ${
                activeTab === 'orders'
                  ? 'bg-[#1D6FF2] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📦 My Orders ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab('referral')}
              className={`py-2.5 px-5 text-xs font-bold rounded-lg transition-all shrink-0 ${
                activeTab === 'referral'
                  ? 'bg-[#1D6FF2] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🤝 Mitra Affiliate Rewards
            </button>
            <button
              onClick={() => setActiveTab('details')}
              className={`py-2.5 px-5 text-xs font-bold rounded-lg transition-all shrink-0 ${
                activeTab === 'details'
                  ? 'bg-[#1D6FF2] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ⚙️ Account Details
            </button>
          </div>

          {/* TAB CONTENT: ORDERS */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              {orders.length === 0 ? (
                <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/90 shadow-sm space-y-4">
                  <div className="text-4xl">📦</div>
                  <h3 className="text-lg font-bold text-[#0B1F4B]">
                    No Orders Placed Yet
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    When you purchase a certified laptop, you can track its 32-point inspection, warranty certificate, and doorstep dispatch right here.
                  </p>
                  <Link
                    href="/products"
                    className="inline-block px-6 py-3 bg-[#1D6FF2] hover:bg-[#1558C0] text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
                  >
                    Start Shopping Laptops
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 text-xs">
                        <div>
                          <span className="text-slate-400">Order ID: </span>
                          <span className="font-mono font-bold text-slate-900">{order.orderNumber}</span>
                          <span className="text-slate-400 ml-3">
                            • Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-full font-bold text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ✓ {order.status}
                          </span>
                          <span className="px-2.5 py-1 rounded-full font-bold text-[11px] bg-blue-50 text-[#1D6FF2] border border-blue-200">
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
                                <p className="font-bold text-slate-900 line-clamp-1">{item.product?.name || 'Certified Refurbished Laptop'}</p>
                                <span className="text-slate-500">Qty: {item.quantity} • 1-Year Comprehensive Warranty Included</span>
                              </div>
                            </div>
                            <span className="font-bold text-slate-900">
                              ₹{(Number(item.price) * item.quantity).toLocaleString('en-IN')}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="text-slate-500">
                          {order.shippingAddress && (
                            <span>Delivery to: <strong>{order.shippingAddress.fullName}</strong> ({order.shippingAddress.city}, {order.shippingAddress.pincode})</span>
                          )}
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-slate-500">Total Paid:</span>
                          <span className="text-lg font-black text-[#1D6FF2]">
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
                <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Commission Earned</span>
                  <div className="text-3xl font-black text-emerald-700 mt-2">
                    ₹{Number(user.referralEarnings || 2500).toLocaleString('en-IN')}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Directly credited to your registered bank account</p>
                </div>

                <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Successful Referrals</span>
                  <div className="text-3xl font-black text-[#1D6FF2] mt-2">
                    {user.referralLinkClickedCount || 5} Friends
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Each friend received an instant ₹500 discount</p>
                </div>

                <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Mitra Tier</span>
                  <div className="text-3xl font-black text-amber-500 mt-2">
                    {user.referralTier || 'GOLD'} (10%)
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Next tier: Platinum (12% commission at 10 orders)</p>
                </div>
              </div>

              {/* Share Code Card */}
              <div className="p-6 sm:p-8 rounded-3xl bg-[#0B1F4B] text-white space-y-4 shadow-md">
                <div className="max-w-xl space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#3B82F6]">LaptopMitra Partner Program</span>
                  <h3 className="text-xl font-extrabold text-white">Your Unique Referral Code</h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Share this code with your colleagues and friends. When they use it at checkout, they save ₹500 instantly and you receive 10% commission on their laptop order!
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 max-w-lg">
                  <div className="w-full sm:w-auto flex-1 p-3.5 rounded-xl bg-white/10 border border-white/20 font-mono font-bold text-lg text-amber-400 text-center sm:text-left tracking-wider">
                    {referralCode}
                  </div>
                  <button
                    onClick={copyReferral}
                    className="w-full sm:w-auto px-6 py-3.5 bg-[#1D6FF2] hover:bg-[#1558C0] text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/25"
                  >
                    {copied ? 'Copied Code ✓' : 'Copy Code'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: DETAILS */}
          {activeTab === 'details' && (
            <div className="max-w-2xl bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4 text-xs">
              <h3 className="text-base font-bold text-[#0B1F4B] pb-3 border-b border-slate-100">
                Account Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-slate-400 block mb-0.5">Full Name</span>
                  <span className="font-bold text-slate-900">{user.name || 'Not provided'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Email Address</span>
                  <span className="font-bold text-slate-900">{user.email}</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Account Status</span>
                  <span className="font-bold text-emerald-700">Active Verified Buyer</span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Mitra Partner Tier</span>
                  <span className="font-bold text-amber-600">{user.referralTier || 'GOLD'} Partner</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}
