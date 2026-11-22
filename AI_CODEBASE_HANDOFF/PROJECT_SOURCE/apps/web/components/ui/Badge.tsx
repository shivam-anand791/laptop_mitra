import React from 'react';

export type BadgeVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'muted'
  | 'refurb'
  | 'bestSeller'
  | 'newArrival'
  | 'hotDeal'
  | 'inStock';

export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  primary: 'bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]',
  secondary: 'bg-slate-100 text-[#475569] border border-slate-200',
  success: 'bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]',
  warning: 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]',
  danger: 'bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]',
  info: 'bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]',
  muted: 'bg-slate-100 text-[#94A3B8] border border-slate-200',
  refurb: 'bg-[#0B1F4B] text-white border border-[#0B1F4B] font-bold shadow-xs',
  bestSeller: 'bg-[#2563EB] text-white border border-[#2563EB] font-bold shadow-xs',
  newArrival: 'bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE] font-bold',
  hotDeal: 'bg-[#EA580C] text-white border border-[#EA580C] font-bold shadow-xs',
  inStock: 'bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0] font-semibold',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
};

export default function Badge({
  variant = 'secondary',
  size = 'md',
  dot = false,
  icon,
  className = '',
  children,
}: BadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-md font-semibold',
        'uppercase tracking-wider leading-none',
        variantStyles[variant],
        sizeStyles[size],
        className,
      ].join(' ')}
    >
      {dot && (
        <span
          className={[
            'w-1.5 h-1.5 rounded-full shrink-0',
            variant === 'success' && 'bg-[#16A34A]',
            variant === 'warning' && 'bg-[#D97706]',
            variant === 'danger' && 'bg-[#DC2626]',
            variant === 'info' && 'bg-[#2563EB]',
            variant === 'primary' && 'bg-[#2563EB]',
            variant === 'secondary' && 'bg-slate-400',
            variant === 'muted' && 'bg-slate-400',
            variant === 'inStock' && 'bg-[#16A34A]',
          ].filter(Boolean).join(' ')}
          aria-hidden="true"
        />
      )}
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  );
}

/* ── Grade Badge (domain-specific) ── */

export type Grade = 'A+' | 'A' | 'B';

export interface GradeBadgeProps {
  grade: Grade;
  size?: BadgeSize;
  className?: string;
}

const gradeStyles: Record<Grade, { bg: string; text: string; label: string; border: string }> = {
  'A+': {
    bg: 'bg-[#F0FDF4]',
    text: 'text-[#15803D]',
    border: 'border-[#BBF7D0]',
    label: 'Grade A+ Certified',
  },
  A: {
    bg: 'bg-[#EFF6FF]',
    text: 'text-[#2563EB]',
    border: 'border-[#BFDBFE]',
    label: 'Grade A Certified',
  },
  B: {
    bg: 'bg-[#FFFBEB]',
    text: 'text-[#B45309]',
    border: 'border-[#FDE68A]',
    label: 'Grade B',
  },
};

export function GradeBadge({ grade, size = 'md', className = '' }: GradeBadgeProps) {
  const style = gradeStyles[grade] || gradeStyles['A'];
  return (
    <span
      className={[
        'inline-flex items-center rounded-md font-bold border',
        'uppercase tracking-wider leading-none shadow-xs',
        style.bg,
        style.text,
        style.border,
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs',
        className,
      ].join(' ')}
      role="img"
      aria-label={style.label}
    >
      {grade}
    </span>
  );
}
