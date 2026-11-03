'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';
import { formatIndianRupees } from '@/lib/account-helpers';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Building2,
  Smartphone,
  Info,
} from 'lucide-react';

interface BuybackClaimModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  orderItemId: string;
  orderNumber: string;
  productName: string;
  unitPrice: number;
  deviceAgeMonths: number;
  initialTierPercent: number;
  onSuccess: (requestNumber: string) => void;
}

export function BuybackClaimModal({
  isOpen,
  onClose,
  orderId,
  orderItemId,
  orderNumber,
  productName,
  unitPrice,
  deviceAgeMonths,
  initialTierPercent,
  onSuccess,
}: BuybackClaimModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Checklist
  const [bootsToOs, setBootsToOs] = useState(true);
  const [motherboardWorking, setMotherboardWorking] = useState(true);
  const [displayIntact, setDisplayIntact] = useState(true);
  const [originalCharger, setOriginalCharger] = useState(true);
  const [batteryHealthPercent, setBatteryHealthPercent] = useState(85);

  // Step 3: Payout Details
  const [payoutMethod, setPayoutMethod] = useState<'BANK_TRANSFER' | 'UPI'>('BANK_TRANSFER');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [upiId, setUpiId] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const grossQuote = Math.round((unitPrice * (initialTierPercent / 100)) * 100) / 100;
  const netPayout = grossQuote; // Pickup is free (₹0 convenience charge)

  const isChecklistValid =
    bootsToOs && motherboardWorking && displayIntact && originalCharger && batteryHealthPercent >= 70;

  const handleStep1Next = () => {
    if (!isChecklistValid) {
      setError('All core functional conditions must be verified and battery health must be at least 70%.');
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleStep2Next = () => {
    setError(null);
    setStep(3);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let payoutDetails: any = { method: payoutMethod };

      if (payoutMethod === 'BANK_TRANSFER') {
        if (!accountNumber.trim() || !ifscCode.trim() || !accountHolderName.trim()) {
          throw new Error('Please fill in all bank account details.');
        }
        if (accountNumber.trim() !== confirmAccountNumber.trim()) {
          throw new Error('Account number confirmation does not match.');
        }
        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode.trim().toUpperCase())) {
          throw new Error('Please enter a valid 11-character Indian IFSC code (e.g. HDFC0001234).');
        }
        payoutDetails = {
          method: 'BANK_TRANSFER',
          accountNumber: accountNumber.trim(),
          ifscCode: ifscCode.trim().toUpperCase(),
          accountHolderName: accountHolderName.trim(),
        };
      } else {
        if (!upiId.trim() || !upiId.includes('@')) {
          throw new Error('Please enter a valid UPI ID (e.g. yourname@okhdfcbank).');
        }
        payoutDetails = {
          method: 'UPI',
          upiId: upiId.trim(),
        };
      }

      const res = await api.createBuybackRequest({
        orderId,
        orderItemId,
        conditionChecklist: {
          bootsToOs,
          motherboardWorking,
          displayIntact,
          originalCharger,
          batteryHealthPercent,
        },
        payoutDetails,
      });

      onSuccess(res.requestNumber || 'LM-BB-XXXXXX');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit buyback claim. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="buyback-modal-title"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="buyback-modal-title" className="text-sm font-bold text-slate-900">
                Lifetime Buyback Guarantee
              </h2>
              <p className="text-[11px] text-slate-500">
                Order #{orderNumber} • Step {step} of 3
              </p>
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

        {/* STEP 1: CONDITION CHECKLIST */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-900">{productName}</p>
              <p className="text-[11px] text-slate-500">
                Device Age: {deviceAgeMonths} {deviceAgeMonths === 1 ? 'month' : 'months'} from delivery • Assured Rate: {initialTierPercent}%
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Functional Verification Checklist
              </p>

              <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50/50 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={bootsToOs}
                  onChange={(e) => setBootsToOs(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-700">Laptop powers on normally and boots into the operating system</span>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50/50 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={motherboardWorking}
                  onChange={(e) => setMotherboardWorking(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-700">Motherboard is functional with no liquid damage or major board-level defects</span>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50/50 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={displayIntact}
                  onChange={(e) => setDisplayIntact(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-700">Display screen is intact with no cracks, bleeding, or dead lines</span>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50/50 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={originalCharger}
                  onChange={(e) => setOriginalCharger(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-700">Original OEM functional power adapter / charger is included</span>
              </label>

              <div className="pt-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Battery Health Percentage</span>
                  <span className="font-mono text-blue-700 font-bold">{batteryHealthPercent}%</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={batteryHealthPercent}
                  onChange={(e) => setBatteryHealthPercent(Number(e.target.value))}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Minimum 70% required for standard guaranteed valuation.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStep1Next}
                disabled={!isChecklistValid}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
              >
                Calculate Valuation
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: INSTANT QUOTE BREAKDOWN */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-emerald-50/60 border border-emerald-200 p-5 text-center space-y-1">
              <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
                Assured Buyback Value
              </p>
              <p className="text-3xl font-extrabold text-emerald-950 font-mono">
                {formatIndianRupees(netPayout)}
              </p>
              <p className="text-[11px] text-emerald-700 font-medium">
                Guaranteed quote valid for 15 days upon acceptance
              </p>
            </div>

            <div className="divide-y divide-slate-100 text-xs">
              <div className="py-2.5 flex items-center justify-between text-slate-600">
                <span>Original Invoice Price</span>
                <span className="font-semibold text-slate-900">{formatIndianRupees(unitPrice)}</span>
              </div>
              <div className="py-2.5 flex items-center justify-between text-slate-600">
                <span>Ownership Age</span>
                <span className="font-semibold text-slate-900">
                  {deviceAgeMonths} {deviceAgeMonths === 1 ? 'Month' : 'Months'}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between text-slate-600">
                <span>Assured Buyback Tier</span>
                <span className="font-semibold text-emerald-700">{initialTierPercent}% of invoice</span>
              </div>
              <div className="py-2.5 flex items-center justify-between text-slate-600">
                <span>Doorstep Pickup & Diagnostics</span>
                <span className="font-semibold text-emerald-700">Free (₹0)</span>
              </div>
              <div className="py-2.5 flex items-center justify-between text-slate-900 font-bold text-sm">
                <span>Net Transfer Amount</span>
                <span className="text-emerald-700">{formatIndianRupees(netPayout)}</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px] text-slate-600 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                Our logistics partner will collect the laptop from your doorstep. If physical inspection at our hub reveals minor undisclosed issues, you will receive a revised offer. If you decline it, the laptop is returned to you free of charge.
              </span>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1 px-3 py-2 text-slate-600 hover:text-slate-900 text-xs font-semibold"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
              <button
                type="button"
                onClick={handleStep2Next}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition"
              >
                Proceed to Payout Details
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: PAYOUT DETAILS */}
        {step === 3 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setPayoutMethod('BANK_TRANSFER')}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  payoutMethod === 'BANK_TRANSFER' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                }`}
              >
                Bank Account
              </button>
              <button
                type="button"
                onClick={() => setPayoutMethod('UPI')}
                className={`flex-1 py-1.5 rounded-lg transition ${
                  payoutMethod === 'UPI' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                }`}
              >
                UPI ID (Instant)
              </button>
            </div>

            {payoutMethod === 'BANK_TRANSFER' ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Account Holder Name
                  </label>
                  <input
                    type="text"
                    required
                    value={accountHolderName}
                    onChange={(e) => setAccountHolderName(e.target.value)}
                    placeholder="Full name as in bank passbook"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bank Account Number
                  </label>
                  <input
                    type="text"
                    required
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="e.g. 123456789012"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm Bank Account Number
                  </label>
                  <input
                    type="text"
                    required
                    value={confirmAccountNumber}
                    onChange={(e) => setConfirmAccountNumber(e.target.value)}
                    placeholder="Re-enter bank account number"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    required
                    maxLength={11}
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                    placeholder="e.g. HDFC0001234"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-mono uppercase"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">UPI ID (VPA)</label>
                <input
                  type="text"
                  required
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. yourname@okhdfcbank"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-600 font-mono"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Ensure the UPI ID belongs to the account holder. Funds are credited immediately upon inspection clearance.
                </p>
              </div>
            )}

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px] text-slate-500">
              Doorstep pickup will be arranged at your registered delivery address. Payout details are encrypted in our vault and processed securely.
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={loading}
                className="inline-flex items-center gap-1 px-3 py-2 text-slate-600 hover:text-slate-900 text-xs font-semibold"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition disabled:opacity-50"
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {loading ? 'Submitting Claim...' : `Confirm & Claim ${formatIndianRupees(netPayout)}`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
