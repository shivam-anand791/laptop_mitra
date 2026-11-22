'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { X, PhoneCall, CheckCircle2, AlertCircle, Loader2, Clock } from 'lucide-react';

interface SupportCallbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  orderItemId?: string;
  productName: string;
  initialPhone?: string;
  onSuccess: (ticketNumber: string) => void;
}

const TIME_SLOTS = [
  'Morning (10:00 AM - 1:00 PM IST)',
  'Afternoon (1:00 PM - 4:00 PM IST)',
  'Evening (4:00 PM - 7:00 PM IST)',
];

export function SupportCallbackModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  orderItemId,
  productName,
  initialPhone,
  onSuccess,
}: SupportCallbackModalProps) {
  const [phone, setPhone] = useState(initialPhone || '');
  const [slot, setSlot] = useState(TIME_SLOTS[0]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdTicketNumber, setCreatedTicketNumber] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit phone number for callback.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const message = `SUPPORT CALLBACK REQUEST\n\nDevice: ${productName}\nOrder: #${orderNumber}\nRequested Phone: +91 ${cleanPhone.slice(-10)}\nPreferred Window: ${slot}\nCustomer Note: ${note.trim() || 'No additional note provided.'}`;

    try {
      const res = await api.createTicket({
        subject: `Callback Request: ${productName} (Order #${orderNumber})`,
        category: 'GENERAL_INQUIRY',
        type: 'CALLBACK',
        priority: 'HIGH',
        orderId,
        orderItemId,
        callbackPhone: cleanPhone.slice(-10),
        callbackSlot: slot,
        message,
      });

      const ticketNum = res?.ticket?.ticketNumber || res?.ticketNumber || 'LM-T-CALLBACK';
      setCreatedTicketNumber(ticketNum);
      onSuccess(ticketNum);
    } catch (err: any) {
      setError(err?.message || 'Failed to request callback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="callback-modal-title"
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <h2 id="callback-modal-title" className="text-sm font-bold text-slate-900">
                Request Support Callback
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

        {createdTicketNumber ? (
          <div className="py-6 space-y-4 text-center">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">Callback Scheduled</h3>
              <p className="text-xs text-slate-600">
                Ticket reference:{' '}
                <span className="font-mono font-bold text-blue-600">{createdTicketNumber}</span>
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1.5 text-left">
              <div className="flex items-center gap-1.5 text-slate-900 font-semibold">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Requested Window: {slot}</span>
              </div>
              <p className="text-slate-600 text-[11px]">
                A support specialist will reach you at{' '}
                <span className="font-mono font-semibold">+91 {phone}</span>.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition"
            >
              Done
            </button>
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
                Phone Number for Callback <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-2 rounded-xl">
                  +91
                </span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                  maxLength={10}
                  className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-600 focus:bg-white font-mono transition"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-700 block">
                Preferred Time Window <span className="text-rose-500">*</span>
              </label>
              <select
                value={slot}
                onChange={(e) => setSlot(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-600 focus:bg-white transition"
              >
                {TIME_SLOTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-700 block">
                Brief Note (Optional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Questions regarding delivery timing or warranty coverage"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-600 focus:bg-white transition"
              />
            </div>

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
                className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Requesting...
                  </>
                ) : (
                  'Confirm Callback'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

