'use client';

import React, { useEffect, useState, useId, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { formatINR, formatDate } from '@/lib/format';
import PageHeader from '@/components/admin/PageHeader';
import DataTable, { Column } from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import SensitiveField from '@/components/admin/SensitiveField';
import AdminModal from '@/components/admin/AdminModal';
import AdminErrorState from '@/components/admin/AdminErrorState';

interface WithdrawalItem {
  id: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  adminNotes: string | null;
  processedAt: string | null;
  createdAt: string;
}

interface AffiliateDetail {
  id: string;
  name: string | null;
  email: string | null;
  referralCode: string | null;
  referralTier: string | null;
  totalEarnings: number;
  reservedBalance: number;
  withdrawnBalance: number;
  availableBalance: number;
  createdAt: string;
  payoutDetails: {
    configured: boolean;
    bankName: string | null;
    accountHolderName: string | null;
    accountNumberMasked: string | null;
    ifscCodeMasked: string | null;
    upiIdMasked: string | null;
    hasQrCode: boolean;
    updatedAt: string | null;
  };
  withdrawals: WithdrawalItem[];
}

export default function AdminAffiliateDetailPage() {
  const params = useParams();
  const affiliateId = params?.id as string;

  const [data, setData] = useState<AffiliateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Review & Decrypt Modal State
  const [activeWithdrawal, setActiveWithdrawal] = useState<WithdrawalItem | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [decryptedDetails, setDecryptedDetails] = useState<any | null>(null);
  const [loadingDecryption, setLoadingDecryption] = useState(false);
  const [submittingStatus, setSubmittingStatus] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const adminNotesInputId = useId();

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAdminAffiliateDetail(affiliateId);
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to load affiliate partner detail.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (affiliateId) {
      fetchDetail();
    }
  }, [affiliateId]);

  const handleOpenReview = (withdrawal: WithdrawalItem) => {
    setActiveWithdrawal(withdrawal);
    setAdminNotes('');
    setDecryptedDetails(null);
    setActionError(null);
    setActionSuccess(null);
  };

  const handleFetchDecryptedDetails = async () => {
    if (!activeWithdrawal) return;
    setLoadingDecryption(true);
    setActionError(null);
    try {
      const res = await api.getAdminWithdrawalPaymentDetails(activeWithdrawal.id);
      setDecryptedDetails(res.paymentDetails);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to decrypt payment snapshot.');
    } finally {
      setLoadingDecryption(false);
    }
  };

  const handleUpdateStatus = async (status: 'APPROVED' | 'REJECTED') => {
    if (!activeWithdrawal) return;
    if (status === 'REJECTED' && !adminNotes.trim()) {
      setActionError('Rejection notes are required when declining a payout.');
      return;
    }

    setSubmittingStatus(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      await api.updateAdminWithdrawalStatus(
        activeWithdrawal.id,
        status,
        adminNotes.trim() || undefined,
      );
      setActionSuccess(`Withdrawal marked as ${status} successfully.`);
      await fetchDetail();
      setTimeout(() => {
        setActiveWithdrawal(null);
        setActionSuccess(null);
      }, 1200);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to update withdrawal status.');
    } finally {
      setSubmittingStatus(false);
    }
  };

  // Columns for withdrawals ledger
  const columns: Column<WithdrawalItem>[] = useMemo(
    () => [
      {
        key: 'id',
        header: 'Request ID',
        render: (item) => (
          <span className="font-mono text-xs font-semibold text-gray-900 select-all">
            #{item.id.slice(0, 8)}
          </span>
        ),
      },
      {
        key: 'createdAt',
        header: 'Requested Date',
        sortable: true,
        sortValue: (item) => new Date(item.createdAt).getTime(),
        render: (item) => (
          <span className="text-xs text-gray-600 whitespace-nowrap tabular-nums">
            {formatDate(item.createdAt)}
          </span>
        ),
      },
      {
        key: 'amount',
        header: 'Amount',
        align: 'right',
        sortable: true,
        sortValue: (item) => Number(item.amount),
        render: (item) => (
          <span className="font-bold text-gray-900 font-mono text-xs tabular-nums">
            {formatINR(item.amount)}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (item) => <StatusBadge status={item.status} size="sm" />,
      },
      {
        key: 'processedAt',
        header: 'Processed Date',
        render: (item) => (
          <span className="text-xs text-gray-500 tabular-nums">
            {item.processedAt ? formatDate(item.processedAt) : '—'}
          </span>
        ),
      },
      {
        key: 'notes',
        header: 'Admin Audit Notes',
        render: (item) => (
          <span className="text-xs text-gray-600 italic">
            {item.adminNotes || '—'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Action',
        align: 'right',
        render: (item) => (
          <button
            type="button"
            onClick={() => handleOpenReview(item)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Review Payout
          </button>
        ),
      },
    ],
    [],
  );

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 bg-gray-200 rounded w-48" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg" />
          ))}
        </div>
        <div className="h-64 bg-gray-200 rounded-lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-12">
        <AdminErrorState
          title="Error Loading Affiliate Partner"
          reason={error || 'Affiliate partner not found in system.'}
          onRetry={fetchDetail}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={data.name || 'Unnamed Partner'}
        description={`Affiliate Partner ID: ${data.id} · Joined ${new Date(data.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
        badge={
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-primary border border-blue-200 uppercase">
            {data.referralTier || 'BRONZE'} Tier
          </span>
        }
        actions={
          <Link
            href="/admin/affiliates"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <span>← Back to Affiliates</span>
          </Link>
        }
      />

      {/* Partner Key Info & Financial Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Commission Earned</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 font-mono tabular-nums">
            {formatINR(data.totalEarnings)}
          </p>
          <span className="text-[11px] text-gray-500">Gross lifetime referrals</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Reserved in Review</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 font-mono tabular-nums">
            {formatINR(data.reservedBalance)}
          </p>
          <span className="text-[11px] text-amber-700 font-medium">Pending disbursement</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Settled / Paid</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 font-mono tabular-nums">
            {formatINR(data.withdrawnBalance)}
          </p>
          <span className="text-[11px] text-emerald-700 font-medium">Completed payouts</span>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Available Balance</p>
          <p className="text-2xl font-bold text-gray-900 mt-1 font-mono tabular-nums">
            {formatINR(data.availableBalance)}
          </p>
          <span className="text-[11px] text-gray-500">Eligible for new withdrawal</span>
        </div>
      </div>

      {/* Sensitive Bank & Payout Information Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-center justify-between pb-3 border-b border-gray-200 mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              Saved Payout Profile
            </h3>
            <p className="text-xs text-gray-500">
              Partner banking snapshot used for commission settlements
            </p>
          </div>
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-200">
            {data.payoutDetails.configured ? 'Configured' : 'Not Configured'}
          </span>
        </div>

        {data.payoutDetails.configured ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SensitiveField
              label="Account Holder Name"
              value={data.payoutDetails.accountHolderName}
              maskedValue="••••••••••••"
              copyable
            />

            <SensitiveField
              label="Bank Name"
              value={data.payoutDetails.bankName}
              maskedValue="••••••••••••"
              copyable
            />

            <SensitiveField
              label="Account Number"
              value={data.payoutDetails.accountNumberMasked}
              maskedValue={data.payoutDetails.accountNumberMasked || '•••• •••• •••• ••••'}
              copyable
            />

            <SensitiveField
              label="IFSC Code"
              value={data.payoutDetails.ifscCodeMasked}
              maskedValue={data.payoutDetails.ifscCodeMasked || '••••••••••'}
              copyable
            />

            <SensitiveField
              label="UPI Virtual ID"
              value={data.payoutDetails.upiIdMasked}
              maskedValue={data.payoutDetails.upiIdMasked || '••••••••@upi'}
              copyable
            />
          </div>
        ) : (
          <div className="py-6 text-center text-xs text-gray-500">
            This affiliate has not yet configured their bank account or UPI payout details.
          </div>
        )}
      </div>

      {/* Withdrawal Requests Ledger */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Withdrawal Request History</h3>
            <p className="text-xs text-gray-500">Historical payout ledger and pending disbursement requests</p>
          </div>
        </div>

        <DataTable
          columns={columns}
          data={data.withdrawals || []}
          keyExtractor={(item) => item.id}
          emptyState={{
            title: 'No withdrawal requests',
            description: 'This affiliate partner has not submitted any commission withdrawal requests yet.',
          }}
        />
      </div>

      {/* AdminModal for Reviewing & Processing Payout */}
      {activeWithdrawal && (
        <AdminModal
          open={!!activeWithdrawal}
          onClose={() => setActiveWithdrawal(null)}
          title="Review Commission Payout"
          description={`Payout Request #${activeWithdrawal.id.slice(0, 8)} · Amount: ${formatINR(activeWithdrawal.amount)}`}
          size="lg"
        >
          {actionError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 font-semibold">
              {actionError}
            </div>
          )}

          {actionSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 font-semibold">
              {actionSuccess}
            </div>
          )}

          <div className="space-y-4">
            {/* Decrypt Payment Snapshot Button */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-blue-900">Decrypted Payout Snapshot</p>
                  <p className="text-[11px] text-blue-700">Access to unmasked financial data is audit-logged</p>
                </div>
                <button
                  type="button"
                  onClick={handleFetchDecryptedDetails}
                  disabled={loadingDecryption || !!decryptedDetails}
                  className="px-3 py-1.5 text-xs font-semibold rounded bg-primary text-white hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {loadingDecryption ? 'Decrypting...' : decryptedDetails ? 'Decrypted' : 'Decrypt Snapshot'}
                </button>
              </div>

              {decryptedDetails && (
                <div className="mt-3 pt-3 border-t border-blue-200 grid grid-cols-2 gap-2 text-xs text-gray-900">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-500 block">Bank</span>
                    <span className="font-semibold">{decryptedDetails.bankName || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-500 block">Holder</span>
                    <span className="font-semibold">{decryptedDetails.accountHolderName || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-500 block">Account</span>
                    <span className="font-mono font-bold">{decryptedDetails.accountNumber || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-gray-500 block">IFSC</span>
                    <span className="font-mono font-bold">{decryptedDetails.ifscCode || 'N/A'}</span>
                  </div>
                  {decryptedDetails.upiId && (
                    <div className="col-span-2">
                      <span className="text-[10px] uppercase font-bold text-gray-500 block">UPI ID</span>
                      <span className="font-mono font-bold">{decryptedDetails.upiId}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Admin Audit Notes */}
            <div>
              <label
                htmlFor={adminNotesInputId}
                className="block text-xs font-semibold uppercase tracking-wider text-gray-700 mb-1"
              >
                Admin Audit Notes / Transaction Reference (Mandatory if Rejecting)
              </label>
              <textarea
                id={adminNotesInputId}
                rows={2}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="e.g. Disbursed via NEFT UTR #AXIS19284918239 or Reason for rejection..."
                className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-md text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>

            {/* Action Buttons */}
            {activeWithdrawal.status === 'PENDING' && (
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => handleUpdateStatus('REJECTED')}
                  disabled={submittingStatus}
                  className="px-4 py-2 text-xs font-semibold rounded-md bg-white border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Reject Request
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus('APPROVED')}
                  disabled={submittingStatus}
                  className="px-4 py-2 text-xs font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  Approve &amp; Mark Paid
                </button>
              </div>
            )}
          </div>
        </AdminModal>
      )}
    </div>
  );
}
