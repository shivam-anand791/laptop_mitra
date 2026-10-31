'use client';

import React from 'react';
import { getPaymentTextDescription } from '@/lib/account-helpers';

export interface PaymentTextProps {
  amount: number | string;
  paymentStatus?: string | null;
  paymentMethod?: string | null;
  status?: string | null;
  returnStatus?: string | null;
  className?: string;
}

export function PaymentText({
  amount,
  paymentStatus,
  paymentMethod,
  status,
  returnStatus,
  className = '',
}: PaymentTextProps) {
  const { prefix, amountText, isMuted } = getPaymentTextDescription(
    amount,
    paymentStatus,
    paymentMethod,
    status,
    returnStatus,
  );

  return (
    <span className={`text-xs ${isMuted ? 'text-slate-500' : 'text-slate-700'} ${className}`}>
      <span className="text-slate-500 mr-1.5">{prefix}</span>
      {amountText ? (
        <span className="font-bold text-slate-900 tabular-nums">{amountText}</span>
      ) : null}
    </span>
  );
}
