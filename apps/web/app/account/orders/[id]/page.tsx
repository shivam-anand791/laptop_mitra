'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Order } from '@/lib/types';
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  RotateCcw,
  ShieldCheck,
  Building2,
  Loader2,
  X,
  Printer,
  ShoppingBag,
} from 'lucide-react';

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [tracking, setTracking] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [reordering, setReordering] = useState(false);

  // Return modal
  const [returnModalOpen, setReturnModalOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('Screen / Display anomaly');
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // Invoice modal
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);

  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadOrder = async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const [orderRes, trackRes] = await Promise.allSettled([
        api.getOrder(orderId),
        api.trackOrder(orderId),
      ]);

      if (orderRes.status === 'fulfilled') setOrder(orderRes.value);
      if (trackRes.status === 'fulfilled') setTracking(trackRes.value);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const handleCancelOrder = async () => {
    if (!confirm('Are you sure you want to cancel this order? Any payments will be refunded via Razorpay.')) return;
    setCancelling(true);
    try {
      const updated = await api.cancelOrder(orderId);
      setOrder(updated);
      setFeedbackMessage({ type: 'success', text: 'Order cancelled successfully. Refund initiated.' });
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err?.message || 'Failed to cancel order.' });
    } finally {
      setCancelling(false);
    }
  };

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingReturn(true);
    try {
      const res = await api.requestOrderReturn(orderId, returnReason);
      setReturnModalOpen(false);
      setFeedbackMessage({ type: 'success', text: res.message });
      loadOrder();
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err?.message || 'Failed to submit return request.' });
    } finally {
      setSubmittingReturn(false);
    }
  };

  const handleReorder = async () => {
    setReordering(true);
    try {
      const res = await api.reorder(orderId);
      setFeedbackMessage({ type: 'success', text: res.message });
      router.push('/cart');
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err?.message || 'Failed to reorder items.' });
    } finally {
      setReordering(false);
    }
  };

  const handleOpenInvoice = async () => {
    try {
      const inv = await api.getOrderInvoice(orderId);
      setInvoiceData(inv);
      setInvoiceModalOpen(true);
    } catch (err: any) {
      alert(err?.message || 'Failed to fetch invoice details.');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
        <p className="text-sm font-semibold">Loading order details...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="text-lg font-bold text-slate-900">Order Not Found</h3>
        <p className="text-xs text-slate-500">The requested order could not be located.</p>
        <Link
          href="/account/orders"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Orders
        </Link>
      </div>
    );
  }

  const isCancellable = order.status === 'PENDING' || order.status === 'CONFIRMED';
  const isReturnEligible = order.status === 'DELIVERED' && order.returnStatus === 'NONE';

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/account/orders"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              Order {order.orderNumber}
            </h2>
            <p className="text-xs text-slate-500">
              Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleOpenInvoice}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-bold transition shadow-sm"
          >
            <FileText className="w-4 h-4 text-blue-600" />
            Tax Invoice (GST)
          </button>

          <button
            onClick={handleReorder}
            disabled={reordering}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm shadow-blue-600/20"
          >
            <ShoppingBag className="w-4 h-4" />
            {reordering ? 'Adding...' : 'Reorder Items'}
          </button>
        </div>
      </div>

      {feedbackMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-2 text-xs sm:text-sm font-semibold ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          )}
          {feedbackMessage.text}
        </div>
      )}

      {/* Shipment Tracking Timeline Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-600" />
              Delivery Tracking
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Carrier: <span className="font-semibold text-slate-800">{order.carrier || 'BlueDart Express'}</span> • AWB Tracking Number:{' '}
              <span className="font-mono font-bold text-blue-600">{order.trackingNumber || `BD-${order.orderNumber}`}</span>
            </p>
          </div>
          <div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                order.status === 'DELIVERED'
                  ? 'bg-emerald-100 text-emerald-800'
                  : order.status === 'SHIPPING'
                  ? 'bg-blue-100 text-blue-800'
                  : order.status === 'CANCELLED'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {order.status}
            </span>
          </div>
        </div>

        {/* Timeline Stepper */}
        <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-blue-100">
          {(tracking?.timeline || [
            { status: 'Order Confirmed', time: order.createdAt, note: 'Payment verified & 32-point checklist scheduled' },
            { status: 'Quality Assured', time: new Date(Date.now() - 3600000).toISOString(), note: 'Thermal paste & battery health approved' },
            { status: 'In Transit', time: new Date().toISOString(), note: `Handed over to ${order.carrier || 'BlueDart Express'}` },
          ]).map((step: any, idx: number) => (
            <div key={idx} className="relative">
              <div className="absolute -left-6 sm:-left-8 top-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs shadow-md shadow-blue-600/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">{step.status}</h4>
                  <span className="text-[11px] font-medium text-slate-400">
                    {new Date(step.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">{step.note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ordered Items List */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900">Items Ordered</h3>
        <div className="divide-y divide-slate-100">
          {order.items?.map((item) => (
            <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center p-1.5 flex-shrink-0">
                  <img
                    src={item.product?.images?.[0]?.url || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=200'}
                    alt="Product"
                    className="object-contain w-full h-full"
                  />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{item.product?.name || 'Enterprise Certified Laptop'}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    SKU: {item.product?.sku || 'LM-SKU-992'} • Qty: {item.quantity}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      1-Year Assured Warranty (Active)
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <p className="text-base font-black text-slate-900">
                  ₹{Number(item.price).toLocaleString('en-IN')}
                </p>
                <span className="text-[11px] text-slate-400">Incl. 18% GST</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Address & Price Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Shipping Address */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-2">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">Delivery Address</h3>
          <p className="text-sm font-bold text-slate-900">{order.shippingAddress?.fullName || 'Customer'}</p>
          <p className="text-xs text-slate-600 leading-relaxed">
            {order.shippingAddress?.address}
            <br />
            {order.shippingAddress?.city}, {order.shippingAddress?.state} - <span className="font-semibold text-slate-900">{order.shippingAddress?.pincode}</span>
          </p>
          {order.phone && <p className="text-xs text-slate-500 pt-2">Phone: {order.phone}</p>}
          {order.shippingAddress?.label && (
            <span className="inline-block mt-2 px-2.5 py-0.5 bg-slate-100 text-slate-700 text-[11px] font-bold rounded-md">
              {order.shippingAddress.label}
            </span>
          )}
        </div>

        {/* Payment & Price Breakdown */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-2">Price Breakdown</h3>
          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>Items Subtotal</span>
            <span>₹{Number(order.subtotal).toLocaleString('en-IN')}</span>
          </div>

          {Number(order.discountAmount) > 0 && (
            <div className="flex items-center justify-between text-xs text-emerald-600 font-semibold">
              <span>Coupon Discount ({order.discountType || 'Code'})</span>
              <span>-₹{Number(order.discountAmount).toLocaleString('en-IN')}</span>
            </div>
          )}

          {Number(order.referralDiscount) > 0 && (
            <div className="flex items-center justify-between text-xs text-amber-600 font-semibold">
              <span>Mitra Referral Discount</span>
              <span>-₹{Number(order.referralDiscount).toLocaleString('en-IN')}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>Shipping & Pan-India Courier</span>
            <span className="text-emerald-600 font-semibold">FREE (Assured Delivery)</span>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-600">
            <span>Tax (18% Integrated GST)</span>
            <span>Included</span>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-base font-black text-slate-900">
            <span>Grand Total</span>
            <span className="text-blue-600">₹{Number(order.finalAmount).toLocaleString('en-IN')}</span>
          </div>

          <div className="pt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Paid via Razorpay Secure Gateway ({order.paymentId || 'Verified'})</span>
          </div>
        </div>
      </div>

      {/* Bottom Danger / Return Actions Bar */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Order Management & Assistance</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Need changes, return inspection, or technical diagnostic help?
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isReturnEligible && (
            <button
              onClick={() => setReturnModalOpen(true)}
              className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold border border-amber-200 transition"
            >
              <RotateCcw className="w-3.5 h-3.5 inline mr-1.5" />
              Request Return / Replacement
            </button>
          )}

          {isCancellable && (
            <button
              onClick={handleCancelOrder}
              disabled={cancelling}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold border border-rose-200 transition"
            >
              {cancelling ? 'Cancelling...' : 'Cancel Order'}
            </button>
          )}

          <Link
            href="/account/warranty-support"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition"
          >
            Contact Support
          </Link>
        </div>
      </div>

      {/* Return Request Modal */}
      {returnModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Request Return / Replacement</h3>
              <button onClick={() => setReturnModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleReturnSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Select Reason *</label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-blue-500 outline-none bg-white font-medium"
                >
                  <option value="Screen / Display anomaly">Screen / Display anomaly</option>
                  <option value="Battery backup below standard">Battery backup below standard</option>
                  <option value="Keyboard / TrackPoint issue">Keyboard / TrackPoint issue</option>
                  <option value="Performance / Thermal throttling">Performance / Thermal throttling</option>
                  <option value="Cosmetic defect not matching grade">Cosmetic defect not matching grade</option>
                  <option value="Other technical diagnostic issue">Other technical diagnostic issue</option>
                </select>
              </div>

              <p className="text-xs text-slate-500 leading-relaxed">
                Our logistics partner will arrange a doorstep inspection and complimentary reverse pickup within 24-48 business hours.
              </p>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setReturnModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReturn}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 transition flex items-center gap-1.5"
                >
                  {submittingReturn && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {submittingReturn ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tax Invoice Modal */}
      {invoiceModalOpen && invoiceData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Building2 className="w-6 h-6 text-blue-600" />
                <h3 className="text-lg font-bold text-slate-900">Tax Invoice / Receipt</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="p-2 text-slate-600 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition"
                  title="Print Invoice"
                >
                  <Printer className="w-5 h-5" />
                </button>
                <button onClick={() => setInvoiceModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Invoice Header */}
            <div className="flex flex-wrap items-start justify-between gap-4 text-xs">
              <div>
                <h4 className="font-bold text-sm text-slate-900">{invoiceData.seller.name}</h4>
                <p className="text-slate-500 leading-relaxed mt-0.5">
                  {invoiceData.seller.address}
                  <br />
                  GSTIN: <span className="font-mono font-bold text-slate-900">{invoiceData.seller.gstin}</span>
                </p>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block font-medium">Invoice Number</span>
                <span className="font-mono font-bold text-slate-900 text-sm">{invoiceData.invoiceNumber}</span>
                <span className="text-slate-500 block mt-1">Date: {new Date(invoiceData.issuedAt).toLocaleDateString('en-IN')}</span>
              </div>
            </div>

            {/* Invoice Line Items */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3">Item Description</th>
                    <th className="p-3 text-center">Qty</th>
                    <th className="p-3 text-right">Unit Price</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoiceData.order.items?.map((it: any) => (
                    <tr key={it.id}>
                      <td className="p-3 font-semibold text-slate-900">{it.product?.name || 'Laptop'}</td>
                      <td className="p-3 text-center">{it.quantity}</td>
                      <td className="p-3 text-right">₹{Number(it.price).toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right font-bold">₹{(Number(it.price) * it.quantity).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tax Computation */}
            <div className="bg-slate-50 rounded-2xl p-4 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Taxable Amount</span>
                <span>₹{invoiceData.taxBreakdown.taxableAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Central GST (CGST 9%)</span>
                <span>₹{invoiceData.taxBreakdown.cgst.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>State GST (SGST 9%)</span>
                <span>₹{invoiceData.taxBreakdown.sgst.toLocaleString('en-IN')}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-sm text-slate-900">
                <span>Total Amount Paid</span>
                <span className="text-blue-600">₹{invoiceData.taxBreakdown.grandTotal.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 text-center">
              This is a computer-generated tax invoice verified under the Indian GST regime. 1-Year Comprehensive Warranty backed by LaptopMitra.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
