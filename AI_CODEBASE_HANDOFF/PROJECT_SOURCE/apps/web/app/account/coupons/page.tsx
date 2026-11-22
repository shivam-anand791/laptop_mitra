'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import {
  Tag,
  Copy,
  Check,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  ShoppingBag,
  Clock,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';

export default function MyCouponsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'PUBLIC' | 'EXCLUSIVE'>('ALL');
  const [expandedTerms, setExpandedTerms] = useState<Record<string, boolean>>({});

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Calling getAvailableCoupons with empty items retrieves all active customer coupons
      const res = await api.getAvailableCoupons({ items: [] });
      const combined = [...(res?.eligible || []), ...(res?.ineligible || [])];
      // Deduplicate by id or code
      const seen = new Set<string>();
      const unique = combined.filter((c) => {
        const key = c.id || c.code;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setCoupons(unique);
    } catch (err: any) {
      setError(err?.message || 'Could not load your coupons. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCoupons();
  }, [loadCoupons]);

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode((prev) => (prev === code ? null : prev));
    }, 2500);
  };

  const toggleTerms = (id: string) => {
    setExpandedTerms((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const filteredCoupons = coupons.filter((coupon) => {
    if (filter === 'EXCLUSIVE') {
      return coupon.visibility === 'TARGETED';
    }
    if (filter === 'PUBLIC') {
      return coupon.visibility === 'PUBLIC' || !coupon.visibility;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#0B1F4B] to-[#1D6FF2] rounded-3xl p-6 sm:p-8 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-white/10 rounded-xl">
              <Tag className="w-5 h-5 text-white" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-200">
              Rewards &amp; Discounts
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            My Coupons &amp; Offers
          </h1>
          <p className="text-xs sm:text-sm text-blue-100/90 leading-relaxed">
            Copy any promo code and apply it during checkout to save instantly on certified laptops.
          </p>
        </div>

        <Link
          href="/products"
          className="self-start sm:self-auto px-5 py-2.5 rounded-xl bg-white text-[#0B1F4B] hover:bg-blue-50 font-bold text-xs flex items-center gap-2 shadow-sm transition-all shrink-0 cursor-pointer"
        >
          <ShoppingBag className="w-4 h-4 text-[#1D6FF2]" />
          <span>Shop Laptops</span>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setFilter('ALL')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            filter === 'ALL'
              ? 'bg-[#0B1F4B] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          All Offers ({coupons.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('PUBLIC')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            filter === 'PUBLIC'
              ? 'bg-[#0B1F4B] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Public Deals
        </button>
        <button
          type="button"
          onClick={() => setFilter('EXCLUSIVE')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
            filter === 'EXCLUSIVE'
              ? 'bg-[#0B1F4B] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Exclusive for You
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="bg-white rounded-3xl p-6 border border-slate-200 animate-pulse space-y-4"
            >
              <div className="h-6 bg-slate-100 rounded-lg w-1/3" />
              <div className="h-4 bg-slate-100 rounded-lg w-3/4" />
              <div className="h-10 bg-slate-100 rounded-xl w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-3xl text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <p className="text-xs text-rose-800 font-medium">{error}</p>
          <button
            type="button"
            onClick={loadCoupons}
            className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredCoupons.length === 0 && (
        <div className="p-12 bg-white border border-slate-200 rounded-3xl text-center space-y-4">
          <div className="w-14 h-14 bg-blue-50 text-[#1D6FF2] rounded-2xl flex items-center justify-center mx-auto">
            <Tag className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">No Offers Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Check back soon for new promotions, seasonal discounts, and voucher drops.
            </p>
          </div>
          <Link
            href="/products"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1D6FF2] text-white rounded-xl text-xs font-bold hover:bg-blue-600 transition-colors"
          >
            <span>Explore All Certified Laptops</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Coupons Voucher Grid */}
      {!loading && !error && filteredCoupons.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCoupons.map((coupon) => {
            const isCopied = copiedCode === coupon.code;
            const termsOpen = expandedTerms[coupon.id || coupon.code] || false;
            const discountLabel =
              coupon.badgeText ||
              (coupon.type === 'percentage'
                ? `${coupon.value}% OFF`
                : `₹${Number(coupon.value).toLocaleString('en-IN')} OFF`);

            return (
              <div
                key={coupon.id || coupon.code}
                className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between hover:border-blue-200 transition-all group"
              >
                {/* Top Section */}
                <div className="p-5 sm:p-6 space-y-4">
                  {/* Badge & Expiry row */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-50 text-[#1D6FF2] border border-blue-200">
                      <Sparkles className="w-3 h-3 text-[#1D6FF2]" />
                      <span>{discountLabel}</span>
                    </span>

                    {coupon.validUntil ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>
                          Valid till {new Date(coupon.validUntil).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        No Expiry
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-1">
                    <h2 className="text-base font-bold text-slate-900 group-hover:text-[#1D6FF2] transition-colors">
                      {coupon.title || coupon.code}
                    </h2>
                    {coupon.description && (
                      <p className="text-xs text-slate-600 line-clamp-2">
                        {coupon.description}
                      </p>
                    )}
                  </div>

                  {/* Applicability Conditions Tags */}
                  <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500">
                    {coupon.minOrderValue && coupon.minOrderValue > 0 && (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-medium text-slate-700">
                        Min. Order ₹{coupon.minOrderValue.toLocaleString('en-IN')}
                      </span>
                    )}
                    {coupon.maxDiscountCap && (
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-medium text-slate-700">
                        Max Savings ₹{coupon.maxDiscountCap.toLocaleString('en-IN')}
                      </span>
                    )}
                    {coupon.allowedPaymentMethods && coupon.allowedPaymentMethods !== 'ANY' && (
                      <span className="px-2.5 py-1 rounded-lg bg-blue-50 font-medium text-blue-700 border border-blue-100">
                        {coupon.allowedPaymentMethods === 'ONLINE_ONLY' || coupon.allowedPaymentMethods === 'PREPAID'
                          ? 'Prepaid Online Only'
                          : 'COD Only'}
                      </span>
                    )}
                    {coupon.firstOrderOnly && (
                      <span className="px-2.5 py-1 rounded-lg bg-purple-50 font-medium text-purple-700 border border-purple-100">
                        First Order Only
                      </span>
                    )}
                  </div>

                  {/* Code Box with Copy Button */}
                  <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-50 border border-dashed border-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm tracking-widest text-[#0B1F4B] px-2 py-0.5">
                        {coupon.code}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => copyToClipboard(coupon.code)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        isCopied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-white hover:bg-slate-100 text-[#0B1F4B] border border-slate-200'
                      }`}
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Code</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Terms & Conditions Toggle */}
                {coupon.terms && (
                  <div className="border-t border-slate-100 px-5 sm:px-6 py-2.5 bg-slate-50/50">
                    <button
                      type="button"
                      onClick={() => toggleTerms(coupon.id || coupon.code)}
                      className="w-full flex items-center justify-between text-[11px] font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      <span>Terms &amp; Conditions</span>
                      {termsOpen ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                    {termsOpen && (
                      <p className="mt-2 text-[11px] text-slate-600 leading-relaxed pt-2 border-t border-slate-200">
                        {coupon.terms}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

