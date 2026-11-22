'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import Modal from '@/components/ui/Modal';
import {
  Wrench,
  CheckCircle2,
  Clock,
  MapPin,
  Calendar,
  AlertCircle,
  ChevronLeft,
  User,
  Battery,
  FileText,
  RotateCcw,
  XCircle,
  Sparkles,
  Printer,
} from 'lucide-react';

const LIFECYCLE_STEPS = [
  { id: 'REQUESTED', label: 'Booked', description: 'Request received' },
  { id: 'SCHEDULED', label: 'Scheduled', description: 'Technician assigned' },
  { id: 'IN_SERVICE', label: 'In Service', description: 'Deep cleaning & repasting' },
  { id: 'QUALITY_CHECK', label: 'Quality Check', description: 'Stress testing & battery' },
  { id: 'COMPLETED', label: 'Completed', description: 'Returned & verified' },
];

function getStepIndex(status: string): number {
  switch (status) {
    case 'REQUESTED':
      return 0;
    case 'SCHEDULED':
    case 'RESCHEDULED':
      return 1;
    case 'PICKED_UP':
    case 'IN_SERVICE':
      return 2;
    case 'QUALITY_CHECK':
    case 'READY_FOR_DROP':
      return 3;
    case 'COMPLETED':
      return 4;
    default:
      return 0;
  }
}

export default function CustomerServiceJobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) || '';

  const [job, setJob] = useState<any | null>(null);
  const [settings, setSettings] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reschedule modal state
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newSlot, setNewSlot] = useState('MORNING_10_TO_1');
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  // Cancel modal state
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const loadJob = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [jobData, settingsData] = await Promise.all([
        api.getServiceJobById(id),
        api.getServiceSettings().catch(() => null),
      ]);
      setJob(jobData);
      setSettings(settingsData);
    } catch (err: any) {
      setError(err?.message || 'Failed to load service job details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      loadJob();
    }
  }, [id]);

  const handleOpenReschedule = () => {
    if (!job) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setNewDate(tomorrow.toISOString().split('T')[0]);
    setNewSlot(job.preferredSlot || 'MORNING_10_TO_1');
    setRescheduleReason('');
    setRescheduleError(null);
    setRescheduleModalOpen(true);
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDate) {
      setRescheduleError('Please select a valid reschedule date.');
      return;
    }
    setRescheduleLoading(true);
    setRescheduleError(null);

    try {
      await api.rescheduleService(id, {
        preferredDate: newDate,
        preferredSlot: newSlot,
        reason: rescheduleReason.trim() || undefined,
      });
      setRescheduleModalOpen(false);
      await loadJob();
    } catch (err: any) {
      setRescheduleError(err?.message || 'Failed to reschedule appointment.');
    } finally {
      setRescheduleLoading(false);
    }
  };

  const handleOpenCancel = () => {
    setCancelReason('');
    setCancelError(null);
    setCancelModalOpen(true);
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      setCancelError('Please state your reason for cancelling.');
      return;
    }
    setCancelLoading(true);
    setCancelError(null);

    try {
      await api.cancelService(id, {
        reason: cancelReason.trim(),
      });
      setCancelModalOpen(false);
      await loadJob();
    } catch (err: any) {
      setCancelError(err?.message || 'Failed to cancel service booking.');
    } finally {
      setCancelLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="card p-12 text-center text-xs text-slate-500 space-y-2 max-w-4xl">
        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
        <p>Loading live service tracking details...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="card p-8 text-center space-y-3 max-w-4xl">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">Service Booking Not Found</h2>
        <p className="text-xs text-slate-500">{error || 'This service job could not be located.'}</p>
        <Link href="/account/laptops" className="btn-secondary text-xs inline-block">
          Return to My Laptops
        </Link>
      </div>
    );
  }

  const isTerminal = ['COMPLETED', 'CANCELLED', 'REJECTED'].includes(job.status);
  const isCancellable = ['REQUESTED', 'SCHEDULED', 'RESCHEDULED'].includes(job.status);
  const currentStep = getStepIndex(job.status);
  const isCancelled = job.status === 'CANCELLED' || job.status === 'REJECTED';

  const slotOptions = settings?.slotWindows || [
    { id: 'MORNING_10_TO_1', label: 'Morning (10:00 AM - 1:00 PM)' },
    { id: 'AFTERNOON_2_TO_5', label: 'Afternoon (2:00 PM - 5:00 PM)' },
    { id: 'EVENING_5_TO_8', label: 'Evening (5:00 PM - 8:00 PM)' },
  ];

  const address = typeof job.pickupAddress === 'object' && job.pickupAddress ? job.pickupAddress : {};

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back button and page title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <Link
            href="/account/laptops"
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-primary transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Back to My Laptops</span>
          </Link>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              Service Tracking: <span className="font-mono text-primary">{job.jobNumber}</span>
            </h1>
            <span
              className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                job.status === 'COMPLETED'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                  : job.status === 'CANCELLED' || job.status === 'REJECTED'
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                  : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
              }`}
            >
              {job.status.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* Action Buttons: Reschedule, Cancel, Print Receipt */}
        <div className="flex items-center gap-2">
          {job.status === 'COMPLETED' && (
            <button
              type="button"
              onClick={() => window.print()}
              className="btn-primary text-xs inline-flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Service Receipt</span>
            </button>
          )}

          {isCancellable && (
            <>
              <button
                type="button"
                onClick={handleOpenReschedule}
                className="btn-secondary text-xs inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reschedule</span>
              </button>
              <button
                type="button"
                onClick={handleOpenCancel}
                className="px-3 py-1.5 text-xs rounded-xl font-semibold border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all"
              >
                Cancel Booking
              </button>
            </>
          )}
        </div>
      </div>

      {/* 5-Step Visual Stepper (Only if not cancelled) */}
      {!isCancelled ? (
        <div className="card p-6 bg-white dark:bg-slate-900">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 relative">
            {LIFECYCLE_STEPS.map((step, idx) => {
              const isPast = idx < currentStep;
              const isCurrent = idx === currentStep;

              return (
                <div key={step.id} className="space-y-2 text-center relative z-10">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center mx-auto text-xs font-bold transition-all ${
                      isPast
                        ? 'bg-emerald-600 text-white'
                        : isCurrent
                        ? 'bg-primary text-white ring-4 ring-primary/20'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isPast ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
                  </div>
                  <div>
                    <p
                      className={`text-xs font-bold ${
                        isCurrent
                          ? 'text-primary'
                          : isPast
                          ? 'text-slate-900 dark:text-white'
                          : 'text-slate-400'
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="text-[10px] text-slate-500 hidden sm:block">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="card p-5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold text-rose-900 dark:text-rose-200">
              Service Booking Cancelled
            </h3>
            <p className="text-xs text-rose-700 dark:text-rose-400">
              {job.cancellationReason || 'Cancelled by customer.'}
            </p>
            <p className="text-[11px] text-rose-600 dark:text-rose-400 pt-1">
              Your free service entitlement has been automatically restored. You may schedule a new appointment from your laptops page at your convenience.
            </p>
          </div>
        </div>
      )}

      {/* Main Grid: Checklist & Appointment Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left 2 Columns: 4-Point Inspection Checklist & Diagnostic Progress */}
        <div className="md:col-span-2 space-y-6">
          {/* 4-Point Checklist */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  4-Point Quality Inspection Checklist
                </h3>
              </div>
              <span className="text-[11px] text-slate-500">
                {[job.checklistCleaning, job.checklistThermalPaste, job.checklistSoftware, job.checklistBattery].filter(Boolean).length} / 4 Verified
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  id: 'cleaning',
                  title: '1. Internal Dust Cleaning',
                  desc: 'High-pressure clearance of fan blades, heatsink fins, and keyboard ports',
                  done: job.checklistCleaning,
                },
                {
                  id: 'thermal',
                  title: '2. Thermal Repasting',
                  desc: 'Application of fresh non-conductive compound for CPU/GPU thermal efficiency',
                  done: job.checklistThermalPaste,
                },
                {
                  id: 'software',
                  title: '3. Stress Diagnostics',
                  desc: 'Automated hardware stability run verifying thermal throttling and RAM health',
                  done: job.checklistSoftware,
                },
                {
                  id: 'battery',
                  title: '4. Battery Health Check',
                  desc: 'Verification of factory design capacity versus current full-charge capacity',
                  done: job.checklistBattery,
                },
              ].map((item) => (
                <div
                  key={item.id}
                  className={`p-3.5 rounded-xl border transition-all space-y-1.5 ${
                    item.done
                      ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60'
                      : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {item.title}
                    </span>
                    {item.done ? (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        Verified
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-400">
                        Pending
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>

            {/* Battery Health Report Meter if recorded */}
            {job.batteryHealthPercent !== null && job.batteryHealthPercent !== undefined && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                    <Battery className="w-4 h-4 text-emerald-600" />
                    <span>Certified Battery Health</span>
                  </div>
                  <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                    {job.batteryHealthPercent}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      job.batteryHealthPercent >= 80 ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, job.batteryHealthPercent))}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500">
                  {job.batteryHealthPercent >= 80
                    ? 'Battery health is in optimal condition with excellent charge retention.'
                    : 'Battery health shows normal wear. Eligible for discounted battery replacement.'}
                </p>
              </div>
            )}

            {/* Internal Notes / Findings */}
            {job.internalNotes && (
              <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30 text-xs space-y-1">
                <span className="font-bold text-indigo-900 dark:text-indigo-300 block">
                  Technician Service Report:
                </span>
                <p className="text-slate-700 dark:text-slate-300 italic">
                  &ldquo;{job.internalNotes}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* Audit Event Timeline */}
          <div className="card p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              Appointment Activity & Status Timeline
            </h3>

            <div className="space-y-4 pt-1">
              {(job.events || []).map((ev: any, idx: number) => (
                <div key={ev.id || idx} className="flex items-start gap-3 text-xs">
                  <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {ev.eventType === 'STATUS_CHANGE'
                        ? `Status changed to ${ev.newStatus}`
                        : ev.eventType}
                    </p>
                    {ev.notes && <p className="text-slate-600 dark:text-slate-400">{ev.notes}</p>}
                    <p className="text-[10px] text-slate-400">{formatDate(ev.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Appointment Details, Device Specs, Technician */}
        <div className="space-y-6">
          {/* Pickup & Slot Details */}
          <div className="card p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              Appointment Window
            </h3>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Scheduled Date</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {formatDate(job.scheduledPickupAt)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Time Window</span>
                <span className="text-slate-900 dark:text-white">
                  {slotOptions.find((s: any) => s.id === job.preferredSlot)?.label || job.preferredSlot}
                </span>
              </div>
              {job.rescheduledCount > 0 && (
                <div>
                  <span className="text-[11px] text-amber-600 font-medium">
                    Rescheduled {job.rescheduledCount} {job.rescheduledCount === 1 ? 'time' : 'times'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Assigned Technician */}
          <div className="card p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              Assigned Technician
            </h3>
            {job.technician ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  {job.technician.name?.charAt(0) || 'T'}
                </div>
                <div className="text-xs">
                  <p className="font-bold text-slate-900 dark:text-white">{job.technician.name}</p>
                  <p className="text-[11px] text-slate-500">Certified LaptopMitra Field Engineer</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic">
                A certified field technician will be assigned 12 hours prior to your scheduled pickup window.
              </p>
            )}
          </div>

          {/* Doorstep Destination */}
          <div className="card p-5 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              Doorstep Pickup Address
            </h3>
            <div className="text-xs text-slate-700 dark:text-slate-300 space-y-0.5">
              <p className="font-semibold text-slate-900 dark:text-white">{address.fullName || job.customer?.name}</p>
              <p>{address.address}</p>
              <p>{[address.city, address.state, address.pincode || job.pickupPincode].filter(Boolean).join(', ')}</p>
              <p className="text-[11px] text-slate-500 pt-1">Phone: {address.phone || job.customer?.phone || '—'}</p>
            </div>
          </div>

          {/* Device Summary Card */}
          <div className="card p-5 space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
              Laptop Device
            </h3>
            <div className="text-xs space-y-1">
              <p className="font-bold text-slate-900 dark:text-white">
                {job.soldUnit?.product?.name || job.soldUnit?.modelSnapshot}
              </p>
              <p className="font-mono text-[11px] text-slate-500">
                Serial: {job.soldUnit?.serialNumber || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Reschedule Modal */}
      <Modal
        open={rescheduleModalOpen}
        onClose={() => setRescheduleModalOpen(false)}
        title="Reschedule Pickup Appointment"
        description="Select an alternate date or time window for technician doorstep collection."
        size="md"
      >
        <form onSubmit={handleRescheduleSubmit} className="space-y-4">
          {rescheduleError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-600 dark:text-rose-400">
              {rescheduleError}
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              New Preferred Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              New Window Slot <span className="text-rose-500">*</span>
            </label>
            <select
              value={newSlot}
              onChange={(e) => setNewSlot(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            >
              {slotOptions.map((opt: any) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Reason for Rescheduling (Optional)
            </label>
            <textarea
              value={rescheduleReason}
              onChange={(e) => setRescheduleReason(e.target.value)}
              placeholder="e.g. Office meeting at scheduled time..."
              rows={2}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setRescheduleModalOpen(false)}
              className="btn-secondary text-xs"
              disabled={rescheduleLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary text-xs"
              disabled={rescheduleLoading}
            >
              {rescheduleLoading ? 'Updating...' : 'Confirm Reschedule'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Cancel Modal */}
      <Modal
        open={cancelModalOpen}
        onClose={() => setCancelModalOpen(false)}
        title="Cancel Service Appointment"
        description="Cancelling this appointment will automatically restore your complimentary general service entitlement so you can re-book later within the 6-month window."
        size="md"
      >
        <form onSubmit={handleCancelSubmit} className="space-y-4">
          {cancelError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-600 dark:text-rose-400">
              {cancelError}
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Reason for Cancellation <span className="text-rose-500">*</span>
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Please explain why you are cancelling this service appointment..."
              rows={3}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setCancelModalOpen(false)}
              className="btn-secondary text-xs"
              disabled={cancelLoading}
            >
              Keep Appointment
            </button>
            <button
              type="submit"
              className="btn-danger text-xs"
              disabled={cancelLoading}
            >
              {cancelLoading ? 'Cancelling...' : 'Confirm Cancellation'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

