'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { X, Wrench, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

interface WarrantyClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  orderItemId: string;
  productName: string;
  pickupAddress?: any;
  onSuccess: (ticketNumber: string) => void;
}

const FAULT_CATEGORIES = [
  { value: 'SCREEN_DISPLAY', label: 'Screen / Display (flicker, dead pixels, lines, cracked glass)' },
  { value: 'BATTERY_CHARGING', label: 'Battery & Power (won’t charge, rapid discharge, swollen battery)' },
  { value: 'MOTHERBOARD_PERFORMANCE', label: 'Motherboard & Performance (overheating, sudden restart, slow)' },
  { value: 'KEYBOARD_TOUCHPAD', label: 'Keyboard & Touchpad (keys unresponsive, sticking, erratic cursor)' },
  { value: 'AUDIO_PORTS_CAMERA', label: 'Audio, Ports & Camera (mic, speakers, USB ports, webcam failure)' },
  { value: 'OTHER_HARDWARE', label: 'Other Hardware Failure' },
];

export function WarrantyClaimModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  orderItemId,
  productName,
  pickupAddress,
  onSuccess,
}: WarrantyClaimModalProps) {
  const [faultCategory, setFaultCategory] = useState(FAULT_CATEGORIES[0].value);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdTicketNumber, setCreatedTicketNumber] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || description.trim().length < 10) {
      setError('Please provide a detailed description of the fault (at least 10 characters).');
      return;
    }

    setSubmitting(true);
    setError(null);

    const categoryLabel = FAULT_CATEGORIES.find((c) => c.value === faultCategory)?.label || faultCategory;
    const addressStr = pickupAddress
      ? `${pickupAddress.addressLine1 || pickupAddress.address || ''}, ${pickupAddress.city || ''}, ${pickupAddress.state || ''} - ${pickupAddress.postalCode || pickupAddress.pincode || ''}`
      : 'Pickup address on file with order';

    const message = `WARRANTY SERVICE CLAIM\n\nDevice: ${productName}\nOrder: #${orderNumber}\nFault Category: ${categoryLabel}\nPickup Address: ${addressStr}\n\nFault Description:\n${description.trim()}`;

    try {
      const res = await api.createTicket({
        subject: `Warranty Claim: ${productName} (Order #${orderNumber})`,
        category: 'WARRANTY_CLAIMS',
        issueType: faultCategory,
        type: 'WARRANTY',
        priority: 'HIGH',
        orderId,
        orderItemId,
        message,
      });

      const ticketNum = res?.ticket?.ticketNumber || res?.ticketNumber || 'LM-T-WARRANTY';
      setCreatedTicketNumber(ticketNum);
      onSuccess(ticketNum);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit warranty claim. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="warranty-claim-title"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 id="warranty-claim-title" className="text-sm font-bold text-slate-900">
                Claim Warranty Service
              </h2>
              <p className="text-[11px] text-slate-500">
                {productName} • Order #{orderNumber}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {createdTicketNumber ? (
          <div className="py-6 space-y-4 text-center">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900">Warranty Claim Registered</h3>
              <p className="text-xs text-slate-600">
                Claim reference number:{' '}
                <span className="font-mono font-bold text-blue-600">{createdTicketNumber}</span>
              </p>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-left text-xs text-slate-700 space-y-2">
              <p className="font-semibold text-slate-900">What happens next?</p>
              <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[11px]">
                <li>Our technical diagnosis team will evaluate your claim within 24 hours.</li>
                <li>A technician will be dispatched for doorstep inspection or free courier pickup.</li>
                <li>All genuine hardware defects are repaired or replaced free of charge under warranty.</li>
              </ul>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Link
                href="/account/tickets"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition shadow-xs"
              >
                Track Claim in Tickets <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-700 block">
                Fault Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={faultCategory}
                onChange={(e) => setFaultCategory(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-600 focus:bg-white transition"
              >
                {FAULT_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-slate-700 block">
                Fault Description <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe when the issue started, symptoms observed, and any error messages displayed..."
                rows={4}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-600 focus:bg-white transition"
              />
              <span className="text-[10px] text-slate-400 block">
                Minimum 10 characters. Include charger/cable details if power related.
              </span>
            </div>

            {pickupAddress && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                  Doorstep Pickup Address
                </span>
                <p className="text-slate-800 mt-1">
                  {pickupAddress.addressLine1 || pickupAddress.address},{' '}
                  {pickupAddress.city}, {pickupAddress.state} -{' '}
                  {pickupAddress.postalCode || pickupAddress.pincode}
                </p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Submitting Claim...
                  </>
                ) : (
                  'Submit Warranty Claim'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

