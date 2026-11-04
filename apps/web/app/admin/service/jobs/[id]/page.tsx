'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '../../../../../lib/api';
import { useAuth } from '../../../../../lib/auth-context';
import { formatDate } from '../../../../../lib/format';
import PageHeader from '../../../../../components/admin/PageHeader';
import StatusBadge from '../../../../../components/admin/StatusBadge';

export default function AdminServiceJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const jobId = resolvedParams.id;
  const router = useRouter();
  const { user } = useAuth();
  const isTechnician = user?.role === 'TECHNICIAN';

  const [job, setJob] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [technicians, setTechnicians] = useState<any[]>([]);

  // Form states
  const [status, setStatus] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [cleaningDone, setCleaningDone] = useState(false);
  const [thermalDone, setThermalDone] = useState(false);
  const [softwareDone, setSoftwareDone] = useState(false);
  const [batteryDone, setBatteryDone] = useState(false);
  const [batteryPercent, setBatteryPercent] = useState<string>('');
  const [thermalIdleTemp, setThermalIdleTemp] = useState<string>('');
  const [thermalLoadTemp, setThermalLoadTemp] = useState<string>('');
  const [throttlingDetected, setThrottlingDetected] = useState<boolean>(false);
  const [technicianNotes, setTechnicianNotes] = useState('');
  const [customerSummary, setCustomerSummary] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadJob = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getAdminServiceJob(jobId);
      setJob(data);
      setStatus(data.status);
      setTechnicianId(data.technicianId || '');
      setCleaningDone(!!data.checklistCleaning);
      setThermalDone(!!data.checklistThermalPaste);
      setSoftwareDone(!!data.checklistSoftware);
      setBatteryDone(!!data.checklistBattery);
      setBatteryPercent(data.batteryHealthPercent !== null && data.batteryHealthPercent !== undefined ? String(data.batteryHealthPercent) : '');
      setThermalIdleTemp(data.thermalIdleTemp !== null && data.thermalIdleTemp !== undefined ? String(data.thermalIdleTemp) : '');
      setThermalLoadTemp(data.thermalLoadTemp !== null && data.thermalLoadTemp !== undefined ? String(data.thermalLoadTemp) : '');
      setThrottlingDetected(!!data.thermalThrottlingDetected);
      setTechnicianNotes(data.technicianNotes || '');
      setCustomerSummary(data.customerSummaryNote || '');
    } catch (err: any) {
      setError(err?.message || 'Failed to load service job record.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJob();
    if (!isTechnician) {
      api.getTechnicians().then(setTechnicians).catch(() => {});
    }
  }, [jobId, isTechnician]);

  const handleSave = async (overrideStatus?: string) => {
    setSaving(true);
    setFeedbackMsg(null);

    const targetStatus = overrideStatus || status;

    // Check mandatory constraints if completing
    if (targetStatus === 'COMPLETED') {
      if (!cleaningDone || !thermalDone || !softwareDone || !batteryDone) {
        setFeedbackMsg({
          type: 'error',
          text: 'All 4 inspection points must be verified before completing the service job.',
        });
        setSaving(false);
        return;
      }
      if (!batteryPercent) {
        setFeedbackMsg({
          type: 'error',
          text: 'Battery health percentage is required to generate the certified service completion receipt.',
        });
        setSaving(false);
        return;
      }
    }

    try {
      const payload: any = {
        status: targetStatus,
        technicianId: technicianId || undefined,
        checklistCleaning: cleaningDone,
        checklistThermalPaste: thermalDone,
        checklistSoftware: softwareDone,
        checklistBattery: batteryDone,
        batteryHealthPercent: batteryPercent ? parseInt(batteryPercent, 10) : undefined,
        thermalIdleTemp: thermalIdleTemp ? parseInt(thermalIdleTemp, 10) : undefined,
        thermalLoadTemp: thermalLoadTemp ? parseInt(thermalLoadTemp, 10) : undefined,
        thermalThrottlingDetected: throttlingDetected,
        technicianNotes: technicianNotes.trim() || undefined,
        customerSummaryNote: customerSummary.trim() || undefined,
      };

      await api.updateAdminServiceJob(jobId, payload);
      setFeedbackMsg({
        type: 'success',
        text: overrideStatus
          ? `Job status transitioned to ${overrideStatus.replace(/_/g, ' ')} successfully.`
          : 'Service job record updated successfully.',
      });
      loadJob();
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: err?.message || 'Failed to update service job.',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-gray-500">
        Loading service job details...
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="p-8 bg-rose-50 border border-rose-200 rounded-xl max-w-lg mx-auto text-center space-y-3">
        <h3 className="text-sm font-bold text-rose-800">Service Record Not Found</h3>
        <p className="text-xs text-rose-600">{error || 'This service job could not be retrieved.'}</p>
        <Link
          href="/admin/service/jobs"
          className="inline-block text-xs font-semibold px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-900 rounded-lg"
        >
          Back to Service Jobs
        </Link>
      </div>
    );
  }

  const pickupAddr = typeof job.pickupAddress === 'object' && job.pickupAddress ? job.pickupAddress : {};
  const mapsQuery = encodeURIComponent(
    [pickupAddr.address, pickupAddr.city, pickupAddr.state, pickupAddr.pincode || job.pickupPincode]
      .filter(Boolean)
      .join(', '),
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Link href="/admin/service/jobs" className="hover:text-primary underline">
            Service Jobs
          </Link>
          <span>/</span>
          <span className="font-mono text-gray-800">{job.jobNumber}</span>
        </div>
        <Link
          href="/admin/service/jobs"
          className="text-xs font-semibold px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
        >
          Back to List
        </Link>
      </div>

      <PageHeader
        title={`Service Job: ${job.jobNumber}`}
        description="Comprehensive 4-point diagnostic inspection, hardware servicing, and completion sign-off."
        badge={
          <div className="flex items-center gap-2">
            <StatusBadge status={job.status} />
            {job.receiptNumber && (
              <span className="text-xs font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold">
                Receipt: {job.receiptNumber}
              </span>
            )}
          </div>
        }
      />

      {feedbackMsg && (
        <div
          className={`p-3 rounded-lg text-xs font-medium border ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {feedbackMsg.text}
        </div>
      )}

      {/* Technician Field Quick Actions Bar */}
      {isTechnician && job.status !== 'COMPLETED' && job.status !== 'CANCELLED' && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 space-y-3">
          <div className="text-xs font-bold text-blue-900 uppercase tracking-wide">
            Technician Field Actions
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {job.status === 'SCHEDULED' && (
              <button
                onClick={() => handleSave('PICKED_UP')}
                disabled={saving}
                className="text-xs font-semibold px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm"
              >
                1. Unit Picked Up from Customer
              </button>
            )}
            {job.status === 'PICKED_UP' && (
              <button
                onClick={() => handleSave('IN_SERVICE')}
                disabled={saving}
                className="text-xs font-semibold px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm"
              >
                2. Begin Workbench Service
              </button>
            )}
            {job.status === 'IN_SERVICE' && (
              <button
                onClick={() => handleSave('QUALITY_CHECK')}
                disabled={saving}
                className="text-xs font-semibold px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-sm"
              >
                3. Move to Quality Check
              </button>
            )}
            {job.status === 'QUALITY_CHECK' && (
              <button
                onClick={() => handleSave('COMPLETED')}
                disabled={saving}
                className="text-xs font-semibold px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-sm"
              >
                4. Sign-Off & Complete Service
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Device Context & Customer Details */}
        <div className="space-y-6">
          {/* Device Card */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Assigned Hardware Unit
            </h3>
            <div className="space-y-1.5 text-xs">
              <div className="font-bold text-sm text-gray-900">
                {job.soldUnit?.product?.name || job.soldUnit?.modelSnapshot || 'Laptop'}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">Serial Number:</span>
                {job.soldUnit?.serialNumber ? (
                  <Link
                    href={`/admin/service/units/${encodeURIComponent(job.soldUnit.serialNumber)}`}
                    className="font-mono font-bold text-primary hover:underline"
                  >
                    {job.soldUnit.serialNumber}
                  </Link>
                ) : (
                  <span className="font-mono text-gray-400">Not assigned</span>
                )}
              </div>
              {job.soldUnit?.deliveredAt && (
                <div className="text-gray-500">
                  Delivered on: <span className="text-gray-800 font-medium">{formatDate(job.soldUnit.deliveredAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Customer & Doorstep Address Card */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Pickup Destination
              </h3>
              {mapsQuery && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${mapsQuery}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open in Maps
                </a>
              )}
            </div>

            <div className="text-xs space-y-1 text-gray-700">
              <div className="font-bold text-gray-900">{pickupAddr.fullName || job.customer?.name}</div>
              <div>{pickupAddr.address}</div>
              <div>
                {[pickupAddr.city, pickupAddr.state, pickupAddr.pincode || job.pickupPincode].filter(Boolean).join(', ')}
              </div>
              <div className="pt-1.5 flex items-center gap-2">
                <span className="text-gray-500">Phone:</span>
                <a
                  href={`tel:${pickupAddr.phone || job.customer?.phone}`}
                  className="font-mono font-semibold text-primary hover:underline"
                >
                  {pickupAddr.phone || job.customer?.phone || '—'}
                </a>
              </div>
              <div className="pt-2 text-[11px] text-gray-500 border-t border-gray-100 mt-2">
                Preferred Slot:{' '}
                <span className="font-semibold text-gray-800">
                  {formatDate(job.preferredDate)} ({job.preferredSlot?.replace(/_/g, ' ')})
                </span>
              </div>
              {job.customerNotes && (
                <div className="p-2 bg-amber-50 border border-amber-200 rounded text-amber-900 text-[11px] mt-2">
                  <span className="font-bold">Customer Notes: </span>
                  {job.customerNotes}
                </div>
              )}
            </div>
          </div>

          {/* Audit Event Timeline */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Service Event Log ({job.events?.length || 0})
            </h3>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1 text-xs">
              {(job.events || []).map((ev: any) => (
                <div key={ev.id} className="border-l-2 border-primary/40 pl-3 py-1 space-y-0.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-gray-800">{ev.toStatus?.replace(/_/g, ' ')}</span>
                    <span className="text-gray-400">{formatDate(ev.createdAt)}</span>
                  </div>
                  {ev.notes && <div className="text-gray-600 text-[11px]">{ev.notes}</div>}
                  <div className="text-[10px] text-gray-400">Actor: {ev.actorRole || 'SYSTEM'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 2 Columns: 4-Point Checklist & Workbench Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status & Assignment Header (Admin controls) */}
          {!isTechnician && (
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Lifecycle & Assignment Controls
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Lifecycle Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="REQUESTED">REQUESTED</option>
                    <option value="SCHEDULED">SCHEDULED</option>
                    <option value="PICKED_UP">PICKED_UP</option>
                    <option value="IN_SERVICE">IN_SERVICE</option>
                    <option value="QUALITY_CHECK">QUALITY_CHECK</option>
                    <option value="READY_FOR_DROP">READY_FOR_DROP</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="CANCELLED">CANCELLED</option>
                    <option value="NO_SHOW">NO_SHOW</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Assigned Technician
                  </label>
                  <select
                    value={technicianId}
                    onChange={(e) => setTechnicianId(e.target.value)}
                    className="w-full text-xs border border-gray-300 rounded-lg p-2 bg-white outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">-- Unassigned --</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.phone || t.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 4-Point Service Checklist */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Standard 4-Point Service Checklist
                </h3>
                <p className="text-xs text-gray-500">
                  Mandatory operational items. All 4 items must be verified prior to completing the job.
                </p>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700">
                {[cleaningDone, thermalDone, softwareDone, batteryDone].filter(Boolean).length}/4 Complete
              </span>
            </div>

            <div className="space-y-3">
              {/* Item 1: Internal Cleaning */}
              <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={cleaningDone}
                  onChange={(e) => setCleaningDone(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded text-primary focus:ring-primary border-gray-300"
                />
                <div className="text-xs space-y-0.5">
                  <span className="font-bold text-gray-900">1. Internal Deep Cleaning</span>
                  <p className="text-gray-500">
                    High-pressure anti-static blower removal of internal dust from cooling fins, fan bays, motherboard, and speaker grilles.
                  </p>
                </div>
              </label>

              {/* Item 2: Thermal Repasting */}
              <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={thermalDone}
                  onChange={(e) => setThermalDone(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded text-primary focus:ring-primary border-gray-300"
                />
                <div className="text-xs space-y-0.5">
                  <span className="font-bold text-gray-900">2. Thermal Paste Compound Refresh</span>
                  <p className="text-gray-500">
                    Removal of crusty dried thermal paste on CPU & GPU heat sinks and reapplication of premium Arctic/Noctua thermal compound.
                  </p>
                </div>
              </label>

              {/* Item 3: Hardware Diagnostics */}
              <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={softwareDone}
                  onChange={(e) => setSoftwareDone(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded text-primary focus:ring-primary border-gray-300"
                />
                <div className="text-xs space-y-0.5">
                  <span className="font-bold text-gray-900">3. Diagnostic Stress Benchmark</span>
                  <p className="text-gray-500">
                    Comprehensive MemTest RAM scan, SSD health check, thermal stress benchmark, and I/O port validation.
                  </p>
                </div>
              </label>

              {/* Item 4: Battery Health Check */}
              <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-slate-50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={batteryDone}
                  onChange={(e) => setBatteryDone(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded text-primary focus:ring-primary border-gray-300"
                />
                <div className="text-xs space-y-0.5">
                  <span className="font-bold text-gray-900">4. Battery Health & Capacity Inspection</span>
                  <p className="text-gray-500">
                    Full charge cycle capacity readout versus factory design capacity; swelling and cell degradation inspection.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Measurements: Battery Health & Thermals */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Diagnostic Measurements & Calibration
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Battery Health (%) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={batteryPercent}
                  onChange={(e) => setBatteryPercent(e.target.value)}
                  placeholder="e.g. 88"
                  className="w-full text-xs font-mono border border-gray-300 rounded-lg p-2 outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Idle Temp (°C)
                </label>
                <input
                  type="number"
                  value={thermalIdleTemp}
                  onChange={(e) => setThermalIdleTemp(e.target.value)}
                  placeholder="e.g. 42"
                  className="w-full text-xs font-mono border border-gray-300 rounded-lg p-2 outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Peak Load Temp (°C)
                </label>
                <input
                  type="number"
                  value={thermalLoadTemp}
                  onChange={(e) => setThermalLoadTemp(e.target.value)}
                  placeholder="e.g. 78"
                  className="w-full text-xs font-mono border border-gray-300 rounded-lg p-2 outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                <input
                  type="checkbox"
                  checked={throttlingDetected}
                  onChange={(e) => setThrottlingDetected(e.target.checked)}
                  className="h-4 w-4 rounded text-rose-600 focus:ring-rose-500 border-gray-300"
                />
                Thermal Throttling Detected under Stress Test
              </label>
            </div>
          </div>

          {/* Notes & Summary */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Technician Notes & Customer Summary
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Customer Summary Note (Printed on Certified Service Receipt)
                </label>
                <textarea
                  rows={2}
                  value={customerSummary}
                  onChange={(e) => setCustomerSummary(e.target.value)}
                  placeholder="e.g. Heatsink cleared, Arctic MX-4 applied. Temps dropped by 14°C under stress. Battery in healthy condition."
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Internal Workbench Notes (Staff only)
                </label>
                <textarea
                  rows={2}
                  value={technicianNotes}
                  onChange={(e) => setTechnicianNotes(e.target.value)}
                  placeholder="Internal observations, loose chassis screw replaced, fan bearing condition..."
                  className="w-full text-xs border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => handleSave()}
                disabled={saving}
                className="px-5 py-2.5 text-xs font-bold text-white bg-primary hover:bg-primary-dark rounded-lg shadow-sm disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Job Record'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
