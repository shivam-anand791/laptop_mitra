'use client';

import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'bg-[#1D6FF2] hover:bg-[#1558C0] text-white font-bold',
    'shadow-sm shadow-blue-900/10 hover:shadow-md hover:shadow-blue-500/25',
    'active:scale-[0.98]',
  ].join(' '),
  secondary: [
    'bg-[#0B1F4B] hover:bg-[#071433] text-white font-bold',
    'shadow-sm hover:shadow-md',
    'active:scale-[0.98]',
  ].join(' '),
  outline: [
    'bg-white hover:bg-slate-50 text-[#0B1F4B] font-bold',
    'border border-[#E4E9F2] hover:border-slate-300 shadow-xs',
    'active:scale-[0.98]',
  ].join(' '),
  ghost: [
    'bg-transparent text-[#475569] font-semibold',
    'hover:text-[#0B1F4B] hover:bg-slate-100/70',
    'active:scale-[0.98]',
  ].join(' '),
  danger: [
    'bg-[#EF4444] hover:bg-[#DC2626] text-white font-bold',
    'shadow-sm hover:shadow-md shadow-red-500/20',
    'active:scale-[0.98]',
  ].join(' '),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs rounded-lg gap-1.5',
  md: 'h-10 px-4 text-xs sm:text-sm rounded-xl gap-2',
  lg: 'h-11 sm:h-12 px-6 text-sm rounded-xl gap-2.5',
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
        'transition-all duration-200 ease-out select-none',
        'focus-visible:outline-2 focus-visible:outline-[#1D6FF2] focus-visible:outline-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
        variantStyles[variant],
        sizeStyles[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin-slow"
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
