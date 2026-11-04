'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { adminApi } from '../../../../lib/admin-api';
import { useAdminOrder, useUpdateOrderStatus } from '../../../../lib/admin-queries';
import {
  OrderStatus,
  ORDER_TRANSITION_MAP,
  AdminProduct,
  parseShippingAddress,
  DeliveryRecord,
  PaymentTransactionRecord,
} from '../../../../lib/types';
import { formatINR, formatDate, toNumber } from '../../../../lib/format';
import { QueryState } from '../../../../components/admin/QueryState';
import Modal, { ConfirmModal } from '../../../../components/ui/Modal';
import { useToast } from '../../../../components/ui/Toast';
import Button from '../../../../components/ui/Button';

// ---------------------------------------------------------------------------
// Status Badge Helpers
// ---------------------------------------------------------------------------

function OrderStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: 'badge-warning',
    CONFIRMED: 'badge-info',
    SHIPPING: 'badge-primary',
    DELIVERED: 'badge-success',
    CANCELLED: 'badge-danger',
    REFUNDED: 'badge-gray',
  };
  return <span className={`badge ${styles[status] || 'badge-gray'}`}>{status}</span>;
}

function PaymentStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: 'badge-warning',
    PROCESSING: 'badge-info',
    COMPLETED: 'badge-success',
    FAILED: 'badge-danger',
    REFUNDED: 'badge-gray',
  };
  return <span className={`badge ${styles[status] || 'badge-gray'}`}>{status}</span>;
}

// ---------------------------------------------------------------------------
// Order Details Page Component
// ---------------------------------------------------------------------------

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = (params?.id as string) || '';
  const { addToast } = useToast();

  const {
    data: order,
    isLoading,
    error,
    refetch,
  } = useAdminOrder(id);

  const updateStatusMutation = useUpdateOrderStatus();

  // State machine transition state
  const [modalTransition, setModalTransition] = useState<OrderStatus | null>(null);

  // Courier / Tracking dispatch modal state
  const [shippingModalOpen, setShippingModalOpen] = useState(false);
  const [courierName, setCourierName] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [shippingError, setShippingError] = useState('');
  const [serialInputs, setSerialInputs] = useState<Record<string, string>>({});
  const [overrideDispatch, setOverrideDispatch] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  // Legal transitions according to authoritative transition map
  const currentStatus = (order?.status as OrderStatus) || 'PENDING';
  const allowedTransitions = (ORDER_TRANSITION_MAP[currentStatus] || []) as readonly OrderStatus[];

  // Execute status update with error boundary
  const executeStatusUpdate = async (
    targetStatus: string,
    trackingInfo?: {
      courierName?: string;
      trackingNumber?: string;
      serialAssignments?: Array<{ orderItemId: string; unitIndex: number; serialNumber: string }>;
      overrideReason?: string;
    },
  ) => {
    try {
      await updateStatusMutation.mutateAsync({
        id,
        status: targetStatus,
        courierName: trackingInfo?.courierName,
        trackingNumber: trackingInfo?.trackingNumber,
        serialAssignments: trackingInfo?.serialAssignments,
        overrideReason: trackingInfo?.overrideReason,
      });
      addToast('success', `Order #${order?.orderNumber || id.slice(-8)} transitioned to ${targetStatus}`);
      setModalTransition(null);
      setShippingModalOpen(false);
    } catch (err: unknown) {
      const serverMessage =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to update order status. Please verify transition rules.';
      addToast('error', serverMessage);
      if (shippingModalOpen) {
        setShippingError(serverMessage);
      }
    }
  };

  const handleInitiateTransition = (targetStatus: string) => {
    if (!targetStatus) return;

    if (targetStatus === 'SHIPPING') {
      setCourierName(order?.deliveries?.[0]?.carrier || order?.carrier || 'BlueDart');
      setTrackingNumber(order?.deliveries?.[0]?.trackingNumber || order?.trackingNumber || '');
      setShippingError('');
      setOverrideDispatch(false);
      setOverrideReason('');
      setShippingModalOpen(true);
      return;
    }

    // Destructive moves require explicit admin confirmation modal explaining stock changes
    if (targetStatus === 'CANCELLED' || targetStatus === 'REFUNDED') {
      setModalTransition(targetStatus as OrderStatus);
    } else {
      executeStatusUpdate(targetStatus);
    }
  };

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courierName.trim() || !trackingNumber.trim()) {
      setShippingError('Both courier partner and tracking number are required to dispatch this shipment.');
      return;
    }

    const activeItems = order?.items?.filter((i: any) => i.status !== 'CANCELLED') || [];
    let serialAssignments: Array<{ orderItemId: string; unitIndex: number; serialNumber: string }> | undefined = undefined;

    if (!overrideDispatch) {
      const assignments: Array<{ orderItemId: string; unitIndex: number; serialNumber: string }> = [];
      for (const item of activeItems) {
        for (let u = 1; u <= (item.quantity || 1); u++) {
          const val = serialInputs[`${item.id}-${u}`]?.trim();
          if (!val) {
            setShippingError(`Serial number is required for "${item.product?.name || 'Item'}" (Unit ${u} of ${item.quantity}). Or check "Emergency Admin Override".`);
            return;
          }
          assignments.push({ orderItemId: item.id, unitIndex: u, serialNumber: val });
        }
      }

      const serials = assignments.map((a) => a.serialNumber.toLowerCase());
      if (new Set(serials).size !== serials.length) {
        setShippingError('Duplicate serial numbers entered. Each physical unit must have a unique serial number.');
        return;
      }
      serialAssignments = assignments;
    } else {
      if (!overrideReason.trim()) {
        setShippingError('An explanation reason is mandatory when overriding serial number tracking.');
        return;
      }
    }

    setShippingError('');
    executeStatusUpdate('SHIPPING', {
      courierName: courierName.trim(),
      trackingNumber: trackingNumber.trim(),
      serialAssignments,
      overrideReason: overrideDispatch ? overrideReason.trim() : undefined,
    });
  };

  const handleCancelItem = async (itemId: string, productName: string) => {
    const reason = window.prompt(`Enter reason for cancelling ${productName}:`, 'Staff pre-dispatch cancellation');
    if (!reason || !order) return;
    try {
      await adminApi.adminCancelOrderItem(order.id, itemId, reason);
      addToast('success', 'Item cancelled and inventory restored.');
      refetch();
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to cancel item.');
    }
  };


  // Safe typed parsing of shipping address
  const shipping = parseShippingAddress(order?.shippingAddress);
  const primaryDelivery: DeliveryRecord | undefined = order?.deliveries?.[0];
  const paymentRecords: PaymentTransactionRecord[] = order?.payments || [];

  return (
    <div className="space-y-6">
      {/* Navigation & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-100 dark:border-gray-800">
        <div className="space-y-1">
          <Link
            href="/admin/orders"
            className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-medium mb-1"
          >
            <span>←</span> Back to Orders
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white font-mono">
              Order #{order?.orderNumber || (id ? id.slice(-8) : '...')}
            </h1>
            {order && (
              <>
                <OrderStatusBadge status={order.status} />
                <PaymentStatusBadge status={order.paymentStatus} />
              </>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Placed on {order ? formatDate(order.createdAt) : '...'} • Last updated{' '}
            {order ? formatDate(order.updatedAt) : '...'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => refetch()}
            disabled={isLoading || updateStatusMutation.isPending}
          >
            ↻ Refresh
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => window.print()}
          >
            🖨️ Print Invoice
          </Button>
        </div>
      </div>

      <QueryState
        isLoading={isLoading}
        error={error}
        isEmpty={!order}
        onRetry={() => refetch()}
        emptyTitle="Order Not Found"
        emptyMessage={`No order record could be found matching identifier: ${id}`}
        emptyAction={
          <Button size="sm" variant="primary" onClick={() => router.push('/admin/orders')}>
            Return to Orders List
          </Button>
        }
      >
        {order && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: Order Details, Line Items, Delivery, Shipping */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Items Table */}
              <div className="card overflow-hidden">
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                    Purchased Items ({order.items?.length || 0})
                  </h2>
                  <span className="text-xs text-gray-500">
                    {order.items?.reduce((sum, item) => sum + (item.quantity || 1), 0) || 0} total units
                  </span>
                </div>

                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {order.items && order.items.length > 0 ? (
                    order.items.map((item) => {
                      const product = item.product as AdminProduct | undefined;
                      const primaryImg = product?.images?.[0]?.url;
                      const lineTotal = toNumber(item.price) * (item.quantity || 1);

                      return (
                        <div key={item.id} className="p-4 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 overflow-hidden flex items-center justify-center shrink-0 border border-gray-200 dark:border-gray-700">
                              {primaryImg ? (
                                <Image
                                  src={primaryImg}
                                  alt={product?.name || 'Product'}
                                  width={48}
                                  height={48}
                                  className="w-full h-full object-cover"
                                  unoptimized
                                />
                              ) : (
                                <span className="text-lg">💻</span>
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-900 dark:text-white">
                                {product?.name || `Product ID: ${item.productId}`}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">
                                <span className="font-mono">SKU: {item.variantSku || product?.sku || 'N/A'}</span>
                                <span>•</span>
                                <span>Qty: {item.quantity} × {formatINR(item.price)}</span>
                              </div>
                              {item.variantAttributes && (
                                <p className="mt-1 text-[11px] text-gray-600 dark:text-gray-400">
                                  {Object.entries(item.variantAttributes).map(([key, value]) => `${key}: ${String(value)}`).join(' · ')}
                                </p>
                              )}
                              {((item as any).soldUnits || []).length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {((item as any).soldUnits || []).map((unit: any) => (
                                    <div key={unit.id} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-[11px]">
                                      <span className="text-gray-500">Unit {unit.unitIndex}:</span>
                                      {unit.serialNumber ? (
                                        <Link
                                          href={`/admin/service/units/${encodeURIComponent(unit.serialNumber)}`}
                                          className="font-mono font-semibold text-primary hover:underline"
                                        >
                                          {unit.serialNumber}
                                        </Link>
                                      ) : (
                                        <span className="font-mono text-amber-600 dark:text-amber-400">No serial (override)</span>
                                      )}
                                      {unit.warrantyCoverage && (
                                        <span className={`text-[10px] px-1 rounded font-medium ${
                                          unit.warrantyCoverage.status === 'ACTIVE'
                                            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                                            : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                                        }`}>
                                          {unit.warrantyCoverage.status}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0 flex flex-col items-end gap-1">
                            <p className="text-xs font-bold text-gray-900 dark:text-white">
                              {formatINR(lineTotal)}
                            </p>
                            <span className="text-[10px] text-gray-400">Line total</span>
                            {item.status === 'CANCELLED' ? (
                              <span className="inline-block px-2 py-0.5 text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 rounded">
                                Cancelled
                              </span>
                            ) : ['PENDING', 'CONFIRMED'].includes(order.status) ? (
                              <button
                                type="button"
                                onClick={() => handleCancelItem(item.id, product?.name || 'Item')}
                                className="text-[10px] text-rose-600 hover:text-rose-800 underline font-medium cursor-pointer"
                              >
                                Cancel item
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-6 text-center text-xs text-gray-500">
                      No order items registered for this order.
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery & Tracking */}
              <div className="card p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                    Fulfillment & Shipping Tracking
                  </h2>
                  <span className="badge badge-info text-[10px]">
                    {primaryDelivery?.status ? String(primaryDelivery.status) : order.status}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1">
                  <div>
                    <span className="text-gray-500 block text-[11px]">Carrier</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {primaryDelivery?.carrier || order.carrier || (order.status === 'SHIPPING' || order.status === 'DELIVERED' ? 'Courier Assigned' : 'Awaiting dispatch')}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[11px]">Tracking Number (AWB)</span>
                    <span className="font-mono font-medium text-gray-900 dark:text-white">
                      {primaryDelivery?.trackingNumber || order.trackingNumber || 'Not assigned yet'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[11px]">Shipped Timestamp</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {primaryDelivery?.shippedAt
                        ? formatDate(primaryDelivery.shippedAt)
                        : order.status === 'SHIPPING' || order.status === 'DELIVERED'
                        ? 'Dispatched'
                        : 'Awaiting dispatch'}
                    </span>
                  </div>
                </div>
              </div>


              {/* Customer & Shipping Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer Contact */}
                <div className="card p-4 space-y-3">
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider border-b border-gray-100 dark:border-gray-800 pb-2">
                    Customer Information
                  </h3>
                  <div className="space-y-1.5 text-xs">
                    <div>
                      <span className="text-gray-500 block text-[11px]">Name</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {order.user?.name || shipping.fullName || 'Guest Customer'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[11px]">Email</span>
                      <span className="text-gray-900 dark:text-white">{order.email || order.user?.email || '—'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[11px]">Contact Phone</span>
                      <span className="text-gray-900 dark:text-white">{order.phone || shipping.phone || order.user?.phone || '—'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block text-[11px]">User Account Status</span>
                      <span className="inline-block mt-0.5 font-mono text-[11px] text-gray-600 dark:text-gray-400">
                        {order.user?.role || 'CUSTOMER'} ({order.user?.status || 'ACTIVE'})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Delivery Address */}
                <div className="card p-4 space-y-3">
                  <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider border-b border-gray-100 dark:border-gray-800 pb-2">
                    Shipping Destination
                  </h3>
                  <div className="space-y-1 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                    <p className="font-semibold text-gray-900 dark:text-white">{shipping.fullName || order.user?.name || 'Customer'}</p>
                    <p>{shipping.address || 'Standard Delivery Address'}</p>
                    <p>
                      {[shipping.city, shipping.state, shipping.pincode].filter(Boolean).join(', ') || 'Address information on file'}
                    </p>
                    {shipping.landmark && <p className="text-gray-500 text-[11px]">Landmark: {shipping.landmark}</p>}
                    <p className="text-gray-500 text-[11px] pt-1">Phone: {shipping.phone || order.phone || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Order Notes */}
              <div className="card p-4 space-y-2">
                <h3 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                  Order Instructions & Notes
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                  {order.notes || 'No customer or operational instructions specified for this order.'}
                </p>
              </div>
            </div>

            {/* Right Column: Status Transition Controller, Financial Breakdown & Payment Info */}
            <div className="space-y-6">
              {/* Status State Machine Controller */}
              <div className="card p-5 space-y-4 border-2 border-primary/20 dark:border-primary/30">
                <div className="flex items-center justify-between">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
                    Order Status Workflow
                  </h2>
                  <span className="text-[11px] font-mono text-gray-500">
                    Phase 3 Map
                  </span>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/60 p-3 rounded-xl space-y-1">
                  <span className="text-[11px] text-gray-500 block">Current Status</span>
                  <div className="flex items-center gap-2">
                    <OrderStatusBadge status={order.status} />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      {order.status === 'CANCELLED' || order.status === 'REFUNDED'
                        ? 'Terminal Status'
                        : 'Active Lifecycle'}
                    </span>
                  </div>
                </div>

                {/* State Machine Transition Options */}
                {allowedTransitions.length > 0 ? (
                  <div className="space-y-3 pt-1">
                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block">
                      Permitted Next Status:
                    </label>

                    <div className="space-y-2">
                      {allowedTransitions.map((nextStatus) => {
                        const isDestructive = nextStatus === 'CANCELLED' || nextStatus === 'REFUNDED';
                        return (
                          <button
                            key={nextStatus}
                            type="button"
                            disabled={updateStatusMutation.isPending}
                            onClick={() => handleInitiateTransition(nextStatus)}
                            className={`w-full py-2 px-3 rounded-xl text-xs font-semibold transition-all flex items-center justify-between border ${
                              isDestructive
                                ? 'border-red-200 dark:border-red-900/40 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                                : 'border-primary/30 text-primary hover:bg-primary/10'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            <span>Advance to {nextStatus}</span>
                            <span>{isDestructive ? '⚠️' : '→'}</span>
                          </button>
                        );
                      })}
                    </div>

                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Strict transition engine enforces authoritative business state flow. Destructive actions prompt confirmation.
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-gray-100 dark:bg-gray-800/80 rounded-xl text-center text-xs text-gray-500">
                    Order is in a terminal state (<span className="font-semibold text-gray-700 dark:text-gray-300">{order.status}</span>). No further automated transitions are permitted.
                  </div>
                )}
              </div>

              {/* Financial Totals Card */}
              <div className="card p-5 space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2">
                  Financial Breakdown
                </h2>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center text-gray-600 dark:text-gray-400">
                    <span>Subtotal</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formatINR(order.subtotal)}</span>
                  </div>

                  {toNumber(order.discountAmount) > 0 && (
                    <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                      <span>Discount</span>
                      <span className="font-medium">- {formatINR(order.discountAmount)}</span>
                    </div>
                  )}

                  {toNumber(order.referralDiscount) > 0 && (
                    <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                      <span>Referral Reward</span>
                      <span className="font-medium">- {formatINR(order.referralDiscount)}</span>
                    </div>
                  )}

                  <div className="border-t border-gray-100 dark:border-gray-800 pt-3 flex justify-between items-center">
                    <div>
                      <span className="text-sm font-bold text-gray-900 dark:text-white block">Final Total</span>
                      <span className="text-[10px] text-gray-400">All taxes included</span>
                    </div>
                    <span className="text-xl font-black text-primary font-mono">
                      {formatINR(order.finalAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Details Card */}
              <div className="card p-5 space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2">
                  Payment Verification
                </h2>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Payment Method:</span>
                    <span className="font-semibold uppercase text-gray-900 dark:text-white">
                      {order.paymentMethod || 'COD'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Payment Status:</span>
                    <PaymentStatusBadge status={order.paymentStatus} />
                  </div>

                  {(order.paymentId || order.razorpayOrderId) && (
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
                      <span className="text-gray-500 block text-[11px]">Transaction / Gateway ID</span>
                      <span className="font-mono text-[11px] text-gray-800 dark:text-gray-200 break-all">
                        {order.paymentId || order.razorpayOrderId}
                      </span>
                    </div>
                  )}

                  {paymentRecords.length > 0 && (
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-1">
                      <span className="text-gray-500 block text-[11px] font-semibold">Payment Records</span>
                      {paymentRecords.map((p, idx) => (
                        <div key={p.id || idx} className="p-2 bg-gray-50 dark:bg-gray-800 rounded text-[11px] flex justify-between">
                          <span>{p.method || 'Online'} ({p.status || 'RECORDED'})</span>
                          <span className="font-bold">{formatINR(p.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </QueryState>

      {/* Confirmation Modal for Destructive Actions (Cancel / Refund) */}
      <ConfirmModal
        open={modalTransition !== null}
        onClose={() => setModalTransition(null)}
        onConfirm={() => {
          if (modalTransition) {
            executeStatusUpdate(modalTransition);
          }
        }}
        title={
          modalTransition === 'CANCELLED'
            ? 'Confirm Order Cancellation & Inventory Restoration'
            : 'Confirm Order Refund'
        }
        message={
          modalTransition === 'CANCELLED'
            ? `Are you sure you want to cancel Order #${order?.orderNumber || id.slice(-8)}? Cancelling will automatically restore product stock for all ${order?.items?.length || 0} line items back into product inventory.`
            : `Are you sure you want to mark Order #${order?.orderNumber || id.slice(-8)} as REFUNDED? Ensure that the funds have been successfully returned through the gateway or ledger.`
        }
        confirmLabel={
          modalTransition === 'CANCELLED' ? 'Cancel Order & Restore Stock' : 'Mark as Refunded'
        }
        variant="danger"
        loading={updateStatusMutation.isPending}
      />

      {/* Shipping / Courier Dispatch Modal */}
      <Modal
        open={shippingModalOpen}
        onClose={() => setShippingModalOpen(false)}
        title="Dispatch Order & Assign Courier Tracking"
        description="Enter the shipping carrier, AWB tracking number, and physical unit serial numbers. Moving to SHIPPING will immediately trigger a branded dispatch email with tracking to the customer."
        size="lg"
      >
        <form onSubmit={handleShippingSubmit} className="space-y-4">
          {shippingError && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-600 dark:text-red-400">
              {shippingError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Courier Partner / Carrier <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={courierName}
                onChange={(e) => setCourierName(e.target.value)}
                placeholder="e.g. BlueDart, Delhivery, DTDC, FedEx"
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Tracking Number / AWB <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="e.g. BD123456789, DEL987654321"
                className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          {/* Unit Serial Number Tracking */}
          <div className="border-t border-gray-100 dark:border-gray-800 pt-3 space-y-3">
            <div>
              <h4 className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Mandatory Physical Unit Serials
              </h4>
              <p className="text-[11px] text-gray-500">
                Each unit requires its physical chassis serial number for warranty and service registration.
              </p>
            </div>

            {!overrideDispatch ? (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {order?.items
                  ?.filter((i: any) => i.status !== 'CANCELLED')
                  .map((item: any) => {
                    const qty = item.quantity || 1;
                    return (
                      <div key={item.id} className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl space-y-2">
                        <div className="text-xs font-semibold text-gray-900 dark:text-white flex justify-between">
                          <span>{item.product?.name || `Product #${item.productId}`}</span>
                          <span className="font-normal text-gray-500 text-[11px]">
                            {qty} {qty === 1 ? 'unit' : 'units'}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {Array.from({ length: qty }, (_, idx) => {
                            const u = idx + 1;
                            const key = `${item.id}-${u}`;
                            return (
                              <div key={key} className="space-y-1">
                                <label className="block text-[11px] font-medium text-gray-600 dark:text-gray-400">
                                  Unit {u} Serial <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  value={serialInputs[key] || ''}
                                  onChange={(e) =>
                                    setSerialInputs((prev) => ({
                                      ...prev,
                                      [key]: e.target.value.toUpperCase(),
                                    }))
                                  }
                                  placeholder={`SN-UNIT-${u}`}
                                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2">
                <label className="block text-xs font-semibold text-amber-900 dark:text-amber-200">
                  Override Reason (Mandatory & Audited) <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Explain why this order is dispatched without serial numbers recorded..."
                  rows={2}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <input
                id="emergency-override"
                type="checkbox"
                checked={overrideDispatch}
                onChange={(e) => setOverrideDispatch(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="emergency-override" className="text-xs text-gray-700 dark:text-gray-300 cursor-pointer">
                Emergency Admin Override (dispatch without serial numbers)
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <button
              type="button"
              onClick={() => setShippingModalOpen(false)}
              className="btn-secondary text-xs"
              disabled={updateStatusMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary text-xs"
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? 'Dispatching...' : 'Confirm Dispatch & Send Email'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

