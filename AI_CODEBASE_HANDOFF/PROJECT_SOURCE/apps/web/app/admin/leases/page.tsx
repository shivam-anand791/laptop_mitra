'use client';

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import PageHeader from '../../../components/admin/PageHeader';
import DataTable, { Column } from '../../../components/admin/DataTable';
import { StatusBadge } from '../../../components/admin/StatusBadge';
import AdminModal from '../../../components/admin/AdminModal';
import { useAuth } from '../../../lib/auth-context';
import { useToast } from '../../../components/ui/Toast';
import { formatIndianRupees } from '@/lib/account-helpers';
import {
  FileText,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ShieldCheck,
  RefreshCw,
  Eye,
} from 'lucide-react';

interface LeaseContract {
  id: string;
  contractNumber: string;
  userId: string;
  orderId: string;
  productId: string;
  tenureMonths: number;
  monthlyAmount: number | string;
  totalCommitment: number | string;
  securityDeposit?: number | string | null;
  startDate: string;
  endDate: string;
  status: string;
  buyoutQuote?: number | string | null;
  product?: {
    id: string;
    name: string;
    sku: string;
  };
  user?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  installments?: Array<{
    id: string;
    installmentNumber: number;
    amount: number | string;
    dueDate: string;
    status: string;
    paidAt?: string | null;
  }>;
}

export default function AdminLeasesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading Lease Contracts...</div>}>
      <LeasesConsoleContent />
    </Suspense>
  );
}

function LeasesConsoleContent() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const isAdmin = user?.role === 'ADMIN';

  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<LeaseContract[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected contract modal
  const [selectedContract, setSelectedContract] = useState<LeaseContract | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [terminateReason, setTerminateReason] = useState('');
  const [showTerminateModal, setShowTerminateModal] = useState(false);

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token') || '';
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
      });
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(`http://localhost:3001/admin/lease/contracts?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to load lease contracts (${res.status})`);
      }

      const data = await res.json();
      setContracts(data.items || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to fetch lease contracts');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, searchQuery, addToast]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  const handleTerminate = async () => {
    if (!selectedContract || !terminateReason.trim()) return;
    setActionInProgress(true);
    try {
      const token = localStorage.getItem('token') || '';
      const res = await fetch(`http://localhost:3001/admin/lease/contracts/${selectedContract.id}/terminate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: terminateReason.trim() }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Failed to terminate lease');
      }

      addToast('success', `Lease contract ${selectedContract.contractNumber} terminated.`);
      setShowTerminateModal(false);
      setSelectedContract(null);
      setTerminateReason('');
      fetchContracts();
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to terminate lease');
    } finally {
      setActionInProgress(false);
    }
  };

  const columns: Column<LeaseContract>[] = [
    {
      key: 'contractNumber',
      header: 'Contract Number',
      render: (row: LeaseContract) => (
        <div>
          <span className="font-semibold text-xs text-blue-600 dark:text-blue-400">
            {row.contractNumber}
          </span>
          <span className="block text-[11px] text-gray-400">
            {new Date(row.startDate).toLocaleDateString()}
          </span>
        </div>
      ),
    },
    {
      key: 'user',
      header: 'Customer',
      render: (row: LeaseContract) => (
        <div>
          <span className="font-medium text-xs text-gray-900 dark:text-gray-100">
            {row.user?.name || 'Customer'}
          </span>
          <span className="block text-[11px] text-gray-400">{row.user?.email}</span>
        </div>
      ),
    },
    {
      key: 'product',
      header: 'Product',
      render: (row: LeaseContract) => (
        <div>
          <span className="text-xs font-medium text-gray-800 dark:text-gray-200 line-clamp-1">
            {row.product?.name || 'Device'}
          </span>
          <span className="text-[11px] text-gray-400">{row.product?.sku}</span>
        </div>
      ),
    },
    {
      key: 'monthlyAmount',
      header: 'Monthly Rent',
      render: (row: LeaseContract) => (
        <span className="font-semibold text-xs text-gray-900 dark:text-gray-100">
          {formatIndianRupees(Number(row.monthlyAmount))}/mo
        </span>
      ),
    },
    {
      key: 'tenureMonths',
      header: 'Tenure',
      render: (row: LeaseContract) => (
        <span className="inline-flex items-center px-2 py-0.5 text-xs rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
          {row.tenureMonths} Months
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: LeaseContract) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: LeaseContract) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSelectedContract(row)}
            className="px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 rounded-lg transition-colors flex items-center space-x-1"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Details</span>
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rentals & Lease Contracts"
        description="Monitor active subscription tenures, recurring billing schedules, and device recovery."
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center space-x-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              aria-label="Search contracts"
              placeholder="Search by contract number, customer, SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <label htmlFor="status-filter" className="text-xs font-medium text-gray-500">
            Status:
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="PENDING">Pending</option>
            <option value="COMPLETED">Completed</option>
            <option value="TERMINATED">Terminated</option>
          </select>

          <button
            onClick={() => fetchContracts()}
            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-300 transition-colors"
            title="Refresh contracts"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Contracts Table */}
      <DataTable
        columns={columns}
        data={contracts}
        keyExtractor={(item: LeaseContract) => item.id}
        isLoading={loading}
        pagination={{
          currentPage: page,
          pageSize: 15,
          totalItems: total,
          onPageChange: (p: number) => setPage(p),
        }}
      />

      {/* Contract Detail Modal */}
      {selectedContract && (
        <AdminModal
          open={true}
          onClose={() => setSelectedContract(null)}
          title={`Lease Contract: ${selectedContract.contractNumber}`}
        >
          <div className="space-y-5 text-xs text-gray-700 dark:text-gray-300">
            {/* Header Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-[11px] text-gray-400 block">Status</span>
                <StatusBadge status={selectedContract.status} />
              </div>
              <div>
                <span className="text-[11px] text-gray-400 block">Monthly Rate</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {formatIndianRupees(Number(selectedContract.monthlyAmount))}/mo
                </span>
              </div>
              <div>
                <span className="text-[11px] text-gray-400 block">Tenure</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {selectedContract.tenureMonths} Months
                </span>
              </div>
              <div>
                <span className="text-[11px] text-gray-400 block">Total Commitment</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {formatIndianRupees(Number(selectedContract.totalCommitment))}
                </span>
              </div>
            </div>

            {/* Customer & Product Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="border border-gray-200 dark:border-gray-800 p-3 rounded-lg space-y-1">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Customer Information
                </span>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {selectedContract.user?.name}
                </p>
                <p className="text-gray-500">{selectedContract.user?.email}</p>
                {selectedContract.user?.phone && (
                  <p className="text-gray-500">{selectedContract.user?.phone}</p>
                )}
              </div>

              <div className="border border-gray-200 dark:border-gray-800 p-3 rounded-lg space-y-1">
                <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block">
                  Device Hardware
                </span>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {selectedContract.product?.name}
                </p>
                <p className="text-gray-500">SKU: {selectedContract.product?.sku}</p>
                <p className="text-gray-500">
                  Timeline: {new Date(selectedContract.startDate).toLocaleDateString()} &rarr;{' '}
                  {new Date(selectedContract.endDate).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Installments Schedule */}
            <div>
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-2">
                Billing & Installments Schedule
              </span>
              <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-800 rounded-lg">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500 font-semibold border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="py-1.5 px-3">#</th>
                      <th className="py-1.5 px-3">Due Date</th>
                      <th className="py-1.5 px-3">Amount</th>
                      <th className="py-1.5 px-3">Status</th>
                      <th className="py-1.5 px-3">Paid Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {selectedContract.installments && selectedContract.installments.length > 0 ? (
                      selectedContract.installments.map((inst) => (
                        <tr key={inst.id}>
                          <td className="py-1.5 px-3 font-medium text-gray-900 dark:text-gray-100">
                            Month {inst.installmentNumber}
                          </td>
                          <td className="py-1.5 px-3 text-gray-500">
                            {new Date(inst.dueDate).toLocaleDateString()}
                          </td>
                          <td className="py-1.5 px-3 font-medium">
                            {formatIndianRupees(Number(inst.amount))}
                          </td>
                          <td className="py-1.5 px-3">
                            <StatusBadge status={inst.status} />
                          </td>
                          <td className="py-1.5 px-3 text-gray-500">
                            {inst.paidAt ? new Date(inst.paidAt).toLocaleDateString() : '-'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-3 text-center text-gray-400">
                          Advance payment charged at checkout. Subsequent schedule handled by subscription billing.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={() => setSelectedContract(null)}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800 font-semibold"
              >
                Close
              </button>

              {isAdmin && selectedContract.status === 'ACTIVE' && (
                <button
                  onClick={() => setShowTerminateModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 font-semibold transition-colors"
                >
                  Terminate Contract
                </button>
              )}
            </div>
          </div>
        </AdminModal>
      )}

      {/* Terminate Modal */}
      {showTerminateModal && selectedContract && (
        <AdminModal
          open={true}
          onClose={() => setShowTerminateModal(false)}
          title={`Terminate Contract ${selectedContract.contractNumber}`}
        >
          <div className="space-y-4 text-xs">
            <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300">
              <span className="font-semibold block mb-1">Termination Warning</span>
              Terminating this lease contract stops future recurring subscription charges and initiates device recovery protocol.
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Reason for Early Termination *
              </label>
              <textarea
                rows={3}
                required
                value={terminateReason}
                onChange={(e) => setTerminateReason(e.target.value)}
                placeholder="e.g. Customer returned device early, non-payment, or mutual agreement..."
                className="w-full text-xs p-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setShowTerminateModal(false)}
                className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionInProgress || !terminateReason.trim()}
                onClick={handleTerminate}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-50"
              >
                {actionInProgress ? 'Terminating...' : 'Confirm Termination'}
              </button>
            </div>
          </div>
        </AdminModal>
      )}
    </div>
  );
}
