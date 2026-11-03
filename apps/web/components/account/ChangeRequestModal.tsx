'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';
import { X, CheckCircle2, AlertCircle, Loader2, MapPin, Phone } from 'lucide-react';

interface ChangeRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderNumber: string;
  type: 'ADDRESS_CHANGE' | 'PHONE_CHANGE';
  initialData?: {
    addressLine1?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    phone?: string;
  };
  onSuccess: (requestNumber: string) => void;
}

export function ChangeRequestModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  type,
  initialData,
  onSuccess,
}: ChangeRequestModalProps) {
  const [addressLine1, setAddressLine1] = useState(initialData?.addressLine1 || '');
  const [city, setCity] = useState(initialData?.city || '');
  const [state, setState] = useState(initialData?.state || '');
  const [postalCode, setPostalCode] = useState(initialData?.postalCode || '');
  const [phone, setPhone] = useState(initialData?.phone || '');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let requestedData: Record<string, any> = {};

      if (type === 'ADDRESS_CHANGE') {
        if (!addressLine1.trim() || !city.trim() || !state.trim() || !postalCode.trim()) {
          throw new Error('Please fill in all address fields.');
        }
        if (!/^\d{6}$/.test(postalCode.trim())) {
          throw new Error('Please enter a valid 6-digit Indian PIN code.');
        }
        requestedData = {
          addressLine1: addressLine1.trim(),
          city: city.trim(),
          state: state.trim(),
          postalCode: postalCode.trim(),
        };
      } else {
        const cleanPhone = phone.trim().replace(/\D/g, '');
        if (cleanPhone.length < 10) {
          throw new Error('Please enter a valid 10-digit mobile number.');
        }
        requestedData = { phone: cleanPhone.slice(-10) };
      }

      const res = await api.createChangeRequest({
        orderId,
        type,
        requestedData,
      });

      onSuccess(res.requestNumber || 'LM-CR-XXXXXX');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit change request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-modal-title"
    >
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-700 rounded-xl">
              {type === 'ADDRESS_CHANGE' ? <MapPin className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            </div>
            <div>
              <h2 id="change-modal-title" className="text-sm font-bold text-slate-900">
                {type === 'ADDRESS_CHANGE' ? 'Update Delivery Address' : 'Update Contact Phone'}
              </h2>
              <p className="text-[11px] text-slate-500">Order #{orderNumber} (Before Dispatch)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg transition"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {type === 'ADDRESS_CHANGE' ? (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Street Address / Flat / Building
                </label>
                <input
                  type="text"
                  required
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="e.g. 42, 2nd Main Road, Koramangala"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Bengaluru"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">State</label>
                  <input
                    type="text"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="e.g. Karnataka"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">6-Digit PIN Code</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="e.g. 560034"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent font-mono"
                />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">New Mobile Number</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-medium text-slate-400">+91</span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9876543210"
                  className="w-full pl-10 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 focus:border-transparent font-mono"
                />
              </div>
            </div>
          )}

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px] text-slate-500 leading-relaxed">
            Note: Changes can only be applied while your shipment is being processed before dispatch. Our support team reviews and confirms changes promptly.
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {loading ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
