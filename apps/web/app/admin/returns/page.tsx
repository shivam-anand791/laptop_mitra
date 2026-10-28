'use client';

import React, { Suspense, useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import PageHeader from '../../../components/admin/PageHeader';
import DataTable, { Column } from '../../../components/admin/DataTable';
import { StatusBadge } from '../../../components/admin/StatusBadge';
import AdminModal from '../../../components/admin/AdminModal';
import { SensitiveField } from '../../../components/admin/SensitiveField';
import { adminApi } from '../../../lib/admin-api';
import { useAuth } from '../../../lib/auth-context';
import { formatDate, formatCurrency } from '../../../lib/format';

const RETURN_STATUSES = [
  'ALL',
  'REQUESTED',
  'APPROVED',
  'PICKUP_SCHEDULED',
  'PICKED_UP',
  'INSPECTING',
  'INSPECTION_PASSED',
  'INSPECTION_FAILED',
  'REFUND_PENDING',
  'REFUNDED',
  'REJECTED',
  'CANCELLED',
  'CLOSED',
] as const;

export default function AdminReturnsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading Returns Workspace...</div>}>
      <ReturnsWorkspaceContent />
    </Suspense>
  );
}

function ReturnsWorkspaceContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [returns, setReturns] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [requestedCount, setRequestedCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Selected Return for Modal
  const [selectedReturnId, setSelectedReturnId] = useState<string | null>(null);

  const fetchReturns = async () => {
    try {
      setIsLoading(true);
      const res = await adminApi.getAdminReturns({
        status: statusFilter,
        search: searchQuery,
        page,
        pageSize,
      });
      setReturns(res.items || []);
      setTotal(res.total || 0);
      setRequestedCount(res.requestedCount || 0);
    } catch (err) {
      console.error('Failed to load returns list:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, [statusFilter, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchReturns();
  };

  const columns: Column<any>[] = [
    {
      key: 'returnNumber',
      header: 'Return #',
      render: (r) => (
        <span className="font-mono font-semibold text-slate-900 dark:text-white">
          {r.returnNumber}
        </span>
      ),
    },
    {
      key: 'order',
      header: 'Order Reference',
      render: (r) => (
        <div>
          <span className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
            {r.order?.orderNumber}
          </span>
          <div className="text-xs text-slate-500">
            {r.order?.paymentMethod?.toUpperCase()} • {formatCurrency(r.order?.finalAmount || 0)}
          </div>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (r) => (
        <div>
          <div className="font-medium text-slate-900 dark:text-white">{r.user?.name || 'Customer'}</div>
          <div className="text-xs text-slate-500">{r.user?.email || r.user?.phone || 'No contact'}</div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Resolution',
      render: (r) => (
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
          {r.type}
        </span>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (r) => (
        <span className="text-xs text-slate-700 dark:text-slate-300 truncate max-w-xs block" title={r.reason}>
          {r.reason}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Lifecycle State',
      render: (r) => <StatusBadge status={r.status} size="sm" />,
    },
    {
      key: 'createdAt',
      header: 'Requested Date',
      render: (r) => <span className="text-xs text-slate-500">{formatDate(r.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (r) => (
        <button
          onClick={() => setSelectedReturnId(r.id)}
          className="px-3 py-1 text-xs font-semibold rounded bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 transition-colors"
        >
          Manage Return
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Returns & RMA Management"
        description="Inspect return requests, schedule courier pickups, execute lab diagnostics, and disburse refunds"
      />

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Awaiting Approval</div>
          <div className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">{requestedCount}</div>
          <div className="text-xs text-slate-500 mt-1">Pending initial customer triage</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Returns</div>
          <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{total}</div>
          <div className="text-xs text-slate-500 mt-1">Total requests recorded</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Policy Window</div>
          <div className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">7 Days</div>
          <div className="text-xs text-slate-500 mt-1">From order delivery completion</div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="text-xs font-medium text-slate-500 uppercase tracking-wider">Refund Method</div>
          <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">Bank / Razorpay</div>
          <div className="text-xs text-slate-500 mt-1">Source for prepaid; NEFT/UPI for COD</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search by return #, order #, customer name, email, or bank UTR..."
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
          <span className="font-semibold text-slate-500">Filter by State:</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
          >
            {RETURN_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={returns}
        keyExtractor={(item) => item.id}
        isLoading={isLoading}
        pagination={{
          currentPage: page,
          totalItems: total,
          pageSize,
          onPageChange: (p) => setPage(p),
        }}
      />


      {/* Return Detail Modal */}
      {selectedReturnId && (
        <ReturnDetailModal
          returnId={selectedReturnId}
          isAdmin={isAdmin}
          onClose={() => setSelectedReturnId(null)}
          onReturnUpdated={fetchReturns}
        />
      )}
    </div>
  );
}

// =============================================================================
// Return Detail Modal (Workflow Progression, Inspection, Refund, Decryption)
// =============================================================================
function ReturnDetailModal({
  returnId,
  isAdmin,
  onClose,
  onReturnUpdated,
}: {
  returnId: string;
  isAdmin: boolean;
  onClose: () => void;
  onReturnUpdated: () => void;
}) {
  const [returnReq, setReturnReq] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [courierName, setCourierName] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [inspectionNotes, setInspectionNotes] = useState('');
  const [inspectionPassed, setInspectionPassed] = useState(true);
  const [manualUtr, setManualUtr] = useState('');

  // Decrypted sensitive data
  const [decryptedBankDetails, setDecryptedBankDetails] = useState<any | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  const fetchReturn = async () => {
    try {
      setIsLoading(true);
      const res = await adminApi.getAdminReturn(returnId);
      setReturnReq(res);
      setCourierName(res.pickupTrackingNumber ? 'Delhivery' : 'Bluedart');
      setTrackingNumber(res.pickupTrackingNumber || '');
      setInspectionNotes(res.inspectionNotes || '');
      setManualUtr(res.manualRefundReference || '');
    } catch (err) {
      console.error('Failed to load return details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReturn();
  }, [returnId]);

  const handleApprove = async () => {
    try {
      setIsSubmitting(true);
      await adminApi.processAdminReturn(returnId, { status: 'APPROVED' });
      fetchReturn();
      onReturnUpdated();
    } catch (err: any) {
      alert(err?.message || 'Failed to approve return');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please specify the rejection rationale');
      return;
    }
    try {
      setIsSubmitting(true);
      await adminApi.processAdminReturn(returnId, {
        status: 'REJECTED',
        rejectionReason: rejectionReason.trim(),
      });
      fetchReturn();
      onReturnUpdated();
    } catch (err: any) {
      alert(err?.message || 'Failed to reject return');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSchedulePickup = async () => {
    if (!trackingNumber.trim()) {
      alert('Please provide a tracking / AWB number');
      return;
    }
    try {
      setIsSubmitting(true);
      await adminApi.processAdminReturn(returnId, {
        status: 'PICKUP_SCHEDULED',
        pickupCourier: courierName,
        pickupTrackingNumber: trackingNumber.trim(),
      });
      fetchReturn();
      onReturnUpdated();
    } catch (err: any) {
      alert(err?.message || 'Failed to schedule pickup');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkPickedUp = async () => {
    try {
      setIsSubmitting(true);
      await adminApi.processAdminReturn(returnId, { status: 'PICKED_UP' });
      fetchReturn();
      onReturnUpdated();
    } catch (err: any) {
      alert(err?.message || 'Failed to mark picked up');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartInspection = async () => {
    try {
      setIsSubmitting(true);
      await adminApi.processAdminReturn(returnId, { status: 'INSPECTING' });
      fetchReturn();
      onReturnUpdated();
    } catch (err: any) {
      alert(err?.message || 'Failed to start inspection');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitInspection = async () => {
    try {
      setIsSubmitting(true);
      const nextStatus = inspectionPassed ? 'INSPECTION_PASSED' : 'INSPECTION_FAILED';
      await adminApi.processAdminReturn(returnId, {
        status: nextStatus,
        inspectionPassed,
        inspectionNotes: inspectionNotes.trim() || undefined,
      });
      fetchReturn();
      onReturnUpdated();
    } catch (err: any) {
      alert(err?.message || 'Failed to submit inspection verdict');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisburseRefund = async () => {
    if (!isAdmin) {
      alert('Only administrators with the ADMIN role can execute financial disbursements.');
      return;
    }
    const isPrepaid = returnReq.order?.paymentMethod !== 'COD' && returnReq.order?.paymentMethod !== 'CASH_ON_DELIVERY';
    if (!isPrepaid && !manualUtr.trim()) {
      alert('Please enter the Bank UTR / Transaction Reference for this COD refund payout');
      return;
    }

    if (!confirm('Are you sure you want to finalize this refund disbursement? This action is permanent and audited.')) {
      return;
    }

    try {
      setIsSubmitting(true);
      await adminApi.processAdminRefund(returnId, {
        manualRefundReference: manualUtr.trim() || undefined,
      });
      alert('Refund disbursement confirmed and recorded.');
      fetchReturn();
      onReturnUpdated();
    } catch (err: any) {
      alert(err?.message || 'Failed to process refund');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevealBankDetails = async () => {
    if (!isAdmin) {
      alert('Only administrators can decrypt banking details');
      return;
    }
    try {
      setIsDecrypting(true);
      const res = await adminApi.decryptRefundDetails(returnId);
      setDecryptedBankDetails(res.details);
    } catch (err: any) {
      alert(err?.message || 'Failed to decrypt refund details');
    } finally {
      setIsDecrypting(false);
    }
  };

  if (isLoading || !returnReq) {
    return (
      <AdminModal open={true} onClose={onClose} title="Loading Return Details..." size="lg">
        <div className="p-8 text-center text-slate-500">Retrieving return request and order context...</div>
      </AdminModal>
    );
  }

  const isPrepaid = returnReq.order?.paymentMethod !== 'COD' && returnReq.order?.paymentMethod !== 'CASH_ON_DELIVERY';
  const status = returnReq.status;

  return (
    <AdminModal
      open={true}
      onClose={onClose}
      title={`Return #${returnReq.returnNumber} (Order: ${returnReq.order?.orderNumber})`}
      size="xl"
    >

      <div className="space-y-6 text-xs">
        {/* Top Workflow Status & Timeline Summary */}
        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Current Lifecycle Stage
            </div>
            <div className="mt-1 flex items-center gap-2">
              <StatusBadge status={status} size="md" />
              <span className="font-semibold text-slate-900 dark:text-white">
                Requested on {formatDate(returnReq.createdAt)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-500">Type:</span>
            <span className="font-bold text-slate-900 dark:text-white bg-white dark:bg-slate-800 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700">
              {returnReq.type} ({isPrepaid ? 'Prepaid / Source' : 'COD / Bank Payout'})
            </span>
          </div>
        </div>

        {/* Return Items & Customer Reason */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">
              Items to Return
            </h4>
            <div className="space-y-2">
              {(returnReq.items || []).map((item: any) => (
                <div key={item.id} className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-900">
                  <div className="font-semibold text-slate-900 dark:text-white">
                    {item.orderItem?.product?.name || 'Laptop Item'}
                  </div>
                  <div className="text-slate-500 flex justify-between mt-1">
                    <span>SKU: {item.orderItem?.product?.sku || 'N/A'}</span>
                    <span>Qty: {item.quantity}</span>
                  </div>
                  <div className="text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                    Unit Price Paid: {formatCurrency(item.unitPrice || 0)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 space-y-3">
            <h4 className="font-bold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">
              Customer Grievance & Evidence
            </h4>
            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Return Reason</span>
              <p className="mt-1 font-medium text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700">
                {returnReq.reason}
              </p>
            </div>

            {returnReq.attachments && returnReq.attachments.length > 0 && (
              <div>
                <span className="text-[10px] text-slate-500 font-semibold uppercase">
                  Uploaded Evidence ({returnReq.attachments.length})
                </span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {returnReq.attachments.map((att: any) => (
                    <a
                      key={att.id}
                      href={`#${att.storageKey}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-700 font-mono text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      📷 {att.fileName || 'Evidence Media'}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Lifecycle Action Panel */}
        <div className="p-5 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 space-y-4">
          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
            Operational Action Required: {status.replace(/_/g, ' ')}
          </h4>

          {/* STEP 1: REQUESTED */}
          {status === 'REQUESTED' && (
            <div className="space-y-3">
              <p className="text-slate-600 dark:text-slate-300">
                Review the customer reason and photos. If defect criteria are satisfied under the 7-day policy, approve to authorize courier pickup.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleApprove}
                  disabled={isSubmitting}
                  className="px-4 py-2 font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                >
                  ✓ Approve Return Request
                </button>
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    placeholder="Rejection rationale (if denying request)..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white flex-1"
                  />
                  <button
                    onClick={handleReject}
                    disabled={isSubmitting || !rejectionReason.trim()}
                    className="px-4 py-2 font-semibold rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 transition-colors"
                  >
                    Reject Return
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: APPROVED -> SCHEDULE PICKUP */}
          {status === 'APPROVED' && (
            <div className="space-y-3">
              <p className="text-slate-600 dark:text-slate-300">
                Return is approved. Assign courier partner and generate doorstep pickup AWB tracking number.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                >
                  <option value="Bluedart">Bluedart Express</option>
                  <option value="Delhivery">Delhivery Surface</option>
                  <option value="Xpressbees">Xpressbees Logistics</option>
                  <option value="Shadowfax">Shadowfax Local</option>
                </select>

                <input
                  type="text"
                  placeholder="Enter Courier AWB / Tracking Number..."
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono flex-1"
                />

                <button
                  onClick={handleSchedulePickup}
                  disabled={isSubmitting || !trackingNumber.trim()}
                  className="px-4 py-2 font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors"
                >
                  Schedule Doorstep Pickup
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PICKUP_SCHEDULED */}
          {status === 'PICKUP_SCHEDULED' && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-800 dark:text-slate-200 font-medium">
                  Pickup scheduled with {courierName || 'Courier Partner'}.
                </p>
                <div className="text-xs font-mono text-slate-500 mt-0.5">
                  AWB: {returnReq.pickupTrackingNumber || trackingNumber}
                </div>
              </div>
              <button
                onClick={handleMarkPickedUp}
                disabled={isSubmitting}
                className="px-4 py-2 font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                Mark Package Picked Up
              </button>
            </div>
          )}

          {/* STEP 4: PICKED_UP */}
          {status === 'PICKED_UP' && (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-800 dark:text-slate-200 font-medium">
                  Package has arrived at the central service laboratory for diagnostic inspection.
                </p>
              </div>
              <button
                onClick={handleStartInspection}
                disabled={isSubmitting}
                className="px-4 py-2 font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                Begin Hardware Diagnostics
              </button>
            </div>
          )}

          {/* STEP 5: INSPECTING -> VERDICT */}
          {status === 'INSPECTING' && (
            <div className="space-y-3">
              <p className="text-slate-600 dark:text-slate-300">
                Complete diagnostic checklist: verify hardware integrity, cosmetic condition, serial numbers, and charger.
              </p>

              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-900 dark:text-white">
                  <input
                    type="radio"
                    name="verdict"
                    checked={inspectionPassed === true}
                    onChange={() => setInspectionPassed(true)}
                    className="text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>✓ Inspection PASSED (Return accepted for refund)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-900 dark:text-white">
                  <input
                    type="radio"
                    name="verdict"
                    checked={inspectionPassed === false}
                    onChange={() => setInspectionPassed(false)}
                    className="text-red-600 focus:ring-red-500"
                  />
                  <span>✕ Inspection FAILED (Physical/water damage detected)</span>
                </label>
              </div>

              <textarea
                rows={3}
                placeholder="Diagnostic technician observations and hardware notes..."
                value={inspectionNotes}
                onChange={(e) => setInspectionNotes(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />

              <button
                onClick={handleSubmitInspection}
                disabled={isSubmitting}
                className="px-4 py-2 font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              >
                Record Inspection Verdict
              </button>
            </div>
          )}

          {/* STEP 6: INSPECTION_PASSED / REFUND_PENDING -> REFUND DISBURSEMENT (ADMIN ONLY) */}
          {(status === 'INSPECTION_PASSED' || status === 'REFUND_PENDING') && (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-lg text-emerald-800 dark:text-emerald-200">
                ✓ Hardware inspection verified. Ready for refund disbursement of{' '}
                <strong>{formatCurrency(returnReq.refundAmount || returnReq.order?.finalAmount || 0)}</strong>.
              </div>

              {isPrepaid ? (
                /* Prepaid Razorpay Flow */
                <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        Prepaid Order Refund (Razorpay)
                      </div>
                      <div className="text-xs text-slate-500">
                        Payment ID: {returnReq.order?.paymentId || 'Captured via Gateway'}
                      </div>
                    </div>
                    {isAdmin ? (
                      <button
                        onClick={handleDisburseRefund}
                        disabled={isSubmitting}
                        className="px-4 py-2 font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                      >
                        ⚡ Process Razorpay Refund
                      </button>
                    ) : (
                      <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                        ADMIN Role Required for Disbursement
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                /* COD Bank Transfer Flow with Audited Reveal */
                <div className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl space-y-4">
                  <div className="font-semibold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-700 pb-2">
                    COD Direct Bank / UPI Refund Details
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <SensitiveField
                      label="Masked Bank Account"
                      maskedValue={returnReq.refundAccountMasked || '••••••••'}
                      value={decryptedBankDetails?.accountNumber}
                      onReveal={handleRevealBankDetails}
                      isLoading={isDecrypting}
                    />
                    <SensitiveField
                      label="Masked IFSC Code"
                      maskedValue={returnReq.refundIfscMasked || '••••••••'}
                      value={decryptedBankDetails?.ifscCode}
                      onReveal={handleRevealBankDetails}
                      isLoading={isDecrypting}
                    />
                  </div>

                  {decryptedBankDetails?.accountHolderName && (
                    <div className="p-2.5 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700">
                      <span className="text-[10px] text-slate-500 uppercase font-semibold">Account Holder</span>
                      <div className="font-medium text-slate-900 dark:text-white">{decryptedBankDetails.accountHolderName}</div>
                    </div>
                  )}

                  {returnReq.refundUpiMasked && (
                    <SensitiveField
                      label="Masked UPI ID"
                      maskedValue={returnReq.refundUpiMasked}
                      value={decryptedBankDetails?.upiId}
                      onReveal={handleRevealBankDetails}
                      isLoading={isDecrypting}
                    />
                  )}

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-2">
                    <label className="font-semibold text-slate-700 dark:text-slate-300 block">
                      Bank Transaction Reference (UTR) *
                    </label>
                    <div className="flex gap-3">
                      <input
                        type="text"
                        placeholder="Enter 12 or 16 digit NEFT/IMPS/UPI UTR..."
                        value={manualUtr}
                        onChange={(e) => setManualUtr(e.target.value)}
                        className="p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono flex-1"
                      />
                      {isAdmin ? (
                        <button
                          onClick={handleDisburseRefund}
                          disabled={isSubmitting || !manualUtr.trim()}
                          className="px-4 py-2 font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-colors"
                        >
                          Confirm Refund Disbursed
                        </button>
                      ) : (
                        <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                          ADMIN Role Required
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 7: REFUNDED */}
          {status === 'REFUNDED' && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl space-y-1">
              <div className="font-bold text-emerald-900 dark:text-emerald-200">
                ✓ Return Completed & Refund Disbursed
              </div>
              <div className="text-slate-600 dark:text-slate-300">
                Disbursed Amount:{' '}
                <strong>{formatCurrency(returnReq.refundAmount || returnReq.order?.finalAmount || 0)}</strong>
              </div>
              {returnReq.manualRefundReference && (
                <div className="font-mono text-slate-700 dark:text-slate-300 text-[11px]">
                  Bank UTR Reference: {returnReq.manualRefundReference}
                </div>
              )}
              {returnReq.razorpayRefundId && (
                <div className="font-mono text-slate-700 dark:text-slate-300 text-[11px]">
                  Razorpay Refund ID: {returnReq.razorpayRefundId}
                </div>
              )}
              {returnReq.processedAt && (
                <div className="text-slate-400 text-[10px]">
                  Processed by staff on {formatDate(returnReq.processedAt)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminModal>
  );
}
