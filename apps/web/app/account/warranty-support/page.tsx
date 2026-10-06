'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { SupportTicket, SupportTicketMessage, Order } from '@/lib/types';
import {
  ShieldAlert,
  ShieldCheck,
  LifeBuoy,
  Plus,
  Send,
  MessageSquare,
  AlertCircle,
  RefreshCw,
  Clock,
  CheckCircle2,
  Package,
  X,
  ChevronRight,
  HelpCircle,
} from 'lucide-react';

export default function WarrantySupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active selected ticket for chat / thread view
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);

  // New ticket modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    orderId: '',
    category: 'WARRANTY',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ticketsData, ordersData] = await Promise.all([
        api.getTickets().catch(() => []),
        api.getOrders().catch(() => []),
      ]);
      setTickets(ticketsData || []);
      setOrders(ordersData || []);
      if (ticketsData && ticketsData.length > 0 && !selectedTicket) {
        setSelectedTicket(ticketsData[0]);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load support data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject.trim() || !formData.message.trim()) {
      setModalError('Subject and message are required.');
      return;
    }

    setSubmitting(true);
    setModalError(null);
    try {
      const newTicket = await api.createTicket({
        subject: formData.subject,
        orderId: formData.orderId || undefined,
        category: formData.category,
        message: formData.message,
      });

      setTickets([newTicket, ...tickets]);
      setSelectedTicket(newTicket);
      setIsModalOpen(false);
      setFormData({ subject: '', orderId: '', category: 'WARRANTY', message: '' });
    } catch (err: any) {
      setModalError(err?.message || 'Failed to create support ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyMessage.trim()) return;

    setReplyLoading(true);
    try {
      const newMsg = await api.addTicketMessage(selectedTicket.id, replyMessage.trim());
      const updatedMessages = [...(selectedTicket.messages || []), newMsg];
      const updatedTicket = { ...selectedTicket, messages: updatedMessages };
      setSelectedTicket(updatedTicket);
      setTickets(tickets.map((t) => (t.id === updatedTicket.id ? updatedTicket : t)));
      setReplyMessage('');
    } catch (err: any) {
      alert(err?.message || 'Failed to send reply');
    } finally {
      setReplyLoading(false);
    }
  };

  const getTicketStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    if (s === 'OPEN') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
          <Clock className="w-3 h-3" /> Open
        </span>
      );
    }
    if (s === 'IN_PROGRESS' || s === 'INVESTIGATING') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
          <Clock className="w-3 h-3" /> In Progress
        </span>
      );
    }
    if (s === 'RESOLVED' || s === 'CLOSED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="w-3 h-3" /> Resolved
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Warranty & Support</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Certified warranty claims, technical assistance, and support ticket threads for your laptops.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-all shadow-md shadow-blue-500/20"
        >
          <Plus className="w-4 h-4" /> Raise Support Ticket
        </button>
      </div>

      {/* Warranty Highlights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">6-Month Mitra Warranty</div>
              <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">Covers motherboard, battery & screen defects</div>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-400 flex items-center justify-center font-bold">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">7-Day Return Policy</div>
              <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">Hassle-free replacements for functional flaws</div>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/50 dark:bg-purple-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-400 flex items-center justify-center font-bold">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 dark:text-white">24/7 Priority Support</div>
              <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">Dedicated laptop technicians on call</div>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="h-64 bg-slate-100 dark:bg-slate-800/60 rounded-2xl animate-pulse" />
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

      {/* Main Ticket Layout: Sidebar list + Active thread */}
      {!loading && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[500px]">
          {/* Ticket List (4 cols) */}
          <div className="lg:col-span-4 border-r border-slate-200 dark:border-slate-800 flex flex-col">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">Your Tickets ({tickets.length})</h2>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[550px]">
              {tickets.length === 0 ? (
                <div className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs">
                  No support tickets raised yet. Click &ldquo;Raise Support Ticket&rdquo; if you need help.
                </div>
              ) : (
                tickets.map((t) => {
                  const isSelected = selectedTicket?.id === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTicket(t)}
                      className={`w-full text-left p-4 transition-colors flex flex-col gap-1.5 ${
                        isSelected
                          ? 'bg-blue-50/60 dark:bg-blue-950/30 border-l-4 border-blue-600'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-medium text-slate-500 dark:text-slate-400">
                          #{t.id.slice(-6)}
                        </span>
                        {getTicketStatusBadge(t.status)}
                      </div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-1">
                        {t.subject}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between mt-1">
                        <span>{t.category || 'General'}</span>
                        <span>{new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Active Ticket Thread (8 cols) */}
          <div className="lg:col-span-8 flex flex-col justify-between">
            {selectedTicket ? (
              <>
                {/* Header */}
                <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {selectedTicket.subject}
                      </h3>
                      {getTicketStatusBadge(selectedTicket.status)}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3">
                      <span>Ticket ID: <code className="text-slate-700 dark:text-slate-300 font-mono">#{selectedTicket.id}</code></span>
                      {selectedTicket.orderId && (
                        <span>• Linked Order: <code className="text-blue-600 dark:text-blue-400 font-mono">#{selectedTicket.orderId.slice(-8)}</code></span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Messages Feed */}
                <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 max-h-[400px]">
                  {/* Original ticket description */}
                  <div className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      You
                    </div>
                    <div className="flex-1 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 p-3.5 rounded-2xl rounded-tl-none">
                      <div className="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1">
                        Issue Description
                      </div>
                      <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {selectedTicket.message}
                      </p>
                      <div className="text-[10px] text-slate-400 mt-2 text-right">
                        {new Date(selectedTicket.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  {/* Thread messages */}
                  {selectedTicket.messages && selectedTicket.messages.map((msg) => {
                    const isStaff = msg.senderRole === 'ADMIN' || msg.senderRole === 'SUPPORT';
                    return (
                      <div key={msg.id} className={`flex gap-3 items-start ${isStaff ? '' : 'flex-row-reverse'}`}>
                        <div
                          className={`w-8 h-8 rounded-full text-white font-bold text-xs flex items-center justify-center shrink-0 ${
                            isStaff ? 'bg-emerald-600' : 'bg-blue-600'
                          }`}
                        >
                          {isStaff ? 'LM' : 'You'}
                        </div>
                        <div
                          className={`flex-1 max-w-[80%] p-3.5 rounded-2xl ${
                            isStaff
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none'
                              : 'bg-blue-600 text-white rounded-tr-none'
                          }`}
                        >
                          {isStaff && (
                            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                              LaptopMitra Support Staff
                            </div>
                          )}
                          <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                            {msg.message}
                          </p>
                          <div className={`text-[10px] mt-2 text-right ${isStaff ? 'text-slate-400' : 'text-blue-200'}`}>
                            {new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Reply Input */}
                <form onSubmit={handleSendReply} className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex gap-2">
                  <input
                    type="text"
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type a reply to the support team..."
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={replyLoading}
                  />
                  <button
                    type="submit"
                    disabled={replyLoading || !replyMessage.trim()}
                    className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold transition-colors inline-flex items-center gap-1.5 shadow-md shadow-blue-500/20"
                  >
                    {replyLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <LifeBuoy className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm font-medium">Select a ticket to view the conversation</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Raise Ticket Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Raise a Support / Warranty Ticket</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="p-5 space-y-4">
              {modalError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300">
                  {modalError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="WARRANTY">Warranty Claim (Motherboard / Display / Battery)</option>
                  <option value="DELIVERY">Delivery & Courier Delay</option>
                  <option value="RETURN">Return & Replacement Request</option>
                  <option value="TECHNICAL">Technical Troubleshooting & Drivers</option>
                  <option value="BILLING">GST Invoice & Payment Inquiry</option>
                  <option value="OTHER">Other Query</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="e.g. Battery not charging on ThinkPad T480"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Link an Order (Optional)
                </label>
                <select
                  value={formData.orderId}
                  onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- No specific order --</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      Order #{o.orderNumber || o.id.slice(-8)} (₹{o.totalAmount})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Detailed Description *
                </label>
                <textarea
                  rows={4}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="Please describe the issue, steps you have tried, and your serial number if applicable..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold transition-all shadow-md shadow-blue-500/20"
                >
                  {submitting ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
