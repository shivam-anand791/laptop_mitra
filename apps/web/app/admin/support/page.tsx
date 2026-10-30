'use client';

import React, { Suspense, useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import PageHeader from '../../../components/admin/PageHeader';
import DataTable, { Column } from '../../../components/admin/DataTable';
import { StatusBadge } from '../../../components/admin/StatusBadge';
import AdminModal from '../../../components/admin/AdminModal';
import { adminApi } from '../../../lib/admin-api';
import { api } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import { formatDate, formatCurrency } from '../../../lib/format';
import { useToast } from '../../../components/ui/Toast';

type TabKey = 'tickets' | 'help' | 'replies' | 'settings' | 'reports';

const TICKET_STATUSES = [
  'ALL',
  'NEW',
  'OPEN',
  'WAITING_ON_CUSTOMER',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
  'REOPENED',
  'MERGED',
] as const;

const PRIORITIES = ['ALL', 'URGENT', 'HIGH', 'MEDIUM', 'LOW'] as const;

export default function AdminSupportPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading Support Workspace...</div>}>
      <SupportWorkspaceContent />
    </Suspense>
  );
}

function SupportWorkspaceContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { addToast } = useToast();
  const isAdmin = user?.role === 'ADMIN';
  const [exportingTickets, setExportingTickets] = useState(false);

  const exportTickets = async () => {
    setExportingTickets(true);
    try {
      await adminApi.downloadSupportTicketsCsv();
      addToast('success', 'Support ticket export downloaded.');
    } catch (error) {
      addToast('error', error instanceof Error ? error.message : 'Failed to export support tickets.');
    } finally {
      setExportingTickets(false);
    }
  };

  // Active tab state
  const [activeTab, setActiveTab] = useState<TabKey>(
    (searchParams.get('tab') as TabKey) || 'tickets'
  );

  const switchTab = (tab: TabKey) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Help & Support Desk"
        description="Omnichannel ticketing, SLA monitoring, returns triage, knowledge base, and automated templates"
        actions={isAdmin ? (
          <button
            type="button"
            onClick={() => void exportTickets()}
            disabled={exportingTickets}
            className="btn btn-secondary text-sm disabled:opacity-50"
          >
            {exportingTickets ? 'Exporting...' : 'Export tickets CSV'}
          </button>
        ) : undefined}
      />

      {/* Workspace Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 space-x-6 overflow-x-auto text-sm font-medium">
        <button
          onClick={() => switchTab('tickets')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'tickets'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-semibold'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          Tickets Queue
        </button>

        <button
          onClick={() => switchTab('help')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'help'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-semibold'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Knowledge Base
        </button>

        <button
          onClick={() => switchTab('replies')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'replies'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-semibold'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          Saved Replies
        </button>

        <button
          onClick={() => switchTab('settings')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'settings'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-semibold'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          </svg>
          SLA & Policies
        </button>

        <button
          onClick={() => switchTab('reports')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap ${
            activeTab === 'reports'
              ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-semibold'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Analytics & CSAT
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'tickets' && <TicketsQueuePanel />}
      {activeTab === 'help' && <HelpCenterPanel />}
      {activeTab === 'replies' && <SavedRepliesPanel />}
      {activeTab === 'settings' && <SupportSettingsPanel isAdmin={isAdmin} />}
      {activeTab === 'reports' && <SupportReportsPanel />}
    </div>
  );
}

// =============================================================================
// 1. Tickets Queue Panel & Detail Modal
// =============================================================================
function TicketsQueuePanel() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [openCount, setOpenCount] = useState(0);
  const [breachedCount, setBreachedCount] = useState(0);
  const [staffUsers, setStaffUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState('ALL');
  const [slaBreachedOnly, setSlaBreachedOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Selected ticket for modal
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      const res = await adminApi.getAdminTickets({
        status: statusFilter,
        priority: priorityFilter,
        assigneeId: assigneeFilter,
        slaBreached: slaBreachedOnly,
        search: searchQuery,
        page,
        pageSize,
      });
      setTickets(res.items || []);
      setTotal(res.total || 0);
      setOpenCount(res.openCount || 0);
      setBreachedCount(res.breachedCount || 0);
    } catch (err) {
      console.error('Failed to fetch tickets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter, priorityFilter, assigneeFilter, slaBreachedOnly, page]);

  useEffect(() => {
    adminApi.getStaffUsers().then((res) => setStaffUsers(res || [])).catch(() => null);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchTickets();
  };

  const columns: Column<any>[] = [
    {
      key: 'ticketNumber',
      header: 'Ticket #',
      render: (t) => (
        <span className="font-mono font-semibold text-slate-900 dark:text-white">
          {t.ticketNumber}
        </span>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (t) => (
        <div>
          <div className="font-medium text-slate-900 dark:text-white">{t.user?.name || 'Customer'}</div>
          <div className="text-xs text-slate-500">{t.user?.email || t.user?.phone || 'No contact'}</div>
        </div>
      ),
    },
    {
      key: 'subject',
      header: 'Subject & Category',
      render: (t) => (
        <div className="max-w-xs">
          <div className="font-medium text-slate-900 dark:text-white truncate" title={t.subject}>
            {t.subject}
          </div>
          <div className="text-xs text-slate-500">{t.category?.replace(/_/g, ' ')}</div>
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (t) => <StatusBadge status={t.priority} size="sm" />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) => <StatusBadge status={t.status} size="sm" />,
    },
    {
      key: 'assignee',
      header: 'Assignee',
      render: (t) => (
        <span className="text-xs text-slate-600 dark:text-slate-300">
          {t.assignee?.name || <span className="text-slate-400 italic">Unassigned</span>}
        </span>
      ),
    },
    {
      key: 'sla',
      header: 'SLA Status',
      render: (t) => {
        if (t.slaBreached) {
          return (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 px-2 py-0.5 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-red-600" /> SLA Breached
            </span>
          );
        }
        if (t.firstResponseDueAt && !t.firstResponseAt && t.status === 'NEW') {
          const diffHours = Math.round((new Date(t.firstResponseDueAt).getTime() - Date.now()) / (1000 * 60 * 60));
          return (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded">
              Due in {diffHours > 0 ? `${diffHours}h` : 'soon'}
            </span>
          );
        }
        return <span className="text-xs text-slate-400">—</span>;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (t) => (
        <button
          onClick={() => setSelectedTicketId(t.id)}
          className="px-3 py-1 text-xs font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 transition-colors"
        >
          Manage
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Active Queue</div>
          <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{openCount}</div>
          <div className="text-xs text-slate-500 mt-1">Pending customer / staff resolution</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Breached SLA</div>
          <div className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">{breachedCount}</div>
          <div className="text-xs text-slate-500 mt-1">First response &gt; 24h target</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Tickets</div>
          <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{total}</div>
          <div className="text-xs text-slate-500 mt-1">Lifetime support records</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Staff Online</div>
          <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{staffUsers.length}</div>
          <div className="text-xs text-slate-500 mt-1">Specialists active in directory</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by ticket #, customer name, email, or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg
              className="w-4 h-4 text-slate-400 absolute left-3 top-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              {TICKET_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
              className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              {PRIORITIES.map((pr) => (
                <option key={pr} value={pr}>
                  {pr}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-slate-500">Assignee:</span>
            <select
              value={assigneeFilter}
              onChange={(e) => {
                setAssigneeFilter(e.target.value);
                setPage(1);
              }}
              className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              <option value="ALL">All Assignees</option>
              <option value="unassigned">Unassigned Only</option>
              {staffUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300 cursor-pointer ml-auto">
            <input
              type="checkbox"
              checked={slaBreachedOnly}
              onChange={(e) => {
                setSlaBreachedOnly(e.target.checked);
                setPage(1);
              }}
              className="rounded text-red-600 focus:ring-red-500"
            />
            <span className="text-red-600 dark:text-red-400 font-semibold">Breached SLA Only</span>
          </label>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={tickets}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        pagination={{
          currentPage: page,
          totalItems: total,
          pageSize,
          onPageChange: (p) => setPage(p),
        }}
      />


      {/* Ticket Detail Inspection & Messaging Modal */}
      {selectedTicketId && (
        <TicketDetailModal
          ticketId={selectedTicketId}
          staffUsers={staffUsers}
          onClose={() => setSelectedTicketId(null)}
          onTicketUpdated={fetchTickets}
        />
      )}
    </div>
  );
}

// =============================================================================
// Ticket Detail Modal (Conversation Thread, Internal Notes, Actions, Order Context)
// =============================================================================
function TicketDetailModal({
  ticketId,
  staffUsers,
  onClose,
  onTicketUpdated,
}: {
  ticketId: string;
  staffUsers: any[];
  onClose: () => void;
  onTicketUpdated: () => void;
}) {
  const [ticket, setTicket] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'messages' | 'notes' | 'timeline'>('messages');

  // Input states
  const [replyMessage, setReplyMessage] = useState('');
  const [internalNote, setInternalNote] = useState('');
  const [savedReplies, setSavedReplies] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mergeTargetInput, setMergeTargetInput] = useState('');
  const [isMerging, setIsMerging] = useState(false);

  const fetchTicket = async () => {
    try {
      setIsLoading(true);
      const res = await adminApi.getAdminTicket(ticketId);
      setTicket(res);
    } catch (err) {
      console.error('Failed to load ticket detail:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTicket();
    adminApi.getSavedReplies().then((res) => setSavedReplies(res || [])).catch(() => null);
  }, [ticketId]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      await adminApi.updateAdminTicket(ticketId, { status: newStatus });
      fetchTicket();
      onTicketUpdated();
    } catch (err: any) {
      alert(err?.message || 'Failed to update ticket status');
    }
  };

  const handlePriorityChange = async (newPriority: string) => {
    try {
      await adminApi.updateAdminTicket(ticketId, { priority: newPriority });
      fetchTicket();
      onTicketUpdated();
    } catch (err: any) {
      alert(err?.message || 'Failed to update ticket priority');
    }
  };

  const handleAssigneeChange = async (assigneeId: string) => {
    try {
      await adminApi.updateAdminTicket(ticketId, {
        assigneeId: assigneeId === 'unassigned' ? null : assigneeId,
      });
      fetchTicket();
      onTicketUpdated();
    } catch (err: any) {
      alert(err?.message || 'Failed to assign ticket');
    }
  };

  const handleSendReply = async () => {
    if (!replyMessage.trim()) return;
    try {
      setIsSubmitting(true);
      await api.addTicketMessage(ticketId, replyMessage.trim());
      setReplyMessage('');
      fetchTicket();
      onTicketUpdated();
    } catch (err: any) {
      alert(err?.message || 'Failed to send reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddInternalNote = async () => {
    if (!internalNote.trim()) return;
    try {
      setIsSubmitting(true);
      await adminApi.addTicketInternalNote(ticketId, internalNote.trim());
      setInternalNote('');
      fetchTicket();
      onTicketUpdated();
    } catch (err: any) {
      alert(err?.message || 'Failed to add internal note');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMergeSubmit = async () => {
    if (!mergeTargetInput.trim()) return;
    try {
      setIsSubmitting(true);
      await adminApi.mergeTickets(ticketId, mergeTargetInput.trim());
      alert('Ticket successfully merged.');
      setIsMerging(false);
      fetchTicket();
      onTicketUpdated();
    } catch (err: any) {
      alert(err?.message || 'Failed to merge ticket');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !ticket) {
    return (
      <AdminModal open={true} onClose={onClose} title="Loading Ticket Details..." size="xl">
        <div className="p-8 text-center text-slate-500">Loading conversation thread & context...</div>
      </AdminModal>
    );
  }

  const publicMessages = (ticket.messages || []).filter((m: any) => !m.isInternal);
  const internalNotes = (ticket.messages || []).filter((m: any) => m.isInternal);

  return (
    <AdminModal
      open={true}
      onClose={onClose}
      title={`Ticket #${ticket.ticketNumber} — ${ticket.subject}`}
      size="xl"
    >

      <div className="space-y-6">
        {/* Top Control Bar: Status, Priority, Assignee, Merge */}
        <div className="bg-slate-50 dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-500">Status:</span>
              <select
                value={ticket.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="px-2 py-1 rounded font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {TICKET_STATUSES.filter((s) => s !== 'ALL').map((st) => (
                  <option key={st} value={st}>
                    {st.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-500">Priority:</span>
              <select
                value={ticket.priority}
                onChange={(e) => handlePriorityChange(e.target.value)}
                className="px-2 py-1 rounded font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {PRIORITIES.filter((p) => p !== 'ALL').map((pr) => (
                  <option key={pr} value={pr}>
                    {pr}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-slate-500">Assignee:</span>
              <select
                value={ticket.assigneeId || 'unassigned'}
                onChange={(e) => handleAssigneeChange(e.target.value)}
                className="px-2 py-1 rounded font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="unassigned">Unassigned</option>
                {staffUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {ticket.status === 'MERGED' ? (
              <span className="text-amber-600 font-medium">Merged into {ticket.mergedInto?.ticketNumber || 'another ticket'}</span>
            ) : (
              <button
                onClick={() => setIsMerging(!isMerging)}
                className="px-2.5 py-1 text-xs font-medium rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
              >
                Merge Duplicate
              </button>
            )}
          </div>
        </div>

        {/* Merge Prompt Input */}
        {isMerging && (
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg flex items-center gap-3 text-xs">
            <span className="font-semibold text-amber-800 dark:text-amber-200">
              Target Ticket ID or Number:
            </span>
            <input
              type="text"
              placeholder="e.g. target ticket UUID"
              value={mergeTargetInput}
              onChange={(e) => setMergeTargetInput(e.target.value)}
              className="px-2 py-1 rounded border border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white flex-1"
            />
            <button
              onClick={handleMergeSubmit}
              disabled={isSubmitting}
              className="px-3 py-1 font-semibold rounded bg-amber-600 hover:bg-amber-700 text-white"
            >
              Confirm Merge
            </button>
          </div>
        )}

        {/* Grid Split: Left 2/3 conversation & notes, Right 1/3 Order Context & Customer */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Modal Internal Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 space-x-4 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('messages')}
                className={`pb-2 border-b-2 ${
                  activeTab === 'messages'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Conversation ({publicMessages.length})
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`pb-2 border-b-2 ${
                  activeTab === 'notes'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Internal Notes ({internalNotes.length})
              </button>
              <button
                onClick={() => setActiveTab('timeline')}
                className={`pb-2 border-b-2 ${
                  activeTab === 'timeline'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Event Timeline
              </button>
            </div>

            {/* TAB 1: Messages Thread */}
            {activeTab === 'messages' && (
              <div className="space-y-4">
                <div className="max-h-[380px] overflow-y-auto space-y-3 p-1">
                  {publicMessages.map((msg: any) => {
                    const isStaff = msg.authorRole === 'ADMIN' || msg.authorRole === 'SUPPORT';
                    return (
                      <div
                        key={msg.id}
                        className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                          isStaff
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 ml-6'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 mr-6'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                            {msg.authorUser?.name || (isStaff ? 'LaptopMitra Support' : 'Customer')}
                            <span className="text-[10px] font-normal text-slate-500">
                              ({msg.authorRole})
                            </span>
                          </span>
                          <span className="text-slate-400">{formatDate(msg.createdAt)}</span>
                        </div>
                        <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                          {msg.body}
                        </p>
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1.5 border-t border-slate-200/50 dark:border-slate-700/50">
                            {msg.attachments.map((att: any) => (
                              <a
                                key={att.id}
                                href={`#${att.storageKey}`}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-[10px] font-mono text-slate-600 dark:text-slate-300"
                              >
                                📎 {att.fileName || 'Attachment'}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Reply Dock with Saved Reply Picker */}
                <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-900 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Reply to Customer
                    </span>
                    {savedReplies.length > 0 && (
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            setReplyMessage((prev) => (prev ? `${prev}\n\n${e.target.value}` : e.target.value));
                          }
                        }}
                        defaultValue=""
                        className="text-[11px] px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      >
                        <option value="">Insert Saved Reply...</option>
                        {savedReplies.map((r) => (
                          <option key={r.id} value={r.content}>
                            {r.shortcut} — {r.title}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <textarea
                    rows={3}
                    placeholder="Type official response here..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleSendReply}
                      disabled={isSubmitting || !replyMessage.trim()}
                      className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors"
                    >
                      {isSubmitting ? 'Sending...' : 'Send Reply'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Internal Notes */}
            {activeTab === 'notes' && (
              <div className="space-y-4">
                <div className="max-h-[380px] overflow-y-auto space-y-3 p-1">
                  {internalNotes.length === 0 ? (
                    <div className="text-xs text-slate-400 italic text-center py-6">
                      No internal notes recorded. Use the form below to leave private staff notes.
                    </div>
                  ) : (
                    internalNotes.map((note: any) => (
                      <div
                        key={note.id}
                        className="p-3 rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/20 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-amber-900 dark:text-amber-200">
                            🔒 {note.authorUser?.name || 'Staff Member'}
                          </span>
                          <span className="text-slate-400">{formatDate(note.createdAt)}</span>
                        </div>
                        <p className="text-slate-800 dark:text-slate-200 whitespace-pre-wrap">
                          {note.body}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 bg-slate-50 dark:bg-slate-900 space-y-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Add Private Staff Note (Never visible to customer)
                  </span>
                  <textarea
                    rows={2}
                    placeholder="Enter diagnostic details, supplier info, or instructions..."
                    value={internalNote}
                    onChange={(e) => setInternalNote(e.target.value)}
                    className="w-full p-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleAddInternalNote}
                      disabled={isSubmitting || !internalNote.trim()}
                      className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 transition-colors"
                    >
                      {isSubmitting ? 'Saving...' : 'Add Note'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: Event Timeline */}
            {activeTab === 'timeline' && (
              <div className="max-h-[460px] overflow-y-auto space-y-2 p-1 text-xs">
                {(ticket.events || []).map((ev: any) => (
                  <div
                    key={ev.id}
                    className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800"
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                    <div className="flex-1 space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 dark:text-white uppercase tracking-wider text-[10px]">
                          {ev.eventType}
                        </span>
                        <span className="text-[10px] text-slate-400">{formatDate(ev.createdAt)}</span>
                      </div>
                      <div className="text-slate-600 dark:text-slate-300">
                        {ev.oldValue ? `${ev.oldValue} ➔ ${ev.newValue}` : ev.newValue || 'Event recorded'}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Actor: {ev.actorUser?.name || ev.actorRole || 'System'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Context Sidebar */}
          <div className="space-y-4">
            {/* Customer Information Card */}
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2 text-xs">
              <div className="font-semibold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-1.5">
                Customer Details
              </div>
              <div>
                <div className="text-slate-500 text-[10px]">Name</div>
                <div className="font-medium text-slate-900 dark:text-white">{ticket.user?.name || 'Customer'}</div>
              </div>
              <div>
                <div className="text-slate-500 text-[10px]">Email</div>
                <div className="font-mono text-slate-700 dark:text-slate-300 truncate">{ticket.user?.email || 'N/A'}</div>
              </div>
              <div>
                <div className="text-slate-500 text-[10px]">Phone</div>
                <div className="font-medium text-slate-900 dark:text-white">{ticket.user?.phone || 'N/A'}</div>
              </div>
              {ticket.callbackPhone && (
                <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40">
                  <div className="text-amber-800 dark:text-amber-300 font-semibold text-[10px]">Callback Requested</div>
                  <div className="text-slate-800 dark:text-slate-200">{ticket.callbackPhone}</div>
                  <div className="text-slate-500 text-[10px]">Slot: {ticket.callbackSlot || 'Standard'}</div>
                </div>
              )}
            </div>

            {/* Linked Order Context Card */}
            {ticket.order ? (
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-1.5">
                  <span className="font-semibold text-slate-900 dark:text-white">Linked Order</span>
                  <StatusBadge status={ticket.order.status} size="sm" />
                </div>
                <div>
                  <div className="text-slate-500 text-[10px]">Order Number</div>
                  <div className="font-mono font-semibold text-slate-900 dark:text-white">
                    {ticket.order.orderNumber}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500 text-[10px]">Total Amount</div>
                  <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(ticket.order.finalAmount || ticket.order.total || 0)}
                  </div>
                </div>
                {ticket.order.items && ticket.order.items.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-1.5">
                    <div className="text-slate-500 text-[10px]">Items ({ticket.order.items.length})</div>
                    {ticket.order.items.map((item: any) => (
                      <div key={item.id} className="text-[11px] text-slate-700 dark:text-slate-300 truncate">
                        • {item.product?.name || 'Laptop'} (Qty: {item.quantity})
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3.5 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400">
                No order linked to this ticket
              </div>
            )}

            {/* CSAT Feedback Card (if rated) */}
            {ticket.csatScore && (
              <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/20 text-xs space-y-1.5">
                <div className="font-semibold text-emerald-900 dark:text-emerald-300">
                  Customer Satisfaction
                </div>
                <div className="flex items-center gap-1 text-amber-500 font-bold">
                  {'★'.repeat(ticket.csatScore)}{'☆'.repeat(5 - ticket.csatScore)}
                  <span className="text-slate-700 dark:text-slate-300 ml-1">({ticket.csatScore}/5)</span>
                </div>
                {ticket.csatComment && (
                  <p className="text-slate-700 dark:text-slate-300 italic text-[11px]">
                    &quot;{ticket.csatComment}&quot;
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminModal>
  );
}

// =============================================================================
// 2. Help Center Knowledge Base Manager Panel
// =============================================================================
function HelpCenterPanel() {
  const [categories, setCategories] = useState<any[]>([]);
  const [articles, setArticles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [editingArticle, setEditingArticle] = useState<any | null>(null);
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Form states for Category
  const [catTitle, setCatTitle] = useState('');
  const [catSlug, setCatSlug] = useState('');
  const [catIcon, setCatIcon] = useState('HelpCircle');
  const activeCategories = categories.filter((category) => category.isActive);

  // Form states for Article
  const [artCategory, setArtCategory] = useState('');
  const [artTitle, setArtTitle] = useState('');
  const [artSlug, setArtSlug] = useState('');
  const [artSummary, setArtSummary] = useState('');
  const [artContent, setArtContent] = useState('');
  const [artPublished, setArtPublished] = useState(true);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [cats, arts] = await Promise.all([
        adminApi.getAdminHelpCategories(),
        adminApi.getAdminHelpArticles(),
      ]);
      setCategories(cats || []);
      setArticles(arts || []);
    } catch (err) {
      console.error('Failed to load help center data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateArticle = () => {
    setEditingArticle(null);
    setArtCategory(activeCategories[0]?.id || '');
    setArtTitle('');
    setArtSlug('');
    setArtSummary('');
    setArtContent('');
    setArtPublished(true);
    setIsArticleModalOpen(true);
  };

  const openEditArticle = (a: any) => {
    setEditingArticle(a);
    setArtCategory(a.categoryId);
    setArtTitle(a.title);
    setArtSlug(a.slug);
    setArtSummary(a.summary || '');
    setArtContent(a.content);
    setArtPublished(a.isPublished);
    setIsArticleModalOpen(true);
  };

  const handleSaveArticle = async () => {
    if (!artTitle.trim() || !artSlug.trim() || !artContent.trim() || !artCategory) {
      alert('Please fill out all required fields (Category, Title, Slug, Content)');
      return;
    }
    try {
      if (editingArticle) {
        await adminApi.updateAdminHelpArticle(editingArticle.id, {
          categoryId: artCategory,
          title: artTitle.trim(),
          slug: artSlug.trim(),
          summary: artSummary.trim() || undefined,
          content: artContent.trim(),
          isPublished: artPublished,
        });
      } else {
        await adminApi.createAdminHelpArticle({
          categoryId: artCategory,
          title: artTitle.trim(),
          slug: artSlug.trim(),
          summary: artSummary.trim() || undefined,
          content: artContent.trim(),
          isPublished: artPublished,
        });
      }
      setIsArticleModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to save article');
    }
  };

  const handleArchiveArticle = async (id: string) => {
    if (!confirm('Unpublish this article and retain it in the knowledge base?')) return;
    try {
      await adminApi.archiveAdminHelpArticle(id);
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to archive article');
    }
  };

  const handleArchiveCategory = async (id: string) => {
    if (!confirm('Archive this category and unpublish all of its articles?')) return;
    try {
      await adminApi.archiveAdminHelpCategory(id);
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to archive category');
    }
  };

  const handleSaveCategory = async () => {
    if (!catTitle.trim() || !catSlug.trim()) {
      alert('Title and slug are required');
      return;
    }
    try {
      await adminApi.createAdminHelpCategory({
        title: catTitle.trim(),
        slug: catSlug.trim(),
        icon: catIcon.trim() || 'HelpCircle',
      });
      setCatTitle('');
      setCatSlug('');
      setIsCategoryModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to create category');
    }
  };

  const articleColumns: Column<any>[] = [
    {
      key: 'title',
      header: 'Article Title',
      render: (a) => (
        <div>
          <div className="font-semibold text-slate-900 dark:text-white">{a.title}</div>
          <div className="text-xs font-mono text-slate-400">/{a.slug}</div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (a) => <span className="text-xs text-slate-600 dark:text-slate-300">{a.category?.title}</span>,
    },
    {
      key: 'status',
      header: 'State',
      render: (a) => (
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
            a.isPublished
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
          }`}
        >
          {a.isPublished ? 'Published' : 'Unpublished / Draft'}
        </span>
      ),
    },
    {
      key: 'views',
      header: 'Views / Votes',
      render: (a) => (
        <div className="text-xs text-slate-500">
          {a.viewCount || 0} views • <span className="text-emerald-600 font-semibold">+{a.helpfulCount || 0}</span> / -{a.notHelpfulCount || 0}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (a) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => openEditArticle(a)}
            className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
          >
            Edit
          </button>
          {a.isPublished && (
            <button
              onClick={() => handleArchiveArticle(a.id)}
              className="px-2.5 py-1 text-xs font-semibold rounded text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
            >
              Archive
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Knowledge Base Articles</h3>
          <p className="text-xs text-slate-500">Manage customer self-serve guides and warranty/return policies</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50"
          >
            + New Category
          </button>
          <button
            onClick={openCreateArticle}
            disabled={activeCategories.length === 0}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
          >
            + New Article
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3">Categories</h4>
        <div className="space-y-2">
          {categories.map((category) => (
            <div key={category.id} className="flex items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{category.title}</span>
                <span className="ml-2 text-slate-500">
                  {category.isActive ? 'Active' : 'Archived'} · {category.articleCount ?? category._count?.articles ?? 0} articles
                </span>
              </div>
              {category.isActive && (
                <button
                  onClick={() => handleArchiveCategory(category.id)}
                  className="px-2.5 py-1 font-semibold rounded text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                >
                  Archive
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <DataTable
        columns={articleColumns}
        data={articles}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
      />

      {/* Create / Edit Article Modal */}
      {isArticleModalOpen && (
        <AdminModal
          open={true}
          onClose={() => setIsArticleModalOpen(false)}
          title={editingArticle ? 'Edit Help Article' : 'Create Knowledge Base Article'}
          size="lg"
        >

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Category *
                </label>
                <select
                  value={artCategory}
                  onChange={(e) => setArtCategory(e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {categories.filter((c) => c.isActive || c.id === artCategory).map((c) => (
                    <option key={c.id} value={c.id} disabled={!c.isActive}>
                      {c.title}{c.isActive ? '' : ' (Archived)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Publishing Status
                </label>
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={artPublished}
                    disabled={!categories.find((category) => category.id === artCategory)?.isActive}
                    onChange={(e) => setArtPublished(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    Publish immediately (visible to customers)
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Article Title *
              </label>
              <input
                type="text"
                placeholder="e.g. How to track your order"
                value={artTitle}
                onChange={(e) => {
                  setArtTitle(e.target.value);
                  if (!editingArticle) {
                    setArtSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                  }
                }}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                URL Slug *
              </label>
              <input
                type="text"
                value={artSlug}
                onChange={(e) => setArtSlug(e.target.value)}
                className="w-full p-2 font-mono text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Short Summary
              </label>
              <input
                type="text"
                placeholder="One-line snippet displayed in search results..."
                value={artSummary}
                onChange={(e) => setArtSummary(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Markdown Body Content *
              </label>
              <textarea
                rows={9}
                placeholder="Write article instructions in markdown (# Heading, **bold**, - list)..."
                value={artContent}
                onChange={(e) => setArtContent(e.target.value)}
                className="w-full p-2.5 font-mono text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setIsArticleModalOpen(false)}
                className="px-4 py-2 font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveArticle}
                className="px-4 py-2 font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
              >
                Save Article
              </button>
            </div>
          </div>
        </AdminModal>
      )}

      {/* Create Category Modal */}
      {isCategoryModalOpen && (
        <AdminModal
          open={true}
          onClose={() => setIsCategoryModalOpen(false)}
          title="Create Help Center Category"
          size="md"
        >

          <div className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Category Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Battery & Power Troubleshooting"
                value={catTitle}
                onChange={(e) => {
                  setCatTitle(e.target.value);
                  setCatSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                }}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                URL Slug *
              </label>
              <input
                type="text"
                value={catSlug}
                onChange={(e) => setCatSlug(e.target.value)}
                className="w-full p-2 font-mono text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-4 py-2 font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCategory}
                className="px-4 py-2 font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
              >
                Create Category
              </button>
            </div>
          </div>
        </AdminModal>
      )}
    </div>
  );
}

// =============================================================================
// 3. Saved Replies Panel (Templated Quick Responses)
// =============================================================================
function SavedRepliesPanel() {
  const [replies, setReplies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReply, setEditingReply] = useState<any | null>(null);

  const [shortcut, setShortcut] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [content, setContent] = useState('');

  const loadReplies = async () => {
    try {
      setIsLoading(true);
      const res = await adminApi.getSavedReplies();
      setReplies(res || []);
    } catch (err) {
      console.error('Failed to load saved replies:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReplies();
  }, []);

  const openCreate = () => {
    setEditingReply(null);
    setShortcut('');
    setTitle('');
    setCategory('');
    setContent('');
    setIsModalOpen(true);
  };

  const openEdit = (r: any) => {
    setEditingReply(r);
    setShortcut(r.shortcut);
    setTitle(r.title);
    setCategory(r.category || '');
    setContent(r.content);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!shortcut.trim() || !title.trim() || !content.trim()) {
      alert('Shortcut, Title, and Template Content are required');
      return;
    }
    try {
      if (editingReply) {
        await adminApi.updateSavedReply(editingReply.id, {
          shortcut: shortcut.trim(),
          title: title.trim(),
          category: category.trim() || undefined,
          content: content.trim(),
        });
      } else {
        await adminApi.createSavedReply({
          shortcut: shortcut.trim(),
          title: title.trim(),
          category: category.trim() || undefined,
          content: content.trim(),
        });
      }
      setIsModalOpen(false);
      loadReplies();
    } catch (err: any) {
      alert(err?.message || 'Failed to save reply template');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this response template?')) return;
    try {
      await adminApi.deleteSavedReply(id);
      loadReplies();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete response template');
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'shortcut',
      header: 'Shortcut Code',
      render: (r) => (
        <span className="font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded text-xs">
          {r.shortcut}
        </span>
      ),
    },
    {
      key: 'title',
      header: 'Template Title',
      render: (r) => <span className="font-semibold text-slate-900 dark:text-white">{r.title}</span>,
    },
    {
      key: 'category',
      header: 'Category',
      render: (r) => <span className="text-xs text-slate-500">{r.category || 'General'}</span>,
    },
    {
      key: 'snippet',
      header: 'Response Snippet',
      render: (r) => (
        <p className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-md">
          {r.content}
        </p>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (r) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => openEdit(r)}
            className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(r.id)}
            className="px-2.5 py-1 text-xs font-semibold rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Saved Reply Templates</h3>
          <p className="text-xs text-slate-500">Reusable snippets inserted into ticket replies via shortcut triggers</p>
        </div>
        <button
          onClick={openCreate}
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
        >
          + New Saved Reply
        </button>
      </div>

      <DataTable
        columns={columns}
        data={replies}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
      />

      {isModalOpen && (
        <AdminModal
          open={true}
          onClose={() => setIsModalOpen(false)}
          title={editingReply ? 'Edit Saved Reply' : 'Create Saved Response Template'}
          size="md"
        >

          <div className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Shortcut Trigger * (e.g. /battery, /delay, /refund)
              </label>
              <input
                type="text"
                placeholder="/shortcut"
                value={shortcut}
                onChange={(e) => setShortcut(e.target.value)}
                className="w-full p-2 font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Template Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Battery Diagnostic Instructions"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Category
              </label>
              <input
                type="text"
                placeholder="e.g. Hardware, Shipping, Payment"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Response Template Content *
              </label>
              <textarea
                rows={6}
                placeholder="Type the message that will be automatically inserted into the ticket response..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full p-2.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
              >
                Save Template
              </button>
            </div>
          </div>
        </AdminModal>
      )}
    </div>
  );
}

// =============================================================================
// 4. Support Settings Panel (SLA, Auto-close, Reopen, Limits)
// =============================================================================
function SupportSettingsPanel({ isAdmin }: { isAdmin: boolean }) {
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Editable fields
  const [firstResponseHours, setFirstResponseHours] = useState(24);
  const [autoCloseDays, setAutoCloseDays] = useState(7);
  const [reopenWindowDays, setReopenWindowDays] = useState(7);
  const [returnWindowDays, setReturnWindowDays] = useState(7);
  const [supportHoursText, setSupportHoursText] = useState('');

  useEffect(() => {
    adminApi
      .getSupportSettings()
      .then((s) => {
        setSettings(s);
        setFirstResponseHours(Math.round((s.firstResponseSlaMinutes || 1440) / 60));
        setAutoCloseDays(s.autoCloseDays || 7);
        setReopenWindowDays(s.reopenWindowDays || 7);
        setReturnWindowDays(s.returnWindowDays || 7);
        setSupportHoursText(s.supportHoursText || '');
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert('Only administrators with the ADMIN role can alter support policy settings.');
      return;
    }
    try {
      setIsSaving(true);
      await adminApi.updateSupportSettings({
        firstResponseSlaMinutes: firstResponseHours * 60,
        autoCloseDays,
        reopenWindowDays,
        returnWindowDays,
        supportHoursText: supportHoursText.trim(),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err?.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-slate-500">Loading support configuration...</div>;
  }

  return (
    <div className="max-w-2xl bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 space-y-6">
      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Support SLA & Policy Configuration</h3>
        <p className="text-xs text-slate-500">
          Governs ticket escalation timers, customer return eligibility, and auto-closure windows
        </p>
      </div>

      {!isAdmin && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-lg text-xs text-amber-800 dark:text-amber-200">
          🔒 You are viewing settings in read-only mode. Modifying platform SLA parameters requires the <strong>ADMIN</strong> system role.
        </div>
      )}

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700/50 rounded-lg text-xs text-emerald-800 dark:text-emerald-200">
          ✓ Support SLA parameters successfully persisted.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4 text-xs">
        <div>
          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            First Response SLA Target (Hours)
          </label>
          <input
            type="number"
            min={1}
            max={72}
            value={firstResponseHours}
            disabled={!isAdmin}
            onChange={(e) => setFirstResponseHours(parseInt(e.target.value, 10))}
            className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white disabled:opacity-60"
          />
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Tickets exceeding this target without an agent response are flagged as Breached.
          </span>
        </div>

        <div>
          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            Auto-Close Window (Days after RESOLVED)
          </label>
          <input
            type="number"
            min={1}
            max={30}
            value={autoCloseDays}
            disabled={!isAdmin}
            onChange={(e) => setAutoCloseDays(parseInt(e.target.value, 10))}
            className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white disabled:opacity-60"
          />
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Default 7 days. Tickets automatically move from RESOLVED to CLOSED.
          </span>
        </div>

        <div>
          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            Customer Reopen Window (Days)
          </label>
          <input
            type="number"
            min={1}
            max={30}
            value={reopenWindowDays}
            disabled={!isAdmin}
            onChange={(e) => setReopenWindowDays(parseInt(e.target.value, 10))}
            className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white disabled:opacity-60"
          />
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Customers can reopen resolved tickets within this window.
          </span>
        </div>

        <div>
          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            Return Policy Eligibility Window (Days from Delivery)
          </label>
          <input
            type="number"
            min={1}
            max={30}
            value={returnWindowDays}
            disabled={!isAdmin}
            onChange={(e) => setReturnWindowDays(parseInt(e.target.value, 10))}
            className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white disabled:opacity-60"
          />
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            Standard 7-day replacement & return policy window for refurbished laptops.
          </span>
        </div>

        <div>
          <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
            Customer-Facing Support Operational Hours
          </label>
          <input
            type="text"
            value={supportHoursText}
            disabled={!isAdmin}
            onChange={(e) => setSupportHoursText(e.target.value)}
            placeholder="e.g. Monday to Saturday, 9:00 AM – 7:00 PM IST"
            className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white disabled:opacity-60"
          />
        </div>

        {isAdmin && (
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 font-semibold text-xs rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

// =============================================================================
// 5. Support Reports & CSAT Analytics Panel
// =============================================================================
function SupportReportsPanel() {
  const [reports, setReports] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    adminApi
      .getSupportReports()
      .then((r) => setReports(r))
      .catch((err) => console.error('Failed to load support reports:', err))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading || !reports) {
    return <div className="p-8 text-center text-slate-500">Compiling support analytics & metrics...</div>;
  }

  const csat = reports.csat || { averageScore: 0, totalRated: 0, distribution: {} };
  const volume = reports.ticketVolume || {};

  return (
    <div className="space-y-6">
      {/* Top High-level Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Overall CSAT Rating</div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {csat.averageScore ? `${csat.averageScore}` : 'N/A'}
            </span>
            <span className="text-xs text-amber-500 font-semibold">/ 5.0 ★</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">{csat.totalRated} customer ratings recorded</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Tickets</div>
          <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{volume.total || 0}</div>
          <div className="text-xs text-slate-500 mt-1">Inbound queries & complaints</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Resolved Rate</div>
          <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {volume.total > 0
              ? `${Math.round(((volume.resolved + volume.closed) / volume.total) * 100)}%`
              : '100%'}
          </div>
          <div className="text-xs text-slate-500 mt-1">{volume.resolved + volume.closed} resolved or closed</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Returns Processed</div>
          <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
            {reports.returnsOverview?.total || 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">Doorstep returns & replacements</div>
        </div>
      </div>

      {/* CSAT Distribution & Ticket Categories Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CSAT Rating Distribution Card */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Customer Satisfaction Distribution</h4>
          <div className="space-y-2 text-xs">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = csat.distribution[stars] || 0;
              const percent = csat.totalRated > 0 ? Math.round((count / csat.totalRated) * 100) : 0;
              return (
                <div key={stars} className="flex items-center gap-3">
                  <span className="w-12 font-medium text-slate-700 dark:text-slate-300">{stars} Stars</span>
                  <div className="flex-1 h-3 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        stars >= 4 ? 'bg-emerald-500' : stars === 3 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="w-14 text-right text-slate-500">{count} ({percent}%)</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tickets Breakdown by Category */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">Tickets by Category</h4>
          <div className="space-y-2 text-xs">
            {(reports.categoriesBreakdown || []).length === 0 ? (
              <div className="text-slate-400 italic py-4 text-center">No categorized tickets yet.</div>
            ) : (
              reports.categoriesBreakdown.map((cat: any) => (
                <div key={cat.category} className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-700/50">
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {cat.category?.replace(/_/g, ' ')}
                  </span>
                  <span className="font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">
                    {cat.count}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
