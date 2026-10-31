'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { PaymentRecord } from '@/lib/types';
import { formatIndianRupees } from '@/lib/account-helpers';
import { SkeletonList, ErrorState } from '@/components/account';
import EmptyState from '@/components/EmptyState';
import {
  CreditCard,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  Check,
} from 'lucide-react';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchPayments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getPaymentHistory();
      setPayments(data || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load payment history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const copyText = (text: string, id: string) => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'COMPLETED' || s === 'PAID' || s === 'CAPTURED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" /> Paid
        </span>
      );
    }
    if (s === 'REFUNDED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          <RefreshCw className="w-3 h-3" /> Refunded
        </span>
      );
    }
    if (s === 'REFUND_PENDING') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3 h-3" /> Refund Processing
        </span>
      );
    }
    if (s === 'FAILED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle className="w-3 h-3" /> Failed
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
        <Clock className="w-3 h-3" /> {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-2xs space-y-2">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Payments &amp; Refunds</h1>
        <p className="text-xs text-slate-500">
          Review your Razorpay transaction history, payment statuses, and return refunds.
        </p>
      </div>

      {/* Security Info Card */}
      <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-900 leading-relaxed">
          <span className="font-semibold">Razorpay Bank-Grade Encryption:</span> LaptopMitra does not store debit/credit card numbers or CVVs. All transactions are securely processed directly via Razorpay with 256-bit SSL encryption.
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && <SkeletonList count={3} />}

      {/* Error State */}
      {!loading && error && (
        <ErrorState
          title="Failed to Load Payment Records"
          message={error}
          onRetry={fetchPayments}
        />
      )}

      {/* Empty State */}
      {!loading && !error && payments.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-2xs">
          <EmptyState
            variant="orders"
            actionLabel="Browse Laptops"
            actionHref="/products"
          />
        </div>
      )}

      {/* Payment List */}
      {!loading && !error && payments.length > 0 && (
        <div className="space-y-3">
          {payments.map((p) => {
            const txnId = p.transactionId || p.razorpayPaymentId || '';
            return (
              <div
                key={p.id}
                className="p-5 bg-white rounded-2xl border border-slate-200 shadow-2xs hover:border-slate-300 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-600">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        {p.method || 'Razorpay Online'}
                      </span>
                      {getStatusBadge(p.status)}
                    </div>

                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {txnId && (
                        <span className="inline-flex items-center gap-1">
                          Txn:{' '}
                          <code className="text-slate-800 font-mono bg-slate-100 px-1 py-0.5 rounded text-[11px]">
                            {txnId}
                          </code>
                          <button
                            type="button"
                            onClick={() => copyText(txnId, p.id)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded transition cursor-pointer"
                            title="Copy transaction ID"
                          >
                            {copiedId === p.id ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </span>
                      )}
                      <span>•</span>
                      <span>
                        {new Date(p.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {p.refundStatus && (
                      <div className="mt-2 text-xs bg-purple-50 text-purple-700 p-2 rounded-lg inline-flex items-center gap-1.5 border border-purple-200">
                        <RefreshCw className="w-3.5 h-3.5 text-purple-600" />
                        Refund Status: <span className="font-semibold">{p.refundStatus}</span>
                        {p.refundAmount && ` (${formatIndianRupees(p.refundAmount)})`}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                  <div className="text-base font-extrabold text-slate-900">
                    {formatIndianRupees(p.amount)}
                  </div>
                  {p.orderId && (
                    <Link
                      href={`/account/orders/${p.orderId}`}
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-semibold mt-1"
                    >
                      View Order <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
