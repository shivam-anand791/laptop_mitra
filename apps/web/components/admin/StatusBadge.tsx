import React from 'react';

export type StatusSemanticVariant = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export interface StatusBadgeProps {
  status?: string;
  variant?: StatusSemanticVariant;
  label?: string;
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

const statusMap: Record<string, StatusSemanticVariant> = {
  // Orders
  PENDING: 'warning',
  CONFIRMED: 'info',
  SHIPPING: 'info',
  DELIVERED: 'success',
  CANCELLED: 'danger',
  REFUNDED: 'neutral',

  // Payments
  PROCESSING: 'info',
  COMPLETED: 'success',
  FAILED: 'danger',

  // Corporate Inquiries
  CONTACTED: 'info',
  QUOTED: 'info',
  CLOSED: 'success',

  // Affiliate Withdrawals
  APPROVED: 'success',
  REJECTED: 'danger',

  // Users
  ACTIVE: 'success',
  SUSPENDED: 'warning',
  DELETED: 'danger',

  // Stock & Inventory
  IN_STOCK: 'success',
  LOW_STOCK: 'warning',
  OUT_OF_STOCK: 'danger',

  // Support Tickets
  NEW: 'info',
  OPEN: 'info',
  WAITING_ON_CUSTOMER: 'warning',
  IN_PROGRESS: 'info',
  RESOLVED: 'success',
  REOPENED: 'warning',
  MERGED: 'neutral',

  // Return Requests
  REQUESTED: 'warning',
  PICKUP_SCHEDULED: 'info',
  PICKED_UP: 'info',
  INSPECTING: 'info',
  INSPECTION_PASSED: 'success',
  INSPECTION_FAILED: 'danger',
  REFUND_PENDING: 'warning',

  // Ticket Priorities
  URGENT: 'danger',
  HIGH: 'warning',
  MEDIUM: 'info',
  LOW: 'neutral',

};

const variantStyles: Record<StatusSemanticVariant, string> = {
  neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  warning: 'bg-amber-50 text-amber-800 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
};

const dotColors: Record<StatusSemanticVariant, string> = {
  neutral: 'bg-slate-400',
  info: 'bg-blue-600',
  success: 'bg-emerald-600',
  warning: 'bg-amber-600',
  danger: 'bg-red-600',
};

export function StatusBadge({
  status,
  variant,
  label,
  size = 'md',
  dot = false,
  className = '',
}: StatusBadgeProps) {
  const resolvedVariant: StatusSemanticVariant =
    variant || (status ? statusMap[status.toUpperCase()] : undefined) || 'neutral';

  const displayLabel = label || status || 'Unknown';
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-md border ${variantStyles[resolvedVariant]} ${sizeClass} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[resolvedVariant]}`}
          aria-hidden="true"
        />
      )}
      <span>{displayLabel}</span>
    </span>
  );
}

export default StatusBadge;
