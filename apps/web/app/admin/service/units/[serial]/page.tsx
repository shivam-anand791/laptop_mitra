'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSoldUnitBySerial, useUpdateUnitSerial } from '../../../../../lib/admin-queries';
import { formatDate } from '../../../../../lib/format';
import PageHeader from '../../../../../components/admin/PageHeader';
import StatusBadge from '../../../../../components/admin/StatusBadge';
import AdminModal from '../../../../../components/admin/AdminModal';
import { useToast } from '../../../../../components/ui/Toast';

export default function Unit360Page() {
  const params = useParams();
  const router = useRouter();
  const serial = decodeURIComponent((params?.serial as string) || '');
  const { addToast } = useToast();

  const { data, isLoading, error, refetch } = useSoldUnitBySerial(serial);
  const updateMutation = useUpdateUnitSerial();

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [newSerial, setNewSerial] = useState('');
  const [reason, setReason] = useState('');
  const [editError, setEditError] = useState('');

  const unit = data?.unit;
  const serialHistory = data?.serialHistory || [];

  const handleOpenEdit = () => {
    setNewSerial(unit?.serialNumber || '');
    setReason('');
    setEditError('');
    setEditModalOpen(true);
  };

  const handleSaveSerial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSerial.trim()) {
      setEditError('A valid new serial number is required.');
      return;
    }
    if (!reason.trim()) {
      setEditError('An audit reason is required when modifying a unit serial number.');
      return;
    }
    if (!unit) return;

    try {
      await updateMutation.mutateAsync({
        id: unit.id,
        serialNumber: newSerial.trim().toUpperCase(),
        reason: reason.trim(),
      });
      addToast('success', 'Unit serial number updated successfully.');
      setEditModalOpen(false);
      // Navigate to new serial URL if it changed
      if (newSerial.trim().toUpperCase() !== serial) {
        router.push(`/admin/service/units/${encodeURIComponent(newSerial.trim().toUpperCase())}`);
      } else {
        refetch();
      }
    } catch (err: any) {
      setEditError(err?.message || 'Failed to update serial number.');
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-xs text-gray-500">
        Loading unit history and warranty details...
      </div>
    );
  }

  if (error || !unit) {
    return (
      <div className="card p-8 text-center space-y-4">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">Unit Record Not Found</h2>
        <p className="text-xs text-gray-500">
          No physical unit record found matching serial number: &ldquo;{serial}&rdquo;
        </p>
        <Link href="/admin/service/units" className="btn-primary text-xs inline-block">
          Return to Units Directory
        </Link>
      </div>
    );
  }

  const warranty = unit.warrantyCoverage;
  const order = unit.orderItem?.order;
  const user = unit.user;

  let daysLeft = 0;
  if (warranty?.endDate) {
    daysLeft = Math.ceil((new Date(warranty.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Unit 360: ${unit.serialNumber || 'No Serial Assigned'}`}
        description={`${unit.brandSnapshot} • ${unit.modelSnapshot} (Unit ${unit.unitIndex})`}
        actions={
          <button
            type="button"
            onClick={handleOpenEdit}
            className="btn-secondary text-xs"
          >
            Edit Serial Number
          </button>
        }
      />

      {/* Main 3-Column Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Hardware & Spec Card */}
        <div className="card p-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2">
            Hardware Details
          </h3>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-gray-500 block text-[11px]">Product</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {unit.product?.name || unit.modelSnapshot}
              </span>
            </div>
            <div>
              <span className="text-gray-500 block text-[11px]">Brand Snapshot</span>
              <span className="text-gray-900 dark:text-white">{unit.brandSnapshot}</span>
            </div>
            <div>
              <span className="text-gray-500 block text-[11px]">Model Snapshot</span>
              <span className="text-gray-900 dark:text-white">{unit.modelSnapshot}</span>
            </div>
            <div>
              <span className="text-gray-500 block text-[11px]">Unit Index / Quantity</span>
              <span className="text-gray-900 dark:text-white">Unit {unit.unitIndex} of order line item</span>
            </div>
            <div>
              <span className="text-gray-500 block text-[11px]">Physical Unit Status</span>
              <div className="mt-1">
                <StatusBadge status={unit.status} />
              </div>
            </div>
          </div>
        </div>

        {/* Customer & Order Reference Card */}
        <div className="card p-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2">
            Customer & Order
          </h3>
          <div className="space-y-2 text-xs">
            <div>
              <span className="text-gray-500 block text-[11px]">Purchased By</span>
              <Link
                href={`/admin/users/${user?.id || ''}`}
                className="font-semibold text-primary hover:underline"
              >
                {user?.name || 'Customer'}
              </Link>
            </div>
            <div>
              <span className="text-gray-500 block text-[11px]">Contact</span>
              <span className="text-gray-900 dark:text-white">{user?.phone || user?.email || '—'}</span>
            </div>
            <div>
              <span className="text-gray-500 block text-[11px]">Order Number</span>
              {order ? (
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="font-mono text-primary hover:underline font-semibold"
                >
                  #{order.orderNumber || order.id.slice(-8)}
                </Link>
              ) : (
                <span className="text-gray-400">—</span>
              )}
            </div>
            <div>
              <span className="text-gray-500 block text-[11px]">Dispatched At</span>
              <span className="text-gray-900 dark:text-white">
                {unit.dispatchedAt ? formatDate(unit.dispatchedAt) : '—'}
              </span>
            </div>
            {unit.overrideReason && (
              <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800">
                <span className="text-amber-800 dark:text-amber-300 block text-[11px] font-semibold">
                  Dispatch Override Notice
                </span>
                <p className="text-[11px] text-amber-700 dark:text-amber-400 italic">
                  &ldquo;{unit.overrideReason}&rdquo;
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Warranty Coverage Card */}
        <div className="card p-5 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2">
            Warranty Coverage
          </h3>
          {warranty ? (
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 text-[11px]">Status</span>
                <StatusBadge status={warranty.status} />
              </div>
              <div>
                <span className="text-gray-500 block text-[11px]">Coverage Tier</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {warranty.source === 'EXTENDED' ? 'Extended Warranty' : 'Base 6-Month Warranty'}
                </span>
              </div>
              <div>
                <span className="text-gray-500 block text-[11px]">Validity Dates</span>
                <span className="text-gray-900 dark:text-white">
                  {formatDate(warranty.startDate)} → {formatDate(warranty.endDate)}
                </span>
              </div>
              <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                <span className="text-gray-500 block text-[11px]">Remaining Duration</span>
                {warranty.status === 'EXPIRED' || daysLeft <= 0 ? (
                  <span className="text-rose-600 dark:text-rose-400 font-semibold">
                    Expired {Math.abs(daysLeft)} days ago
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                    {daysLeft} days remaining
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3 text-center text-xs text-gray-400">
              Warranty has not commenced (pending order delivery).
            </div>
          )}
        </div>
      </div>

      {/* Serial Change Audit Trail */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
            Serial Number Modification History (Immutable Audit Log)
          </h3>
        </div>

        {serialHistory.length > 0 ? (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {serialHistory.map((item: any) => (
              <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono line-through text-gray-400">
                      {item.previousSerial || 'UNASSIGNED'}
                    </span>
                    <span>→</span>
                    <span className="font-mono font-bold text-gray-900 dark:text-white">
                      {item.newSerial}
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300">
                    <span className="font-semibold text-gray-700 dark:text-gray-200">Reason:</span> &ldquo;{item.reason}&rdquo;
                  </p>
                </div>
                <div className="text-right text-[11px] text-gray-500 shrink-0">
                  <p>{formatDate(item.createdAt)}</p>
                  <p>Staff: {item.changedBy || 'Admin'}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-gray-500">
            No serial modifications recorded. The unit retains its initial dispatch assignment.
          </div>
        )}
      </div>

      {/* Edit Serial Modal */}
      <AdminModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Modify Unit Serial Number"
      >
        <form onSubmit={handleSaveSerial} className="space-y-4">
          {editError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400">
              {editError}
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Current Serial Number
            </label>
            <input
              type="text"
              readOnly
              disabled
              value={unit.serialNumber || 'UNASSIGNED'}
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-500 font-mono"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              New Serial Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={newSerial}
              onChange={(e) => setNewSerial(e.target.value.toUpperCase())}
              placeholder="e.g. SN-LPT-998877"
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
              Mandatory Audit Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State why this serial number is being corrected or swapped (e.g. RMA chassis replacement, barcode scan error)..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="btn-secondary text-xs"
              disabled={updateMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary text-xs"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Updating...' : 'Save & Log Audit Trail'}
            </button>
          </div>
        </form>
      </AdminModal>
    </div>
  );
}

