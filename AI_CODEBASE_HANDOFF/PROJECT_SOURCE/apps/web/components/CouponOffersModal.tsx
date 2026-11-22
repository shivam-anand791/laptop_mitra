'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { formatINR } from '@/lib/format';
import { Tag, Check, ChevronDown, ChevronUp, AlertCircle, X, Sparkles } from 'lucide-react';

export interface CouponOffersModalProps {
  open: boolean;
  onClose: () => void;
  items: Array<{
    productId: string;
    variantId?: string;
    categoryId?: string;
    brandId?: string;
    quantity: number;
    price: number;
    purchaseMode?: 'sell' | 'lease';
    hasWarranty?: boolean;
    warrantyPrice?: number;
  }>;
  appliedCode?: string | null;
  onApplyCoupon: (code: string, result: any) => void;
  referralCode?: string;
  paymentMethod?: string;
}

export function CouponOffersModal({
  open,
  onClose,
  items,
  appliedCode,
  onApplyCoupon,
  referralCode,
  paymentMethod,
}: CouponOffersModalProps) {
  const [manualCode, setManualCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [applyingCode, setApplyingCode] = useState<string | null>(null);
  const [eligibleOffers, setEligibleOffers] = useState<any[]>([]);
  const [ineligibleOffers, setIneligibleOffers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedTermsId, setExpandedTermsId] = useState<string | null>(null);

  // Fetch available offers from backend
  const fetchOffers = useCallback(async () => {
    if (!open || items.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.getAvailableCoupons({
        items,
        referralCode,
        paymentMethod,
      });
      setEligibleOffers(res?.eligible || []);
      setIneligibleOffers(res?.ineligible || []);
    } catch (err: any) {
      setError(err?.message || 'Could not load available offers.');
    } finally {
      setLoading(false);
    }
  }, [open, items, referralCode, paymentMethod]);

  useEffect(() => {
    if (open) {
      setManualCode('');
      setError(null);
      fetchOffers();
    }
  }, [open, fetchOffers]);

  // Apply Coupon via Server Preview
  const handleApply = async (codeToApply: string) => {
    const cleanCode = codeToApply.trim().toUpperCase();
    if (!cleanCode) return;

    setApplyingCode(cleanCode);
    setError(null);
    try {
      const preview = await api.previewCoupon({
        code: cleanCode,
        items,
        referralCode,
        paymentMethod,
      });

      if (preview.valid) {
        onApplyCoupon(cleanCode, preview);
        onClose();
      } else {
        setError(preview.message || 'This coupon code is not eligible.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to apply coupon.');
    } finally {
      setApplyingCode(null);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="offers-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-[#F8FAFC]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-primary flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h3 id="offers-modal-title" className="text-base font-bold text-[#0B1F4B]">
                Coupons & Offers
              </h3>
              <p className="text-xs text-slate-500">Pick an offer or enter a promo code</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Manual Code Input Bar */}
        <div className="p-4 bg-white border-b border-slate-100">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleApply(manualCode);
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => {
                  setManualCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''));
                  setError(null);
                }}
                placeholder="ENTER COUPON CODE"
                maxLength={20}
                className="w-full h-11 px-3 py-2 text-xs font-mono font-bold uppercase rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-primary focus:ring-2 focus:ring-blue-100 focus:outline-none transition-all placeholder:font-sans placeholder:normal-case placeholder:text-slate-400"
              />
            </div>
            <button
              type="submit"
              disabled={!manualCode.trim() || Boolean(applyingCode)}
              className="h-11 px-5 rounded-xl bg-[#0B1F4B] hover:bg-[#162D66] text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shrink-0 flex items-center justify-center shadow-xs"
            >
              {applyingCode === manualCode.trim().toUpperCase() ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Apply'
              )}
            </button>
          </form>

          {error && (
            <div className="mt-2.5 p-2.5 rounded-lg bg-rose-50 border border-rose-100 text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Scrollable Offers List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Checking best available offers for your cart...</p>
            </div>
          ) : eligibleOffers.length === 0 && ineligibleOffers.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Tag className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-800">No active offers right now</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Check back soon or enter a partner promotional voucher above.
              </p>
            </div>
          ) : (
            <>
              {/* Eligible Offers */}
              {eligibleOffers.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Applicable Offers ({eligibleOffers.length})</span>
                  </div>

                  <div className="space-y-3">
                    {eligibleOffers.map((coupon) => {
                      const isApplied = appliedCode?.toUpperCase() === coupon.code.toUpperCase();
                      const isExpanding = expandedTermsId === coupon.id;

                      return (
                        <div
                          key={coupon.id}
                          className={`p-3.5 rounded-xl border transition-all ${
                            isApplied
                              ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-200'
                              : 'bg-white border-slate-200 hover:border-blue-300 shadow-xs'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-md bg-blue-50 text-primary border border-dashed border-blue-300 tracking-wider">
                                  {coupon.code}
                                </span>
                                {coupon.badgeText && (
                                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded uppercase">
                                    {coupon.badgeText}
                                  </span>
                                )}
                              </div>

                              <div className="text-xs font-bold text-emerald-700">
                                Save {formatINR(coupon.savingsAmount)} on this order
                              </div>

                              <p className="text-xs text-slate-600 font-medium">
                                {coupon.title}
                              </p>

                              {coupon.description && (
                                <p className="text-[11px] text-slate-500">
                                  {coupon.description}
                                </p>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleApply(coupon.code)}
                              disabled={isApplied || Boolean(applyingCode)}
                              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer shrink-0 ${
                                isApplied
                                  ? 'bg-emerald-600 text-white cursor-default'
                                  : 'bg-blue-50 hover:bg-primary text-primary hover:text-white border border-blue-200'
                              }`}
                            >
                              {applyingCode === coupon.code ? (
                                <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                              ) : isApplied ? (
                                <span className="flex items-center gap-1">
                                  <Check className="w-3.5 h-3.5" />
                                  Applied
                                </span>
                              ) : (
                                'APPLY'
                              )}
                            </button>
                          </div>

                          {/* Terms & Conditions Expander */}
                          {coupon.terms && (
                            <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px]">
                              <button
                                type="button"
                                onClick={() => setExpandedTermsId(isExpanding ? null : coupon.id)}
                                className="flex items-center gap-1 text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                              >
                                <span>Terms & Conditions</span>
                                {isExpanding ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                              {isExpanding && (
                                <p className="mt-1 text-slate-500 leading-relaxed bg-slate-50 p-2 rounded border border-slate-100">
                                  {coupon.terms}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Ineligible Offers (Unlock More) */}
              {ineligibleOffers.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    More Offers ({ineligibleOffers.length})
                  </div>

                  <div className="space-y-3">
                    {ineligibleOffers.map((coupon) => {
                      const isExpanding = expandedTermsId === coupon.id;

                      return (
                        <div
                          key={coupon.id}
                          className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 opacity-80"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-xs px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-300">
                                  {coupon.code}
                                </span>
                                {coupon.badgeText && (
                                  <span className="text-[10px] font-medium text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded">
                                    {coupon.badgeText}
                                  </span>
                                )}
                              </div>

                              <p className="text-xs font-semibold text-slate-700">
                                {coupon.title}
                              </p>

                              {/* Plain Language Reason to Unlock */}
                              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200/60">
                                <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                                <span>{coupon.reason || 'Not applicable to current cart'}</span>
                              </div>
                            </div>
                          </div>

                          {coupon.terms && (
                            <div className="mt-2.5 pt-2 border-t border-slate-200/60 text-[11px]">
                              <button
                                type="button"
                                onClick={() => setExpandedTermsId(isExpanding ? null : coupon.id)}
                                className="flex items-center gap-1 text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
                              >
                                <span>Terms & Conditions</span>
                                {isExpanding ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                              {isExpanding && (
                                <p className="mt-1 text-slate-500 leading-relaxed bg-white p-2 rounded border border-slate-200">
                                  {coupon.terms}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default CouponOffersModal;

