/**
 * LaptopMitra Mobile Account Area Domain Helpers
 * Strictly data-driven, plain language, and zero synthetic steps.
 */

export interface MobileStatusConfig {
  label: string;
  bg: string;
  text: string;
  icon: string;
}

export function getMobileStatusLabel(
  status?: string | null | undefined,
  paymentStatus?: string | null | undefined,
  returnStatus?: string | null | undefined,
): MobileStatusConfig {
  const normReturn = (returnStatus || 'NONE').toUpperCase();
  if (normReturn !== 'NONE') {
    if (normReturn === 'REFUNDED' || normReturn === 'COMPLETED') {
      return { label: 'Refunded', bg: '#dcfce7', text: '#166534', icon: 'checkmark-circle-outline' };
    }
    return { label: 'Return Requested', bg: '#fef3c7', text: '#92400e', icon: 'return-down-back-outline' };
  }

  const norm = (status || 'PENDING').toUpperCase();
  const normPay = (paymentStatus || 'PENDING').toUpperCase();

  switch (norm) {
    case 'DELIVERED':
      return { label: 'Delivered', bg: '#dcfce7', text: '#166534', icon: 'checkmark-done-circle-outline' };
    case 'SHIPPING':
    case 'SHIPPED':
      return { label: 'Shipped', bg: '#e0e7ff', text: '#3730a3', icon: 'car-outline' };
    case 'CONFIRMED':
      return { label: 'Confirmed', bg: '#dbeafe', text: '#1e40af', icon: 'checkmark-circle-outline' };
    case 'CANCELLED':
      return { label: 'Cancelled', bg: '#fee2e2', text: '#991b1b', icon: 'close-circle-outline' };
    case 'REFUNDED':
      return { label: 'Refunded', bg: '#dcfce7', text: '#166534', icon: 'checkmark-circle-outline' };
    case 'PENDING':
    default:
      if (normPay === 'COMPLETED') {
        return { label: 'Confirmed', bg: '#dbeafe', text: '#1e40af', icon: 'checkmark-circle-outline' };
      }
      return { label: 'Order Placed', bg: '#fef3c7', text: '#92400e', icon: 'time-outline' };
  }
}

export function formatIndianRupees(val?: number | string | null | undefined): string {
  if (val === undefined || val === null || val === '') return '₹0';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '₹0';
  return `₹${Math.round(num).toLocaleString('en-IN')}`;
}

export function canCancelOrder(status?: string | null | undefined): boolean {
  const norm = (status || '').toUpperCase();
  return norm === 'PENDING' || norm === 'CONFIRMED';
}

export interface ReturnEligibilityResult {
  eligible: boolean;
  reason?: string | undefined;
}

export function canReturnOrder(params: {
  status: string;
  deliveredAt: string | Date | null | undefined;
  returnWindowDays?: number | undefined;
  returnStatus?: string | null | undefined;
  isLease?: boolean | undefined;
  now?: Date | undefined;
}): ReturnEligibilityResult {
  if (params.isLease) {
    return {
      eligible: false,
      reason: 'Lease returns must be processed via support inquiry',
    };
  }

  const norm = (params.status || '').toUpperCase();
  if (norm !== 'DELIVERED') {
    return {
      eligible: false,
      reason: 'Only delivered orders can be returned',
    };
  }

  const normReturn = (params.returnStatus || 'NONE').toUpperCase();
  if (normReturn !== 'NONE') {
    return {
      eligible: false,
      reason: 'Return already in progress',
    };
  }

  if (!params.deliveredAt) {
    return {
      eligible: false,
      reason: 'Delivery date unverified',
    };
  }

  const windowDays = params.returnWindowDays ?? 7;
  const deliveredTime = new Date(params.deliveredAt).getTime();
  const currentTime = (params.now || new Date()).getTime();
  const windowMs = windowDays * 24 * 60 * 60 * 1000;

  if (currentTime > deliveredTime + windowMs) {
    return {
      eligible: false,
      reason: 'Return window expired',
    };
  }

  return { eligible: true };
}

export interface InvoiceEligibilityResult {
  canDownload: boolean;
  note?: string | undefined;
}

export function canDownloadInvoice(order: {
  status: string;
  paymentStatus?: string | null | undefined;
  paymentMethod?: string | null | undefined;
  items?: Array<{ purchaseMode?: string | undefined }> | undefined;
}): InvoiceEligibilityResult {
  const isLease = order.items?.some((it) => it.purchaseMode === 'lease');
  if (isLease) {
    return {
      canDownload: false,
      note: 'Lease invoices are issued monthly by our billing team',
    };
  }

  const method = (order.paymentMethod || '').toLowerCase();
  const normPay = (order.paymentStatus || '').toUpperCase();
  const normStatus = (order.status || '').toUpperCase();

  if (method === 'cod' && normPay !== 'COMPLETED' && normStatus !== 'DELIVERED') {
    return {
      canDownload: false,
      note: 'Invoice will be generated upon cash collection on delivery',
    };
  }

  return { canDownload: true };
}

export interface RealTrackingStep {
  key: string;
  label: string;
  isCompleted: boolean;
  isCurrent: boolean;
  timestamp?: string | null | undefined;
}

export function getRealTrackingSteps(order: {
  status: string;
  paymentStatus?: string | null | undefined;
  createdAt: string;
  updatedAt?: string | undefined;
  returnStatus?: string | null | undefined;
}): RealTrackingStep[] {
  const normStatus = (order.status || 'PENDING').toUpperCase();
  const normPay = (order.paymentStatus || 'PENDING').toUpperCase();
  const normReturn = (order.returnStatus || 'NONE').toUpperCase();

  if (normStatus === 'CANCELLED') {
    return [
      { key: 'placed', label: 'Order Placed', isCompleted: true, isCurrent: false, timestamp: order.createdAt },
      { key: 'cancelled', label: 'Order Cancelled', isCompleted: true, isCurrent: true, timestamp: order.updatedAt || order.createdAt },
    ];
  }

  const isConfirmed = ['CONFIRMED', 'SHIPPING', 'SHIPPED', 'DELIVERED'].includes(normStatus) || normPay === 'COMPLETED';
  const isShipped = ['SHIPPING', 'SHIPPED', 'DELIVERED'].includes(normStatus);
  const isDelivered = normStatus === 'DELIVERED';

  const steps: RealTrackingStep[] = [
    {
      key: 'placed',
      label: 'Order Placed',
      isCompleted: true,
      isCurrent: normStatus === 'PENDING' && !isConfirmed,
      timestamp: order.createdAt,
    },
    {
      key: 'confirmed',
      label: 'Confirmed',
      isCompleted: isConfirmed,
      isCurrent: isConfirmed && !isShipped,
      timestamp: isConfirmed ? (order.updatedAt || order.createdAt) : null,
    },
    {
      key: 'shipped',
      label: 'Shipped',
      isCompleted: isShipped,
      isCurrent: isShipped && !isDelivered,
      timestamp: isShipped ? (order.updatedAt || null) : null,
    },
    {
      key: 'delivered',
      label: 'Delivered',
      isCompleted: isDelivered,
      isCurrent: isDelivered && normReturn === 'NONE',
      timestamp: isDelivered ? (order.updatedAt || null) : null,
    },
  ];

  if (normReturn !== 'NONE') {
    const isRefunded = normReturn === 'REFUNDED' || normReturn === 'COMPLETED';
    steps.push({
      key: 'return_requested',
      label: 'Return Requested',
      isCompleted: true,
      isCurrent: !isRefunded,
      timestamp: order.updatedAt || null,
    });
    steps.push({
      key: 'refund_processed',
      label: 'Refund Processed',
      isCompleted: isRefunded,
      isCurrent: isRefunded,
      timestamp: isRefunded ? (order.updatedAt || null) : null,
    });
  }

  return steps;
}

export function getDeliveryEstimateText(estimatedDelivery?: string | Date | null | undefined): string {
  if (!estimatedDelivery) {
    return "We'll confirm your delivery date soon";
  }
  const date = new Date(estimatedDelivery);
  if (isNaN(date.getTime())) {
    return "We'll confirm your delivery date soon";
  }
  const formatted = date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  return `Estimated delivery: ${formatted}`;
}

export function getWarrantyDisplayText(warrantyMonths?: number | null | undefined, hasAddon?: boolean | undefined): string {
  const baseMonths = warrantyMonths ?? 6;
  if (hasAddon) {
    return '12-Month Coverage (Standard + Add-on)';
  }
  return `${baseMonths}-Month Standard Warranty`;
}
