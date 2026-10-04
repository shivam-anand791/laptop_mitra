import React from 'react';

type BadgeVariant =
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

type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  primary: 'bg-[#EBF2FF] text-[#1D6FF2] border border-blue-200/80',
  secondary: 'bg-slate-100 text-slate-700 border border-slate-200',
  success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border border-amber-200',
  danger: 'bg-rose-50 text-rose-700 border border-rose-200',
  info: 'bg-sky-50 text-sky-700 border border-sky-200',
  muted: 'bg-slate-100 text-slate-500 border border-slate-200',
  refurb: 'bg-[#0B1F4B] text-white border border-[#0B1F4B] font-extrabold shadow-xs',
  bestSeller: 'bg-[#1D6FF2] text-white border border-[#1D6FF2] font-extrabold shadow-xs',
  newArrival: 'bg-[#EBF2FF] text-[#1D6FF2] border border-blue-200 font-extrabold',
  hotDeal: 'bg-[#F97316] text-white border border-[#F97316] font-extrabold shadow-xs',
  inStock: 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold',
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
            variant === 'success' && 'bg-emerald-500',
            variant === 'warning' && 'bg-amber-500',
            variant === 'danger' && 'bg-rose-500',
            variant === 'info' && 'bg-sky-500',
            variant === 'primary' && 'bg-[#1D6FF2]',
            variant === 'secondary' && 'bg-slate-400',
            variant === 'muted' && 'bg-slate-400',
            variant === 'inStock' && 'bg-emerald-500',
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

type Grade = 'A+' | 'A' | 'B';

interface GradeBadgeProps {
  grade: Grade;
  size?: BadgeSize;
  className?: string;
}

const gradeStyles: Record<Grade, { bg: string; text: string; label: string; border: string }> = {
  'A+': {
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
    label: 'Grade A+ Certified',
  },
  A: {
    bg: 'bg-blue-50',
    text: 'text-[#1D6FF2]',
    border: 'border-blue-200',
    label: 'Grade A Certified',
  },
  B: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
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
