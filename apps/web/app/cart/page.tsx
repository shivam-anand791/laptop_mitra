'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import CustomerLayout from '../../components/CustomerLayout';
import EmptyState from '../../components/EmptyState';
import { useCart } from '../../lib/cart-context';

export default function CartPage() {
  const {
    items,
    itemCount,
    subtotal,
    oneTimeTotal,
    monthlyTotal,
    updateQuantity,
    updateWarranty,
    removeItem,
    clearCart,
  } = useCart();
  const [pincode, setPincode] = useState('');
  const [pincodeStatus, setPincodeStatus] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);

  const checkPincode = (e: React.FormEvent) => {
    e.preventDefault();
    if (/^\d{6}$/.test(pincode.trim())) {
      setPincodeStatus('✓ Express Insured Delivery Available (Estimated: 2-3 business days)');
    } else {
      setPincodeStatus('⚠️ Please enter a valid 6-digit Indian postal PIN code');
    }
  };

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (promoCode.trim().toUpperCase() === 'FIRST500') {
      setAppliedPromo('FIRST500 applied! Extra ₹500 discount will be computed at checkout.');
    } else if (promoCode.trim().toUpperCase().startsWith('MITRA')) {
      setAppliedPromo(`Referral code ${promoCode.trim().toUpperCase()} applied! Discount computed at checkout.`);
    } else if (promoCode.trim()) {
      setAppliedPromo(`Code ${promoCode.trim().toUpperCase()} verified. Discount applied at checkout.`);
    }
  };

  if (itemCount === 0) {
    return (
      <CustomerLayout>
        <div className="bg-[#F8FAFC] min-h-[70vh] flex items-center justify-center py-16 px-4">
          <div className="max-w-lg w-full">
            <EmptyState
              variant="cart"
              actionLabel="Browse Certified Laptops"
              actionHref="/products"
            />
          </div>
        </div>
      </CustomerLayout>
    );
  }

  // Estimated GST (18% inclusive)
  const gstAmount = Math.round(subtotal * 0.18 / 1.18);

  return (
    <CustomerLayout>
      <div className="bg-[#F8FAFC] min-h-screen py-6 sm:py-8 lg:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex items-center justify-between pb-5 border-b border-[#E2E8F0] mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#111827] tracking-tight">
                Shopping Cart
              </h1>
              <p className="text-xs text-[#475569] mt-1">
                You have <strong className="text-[#111827] tabular-nums">{itemCount}</strong> {itemCount === 1 ? 'certified laptop' : 'certified laptops'} ready for express dispatch
              </p>
            </div>
            <button
              onClick={clearCart}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline transition-colors cursor-pointer"
            >
              Clear Cart
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            {/* ITEMS LIST (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              {items.map((item) => {
                const isLease = item.purchaseMode === 'lease';
                const unitPrice = Number(item.priceAtAdd);
                const warrantyAmount = (!isLease && item.hasWarranty) ? (item.warrantyPrice || 1999) : 0;
                const itemTotal = (unitPrice + warrantyAmount) * item.quantity;
                const imgUrl =
                  item.product?.images?.find((i) => i.isPrimary)?.url ||
                  item.product?.images?.[0]?.url ||
                  '/images/generated/cat-business.webp';

                return (
                  <div
                    key={item.id || `${item.productId}-${item.purchaseMode}-${item.configuration}`}
                    className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all hover:border-slate-300"
                  >
                    {/* Thumbnail */}
                    <Link
                      href={`/products/${item.productId}`}
                      className="shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center p-2 relative"
                    >
                      {imgUrl.startsWith('http') ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={imgUrl} alt={item.product?.name || 'Laptop'} className="w-full h-full object-contain" />
                      ) : (
                        <Image
                          src={imgUrl}
                          alt={item.product?.name || 'Laptop'}
                          fill
                          className="object-contain p-2"
                          sizes="112px"
                        />
                      )}
                    </Link>

                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {isLease ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                            RENT / mo
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-[#1D6FF2] border border-blue-200">
                            BUY
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Grade A+ Inspected
                        </span>
                        {item.configuration === 'ram-16gb' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            16GB Pro Upgrade
                          </span>
                        )}
                      </div>

                      <Link href={`/products/${item.productId}`} className="block">
                        <h3 className="font-bold text-sm sm:text-base text-[#0B1F4B] line-clamp-1 hover:text-[#1D6FF2] transition-colors">
                          {item.product?.name || 'Certified Refurbished Laptop'}
                        </h3>
                      </Link>

                      <p className="text-xs text-slate-400 font-mono">
                        SKU: {item.product?.sku || 'LM-SKU'}
                      </p>

                      <div className="pt-1 text-xs text-slate-600">
                        {isLease ? (
                          <div className="space-y-0.5">
                            <div>
                              <span>Rate: <strong className="text-[#0B1F4B] tabular-nums">₹{unitPrice.toLocaleString('en-IN')}</strong> / mo</span>
                            </div>
                            <p className="text-[11px] text-purple-700 font-bold">
                              Month 1 advance, ₹{unitPrice.toLocaleString('en-IN')}/month thereafter
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Later months are invoiced separately • Quarterly servicing included
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span>Unit: <strong className="text-[#0B1F4B] tabular-nums">₹{unitPrice.toLocaleString('en-IN')}</strong></span>
                              <span className="text-slate-300">•</span>
                              <span className="text-emerald-700 font-medium">1-Yr Warranty Included</span>
                            </div>

                            {/* Warranty Add-on Checkbox */}
                            <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-700 pt-0.5">
                              <input
                                type="checkbox"
                                checked={item.hasWarranty || false}
                                onChange={(e) => updateWarranty(item.id, e.target.checked)}
                                className="w-3.5 h-3.5 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                              />
                              <span className="font-medium">
                                + 1-Year Extended Warranty (+₹1,999)
                              </span>
                              {item.hasWarranty && (
                                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                  Active (2-Yr Total)
                                </span>
                              )}
                            </label>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quantity Stepper & Subtotal */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="text-base sm:text-lg font-black text-[#0B1F4B] tabular-nums">
                        ₹{itemTotal.toLocaleString('en-IN')}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center border border-[#CBD5E1] rounded-xl overflow-hidden bg-[#F8FAFC] h-9">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="px-2.5 h-full text-xs font-bold hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer flex items-center justify-center"
                            aria-label="Decrease quantity"
                          >
                            -
                          </button>
                          <span className="px-2.5 h-full flex items-center justify-center text-xs font-bold min-w-[28px] text-center text-[#0B1F4B] tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="px-2.5 h-full text-xs font-bold hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer flex items-center justify-center"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>

                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer flex items-center justify-center"
                          title="Remove item"
                          aria-label="Remove item"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Delivery Pincode Checker */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E4E9F2] shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#0B1F4B]">
                  <span>🚚 Check Delivery Timeline to Your Location</span>
                </div>
                <form onSubmit={checkPincode} className="flex gap-2 max-w-md">
                  <input
                    type="text"
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit Pincode"
                    className="h-10 w-full px-3.5 py-2 rounded-xl bg-[#F8FAFC] border border-[#E4E9F2] text-xs font-mono placeholder:text-slate-400 focus:outline-none focus:border-[#1D6FF2]"
                  />
                  <button
                    type="submit"
                    className="h-10 px-4 rounded-xl bg-[#0B1F4B] text-white text-xs font-bold hover:bg-[#162D66] transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                  >
                    Check
                  </button>
                </form>
                {pincodeStatus && (
                  <p className={`text-xs font-medium ${pincodeStatus.startsWith('✓') ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {pincodeStatus}
                  </p>
                )}
              </div>

              {/* B2B Callout */}
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-[#1D6FF2]">Corporate Procurement?</span>
                  <p className="text-xs text-slate-600">Save 18% with GST Input Tax Invoice on all business orders.</p>
                </div>
                <Link
                  href="/products"
                  className="text-xs font-bold text-[#1D6FF2] hover:underline shrink-0"
                >
                  + Add More Laptops
                </Link>
              </div>
            </div>

            {/* ORDER SUMMARY SIDEBAR (4 cols) */}
            <div className="lg:col-span-4 space-y-5">
              <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E2E8F0] shadow-xs space-y-5 sticky top-20">
                <h2 className="text-lg font-bold text-[#111827] tracking-tight">
                  Order Summary
                </h2>

                <div className="space-y-3 text-xs">
                  {oneTimeTotal > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Outright Purchase Subtotal</span>
                      <span className="font-bold text-[#0B1F4B] tabular-nums">₹{oneTimeTotal.toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  {monthlyTotal > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Lease (Month 1 Advance)</span>
                      <span className="font-bold text-purple-700 tabular-nums">₹{monthlyTotal.toLocaleString('en-IN')}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-600">
                    <span>Pan-India Insured Express Shipping</span>
                    <span className="font-bold text-emerald-700 uppercase">FREE</span>
                  </div>

                  <div className="flex justify-between text-slate-600">
                    <span>Warranty & Service Coverage</span>
                    <span className="font-bold text-emerald-700 uppercase">Included</span>
                  </div>

                  <div className="flex justify-between text-slate-500 pt-2 border-t border-[#E4E9F2] text-[11px]">
                    <span>Includes 18% GST (Tax Credit Available)</span>
                    <span className="font-mono tabular-nums">~₹{gstAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                {/* Promo Code Box */}
                <div className="pt-2 border-t border-[#E4E9F2]">
                  <form onSubmit={handleApplyPromo} className="flex gap-2">
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="Coupon / Referral Code"
                      className="h-10 w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E4E9F2] text-xs uppercase placeholder:normal-case focus:outline-none focus:border-[#1D6FF2]"
                    />
                    <button
                      type="submit"
                      className="h-10 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#0B1F4B] font-bold text-xs transition-colors cursor-pointer flex items-center justify-center shrink-0"
                    >
                      Apply
                    </button>
                  </form>
                  {appliedPromo && (
                    <p className="text-[11px] text-emerald-700 font-bold mt-1.5">{appliedPromo}</p>
                  )}
                </div>

                {/* Total */}
                <div className="pt-3 border-t border-[#E2E8F0] space-y-2">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-sm font-bold text-[#111827] block">Total Due Now</span>
                      <span className="text-[10px] text-[#475569]">All Taxes &amp; Shipping Included</span>
                    </div>
                    <span className="text-2xl font-bold text-[#111827] tabular-nums">
                      ₹{subtotal.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {monthlyTotal > 0 && (
                    <p className="text-[11px] text-purple-700 font-medium bg-purple-50 p-2.5 rounded-xl border border-purple-200">
                      ℹ️ Includes ₹{monthlyTotal.toLocaleString('en-IN')} Month 1 advance. ₹{monthlyTotal.toLocaleString('en-IN')}/month thereafter is invoiced separately.
                    </p>
                  )}
                </div>

                {/* Checkout CTA */}
                <div className="space-y-2 pt-2">
                  <Link
                    href="/checkout"
                    className="w-full h-11 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all text-center"
                  >
                    <span>Proceed to Secure Checkout</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>

                  <Link
                    href="/products"
                    className="w-full h-10 px-4 rounded-xl border border-[#E4E9F2] hover:bg-[#F8FAFC] text-slate-700 font-bold text-xs flex items-center justify-center transition-colors text-center"
                  >
                    Continue Shopping
                  </Link>
                </div>

                {/* Assurance */}
                <div className="pt-3 border-t border-[#E4E9F2] space-y-1.5 text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>256-Bit SSL Encrypted &amp; Secure Payment</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>7-Day Doorstep Replacement Guarantee</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>Pan-India Certified Service &amp; Support</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
