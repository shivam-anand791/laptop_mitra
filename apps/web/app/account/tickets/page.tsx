'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { SkeletonList, ErrorState } from '@/components/account';
import { getTicketStatusConfig } from '@/lib/account-helpers';
import {
  LifeBuoy,
  Plus,
  MessageSquare,
  Clock,
  ChevronRight,
  Search,
  X,
  Sparkles,
  RefreshCw,
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

type TicketFilterTab = 'ALL' | 'ACTIVE' | 'RESOLVED';

const TABS: { id: TicketFilterTab; label: string }[] = [
  { id: 'ALL', label: 'All Tickets' },
  { id: 'ACTIVE', label: 'Active Inquiries' },
  { id: 'RESOLVED', label: 'Resolved' },
];

export default function MyTicketsPage() {
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTab, setSelectedTab] = useState<TicketFilterTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getTickets();
      setTickets((data as any) || []);
    } catch (err: any) {
      setError(err?.message || 'Unable to load support tickets. Please check your connection.');
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const counts = useMemo(() => {
    const c: Record<TicketFilterTab, number> = {
      ALL: tickets.length,
      ACTIVE: 0,
      RESOLVED: 0,
    };

    for (const t of tickets) {
      const s = (t.status || '').toUpperCase();
      if (s === 'RESOLVED' || s === 'CLOSED') {
        c.RESOLVED += 1;
      } else {
        c.ACTIVE += 1;
      }
    }

    return c;
  }, [tickets]);

  const unreadCount = useMemo(() => {
    return tickets.filter((t) => t.hasUnread).length;
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return tickets.filter((t) => {
      const s = (t.status || '').toUpperCase();

      // 1. Tab filter
      if (selectedTab === 'ACTIVE' && (s === 'RESOLVED' || s === 'CLOSED')) return false;
      if (selectedTab === 'RESOLVED' && !(s === 'RESOLVED' || s === 'CLOSED')) return false;

      // 2. Search query
      if (q) {
        const num = (t.ticketNumber || '').toLowerCase();
        const subj = (t.subject || '').toLowerCase();
        const cat = (t.category || '').toLowerCase();
        const ord = (t.orderId || '').toLowerCase();
        if (!num.includes(q) && !subj.includes(q) && !cat.includes(q) && !ord.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [tickets, selectedTab, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header Container */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-2xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <LifeBuoy className="w-5 h-5 text-blue-600" />
              Customer Support &amp; Care
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Track technical diagnostic tickets, warranty claims, and staff conversation threads.
              {unreadCount > 0 && (
                <span className="ml-2 font-semibold text-blue-600 inline-flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                  {unreadCount} unread {unreadCount === 1 ? 'update' : 'updates'}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-center">
            <button
              type="button"
              onClick={fetchTickets}
              disabled={loading}
              className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-xl transition cursor-pointer"
              title="Refresh tickets"
              aria-label="Refresh tickets"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>

            <Link
              href="/help/guided-flow"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Raise Ticket
            </Link>
          </div>
        </div>

        {/* Filter Bar: Search and Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {TABS.map((tab) => {
              const isSelected = selectedTab === tab.id;
              const count = counts[tab.id];

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedTab(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition whitespace-nowrap inline-flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 bg-slate-50 border border-slate-200/60'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                      isSelected
                        ? 'bg-slate-800 text-slate-200'
                        : 'bg-slate-200/80 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ticket # or subject..."
              className="w-full pl-8 pr-8 py-1.5 rounded-xl border border-slate-200 text-xs focus:border-blue-600 outline-none transition bg-slate-50/50 hover:bg-white"
              aria-label="Search tickets"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main List */}
      {loading ? (
        <SkeletonList count={3} />
      ) : error ? (
        <ErrorState
          title="Unable to load tickets"
          message={error}
          onRetry={fetchTickets}
        />
      ) : tickets.length === 0 ? (
        /* Empty State: Zero tickets */
        <div className="text-center py-16 px-4 bg-white rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mx-auto">
            <MessageSquare className="w-7 h-7" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-base font-bold text-slate-900">No Support Tickets</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              You haven&apos;t raised any support tickets or warranty claims yet. If you need hardware assistance, our certified engineers are here to help.
            </p>
          </div>
          <Link
            href="/help/guided-flow"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
          >
            <Plus className="w-4 h-4" /> Start Guided Help Flow
          </Link>
        </div>
      ) : filteredTickets.length === 0 ? (
        /* Empty Filter State */
        <div className="text-center py-14 px-4 bg-white rounded-2xl border border-dashed border-slate-300 shadow-2xs space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 mx-auto">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h3 className="text-sm font-bold text-slate-900">No matching tickets</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              No tickets matched your search query or selected filter tab.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedTab('ALL');
              setSearchQuery('');
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      ) : (
        /* Rendered Ticket Cards */
        <div className="space-y-3">
          {filteredTickets.map((t) => {
            const statusConfig = getTicketStatusConfig(t.status);
            const dateStr = t.updatedAt || t.createdAt
              ? new Date(t.updatedAt || t.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })
              : '';

            return (
              <Link
                key={t.id}
                href={`/account/tickets/${t.id}`}
                className="block bg-white rounded-2xl p-5 border border-slate-200 hover:border-slate-300 hover:shadow-sm transition group shadow-2xs space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                      {t.ticketNumber}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${statusConfig.colorClasses}`}
                    >
                      {statusConfig.label}
                    </span>
                    <span className="text-xs text-slate-500">
                      {t.category?.replace(/_/g, ' ') || 'General Support'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Updated {dateStr}</span>
                    {t.hasUnread && (
                      <span
                        className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse ml-1"
                        title="New reply from support team"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition">
                    {t.subject}
                  </h3>
                  {t.lastMessage && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                      {t.lastMessage}
                    </p>
                  )}
                </div>

                <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    {t.messageCount} {t.messageCount === 1 ? 'message' : 'messages'}
                  </span>
                  <span className="text-blue-600 font-semibold group-hover:translate-x-0.5 transition inline-flex items-center gap-1">
                    View Conversation <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
