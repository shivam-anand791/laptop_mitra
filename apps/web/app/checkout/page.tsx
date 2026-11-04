'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import CustomerLayout from '../../components/CustomerLayout';
import { useCart } from '../../lib/cart-context';
import { useAuth } from '../../lib/auth-context';
import { api } from '../../lib/api';
import { Address, CreateAddressDto, Order, PincodeVerificationResult } from '../../lib/types';
import { NEXT_PUBLIC_WHATSAPP_NUMBER } from '../../lib/config';
import { useSupportConfig } from '../../lib/support-config';
import { CouponOffersModal } from '../../components/CouponOffersModal';
import { Tag, Sparkles } from 'lucide-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CheckoutPage() {
  const router = useRouter();
  const { data: supportConfig } = useSupportConfig();
  const { items, subtotal, itemCount, clearCart, isSyncing: cartSyncing, syncError: cartSyncError } = useCart();
  const { user, firebaseUser, isVerificationRequired, isLoading: authLoading, guestLogin } = useAuth();

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: 'Maharashtra',
    pincode: '',
    gstin: '',
    companyName: '',
    notes: '',
  });

  // Discount & Referral State
  const [discountCodeInput, setDiscountCodeInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{
    code: string;
    amount: number;
    message: string;
    type: string;
    badgeText?: string;
    allowedPaymentMethods?: string;
  } | null>(null);
  const [discountError, setDiscountError] = useState<string | null>(null);
  const [isOffersModalOpen, setIsOffersModalOpen] = useState(false);

  const apiItems = items.map((it) => ({
    productId: it.productId,
    variantId: it.variantId || undefined,
    categoryId: it.product?.categoryId || undefined,
    brandId: (it.product?.metadata as any)?.brand || undefined,
    quantity: it.quantity,
    price: Number(it.priceAtAdd),
    purchaseMode: (it.purchaseMode || 'sell') as 'sell' | 'lease',
    hasWarranty: it.hasWarranty,
    warrantyPrice: it.warrantyPrice,
  }));

  // Payment & Order Status
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'cod'>('razorpay');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Pincode Verification & Delhi NCR COD State
  const [pincodeVerification, setPincodeVerification] = useState<PincodeVerificationResult | null>(null);
  const [isVerifyingPincode, setIsVerifyingPincode] = useState(false);
  const [pincodeError, setPincodeError] = useState<string | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [savedAddressesOwnerId, setSavedAddressesOwnerId] = useState<string | null>(null);
  const [savedAddressesLoading, setSavedAddressesLoading] = useState(true);
  const [savedAddressesError, setSavedAddressesError] = useState<string | null>(null);
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<string | null>(null);
  const [addressPickerOpen, setAddressPickerOpen] = useState(true);
  const [saveAddressToAccount, setSaveAddressToAccount] = useState(false);

  const canUseSavedAddresses = !!user && user.role === 'CUSTOMER' && !user.isGuest;
  const hasRentalOrder = items.some((item) => item.purchaseMode === 'lease');
  const hasMixedCart = new Set(items.map((item) => item.purchaseMode === 'lease' ? 'lease' : 'sell')).size > 1;

  useEffect(() => {
    if (hasRentalOrder) {
      setPaymentMethod('razorpay');
      setAppliedDiscount(null);
      setDiscountCodeInput('');
      setDiscountError(null);
    }
  }, [hasRentalOrder]);

  useEffect(() => {
    let active = true;
    if (authLoading) return () => { active = false; };

    if (!canUseSavedAddresses || !user) {
      setSavedAddresses([]);
      setSavedAddressesOwnerId(null);
      setSelectedSavedAddressId(null);
      setSavedAddressesError(null);
      setSavedAddressesLoading(false);
      if (!user) {
        setFormData((prev) => ({
          ...prev,
          fullName: '', email: '', phone: '', address: '', city: '', state: 'Maharashtra', pincode: '',
        }));
      }
      return () => { active = false; };
    }

    const ownerId = user.id;
    setSavedAddressesLoading(true);
    setSavedAddressesError(null);
    setSavedAddresses([]);
    setSavedAddressesOwnerId(null);
    setSelectedSavedAddressId(null);
    setFormData((prev) => ({ ...prev, address: '', city: '', pincode: '' }));

    api.getAddresses()
      .then((addresses) => {
        if (!active) return;
        setSavedAddresses(addresses);
        setSavedAddressesOwnerId(ownerId);
        const preferred = addresses.find((address) => address.isDefault) || addresses[0];
        if (preferred) {
          setSelectedSavedAddressId(preferred.id);
          setFormData((prev) => ({
            ...prev,
            fullName: preferred.fullName || user.name || prev.fullName,
            phone: preferred.phone || user.phone || prev.phone,
            address: preferred.address,
            city: preferred.city || '',
            state: preferred.state || 'Maharashtra',
            pincode: preferred.pincode || '',
            gstin: preferred.gstin || prev.gstin,
          }));
          setAddressPickerOpen(true);
        }
      })
      .catch((error: unknown) => {
        if (active) setSavedAddressesError(error instanceof Error ? error.message : 'Could not load your saved addresses.');
      })
      .finally(() => {
        if (active) setSavedAddressesLoading(false);
      });

    return () => { active = false; };
  }, [authLoading, user?.id, user?.role, user?.isGuest]);

  // Debounced Pincode Verification Effect
  useEffect(() => {
    const cleanPin = formData.pincode?.trim() || '';
    let active = true;
    setPincodeVerification(null);
    setPincodeError(null);

    if (!cleanPin) {
      setIsVerifyingPincode(false);
      return () => { active = false; };
    }

    if (cleanPin.length !== 6 || !/^\d{6}$/.test(cleanPin)) {
      setPincodeVerification(null);
      if (cleanPin.length > 0) {
        setPincodeError('Please enter a valid 6-digit Indian postal PIN code.');
      } else {
        setPincodeError(null);
      }
      setIsVerifyingPincode(false);
      return () => { active = false; };
    }

    const timer = setTimeout(async () => {
      setIsVerifyingPincode(true);
      setPincodeError(null);
      try {
        const result = await api.verifyPincode(cleanPin);
        if (!active) return;
        setPincodeVerification(result);

        if (result.valid && result.serviceable) {
          // Keep the address aligned with the verified PIN code.
          setFormData((prev) => ({
            ...prev,
            city: result.city || prev.city,
            state: result.state || prev.state,
          }));
          // If customer has selected COD but location is outside Delhi NCR, auto-switch to prepaid
          if (!result.isDelhiNcr && paymentMethod === 'cod') {
            setPaymentMethod('razorpay');
          }
        } else if (!result.valid) {
          setPincodeError(result.message || 'Please enter a valid Indian pincode.');
          if (paymentMethod === 'cod') setPaymentMethod('razorpay');
        } else if (!result.serviceable) {
          setPincodeError('Sorry, we currently do not deliver to this pincode.');
          if (paymentMethod === 'cod') setPaymentMethod('razorpay');
        }
      } catch (err: any) {
        if (active) {
          setPincodeVerification(null);
          setPincodeError('Pincode verification is temporarily unavailable. Please try again.');
        }
      } finally {
        if (active) setIsVerifyingPincode(false);
      }
    }, 400);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [formData.pincode, paymentMethod]);

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

  const applyCouponByCode = async (codeToApply: string) => {
    const cleanCode = codeToApply.trim().toUpperCase();
    if (!cleanCode || hasRentalOrder) return;
    setDiscountError(null);

    try {
      const preview = await api.previewCoupon({
        code: cleanCode,
        items: apiItems,
        paymentMethod,
      });
      if (preview.valid) {
        const allowedMethods = preview.coupon?.allowedPaymentMethods;
        setAppliedDiscount({
          code: cleanCode,
          amount: preview.savingsAmount,
          message: preview.message,
          type: 'coupon',
          badgeText: preview.coupon?.badgeText,
          allowedPaymentMethods: allowedMethods,
        });
        if (allowedMethods === 'ONLINE_ONLY' || allowedMethods === 'PREPAID') {
          setPaymentMethod('razorpay');
        }
        setDiscountCodeInput('');
        setDiscountError(null);
        return;
      } else {
        setDiscountError(preview.message || 'Invalid coupon code');
      }
    } catch (err: any) {
      try {
        const refRes = await api.validateDiscount(cleanCode, subtotal);
        if (refRes.valid) {
          setAppliedDiscount({
            code: cleanCode,
            amount: refRes.discountAmount,
            message: refRes.message,
            type: 'referral',
          });
          setDiscountCodeInput('');
          setDiscountError(null);
          return;
        }
      } catch {}
      setDiscountError(err?.message || 'Invalid discount coupon code');
    }
  };

  const handleApplyDiscount = async () => {
    if (hasRentalOrder || !discountCodeInput.trim()) return;
    await applyCouponByCode(discountCodeInput);
  };

  // Auto-apply coupon from URL query param if present
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const couponFromUrl = params.get('coupon');
    if (couponFromUrl && !hasRentalOrder && !appliedDiscount && items.length > 0) {
      applyCouponByCode(couponFromUrl);
    }
  }, [hasRentalOrder, items.length]);

  const removeDiscount = () => {
    setAppliedDiscount(null);
    setDiscountError(null);
  };

  const finalAmount = Math.max(0, subtotal - (appliedDiscount?.amount || 0));
  const codEligible = !!(pincodeVerification?.valid && pincodeVerification.serviceable && pincodeVerification.isDelhiNcr);

  const visibleSavedAddresses = savedAddressesOwnerId === user?.id ? savedAddresses : [];
  const selectedSavedAddress = visibleSavedAddresses.find((address) => address.id === selectedSavedAddressId) || null;

  const selectSavedAddress = (address: Address) => {
    setSelectedSavedAddressId(address.id);
    setAddressPickerOpen(false);
    setSaveAddressToAccount(false);
    if (address.pincode !== formData.pincode) {
      setPincodeVerification(null);
      setPincodeError(null);
    }
    setFormData((prev) => ({
      ...prev,
      fullName: address.fullName || user?.name || '',
      phone: address.phone || user?.phone || '',
      address: address.address,
      city: address.city || '',
      state: address.state || 'Maharashtra',
      pincode: address.pincode || '',
      gstin: address.gstin || prev.gstin,
    }));
  };

  const startNewAddress = () => {
    setSelectedSavedAddressId(null);
    setAddressPickerOpen(false);
    setSaveAddressToAccount(false);
    setPincodeVerification(null);
    setPincodeError(null);
    setFormData((prev) => ({ ...prev, address: '', city: '', state: 'Maharashtra', pincode: '' }));
    document.getElementById('checkout-address-fields')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    if (['fullName', 'phone', 'address', 'city', 'state', 'pincode'].includes(e.target.name)) {
      setSelectedSavedAddressId(null);
    }
    setFormData((previous) => ({ ...previous, [e.target.name]: e.target.value }));
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartSyncing || cartSyncError || itemCount === 0 || (canUseSavedAddresses && savedAddressesLoading)) return;
    if (hasMixedCart) {
      alert('Buy and rent items must be checked out separately. Your cart has not been changed.');
      return;
    }
    if (hasRentalOrder && paymentMethod === 'cod') {
      alert('Rental orders require an AutoPay mandate and cannot use Cash on Delivery.');
      return;
    }
    if (!formData.fullName || !formData.phone || !formData.address || !formData.pincode) {
      alert('Please fill in all mandatory shipping address fields');
      return;
    }
    if (isVerifyingPincode || !pincodeVerification?.valid || !pincodeVerification.serviceable) {
      setPincodeError(pincodeVerification?.message || 'Verify a serviceable delivery PIN code before placing your order.');
      return;
    }

    setIsSubmitting(true);

    try {
      let activeUser = user;
      if (!activeUser && typeof guestLogin === 'function') {
        try {
          activeUser = await guestLogin();
        } catch (guestErr) {
          console.warn('[checkout] Guest login fallback notice:', guestErr);
        }
      }
      let orderAddressId = savedAddressesOwnerId === user?.id ? selectedSavedAddressId : null;
      if (!orderAddressId && saveAddressToAccount && canUseSavedAddresses && user) {
        const savedAddress = await api.createAddress({
          fullName: formData.fullName,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
          gstin: formData.gstin,
          isDefault: false,
        } satisfies CreateAddressDto);
        orderAddressId = savedAddress.id;
        setSavedAddresses((previous) => [savedAddress, ...previous]);
        setSavedAddressesOwnerId(user.id);
        setSelectedSavedAddressId(savedAddress.id);
        setSaveAddressToAccount(false);
        setFormData((previous) => ({
          ...previous,
          city: savedAddress.city || previous.city,
          state: savedAddress.state || previous.state,
          pincode: savedAddress.pincode || previous.pincode,
        }));
      }

      // 1. Create order on backend
      const orderPayload = {
        discountCode: !hasRentalOrder && appliedDiscount?.type === 'coupon' ? appliedDiscount.code : undefined,
        referralCode: !hasRentalOrder && appliedDiscount?.type === 'referral' ? appliedDiscount.code : undefined,
        paymentMethod: paymentMethod,
        email: formData.email,
        idempotencyKey: `lm-web-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        ...(orderAddressId ? { addressId: orderAddressId } : {}),
        shippingAddress: {
          fullName: formData.fullName,
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
        },
        phone: formData.phone,
        notes: formData.gstin ? `GSTIN: ${formData.gstin} | Company: ${formData.companyName} | ${formData.notes}` : formData.notes,
        cartItems: items.map((it) => ({
          productId: it.productId,
          variantId: it.variantId || undefined,
          quantity: it.quantity,
          purchaseMode: (it.purchaseMode || 'sell') as 'sell' | 'lease',
          configuration: it.configuration || 'default',
          hasWarranty: !!it.hasWarranty,
          tenureMonths: it.tenureMonths || undefined,
        })),
      };

      const order = await api.createOrder(orderPayload);

      // 2. If Razorpay selected, initialize payment modal
      if (paymentMethod === 'razorpay') {
        try {
          const payment = hasRentalOrder
            ? await api.createRazorpaySubscription(order.id)
            : await api.createRazorpayOrder(order.id);
          if (!payment.keyId) throw new Error('Payment gateway key is unavailable');

          if (typeof window !== 'undefined' && window.Razorpay) {
            const options = {
              key: payment.keyId,
              name: 'LaptopMitra',
              description: hasRentalOrder
                ? `Rental AutoPay authorization for ${order.orderNumber}`
                : `Order ${order.orderNumber} - Certified Refurbished Laptop`,
              ...(hasRentalOrder
                ? { subscription_id: payment.subscriptionId }
                : {
                    order_id: payment.id,
                    amount: payment.amount,
                    currency: payment.currency || 'INR',
                  }),
              image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=200&q=80',
              prefill: {
                name: formData.fullName,
                email: formData.email,
                contact: formData.phone,
              },
              theme: {
                color: '#1D6FF2',
              },
              handler: async (response: any) => {
                try {
                  if (hasRentalOrder) {
                    await api.verifyRentalSubscription({
                      orderId: order.id,
                      razorpaySubscriptionId: response.razorpay_subscription_id,
                      razorpayPaymentId: response.razorpay_payment_id,
                      razorpaySignature: response.razorpay_signature,
                    });
                  } else {
                    await api.verifyRazorpayPayment({
                      orderId: order.id,
                      razorpayOrderId: response.razorpay_order_id,
                      razorpayPaymentId: response.razorpay_payment_id,
                      razorpaySignature: response.razorpay_signature,
                    });
                  }
                  clearCart();
                  setCompletedOrder({ ...order, paymentStatus: 'COMPLETED' as any, status: 'CONFIRMED' as any });
                } catch {
                  router.push(`/account/orders/${order.id}`);
                }
              },
              modal: {
                ondismiss: () => {
                  setIsSubmitting(false);
                },
              },
            };

            const rzpInstance = new window.Razorpay(options);
            rzpInstance.open();
          } else {
            alert('Secure checkout is unavailable. Your order is still pending; retry payment from Order Details.');
            router.push(`/account/orders/${order.id}`);
          }
        } catch (error) {
          alert(error instanceof Error ? error.message : 'Payment could not be started. Your order is still pending.');
          router.push(`/account/orders/${order.id}`);
        }
      } else {
        // COD (Cash on Delivery)
        clearCart();
        setCompletedOrder(order);
      }
    } catch (error: unknown) {
      if (selectedSavedAddressId && error instanceof Error && error.message.includes('Saved delivery address not found')) {
        setSelectedSavedAddressId(null);
        setSavedAddressesError('The selected address was removed. Choose another address or enter a new one.');
        try {
          const latestAddresses = await api.getAddresses();
          setSavedAddresses(latestAddresses);
          setSavedAddressesOwnerId(user?.id || null);
        } catch {
          // Keep the current form usable if the address list cannot be refreshed.
        }
      }
      alert(error instanceof Error ? error.message : 'Could not complete order. Please verify your details and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ORDER SUCCESS SCREEN
  if (completedOrder) {
    return (
      <CustomerLayout>
        <div className="bg-[#F8FAFC] min-h-screen py-12 px-4">
          <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-[#E4E9F2] shadow-sm p-6 sm:p-10 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-3xl mx-auto">
              ✓
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
                Order Confirmed &amp; In Process
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#111827] tracking-tight">
                Thank You for Choosing LaptopMitra!
              </h1>
              <p className="text-xs text-[#475569]">
                Order Reference: <strong className="text-[#111827] font-mono text-sm">{completedOrder.orderNumber}</strong>
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-[#E4E9F2] text-left text-xs space-y-3">
              <div className="flex justify-between border-b border-[#E4E9F2] pb-2 font-bold text-[#0B1F4B]">
                <span>Delivery Summary</span>
                <span className="text-[#1D6FF2]">Express Insured BlueDart</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div>
                  <span className="text-slate-400 block text-[10px]">Recipient</span>
                  <span className="font-bold text-slate-800">{formData.fullName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Contact Phone</span>
                  <span className="font-bold text-slate-800 font-mono">{formData.phone}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 block text-[10px]">Shipping Destination</span>
                  <span className="font-medium text-slate-800">
                    {formData.address}, {formData.city}, {formData.state} - {formData.pincode}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/profile"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs shadow-xs transition-all"
              >
                📦 View Order in Account
              </Link>
              <Link
                href="/products"
                className="w-full sm:w-auto px-6 py-3 rounded-xl border border-[#E4E9F2] hover:bg-[#F8FAFC] text-slate-700 font-bold text-xs transition-all"
              >
                Continue Shopping
              </Link>
              <a
                href={`https://wa.me/${NEXT_PUBLIC_WHATSAPP_NUMBER}?text=Hi%20LaptopMitra,%20I%20just%20placed%20Order%20${completedOrder.orderNumber}.%20Please%20send%20tracking%20updates.`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#25D366] hover:bg-[#20BD5A] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <span>WhatsApp Updates</span>
              </a>
            </div>
          </div>
        </div>
      </CustomerLayout>
    );
  }

  // EMPTY CHECKOUT REDIRECT
  if (itemCount === 0) {
    return (
      <CustomerLayout>
        <div className="bg-[#F8FAFC] min-h-[70vh] flex items-center justify-center py-16 px-4">
          <div className="max-w-md w-full text-center space-y-4 bg-white p-8 rounded-3xl border border-[#E4E9F2] shadow-sm">
            <h2 className="text-xl font-black text-[#0B1F4B]">Your Cart is Empty</h2>
            <p className="text-xs text-slate-500">{cartSyncing ? 'Checking your saved cart…' : cartSyncError || 'Add certified laptops to your cart before proceeding to checkout.'}</p>
            {cartSyncError && <button type="button" onClick={() => window.location.reload()} className="text-xs font-bold text-blue-600">Retry cart sync</button>}
            <Link
              href="/products"
              className="inline-block px-6 py-3 bg-[#1D6FF2] text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/20"
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
      <div className="bg-[#F8FAFC] min-h-screen py-6 sm:py-8 lg:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl sm:text-3xl font-black text-[#0B1F4B] tracking-tight mb-6">
            Secure Checkout
          </h1>

          <form onSubmit={handlePlaceOrder}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
              
              {/* LEFT COLUMN: Shipping, GST & Payment (7 cols) */}
              <div className="lg:col-span-7 space-y-6">
                {/* 1. Contact & Shipping Address */}
                <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E4E9F2] shadow-sm space-y-4">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-[#E4E9F2]">
                    <span className="w-6 h-6 rounded-full bg-[#1D6FF2] text-white flex items-center justify-center text-xs font-bold font-mono">
                      1
                    </span>
                    <h2 className="text-base font-black text-[#0B1F4B]">
                      Delivery &amp; Contact Address
                    </h2>
                  </div>

                  {(authLoading || (canUseSavedAddresses && savedAddressesLoading)) && (
                    <p role="status" className="text-xs text-slate-500">Loading your saved delivery addresses...</p>
                  )}

                  {canUseSavedAddresses && savedAddressesError && (
                    <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                      {savedAddressesError} You can still enter a delivery address below.
                    </p>
                  )}

                  {canUseSavedAddresses && savedAddressesOwnerId === user?.id && visibleSavedAddresses.length > 0 && (
                    <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3 sm:p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h3 className="text-sm font-bold text-[#0B1F4B]">Select Delivery Address</h3>
                          <p className="mt-0.5 text-[11px] text-slate-500">Choose where you want your order delivered.</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <button
                            type="button"
                            onClick={() => setAddressPickerOpen((open) => !open)}
                            className="text-xs font-bold text-[#1D6FF2] hover:underline"
                          >
                            {addressPickerOpen ? 'Hide addresses' : 'Change Address'}
                          </button>
                          <button
                            type="button"
                            onClick={startNewAddress}
                            className="text-xs font-bold text-[#1D6FF2] hover:underline"
                          >
                            + Add New Address
                          </button>
                        </div>
                      </div>

                      {addressPickerOpen ? (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="group" aria-label="Saved delivery addresses">
                          {visibleSavedAddresses.map((address) => {
                            const selected = address.id === selectedSavedAddressId;
                            return (
                              <button
                                key={address.id}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => selectSavedAddress(address)}
                                className={`w-full rounded-xl border p-3 text-left transition-colors ${selected
                                  ? 'border-[#1D6FF2] bg-blue-50/70 ring-1 ring-[#1D6FF2]/20'
                                  : 'border-[#E4E9F2] bg-white hover:border-blue-300'
                                  }`}
                              >
                                <span className="flex items-center justify-between gap-2">
                                  <span className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{address.label || 'Home'}</span>
                                    {address.isDefault && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-bold text-blue-700">Default</span>}
                                  </span>
                                  <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border text-[10px] ${selected ? 'border-[#1D6FF2] bg-[#1D6FF2] text-white' : 'border-slate-300 text-transparent'}`} aria-hidden="true">✓</span>
                                </span>
                                <span className="mt-2 block text-xs font-bold text-slate-800">{address.fullName || user?.name || 'Recipient'}</span>
                                <span className="mt-1 block text-[11px] leading-4 text-slate-600">
                                  {address.address}{address.landmark ? `, ${address.landmark}` : ''}
                                </span>
                                <span className="mt-1 block text-[11px] text-slate-600">
                                  {[address.city, address.state].filter(Boolean).join(', ')}{address.pincode ? ` — ${address.pincode}` : ''}
                                </span>
                                {(address.phone || user?.phone) && <span className="mt-1 block font-mono text-[10px] text-slate-500">{address.phone || user?.phone}</span>}
                              </button>
                            );
                          })}
                        </div>
                      ) : selectedSavedAddress ? (
                        <div className="rounded-xl border border-[#1D6FF2] bg-white p-3 text-xs">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-800">{selectedSavedAddress.fullName || user?.name || 'Recipient'}</span>
                            {selectedSavedAddress.isDefault && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-bold text-blue-700">Default</span>}
                          </div>
                          <p className="mt-1 text-[11px] leading-4 text-slate-600">
                            {selectedSavedAddress.address}{selectedSavedAddress.landmark ? `, ${selectedSavedAddress.landmark}` : ''}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-600">
                            {[selectedSavedAddress.city, selectedSavedAddress.state].filter(Boolean).join(', ')}{selectedSavedAddress.pincode ? ` — ${selectedSavedAddress.pincode}` : ''}
                          </p>
                          {(selectedSavedAddress.phone || user?.phone) && <p className="mt-1 font-mono text-[10px] text-slate-500">{selectedSavedAddress.phone || user?.phone}</p>}
                        </div>
                      ) : null}
                    </div>
                  )}

                  <div id="checkout-address-fields" className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="sm:col-span-2 space-y-1">
                      <label className="font-bold text-slate-700">Full Name *</label>
                      <input
                        type="text"
                        name="fullName"
                        required
                        value={formData.fullName}
                        onChange={handleFormChange}
                        placeholder="e.g. Rahul Sharma"
                        className="h-10 w-full px-3.5 py-2 rounded-xl bg-[#F8FAFC] border border-[#E4E9F2] text-slate-900 focus:outline-none focus:border-[#1D6FF2] focus:bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">Phone Number (For BlueDart SMS) *</label>
                      <input
                        type="tel"
                        name="phone"
                        required
                        value={formData.phone}
                        onChange={handleFormChange}
                        placeholder="10-digit mobile number"
                        className="h-10 w-full px-3.5 py-2 rounded-xl bg-[#F8FAFC] border border-[#E4E9F2] text-slate-900 font-mono focus:outline-none focus:border-[#1D6FF2] focus:bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">Email Address (For Tax Invoice)</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleFormChange}
                        placeholder="you@company.com"
                        className="h-10 w-full px-3.5 py-2 rounded-xl bg-[#F8FAFC] border border-[#E4E9F2] text-slate-900 focus:outline-none focus:border-[#1D6FF2] focus:bg-white"
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-1">
                      <label className="font-bold text-slate-700">Street Address &amp; Flat / Office No. *</label>
                      <input
                        type="text"
                        name="address"
                        required
                        value={formData.address}
                        onChange={handleFormChange}
                        placeholder="Building name, street, locality"
                        className="h-10 w-full px-3.5 py-2 rounded-xl bg-[#F8FAFC] border border-[#E4E9F2] text-slate-900 focus:outline-none focus:border-[#1D6FF2] focus:bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">City *</label>
                      <input
                        type="text"
                        name="city"
                        required
                        value={formData.city}
                        onChange={handleFormChange}
                        placeholder="City"
                        className="h-10 w-full px-3.5 py-2 rounded-xl bg-[#F8FAFC] border border-[#E4E9F2] text-slate-900 focus:outline-none focus:border-[#1D6FF2] focus:bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">6-Digit PIN Code *</label>
                      <input
                        type="text"
                        maxLength={6}
                        inputMode="numeric"
                        pattern="[0-9]{6}"
                        name="pincode"
                        required
                        value={formData.pincode}
                        onChange={handleFormChange}
                        placeholder="PIN Code"
                        className="h-10 w-full px-3.5 py-2 rounded-xl bg-[#F8FAFC] border border-[#E4E9F2] text-slate-900 font-mono focus:outline-none focus:border-[#1D6FF2] focus:bg-white"
                      />
                      <p aria-live="polite" className={`min-h-4 text-[11px] ${pincodeError ? 'text-rose-600' : 'text-emerald-700'}`}>
                        {isVerifyingPincode
                          ? 'Verifying delivery PIN code…'
                          : pincodeError || (pincodeVerification?.valid && pincodeVerification.serviceable
                            ? `Delivery available: ${pincodeVerification.city || ''}${pincodeVerification.district && pincodeVerification.district !== pincodeVerification.city ? `, ${pincodeVerification.district}` : ''}${pincodeVerification.state ? `, ${pincodeVerification.state}` : ''}`
                            : '')}
                      </p>
                    </div>
                  </div>

                  {canUseSavedAddresses && !selectedSavedAddressId && (
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                      <input
                        type="checkbox"
                        checked={saveAddressToAccount}
                        onChange={(event) => setSaveAddressToAccount(event.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-[#1D6FF2] focus:ring-[#1D6FF2]"
                      />
                      Save this address to my account
                    </label>
                  )}
                </div>

                {/* 2. B2B / GST Information (Optional) */}
                <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E4E9F2] shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#E4E9F2]">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold font-mono">
                        2
                      </span>
                      <h2 className="text-base font-black text-[#0B1F4B]">
                        Business Invoice Details (Optional)
                      </h2>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      For eligible invoices
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">Company Legal Name</label>
                      <input
                        type="text"
                        name="companyName"
                        value={formData.companyName}
                        onChange={handleFormChange}
                        placeholder="e.g. Acme Technologies Pvt Ltd"
                        className="h-10 w-full px-3.5 py-2 rounded-xl bg-[#F8FAFC] border border-[#E4E9F2] text-slate-900 focus:outline-none focus:border-[#1D6FF2] focus:bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-700">GSTIN (15-digit)</label>
                      <input
                        type="text"
                        maxLength={15}
                        name="gstin"
                        value={formData.gstin}
                        onChange={handleFormChange}
                        placeholder="27AAAAA0000A1Z5"
                        className="h-10 w-full px-3.5 py-2 rounded-xl bg-[#F8FAFC] border border-[#E4E9F2] text-slate-900 font-mono uppercase focus:outline-none focus:border-[#1D6FF2] focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Payment Method */}
                <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E4E9F2] shadow-sm space-y-4">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-[#E2E8F0]">
                    <span className="w-6 h-6 rounded-full bg-[#2563EB] text-white flex items-center justify-center text-xs font-bold font-mono">
                      3
                    </span>
                    <h2 className="text-base font-bold text-[#111827]">
                      Payment Method
                    </h2>
                  </div>

                  <div className="space-y-3">
                    <label className={`p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                      paymentMethod === 'razorpay' ? 'border-[#1D6FF2] bg-blue-50/30' : 'border-[#E4E9F2] hover:bg-slate-50'
                    }`}>
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="paymentMethod"
                          checked={paymentMethod === 'razorpay'}
                          onChange={() => setPaymentMethod('razorpay')}
                          className="w-4 h-4 text-[#1D6FF2] focus:ring-[#1D6FF2] cursor-pointer"
                        />
                        <div>
                          <span className="font-black text-sm text-[#0B1F4B] block">
                            {hasRentalOrder ? 'Razorpay AutoPay (Recurring Rental Payments)' : 'UPI / Credit Card / Debit Card / NetBanking'}
                          </span>
                          <span className="text-xs text-slate-500">
                            {hasRentalOrder
                              ? 'Authorize the monthly rental mandate and first payment securely via Razorpay'
                              : 'Instant confirmation via Razorpay 256-bit secure gateway'}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 shrink-0">
                        ⚡ Recommended
                      </span>
                    </label>

                    {!hasRentalOrder && (
                      <label className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${
                        paymentMethod === 'cod' ? 'border-[#1D6FF2] bg-blue-50/30' : 'border-[#E4E9F2] hover:bg-slate-50'
                      } ${(!codEligible || (appliedDiscount?.allowedPaymentMethods === 'ONLINE_ONLY' || appliedDiscount?.allowedPaymentMethods === 'PREPAID')) ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="paymentMethod"
                            checked={paymentMethod === 'cod'}
                            disabled={!codEligible || (appliedDiscount?.allowedPaymentMethods === 'ONLINE_ONLY' || appliedDiscount?.allowedPaymentMethods === 'PREPAID')}
                            onChange={() => {
                              if (codEligible && appliedDiscount?.allowedPaymentMethods !== 'ONLINE_ONLY' && appliedDiscount?.allowedPaymentMethods !== 'PREPAID') {
                                setPaymentMethod('cod');
                              }
                            }}
                            className="w-4 h-4 text-[#1D6FF2] focus:ring-[#1D6FF2] disabled:cursor-not-allowed cursor-pointer"
                          />
                          <div>
                            <span className="font-black text-sm text-[#0B1F4B] block">
                              Cash on Delivery (Pay at Doorstep)
                            </span>
                            <span className="text-xs text-slate-500">
                              {(appliedDiscount?.allowedPaymentMethods === 'ONLINE_ONLY' || appliedDiscount?.allowedPaymentMethods === 'PREPAID')
                                ? `Coupon ${appliedDiscount.code} is valid on online prepaid payments only. Remove coupon to select COD.`
                                : (codEligible ? 'Verification call required prior to dispatch' : 'Available only for verified, serviceable Delhi NCR PIN codes')}
                            </span>
                          </div>
                        </div>
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Order Review & Total (5 cols) */}
              <div className="lg:col-span-5 space-y-6">
                <div className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E4E9F2] shadow-sm space-y-5 sticky top-20">
                  <h2 className="text-lg font-black text-[#0B1F4B] tracking-tight">
                    Order Summary ({itemCount})
                  </h2>

                  {/* Items List Mini */}
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {items.map((item) => (
                      <div key={item.id || `${item.productId}-${item.variantId || item.configuration}-${item.purchaseMode}`} className="flex items-center justify-between text-xs py-2 border-b border-slate-100 last:border-0">
                        <div className="min-w-0 pr-2">
                          <span className="font-bold text-slate-800 block truncate">{item.product?.name}</span>
                          {item.variant?.attributes && (
                            <span className="block truncate text-[11px] text-slate-500">
                              {Object.entries(item.variant.attributes).map(([key, value]) => `${key}: ${String(value)}`).join(' · ')}
                            </span>
                          )}
                          <span className="block font-mono text-[10px] text-slate-400">SKU: {item.variant?.sku || item.product?.sku}</span>
                          <span className="text-slate-400 font-mono text-[11px]">Qty: {item.quantity} × ₹{Number(item.priceAtAdd).toLocaleString('en-IN')}</span>
                        </div>
                        <span className="font-bold text-[#0B1F4B] tabular-nums shrink-0">
                          ₹{(Number(item.priceAtAdd) * item.quantity).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Applied Coupon or Offers Selector */}
                  {!hasRentalOrder && (
                    <div className="pt-2 border-t border-[#E4E9F2] space-y-3">
                      {appliedDiscount ? (
                        <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg shrink-0 mt-0.5">
                              <Tag className="w-3.5 h-3.5" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono font-bold text-xs text-emerald-950 tracking-wider">
                                  {appliedDiscount.code}
                                </span>
                                {appliedDiscount.badgeText && (
                                  <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-200 text-emerald-900 px-1.5 py-0.5 rounded">
                                    {appliedDiscount.badgeText}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-emerald-700 font-medium mt-0.5 truncate">
                                Saving ₹{appliedDiscount.amount.toLocaleString('en-IN')} on this order
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={removeDiscount}
                            className="text-xs font-bold text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                            title="Remove coupon"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => setIsOffersModalOpen(true)}
                            className="w-full flex items-center justify-between p-3 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/40 hover:bg-blue-50 text-[#1D6FF2] transition-colors cursor-pointer group"
                          >
                            <div className="flex items-center gap-2">
                              <Sparkles className="w-4 h-4 text-[#1D6FF2] animate-pulse" />
                              <span className="text-xs font-bold text-[#0B1F4B]">View Available Offers</span>
                            </div>
                            <span className="text-[11px] font-bold text-[#1D6FF2] group-hover:translate-x-0.5 transition-transform">
                              Select →
                            </span>
                          </button>

                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={discountCodeInput}
                              onChange={(e) => setDiscountCodeInput(e.target.value)}
                              placeholder="Coupon / Referral Code"
                              className="h-10 w-full px-3 py-2 rounded-xl bg-[#F8FAFC] border border-[#E4E9F2] text-xs uppercase placeholder:normal-case focus:outline-none focus:border-[#1D6FF2]"
                            />
                            <button
                              type="button"
                              onClick={handleApplyDiscount}
                              className="h-10 px-4 rounded-xl bg-[#0B1F4B] hover:bg-[#162D66] text-white font-bold text-xs transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                            >
                              Apply
                            </button>
                          </div>
                          {discountError && (
                            <p className="text-[11px] text-rose-600 font-bold">{discountError}</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {hasMixedCart && (
                    <p role="alert" className="text-sm font-semibold text-rose-700">
                      Buy and rent items must be checked out separately. Remove one type of item to continue.
                    </p>
                  )}

                  {/* Calculations */}
                  <div className="space-y-2.5 text-xs pt-2 border-t border-[#E4E9F2]">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal</span>
                      <span className="font-bold text-[#0B1F4B] tabular-nums">₹{subtotal.toLocaleString('en-IN')}</span>
                    </div>

                    {appliedDiscount && (
                      <div className="flex justify-between text-emerald-700 font-bold">
                        <span>Discount Savings</span>
                        <span className="tabular-nums">-₹{appliedDiscount.amount.toLocaleString('en-IN')}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-slate-600">
                      <span>Pan-India Insured Delivery</span>
                      <span className="font-bold text-emerald-700 uppercase">FREE</span>
                    </div>

                    <div className="flex justify-between text-slate-600">
                      <span>
                        {supportConfig
                          ? `${Math.max(1, Math.round(supportConfig.standardWarrantyDays / 30))}-Month Comprehensive Warranty`
                          : 'Comprehensive Warranty'}
                      </span>
                      <span className="font-bold text-emerald-700 uppercase">INCLUDED</span>
                    </div>
                  </div>

                  {/* Total Amount */}
                  <div className="pt-3 border-t border-[#E2E8F0] flex items-baseline justify-between">
                    <div>
                      <span className="text-sm font-bold text-[#111827] block">{hasRentalOrder ? 'First month payment' : 'Estimated total'}</span>
                      <span className="text-[10px] text-[#475569]">
                        {hasRentalOrder ? 'Final amount, including applicable tax, is calculated by the server' : 'Applicable tax is calculated by the server before payment'}
                      </span>
                    </div>
                    {!hasRentalOrder && (
                      <span className="text-2xl font-bold text-[#111827] tabular-nums">
                        ₹{finalAmount.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>

                  {/* Submit CTA */}
                  <button
                    type="submit"
                    disabled={isSubmitting || cartSyncing || !!cartSyncError || authLoading || (canUseSavedAddresses && savedAddressesLoading) || isVerifyingPincode || !pincodeVerification?.valid || !pincodeVerification.serviceable || hasMixedCart}
                    className="w-full h-11 px-4 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs active:scale-95 transition-all text-center cursor-pointer"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Processing Order...
                      </span>
                    ) : (
                      <span>{hasRentalOrder ? '🔒 Continue to AutoPay Setup' : `🔒 Place Order • ₹${finalAmount.toLocaleString('en-IN')}`}</span>
                    )}
                  </button>
                  {cartSyncError && <p role="alert" className="text-xs text-red-600">{cartSyncError} <button type="button" onClick={() => window.location.reload()} className="font-bold underline">Retry</button></p>}

                  {/* Assurance */}
                  <div className="pt-3 border-t border-[#E4E9F2] space-y-1.5 text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>256-Bit SSL Encrypted &amp; Razorpay Secured</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>
                        {supportConfig?.returnWindowDays
                          ? `${supportConfig.returnWindowDays}-Day Doorstep Replacement Policy`
                          : 'Doorstep Replacement Policy'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      <CouponOffersModal
        open={isOffersModalOpen}
        onClose={() => setIsOffersModalOpen(false)}
        items={apiItems}
        paymentMethod={paymentMethod}
        appliedCode={appliedDiscount?.code || null}
        onApplyCoupon={(code, preview) => {
          const allowedMethods = preview.coupon?.allowedPaymentMethods;
          setAppliedDiscount({
            code,
            amount: preview.savingsAmount,
            message: preview.message,
            type: 'coupon',
            badgeText: preview.coupon?.badgeText,
            allowedPaymentMethods: allowedMethods,
          });
          if (allowedMethods === 'ONLINE_ONLY' || allowedMethods === 'PREPAID') {
            setPaymentMethod('razorpay');
          }
          setDiscountCodeInput('');
          setDiscountError(null);
        }}
      />
    </CustomerLayout>
  );
}
