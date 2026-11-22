/**
 * Account Area Domain Helpers & Status Mapping Matrix
 * Single source of truth for order status labels, payment text, and action eligibility.
 */

export interface OrderStatusConfig {
  label: string;
  iconName: 'Clock' | 'CheckCircle2' | 'Truck' | 'XCircle' | 'RotateCcw';
  colorClasses: string;
}

export function getOrderStatusConfig(
  status: string,
  paymentStatus?: string | null,
  returnStatus?: string | null,
): OrderStatusConfig {
  const normStatus = (status || 'PENDING').toUpperCase();
  const normPayStatus = (paymentStatus || 'PENDING').toUpperCase();
  const normReturn = (returnStatus || 'NONE').toUpperCase();

  // Return requested or active return takes precedence on primary chip
  if (normReturn !== 'NONE') {
    if (normReturn === 'REFUNDED' || normReturn === 'COMPLETED') {
      return {
        label: 'Refunded',
        iconName: 'RotateCcw',
        colorClasses: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      };
    }
    return {
      label: 'Return Requested',
      iconName: 'RotateCcw',
      colorClasses: 'bg-amber-50 text-amber-800 border-amber-200',
    };
  }

  switch (normStatus) {
    case 'DELIVERED':
      return {
        label: 'Delivered',
        iconName: 'CheckCircle2',
        colorClasses: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      };

    case 'SHIPPING':
    case 'SHIPPED':
      return {
        label: 'Shipped',
        iconName: 'Truck',
        colorClasses: 'bg-slate-100 text-slate-800 border-slate-300',
      };

    case 'CONFIRMED':
      return {
        label: 'Confirmed',
        iconName: 'CheckCircle2',
        colorClasses: 'bg-blue-50 text-blue-700 border-blue-200',
      };

    case 'CANCELLED':
      return {
        label: 'Cancelled',
        iconName: 'XCircle',
        colorClasses: 'bg-rose-50 text-rose-800 border-rose-200',
      };

    case 'REFUNDED':
      return {
        label: 'Refunded',
        iconName: 'RotateCcw',
        colorClasses: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      };

    case 'PENDING':
    default:
      if (normPayStatus === 'COMPLETED') {
        return {
          label: 'Confirmed',
          iconName: 'CheckCircle2',
          colorClasses: 'bg-blue-50 text-blue-700 border-blue-200',
        };
      }
      return {
        label: 'Order Placed',
        iconName: 'Clock',
        colorClasses: 'bg-blue-50 text-blue-700 border-blue-200',
      };
  }
}

export function formatIndianRupees(val?: number | string | null): string {
  if (val === null || val === undefined) return '₹0';
  const num = typeof val === 'number' ? val : parseFloat(val?.toString() || '0') || 0;
  return `₹${Math.round(num).toLocaleString('en-IN')}`;
}

export function getPaymentTextDescription(
  amount: number | string,
  paymentStatus?: string | null,
  paymentMethod?: string | null,
  status?: string | null,
  returnStatus?: string | null,
): { prefix: string; amountText: string; isMuted?: boolean } {
  const formattedAmount = formatIndianRupees(amount);
  const normPayStatus = (paymentStatus || 'PENDING').toUpperCase();
  const normPayMethod = (paymentMethod || 'RAZORPAY').toLowerCase();
  const normStatus = (status || 'PENDING').toUpperCase();
  const normReturn = (returnStatus || 'NONE').toUpperCase();

  if (normStatus === 'CANCELLED') {
    if (normPayStatus === 'COMPLETED' || normPayStatus === 'REFUNDED') {
      return { prefix: 'Refunded to source:', amountText: formattedAmount };
    }
    return { prefix: 'Order cancelled', amountText: '', isMuted: true };
  }

  if (normReturn === 'REFUNDED' || normReturn === 'COMPLETED') {
    return { prefix: 'Refunded to source / bank:', amountText: formattedAmount };
  }

  if (normReturn !== 'NONE') {
    return { prefix: 'Refund in progress:', amountText: formattedAmount };
  }

  const isCod = normPayMethod === 'cod';

  if (isCod) {
    if (normPayStatus === 'COMPLETED' || normStatus === 'DELIVERED') {
      return { prefix: 'Paid on delivery:', amountText: formattedAmount };
    }
    return { prefix: 'To pay on delivery:', amountText: formattedAmount };
  }

  if (normPayStatus === 'COMPLETED') {
    return { prefix: 'Paid online:', amountText: formattedAmount };
  }

  return { prefix: 'Payment pending:', amountText: formattedAmount };
}

export function canCancelOrder(status: string): boolean {
  const norm = (status || '').toUpperCase();
  return norm === 'PENDING' || norm === 'CONFIRMED';
}

export function canReturnOrder(
  status: string,
  deliveredAt: string | Date | null | undefined,
  returnWindowDays: number = 7,
  returnStatus?: string | null,
  isLease?: boolean,
  currentDate: Date = new Date(),
): { eligible: boolean; reason?: string } {
  if (isLease) {
    return { eligible: false, reason: 'Leased devices must be managed via corporate support inquiry.' };
  }
  const norm = (status || '').toUpperCase();
  if (norm !== 'DELIVERED') {
    return { eligible: false, reason: 'Returns are only available once the order is delivered.' };
  }
  const normReturn = (returnStatus || 'NONE').toUpperCase();
  if (normReturn !== 'NONE') {
    return { eligible: false, reason: 'A return request is already recorded for this order.' };
  }
  if (!deliveredAt) {
    return { eligible: false, reason: 'Awaiting delivery confirmation.' };
  }

  const deliveredMs = new Date(deliveredAt).getTime();
  const nowMs = currentDate.getTime();
  const windowMs = returnWindowDays * 24 * 60 * 60 * 1000;

  if (nowMs > deliveredMs + windowMs) {
    return { eligible: false, reason: `The ${returnWindowDays}-day return window has expired.` };
  }

  return { eligible: true };
}

export function canDownloadInvoice(
  paymentStatus?: string | null,
  orderStatus?: string | null,
  isLease?: boolean,
): boolean {
  if (isLease) return false;
  const normPay = (paymentStatus || '').toUpperCase();
  const normStatus = (orderStatus || '').toUpperCase();
  return normPay === 'COMPLETED' || normStatus === 'DELIVERED';
}

export function filterOrdersByStatus<T extends { status: string; returnStatus?: string | null }>(
  orders: T[],
  statusFilter: string,
): T[] {
  if (!statusFilter || statusFilter === 'ALL') return orders;
  if (statusFilter === 'IN_PROGRESS') {
    return orders.filter((o) =>
      ['PENDING', 'CONFIRMED', 'SHIPPING'].includes((o.status || '').toUpperCase()),
    );
  }
  if (statusFilter === 'DELIVERED') {
    return orders.filter((o) => (o.status || '').toUpperCase() === 'DELIVERED');
  }
  if (statusFilter === 'CANCELLED') {
    return orders.filter((o) => (o.status || '').toUpperCase() === 'CANCELLED');
  }
  if (statusFilter === 'RETURNS') {
    return orders.filter((o) => {
      const normReturn = (o.returnStatus || 'NONE').toUpperCase();
      const normStatus = (o.status || '').toUpperCase();
      return normReturn !== 'NONE' || normStatus === 'REFUNDED';
    });
  }
  return orders.filter((o) => (o.status || '').toUpperCase() === statusFilter.toUpperCase());
}

export function filterOrdersByDate<T extends { createdAt?: string | Date }>(
  orders: T[],
  range: string,
  referenceTimestamp: number = Date.now(),
): T[] {
  if (!range || range === 'ALL') return orders;
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

  return orders.filter((o) => {
    if (!o.createdAt) return false;
    const time = new Date(o.createdAt).getTime();
    const year = new Date(o.createdAt).getFullYear();

    if (range === '30_DAYS') return time >= referenceTimestamp - thirtyDaysMs;
    if (range === '90_DAYS') return time >= referenceTimestamp - ninetyDaysMs;
    if (range === '2026') return year === 2026;
    if (range === '2025') return year === 2025;
    return true;
  });
}

export function filterOrdersBySearch<T extends { orderNumber?: string; items?: any[] }>(
  orders: T[],
  query: string,
): T[] {
  const clean = (query || '').trim().toLowerCase();
  if (!clean) return orders;

  return orders.filter((o) => {
    const numMatch = (o.orderNumber || '').toLowerCase().includes(clean);
    const itemMatch = o.items?.some(
      (it: any) =>
        it?.product?.name?.toLowerCase().includes(clean) ||
        it?.variantName?.toLowerCase().includes(clean),
    );
    return numMatch || itemMatch;
  });
}

export interface TimelineStep {
  key: string;
  label: string;
  description?: string;
  timestamp?: string | null;
  isCompleted: boolean;
  isCurrent: boolean;
  isCancelled?: boolean;
}

export function getOrderTimelineSteps(order: {
  status: string;
  paymentStatus?: string | null;
  createdAt: string;
  updatedAt?: string;
  trackingNumber?: string | null;
  carrier?: string | null;
  deliveries?: any[];
  returnStatus?: string | null;
}): TimelineStep[] {
  const normStatus = (order.status || 'PENDING').toUpperCase();
  const normPay = (order.paymentStatus || 'PENDING').toUpperCase();
  const normReturn = (order.returnStatus || 'NONE').toUpperCase();

  // Cancelled flow
  if (normStatus === 'CANCELLED') {
    return [
      {
        key: 'placed',
        label: 'Order Placed',
        description: 'Order logged in system.',
        timestamp: order.createdAt,
        isCompleted: true,
        isCurrent: false,
      },
      {
        key: 'cancelled',
        label: 'Order Cancelled',
        description: normPay === 'COMPLETED' ? 'Cancelled. Refund initiated.' : 'Order was cancelled.',
        timestamp: order.updatedAt || order.createdAt,
        isCompleted: true,
        isCurrent: true,
        isCancelled: true,
      },
    ];
  }

  // Normal lifecycle steps: Placed, Confirmed, Shipped, Delivered
  const isPaid = normPay === 'COMPLETED';
  const isConfirmed = normStatus !== 'PENDING' || isPaid;
  const isShipped = normStatus === 'SHIPPING' || normStatus === 'DELIVERED';
  const isDelivered = normStatus === 'DELIVERED';

  const deliveryRecord = order.deliveries?.[0];
  const shippedTimestamp = deliveryRecord?.shippedAt || (isShipped ? order.updatedAt : null);
  const deliveredTimestamp = deliveryRecord?.deliveredAt || (isDelivered ? order.updatedAt : null);

  const steps: TimelineStep[] = [
    {
      key: 'placed',
      label: 'Order Placed',
      description: 'Order details and items logged.',
      timestamp: order.createdAt,
      isCompleted: true,
      isCurrent: normStatus === 'PENDING' && !isPaid,
    },
    {
      key: 'confirmed',
      label: 'Confirmed',
      description: isConfirmed ? 'Order confirmed and ready for dispatch.' : 'Pending confirmation.',
      timestamp: isConfirmed ? (order.updatedAt || order.createdAt) : null,
      isCompleted: isConfirmed,
      isCurrent: (normStatus === 'CONFIRMED' || (normStatus === 'PENDING' && isPaid)),
    },
    {
      key: 'shipped',
      label: 'Shipped',
      description: isShipped
        ? (order.trackingNumber
            ? `Dispatched via ${order.carrier || 'Express'} (AWB: ${order.trackingNumber})`
            : 'Package handed over to courier partner.')
        : 'Awaiting courier pickup.',
      timestamp: shippedTimestamp,
      isCompleted: isShipped,
      isCurrent: normStatus === 'SHIPPING',
    },
    {
      key: 'delivered',
      label: 'Delivered',
      description: isDelivered ? 'Delivered to your shipping address.' : 'Expected at your delivery address.',
      timestamp: deliveredTimestamp,
      isCompleted: isDelivered,
      isCurrent: isDelivered && normReturn === 'NONE',
    },
  ];

  // Return and refund steps backed by real return record
  if (normReturn !== 'NONE' || normStatus === 'REFUNDED') {
    const isRefunded = normReturn === 'REFUNDED' || normReturn === 'COMPLETED' || normStatus === 'REFUNDED';
    steps.push({
      key: 'return_requested',
      label: 'Return Requested',
      description: 'Doorstep pickup and inspection scheduled.',
      timestamp: order.updatedAt,
      isCompleted: true,
      isCurrent: !isRefunded,
    });
    steps.push({
      key: 'refunded',
      label: 'Refund Processed',
      description: isRefunded ? 'Refund completed to original payment method.' : 'Pending pickup and inspection.',
      timestamp: isRefunded ? order.updatedAt : null,
      isCompleted: isRefunded,
      isCurrent: isRefunded,
    });
  }

  return steps;
}

export interface ReturnStatusConfig {
  label: string;
  colorClasses: string;
  badgeBg: string;
}

export function getReturnStatusConfig(status?: string | null): ReturnStatusConfig {
  const norm = (status || 'REQUESTED').toUpperCase();

  switch (norm) {
    case 'REFUNDED':
      return {
        label: 'Refund Completed',
        colorClasses: 'text-emerald-800 bg-emerald-50 border-emerald-200',
        badgeBg: 'bg-emerald-600',
      };
    case 'REPLACED':
      return {
        label: 'Replacement Dispatched',
        colorClasses: 'text-emerald-800 bg-emerald-50 border-emerald-200',
        badgeBg: 'bg-emerald-600',
      };
    case 'REFUND_PENDING':
      return {
        label: 'Refund Processing',
        colorClasses: 'text-amber-800 bg-amber-50 border-amber-200',
        badgeBg: 'bg-amber-600',
      };
    case 'INSPECTION_PASSED':
      return {
        label: 'Inspection Passed',
        colorClasses: 'text-emerald-800 bg-emerald-50 border-emerald-200',
        badgeBg: 'bg-emerald-600',
      };
    case 'INSPECTING':
      return {
        label: 'Inspecting at Lab',
        colorClasses: 'text-blue-800 bg-blue-50 border-blue-200',
        badgeBg: 'bg-blue-600',
      };
    case 'PICKED_UP':
      return {
        label: 'Picked Up by Courier',
        colorClasses: 'text-blue-800 bg-blue-50 border-blue-200',
        badgeBg: 'bg-blue-600',
      };
    case 'PICKUP_SCHEDULED':
      return {
        label: 'Pickup Scheduled',
        colorClasses: 'text-blue-800 bg-blue-50 border-blue-200',
        badgeBg: 'bg-blue-600',
      };
    case 'APPROVED':
      return {
        label: 'Approved for Pickup',
        colorClasses: 'text-blue-800 bg-blue-50 border-blue-200',
        badgeBg: 'bg-blue-600',
      };
    case 'INSPECTION_FAILED':
    case 'REJECTED':
      return {
        label: 'Return Rejected',
        colorClasses: 'text-rose-800 bg-rose-50 border-rose-200',
        badgeBg: 'bg-rose-600',
      };
    case 'CANCELLED':
      return {
        label: 'Return Cancelled',
        colorClasses: 'text-slate-800 bg-slate-100 border-slate-300',
        badgeBg: 'bg-slate-500',
      };
    case 'REQUESTED':
    default:
      return {
        label: 'Return Requested',
        colorClasses: 'text-amber-800 bg-amber-50 border-amber-200',
        badgeBg: 'bg-amber-600',
      };
  }
}

export function getReturnTimelineSteps(ret: {
  status: string;
  createdAt: string;
  updatedAt?: string;
  pickupScheduledAt?: string | null;
  pickedUpAt?: string | null;
}): TimelineStep[] {
  const norm = (ret.status || 'REQUESTED').toUpperCase();

  if (norm === 'REJECTED' || norm === 'INSPECTION_FAILED') {
    return [
      {
        key: 'requested',
        label: 'Return Requested',
        description: 'Request submitted for review.',
        timestamp: ret.createdAt,
        isCompleted: true,
        isCurrent: false,
      },
      {
        key: 'rejected',
        label: 'Return Rejected',
        description: norm === 'INSPECTION_FAILED' ? 'Device did not meet return policy criteria.' : 'Request could not be approved.',
        timestamp: ret.updatedAt || ret.createdAt,
        isCompleted: true,
        isCurrent: true,
        isCancelled: true,
      },
    ];
  }

  const isPickupDone = ['PICKED_UP', 'INSPECTING', 'INSPECTION_PASSED', 'REFUND_PENDING', 'REFUNDED', 'REPLACED'].includes(norm);
  const isInspectionDone = ['INSPECTION_PASSED', 'REFUND_PENDING', 'REFUNDED', 'REPLACED'].includes(norm);
  const isCompleted = ['REFUNDED', 'REPLACED'].includes(norm);

  return [
    {
      key: 'requested',
      label: 'Request Submitted',
      description: 'Return request logged in system.',
      timestamp: ret.createdAt,
      isCompleted: true,
      isCurrent: norm === 'REQUESTED',
    },
    {
      key: 'pickup',
      label: 'Doorstep Pickup',
      description: isPickupDone
        ? 'Device collected by logistics partner.'
        : norm === 'PICKUP_SCHEDULED'
        ? `Scheduled for ${ret.pickupScheduledAt ? new Date(ret.pickupScheduledAt).toLocaleDateString('en-IN') : 'doorstep pickup'}.`
        : 'Reverse pickup being assigned.',
      timestamp: ret.pickedUpAt || (isPickupDone ? ret.updatedAt : null),
      isCompleted: isPickupDone,
      isCurrent: ['APPROVED', 'PICKUP_SCHEDULED'].includes(norm),
    },
    {
      key: 'inspection',
      label: 'Hub Inspection',
      description: isInspectionDone
        ? '32-point diagnostics passed.'
        : norm === 'INSPECTING'
        ? 'Diagnostic testing in progress at central hub.'
        : 'Pending hub receipt.',
      timestamp: isInspectionDone ? ret.updatedAt : null,
      isCompleted: isInspectionDone,
      isCurrent: norm === 'INSPECTING',
    },
    {
      key: 'settlement',
      label: norm === 'REPLACED' ? 'Replacement Dispatched' : 'Refund Processed',
      description: isCompleted
        ? (norm === 'REPLACED' ? 'Replacement laptop dispatched.' : 'Refund credited to original payment source.')
        : norm === 'REFUND_PENDING'
        ? 'Refund transfer in progress.'
        : 'Pending inspection clearance.',
      timestamp: isCompleted ? ret.updatedAt : null,
      isCompleted: isCompleted,
      isCurrent: norm === 'REFUND_PENDING' || isCompleted,
    },
  ];
}

export interface TicketStatusConfig {
  label: string;
  colorClasses: string;
  badgeBg: string;
}

export function getTicketStatusConfig(status?: string | null): TicketStatusConfig {
  const norm = (status || 'NEW').toUpperCase();

  switch (norm) {
    case 'WAITING_ON_CUSTOMER':
      return {
        label: 'Awaiting Your Reply',
        colorClasses: 'text-purple-800 bg-purple-50 border-purple-200',
        badgeBg: 'bg-purple-600',
      };
    case 'IN_PROGRESS':
      return {
        label: 'Under Investigation',
        colorClasses: 'text-indigo-800 bg-indigo-50 border-indigo-200',
        badgeBg: 'bg-indigo-600',
      };
    case 'RESOLVED':
      return {
        label: 'Resolved',
        colorClasses: 'text-emerald-800 bg-emerald-50 border-emerald-200',
        badgeBg: 'bg-emerald-600',
      };
    case 'CLOSED':
      return {
        label: 'Closed',
        colorClasses: 'text-slate-700 bg-slate-100 border-slate-300',
        badgeBg: 'bg-slate-500',
      };
    case 'REOPENED':
      return {
        label: 'Reopened',
        colorClasses: 'text-orange-800 bg-orange-50 border-orange-200',
        badgeBg: 'bg-orange-600',
      };
    case 'OPEN':
      return {
        label: 'Open',
        colorClasses: 'text-amber-800 bg-amber-50 border-amber-200',
        badgeBg: 'bg-amber-600',
      };
    case 'NEW':
    default:
      return {
        label: 'Submitted',
        colorClasses: 'text-blue-800 bg-blue-50 border-blue-200',
        badgeBg: 'bg-blue-600',
      };
  }
}

/**
 * Validates a standard 6-digit Indian PIN Code (e.g. 560103, 110001).
 */
export function validatePincode(pincode?: string | null): boolean {
  if (!pincode) return false;
  return /^\d{6}$/.test(pincode.trim());
}

/**
 * Validates a 15-character Indian Goods and Services Tax Identification Number (GSTIN).
 * Format: 2 digits (state) + 10 chars (PAN) + 1 digit (entity) + 'Z' + 1 checksum char.
 */
export function validateGSTIN(gstin?: string | null): boolean {
  if (!gstin) return false;
  return /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i.test(gstin.trim());
}

/**
 * Validates an Indian / international contact phone number.
 */
export function validatePhone(phone?: string | null): boolean {
  if (!phone) return false;
  return /^[0-9+ -]{10,15}$/.test(phone.trim());
}

/**
 * Compares a Firebase token auth_time (seconds since epoch) against User.sessionsRevokedAt.
 * If sessions were revoked after the token's auth_time, returns true (session is invalidated).
 */
export function isSessionRevoked(
  tokenAuthTimeSeconds: number,
  sessionsRevokedAt?: string | Date | null,
): boolean {
  if (!sessionsRevokedAt) return false;
  const revokedTimeSeconds = Math.floor(new Date(sessionsRevokedAt).getTime() / 1000);
  return tokenAuthTimeSeconds < revokedTimeSeconds;
}






