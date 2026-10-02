import React from 'react';

type SpecType = 'ram' | 'storage' | 'processor' | 'display' | 'gpu' | 'default';

interface SpecTagProps {
  variant?: SpecType;
  value: string;
  className?: string;
}

const variantStyles: Record<SpecType, { bg: string; text: string; border: string }> = {
  ram: {
    bg: '#F0F5FF',
    text: '#1D6FF2',
    border: '#C2D9FD',
  },
  storage: {
    bg: '#FAF5FF',
    text: '#9333EA',
    border: '#E9D5FF',
  },
  processor: {
    bg: '#F0FDFA',
    text: '#0D9488',
    border: '#99F6E4',
  },
  display: {
    bg: '#FFFBEB',
    text: '#B45309',
    border: '#FDE68A',
  },
  gpu: {
    bg: '#FFF1F2',
    text: '#E11D48',
    border: '#FECDD3',
  },
  default: {
    bg: '#F1F5F9',
    text: '#475569',
    border: '#E2E8F0',
  },
};

export default function SpecTag({ variant = 'default', value, className = '' }: SpecTagProps) {
  const style = variantStyles[variant] || variantStyles.default;

  // Shorten common values for compact display
  const displayValue = value
    .replace(/GB/gi, '')
    .replace(/SSD/gi, ' SSD')
    .replace(/NVMe/gi, '')
    .trim();

  return (
    <span
      className={[
        'inline-flex items-center px-1.5 py-0.5 rounded-md border',
        'text-[10px] font-semibold leading-tight whitespace-nowrap',
        className,
      ].join(' ')}
      style={{ background: style.bg, color: style.text, borderColor: style.border }}
    >
      {displayValue || value}
    </span>
  );
}

