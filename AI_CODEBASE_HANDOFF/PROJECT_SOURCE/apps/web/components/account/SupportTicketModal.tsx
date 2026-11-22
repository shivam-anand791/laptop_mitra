'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { X, MessageSquare, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

interface SupportTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  orderItemId?: string;
  productName: string;
  initialCategory?: string;
  initialSubject?: string;
  onSuccess: (ticketNumber: string) => void;
}

const TICKET_CATEGORIES = [
  { value: 'ORDER_DELIVERY', label: 'Order & Delivery Status' },
  { value: 'RETURNS_REFUNDS', label: 'Returns, Replacements & Refunds' },
  { value: 'WARRANTY_CLAIMS', label: 'Warranty & Hardware Issues' },
  { value: 'BILLING', label: 'Billing, Invoices & GST' },
  { value: 'RENTAL_LEASE', label: 'Rental & Lease Inquiries' },
  { value: 'GENERAL_INQUIRY', label: 'General Product Inquiry' },
];

export function SupportTicketModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  orderItemId,
  productName,
  initialCategory = 'ORDER_DELIVERY',
  initialSubject = '',
  onSuccess,
}: SupportTicketModalProps) {
  const [category, setCategory] = useState(initialCategory);
  const [subject, setSubject] = useState(
    initialSubject || `Assistance with ${productName} (Order #${orderNumber})`
  );
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdTicketNumber, setCreatedTicketNumber] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      setError('Please provide a subject line.');
      return;
    }
    if (!message.trim() || message.trim().length < 10) {
      setError('Please provide a detailed description (at least 10 characters).');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await api.createTicket({
        subject: subject.trim(),
        category,
        type: 'QUERY',
        orderId,
        orderItemId,
        message: message.trim(),
      });

      const ticketNum = res?.ticket?.ticketNumber || res?.ticketNumber || 'LM-T-QUERY';
      setCreatedTicketNumber(ticketNum);
      onSuccess(ticketNum);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit ticket. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ticket-modal-title"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 id="ticket-modal-title" className="text-sm font-bold text-slate-900">
                Raise a Support Ticket
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
              <h3 className="text-sm font-bold text-slate-900">Support Ticket Created</h3>
              <p className="text-xs text-slate-600">
                Ticket Reference:{' '}
                <span className="font-mono font-bold text-blue-600">{createdTicketNumber}</span>
              </p>
            </div>
            <p className="text-xs text-slate-600 max-w-sm mx-auto">
              Our support team has received your ticket. A specialist will review and update you within 4 business hours.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Link
                href="/account/tickets"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition shadow-xs"
              >
                View Ticket Details <ArrowRight className="w-3.5 h-3.5" />
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
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-600 focus:bg-white transition"
              >
                {TICKET_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-700 block">
                Subject <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-600 focus:bg-white transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-700 block">
                Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Please describe how we can assist you..."
                rows={4}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-600 focus:bg-white transition"
              />
              <span className="text-[10px] text-slate-400 block">
                Minimum 10 characters. Include any specific errors, dates, or details.
              </span>
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
                    Submitting...
                  </>
                ) : (
                  'Submit Ticket'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

