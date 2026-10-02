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
  | 'hotDeal';

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
  primary: 'bg-blue-50 text-[#1D6FF2] border border-blue-200',
  secondary: 'bg-slate-100 text-slate-700 border border-slate-200',
  success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border border-amber-200',
  danger: 'bg-rose-50 text-rose-700 border border-rose-200',
  info: 'bg-sky-50 text-sky-700 border border-sky-200',
  muted: 'bg-slate-100 text-slate-500 border border-slate-200',
  refurb: 'bg-blue-50 text-[#1D6FF2] border border-blue-200 font-black',
  bestSeller: 'bg-amber-50 text-amber-800 border border-amber-200 font-black',
  newArrival: 'bg-blue-50 text-[#1D6FF2] border border-blue-200 font-bold',
  hotDeal: 'bg-rose-50 text-rose-700 border border-rose-200 font-black',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2.5 py-0.5 text-xs',
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
        'inline-flex items-center gap-1.5 rounded-full font-semibold',
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
          ].join(' ')}
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
        'uppercase tracking-wider leading-none shadow-sm',
        style.bg,
        style.text,
        style.border,
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        className,
      ].join(' ')}
      role="img"
      aria-label={style.label}
    >
      {grade}
    </span>
  );
}

