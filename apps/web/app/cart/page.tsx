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
      setPincodeStatus('✓ Express Delivery Available (Estimated: 2-3 business days)');
    } else {
      setPincodeStatus('⚠️ Please enter a valid 6-digit Indian PIN code');
    }
  };

  if (itemCount === 0) {
    return (
      <CustomerLayout>
        <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-6">
          <div className="w-24 h-24 rounded-3xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-4xl mx-auto shadow-inner">
            🛒
          </div>
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white">
            Your Shopping Cart is Empty
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
            Looks like you haven&apos;t added any certified refurbished laptops to your cart yet. Explore our curated inventory of MacBooks, ThinkPads, and Gaming rigs!
          </p>
          <div className="pt-2">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-transform hover:scale-105 text-sm"
            >
              <span>Explore Verified Laptops</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-6 border-b border-zinc-200 dark:border-zinc-800 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">
              Shopping Cart
            </h1>
            <p className="text-xs text-zinc-500 mt-1">
              You have {itemCount} {itemCount === 1 ? 'laptop' : 'laptops'} in your cart
            </p>
          </div>
          <button
            onClick={clearCart}
            className="text-xs font-semibold text-rose-600 hover:underline"
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
              const imgUrl = item.product?.images?.find(i => i.isPrimary)?.url || item.product?.images?.[0]?.url || 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=400&q=80';

              return (
                <div
                  key={item.productId}
                  className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
                >
                  {/* Thumbnail */}
                  <Link href={`/products/${item.productId}`} className="shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imgUrl} alt={item.product?.name || 'Laptop'} className="w-full h-full object-cover" />
                  </Link>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                      Grade A+ Inspected
                    </span>
                    <Link href={`/products/${item.productId}`} className="block">
                      <h3 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-zinc-100 line-clamp-1 hover:text-blue-600">
                        {item.product?.name || 'Certified Laptop'}
                      </h3>
                    </Link>
                    <p className="text-xs text-zinc-500 font-mono">
                      SKU: {item.product?.sku || 'LM-SKU'}
                    </p>

                    <div className="flex items-center gap-2 pt-1 text-xs text-zinc-600 dark:text-zinc-400">
                      <span>Unit: ₹{unitPrice.toLocaleString('en-IN')}</span>
                      <span>•</span>
                      <span className="text-emerald-600 font-medium">1-Yr Warranty Included</span>
                    </div>
                  </div>

                  {/* Quantity Stepper & Subtotal */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800">
                    <div className="text-base sm:text-lg font-black text-zinc-900 dark:text-white">
                      ₹{itemTotal.toLocaleString('en-IN')}
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden bg-zinc-50 dark:bg-zinc-800">
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                          className="px-2.5 py-1 text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200"
                        >
                          -
                        </button>
                        <span className="px-2 py-1 text-xs font-bold min-w-[24px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                          className="px-2.5 py-1 text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200"
                        >
                          +
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(item.productId)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 transition-colors"
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
            <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                🚚 Check Delivery Speed for Your Area:
              </span>
              <form onSubmit={checkPincode} className="flex gap-2 max-w-sm">
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="Enter 6-digit Pincode"
                  maxLength={6}
                  className="flex-1 px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold rounded-lg"
                >
                  Verify
                </button>
              </form>
              {pincodeStatus && (
                <p className={`text-xs font-medium ${pincodeStatus.startsWith('✓') ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {pincodeStatus}
                </p>
              )}
            </div>
          </div>

          {/* ORDER SUMMARY SIDEBAR */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md space-y-4">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white pb-3 border-b border-zinc-100 dark:border-zinc-800">
                Order Summary
              </h2>

              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                  <span>Subtotal ({itemCount} items)</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    ₹{subtotal.toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                  <span>Inspected Doorstep Delivery</span>
                  <span className="font-semibold text-emerald-600">FREE</span>
                </div>
                <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                  <span>1-Year Comprehensive Warranty</span>
                  <span className="font-semibold text-emerald-600">FREE</span>
                </div>
                <div className="flex justify-between text-zinc-600 dark:text-zinc-400">
                  <span>GST (18% Included)</span>
                  <span className="text-zinc-500 text-xs">Included in price</span>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-baseline justify-between">
                <div>
                  <span className="text-base font-bold text-zinc-900 dark:text-white">Estimated Total</span>
                  <p className="text-[11px] text-zinc-400">Coupon &amp; referral discounts applied at checkout</p>
                </div>
                <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                  ₹{subtotal.toLocaleString('en-IN')}
                </div>
              </div>

              {/* Promo Hint */}
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-xs text-amber-800 dark:text-amber-300">
                💡 <strong>Tip:</strong> Have a coupon or Mitra referral code? Apply <span className="font-mono font-bold underline">MITRA500</span> at the next step for an instant ₹500 discount!
              </div>

              {/* Checkout CTA */}
              <Link
                href="/checkout"
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 text-center text-sm"
              >
                <span>Proceed to Secure Checkout</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>

              <div className="flex items-center justify-center gap-2 text-[11px] text-zinc-400 pt-2">
                <span>🔒 256-Bit SSL Encrypted Checkout</span>
                <span>•</span>
                <span>Razorpay Verified</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
