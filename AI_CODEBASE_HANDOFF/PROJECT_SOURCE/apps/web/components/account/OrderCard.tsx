'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Order } from '@/lib/types';
import { canCancelOrder, canReturnOrder, canDownloadInvoice } from '@/lib/account-helpers';
import { useSupportConfig } from '@/lib/support-config';
import { OrderStatusChip } from './OrderStatusChip';
import { PaymentText } from './PaymentText';
import {
  Laptop,
  Copy,
  Check,
  Truck,
  ArrowRight,
  FileText,
  RotateCcw,
  XCircle,
  HelpCircle,
  ShoppingBag,
} from 'lucide-react';

export interface OrderCardProps {
  order: Order;
  onCancel?: (order: Order) => void;
  onReturn?: (order: Order) => void;
  onReorder?: (order: Order) => void;
  onNeedHelp?: (order: Order, item?: any) => void;
  isReordering?: boolean;
}

export function OrderCard({
  order,
  onCancel,
  onReturn,
  onReorder,
  onNeedHelp,
  isReordering = false,
}: OrderCardProps) {
  const [copied, setCopied] = useState(false);
  const { data: supportConfig } = useSupportConfig();

  const handleCopyOrderNumber = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(order.orderNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const items = order.items || [];
  const firstItem = items[0];
  const itemCount = items.reduce((sum, it) => sum + (it.quantity || 1), 0);
  const isLease = firstItem?.purchaseMode === 'lease';

  const orderDateStr = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : '';

  // Server-eligibility rules via helper
  const canCancel = canCancelOrder(order.status);
  const deliveredAt = order.deliveries?.[0]?.deliveredAt || (order.status === 'DELIVERED' ? order.updatedAt : null);
  const returnCheck = canReturnOrder(order.status, deliveredAt, supportConfig?.returnWindowDays ?? 0, order.returnStatus, isLease);
  const canReturn = returnCheck.eligible;
  const canInvoice = canDownloadInvoice(order.paymentStatus, order.status, isLease);

  // Primary image
  const primaryImage =
    firstItem?.product?.images?.find((img: any) => img.isPrimary)?.url ||
    firstItem?.product?.images?.[0]?.url ||
    null;

  // Specs summary
  const specs = [
    firstItem?.variantName,
    firstItem?.configuration && firstItem.configuration !== 'default'
      ? firstItem.configuration.replace('-', ' ').toUpperCase()
      : null,
  ]
    .filter(Boolean)
    .join(' • ');

  // Warranty duration text from data
  const standardWarrantyMonths = supportConfig
    ? Math.max(1, Math.round(supportConfig.standardWarrantyDays / 30))
    : null;
  const warrantyText = standardWarrantyMonths
    ? `${standardWarrantyMonths * (firstItem?.hasWarranty ? 2 : 1)}-Month Assured Warranty Included`
    : 'Warranty duration unavailable';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 transition overflow-hidden shadow-2xs flex flex-col justify-between">
      {/* Header bar */}
      <div className="bg-slate-50/90 px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 sm:gap-6">
          <div>
            <span className="text-slate-400 block text-[11px]">Order Placed</span>
            <span className="font-semibold text-slate-800">{orderDateStr}</span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Order Number</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-slate-900">{order.orderNumber}</span>
              <button
                type="button"
                onClick={handleCopyOrderNumber}
                className="text-slate-400 hover:text-slate-700 transition p-0.5"
                title="Copy Order Number"
                aria-label="Copy order number"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>

        <OrderStatusChip
          status={order.status}
          paymentStatus={order.paymentStatus}
          returnStatus={order.returnStatus}
        />
      </div>

      {/* Main product row */}
      <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center p-1 flex-shrink-0 relative">
            {primaryImage ? (
              <img
                src={primaryImage}
                alt={firstItem?.product?.name || 'Laptop'}
                className="object-contain w-full h-full rounded-lg"
              />
            ) : (
              <Laptop className="w-8 h-8 text-slate-400" />
            )}
            {itemCount > 1 && (
              <span className="absolute -bottom-1 -right-1 bg-slate-900 text-white text-[10px] font-bold px-1.5 py-0.2 rounded-md">
                +{itemCount - 1}
              </span>
            )}
          </div>

          <div className="min-w-0 space-y-0.5">
            <h4 className="font-bold text-sm text-slate-900 truncate">
              {firstItem?.product?.name || 'Certified Refurbished Laptop'}
            </h4>
            <p className="text-xs text-slate-600 line-clamp-1">
              {specs ? `${specs} • ` : ''}
              {isLease ? (
                <span className="font-semibold text-blue-700">Rent, month 1 advance</span>
              ) : (
                `Qty: ${firstItem?.quantity || 1}`
              )}
              {` • ${warrantyText}`}
            </p>

            {/* Delivery estimate */}
            <p className="text-xs text-slate-500 pt-0.5 flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              {order.status === 'DELIVERED' ? (
                <span className="font-medium text-emerald-700">Delivered</span>
              ) : order.trackingNumber ? (
                <span>
                  Tracking:{' '}
                  <span className="font-mono font-semibold text-slate-700">
                    {order.trackingNumber}
                  </span>{' '}
                  ({order.carrier || 'Express'})
                </span>
              ) : (
                <span>We&apos;ll confirm your delivery date soon</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Footer bar with payment and action buttons */}
      <div className="px-5 py-3.5 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <PaymentText
          amount={order.finalAmount}
          paymentStatus={order.paymentStatus}
          paymentMethod={order.paymentMethod}
          status={order.status}
          returnStatus={order.returnStatus}
        />

        <div className="flex flex-wrap items-center gap-2">
          {/* Track / Details */}
          <Link
            href={`/account/orders/${order.id}`}
            className="px-3 py-1.5 bg-white border border-slate-200 text-slate-800 hover:bg-slate-50 rounded-xl text-xs font-semibold transition inline-flex items-center gap-1 shadow-2xs"
          >
            Track &amp; Details <ArrowRight className="w-3.5 h-3.5" />
          </Link>

          {/* Need help */}
          {onNeedHelp ? (
            <button
              type="button"
              onClick={() => onNeedHelp(order, firstItem)}
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-amber-300 rounded-xl text-xs font-semibold transition inline-flex items-center gap-1 shadow-2xs cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-600" /> Need Help?
            </button>
          ) : (
            <Link
              href={`/account/orders/${order.id}`}
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition inline-flex items-center gap-1 shadow-2xs"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-600" /> Need Help?
            </Link>
          )}

          {/* Invoice */}
          {canInvoice && (
            <Link
              href={`/account/orders/${order.id}#invoice`}
              className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition inline-flex items-center gap-1 shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" /> Invoice
            </Link>
          )}

          {/* Cancel */}
          {canCancel && onCancel && (
            <button
              type="button"
              onClick={() => onCancel(order)}
              className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold transition cursor-pointer inline-flex items-center gap-1"
            >
              <XCircle className="w-3.5 h-3.5" /> Cancel
            </button>
          )}

          {/* Return */}
          {canReturn && onReturn && (
            <button
              type="button"
              onClick={() => onReturn(order)}
              className="px-3 py-1.5 text-amber-800 hover:bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold transition cursor-pointer inline-flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Return
            </button>
          )}

          {/* Reorder / Buy Again */}
          {onReorder && (
            <button
              type="button"
              onClick={() => onReorder(order)}
              disabled={isReordering}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold transition cursor-pointer inline-flex items-center gap-1 shadow-xs"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              {isReordering ? 'Adding...' : 'Buy Again'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
