'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { X, RotateCcw, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

interface ItemReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  orderItemId: string;
  productName: string;
  pickupAddress?: any;
  onSuccess: (returnNumber: string) => void;
}

const RETURN_REASONS = [
  'Damaged or defective on arrival (cracked casing, broken screen, failed boot)',
  'Different model or specifications received (RAM, storage, or CPU mismatch)',
  'Quality or performance issue (excessive heating, battery health failure)',
  'Missing accessories or charger',
  'No longer needed / Changed mind',
];

export function ItemReturnModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  orderItemId,
  productName,
  pickupAddress,
  onSuccess,
}: ItemReturnModalProps) {
  const [returnType, setReturnType] = useState<'REPLACEMENT' | 'REFUND'>('REPLACEMENT');
  const [reason, setReason] = useState(RETURN_REASONS[0]);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [returnStatus, setReturnStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const fullReason = `[${returnType}] ${reason}${details.trim() ? ` - Details: ${details.trim()}` : ''}`;

    try {
      const res = await api.requestOrderReturn(orderId, fullReason);
      setReturnStatus(res?.returnStatus || 'RETURN_REQUESTED');
      onSuccess(orderNumber);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit return request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="return-modal-title"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 id="return-modal-title" className="text-sm font-bold text-slate-900">
                Return or Replacement Request
              </h2>
              <p className="text-[11px] text-slate-500">
                Order #{orderNumber} • {productName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {returnStatus ? (
          <div className="py-6 space-y-4 text-center">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">Return Request Submitted</h3>
              <p className="text-xs text-slate-600">
                Request registered for order <span className="font-semibold text-slate-900">#{orderNumber}</span>
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs text-slate-700 space-y-2">
              <p className="font-semibold text-slate-900">What happens next?</p>
              <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[11px]">
                <li>Our logistics partner will contact you to schedule doorstep reverse pickup within 48 hours.</li>
                <li>Ensure the laptop is placed in its original packaging along with all accessories and charger.</li>
                <li>Once the item is inspected at our hub, your {returnType === 'REPLACEMENT' ? 'replacement unit will be dispatched' : 'refund will be credited to original payment source in 3 business days'}.</li>
              </ul>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Link
                href="/account/returns"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white text-xs font-semibold rounded-xl transition shadow-xs"
              >
                Track Return Status <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-700 block">
                Preferred Resolution <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setReturnType('REPLACEMENT')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    returnType === 'REPLACEMENT'
                      ? 'border-blue-600 bg-blue-50/40 text-blue-900 ring-1 ring-blue-600'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <p className="text-xs font-bold">Replacement</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Exchange for identical certified unit</p>
                </button>
                <button
                  type="button"
                  onClick={() => setReturnType('REFUND')}
                  className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                    returnType === 'REFUND'
                      ? 'border-blue-600 bg-blue-50/40 text-blue-900 ring-1 ring-blue-600'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <p className="text-xs font-bold">Refund</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Credited to original payment source</p>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-700 block">
                Reason for Return <span className="text-rose-500">*</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-600 focus:bg-white transition"
              >
                {RETURN_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-700 block">
                Specific Details / Notes
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Explain the defect or reason in detail..."
                rows={3}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-600 focus:bg-white transition"
              />
            </div>

            {pickupAddress && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                  Reverse Pickup Address
                </span>
                <p className="text-slate-800 mt-1">
                  {pickupAddress.addressLine1 || pickupAddress.address},{' '}
                  {pickupAddress.city}, {pickupAddress.state} -{' '}
                  {pickupAddress.postalCode || pickupAddress.pincode}
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold bg-amber-800 hover:bg-amber-900 text-white rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Return Request'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

