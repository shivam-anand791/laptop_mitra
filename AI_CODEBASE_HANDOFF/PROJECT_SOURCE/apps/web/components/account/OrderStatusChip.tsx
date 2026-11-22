'use client';

import React from 'react';
import { Clock, CheckCircle2, Truck, XCircle, RotateCcw } from 'lucide-react';
import { getOrderStatusConfig } from '@/lib/account-helpers';

export interface OrderStatusChipProps {
  status: string;
  paymentStatus?: string | null;
  returnStatus?: string | null;
  className?: string;
}

const ICON_MAP = {
  Clock,
  CheckCircle2,
  Truck,
  XCircle,
  RotateCcw,
};

export function OrderStatusChip({
  status,
  paymentStatus,
  returnStatus,
  className = '',
}: OrderStatusChipProps) {
  const config = getOrderStatusConfig(status, paymentStatus, returnStatus);
  const Icon = ICON_MAP[config.iconName] || Clock;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.colorClasses} ${className}`}
    >
      <Icon className="w-3.5 h-3.5 flex-shrink-0" />
      <span>{config.label}</span>
    </span>
  );
}
