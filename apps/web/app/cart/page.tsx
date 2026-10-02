'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import CustomerLayout from '../../components/CustomerLayout';
import { useCart } from '../../lib/cart-context';

export default function CartPage() {
  const { items, itemCount, subtotal, updateQuantity, removeItem, clearCart } = useCart();
  const [pincode, setPincode] = useState('');
  const [pincodeStatus, setPincodeStatus] = useState<string | null>(null);

  const checkPincode = (e: React.FormEvent) => {
    e.preventDefault();
    if (/^\d{6}$/.test(pincode.trim())) {
      setPincodeStatus('✓ Express Delivery Available (Estimated: 2-3 business days across India)');
    } else {
      setPincodeStatus('⚠️ Please enter a valid 6-digit Indian postal PIN code');
    }
  };

  if (itemCount === 0) {
    return (
      <CustomerLayout>
        <div className="bg-[#F5F7FA] min-h-[70vh] flex items-center justify-center py-16 px-4">
          <div className="max-w-md w-full text-center space-y-5 bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-sm">
            <div className="w-20 h-20 rounded-2xl bg-blue-50 text-[#1D6FF2] flex items-center justify-center text-3xl mx-auto shadow-inner">
              🛒
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F4B]">
              Your Cart is Empty
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed">
              Explore our verified inventory of refurbished business laptops—MacBooks, ThinkPads, and EliteBooks—all backed by a 1-year warranty.
            </p>
            <div className="pt-2">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#1D6FF2] hover:bg-[#1558C0] text-white font-bold rounded-xl shadow-md shadow-blue-500/20 transition-transform hover:scale-[1.02] text-xs"
              >
                <span>Browse Certified Laptops</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="bg-[#F5F7FA] min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="flex items-center justify-between pb-5 border-b border-slate-200 mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F4B]">
                Shopping Cart
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                You have {itemCount} {itemCount === 1 ? 'laptop' : 'laptops'} ready for dispatch
              </p>
            </div>
            <button
              onClick={clearCart}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline transition-colors"
            >
              Clear Cart
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* ITEMS LIST */}
            <div className="lg:col-span-8 space-y-4">
              {items.map((item) => {
                const unitPrice = Number(item.priceAtAdd);
                const itemTotal = unitPrice * item.quantity;
                const imgUrl =
                  item.product?.images?.find((i) => i.isPrimary)?.url ||
                  item.product?.images?.[0]?.url ||
                  'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=400&q=80';

                return (
                  <div
                    key={item.productId}
                    className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all hover:border-slate-300"
                  >
                    {/* Thumbnail */}
                    <Link
                      href={`/products/${item.productId}`}
                      className="shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 flex items-center justify-center p-2"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imgUrl} alt={item.product?.name || 'Laptop'} className="w-full h-full object-contain" />
                    </Link>

                    {/* Info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-[#1D6FF2] border border-blue-200">
                          Refurb
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          Grade A+ Inspected
                        </span>
                      </div>
                      <Link href={`/products/${item.productId}`} className="block">
                        <h3 className="font-extrabold text-sm sm:text-base text-slate-900 line-clamp-1 hover:text-[#1D6FF2] transition-colors">
                          {item.product?.name || 'Certified Laptop'}
                        </h3>
                      </Link>
                      <p className="text-xs text-slate-400 font-mono">
                        SKU: {item.product?.sku || 'LM-SKU'}
                      </p>

                      <div className="flex items-center gap-2 pt-1 text-xs text-slate-600">
                        <span>Unit: <strong>₹{unitPrice.toLocaleString('en-IN')}</strong></span>
                        <span className="text-slate-300">•</span>
                        <span className="text-emerald-700 font-medium">1-Yr Warranty Included</span>
                      </div>
                    </div>

                    {/* Quantity Stepper & Subtotal */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="text-base sm:text-lg font-black text-[#0B1F4B]">
                        ₹{itemTotal.toLocaleString('en-IN')}
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-slate-50">
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                            className="px-2.5 py-1 text-xs font-bold hover:bg-slate-200 text-slate-700 transition-colors"
                          >
                            -
                          </button>
                          <span className="px-2 py-1 text-xs font-bold min-w-[28px] text-center text-slate-900">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            className="px-2.5 py-1 text-xs font-bold hover:bg-slate-200 text-slate-700 transition-colors"
                          >
                            +
                          </button>
                        </div>

                        <button
                          onClick={() => removeItem(item.productId)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Remove item"
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

              {/* Pincode Checker */}
              <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-2.5">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span>🚚</span> Check Express Delivery Availability:
                </span>
                <form onSubmit={checkPincode} className="flex gap-2 max-w-sm">
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="Enter 6-digit Pincode"
                    maxLength={6}
                    className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1D6FF2] focus:bg-white text-slate-800"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#0B1F4B] hover:bg-[#162D66] text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                  >
                    Check
                  </button>
                </form>
                {pincodeStatus && (
                  <p className={`text-xs font-semibold ${pincodeStatus.startsWith('✓') ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {pincodeStatus}
                  </p>
                )}
              </div>
            </div>

            {/* ORDER SUMMARY SIDEBAR */}
            <div className="lg:col-span-4 space-y-4">
              <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-md space-y-4">
                <h2 className="text-base font-extrabold text-[#0B1F4B] pb-3 border-b border-slate-100">
                  Order Summary
                </h2>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
                    <span className="font-bold text-slate-900">
                      ₹{subtotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Inspected Doorstep Delivery</span>
                    <span className="font-bold text-emerald-700">FREE</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>1-Year Doorstep Warranty</span>
                    <span className="font-bold text-emerald-700">FREE</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>GST (18% Included)</span>
                    <span className="text-slate-400">Included in price</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-baseline justify-between">
                  <div>
                    <span className="text-sm font-extrabold text-[#0B1F4B]">Estimated Total</span>
                    <p className="text-[10px] text-slate-400">Coupon applied at next step</p>
                  </div>
                  <div className="text-2xl font-black text-[#1D6FF2]">
                    ₹{subtotal.toLocaleString('en-IN')}
                  </div>
                </div>

                {/* Promo Hint */}
                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-slate-700 leading-relaxed">
                  💡 <strong>Tip:</strong> Have a coupon or Mitra referral code? Apply <span className="font-mono font-bold text-[#1D6FF2]">MITRA500</span> at checkout for ₹500 off!
                </div>

                {/* Checkout CTA */}
                <Link
                  href="/checkout"
                  className="w-full py-3.5 bg-[#1D6FF2] hover:bg-[#1558C0] text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 text-center text-xs"
                >
                  <span>Proceed to Secure Checkout</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>

                <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 pt-1">
                  <span>🔒 256-Bit SSL Encrypted</span>
                  <span>•</span>
                  <span>Razorpay Verified</span>
                  <span>•</span>
                  <span>7-Day Returns</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
