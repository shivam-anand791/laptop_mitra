'use client';

import React, { Suspense, useState, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useAdminInquiries, useUpdateInquiryStatus } from '../../../lib/admin-queries';
import { CorporateInquiry } from '../../../lib/types';
import { formatDate } from '../../../lib/format';
import PageHeader from '../../../components/admin/PageHeader';
import DataTable, { Column } from '../../../components/admin/DataTable';
import StatusBadge from '../../../components/admin/StatusBadge';
import AdminModal from '../../../components/admin/AdminModal';

const INQUIRY_STATUSES = ['PENDING', 'CONTACTED', 'QUOTED', 'CLOSED'] as const;

function InquiriesContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentStatus = searchParams.get('status') || 'all';
  const currentPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const [searchTerm, setSearchTerm] = useState('');

  // Status update modal state
  const [selectedInquiry, setSelectedInquiry] = useState<CorporateInquiry | null>(null);
  const [newStatus, setNewStatus] = useState<string>('CONTACTED');
  const [adminNotes, setAdminNotes] = useState('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useAdminInquiries({
    status: currentStatus,
    page: currentPage,
    pageSize: 15,
  });

  const updateMutation = useUpdateInquiryStatus();

  const setStatusFilter = (status: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (status === 'all') {
      params.delete('status');
    } else {
      params.set('status', status);
    }
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    router.push(`${pathname}?${params.toString()}`);
  };

  const inquiriesList = data?.items || [];
  const totalItems = data?.total || 0;

  // Search filter
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return inquiriesList;
    const term = searchTerm.toLowerCase();
    return inquiriesList.filter(
      (inq) =>
        inq.companyName?.toLowerCase().includes(term) ||
        inq.contactPerson?.toLowerCase().includes(term) ||
        inq.email?.toLowerCase().includes(term) ||
        inq.city?.toLowerCase().includes(term) ||
        inq.phone?.includes(term),
    );
  }, [inquiriesList, searchTerm]);

  const handleOpenStatusModal = (inquiry: CorporateInquiry) => {
    setSelectedInquiry(inquiry);
    setNewStatus(inquiry.status);
    setAdminNotes(inquiry.notes || '');
    setActionSuccess(null);
  };

  const handleSaveStatus = async () => {
    if (!selectedInquiry) return;
    try {
      await updateMutation.mutateAsync({
        id: selectedInquiry.id,
        status: newStatus,
        adminNotes: adminNotes.trim() || undefined,
      });
      setActionSuccess('Inquiry workflow stage successfully updated.');
      setTimeout(() => {
        setSelectedInquiry(null);
        setActionSuccess(null);
      }, 1000);
    } catch (err: any) {
      alert(err?.message || 'Failed to update inquiry status');
    }
  };

  // DataTable Columns definition
  const columns: Column<CorporateInquiry>[] = useMemo(
    () => [
      {
        key: 'id',
        header: 'Inquiry / Date',
        render: (inq) => (
          <div>
            <div className="font-mono text-xs font-semibold text-gray-900 select-all">
              #{inq.id.slice(0, 8)}
            </div>
            <div className="text-[11px] text-gray-500 tabular-nums">
              {formatDate(inq.createdAt)}
            </div>
          </div>
        ),
      },
      {
        key: 'company',
        header: 'Company & Contact',
        render: (inq) => (
          <div>
            <div className="font-semibold text-gray-900 text-xs">{inq.companyName}</div>
            <div className="text-xs text-gray-600">{inq.contactPerson}</div>
            <div className="text-[11px] text-gray-500 space-x-1.5 mt-0.5">
              <a href={`mailto:${inq.email}`} className="text-primary hover:underline">
                {inq.email}
              </a>
              <span>•</span>
              <a href={`tel:${inq.phone}`} className="text-gray-600 hover:text-gray-900">
                {inq.phone}
              </a>
            </div>
          </div>
        ),
      },
      {
        key: 'requirement',
        header: 'Requirement',
        render: (inq) => (
          <div>
            <div className="inline-flex items-center gap-1.5">
              <span className="font-semibold text-gray-900 text-xs tabular-nums">
                {inq.quantity} {inq.quantity === 1 ? 'Unit' : 'Units'}
              </span>
              <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                {inq.mode}
              </span>
            </div>
            {inq.laptopModel && (
              <div className="text-xs text-gray-600 mt-0.5">{inq.laptopModel}</div>
            )}
            {inq.expectedTenure && (
              <div className="text-[11px] text-primary font-medium">
                Tenure: {inq.expectedTenure}
              </div>
            )}
            {inq.notes && (
              <div className="text-[11px] text-gray-500 italic mt-1 bg-gray-50 p-1.5 rounded border border-gray-200 max-w-xs">
                &ldquo;{inq.notes}&rdquo;
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'city',
        header: 'Location / Source',
        render: (inq) => (
          <div>
            <div className="font-medium text-gray-900 text-xs">{inq.city}</div>
            <div className="text-[11px] text-gray-500 uppercase tracking-wider mt-0.5">
              {inq.source || 'web'}
            </div>
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (inq) => <StatusBadge status={inq.status} size="sm" />,
      },
      {
        key: 'actions',
        header: 'Action',
        align: 'right',
        render: (inq) => (
          <button
            type="button"
            onClick={() => handleOpenStatusModal(inq)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Update
          </button>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Corporate Inquiries"
        description="Review B2B bulk purchases, enterprise fleet leasing quote requests, and follow-up status"
        actions={
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>
        }
      />

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={filteredItems}
        keyExtractor={(inq) => inq.id}
        isLoading={isLoading}
        error={error ? error.message : null}
        onRetry={refetch}
        filterBar={
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Status Tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1 text-xs rounded-md font-semibold transition-colors cursor-pointer ${
                  currentStatus === 'all'
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                All ({totalItems})
              </button>
              {INQUIRY_STATUSES.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 text-xs rounded-md font-semibold transition-colors cursor-pointer ${
                    currentStatus === st
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder="Search company, contact, city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs px-3 py-1.5 border border-gray-200 rounded-md bg-white text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Search inquiries"
              />
            </div>
          </div>
        }
        pagination={{
          currentPage,
          totalItems,
          pageSize: 15,
          onPageChange: handlePageChange,
        }}
        emptyState={{
          title: 'No corporate inquiries found',
          description: searchTerm
            ? 'No procurement inquiries match your search filter.'
            : 'No corporate procurement inquiries have been submitted yet.',
        }}
      />

      {/* AdminModal for Status Update */}
      {selectedInquiry && (
        <AdminModal
          open={!!selectedInquiry}
          onClose={() => setSelectedInquiry(null)}
          title="Update Inquiry Status"
          description={`Update workflow stage for ${selectedInquiry.companyName} (Ref: ${selectedInquiry.id.slice(0, 8)})`}
          primaryAction={{
            label: 'Save Status',
            onClick: handleSaveStatus,
            loading: updateMutation.isPending,
          }}
          secondaryAction={{
            label: 'Cancel',
            onClick: () => setSelectedInquiry(null),
          }}
        >
          {actionSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 font-semibold">
              {actionSuccess}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Select Workflow Status
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full text-xs py-2 px-3 bg-white border border-gray-200 rounded-md text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
            >
              {INQUIRY_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Admin Notes / Follow-up Record
            </label>
            <textarea
              rows={3}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="e.g. Sent formal quotation for 10x ThinkPad T480s on 24-month lease with warranty."
              className="w-full text-xs p-2.5 bg-white border border-gray-200 rounded-md text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>
        </AdminModal>
      )}
    </div>
  );
}

export default function AdminInquiriesPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 animate-pulse">
          <div className="h-10 bg-gray-200 rounded w-48" />
          <div className="h-96 bg-gray-200 rounded-lg" />
        </div>
      }
    >
      <InquiriesContent />
    </Suspense>
  );
}
