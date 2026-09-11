import React from 'react';

type BadgeVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'muted';

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
  primary: 'bg-[var(--accent-bg)] text-[var(--accent)]',
  secondary: 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]',
  success: 'bg-[rgba(16,185,129,0.15)] text-[#34D399]',
  warning: 'bg-[rgba(251,191,36,0.15)] text-[var(--warning)]',
  danger: 'bg-[rgba(248,113,113,0.15)] text-[var(--danger)]',
  info: 'bg-[rgba(56,189,248,0.15)] text-[var(--info)]',
  muted: 'bg-[var(--bg-elevated)] text-[var(--text-muted)]',
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
        'inline-flex items-center gap-1.5 rounded-[var(--radius-full)] font-semibold',
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
            variant === 'success' && 'bg-[#34D399]',
            variant === 'warning' && 'bg-[var(--warning)]',
            variant === 'danger' && 'bg-[var(--danger)]',
            variant === 'info' && 'bg-[var(--info)]',
            variant === 'primary' && 'bg-[var(--accent)]',
            variant === 'secondary' && 'bg-[var(--text-muted)]',
            variant === 'muted' && 'bg-[var(--text-muted)]',
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

const gradeStyles: Record<Grade, { bg: string; text: string; label: string }> = {
  'A+': {
    bg: 'bg-[var(--accent-bg)]',
    text: 'text-[var(--accent)]',
    label: 'Grade A+ Certified',
  },
  A: {
    bg: 'bg-[rgba(56,189,248,0.15)]',
    text: 'text-[var(--info)]',
    label: 'Grade A Certified',
  },
  B: {
    bg: 'bg-[rgba(251,191,36,0.15)]',
    text: 'text-[var(--warning)]',
    label: 'Grade B',
  },
};

export function GradeBadge({ grade, size = 'md', className = '' }: GradeBadgeProps) {
  const style = gradeStyles[grade];
  return (
    <span
      className={[
        'inline-flex items-center rounded-[var(--radius-full)] font-bold',
        'uppercase tracking-wider leading-none',
        style.bg,
        style.text,
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs',
        className,
      ].join(' ')}
      role="img"
      aria-label={style.label}
    >
      {grade}
    </span>
  );
}
