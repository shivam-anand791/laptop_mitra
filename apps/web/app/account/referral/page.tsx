'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  Share2,
  Copy,
  Check,
  Users,
  Award,
  IndianRupee,
  Gift,
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

export default function ReferralPage() {
  const [stats, setStats] = useState<{
    referralCode: string;
    referralTier: string;
    referralEarnings: number;
    referredUsersCount: number;
    referralLinkClickedCount: number;
    payoutHistory: Array<{ id: string; amount: number; date: string; status: string }>;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getReferralStats();
      setStats(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load referral statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const copyToClipboard = (text: string) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const referralUrl = typeof window !== 'undefined' && stats?.referralCode
    ? `${window.location.origin}/register?ref=${stats.referralCode}`
    : `https://laptopmitra.com/register?ref=${stats?.referralCode || 'MITRA'}`;

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amt);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Mitra Referral & Affiliate Program</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Share high-quality certified laptops with friends, family, and colleagues. Earn commissions on every completed purchase.
        </p>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4">
          <div className="h-40 bg-slate-100 dark:bg-slate-800/60 rounded-2xl animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-28 bg-slate-100 dark:bg-slate-800/60 rounded-2xl animate-pulse" />
            <div className="h-28 bg-slate-100 dark:bg-slate-800/60 rounded-2xl animate-pulse" />
            <div className="h-28 bg-slate-100 dark:bg-slate-800/60 rounded-2xl animate-pulse" />
          </div>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="p-6 rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 text-center">
          <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2" />
          <p className="text-sm font-semibold text-red-800 dark:text-red-300">{error}</p>
          <button
            onClick={fetchStats}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {!loading && !error && stats && (
        <>
          {/* Referral Banner & Code Share */}
          <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl relative overflow-hidden">
            <div className="relative z-10 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-md mb-3">
                <Award className="w-3.5 h-3.5" /> Mitra Tier: {stats.referralTier || 'BRONZE'} Partner
              </span>
              <h2 className="text-xl sm:text-2xl font-black leading-tight">
                Invite Friends. They Get ₹500 Off, You Earn Up to ₹1,000 per Laptop!
              </h2>
              <p className="text-xs sm:text-sm text-blue-100 mt-2">
                Your unique code grants instant discounts to your friends while directly depositing affiliate rewards into your Mitra wallet.
              </p>

              {/* Code Box */}
              <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1 flex items-center justify-between px-4 py-3 bg-white/10 backdrop-blur-md rounded-xl border border-white/20">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-blue-200 uppercase font-semibold">Your Referral Code</span>
                    <span className="text-lg font-mono font-black tracking-wider text-white">
                      {stats.referralCode || 'MITRA'}
                    </span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(stats.referralCode)}
                    className="p-2 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all flex items-center gap-1 text-xs font-semibold"
                    title="Copy Code"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>

                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Hey! Get verified, quality laptops at great prices on LaptopMitra with ₹500 off using my referral code ${stats.referralCode}: ${referralUrl}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30"
                >
                  <Share2 className="w-4 h-4" /> Share on WhatsApp
                </a>
              </div>
            </div>

            {/* Decorative background shape */}
            <div className="absolute right-0 bottom-0 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none -mr-20 -mb-20" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <IndianRupee className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  Total Earnings
                </div>
                <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                  {formatCurrency(stats.referralEarnings || 0)}
                </div>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  Friends Joined
                </div>
                <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                  {stats.referredUsersCount || 0}
                </div>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                  Link Clicks
                </div>
                <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                  {stats.referralLinkClickedCount || 0}
                </div>
              </div>
            </div>
          </div>

          {/* Payout History Ledger */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Payout History</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Transfers processed directly to your linked UPI / Bank account.
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {stats.payoutHistory && stats.payoutHistory.length > 0 ? (
                stats.payoutHistory.map((payout) => (
                  <div key={payout.id} className="p-4 sm:p-5 flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white">
                        Affiliate Commission Settlement
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {new Date(payout.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} • Txn #{payout.id.slice(-6)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        +{formatCurrency(payout.amount)}
                      </div>
                      <span className="inline-block mt-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                        {payout.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-12 text-center text-slate-400">
                  <Gift className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No payouts yet. Once your referred friends complete their order warranty period (7 days), commissions will be automatically queued for payout.
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
