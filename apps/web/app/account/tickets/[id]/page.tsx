'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
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
  FileText,
  Paperclip,
  ShieldAlert,
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
  const router = useRouter();
  const { user } = useAuth();
  const ticketId = params?.id as string;
  const isNewlyCreated = searchParams?.get('new') === 'true';

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // CSAT Rating state
  const [ratingScore, setRatingScore] = useState<number>(5);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratingSubmitted, setRatingSubmitted] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchTicket = async () => {
    if (!ticketId) return;
    try {
      const data = await api.getTicket(ticketId);
      setTicket((data as any) || null);
      if (data?.csatScore) {
        setRatingSubmitted(true);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();
  }, [ticketId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || sendingReply) return;

    setSendingReply(true);
    try {
      await api.addTicketMessage(ticketId, replyText.trim());
      setReplyText('');
      await fetchTicket();
    } catch (err: any) {
      alert(err?.message || 'Failed to send message');
    } finally {
      setSendingReply(false);
    }
  };

  const handleReopen = async () => {
    if (reopening) return;
    if (!confirm('Are you sure you want to reopen this ticket?')) return;

    setReopening(true);
    try {
      await api.reopenTicket(ticketId);
      await fetchTicket();
    } catch (err: any) {
      alert(err?.message || 'Failed to reopen ticket');
    } finally {
      setReopening(false);
    }
  };

  const handleRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRating) return;

    setSubmittingRating(true);
    try {
      await api.rateTicket(ticketId, ratingScore, ratingComment);
      setRatingSubmitted(true);
      await fetchTicket();
    } catch (err: any) {
      alert(err?.message || 'Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="bg-white rounded-3xl p-10 text-center border border-slate-200">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="font-bold text-slate-800 text-lg mb-1">Ticket Not Found</h3>
        <p className="text-xs text-slate-500 mb-6">{error || 'This ticket could not be loaded.'}</p>
        <Link
          href="/account/tickets"
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
        >
          Back to My Tickets
        </Link>
      </div>
    );
  }

  const isResolvedOrClosed = ticket.status === 'RESOLVED' || ticket.status === 'CLOSED';
  const canReopen = ticket.status === 'RESOLVED';

  return (
    <div className="space-y-6">
      {/* ── Top Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/account/tickets"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                {ticket.ticketNumber}
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  ticket.status === 'RESOLVED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : ticket.status === 'REOPENED'
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {ticket.status.replace(/_/g, ' ')}
              </span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 mt-1">{ticket.subject}</h1>
          </div>
        </div>

        {canReopen && (
          <button
            onClick={handleReopen}
            disabled={reopening}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
            {reopening ? 'Reopening...' : 'Reopen Ticket (7-Day Window)'}
          </button>
        )}
      </div>

      {/* Success banner if just created */}
      {isNewlyCreated && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 text-xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <strong>Ticket Submitted Successfully!</strong> Your ticket #{ticket.ticketNumber} has been logged with our team. First response target is within 24 hours.
          </div>
        </div>
      )}

      {/* ── Order Context (if linked) ── */}
      {ticket.order && (
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-slate-500 shrink-0" />
            <div>
              <span className="font-bold text-slate-900">
                Associated Order #{ticket.order.orderNumber}
              </span>
              <span className="text-slate-500 ml-2">
                (₹{Number(ticket.order.finalAmount || 0).toLocaleString('en-IN')})
              </span>
              <p className="text-slate-400 text-[11px]">
                {ticket.order.items?.[0]?.product?.name || 'Hardware Unit'}
              </p>
            </div>
          </div>
          <Link
            href={`/account/orders/${ticket.order.id}`}
            className="text-blue-600 font-bold hover:underline"
          >
            View Order Details →
          </Link>
        </div>
      )}

      {/* ── Conversation Thread ── */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col h-[550px] overflow-hidden">
        {/* Messages List Container */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {ticket.messages.map((msg) => {
            const isMe = msg.authorRole === 'CUSTOMER';
            const isSystem = msg.authorRole === 'SYSTEM';

            if (isSystem) {
              return (
                <div key={msg.id} className="text-center my-3">
                  <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                    {msg.body}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-2 mb-1 px-1">
                  <span className="text-[11px] font-bold text-slate-500">
                    {isMe ? 'You' : 'LaptopMitra Support Specialist'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(msg.createdAt).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <div
                  className={`max-w-[85%] sm:max-w-xl rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-br-none shadow-sm'
                      : 'bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200/60'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.body}</p>

                  {/* Attachments preview */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/20 flex flex-wrap gap-2">
                      {msg.attachments.map((att) => (
                        <div
                          key={att.id}
                          className="flex items-center gap-1.5 px-2 py-1 bg-black/10 rounded-lg text-xs"
                        >
                          <Paperclip className="w-3 h-3" />
                          <span className="truncate max-w-[120px]">{att.fileName}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply Input Box */}
        <div className="p-4 bg-slate-50 border-t border-slate-200">
          {ticket.status === 'CLOSED' ? (
            <p className="text-xs text-center text-slate-500 py-2">
              This support ticket has been closed. If you need further help, please raise a new ticket.
            </p>
          ) : (
            <form onSubmit={handleSendReply} className="flex items-center gap-2">
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Type your reply message..."
                disabled={sendingReply}
                className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="submit"
                disabled={!replyText.trim() || sendingReply}
                className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl transition shadow-xs"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>

      {/* ── CSAT Satisfaction Rating Box (if resolved/closed) ── */}
      {isResolvedOrClosed && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <h3 className="font-bold text-sm text-slate-900 mb-1">
            Support Experience Feedback
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            How satisfied are you with the resolution of this issue?
          </p>

          {ratingSubmitted ? (
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Thank you! You rated this resolution {ticket.csatScore || ratingScore} out of 5 stars.
            </div>
          ) : (
            <form onSubmit={handleRate} className="space-y-4">
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRatingScore(star)}
                    className="p-1.5 focus:outline-none transition"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= ratingScore
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-bold text-slate-600 ml-2">
                  {ratingScore === 5 ? 'Excellent' : ratingScore === 4 ? 'Good' : ratingScore === 3 ? 'Average' : 'Poor'}
                </span>
              </div>

              <input
                type="text"
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                placeholder="Optional feedback comment (e.g. fast response, friendly agent)..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
              />

              <button
                type="submit"
                disabled={submittingRating}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
              >
                {submittingRating ? 'Submitting...' : 'Submit Rating'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
