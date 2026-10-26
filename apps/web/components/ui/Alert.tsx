'use client';

import React from 'react';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

const variantStyles: Record<
  AlertVariant,
  { container: string; iconColor: string; titleColor: string; textColor: string }
> = {
  info: {
    container: 'bg-[#EFF6FF] border-[#BFDBFE]',
    iconColor: 'text-[#2563EB]',
    titleColor: 'text-[#1E40AF]',
    textColor: 'text-[#1D4ED8]',
  },
  success: {
    container: 'bg-[#F0FDF4] border-[#BBF7D0]',
    iconColor: 'text-[#16A34A]',
    titleColor: 'text-[#166534]',
    textColor: 'text-[#15803D]',
  },
  warning: {
    container: 'bg-[#FFFBEB] border-[#FDE68A]',
    iconColor: 'text-[#D97706]',
    titleColor: 'text-[#92400E]',
    textColor: 'text-[#B45309]',
  },
  error: {
    container: 'bg-[#FEF2F2] border-[#FECACA]',
    iconColor: 'text-[#DC2626]',
    titleColor: 'text-[#991B1B]',
    textColor: 'text-[#B91C1C]',
  },
};

export default function Alert({
  variant = 'info',
  title,
  children,
  onDismiss,
  className = '',
}: AlertProps) {
  const styles = variantStyles[variant];

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      className={[
        'flex items-start gap-3 p-4 rounded-xl border transition-all text-sm',
        styles.container,
        className,
      ].join(' ')}
    >
      {/* Icon */}
      <div className={['shrink-0 mt-0.5', styles.iconColor].join(' ')} aria-hidden="true">
        {variant === 'info' && (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        {variant === 'success' && (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        {variant === 'warning' && (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )}
        {variant === 'error' && (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="flex-1">
        {title && <h5 className={['font-semibold text-sm mb-0.5', styles.titleColor].join(' ')}>{title}</h5>}
        <div className={['leading-relaxed', styles.textColor].join(' ')}>{children}</div>
      </div>

      {/* Optional Dismiss button */}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 p-1 rounded-md text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          aria-label="Dismiss alert"
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
}
