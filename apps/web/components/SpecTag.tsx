import React from 'react';

type SpecType = 'ram' | 'storage' | 'processor' | 'display' | 'gpu' | 'default';

interface SpecTagProps {
  variant?: SpecType;
  value: string;
  className?: string;
}

const variantStyles: Record<SpecType, { bg: string; text: string }> = {
  ram: {
    bg: 'rgba(14, 165, 233, 0.1)',
    text: '#38BDF8',
  },
  storage: {
    bg: 'rgba(168, 85, 247, 0.1)',
    text: '#C084FC',
  },
  processor: {
    bg: 'rgba(6, 182, 212, 0.1)',
    text: '#22D3EE',
  },
  display: {
    bg: 'rgba(251, 191, 36, 0.1)',
    text: '#FBBF24',
  },
  gpu: {
    bg: 'rgba(251, 113, 133, 0.1)',
    text: '#FB7185',
  },
  default: {
    bg: 'var(--bg-elevated)',
    text: 'var(--text-secondary)',
  },
};

export default function SpecTag({ variant = 'default', value, className = '' }: SpecTagProps) {
  const style = variantStyles[variant];

  // Shorten common values for compact display
  const displayValue = value
    .replace(/GB/gi, '')
    .replace(/SSD/gi, ' SSD')
    .replace(/NVMe/gi, '')
    .trim();

  return (
    <span
      className={[
        'inline-flex items-center px-1.5 py-0.5 rounded-[var(--radius-sm)]',
        'text-[10px] font-medium leading-tight whitespace-nowrap',
        className,
      ].join(' ')}
      style={{ background: style.bg, color: style.text }}
    >
      {displayValue || value}
    </span>
  );
}
