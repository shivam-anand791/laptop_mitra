'use client';

import React from 'react';

interface QuantityStepperProps {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
  size?: 'sm' | 'md';
  disabled?: boolean;
}

export default function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  size = 'md',
  disabled = false,
}: QuantityStepperProps) {
  const atMin = value <= min;
  const atMax = value >= max;

  const decrement = () => {
    if (!atMin && !disabled) onChange(value - 1);
  };

  const increment = () => {
    if (!atMax && !disabled) onChange(value + 1);
  };

  const btnSize = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  const textSize = size === 'sm' ? 'text-sm' : 'text-base';

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={[
          'inline-flex items-center rounded-[var(--radius-md)] border border-[var(--border-default)]',
          'bg-[var(--bg-elevated)] overflow-hidden',
          disabled && 'opacity-50',
        ].join(' ')}
        role="spinbutton"
        aria-label="Quantity"
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
      >
        <button
          onClick={decrement}
          disabled={atMin || disabled}
          className={[
            btnSize,
            'flex items-center justify-center text-[var(--text-secondary)]',
            'transition-colors duration-[var(--duration-fast)]',
            'hover:bg-[var(--border-default)] hover:text-[var(--text-primary)]',
            'disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent',
            'focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-[-2px]',
          ].join(' ')}
          aria-label="Decrease quantity"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M5 12h14" />
          </svg>
        </button>

        <span className={`w-10 text-center font-bold font-mono text-[var(--text-primary)] ${textSize}`}>
          {value}
        </span>

        <button
          onClick={increment}
          disabled={atMax || disabled}
          className={[
            btnSize,
            'flex items-center justify-center text-[var(--text-secondary)]',
            'transition-colors duration-[var(--duration-fast)]',
            'hover:bg-[var(--border-default)] hover:text-[var(--text-primary)]',
            'disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent',
            'focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-[-2px]',
          ].join(' ')}
          aria-label="Increase quantity"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M12 5v14m-7-7h14" />
          </svg>
        </button>
      </div>

      {/* Stock helper text */}
      {atMax && max > 0 && (
        <span className="text-[10px] text-[var(--text-muted)]">
          Max {max} {max === 1 ? 'unit' : 'units'}
        </span>
      )}
    </div>
  );
}
