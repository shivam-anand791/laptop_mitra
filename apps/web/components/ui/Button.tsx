'use client';

import React from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold',
    'shadow-xs hover:shadow-sm active:scale-[0.99]',
  ].join(' '),
  secondary: [
    'bg-[#0B1F4B] hover:bg-[#071433] text-white font-semibold',
    'shadow-xs hover:shadow-sm active:scale-[0.99]',
  ].join(' '),
  outline: [
    'bg-white hover:bg-slate-50 text-[#111827] font-medium',
    'border border-[#E2E8F0] hover:border-slate-300 shadow-xs',
    'active:scale-[0.99]',
  ].join(' '),
  ghost: [
    'bg-transparent text-[#475569] font-medium',
    'hover:text-[#111827] hover:bg-slate-100/80',
    'active:scale-[0.99]',
  ].join(' '),
  danger: [
    'bg-[#DC2626] hover:bg-[#B91C1C] text-white font-semibold',
    'shadow-xs hover:shadow-sm active:scale-[0.99]',
  ].join(' '),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'min-h-[36px] px-3 text-xs rounded-lg gap-1.5',
  md: 'min-h-[44px] px-4 text-sm rounded-lg gap-2', // Meets 44px WCAG touch target guideline
  lg: 'min-h-[48px] px-6 text-base rounded-xl gap-2.5',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        'inline-flex items-center justify-center font-medium cursor-pointer',
        'transition-all duration-150 ease-out select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      disabled={disabled || loading}
      aria-busy={loading}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin"
          width={size === 'sm' ? 14 : size === 'lg' ? 20 : 16}
          height={size === 'sm' ? 14 : size === 'lg' ? 20 : 16}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : icon && iconPosition === 'left' ? (
        <span className="shrink-0">{icon}</span>
      ) : null}

      {children && <span>{children}</span>}

      {!loading && icon && iconPosition === 'right' ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
    </button>
  );
}
