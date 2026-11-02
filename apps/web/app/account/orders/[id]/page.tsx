'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Order } from '@/lib/types';
import { useSupportConfig } from '@/lib/support-config';
import {
  getOrderTimelineSteps,
  formatIndianRupees,
  canCancelOrder,
  canReturnOrder,
  canDownloadInvoice,
} from '@/lib/account-helpers';
import {
  OrderStatusChip,
  PaymentText,
  ConfirmDialog,
  ErrorState,
} from '@/components/account';
import {
  ArrowLeft,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw,
  ShieldCheck,
  Building2,
  Loader2,
  X,
  Printer,
  ShoppingBag,
  HelpCircle,
  FileText,
  Copy,
  Check,
  AlertCircle,
  Package,
} from 'lucide-react';

const RETURN_REASONS = [
  'Quality or performance issue',
  'Damaged or defective on arrival',
  'Different model or specs received',
  'Missing accessories or charger',
  'No longer needed / Changed mind',
];

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;
  const { data: supportConfig } = useSupportConfig();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Cancellation state
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // Return modal state
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnReason, setReturnReason] = useState(RETURN_REASONS[0]);
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);

  // Reorder state
  const [isReordering, setIsReordering] = useState(false);

  // Invoice modal state
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);

  // In-page notification banner
  const [banner, setBanner] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showBanner = useCallback((type: 'success' | 'error', message: string) => {
    setBanner({ type, message });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setTimeout(() => {
      setBanner((prev) => (prev?.message === message ? null : prev));
    }, 6000);
  }, []);

  const handleOpenInvoice = useCallback(async () => {
    if (!order) return;
    setLoadingInvoice(true);
    try {
      const inv = await api.getOrderInvoice(order.id);
      setInvoiceData(inv);
      setInvoiceModalOpen(true);
    } catch (err: any) {
      showBanner('error', err?.message || 'Failed to fetch tax invoice details.');
    } finally {
      setLoadingInvoice(false);
    }
  }, [order, showBanner]);

  const loadOrder = useCallback(async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getOrder(orderId);
      setOrder(data);
    } catch (err: any) {
      setError(
        err?.message || 'Unable to load order details. Please check your connection.'
      );
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();

    const onFocus = () => {
      if (document.visibilityState === 'visible') {
        loadOrder();
      }
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [loadOrder]);

  useEffect(() => {
    if (!order) return;
    const inProgress = ['PENDING', 'CONFIRMED', 'SHIPPING'].includes(order.status);
    if (!inProgress) return;

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadOrder();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [order, loadOrder]);

  // Handle #invoice URL hash
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#invoice' && order) {
      void handleOpenInvoice();
    }
  }, [order, handleOpenInvoice]);

  const handleCopyOrderNumber = () => {
    if (order?.orderNumber && navigator?.clipboard) {
      navigator.clipboard.writeText(order.orderNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConfirmCancel = async () => {
    if (!order) return;
    setIsCancelling(true);
    try {
      const updated = await api.cancelOrder(order.id);
      setOrder(updated);
      setCancelDialogOpen(false);
      showBanner(
        'success',
        `Order #${order.orderNumber} has been successfully cancelled. Refund initiated to original payment source.`
      );
    } catch (err: any) {
      showBanner(
        'error',
        err?.message || 'Failed to cancel order. Please contact support.'
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    setIsSubmittingReturn(true);
    try {
      const res = await api.requestOrderReturn(order.id, returnReason);
      setReturnModalOpen(false);
      showBanner(
        'success',
        res.message || 'Return request submitted. Our executive will contact you for pickup.'
      );
      loadOrder();
    } catch (err: any) {
      showBanner(
        'error',
        err?.message || 'Failed to submit return request. Please contact support.'
      );
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  const handleReorder = async () => {
    if (!order) return;
    setIsReordering(true);
    try {
      const res = await api.reorder(order.id);
      showBanner('success', res.message || 'Items added to your cart.');
      router.push('/cart');
    } catch (err: any) {
      showBanner('error', err?.message || 'Failed to reorder items.');
    } finally {
      setIsReordering(false);
    }
  };

  // Eligibility evaluation
  const items = order?.items || [];
  const firstItem = items[0];
  const isLease = firstItem?.purchaseMode === 'lease';

  const canCancel = order ? canCancelOrder(order.status) : false;
  const deliveredAt = order?.deliveries?.[0]?.deliveredAt || (order?.status === 'DELIVERED' ? order.updatedAt : null);
  const returnCheck = order
    ? canReturnOrder(order.status, deliveredAt, supportConfig?.returnWindowDays ?? 0, order.returnStatus, isLease)
    : { eligible: false };
  const canReturn = returnCheck.eligible;
  const canInvoice = order
    ? canDownloadInvoice(order.paymentStatus, order.status, isLease)
    : false;

  // Real-data backed timeline steps
  const timelineSteps = useMemo(() => {
    if (!order) return [];
    return getOrderTimelineSteps({
      status: order.status,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      trackingNumber: order.trackingNumber,
      carrier: order.carrier,
      deliveries: order.deliveries,
      returnStatus: order.returnStatus,
    });
  }, [order]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center space-y-3 shadow-2xs">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-blue-600" />
        <p className="text-xs font-semibold text-slate-600">Loading order details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <ErrorState
        title="Order Not Found"
        message={error || 'The requested order could not be located in your account.'}
        onRetry={loadOrder}
      />
    );
  }

  const orderDateStr = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  return (
    <div className="space-y-6">
      {/* Top Banner Alert */}
      {banner && (
        <div
          role="status"
          aria-live="polite"
          className={`p-4 rounded-2xl border flex items-center justify-between gap-3 text-xs font-medium animate-in fade-in duration-200 ${
            banner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {banner.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            )}
            <span>{banner.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="text-slate-400 hover:text-slate-700 p-1"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/account/orders"
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 transition"
              aria-label="Back to Orders"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900">
                  Order #{order.orderNumber}
                </h1>
                <button
                  type="button"
                  onClick={handleCopyOrderNumber}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded transition"
                  title="Copy order number"
                  aria-label="Copy order number"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Placed on {orderDateStr}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center">
            <OrderStatusChip
              status={order.status}
              paymentStatus={order.paymentStatus}
              returnStatus={order.returnStatus}
            />
          </div>
        </div>

        {/* Quick Actions Row */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
          {canInvoice ? (
            <button
              type="button"
              onClick={handleOpenInvoice}
              disabled={loadingInvoice}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              {loadingInvoice ? 'Loading...' : 'Download Invoice (GST)'}
            </button>
          ) : isLease ? (
            <span className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              Lease invoices are issued monthly by our billing team
            </span>
          ) : order.paymentMethod === 'cod' && order.status !== 'DELIVERED' ? (
            <span className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              Invoice generated after delivery payment
            </span>
          ) : null}

          <Link
            href={`/help/guided-flow?orderId=${order.id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition shadow-2xs"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
            Need Help?
          </Link>

          <button
            type="button"
            onClick={handleReorder}
            disabled={isReordering}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs disabled:opacity-50"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            {isReordering ? 'Adding...' : 'Buy Again'}
          </button>
        </div>
      </div>

      {/* Real Progress Tracker (Placed, Confirmed, Shipped, Delivered) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-2xs space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Truck className="w-4 h-4 text-blue-600" />
              Shipment Progress
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {order.status === 'DELIVERED' ? (
                <span className="text-emerald-700 font-semibold">Delivered to your address</span>
              ) : order.trackingNumber ? (
                <span>
                  Dispatched via <strong className="text-slate-800">{order.carrier || 'Express'}</strong> • Tracking:{' '}
                  <span className="font-mono font-semibold text-slate-900">{order.trackingNumber}</span>
                </span>
              ) : (
                <span>We&apos;ll confirm your delivery date soon</span>
              )}
            </p>
          </div>
        </div>

        {/* Stepper Steps (Only real-data backed steps) */}
        <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {timelineSteps.map((step) => {
            const stepDateStr = step.timestamp
              ? new Date(step.timestamp).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : null;

            return (
              <div key={step.key} className="relative">
                <div
                  className={`absolute -left-6 sm:-left-8 top-0 w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    step.isCancelled
                      ? 'bg-rose-600 text-white shadow-xs'
                      : step.isCompleted
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white border-2 border-slate-300 text-slate-400'
                  }`}
                >
                  {step.isCancelled ? (
                    <XCircle className="w-3.5 h-3.5" />
                  ) : step.isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <Clock className="w-3.5 h-3.5" />
                  )}
                </div>

                <div
                  className={`rounded-xl p-4 border transition ${
                    step.isCurrent
                      ? 'bg-blue-50/50 border-blue-200 shadow-2xs'
                      : 'bg-slate-50/70 border-slate-200/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                      {step.label}
                    </h3>
                    {stepDateStr && (
                      <span className="text-[11px] font-medium text-slate-500">
                        {stepDateStr}
                      </span>
                    )}
                  </div>
                  {step.description && (
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Ordered Items List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-2xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Items Ordered ({items.length})
        </h2>

        <div className="divide-y divide-slate-100">
          {items.map((item) => {
            const itemIsLease = item.purchaseMode === 'lease';
            const unitPrice = Number(item.price);
            const warrantyAmount = !itemIsLease && item.hasWarranty ? Number(item.warrantyPrice || 1999) : 0;
            const lineTotal = (unitPrice + warrantyAmount) * item.quantity;
            const primaryImage =
              item.product?.images?.find((img: any) => img.isPrimary)?.url ||
              item.product?.images?.[0]?.url ||
              null;

            const standardWarrantyMonths = supportConfig
              ? Math.max(1, Math.round(supportConfig.standardWarrantyDays / 30))
              : null;
            const warrantyLabel = standardWarrantyMonths
              ? `${standardWarrantyMonths * (item.hasWarranty ? 2 : 1)}-Month Assured Warranty Included`
              : 'Warranty duration unavailable';

            return (
              <div
                key={item.id}
                className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center p-1.5 flex-shrink-0">
                    {primaryImage ? (
                      <img
                        src={primaryImage}
                        alt={item.product?.name || 'Laptop'}
                        className="object-contain w-full h-full rounded"
                      />
                    ) : (
                      <Package className="w-6 h-6 text-slate-400" />
                    )}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                          itemIsLease
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {itemIsLease ? 'Rent / mo' : 'Buy'}
                      </span>
                      <h3 className="font-bold text-sm text-slate-900 truncate">
                        {item.product?.name || 'Certified Refurbished Laptop'}
                      </h3>
                    </div>

                    {item.variantAttributes && (
                      <p className="text-xs text-slate-600">
                        {Object.entries(item.variantAttributes)
                          .map(([key, value]) => `${key}: ${String(value)}`)
                          .join(' • ')}
                      </p>
                    )}

                    <p className="text-xs text-slate-500">
                      Qty: {item.quantity} • {itemIsLease ? 'Quarterly Servicing Included' : warrantyLabel}
                    </p>

                    {itemIsLease && (
                      <p className="text-[11px] text-purple-700 font-medium">
                        Month 1 advance, {formatIndianRupees(unitPrice)}/month thereafter. Later months are invoiced separately.
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-left sm:text-right flex-shrink-0">
                  <p className="text-base font-bold text-slate-900">
                    {formatIndianRupees(lineTotal)}
                  </p>
                  <span className="text-[11px] text-slate-400 block">
                    {itemIsLease ? 'Month 1 advance • Incl. GST' : 'Incl. 18% GST'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Address & Price Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Delivery Address */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-2">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
            Delivery Address
          </h2>
          <p className="text-sm font-bold text-slate-900">
            {order.shippingAddress?.fullName || 'Customer'}
          </p>
          <p className="text-xs text-slate-600 leading-relaxed">
            {order.shippingAddress?.address}
            <br />
            {order.shippingAddress?.city}, {order.shippingAddress?.state} -{' '}
            <span className="font-semibold text-slate-900">
              {order.shippingAddress?.pincode}
            </span>
          </p>
          {order.phone && (
            <p className="text-xs text-slate-500 pt-1">Phone: {order.phone}</p>
          )}
          {order.shippingAddress?.label && (
            <span className="inline-block mt-2 px-2.5 py-0.5 bg-slate-100 text-slate-700 text-[11px] font-semibold rounded-md">
              {order.shippingAddress.label}
            </span>
          )}
        </div>

        {/* Payment & Price Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-3">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
            Price Breakdown
          </h2>

          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>Items Subtotal</span>
            <span>{formatIndianRupees(order.subtotal)}</span>
          </div>

          {Number(order.discountAmount) > 0 && (
            <div className="flex items-center justify-between text-xs text-emerald-700 font-medium">
              <span>Coupon Discount ({order.discountType || 'Code'})</span>
              <span>-{formatIndianRupees(order.discountAmount)}</span>
            </div>
          )}

          {Number(order.referralDiscount) > 0 && (
            <div className="flex items-center justify-between text-xs text-amber-700 font-medium">
              <span>Mitra Affiliate Discount</span>
              <span>-{formatIndianRupees(order.referralDiscount || 0)}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>Pan-India Shipping</span>
            <span className="text-emerald-700 font-semibold">FREE</span>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>Tax (18% Integrated GST)</span>
            <span>Included</span>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-base font-bold text-slate-900">
            <span>Grand Total</span>
            <span className="text-blue-600">{formatIndianRupees(order.finalAmount)}</span>
          </div>

          <div className="pt-2 border-t border-slate-50">
            <PaymentText
              amount={order.finalAmount}
              paymentStatus={order.paymentStatus}
              paymentMethod={order.paymentMethod}
              status={order.status}
              returnStatus={order.returnStatus}
            />
          </div>
        </div>
      </div>

      {/* Bottom Action Center */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Order Management &amp; Support</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Doorstep diagnostics, certified replacement, or cancellation assistance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {canReturn && (
            <button
              type="button"
              onClick={() => setReturnModalOpen(true)}
              className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded-xl text-xs font-semibold border border-amber-200 transition cursor-pointer inline-flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Request Return / Replacement
            </button>
          )}

          {canCancel && (
            <button
              type="button"
              onClick={() => setCancelDialogOpen(true)}
              disabled={isCancelling}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-semibold border border-rose-200 transition cursor-pointer inline-flex items-center gap-1.5"
            >
              <XCircle className="w-3.5 h-3.5" />
              Cancel Order
            </button>
          )}

          <Link
            href={`/account/warranty-support?orderId=${order.id}`}
            className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition inline-flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            Warranty Support
          </Link>
        </div>
      </div>

      {/* Confirm Dialog: Cancel Order */}
      <ConfirmDialog
        isOpen={cancelDialogOpen}
        title="Cancel Order"
        message={`Are you sure you want to cancel order #${order.orderNumber}? If payment was already completed, an automatic refund will be credited to your original payment method.`}
        confirmLabel={isCancelling ? 'Cancelling...' : 'Yes, Cancel Order'}
        cancelLabel="Keep Order"
        isDestructive={true}
        isLoading={isCancelling}
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancelDialogOpen(false)}
      />

      {/* Return Request Modal */}
      {returnModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity"
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-return-modal-title"
        >
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-800 border border-amber-100 flex items-center justify-center flex-shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="order-return-modal-title" className="text-base font-bold text-slate-900">
                    Request Return / Replacement
                  </h3>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Order #{order.orderNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReturnModalOpen(false)}
                disabled={isSubmittingReturn}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {supportConfig?.returnWindowDays
                ? `Submit your request within ${supportConfig.returnWindowDays} days of delivery. Please select the primary reason:`
                : 'Return eligibility follows the current policy. Please select the primary reason:'}
            </p>

            <form onSubmit={handleReturnSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-700 block">
                  Select Reason:
                </label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none focus:border-blue-600"
                >
                  {RETURN_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReturnModalOpen(false)}
                  disabled={isSubmittingReturn}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReturn}
                  className="px-4 py-2 text-xs font-semibold bg-amber-800 hover:bg-amber-900 text-white rounded-xl transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isSubmittingReturn ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tax Invoice Modal */}
      {invoiceModalOpen && invoiceData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-opacity"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invoice-modal-title"
        >
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden p-6 sm:p-8 max-h-[90vh] overflow-y-auto space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-6 h-6 text-blue-600" />
                <h3 id="invoice-modal-title" className="text-base sm:text-lg font-bold text-slate-900">
                  Tax Invoice / Receipt
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="p-2 text-slate-600 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition"
                  title="Print Invoice"
                  aria-label="Print Invoice"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
                  aria-label="Close dialog"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Printable Invoice Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 text-xs">
              <div>
                <h4 className="font-bold text-sm text-slate-900">{invoiceData.seller?.name || 'LaptopMitra Technologies Pvt Ltd'}</h4>
                <p className="text-slate-500 leading-relaxed mt-0.5">
                  {invoiceData.seller?.address || 'Pan-India Operations Hub, New Delhi, India'}
                  <br />
                  GSTIN: <span className="font-mono font-bold text-slate-900">{invoiceData.seller?.gstin || '07AABCL1234F1Z5'}</span>
                </p>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block font-medium">Invoice Number</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{invoiceData.invoiceNumber}</span>
                <span className="text-slate-500 block mt-1">
                  Date: {new Date(invoiceData.issuedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>

            {/* Invoice Line Items */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Description</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Unit Price</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoiceData.order?.items?.map((it: any) => {
                    const itIsLease = it.purchaseMode === 'lease';
                    const unitPrice = Number(it.price);
                    const warrantyPrice = !itIsLease && it.hasWarranty ? Number(it.warrantyPrice || 1999) : 0;
                    const totalLine = (unitPrice + warrantyPrice) * it.quantity;

                    return (
                      <tr key={it.id}>
                        <td className="p-3">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5 flex-wrap">
                            <span>{it.product?.name || 'Laptop'}</span>
                            <span
                              className={`inline-flex px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                                itIsLease
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {itIsLease ? 'Rent' : 'Buy'}
                            </span>
                            {it.hasWarranty && !itIsLease && (
                              <span className="inline-flex px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                {supportConfig
                                  ? `${Math.max(1, Math.round(supportConfig.standardWarrantyDays / 30)) * 2}-Month Assured Warranty`
                                  : 'Extended Assured Warranty'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center">{it.quantity}</td>
                        <td className="p-3 text-right">{formatIndianRupees(unitPrice)}</td>
                        <td className="p-3 text-right font-bold">{formatIndianRupees(totalLine)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Tax Computation */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Taxable Amount</span>
                <span>{formatIndianRupees(invoiceData.taxBreakdown?.taxableAmount || 0)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Central GST (CGST 9%)</span>
                <span>{formatIndianRupees(invoiceData.taxBreakdown?.cgst || 0)}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>State GST (SGST 9%)</span>
                <span>{formatIndianRupees(invoiceData.taxBreakdown?.sgst || 0)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
                <span>Total Amount Paid</span>
                <span className="text-blue-600">{formatIndianRupees(invoiceData.taxBreakdown?.grandTotal || 0)}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              Computer-generated tax invoice verified under the Indian GST regime. Backed by LaptopMitra Assured Warranty.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
