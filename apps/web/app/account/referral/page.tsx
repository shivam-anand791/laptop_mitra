'use client';

import React, { useEffect, useState, useId } from 'react';
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
  Wallet,
  Building,
  QrCode,
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Upload,
  Info,
} from 'lucide-react';
import Modal from '@/components/ui/Modal';

interface ReferralStats {
  referralCode: string;
  referralTier: string;
  referralEarnings: number;
  referralReserved: number;
  referralWithdrawn: number;
  availableBalance: number;
  referredUsersCount: number;
  referralLinkClickedCount: number;
  payoutHistory: Array<{
    id: string;
    amount: number;
    date: string;
    status: string;
    adminNotes?: string;
    processedAt?: string;
  }>;
}

interface PayoutDetails {
  configured: boolean;
  bankName: string | null;
  accountHolderName: string | null;
  accountNumberMasked: string | null;
  ifscCodeMasked: string | null;
  upiIdMasked: string | null;
  hasQrCode: boolean;
  updatedAt: string | null;
}

export default function ReferralPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'payouts'>('overview');
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [payoutDetails, setPayoutDetails] = useState<PayoutDetails | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Payout Edit Form state (NEVER prefill raw secret values)
  const [showEditForm, setShowEditForm] = useState(false);
  const [editMethod, setEditMethod] = useState<'bank' | 'upi'>('bank');
  const [bankName, setBankName] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [upiId, setUpiId] = useState('');
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsSaveMessage, setDetailsSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Request Payout Modal state
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('500');
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [withdrawSuccess, setWithdrawSuccess] = useState<string | null>(null);

  const bankNameId = useId();
  const accountHolderId = useId();
  const accountNumberId = useId();
  const ifscCodeId = useId();
  const upiIdInputId = useId();
  const qrFileInputId = useId();
  const withdrawAmountInputId = useId();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, detailsData] = await Promise.all([
        api.getReferralStats(),
        api.getPayoutDetails().catch(() => ({
          configured: false,
          bankName: null,
          accountHolderName: null,
          accountNumberMasked: null,
          ifscCodeMasked: null,
          upiIdMasked: null,
          hasQrCode: false,
          updatedAt: null,
        })),
      ]);
      setStats(statsData);
      setPayoutDetails(detailsData);
    } catch (err: any) {
      setError(err?.message || 'Failed to load referral and payout data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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

  const handleSavePayoutDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDetails(true);
    setDetailsSaveMessage(null);

    try {
      const payload: any = {};
      if (editMethod === 'bank') {
        if (!bankName.trim() || !accountHolderName.trim() || !accountNumber.trim() || !ifscCode.trim()) {
          throw new Error('Please fill in all bank details (Bank name, Holder name, Account number, IFSC)');
        }
        payload.bankName = bankName.trim();
        payload.accountHolderName = accountHolderName.trim();
        payload.accountNumber = accountNumber.trim();
        payload.ifscCode = ifscCode.trim().toUpperCase();
      } else {
        if (!upiId.trim()) {
          throw new Error('Please enter a valid UPI ID (e.g., name@okbank)');
        }
        payload.upiId = upiId.trim();
      }

      await api.savePayoutDetails(payload);

      if (qrFile) {
        await api.uploadPayoutQr(qrFile);
      }

      setDetailsSaveMessage({
        type: 'success',
        text: 'Payout details saved securely! A security confirmation has been sent to your email.',
      });

      // Clear sensitive form inputs
      setAccountNumber('');
      setIfscCode('');
      setUpiId('');
      setQrFile(null);
      setShowEditForm(false);

      // Refresh masked details from server
      const updatedDetails = await api.getPayoutDetails();
      setPayoutDetails(updatedDetails);
    } catch (err: any) {
      setDetailsSaveMessage({
        type: 'error',
        text: err?.message || 'Failed to update payout details. Please try again.',
      });
    } finally {
      setSavingDetails(false);
    }
  };

  const handleRequestWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawing(true);
    setWithdrawError(null);
    setWithdrawSuccess(null);

    const amountNum = parseInt(withdrawAmount, 10);
    if (isNaN(amountNum) || amountNum < 500) {
      setWithdrawError('Minimum withdrawal amount is ₹500.');
      setWithdrawing(false);
      return;
    }

    if (!stats || amountNum > stats.availableBalance) {
      setWithdrawError(`Requested amount exceeds your available balance of ${formatCurrency(stats?.availableBalance || 0)}.`);
      setWithdrawing(false);
      return;
    }

    if (!payoutDetails?.configured) {
      setWithdrawError('Please configure your Bank or UPI payout details before requesting a withdrawal.');
      setWithdrawing(false);
      return;
    }

    const hasPending = stats.payoutHistory.some((p) => p.status === 'PENDING');
    if (hasPending || (stats.referralReserved && stats.referralReserved > 0)) {
      setWithdrawError('You already have a pending withdrawal request in review. Only one pending request is allowed at a time.');
      setWithdrawing(false);
      return;
    }

    try {
      await api.requestWithdrawal(amountNum);
      setWithdrawSuccess(`Withdrawal request for ${formatCurrency(amountNum)} submitted successfully!`);
      // Refresh stats
      const freshStats = await api.getReferralStats();
      setStats(freshStats);
      setTimeout(() => {
        setPayoutModalOpen(false);
        setWithdrawSuccess(null);
      }, 2000);
    } catch (err: any) {
      setWithdrawError(err?.message || 'Failed to submit withdrawal request.');
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Mitra Referral & Affiliate Program</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Earn rewards by inviting friends, manage your wallet, and request bank payouts.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
              activeTab === 'overview'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Overview & Share
          </button>
          <button
            onClick={() => setActiveTab('payouts')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === 'payouts'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" /> Payout Settings & Wallet
          </button>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4">
          <div className="h-40 bg-slate-100 dark:bg-slate-800/60 rounded-2xl animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="h-28 bg-slate-100 dark:bg-slate-800/60 rounded-2xl animate-pulse" />
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
            onClick={fetchData}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {!loading && !error && stats && (
        <>
          {/* TAB 1: OVERVIEW & SHARING */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Referral Banner & Code Share */}
              <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10 max-w-2xl">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-md mb-3">
                    <Award className="w-3.5 h-3.5" /> Mitra Tier: {stats.referralTier || 'BRONZE'} Partner
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black leading-tight">
                    Invite Friends. They Get ₹500 Off, You Earn ₹500 per Laptop!
                  </h2>
                  <p className="text-xs sm:text-sm text-blue-100 mt-2">
                    Commissions mature 7 days after delivery (matching return policy) and are directly withdrawable to your bank or UPI.
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
            </div>
          )}

          {/* TAB 2: PAYOUT SETTINGS & WALLET */}
          {activeTab === 'payouts' && (
            <div className="space-y-6">
              {/* Balance Breakdown & Request Payout Button */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Mitra Wallet Balance</span>
                    <div className="text-3xl font-black text-slate-900 dark:text-white mt-1 flex items-baseline gap-2">
                      <span>{formatCurrency(stats.availableBalance || 0)}</span>
                      <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Available to Withdraw</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setWithdrawAmount(String(Math.max(500, Math.min(stats.availableBalance, 1000))));
                      setWithdrawError(null);
                      setPayoutModalOpen(true);
                    }}
                    className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center justify-center gap-2"
                  >
                    <ArrowUpRight className="w-4 h-4" /> Request Payout
                  </button>
                </div>

                {/* 4-way balance split */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <span className="text-slate-500 dark:text-slate-400">Total Earned</span>
                    <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{formatCurrency(stats.referralEarnings || 0)}</p>
                  </div>
                  <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl border border-amber-200/50 dark:border-amber-900/30">
                    <span className="text-amber-700 dark:text-amber-400 font-medium">In Review / Pending</span>
                    <p className="text-base font-bold text-amber-900 dark:text-amber-300 mt-0.5">{formatCurrency(stats.referralReserved || 0)}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                    <span className="text-slate-500 dark:text-slate-400">Total Paid Out</span>
                    <p className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{formatCurrency(stats.referralWithdrawn || 0)}</p>
                  </div>
                  <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/20 rounded-xl border border-emerald-200/50 dark:border-emerald-900/30">
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium">Available</span>
                    <p className="text-base font-bold text-emerald-900 dark:text-emerald-300 mt-0.5">{formatCurrency(stats.availableBalance || 0)}</p>
                  </div>
                </div>
              </div>

              {/* Linked Payout Methods (Masked) */}
              <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-blue-600" /> Linked Payout Settings
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Encrypted using AES-256-GCM. Sensitive fields are masked in all views.
                    </p>
                  </div>

                  <button
                    onClick={() => setShowEditForm(!showEditForm)}
                    className="px-4 py-2 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
                  >
                    {showEditForm ? 'Cancel Edit' : payoutDetails?.configured ? 'Update Payout Details' : '+ Configure Payout Details'}
                  </button>
                </div>

                {detailsSaveMessage && (
                  <div className={`mt-4 p-4 rounded-xl text-xs font-semibold ${
                    detailsSaveMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                      : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-950/40 dark:text-red-300'
                  }`}>
                    {detailsSaveMessage.text}
                  </div>
                )}

                {/* Display Current Masked Details */}
                {!showEditForm && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {payoutDetails?.configured ? (
                      <>
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                            <Building className="w-4 h-4 text-blue-600" /> Bank Account Details
                          </div>
                          <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                            <div><span className="font-semibold">Bank:</span> {payoutDetails.bankName || 'Not configured'}</div>
                            <div><span className="font-semibold">Holder:</span> {payoutDetails.accountHolderName || 'Not configured'}</div>
                            <div><span className="font-semibold">Account Number:</span> <span className="font-mono">{payoutDetails.accountNumberMasked || '••••••••'}</span></div>
                            <div><span className="font-semibold">IFSC Code:</span> <span className="font-mono">{payoutDetails.ifscCodeMasked || '••••••••'}</span></div>
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                            <QrCode className="w-4 h-4 text-emerald-600" /> UPI & QR Code
                          </div>
                          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                            <div>
                              <span className="font-semibold">UPI ID:</span>{' '}
                              <span className="font-mono">{payoutDetails.upiIdMasked || 'None configured'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold">QR Code:</span>
                              {payoutDetails.hasQrCode ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold">
                                  ✓ Uploaded & Verified
                                </span>
                              ) : (
                                <span className="text-slate-400">No QR uploaded</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="col-span-2 p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                        <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          You haven&apos;t configured your payout details yet.
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          Add your bank account or UPI ID to enable withdrawal requests.
                        </p>
                        <button
                          onClick={() => setShowEditForm(true)}
                          className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors"
                        >
                          Configure Now
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Edit Payout Form (Never Prefill Raw Values) */}
                {showEditForm && (
                  <form onSubmit={handleSavePayoutDetails} className="mt-4 space-y-4">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setEditMethod('bank')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          editMethod === 'bank'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        Bank Account
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditMethod('upi')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          editMethod === 'upi'
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        UPI ID / QR
                      </button>
                    </div>

                    {editMethod === 'bank' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label htmlFor={bankNameId} className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Bank Name
                          </label>
                          <input
                            id={bankNameId}
                            type="text"
                            required
                            placeholder="e.g. HDFC Bank, State Bank of India"
                            value={bankName}
                            onChange={(e) => setBankName(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label htmlFor={accountHolderId} className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Account Holder Name
                          </label>
                          <input
                            id={accountHolderId}
                            type="text"
                            required
                            placeholder="Full name as in bank passbook"
                            value={accountHolderName}
                            onChange={(e) => setAccountHolderName(e.target.value)}
                            className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label htmlFor={accountNumberId} className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            New Account Number
                          </label>
                          <input
                            id={accountNumberId}
                            type="text"
                            required
                            placeholder="Enter account number (encrypted on save)"
                            value={accountNumber}
                            onChange={(e) => setAccountNumber(e.target.value)}
                            className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label htmlFor={ifscCodeId} className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            IFSC Code
                          </label>
                          <input
                            id={ifscCodeId}
                            type="text"
                            required
                            placeholder="e.g. HDFC0001234"
                            value={ifscCode}
                            onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                            className="w-full px-3 py-2 text-xs font-mono uppercase rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label htmlFor={upiIdInputId} className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            UPI ID (VPA)
                          </label>
                          <input
                            id={upiIdInputId}
                            type="text"
                            required
                            placeholder="e.g. rohan@okaxis, 9876543210@paytm"
                            value={upiId}
                            onChange={(e) => setUpiId(e.target.value)}
                            className="w-full sm:w-80 px-3 py-2 text-xs font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>

                        <div>
                          <label htmlFor={qrFileInputId} className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Upload UPI QR Code Image (Optional, max 5MB PNG/JPEG)
                          </label>
                          <input
                            id={qrFileInputId}
                            type="file"
                            accept="image/png,image/jpeg"
                            onChange={(e) => setQrFile(e.target.files?.[0] || null)}
                            className="text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-300 hover:file:bg-slate-200"
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-3">
                      <button
                        type="submit"
                        disabled={savingDetails}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                      >
                        {savingDetails ? 'Encrypting & Saving...' : 'Save Payout Details'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowEditForm(false)}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Withdrawal History Table */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Withdrawal History</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Track the status of your payout requests and administrative settlements.
                    </p>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {stats.payoutHistory && stats.payoutHistory.length > 0 ? (
                    stats.payoutHistory.map((payout) => {
                      const isPending = payout.status === 'PENDING';
                      const isApproved = payout.status === 'APPROVED';
                      const isRejected = payout.status === 'REJECTED';

                      return (
                        <div key={payout.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="space-y-1">
                            <div className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                              <span>Affiliate Withdrawal</span>
                              <span className="text-xs text-slate-400 font-mono">#{payout.id.slice(-8)}</span>
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                              <span>Requested: {new Date(payout.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                              {payout.processedAt && (
                                <span>• Settled: {new Date(payout.processedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                              )}
                            </div>
                            {payout.adminNotes && (
                              <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg mt-1 inline-block">
                                <span className="font-semibold text-slate-500">Admin Note:</span> {payout.adminNotes}
                              </div>
                            )}
                          </div>

                          <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1">
                            <span className="text-base font-black text-slate-900 dark:text-white">
                              {formatCurrency(payout.amount)}
                            </span>
                            <span
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                                isPending
                                  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                                  : isApproved
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                              }`}
                            >
                              {isPending && <Clock className="w-3 h-3" />}
                              {isApproved && <CheckCircle2 className="w-3 h-3" />}
                              {isRejected && <XCircle className="w-3 h-3" />}
                              {payout.status}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-12 text-center text-slate-400">
                      <Gift className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        No withdrawal requests submitted yet.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* REQUEST PAYOUT MODAL */}
          <Modal
            open={payoutModalOpen}
            onClose={() => setPayoutModalOpen(false)}
            title="Request Affiliate Payout"
            description="Withdraw commission earnings directly to your linked bank account or UPI ID."
            size="md"
          >
            <form onSubmit={handleRequestWithdrawal} className="space-y-4 pt-2">
              {/* Balance Summary inside Modal */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-xs flex justify-between items-center">
                <span className="text-slate-500">Available Balance:</span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(stats.availableBalance || 0)}
                </span>
              </div>

              <div>
                <label htmlFor={withdrawAmountInputId} className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Withdrawal Amount (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">₹</span>
                  <input
                    id={withdrawAmountInputId}
                    type="number"
                    min="500"
                    max={stats.availableBalance}
                    step="100"
                    required
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full pl-7 pr-3 py-2 text-sm font-bold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <Info className="w-3 h-3" /> Minimum withdrawal is ₹500. Only one request at a time.
                </p>
              </div>

              {/* Linked Destination Info */}
              <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-200/50 dark:border-blue-900/30 text-xs">
                <span className="font-semibold text-blue-900 dark:text-blue-300">Destination:</span>
                <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                  {payoutDetails?.bankName ? (
                    <>Bank: {payoutDetails.bankName} ({payoutDetails.accountNumberMasked})</>
                  ) : payoutDetails?.upiIdMasked ? (
                    <>UPI: {payoutDetails.upiIdMasked}</>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">⚠️ No payout method linked yet</span>
                  )}
                </p>
              </div>

              {withdrawError && (
                <div className="p-3 rounded-xl bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 text-xs font-semibold flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{withdrawError}</span>
                </div>
              )}

              {withdrawSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{withdrawSuccess}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setPayoutModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={withdrawing || !payoutDetails?.configured || stats.availableBalance < 500}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                >
                  {withdrawing ? 'Submitting...' : 'Confirm Withdrawal'}
                </button>
              </div>
            </form>
          </Modal>
        </>
      )}
    </div>
  );
}
