'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CustomerLayout from '../../components/CustomerLayout';
import { useCart } from '../../lib/cart-context';
import { useAuth } from '../../lib/auth-context';
import { api } from '../../lib/api';
import { Order } from '../../lib/types';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, itemCount, clearCart } = useCart();
  const { user } = useAuth();

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: 'Maharashtra',
    pincode: '',
    notes: '',
  });

  // Discount & Referral State
  const [discountCodeInput, setDiscountCodeInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    amount: number;
    message: string;
    type: string;
  } | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);

  // Payment & Order Status
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'cod'>('razorpay');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  // Autofill user information if logged in
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        fullName: prev.fullName || user.name || '',
        email: prev.email || user.email || '',
        phone: prev.phone || user.phone || '',
        address: prev.address || user.address || '',
        city: prev.city || user.city || '',
        state: prev.state || user.state || 'Maharashtra',
        pincode: prev.pincode || user.pincode || '',
      }));
    }
  }, [user]);

  // Load Razorpay Script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleApplyDiscount = () => {
    setDiscountError(null);
    if (!discountCodeInput.trim()) return;

    const res = api.validateDiscount(discountCodeInput, subtotal);
    if (res.valid) {
      setAppliedDiscount({
        code: discountCodeInput.trim().toUpperCase(),
        amount: res.discountAmount,
        message: res.message,
        type: discountCodeInput.toUpperCase().startsWith('MITRA') ? 'referral' : 'coupon',
      });
      setDiscountCodeInput('');
    } else {
      setDiscountError(res.message);
    }
  };

  const removeDiscount = () => {
    setAppliedDiscount(null);
    setDiscountError(null);
  };

  const finalAmount = Math.max(0, subtotal - (appliedDiscount?.amount || 0));

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phone || !formData.address || !formData.pincode) {
      alert('Please fill in all mandatory shipping address fields');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Create order on backend
      const orderPayload = {
        discountCode: appliedDiscount?.type === 'coupon' ? appliedDiscount.code : undefined,
        referralCode: appliedDiscount?.type === 'referral' ? appliedDiscount.code : undefined,
        shippingAddress: {
          fullName: formData.fullName,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
        },
        phone: formData.phone,
        notes: formData.notes,
      };

      const order = await api.createOrder(orderPayload);

      // 2. If Razorpay selected, initialize payment modal
      if (paymentMethod === 'razorpay') {
        const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_S3KeoVspM7qt2w';

        const rzpOrder = await api.createRazorpayOrder(finalAmount, order.id);

        if (typeof window !== 'undefined' && window.Razorpay) {
          const options = {
            key: razorpayKey,
            amount: rzpOrder.amount || Math.round(finalAmount * 100),
            currency: 'INR',
            name: 'LaptopMitra',
            description: `Order ${order.orderNumber} - Certified Refurbished Laptop`,
            order_id: rzpOrder.id.startsWith('order_mock_') ? undefined : rzpOrder.id,
            image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=200&q=80',
            prefill: {
              name: formData.fullName,
              email: formData.email,
              contact: formData.phone,
            },
            theme: {
              color: '#1D6FF2',
            },
            handler: function () {
              clearCart();
              setCompletedOrder(order);
              setIsSubmitting(false);
            },
            modal: {
              ondismiss: function () {
                setIsSubmitting(false);
                clearCart();
                setCompletedOrder(order);
              },
            },
          };

          const rzp = new window.Razorpay(options);
          rzp.open();
        } else {
          // Fallback if Razorpay SDK script blocked
          clearCart();
          setCompletedOrder(order);
          setIsSubmitting(false);
        }
      } else {
        // COD order
        clearCart();
        setCompletedOrder(order);
        setIsSubmitting(false);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to complete order. Please try again.');
      setIsSubmitting(false);
    }
  };

  // ORDER SUCCESS CONFIRMATION SCREEN
  if (completedOrder) {
    return (
      <CustomerLayout>
        <div className="bg-[#F5F7FA] min-h-[75vh] py-16 px-4">
          <div className="max-w-2xl mx-auto text-center space-y-6 bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-sm">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl mx-auto animate-bounce">
              ✓
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#0B1F4B]">
              Order Confirmed Successfully!
            </h1>
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              Thank you for choosing LaptopMitra. Our refurbishment lab is preparing your laptop for final dispatch with an authentic 1-year warranty certificate.
            </p>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 text-left max-w-lg mx-auto space-y-3">
              <div className="flex justify-between text-xs pb-2.5 border-b border-slate-200">
                <span className="text-slate-500">Order Number</span>
                <span className="font-mono font-bold text-slate-900">{completedOrder.orderNumber}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Estimated Delivery</span>
                <span className="font-bold text-emerald-700">2-3 Business Days (Express Inspected)</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Shipping To</span>
                <span className="font-medium text-slate-800">
                  {completedOrder.shippingAddress?.fullName}, {completedOrder.shippingAddress?.city}
                </span>
              </div>
              <div className="flex justify-between text-xs pt-2.5 border-t border-slate-200">
                <span className="font-bold text-slate-900">Total Paid</span>
                <span className="font-black text-[#1D6FF2] text-sm">
                  ₹{Number(completedOrder.finalAmount).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
              <Link
                href="/profile"
                className="px-6 py-3 bg-[#1D6FF2] text-white font-bold rounded-xl text-xs hover:bg-[#1558C0] transition-colors shadow-md shadow-blue-500/20"
              >
                Track Order & Warranty
              </Link>
              <Link
                href="/products"
                className="px-6 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200 transition-colors"
              >
                Continue Browsing
              </Link>
            </div>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  // If cart is empty and no completed order, redirect
  if (itemCount === 0) {
    return (
      <CustomerLayout>
        <div className="bg-[#F5F7FA] min-h-[60vh] flex items-center justify-center py-16 px-4">
          <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 text-center space-y-4">
            <h2 className="text-xl font-bold text-[#0B1F4B]">Your cart is empty</h2>
            <p className="text-xs text-slate-500">Add a laptop to your cart before proceeding to checkout.</p>
            <Link
              href="/products"
              className="inline-block px-5 py-2.5 bg-[#1D6FF2] text-white font-bold rounded-xl text-xs"
            >
              Browse Certified Laptops
            </Link>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <div className="bg-[#F5F7FA] min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F4B]">
              Checkout & Delivery
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your shipping details and select your preferred payment mode.
            </p>
          </div>

          <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* LEFT: SHIPPING ADDRESS & PAYMENT METHOD */}
            <div className="lg:col-span-7 space-y-6">
              {/* Step 1: Shipping Address */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <span className="w-6 h-6 rounded-full bg-[#1D6FF2] text-white text-xs font-bold flex items-center justify-center">
                    1
                  </span>
                  <h3 className="font-bold text-base text-[#0B1F4B]">
                    Shipping & Contact Details
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      required
                      value={formData.fullName}
                      onChange={handleFormChange}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1D6FF2] focus:bg-white text-slate-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Phone Number (WhatsApp/SMS) *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      required
                      value={formData.phone}
                      onChange={handleFormChange}
                      placeholder="10-digit mobile number"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1D6FF2] focus:bg-white text-slate-800 outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      Email Address (For Tax Invoice & Warranty Certificate) *
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleFormChange}
                      placeholder="you@example.com"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1D6FF2] focus:bg-white text-slate-800 outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">
                      Delivery Address (House/Flat No, Street, Landmark) *
                    </label>
                    <input
                      type="text"
                      name="address"
                      required
                      value={formData.address}
                      onChange={handleFormChange}
                      placeholder="e.g. Flat 402, Sunshine Heights, MG Road"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1D6FF2] focus:bg-white text-slate-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      name="city"
                      required
                      value={formData.city}
                      onChange={handleFormChange}
                      placeholder="e.g. Mumbai / Bangalore / Pune"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1D6FF2] focus:bg-white text-slate-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      PIN Code *
                    </label>
                    <input
                      type="text"
                      name="pincode"
                      required
                      maxLength={6}
                      value={formData.pincode}
                      onChange={handleFormChange}
                      placeholder="6-digit PIN code"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#1D6FF2] focus:bg-white text-slate-800 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Payment Method */}
              <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-4">
                <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                  <span className="w-6 h-6 rounded-full bg-[#1D6FF2] text-white text-xs font-bold flex items-center justify-center">
                    2
                  </span>
                  <h3 className="font-bold text-base text-[#0B1F4B]">
                    Select Payment Method
                  </h3>
                </div>

                <div className="space-y-3">
                  {/* Razorpay Option */}
                  <label
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      paymentMethod === 'razorpay'
                        ? 'border-[#1D6FF2] bg-blue-50/50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="razorpay"
                      checked={paymentMethod === 'razorpay'}
                      onChange={() => setPaymentMethod('razorpay')}
                      className="mt-1 text-[#1D6FF2] focus:ring-[#1D6FF2]"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs sm:text-sm text-slate-900">
                          Razorpay Secure Checkout (UPI, GPay, PhonePe, Cards, NetBanking, EMI)
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-100 text-[#1D6FF2]">
                          RECOMMENDED
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Instant payment processing with zero transaction fees. Instant 1-Year warranty certificate issue.
                      </p>
                    </div>
                  </label>

                  {/* COD Option */}
                  <label
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      paymentMethod === 'cod'
                        ? 'border-[#1D6FF2] bg-blue-50/50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={paymentMethod === 'cod'}
                      onChange={() => setPaymentMethod('cod')}
                      className="mt-1 text-[#1D6FF2] focus:ring-[#1D6FF2]"
                    />
                    <div className="flex-1">
                      <span className="font-bold text-xs sm:text-sm text-slate-900">
                        Cash on Delivery (Pay upon Open-Box Inspection)
                      </span>
                      <p className="text-xs text-slate-500 mt-1">
                        Inspect the laptop physically at your doorstep before handing payment to the delivery courier.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* RIGHT: ORDER SUMMARY & DISCOUNT CODE */}
            <div className="lg:col-span-5 space-y-4">
              <div className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-md space-y-5">
                <h3 className="font-bold text-base text-[#0B1F4B] pb-3 border-b border-slate-100">
                  Order Review ({itemCount} {itemCount === 1 ? 'item' : 'items'})
                </h3>

                {/* Items summary */}
                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {items.map((item) => (
                    <div key={item.productId} className="flex items-center justify-between text-xs">
                      <div className="flex-1 pr-2">
                        <p className="font-bold text-slate-800 line-clamp-1">{item.product?.name}</p>
                        <span className="text-slate-400">Qty: {item.quantity}</span>
                      </div>
                      <span className="font-bold text-slate-900">
                        ₹{(Number(item.priceAtAdd) * item.quantity).toLocaleString('en-IN')}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Coupon / Referral Code Box */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    🎁 Have a Coupon or Mitra Referral Code?
                  </label>
                  {appliedDiscount ? (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-emerald-800">
                          {appliedDiscount.code}
                        </span>
                        <p className="text-[11px] text-emerald-600">{appliedDiscount.message}</p>
                      </div>
                      <button
                        type="button"
                        onClick={removeDiscount}
                        className="text-xs text-rose-600 font-bold hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={discountCodeInput}
                        onChange={(e) => setDiscountCodeInput(e.target.value)}
                        placeholder="e.g. MITRA500"
                        className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg uppercase tracking-wider font-mono outline-none focus:ring-2 focus:ring-[#1D6FF2] focus:bg-white text-slate-800"
                      />
                      <button
                        type="button"
                        onClick={handleApplyDiscount}
                        className="px-4 py-2 bg-[#0B1F4B] hover:bg-[#162D66] text-white text-xs font-bold rounded-lg transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                  {discountError && (
                    <p className="text-xs text-rose-600 font-medium">{discountError}</p>
                  )}
                </div>

                {/* Cost Calculations */}
                <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-semibold text-slate-900">₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  {appliedDiscount && (
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>Discount ({appliedDiscount.code})</span>
                      <span>-₹{appliedDiscount.amount.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>Inspected Doorstep Delivery</span>
                    <span className="text-emerald-700 font-bold">FREE</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>1-Year Doorstep Warranty</span>
                    <span className="text-emerald-700 font-bold">FREE</span>
                  </div>
                </div>

                {/* Total */}
                <div className="pt-3 border-t border-slate-100 flex items-baseline justify-between">
                  <span className="text-sm font-extrabold text-[#0B1F4B]">Amount Payable</span>
                  <span className="text-2xl font-black text-[#1D6FF2]">
                    ₹{finalAmount.toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Place Order CTA */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 bg-[#1D6FF2] hover:bg-[#1558C0] disabled:bg-slate-300 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all text-xs flex items-center justify-center gap-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                >
                  {isSubmitting ? (
                    <span>Processing Secure Checkout...</span>
                  ) : (
                    <>
                      <span>Confirm &amp; Pay ₹{finalAmount.toLocaleString('en-IN')}</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </button>

                <div className="text-center text-[10px] text-slate-400">
                  🛡️ Backed by LaptopMitra 100% Satisfaction &amp; 7-Day Replacement Guarantee
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </CustomerLayout>
  );
}
