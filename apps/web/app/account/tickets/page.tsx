'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  LifeBuoy,
  Plus,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Filter,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface TicketListItem {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  issueType?: string;
  type: string;
  status: string;
  priority: string;
  orderId?: string;
  hasUnread: boolean;
  messageCount: number;
  lastMessage?: string;
  csatScore?: number;
  createdAt: string;
  updatedAt: string;
}

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ALL');

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const data = await api.getTickets();
      setTickets((data as any) || []);
    } catch {
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const filteredTickets = tickets.filter((t) => {
    if (filterTab === 'ACTIVE') {
      return t.status !== 'RESOLVED' && t.status !== 'CLOSED';
    }
    if (filterTab === 'RESOLVED') {
      return t.status === 'RESOLVED' || t.status === 'CLOSED';
    }
    return true;
  });
  const unreadCount = tickets.filter((ticket) => ticket.hasUnread).length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'NEW':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'OPEN':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'WAITING_ON_CUSTOMER':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'IN_PROGRESS':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'RESOLVED':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'REOPENED':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'CLOSED':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <LifeBuoy className="w-5 h-5 text-blue-600" />
            My Support Tickets
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track inquiries, warranty claims, and conversation threads with our support team.
            {unreadCount > 0 && (
              <span className="ml-2 font-semibold text-blue-700" role="status">
                {unreadCount} unread {unreadCount === 1 ? 'update' : 'updates'}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchTickets}
            className="p-2 bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition shadow-xs"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
          <Link
            href="/help/guided-flow"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            Raise New Ticket
          </Link>
        </div>
      </div>

      {/* ── Filter Tabs ── */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setFilterTab('ALL')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
            filterTab === 'ALL'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Tickets ({tickets.length})
        </button>
        <button
          onClick={() => setFilterTab('ACTIVE')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
            filterTab === 'ACTIVE'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Active ({tickets.filter((t) => t.status !== 'RESOLVED' && t.status !== 'CLOSED').length})
        </button>
        <button
          onClick={() => setFilterTab('RESOLVED')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
            filterTab === 'RESOLVED'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Resolved ({tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length})
        </button>
      </div>

      {/* ── Tickets List ── */}
      {loading ? (
        <div className="py-16 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-base mb-1">No Tickets Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-6">
            {filterTab === 'ALL'
              ? 'You have not raised any support inquiries or warranty claims yet.'
              : `No tickets matching filter '${filterTab.toLowerCase()}'.`}
          </p>
          <Link
            href="/help/guided-flow"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> Start Guided Support Flow
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map((t) => (
            <Link
              key={t.id}
              href={`/account/tickets/${t.id}`}
              className="block bg-white rounded-2xl p-5 border border-slate-200 hover:border-blue-400 hover:shadow-md transition group"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                    {t.ticketNumber}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getStatusBadge(
                      t.status,
                    )}`}
                  >
                    {t.status.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-slate-400">
                    {t.category.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    Updated {new Date(t.updatedAt || t.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                  {t.hasUnread && (
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" title="New staff reply" />
                  )}
                </div>
              </div>

              <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-700 transition">
                {t.subject}
              </h3>

              {t.lastMessage && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                  {t.lastMessage}
                </p>
              )}

              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span>{t.messageCount} {t.messageCount === 1 ? 'message' : 'messages'}</span>
                <span className="text-blue-600 font-bold group-hover:underline flex items-center gap-1">
                  View Thread <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
