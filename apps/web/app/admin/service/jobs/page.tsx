'use client';

import React, { Suspense, useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Link from 'next/link';
import { api } from '../../../../lib/api';
import { useAuth } from '../../../../lib/auth-context';
import { formatDate } from '../../../../lib/format';
import PageHeader from '../../../../components/admin/PageHeader';
import DataTable, { Column } from '../../../../components/admin/DataTable';
import StatusBadge from '../../../../components/admin/StatusBadge';

const STATUS_FILTERS = [
  { id: 'ALL', label: 'All Statuses' },
  { id: 'REQUESTED', label: 'Requested' },
  { id: 'SCHEDULED', label: 'Scheduled' },
  { id: 'PICKED_UP', label: 'Picked Up' },
  { id: 'IN_SERVICE', label: 'In Service' },
  { id: 'QUALITY_CHECK', label: 'Quality Check' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'CANCELLED', label: 'Cancelled' },
  { id: 'NO_SHOW', label: 'No-Show' },
];

function ServiceJobsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const isTechnician = user?.role === 'TECHNICIAN';

  const currentStatus = searchParams.get('status') || 'ALL';
  const currentTech = searchParams.get('technicianId') || 'ALL';
  const currentPage = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const [searchTerm, setSearchTerm] = useState('');

  // Data fetching state
  const [data, setData] = useState<{ items: any[]; total: number; page: number; pageSize: number }>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 15,
  });
  const [loading, setLoading] = useState(true);
  const [technicians, setTechnicians] = useState<any[]>([]);

  // Action Modals State
  const [assignModalJob, setAssignModalJob] = useState<any | null>(null);
  const [selectedTechId, setSelectedTechId] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);

  const [noShowModalJob, setNoShowModalJob] = useState<any | null>(null);
  const [noShowReason, setNoShowReason] = useState('');
  const [noShowLoading, setNoShowLoading] = useState(false);

  const loadJobs = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminServiceJobs({
        status: currentStatus === 'ALL' ? undefined : currentStatus,
        technicianId: isTechnician ? user?.id : (currentTech === 'ALL' ? undefined : currentTech),
        search: searchTerm.trim() || undefined,
        page: currentPage,
        pageSize: 15,
      });
      setData(res);
    } catch (err) {
      console.error('Failed to load service jobs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, [currentStatus, currentTech, currentPage]);

  useEffect(() => {
    if (!isTechnician) {
      api.getTechnicians().then(setTechnicians).catch(() => {});
    }
  }, [isTechnician]);

  const updateFilters = (newParams: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newParams).forEach(([k, v]) => {
      if (v === 'ALL' || !v) {
        params.delete(k);
      } else {
        params.set(k, v);
      }
    });
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(page));
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleAssign = async () => {
    if (!assignModalJob || !selectedTechId) return;
    setAssignLoading(true);
    try {
      await api.updateAdminServiceJob(assignModalJob.id, {
        technicianId: selectedTechId,
        status: assignModalJob.status === 'REQUESTED' ? 'SCHEDULED' : assignModalJob.status,
      });
      setAssignModalJob(null);
      loadJobs();
    } catch (err: any) {
      alert(err?.message || 'Failed to assign technician');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleMarkNoShow = async () => {
    if (!noShowModalJob || !noShowReason.trim()) return;
    setNoShowLoading(true);
    try {
      await api.updateAdminServiceJob(noShowModalJob.id, {
        status: 'NO_SHOW',
        internalNotes: `Customer marked No-Show: ${noShowReason.trim()}`,
      });
      setNoShowModalJob(null);
      loadJobs();
    } catch (err: any) {
      alert(err?.message || 'Failed to update job');
    } finally {
      setNoShowLoading(false);
    }
  };

  const columns: Column<any>[] = useMemo(
    () => [
      {
        key: 'jobNumber',
        header: 'Job Reference',
        render: (job: any) => (
          <div>
            <Link
              href={`/admin/service/jobs/${job.id}`}
              className="font-mono text-xs font-bold text-primary hover:underline"
            >
              {job.jobNumber}
            </Link>
            <div className="text-[11px] text-gray-500">{formatDate(job.createdAt)}</div>
          </div>
        ),
      },
      {
        key: 'device',
        header: 'Device & Unit',
        render: (job: any) => (
          <div className="text-xs">
            <div className="font-medium text-gray-900 truncate max-w-[200px]">
              {job.soldUnit?.product?.name || job.soldUnit?.modelSnapshot || 'Laptop'}
            </div>
            {job.soldUnit?.serialNumber ? (
              <Link
                href={`/admin/service/units/${encodeURIComponent(job.soldUnit.serialNumber)}`}
                className="font-mono text-[11px] text-slate-600 hover:text-primary underline"
              >
                SN: {job.soldUnit.serialNumber}
              </Link>
            ) : (
              <span className="font-mono text-[11px] text-gray-400">SN: Unassigned</span>
            )}
          </div>
        ),
      },
      {
        key: 'customer',
        header: 'Customer',
        render: (job: any) => (
          <div className="text-xs">
            <div className="font-medium text-gray-900">{job.customer?.name || 'Customer'}</div>
            <div className="text-gray-500 font-mono text-[11px]">{job.customer?.phone || job.customer?.email || '—'}</div>
          </div>
        ),
      },
      {
        key: 'scheduled',
        header: 'Schedule & Slot',
        render: (job: any) => (
          <div className="text-xs">
            <div className="font-medium text-gray-900">{job.preferredDate ? formatDate(job.preferredDate) : 'Not scheduled'}</div>
            <div className="text-[11px] text-gray-500">
              {job.preferredSlot?.replace(/_/g, ' ') || 'Slot pending'}
            </div>
          </div>
        ),
      },
      ...(!isTechnician
        ? [
            {
              key: 'technician',
              header: 'Assigned Tech',
              render: (job: any) => (
                <div className="text-xs">
                  {job.technician ? (
                    <span className="inline-flex items-center gap-1 font-medium text-gray-800">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      {job.technician.name}
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        setAssignModalJob(job);
                        setSelectedTechId('');
                      }}
                      className="text-xs text-primary font-semibold hover:underline"
                    >
                      + Assign Tech
                    </button>
                  )}
                </div>
              ),
            },
          ]
        : []),
      {
        key: 'checklist',
        header: '4-Pt Inspection',
        render: (job: any) => {
          const checks = [
            job.checklistCleaning,
            job.checklistThermalPaste,
            job.checklistSoftware,
            job.checklistBattery,
          ];
          const passedCount = checks.filter(Boolean).length;
          const isAllDone = passedCount === 4;

          return (
            <div className="flex items-center gap-1.5">
              <span
                className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                  isAllDone
                    ? 'bg-emerald-100 text-emerald-800'
                    : passedCount > 0
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {passedCount}/4 Done
              </span>
              {job.batteryHealthPercent !== null && (
                <span className="text-[10px] font-mono text-gray-500">
                  Bat: {job.batteryHealthPercent}%
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: 'status',
        header: 'Status',
        render: (job: any) => <StatusBadge status={job.status} />,
      },
      {
        key: 'actions',
        header: 'Action',
        align: 'right' as const,
        render: (job: any) => (
          <div className="flex items-center justify-end gap-2">
            <Link
              href={`/admin/service/jobs/${job.id}`}
              className="text-xs font-semibold text-primary hover:underline px-2.5 py-1 bg-blue-50 hover:bg-blue-100 rounded"
            >
              {isTechnician ? 'Update Checklist' : 'Manage'}
            </Link>
            {!isTechnician && ['REQUESTED', 'SCHEDULED'].includes(job.status) && (
              <button
                onClick={() => {
                  setNoShowModalJob(job);
                  setNoShowReason('');
                }}
                className="text-xs text-rose-600 hover:text-rose-800 font-medium px-2 py-1"
                title="Mark Customer No-Show"
              >
                No-Show
              </button>
            )}
          </div>
        ),
      },
    ],
    [isTechnician],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={isTechnician ? 'My Assigned Service Jobs' : 'Service & Maintenance Jobs'}
        description={
          isTechnician
            ? 'Your scheduled field appointments and 4-point diagnostic inspection queue.'
            : 'Operational queue for doorstep 4-point general laptop servicing, warranty repairs, and technician assignments.'
        }
      />

      {/* Control bar & Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search by job #, serial, customer, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') loadJobs();
              }}
              className="w-full text-xs rounded-lg border border-gray-300 pl-9 pr-4 py-2 focus:ring-1 focus:ring-primary focus:border-primary outline-none"
            />
            <svg
              className="w-4 h-4 text-gray-400 absolute left-3 top-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={currentStatus}
              onChange={(e) => updateFilters({ status: e.target.value })}
              className="text-xs border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 outline-none focus:ring-1 focus:ring-primary"
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>

            {/* Technician Filter (Admin only) */}
            {!isTechnician && (
              <select
                value={currentTech}
                onChange={(e) => updateFilters({ technicianId: e.target.value })}
                className="text-xs border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="ALL">All Technicians</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={loadJobs}
              className="text-xs px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <DataTable
        columns={columns}
        data={data.items}
        keyExtractor={(job: any) => job.id}
        isLoading={loading}
        pagination={{
          currentPage: data.page,
          totalItems: data.total,
          pageSize: data.pageSize,
          onPageChange: handlePageChange,
        }}
        emptyState={{
          title: 'No Service Jobs Found',
          description: 'No service appointments match current status and search filters.',
        }}
      />

      {/* Assign Technician Modal */}
      {assignModalJob && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900">
              Assign Technician — {assignModalJob.jobNumber}
            </h3>
            <p className="text-xs text-gray-600">
              Select an active service technician to dispatch for this appointment on{' '}
              <span className="font-semibold text-gray-900">
                {formatDate(assignModalJob.preferredDate)} ({assignModalJob.preferredSlot?.replace(/_/g, ' ')})
              </span>.
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Select Technician
              </label>
              <select
                value={selectedTechId}
                onChange={(e) => setSelectedTechId(e.target.value)}
                className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 bg-white outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">-- Choose Field Technician --</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.phone || t.email})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setAssignModalJob(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleAssign}
                disabled={!selectedTechId || assignLoading}
                className="px-4 py-2 text-xs font-semibold text-white bg-primary hover:bg-primary-dark rounded-lg disabled:opacity-50"
              >
                {assignLoading ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark No-Show Modal */}
      {noShowModalJob && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-rose-700">
              Mark Customer No-Show — {noShowModalJob.jobNumber}
            </h3>
            <p className="text-xs text-gray-600">
              Customer was unavailable at the confirmed doorstep address during the appointment window.
              Please record the field log reason:
            </p>

            <textarea
              rows={3}
              value={noShowReason}
              onChange={(e) => setNoShowReason(e.target.value)}
              placeholder="e.g. Technician arrived, called 3 times, customer not at home."
              className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-primary"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setNoShowModalJob(null)}
                className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkNoShow}
                disabled={!noShowReason.trim() || noShowLoading}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg disabled:opacity-50"
              >
                {noShowLoading ? 'Updating...' : 'Confirm No-Show'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ServiceJobsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-gray-500">Loading service jobs...</div>}>
      <ServiceJobsContent />
    </Suspense>
  );
}
