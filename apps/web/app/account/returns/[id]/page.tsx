'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
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
  FileText,
  Building2,
  Save,
  X,
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
        images?: Array<{ url: string }>;
      };
    };
  }>;
}

const TIMELINE_STEPS = [
  { key: 'REQUESTED', label: 'Requested', desc: 'Return request submitted' },
  { key: 'APPROVED', label: 'Approved', desc: 'Authorized by technical team' },
  { key: 'PICKUP', label: 'Pickup', desc: 'Collected from doorstep' },
  { key: 'INSPECTED', label: 'Inspected', desc: 'Verified at central lab' },
  { key: 'REFUNDED', label: 'Completed', desc: 'Refund / Replacement issued' },
];

export default function ReturnDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const returnId = params?.id as string;
  const isNewlyCreated = searchParams?.get('new') === 'true';

  const [returnReq, setReturnReq] = useState<ReturnDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Bank/UPI state
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

  const fetchReturn = async () => {
    if (!returnId) return;
    try {
      const data = await api.getReturnRequest(returnId);
      setReturnReq(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load return details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturn();
  }, [returnId]);

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
      await fetchReturn();
    } catch (err: any) {
      setEditError(err?.message || 'Failed to update refund details');
    } finally {
      setSavingRefund(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !returnReq) {
    return (
      <div className="bg-white rounded-3xl p-10 text-center border border-slate-200">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="font-bold text-slate-800 text-lg mb-1">Return Record Not Found</h3>
        <p className="text-xs text-slate-500 mb-6">{error || 'This return request could not be loaded.'}</p>
        <Link
          href="/account/orders"
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
        >
          Back to Orders
        </Link>
      </div>
    );
  }

  // Calculate current active step index in timeline
  const getTimelineStepIndex = (status: string) => {
    switch (status) {
      case 'REQUESTED':
        return 0;
      case 'APPROVED':
        return 1;
      case 'PICKUP_SCHEDULED':
      case 'PICKED_UP':
        return 2;
      case 'INSPECTING':
      case 'INSPECTION_PASSED':
        return 3;
      case 'REFUND_PENDING':
      case 'REFUNDED':
      case 'REPLACED':
      case 'CLOSED':
        return 4;
      default:
        return 0;
    }
  };

  const currentStepIdx = getTimelineStepIndex(returnReq.status);
  const isRefundProcessed = returnReq.status === 'REFUNDED' || returnReq.status === 'CANCELLED';

  return (
    <div className="space-y-6">
      {/* ── Top Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/account/orders/${returnReq.orderId}`}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                {returnReq.returnNumber}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                {returnReq.status.replace(/_/g, ' ')}
              </span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 mt-1">
              Return & {returnReq.type === 'REPLACEMENT' ? 'Replacement' : 'Refund'} Tracker
            </h1>
          </div>
        </div>

        <Link
          href={`/account/orders/${returnReq.orderId}`}
          className="text-xs font-bold text-blue-600 hover:underline"
        >
          View Original Order #{returnReq.order?.orderNumber} →
        </Link>
      </div>

      {isNewlyCreated && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 text-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <strong>Return Request Logged!</strong> Return reference #{returnReq.returnNumber} has been received. Our team will verify and arrange doorstep pickup.
          </div>
        </div>
      )}

      {/* ── Live Visual Timeline Tracker ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900 mb-6">
          Live Return Progress
        </h2>

        <div className="relative">
          {/* Progress track */}
          <div className="hidden sm:block absolute top-4 left-0 right-0 h-1 bg-slate-100 -z-0">
            <div
              className="h-full bg-emerald-600 transition-all duration-500"
              style={{ width: `${(currentStepIdx / (TIMELINE_STEPS.length - 1)) * 100}%` }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative z-10">
            {TIMELINE_STEPS.map((step, idx) => {
              const isPast = idx < currentStepIdx;
              const isCurrent = idx === currentStepIdx;
              return (
                <div key={step.key} className="flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition ${
                      isPast || isCurrent
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                        : 'bg-slate-100 text-slate-400 border border-slate-200'
                    }`}
                  >
                    {isPast ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>
                  <div>
                    <h3 className={`text-xs font-bold ${isCurrent ? 'text-emerald-700' : 'text-slate-800'}`}>
                      {step.label}
                    </h3>
                    <p className="text-[11px] text-slate-400 sm:max-w-[120px] sm:mx-auto">
                      {step.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Refund / Reference Note if processed */}
        {(returnReq.manualRefundReference || returnReq.razorpayRefundId) && (
          <div className="mt-8 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs">
            <p className="font-bold text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Refund Processed Successfully
            </p>
            <p className="text-emerald-800 mt-1">
              Bank Reference / UTR Number: <strong className="font-mono text-slate-900">{returnReq.manualRefundReference || returnReq.razorpayRefundId}</strong>
            </p>
          </div>
        )}
      </div>

      {/* ── Returned Items & Reason ── */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900">
          Returned Items
        </h2>

        <div className="space-y-3">
          {returnReq.items.map((item) => (
            <div
              key={item.id}
              className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                  {item.orderItem?.product?.images?.[0]?.url ? (
                    <img
                      src={item.orderItem.product.images[0].url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    {item.orderItem?.product?.name || 'Hardware Unit'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Quantity: {item.quantity} (₹{Number(item.unitPrice || 0).toLocaleString('en-IN')})
                  </p>
                </div>
              </div>

              <span className="text-xs font-bold text-slate-700">
                ₹{Number((item.unitPrice || 0) * item.quantity).toLocaleString('en-IN')}
              </span>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-slate-100">
          <span className="text-xs font-bold text-slate-500">Customer Reason:</span>
          <p className="text-xs text-slate-800 mt-0.5">{returnReq.reason}</p>
        </div>
      </div>

      {/* ── Refund Payout Details Section (Editable for COD until processed) ── */}
      {returnReq.type === 'REFUND' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Refund Payout Destination
              </h2>
              <p className="text-xs text-slate-500">
                {returnReq.refundMethod === 'SOURCE'
                  ? 'Prepaid order refund will be credited directly to your original payment card / UPI via Razorpay.'
                  : 'For Cash-on-Delivery, refunds are transferred directly to your bank account or UPI.'}
              </p>
            </div>

            {!isRefundProcessed && returnReq.refundMethod !== 'SOURCE' && !isEditingRefund && (
              <button
                onClick={() => setIsEditingRefund(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
              >
                <Edit2 className="w-3.5 h-3.5" /> Edit Details
              </button>
            )}
          </div>

          {refundUpdateSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Refund bank details updated successfully.
            </div>
          )}

          {/* Masked details display */}
          {!isEditingRefund && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {returnReq.refundMethod === 'SOURCE' ? (
                <div>
                  <span className="text-slate-400 block mb-0.5">Destination:</span>
                  <strong className="text-slate-900">Original Payment Source (Razorpay)</strong>
                </div>
              ) : returnReq.refundUpiMasked ? (
                <div>
                  <span className="text-slate-400 block mb-0.5">UPI Address:</span>
                  <strong className="font-mono text-slate-900">{returnReq.refundUpiMasked}</strong>
                </div>
              ) : (
                <>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Bank Account Number:</span>
                    <strong className="font-mono text-slate-900">{returnReq.refundAccountMasked || '••••••••'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Bank IFSC Code:</span>
                    <strong className="font-mono text-slate-900">{returnReq.refundIfscMasked || '••••••••'}</strong>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Edit Form */}
          {isEditingRefund && (
            <form onSubmit={handleSaveRefundDetails} className="p-5 rounded-2xl bg-blue-50/50 border border-blue-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-blue-100">
                <h3 className="text-xs font-bold text-blue-900">
                  Update Refund Bank / UPI Details
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditingRefund(false)}
                  className="p-1 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {editError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                  {editError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEditMethod('BANK')}
                  className={`py-2 text-xs font-bold rounded-lg border transition ${
                    editMethod === 'BANK' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200'
                  }`}
                >
                  Bank Account
                </button>
                <button
                  type="button"
                  onClick={() => setEditMethod('UPI')}
                  className={`py-2 text-xs font-bold rounded-lg border transition ${
                    editMethod === 'UPI' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-700 border-slate-200'
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
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
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
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
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
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white uppercase font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Account Holder Name</label>
                    <input
                      type="text"
                      value={bankForm.accountHolderName}
                      onChange={(e) => setBankForm({ ...bankForm, accountHolderName: e.target.value })}
                      placeholder="Full Name as per Bank"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                      required
                    />
                  </div>
                </div>
              ) : (
                <div className="text-xs">
                  <label className="block text-slate-700 font-semibold mb-1">UPI Address</label>
                  <input
                    type="text"
                    value={bankForm.upiId}
                    onChange={(e) => setBankForm({ ...bankForm, upiId: e.target.value })}
                    placeholder="name@okhdfcbank"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white"
                    required
                  />
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={savingRefund}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingRefund ? 'Saving...' : 'Save & Confirm Details'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingRefund(false)}
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold"
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
