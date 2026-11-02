'use client';

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { SkeletonList, ErrorState } from '@/components/account';
import { getTicketStatusConfig } from '@/lib/account-helpers';
import { useSupportConfig } from '@/lib/support-config';
import {
  ArrowLeft,
  Send,
  LifeBuoy,
  CheckCircle2,
  Clock,
  RotateCcw,
  Star,
  Package,
  AlertCircle,
  Copy,
  Check,
  ShieldCheck,
  User,
} from 'lucide-react';

interface MessageItem {
  id: string;
  authorUserId?: string | null;
  authorRole: 'CUSTOMER' | 'SUPPORT' | 'ADMIN' | 'SYSTEM';
  body: string;
  createdAt: string;
  authorUser?: { name?: string | null; role?: string };
  attachments?: Array<{ id: string; fileName: string; storageKey: string }>;
}

interface TicketDetail {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  issueType?: string;
  type: string;
  status: string;
  priority: string;
  orderId?: string;
  reopenCount: number;
  csatScore?: number | null;
  csatComment?: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  order?: {
    id: string;
    orderNumber: string;
    finalAmount: number;
    status: string;
    items?: Array<{ product?: { name?: string } }>;
  };
  messages: MessageItem[];
}

export default function TicketDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const ticketId = params?.id as string;
  const { data: supportConfig } = useSupportConfig();
  const isNewlyCreated = searchParams?.get('new') === 'true';

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // CSAT Rating state
  const [ratingScore, setRatingScore] = useState<number>(5);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchTicket = useCallback(async () => {
    if (!ticketId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTicket(ticketId);
      setTicket((data as any) || null);
      if (data?.csatScore) {
        setRatingSubmitted(true);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load ticket details.');
    } finally {
      setLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchTicket();
  }, [fetchTicket]);

  const handleCopyTicketNumber = () => {
    if (ticket?.ticketNumber && navigator?.clipboard) {
      navigator.clipboard.writeText(ticket.ticketNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || sendingReply) return;
    setSendingReply(true);

    try {
      await api.addTicketMessage(ticketId, replyText.trim());
      setReplyText('');
      await fetchTicket();
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      alert(err?.message || 'Failed to send reply. Please try again.');
    } finally {
      setSendingReply(false);
    }
  };

  const handleReopenTicket = async () => {
    setReopening(true);
    try {
      await api.reopenTicket(ticketId);
      await fetchTicket();
    } catch (err: any) {
      alert(err?.message || 'Failed to reopen ticket.');
    } finally {
      setReopening(false);
    }
  };

  const handleSubmitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingRating(true);
    try {
      await api.rateTicket(ticketId, ratingScore, ratingComment);
      setRatingSubmitted(true);
      await fetchTicket();
    } catch (err: any) {
      alert(err?.message || 'Failed to submit rating.');
    } finally {
      setSubmittingRating(false);
    }
  };

  const statusConfig = useMemo(() => {
    return getTicketStatusConfig(ticket?.status);
  }, [ticket?.status]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-3 shadow-2xs">
        <SkeletonList count={2} />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <ErrorState
        title="Ticket Not Found"
        message={error || 'This support ticket could not be loaded.'}
        onRetry={fetchTicket}
      />
    );
  }

  const isClosedOrResolved = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED';
  const dateStr = ticket.createdAt
    ? new Date(ticket.createdAt).toLocaleDateString('en-IN', {
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
            <strong>Ticket #{ticket.ticketNumber} Created!</strong> Our support team will review your details
            {supportConfig?.firstResponseSlaHours
              ? ` and aims to respond within ${supportConfig.firstResponseSlaHours} hours.`
              : '.'}
          </div>
        </div>
      )}

      {/* Header Container */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/account/tickets"
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition"
              aria-label="Back to Tickets"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                  {ticket.subject}
                </h1>
                <button
                  type="button"
                  onClick={handleCopyTicketNumber}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded transition"
                  title="Copy ticket number"
                  aria-label="Copy ticket number"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Ticket <span className="font-mono font-semibold text-slate-800">#{ticket.ticketNumber}</span> • Logged on {dateStr}
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

        {/* Linked Order Banner */}
        {ticket.order && (
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-600">
              <Package className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Associated Order:{' '}
                <strong className="text-slate-900">#{ticket.order.orderNumber}</strong>
                {ticket.order.items?.[0]?.product?.name && ` (${ticket.order.items[0].product.name})`}
              </span>
            </div>
            <Link
              href={`/account/orders/${ticket.order.id}`}
              className="text-blue-600 font-semibold hover:underline"
            >
              View Order Details →
            </Link>
          </div>
        )}
      </div>

      {/* Message Conversation Stream */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-6 py-4 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <LifeBuoy className="w-4 h-4 text-blue-600" />
            Support Discussion Thread
          </h2>
          <span className="text-xs text-slate-500">
            {ticket.messages.length} {ticket.messages.length === 1 ? 'message' : 'messages'}
          </span>
        </div>

        <div className="p-6 space-y-5 max-h-[600px] overflow-y-auto">
          {ticket.messages.map((msg) => {
            const isCustomer = msg.authorRole === 'CUSTOMER';
            const isSystem = msg.authorRole === 'SYSTEM';
            const timeStr = msg.createdAt
              ? new Date(msg.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '';

            if (isSystem) {
              return (
                <div key={msg.id} className="text-center py-2">
                  <span className="text-[11px] text-slate-500 bg-slate-100 px-3 py-1 rounded-full font-medium">
                    {msg.body}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-xl ${
                  isCustomer ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    isCustomer
                      ? 'bg-blue-600 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {isCustomer ? <User className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                </div>

                <div
                  className={`rounded-2xl p-4 space-y-1.5 shadow-2xs text-xs leading-relaxed ${
                    isCustomer
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-slate-50 text-slate-900 border border-slate-200 rounded-tl-none'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 text-[11px]">
                    <span className={`font-semibold ${isCustomer ? 'text-blue-100' : 'text-slate-700'}`}>
                      {isCustomer ? 'You' : 'LaptopMitra Support'}
                    </span>
                    <span className={isCustomer ? 'text-blue-200' : 'text-slate-400'}>
                      {timeStr}
                    </span>
                  </div>

                  <p className="whitespace-pre-wrap">{msg.body}</p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply or Reopen Footer */}
        <div className="p-5 bg-slate-50/50 border-t border-slate-100">
          {isClosedOrResolved ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-100 border border-slate-200 text-xs">
              <div>
                <p className="font-semibold text-slate-800">This ticket has been marked as resolved.</p>
                <p className="text-slate-500 mt-0.5">
                  Still experiencing an issue with this request? You can reopen it
                  {supportConfig?.reopenWindowDays ? ` within ${supportConfig.reopenWindowDays} days` : ' during the configured reopen window'}.
                </p>
              </div>
              <button
                type="button"
                onClick={handleReopenTicket}
                disabled={reopening}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition cursor-pointer self-start sm:self-center shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5 inline mr-1.5" />
                {reopening ? 'Reopening...' : 'Reopen Ticket'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSendReply} className="space-y-3">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply here..."
                rows={3}
                className="w-full p-3.5 rounded-xl border border-slate-200 text-xs focus:border-blue-600 focus:ring-1 focus:ring-blue-600 outline-none transition bg-white resize-none"
              />
              <div className="flex items-center justify-end">
                <button
                  type="submit"
                  disabled={sendingReply || !replyText.trim()}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {sendingReply ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* CSAT Customer Satisfaction Widget (When Resolved) */}
      {isClosedOrResolved && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            Support Satisfaction Rating
          </h2>

          {ratingSubmitted ? (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              Thank you for your feedback! Your rating has been recorded to help us improve our service.
            </div>
          ) : (
            <form onSubmit={handleSubmitRating} className="space-y-4">
              <p className="text-xs text-slate-600">
                How would you rate the speed and quality of support provided on this inquiry?
              </p>

              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingScore(star)}
                    className="p-1 text-slate-300 hover:text-amber-500 transition cursor-pointer"
                    aria-label={`Rate ${star} star`}
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= ratingScore
                          ? 'text-amber-500 fill-amber-500'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-semibold text-slate-700 ml-2">
                  {ratingScore === 5 ? 'Excellent' : ratingScore === 4 ? 'Good' : ratingScore === 3 ? 'Average' : 'Needs Improvement'}
                </span>
              </div>

              <div>
                <input
                  type="text"
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  placeholder="Optional comment or suggestions..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-blue-600 outline-none bg-slate-50/50"
                />
              </div>

              <button
                type="submit"
                disabled={submittingRating}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs disabled:opacity-50"
              >
                {submittingRating ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
