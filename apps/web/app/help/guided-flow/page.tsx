'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import {
  ArrowLeft,
  ArrowRight,
  Package,
  RotateCcw,
  ShieldCheck,
  Truck,
  CreditCard,
  Phone,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Upload,
  X,
  Sparkles,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface OrderItemInfo {
  id: string;
  quantity: number;
  price: number;
  product?: {
    id: string;
    name: string;
    sku: string;
    images?: Array<{ url: string; isPrimary: boolean }>;
  };
}

interface OrderInfo {
  id: string;
  orderNumber: string;
  status: string;
  paymentMethod?: string | null;
  finalAmount: number | string;
  createdAt: string | Date;
  deliveredAt?: string | Date | null;
  items?: any[];
}

function GuidedFlowContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isGuest } = useAuth();

  const prefilledOrderId = searchParams?.get('orderId');
  const prefilledCategory = searchParams?.get('category');

  // Step state: 1: Context, 2: Category & Issue, 3: Self-serve solutions, 4: Raise Ticket / Return
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Data
  const [orders, setOrders] = useState<OrderInfo[]>([]);
  const [config, setConfig] = useState<any>(null);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Selections
  const [selectedOrder, setSelectedOrder] = useState<OrderInfo | null>(null);
  const [isNotOrderRelated, setIsNotOrderRelated] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedIssue, setSelectedIssue] = useState<string>('');
  const [selectedOrderItemId, setSelectedOrderItemId] = useState<string>('');

  // Ticket Form state
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [callbackRequested, setCallbackRequested] = useState(false);
  const [callbackPhone, setCallbackPhone] = useState('');
  const [callbackSlot, setCallbackSlot] = useState('Morning (10:00 AM - 1:00 PM)');
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [ticketError, setTicketError] = useState<string | null>(null);

  // Returns Form state (if initiating return)
  const [isReturnMode, setIsReturnMode] = useState(false);
  const [returnType, setReturnType] = useState<'REFUND' | 'REPLACEMENT'>('REFUND');
  const [returnReason, setReturnReason] = useState('');
  const [selectedReturnItems, setSelectedReturnItems] = useState<Record<string, number>>({});
  const [refundMethod, setRefundMethod] = useState<'SOURCE' | 'BANK' | 'UPI'>('SOURCE');
  const [bankDetails, setBankDetails] = useState({
    accountNumber: '',
    confirmAccountNumber: '',
    ifscCode: '',
    accountHolderName: '',
    upiId: '',
  });
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);

  // Load orders and config
  useEffect(() => {
    async function loadData() {
      setLoadingOrders(true);
      try {
        const [ordersRes, configRes] = await Promise.all([
          api.getOrders().catch(() => []),
          api.getSupportConfig().catch(() => null),
        ]);
        setOrders(ordersRes || []);
        setConfig(configRes);

        // Handle URL prefill
        if (prefilledOrderId && ordersRes?.length) {
          const match = ordersRes.find((o: OrderInfo) => o.id === prefilledOrderId || o.orderNumber === prefilledOrderId);
          if (match) {
            setSelectedOrder(match);
            setIsNotOrderRelated(false);
            setCurrentStep(2);
          }
        }
        if (prefilledCategory) {
          setSelectedCategory(prefilledCategory);
        }
      } finally {
        setLoadingOrders(false);
      }
    }

    if (isAuthenticated) {
      loadData();
    } else {
      setLoadingOrders(false);
    }
  }, [isAuthenticated, prefilledOrderId, prefilledCategory]);

  // Auth gate check
  if (!isAuthenticated && !loadingOrders) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
          Sign In to Access Guided Support
        </h2>
        <p className="text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
          To help you with your order, 7-day return request, or warranty claim, please log in with your verified account.
        </p>
        <Link
          href={`/login?redirect=${encodeURIComponent('/help/guided-flow' + (prefilledOrderId ? `?orderId=${prefilledOrderId}` : ''))}`}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm transition shadow-lg shadow-blue-500/25"
        >
          Sign In / Create Account
        </Link>
      </div>
    );
  }

  // Get active categories list
  const categoriesList = config?.categories || [
    { id: 'ORDER_DELIVERY', label: 'Order & Delivery' },
    { id: 'RETURN_REFUND', label: 'Return, Replacement & Refund' },
    { id: 'WARRANTY_REPAIR', label: 'Warranty & Repair' },
    { id: 'PAYMENT', label: 'Payment & Billing' },
    { id: 'BUYBACK', label: 'Buyback Guarantee' },
    { id: 'RENT_LEASE', label: 'Rent / Lease (Fleet)' },
    { id: 'ACCOUNT', label: 'Account & Security' },
    { id: 'OTHER', label: 'Other Assistance' },
  ];

  const activeCategoryObj = categoriesList.find((c: any) => c.id === selectedCategory);
  const issuesList = activeCategoryObj?.issues || [];

  // Handle Step 1 Selection
  const handleSelectOrder = (order: OrderInfo) => {
    setSelectedOrder(order);
    setIsNotOrderRelated(false);
    if (order.items && order.items.length > 0) {
      setSelectedOrderItemId(order.items[0].id);
      setSelectedReturnItems({ [order.items[0].id]: 1 });
    }
    setCurrentStep(2);
  };

  const handleSelectNoOrder = () => {
    setSelectedOrder(null);
    setIsNotOrderRelated(true);
    setCurrentStep(2);
  };

  // Handle Step 2 Selection
  const handleSelectCategoryAndIssue = (catId: string, issueId: string, issueLabel: string) => {
    setSelectedCategory(catId);
    setSelectedIssue(issueId);
    setTicketSubject(`${activeCategoryObj?.label || 'Support'}: ${issueLabel}`);
    setCurrentStep(3);
  };

  // Check 7-day return eligibility
  const isEligibleForReturn = () => {
    if (!selectedOrder) return false;
    const orderDate = new Date(selectedOrder.deliveredAt || selectedOrder.createdAt);
    const diffDays = (Date.now() - orderDate.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
  };

  // Submit Ticket Action
  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketMessage.trim()) {
      setTicketError('Please provide a description of the issue');
      return;
    }

    setSubmittingTicket(true);
    setTicketError(null);
    try {
      const ticket = await api.createTicket({
        subject: ticketSubject || 'Support Inquiry',
        category: selectedCategory || 'OTHER',
        issueType: selectedIssue || undefined,
        orderId: selectedOrder?.id || undefined,
        orderItemId: selectedOrderItemId || undefined,
        message: ticketMessage.trim(),
        callbackPhone: callbackRequested ? callbackPhone : undefined,
        callbackSlot: callbackRequested ? callbackSlot : undefined,
      });

      router.push(`/account/tickets/${ticket.id}?new=true`);
    } catch (err: any) {
      setTicketError(err?.message || 'Failed to submit support ticket');
    } finally {
      setSubmittingTicket(false);
    }
  };

  // Submit Return Action
  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    if (!returnReason.trim()) {
      setReturnError('Please enter a return reason');
      return;
    }

    const itemsToReturn = Object.entries(selectedReturnItems)
      .filter(([_, qty]) => qty > 0)
      .map(([orderItemId, quantity]) => ({ orderItemId, quantity }));

    if (itemsToReturn.length === 0) {
      setReturnError('Please select at least one item to return');
      return;
    }

    // Validate COD bank details if entered
    if (refundMethod === 'BANK') {
      if (!bankDetails.accountNumber || !bankDetails.confirmAccountNumber) {
        setReturnError('Bank account number is required');
        return;
      }
      if (bankDetails.accountNumber !== bankDetails.confirmAccountNumber) {
        setReturnError('Bank account numbers do not match');
        return;
      }
      if (!bankDetails.ifscCode || !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankDetails.ifscCode.toUpperCase())) {
        setReturnError('Invalid IFSC Code format (e.g. HDFC0001234)');
        return;
      }
      if (!bankDetails.accountHolderName.trim()) {
        setReturnError('Account holder name is required');
        return;
      }
    } else if (refundMethod === 'UPI') {
      if (!bankDetails.upiId.includes('@')) {
        setReturnError('Invalid UPI address format (e.g. name@bank)');
        return;
      }
    }

    setSubmittingReturn(true);
    setReturnError(null);
    try {
      const res = await api.createReturnRequest({
        orderId: selectedOrder.id,
        type: returnType,
        reason: returnReason.trim(),
        items: itemsToReturn,
        refundMethod,
        refundDetails: refundMethod !== 'SOURCE' ? bankDetails : undefined,
      });

      router.push(`/account/returns/${res.id}?new=true`);
    } catch (err: any) {
      setReturnError(err?.message || 'Failed to submit return request');
    } finally {
      setSubmittingReturn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* ── Top Header ── */}
      <div className="bg-white border-b border-slate-200 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/help"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              aria-label="Back to Help Center"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                Guided Support Assistant
                <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
                  Step {currentStep} of 4
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                Pick your order and issue for self-serve solutions or to raise a ticket
              </p>
            </div>
          </div>

          <Link href="/help" className="text-xs font-bold text-slate-500 hover:text-blue-600">
            Cancel
          </Link>
        </div>
      </div>

      {/* ── Main Container ── */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        {/* Step Progress Pills */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { step: 1, label: 'Select Order' },
            { step: 2, label: 'Choose Issue' },
            { step: 3, label: 'Instant Solutions' },
            { step: 4, label: 'Resolution' },
          ].map((s) => (
            <div
              key={s.step}
              className={`h-2 rounded-full transition-all ${
                currentStep >= s.step ? 'bg-blue-600' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>

        {/* ── STEP 1: PICK ORDER CONTEXT ── */}
        {currentStep === 1 && (
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Step 1: Which purchase or order is this about?
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Select from your recent orders to prefill warranty and tracking information.
              </p>
            </div>

            {loadingOrders ? (
              <div className="py-12 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((ord) => (
                  <button
                    key={ord.id}
                    onClick={() => handleSelectOrder(ord)}
                    className="w-full text-left p-4 rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/20 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden border border-slate-200">
                        {ord.items?.[0]?.product?.images?.[0]?.url ? (
                          <img
                            src={ord.items[0].product.images[0].url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-6 h-6 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 group-hover:text-blue-700">
                            Order #{ord.orderNumber}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              ord.status === 'DELIVERED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : ord.status === 'CANCELLED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {ord.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {ord.items?.[0]?.product?.name || 'Laptop Hardware'} (₹{Number(ord.finalAmount || 0).toLocaleString('en-IN')})
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Placed on {new Date(ord.createdAt).toLocaleDateString('en-IN')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-600 shrink-0">
                      Select This Order <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                ))}

                {/* No Order Option */}
                <button
                  onClick={handleSelectNoOrder}
                  className="w-full text-left p-4 rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-slate-50 transition flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <HelpCircle className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                    <div>
                      <p className="text-sm font-bold text-slate-800 group-hover:text-blue-700">
                        My issue is not related to a specific order
                      </p>
                      <p className="text-xs text-slate-500">
                        General questions, pre-purchase inquiries, buyback valuation, or account help
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            )}
          </section>
        )}

        {/* ── STEP 2: CATEGORY & SUB-ISSUE SELECTION ── */}
        {currentStep === 2 && (
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Step 2: What do you need help with?
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {selectedOrder ? `For Order #${selectedOrder.orderNumber}` : 'General Inquiry'}
                </p>
              </div>
              <button
                onClick={() => setCurrentStep(1)}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                Change Order
              </button>
            </div>

            {/* Category selection */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {categoriesList.map((cat: any) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setSelectedIssue('');
                  }}
                  className={`p-3.5 rounded-2xl text-left border text-xs font-bold transition flex items-center justify-between ${
                    selectedCategory === cat.id
                      ? 'bg-blue-50 border-blue-600 text-blue-900 ring-2 ring-blue-600/20'
                      : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <span>{cat.label}</span>
                  {selectedCategory === cat.id && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />}
                </button>
              ))}
            </div>

            {/* Sub-issues list */}
            {selectedCategory && (
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Select Specific Issue:
                </h3>
                <div className="space-y-2">
                  {issuesList.map((iss: any) => (
                    <button
                      key={iss.id}
                      onClick={() => handleSelectCategoryAndIssue(selectedCategory, iss.id, iss.label)}
                      className="w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/20 text-xs sm:text-sm font-semibold text-slate-800 transition flex items-center justify-between group"
                    >
                      <span>{iss.label}</span>
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* ── STEP 3: SELF-SERVE ACTIONS & RESOLUTION ── */}
        {currentStep === 3 && (
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Step 3: Instant Self-Serve Options
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  We found these automated actions that might solve your issue right away.
                </p>
              </div>
              <button
                onClick={() => setCurrentStep(2)}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                Change Issue
              </button>
            </div>

            {/* Automated Resolution Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Order Tracking Action */}
              {selectedOrder && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-blue-700 mb-1">
                      <Truck className="w-4 h-4" /> Live Tracking
                    </div>
                    <p className="text-xs text-slate-600">
                      View real-time courier dispatch status and delivery AWB details.
                    </p>
                  </div>
                  <Link
                    href={`/account/orders/${selectedOrder.id}`}
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline"
                  >
                    Track Order #{selectedOrder.orderNumber} →
                  </Link>
                </div>
              )}

              {/* 7-Day Return / Replacement Action */}
              {selectedOrder && selectedCategory === 'RETURN_REFUND' && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 mb-1">
                      <RotateCcw className="w-4 h-4" /> 7-Day Return & Replacement
                    </div>
                    <p className="text-xs text-slate-600">
                      {isEligibleForReturn()
                        ? 'Your order is within the 7-day return window. Submit return details and bank account for instant pickup.'
                        : 'Your order was delivered more than 7 days ago. You can still raise a hardware warranty repair claim.'}
                    </p>
                  </div>
                  {isEligibleForReturn() ? (
                    <button
                      onClick={() => {
                        setIsReturnMode(true);
                        setCurrentStep(4);
                      }}
                      className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                    >
                      Request Return or Replacement →
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setIsReturnMode(false);
                        setCurrentStep(4);
                      }}
                      className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline"
                    >
                      Claim 6-Month Hardware Warranty →
                    </button>
                  )}
                </div>
              )}

              {/* Tax Invoice Download Action */}
              {selectedOrder && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-1">
                      <FileText className="w-4 h-4 text-blue-600" /> GST Tax Invoice
                    </div>
                    <p className="text-xs text-slate-600">
                      Download your official tax invoice with serial numbers and GSTIN details.
                    </p>
                  </div>
                  <Link
                    href={`/account/orders/${selectedOrder.id}`}
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline"
                  >
                    View Invoice in Order Hub →
                  </Link>
                </div>
              )}

              {/* Policy Knowledge Base Article */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-1">
                    <ShieldCheck className="w-4 h-4 text-blue-600" /> Warranty & Policy Guidelines
                  </div>
                  <p className="text-xs text-slate-600">
                    Read the complete terms regarding motherboard, screen, and component coverage.
                  </p>
                </div>
                <Link
                  href="/help/warranty-repair/6-month-standard-warranty-coverage"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline"
                >
                  Read Policy Details →
                </Link>
              </div>
            </div>

            {/* If not resolved by self-serve */}
            <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Did these options resolve your issue?
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  If you still need help, raise an official support ticket and our team will get in touch within 24 hours.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsReturnMode(false);
                  setCurrentStep(4);
                }}
                className="shrink-0 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                Raise a Support Ticket →
              </button>
            </div>
          </section>
        )}

        {/* ── STEP 4: RAISE TICKET OR SUBMIT RETURN FORM ── */}
        {currentStep === 4 && !isReturnMode && (
          <form onSubmit={handleSubmitTicket} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Step 4: Raise a Support Ticket
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Our technical support team will review your case and respond within 24 hours.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                Back to Solutions
              </button>
            </div>

            {/* Critical Anti-Fraud Security Caution */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-900 text-xs">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">Security Reminder:</strong> LaptopMitra representatives will <strong>NEVER</strong> ask for your login password, SMS OTP, debit/credit card CVV, or UPI PIN. Never share credentials with anyone.
              </div>
            </div>

            {ticketError && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {ticketError}
              </div>
            )}

            {/* Subject */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Subject
              </label>
              <input
                type="text"
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
                placeholder="Brief summary of the issue..."
                className="w-full px-4 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Description of the Issue
              </label>
              <textarea
                rows={4}
                value={ticketMessage}
                onChange={(e) => setTicketMessage(e.target.value)}
                placeholder="Please provide details about what happened, steps to reproduce, or any error messages..."
                className="w-full px-4 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                required
              />
            </div>

            {/* Request Callback Option */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={callbackRequested}
                  onChange={(e) => setCallbackRequested(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span className="text-xs font-bold text-slate-800">
                  Request a phone callback from a support engineer
                </span>
              </label>

              {callbackRequested && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={callbackPhone}
                      onChange={(e) => setCallbackPhone(e.target.value)}
                      placeholder="+91 9876543210"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                      required={callbackRequested}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Preferred Time Slot
                    </label>
                    <select
                      value={callbackSlot}
                      onChange={(e) => setCallbackSlot(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                    >
                      <option>Morning (10:00 AM - 1:00 PM)</option>
                      <option>Afternoon (2:00 PM - 5:00 PM)</option>
                      <option>Evening (5:00 PM - 7:00 PM)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submittingTicket}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2"
            >
              {submittingTicket ? 'Submitting Ticket...' : 'Submit Support Ticket'}
            </button>
          </form>
        )}

        {/* ── STEP 4 (ALTERNATIVE): SUBMIT RETURN REQUEST ── */}
        {currentStep === 4 && isReturnMode && selectedOrder && (
          <form onSubmit={handleSubmitReturn} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Submit 7-Day Return / Replacement Request
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Order #{selectedOrder.orderNumber}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                Back
              </button>
            </div>

            {returnError && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
                {returnError}
              </div>
            )}

            {/* Resolution Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                What resolution do you prefer?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setReturnType('REFUND')}
                  className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                    returnType === 'REFUND'
                      ? 'bg-blue-50 border-blue-600 text-blue-900 ring-2 ring-blue-600/20'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <CreditCard className="w-4 h-4" /> Full Refund
                </button>
                <button
                  type="button"
                  onClick={() => setReturnType('REPLACEMENT')}
                  className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                    returnType === 'REPLACEMENT'
                      ? 'bg-blue-50 border-blue-600 text-blue-900 ring-2 ring-blue-600/20'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <RotateCcw className="w-4 h-4" /> Free Replacement
                </button>
              </div>
            </div>

            {/* Return Reason */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reason for Return
              </label>
              <textarea
                rows={3}
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Describe the defect or reason for return in detail..."
                className="w-full px-4 py-2.5 text-xs sm:text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-600/20"
                required
              />
            </div>

            {/* Refund Payout Details for COD */}
            {returnType === 'REFUND' && (
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-900">
                    Refund Payout Method
                  </h3>
                  <span className="text-[11px] text-slate-400">
                    Prepaid returns to source; COD to Bank/UPI
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRefundMethod('SOURCE')}
                    className={`py-2 text-xs font-bold rounded-lg border transition ${
                      refundMethod === 'SOURCE'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    Original Card / UPI
                  </button>
                  <button
                    type="button"
                    onClick={() => setRefundMethod('BANK')}
                    className={`py-2 text-xs font-bold rounded-lg border transition ${
                      refundMethod === 'BANK'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    Bank Account (COD)
                  </button>
                  <button
                    type="button"
                    onClick={() => setRefundMethod('UPI')}
                    className={`py-2 text-xs font-bold rounded-lg border transition ${
                      refundMethod === 'UPI'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-700 border-slate-200'
                    }`}
                  >
                    UPI ID (COD)
                  </button>
                </div>

                {refundMethod === 'BANK' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Bank Account Number
                      </label>
                      <input
                        type="text"
                        value={bankDetails.accountNumber}
                        onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                        placeholder="123456789012"
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Confirm Account Number
                      </label>
                      <input
                        type="password"
                        value={bankDetails.confirmAccountNumber}
                        onChange={(e) => setBankDetails({ ...bankDetails, confirmAccountNumber: e.target.value })}
                        placeholder="Re-enter Account Number"
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Bank IFSC Code
                      </label>
                      <input
                        type="text"
                        value={bankDetails.ifscCode}
                        onChange={(e) => setBankDetails({ ...bankDetails, ifscCode: e.target.value.toUpperCase() })}
                        placeholder="HDFC0001234"
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white uppercase font-mono"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Account Holder Name
                      </label>
                      <input
                        type="text"
                        value={bankDetails.accountHolderName}
                        onChange={(e) => setBankDetails({ ...bankDetails, accountHolderName: e.target.value })}
                        placeholder="Full Name as per Passbook"
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                        required
                      />
                    </div>
                  </div>
                )}

                {refundMethod === 'UPI' && (
                  <div className="pt-2">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      UPI VPA ID (e.g. yourname@okhdfcbank)
                    </label>
                    <input
                      type="text"
                      value={bankDetails.upiId}
                      onChange={(e) => setBankDetails({ ...bankDetails, upiId: e.target.value })}
                      placeholder="username@bank"
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                      required
                    />
                  </div>
                )}
              </div>
            )}

            {/* Submit Return */}
            <button
              type="submit"
              disabled={submittingReturn}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
            >
              {submittingReturn ? 'Submitting Return...' : 'Confirm Return Request'}
            </button>
          </form>
        )}
      </main>
    </div>
  );
}

export default function GuidedSupportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    }>
      <GuidedFlowContent />
    </Suspense>
  );
}
