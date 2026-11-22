'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useSupportConfig } from '@/lib/support-config';
import { SkeletonList, ErrorState } from '@/components/account';
import {
  formatIndianRupees,
  getReturnStatusConfig,
  getReturnTimelineSteps,
} from '@/lib/account-helpers';
import {
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  Clock,
  Truck,
  ShieldCheck,
  CreditCard,
  Edit2,
  AlertCircle,
  Package,
  Save,
  X,
  HelpCircle,
  Copy,
  Check,
} from 'lucide-react';

interface ReturnDetail {
  id: string;
  returnNumber: string;
  orderId: string;
  type: 'REFUND' | 'REPLACEMENT';
  status: string;
  reason: string;
  refundMethod: string;
  refundAccountMasked?: string | null;
  refundIfscMasked?: string | null;
  refundUpiMasked?: string | null;
  refundAmount?: number | null;
  manualRefundReference?: string | null;
  razorpayRefundId?: string | null;
  pickupScheduledAt?: string | null;
  pickedUpAt?: string | null;
  createdAt: string;
  updatedAt: string;
  order?: {
    id?: string;
    orderNumber: string;
    finalAmount: number;
    shippingAddress?: any;
  };
  items: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    reason?: string | null;
    orderItem?: {
      product?: {
        name?: string;
        sku?: string;
        images?: Array<{ url: string; isPrimary?: boolean }>;
      };
      variantName?: string | null;
      variantAttributes?: any;
    };
  }>;
}

export default function ReturnDetailPage() {
  const { data: supportConfig } = useSupportConfig();
  const params = useParams();
  const searchParams = useSearchParams();
  const returnId = params?.id as string;
  const isNewlyCreated = searchParams?.get('new') === 'true';

  const [returnReq, setReturnReq] = useState<ReturnDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Edit Bank/UPI state for COD payouts
  const [isEditingRefund, setIsEditingRefund] = useState(false);
  const [bankForm, setBankForm] = useState({
    accountNumber: '',
    confirmAccountNumber: '',
    ifscCode: '',
    accountHolderName: '',
    upiId: '',
  });
  const [editMethod, setEditMethod] = useState<'BANK' | 'UPI'>('BANK');
  const [savingRefund, setSavingRefund] = useState(false);
  const [refundUpdateSuccess, setRefundUpdateSuccess] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const fetchReturn = useCallback(async () => {
    if (!returnId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getReturnRequest(returnId);
      setReturnReq(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load return details. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [returnId]);

  useEffect(() => {
    fetchReturn();
  }, [fetchReturn]);

  const handleCopyReturnNumber = () => {
    if (returnReq?.returnNumber && navigator?.clipboard) {
      navigator.clipboard.writeText(returnReq.returnNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSaveRefundDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);

    if (editMethod === 'BANK') {
      if (!bankForm.accountNumber || !bankForm.confirmAccountNumber) {
        setEditError('Bank account number is required');
        return;
      }
      if (bankForm.accountNumber !== bankForm.confirmAccountNumber) {
        setEditError('Account numbers do not match');
        return;
      }
      if (!bankForm.ifscCode || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankForm.ifscCode.toUpperCase())) {
        setEditError('Invalid IFSC code format (e.g. HDFC0001234)');
        return;
      }
      if (!bankForm.accountHolderName.trim()) {
        setEditError('Account holder name is required');
        return;
      }
    } else {
      if (!bankForm.upiId.includes('@')) {
        setEditError('Invalid UPI address format (e.g. name@bank)');
        return;
      }
    }

    setSavingRefund(true);
    try {
      await api.updateRefundDetails(returnId, {
        accountNumber: editMethod === 'BANK' ? bankForm.accountNumber : undefined,
        confirmAccountNumber: editMethod === 'BANK' ? bankForm.confirmAccountNumber : undefined,
        ifscCode: editMethod === 'BANK' ? bankForm.ifscCode.toUpperCase() : undefined,
        accountHolderName: editMethod === 'BANK' ? bankForm.accountHolderName : undefined,
        upiId: editMethod === 'UPI' ? bankForm.upiId : undefined,
      });

      setIsEditingRefund(false);
      setRefundUpdateSuccess(true);
      setTimeout(() => setRefundUpdateSuccess(false), 5000);
      await fetchReturn();
    } catch (err: any) {
      setEditError(err?.message || 'Failed to update refund details. Please try again.');
    } finally {
      setSavingRefund(false);
    }
  };

  const statusConfig = useMemo(() => {
    return getReturnStatusConfig(returnReq?.status);
  }, [returnReq?.status]);

  const timelineSteps = useMemo(() => {
    if (!returnReq) return [];
    return getReturnTimelineSteps({
      status: returnReq.status,
      createdAt: returnReq.createdAt,
      updatedAt: returnReq.updatedAt,
      pickupScheduledAt: returnReq.pickupScheduledAt,
      pickedUpAt: returnReq.pickedUpAt,
    });
  }, [returnReq]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-3 shadow-2xs">
        <SkeletonList count={2} />
      </div>
    );
  }

  if (error || !returnReq) {
    return (
      <ErrorState
        title="Return Record Not Found"
        message={error || 'This return request could not be located in your account.'}
        onRetry={fetchReturn}
      />
    );
  }

  const isRefundProcessed =
    returnReq.status === 'REFUNDED' ||
    returnReq.status === 'REPLACED' ||
    returnReq.status === 'CANCELLED';

  const dateStr = returnReq.createdAt
    ? new Date(returnReq.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  return (
    <div className="space-y-6">
      {/* Top Banner if newly created */}
      {isNewlyCreated && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 text-xs font-medium animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <strong>Return Request Logged!</strong> Reference #{returnReq.returnNumber} has been received. Our diagnostics team will review your request
            {supportConfig?.firstResponseSlaHours ? ` within ${supportConfig.firstResponseSlaHours} hours` : ''}.
          </div>
        </div>
      )}

      {/* Header Container */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/account/returns"
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition"
              aria-label="Back to Returns"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                  Return #{returnReq.returnNumber}
                </h1>
                <button
                  type="button"
                  onClick={handleCopyReturnNumber}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded transition"
                  title="Copy return number"
                  aria-label="Copy return number"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Requested on {dateStr} • Linked Order:{' '}
                <Link
                  href={`/account/orders/${returnReq.orderId}`}
                  className="font-mono font-semibold text-blue-600 hover:underline"
                >
                  #{returnReq.order?.orderNumber || returnReq.orderId}
                </Link>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusConfig.colorClasses}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.badgeBg}`} />
              {statusConfig.label}
            </span>
          </div>
        </div>

        {/* Quick Links */}
        <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-slate-100">
          <Link
            href={`/account/orders/${returnReq.orderId}`}
            className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-semibold transition shadow-2xs inline-flex items-center gap-1.5"
          >
            <Package className="w-3.5 h-3.5 text-slate-500" />
            View Original Order
          </Link>

          <Link
            href={`/help/guided-flow?orderId=${returnReq.orderId}`}
            className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition shadow-2xs inline-flex items-center gap-1.5"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
            Need Return Assistance?
          </Link>
        </div>
      </div>

      {/* Progress Timeline Stepper */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-2xs space-y-5">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-blue-600" />
          Live Return Progress
        </h2>

        <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {timelineSteps.map((step) => {
            const stepDateStr = step.timestamp
              ? new Date(step.timestamp).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : null;

            return (
              <div key={step.key} className="relative">
                <div
                  className={`absolute -left-6 sm:-left-8 top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    step.isCancelled
                      ? 'bg-rose-600 text-white shadow-xs'
                      : step.isCompleted
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white border-2 border-slate-300 text-slate-400'
                  }`}
                >
                  {step.isCancelled ? (
                    <X className="w-3.5 h-3.5" />
                  ) : step.isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <Clock className="w-3.5 h-3.5" />
                  )}
                </div>

                <div
                  className={`rounded-xl p-4 border transition ${
                    step.isCurrent
                      ? 'bg-blue-50/50 border-blue-200 shadow-2xs'
                      : 'bg-slate-50/70 border-slate-200/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                      {step.label}
                    </h3>
                    {stepDateStr && (
                      <span className="text-[11px] font-medium text-slate-500">
                        {stepDateStr}
                      </span>
                    )}
                  </div>
                  {step.description && (
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bank / Reference Note if processed */}
        {(returnReq.manualRefundReference || returnReq.razorpayRefundId) && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
            <p className="font-bold text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Settlement Completed
            </p>
            <p className="text-emerald-800 mt-1">
              Bank Reference / UTR Number:{' '}
              <strong className="font-mono text-slate-900">
                {returnReq.manualRefundReference || returnReq.razorpayRefundId}
              </strong>
            </p>
          </div>
        )}
      </div>

      {/* Returned Items Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-2xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Returned Items ({returnReq.items?.length || 0})
        </h2>

        <div className="divide-y divide-slate-100">
          {returnReq.items?.map((item) => {
            const product = item.orderItem?.product;
            const primaryImage =
              product?.images?.find((img) => img.isPrimary)?.url ||
              product?.images?.[0]?.url ||
              null;

            return (
              <div
                key={item.id}
                className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-14 h-14 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center p-1.5 flex-shrink-0">
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

                  <div className="min-w-0 space-y-0.5">
                    <h3 className="font-bold text-sm text-slate-900 truncate">
                      {product?.name || 'Hardware Unit'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Quantity: {item.quantity} • Unit Price: {formatIndianRupees(item.unitPrice)}
                    </p>
                  </div>
                </div>

                <div className="text-left sm:text-right flex-shrink-0">
                  <span className="text-base font-bold text-slate-900">
                    {formatIndianRupees(Number(item.unitPrice || 0) * item.quantity)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-3 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-500">Customer Reason for Return:</span>
          <p className="text-xs text-slate-800 mt-0.5 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            {returnReq.reason}
          </p>
        </div>
      </div>

      {/* Refund Destination Section (Editable for COD if not yet processed) */}
      {returnReq.type === 'REFUND' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                Refund Payout Destination
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {returnReq.refundMethod === 'SOURCE'
                  ? 'Prepaid order refund will be credited directly to your original payment card / UPI.'
                  : 'For Cash-on-Delivery, refunds are transferred directly to your verified bank account or UPI.'}
              </p>
            </div>

            {!isRefundProcessed && returnReq.refundMethod !== 'SOURCE' && !isEditingRefund && (
              <button
                type="button"
                onClick={() => setIsEditingRefund(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit Details
              </button>
            )}
          </div>

          {refundUpdateSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Refund destination updated successfully.
            </div>
          )}

          {/* Masked details display */}
          {!isEditingRefund && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {returnReq.refundMethod === 'SOURCE' ? (
                <div>
                  <span className="text-slate-400 block mb-0.5 text-[11px]">Destination:</span>
                  <strong className="text-slate-900">Original Payment Source (Razorpay)</strong>
                </div>
              ) : returnReq.refundUpiMasked ? (
                <div>
                  <span className="text-slate-400 block mb-0.5 text-[11px]">UPI VPA:</span>
                  <strong className="font-mono text-slate-900">{returnReq.refundUpiMasked}</strong>
                </div>
              ) : (
                <>
                  <div>
                    <span className="text-slate-400 block mb-0.5 text-[11px]">Bank Account:</span>
                    <strong className="font-mono text-slate-900">
                      {returnReq.refundAccountMasked || '••••••••'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5 text-[11px]">Bank IFSC:</span>
                    <strong className="font-mono text-slate-900">
                      {returnReq.refundIfscMasked || '••••••••'}
                    </strong>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Edit Form */}
          {isEditingRefund && (
            <form onSubmit={handleSaveRefundDetails} className="p-5 rounded-xl bg-blue-50/40 border border-blue-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                <h3 className="text-xs font-bold text-blue-900">
                  Update Refund Bank / UPI Details
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditingRefund(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                  aria-label="Close edit"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {editError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                  {editError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditMethod('BANK')}
                  className={`py-2 text-xs font-semibold rounded-lg border transition ${
                    editMethod === 'BANK'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  Bank Account
                </button>
                <button
                  type="button"
                  onClick={() => setEditMethod('UPI')}
                  className={`py-2 text-xs font-semibold rounded-lg border transition ${
                    editMethod === 'UPI'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  UPI VPA ID
                </button>
              </div>

              {editMethod === 'BANK' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Account Number</label>
                    <input
                      type="text"
                      value={bankForm.accountNumber}
                      onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                      placeholder="123456789012"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-blue-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Confirm Account Number</label>
                    <input
                      type="password"
                      value={bankForm.confirmAccountNumber}
                      onChange={(e) => setBankForm({ ...bankForm, confirmAccountNumber: e.target.value })}
                      placeholder="Re-enter to confirm"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-blue-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={bankForm.ifscCode}
                      onChange={(e) => setBankForm({ ...bankForm, ifscCode: e.target.value.toUpperCase() })}
                      placeholder="HDFC0001234"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white uppercase font-mono outline-none focus:border-blue-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Account Holder Name</label>
                    <input
                      type="text"
                      value={bankForm.accountHolderName}
                      onChange={(e) => setBankForm({ ...bankForm, accountHolderName: e.target.value })}
                      placeholder="Full Name as per Bank Passbook"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-blue-600"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="text-xs">
                  <label className="block text-slate-700 font-semibold mb-1">UPI Address (VPA)</label>
                  <input
                    type="text"
                    value={bankForm.upiId}
                    onChange={(e) => setBankForm({ ...bankForm, upiId: e.target.value })}
                    placeholder="name@okhdfcbank"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white outline-none focus:border-blue-600"
                    required
                  />
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={savingRefund}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingRefund ? 'Saving...' : 'Save & Confirm Details'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingRefund(false)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
