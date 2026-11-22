'use client';

import React, { useState } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import { api } from '../lib/api';
import { CreateCorporateInquiryDto } from '../lib/types';
import { NEXT_PUBLIC_WHATSAPP_NUMBER } from '../lib/config';
import { ShieldCheck, FileText, Truck, Copy, Check } from 'lucide-react';

interface CorporateQuoteModalProps {
  open: boolean;
  onClose: () => void;
  prefill?: {
    productId?: string;
    laptopModel?: string;
    mode?: 'sell' | 'lease';
    quantity?: number;
  };
}

export default function CorporateQuoteModal({
  open,
  onClose,
  prefill,
}: CorporateQuoteModalProps) {
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [mode, setMode] = useState<'sell' | 'lease'>(prefill?.mode || 'sell');
  const [quantity, setQuantity] = useState<number>(prefill?.quantity || 5);
  const [laptopModel, setLaptopModel] = useState(prefill?.laptopModel || '');
  const [expectedTenure, setExpectedTenure] = useState('12 Months');
  const [notes, setNotes] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedInquiryId, setSubmittedInquiryId] = useState<string | null>(null);

  // Sync prefill if modal opens with different prefill
  React.useEffect(() => {
    if (open) {
      if (prefill?.mode) setMode(prefill.mode);
      if (prefill?.quantity) setQuantity(prefill.quantity);
      if (prefill?.laptopModel) setLaptopModel(prefill.laptopModel);
      setError(null);
      setSubmittedInquiryId(null);
    }
  }, [open, prefill]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!companyName.trim()) {
      setError('Company name is required');
      return;
    }
    if (!contactPerson.trim()) {
      setError('Contact person name is required');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('A valid business email is required');
      return;
    }
    if (!phone.trim()) {
      setError('Contact phone number is required');
      return;
    }
    if (!city.trim()) {
      setError('Deployment city is required');
      return;
    }
    if (quantity < 1) {
      setError('Quantity must be at least 1 unit');
      return;
    }

    setLoading(true);

    try {
      const payload: CreateCorporateInquiryDto = {
        companyName: companyName.trim(),
        contactPerson: contactPerson.trim(),
        email: email.trim(),
        phone: phone.trim(),
        city: city.trim(),
        mode,
        quantity: Number(quantity),
        laptopModel: laptopModel.trim() || undefined,
        productId: prefill?.productId || undefined,
        expectedTenure: mode === 'lease' ? expectedTenure : undefined,
        notes: notes.trim() || undefined,
        website: website ? website.trim() : undefined,
        source: 'web',
      };

      const res = await api.createCorporateInquiry(payload);
      setSubmittedInquiryId(res.id);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit quote inquiry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetAndClose = () => {
    setSubmittedInquiryId(null);
    setError(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleResetAndClose}
      title={submittedInquiryId ? 'Inquiry Submitted' : 'Request Corporate Quote & Leasing'}
      description={
        submittedInquiryId
          ? 'Your corporate procurement request has been registered.'
          : 'Custom enterprise pricing, tax invoices where applicable, and bulk fleet solutions.'
      }
      size="lg"
    >
      {submittedInquiryId ? (
        <div className="py-4 space-y-4 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center animate-check-bounce">
            <svg className="w-8 h-8 text-emerald-600 animate-check-draw" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Thank You, {contactPerson}!</h3>
            <p className="text-sm text-slate-600 mt-1">
              Your corporate quote request for <strong className="text-slate-800">{companyName}</strong> has been registered. Our enterprise hardware specialist will reach out within 24 business hours.
            </p>
          </div>

          <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl inline-block text-left max-w-sm w-full mx-auto">
            <span className="text-[11px] font-semibold text-blue-700 block uppercase tracking-wider">
              Reference Inquiry ID
            </span>
            <span className="font-mono text-sm font-bold text-[#0B1F4B] select-all block mt-0.5">
              {submittedInquiryId}
            </span>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
            <Button variant="primary" onClick={handleResetAndClose} className="w-full sm:w-auto">
              Done
            </Button>
            <a
              href={`https://wa.me/${NEXT_PUBLIC_WHATSAPP_NUMBER}?text=Hi%20LaptopMitra,%20I%20just%20submitted%20Corporate%20Inquiry%20${submittedInquiryId}%20for%20${encodeURIComponent(companyName)}.%20Please%20share%20the%20quotation.`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20BD5A] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
            >
              WhatsApp Enterprise Desk
            </a>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Corporate Assurance Strip */}
          <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center text-[10px] text-slate-600 font-semibold">
            <div className="flex items-center justify-center gap-1">
              <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Tax Invoices</span>
            </div>
            <div className="flex items-center justify-center gap-1 border-x border-slate-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Doorstep SLA</span>
            </div>
            <div className="flex items-center justify-center gap-1">
              <Truck className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span>Pan-India Transit</span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              {error}
            </div>
          )}

          {/* Honeypot anti-spam field (hidden) */}
          <div className="hidden" aria-hidden="true">
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
          </div>

          {/* Procurement Mode Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Procurement Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode('sell')}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  mode === 'sell'
                    ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-xs ring-1 ring-[#2563EB]/20'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Bulk Purchase (Outright)
              </button>
              <button
                type="button"
                onClick={() => setMode('lease')}
                className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  mode === 'lease'
                    ? 'bg-[#2563EB] text-white border-[#2563EB] shadow-xs ring-1 ring-[#2563EB]/20'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Corporate Lease (Monthly)
              </button>
            </div>
          </div>

          {/* Company & Contact Person */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Company / Organization"
              placeholder="e.g. Acme Tech Solutions Pvt Ltd"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
            <Input
              label="Contact Person"
              placeholder="e.g. Rajesh Kumar"
              value={contactPerson}
              onChange={(e) => setContactPerson(e.target.value)}
              required
            />
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Business Email"
              type="email"
              placeholder="rajesh@acme.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Phone / Mobile"
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          {/* Quantity, City & Model */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Required Quantity (Units)"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
              required
            />
            <Input
              label="Deployment City"
              placeholder="e.g. Bengaluru / Delhi"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
            <Input
              label="Laptop Model / Spec"
              placeholder="e.g. ThinkPad T480s / i5"
              value={laptopModel}
              onChange={(e) => setLaptopModel(e.target.value)}
            />
          </div>

          {/* If Lease: Expected Tenure */}
          {mode === 'lease' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expected Lease Duration
              </label>
              <select
                value={expectedTenure}
                onChange={(e) => setExpectedTenure(e.target.value)}
                className="w-full text-xs py-2 px-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#1D6FF2]"
              >
                <option value="6 Months">6 Months</option>
                <option value="12 Months">12 Months (Recommended)</option>
                <option value="24 Months">24 Months</option>
                <option value="36 Months">36 Months</option>
              </select>
            </div>
          )}

          {/* Custom requirements / Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Custom Requirements (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Need 16GB RAM upgrade on all units, pre-installed Ubuntu, fast delivery within 5 business days."
              className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#1D6FF2]"
            />
          </div>

          <div className="pt-2 flex items-center justify-end space-x-2">
            <Button type="button" variant="ghost" onClick={handleResetAndClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={loading}>
              Submit Quote Request
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
