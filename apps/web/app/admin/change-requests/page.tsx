'use client';

import React, { Suspense, useState, useEffect, useCallback } from 'react';
import PageHeader from '../../../components/admin/PageHeader';
import DataTable, { Column } from '../../../components/admin/DataTable';
import { StatusBadge } from '../../../components/admin/StatusBadge';
import AdminModal from '../../../components/admin/AdminModal';
import { adminApi } from '../../../lib/admin-api';
import { useAuth } from '../../../lib/auth-context';
import { useToast } from '../../../components/ui/Toast';
import { MapPin, Phone, CheckCircle2, Play } from 'lucide-react';

export default function AdminChangeRequestsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading Change Requests...</div>}>
      <ChangeRequestsContent />
    </Suspense>
  );
}

function ChangeRequestsContent() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const isAdmin = user?.role === 'ADMIN';

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Review modal
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getAdminChangeRequests({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        type: typeFilter !== 'ALL' ? typeFilter : undefined,
        page,
        limit: 20,
      });
      setRequests(res.items || []);
      setTotal(res.total || 0);
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to fetch change requests');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, page, addToast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleReview = async (action: 'APPROVED' | 'REJECTED') => {
    if (!selectedRequest) return;
    setIsSubmitting(true);
    try {
      await adminApi.reviewChangeRequest(selectedRequest.id, action, adminNotes);
      addToast('success', `Request #${selectedRequest.requestNumber} marked as ${action}.`);
      setSelectedRequest(null);
      setAdminNotes('');
      fetchRequests();
    } catch (err: any) {
      addToast('error', err?.message || `Failed to ${action.toLowerCase()} request`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApply = async (req: any) => {
    if (!isAdmin) {
      addToast('error', 'Only ADMIN role can apply changes to an order.');
      return;
    }

    try {
      await adminApi.applyChangeRequest(req.id);
      addToast('success', `Changes for #${req.requestNumber} applied successfully to Order #${req.order?.orderNumber}.`);
      fetchRequests();
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to apply change request');
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'requestNumber',
      header: 'Request #',
      render: (row: any) => (
        <div>
          <span className="font-mono font-bold text-blue-600 block">{row.requestNumber}</span>
          <span className="text-[11px] text-slate-500 font-sans">
            {new Date(row.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      ),
    },
    {
      key: 'order',
      header: 'Order',
      render: (row: any) => (
        <div>
          <span className="font-bold text-slate-900 block">#{row.order?.orderNumber}</span>
          <span className="text-[11px] text-slate-500 font-medium">{row.order?.status}</span>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (row: any) => (
        <div>
          <span className="font-semibold text-slate-800 block">{row.user?.name || 'Customer'}</span>
          <span className="text-[11px] text-slate-500 block">{row.user?.phone || row.user?.email}</span>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row: any) => {
        const isAddress = row.type === 'ADDRESS_CHANGE';
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              isAddress ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-purple-50 text-purple-700 border border-purple-200'
            }`}
          >
            {isAddress ? <MapPin className="w-3 h-3" /> : <Phone className="w-3 h-3" />}
            {row.type.replace('_', ' ')}
          </span>
        );
      },
    },
    {
      key: 'requestedData',
      header: 'Requested Changes',
      render: (row: any) => {
        if (row.type === 'ADDRESS_CHANGE') {
          const req = row.requestedData || {};
          return (
            <div className="text-xs max-w-xs space-y-0.5">
              <p className="font-medium text-slate-900 truncate">{req.addressLine1}</p>
              <p className="text-[11px] text-slate-500">
                {req.city}, {req.state} - {req.postalCode}
              </p>
            </div>
          );
        } else if (row.type === 'PHONE_CHANGE') {
          return (
            <div className="text-xs font-mono">
              <span className="text-slate-400 line-through mr-1.5">{row.previousData?.phone || '—'}</span>
              <span className="font-bold text-emerald-700">{row.requestedData?.phone}</span>
            </div>
          );
        }
        return <span className="text-xs text-slate-500 font-mono">Lease Request</span>;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: any) => {
        let variant: any = 'neutral';
        if (row.status === 'PENDING') variant = 'warning';
        if (row.status === 'APPROVED') variant = 'info';
        if (row.status === 'APPLIED') variant = 'success';
        if (row.status === 'REJECTED') variant = 'error';

        return <StatusBadge status={row.status} variant={variant} />;
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: any) => (
        <div className="flex items-center gap-2">
          {row.status === 'PENDING' ? (
            <button
              type="button"
              onClick={() => {
                setSelectedRequest(row);
                setAdminNotes(row.adminNotes || '');
              }}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition"
            >
              Review
            </button>
          ) : row.status === 'APPROVED' ? (
            <button
              type="button"
              onClick={() => handleApply(row)}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition"
            >
              <Play className="w-3 h-3" />
              Apply
            </button>
          ) : row.status === 'APPLIED' ? (
            <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Applied
            </span>
          ) : (
            <span className="text-[11px] text-slate-400">Rejected</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Order Change Requests"
        description="Review and apply pre-dispatch delivery address and phone number updates requested by customers."
      />

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          {['ALL', 'PENDING', 'APPROVED', 'APPLIED', 'REJECTED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl border transition ${
                statusFilter === st
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-hidden font-medium text-slate-700"
        >
          <option value="ALL">All Request Types</option>
          <option value="ADDRESS_CHANGE">Address Changes</option>
          <option value="PHONE_CHANGE">Phone Changes</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <DataTable
          columns={columns}
          data={requests}
          keyExtractor={(r: any) => r.id}
          isLoading={loading}
          emptyState={{
            title: 'No Change Requests',
            description: 'No order change requests found matching current filter.',
          }}
        />
      </div>

      {/* Review Modal */}
      {selectedRequest && (
        <AdminModal
          open={true}
          onClose={() => setSelectedRequest(null)}
          title={`Review Request #${selectedRequest.requestNumber}`}
        >
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
              <p className="font-bold text-slate-900">
                Order #{selectedRequest.order?.orderNumber} ({selectedRequest.order?.status})
              </p>
              <p className="text-slate-600">Customer: {selectedRequest.user?.name} ({selectedRequest.user?.phone})</p>
              <p className="text-[11px] text-blue-700 font-semibold uppercase">{selectedRequest.type.replace('_', ' ')}</p>
            </div>

            <div className="border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
              <p className="font-bold text-slate-900">Requested Data:</p>
              <pre className="p-2 bg-slate-900 text-slate-100 rounded-lg text-[11px] font-mono overflow-x-auto">
                {JSON.stringify(selectedRequest.requestedData, null, 2)}
              </pre>

              <p className="font-bold text-slate-900 pt-1">Previous Data:</p>
              <pre className="p-2 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-mono overflow-x-auto">
                {JSON.stringify(selectedRequest.previousData, null, 2)}
              </pre>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Admin Review Notes (Internal)
              </label>
              <textarea
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="e.g. Verified pincode serviceability and caller identity"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedRequest(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleReview('REJECTED')}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition"
              >
                Reject Request
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleReview('APPROVED')}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition"
              >
                Approve Request
              </button>
            </div>
          </div>
        </AdminModal>
      )}
    </div>
  );
}
