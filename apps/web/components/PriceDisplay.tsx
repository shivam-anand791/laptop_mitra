import React from 'react';

export interface PriceDisplayProps {
  price: number;
  compareAtPrice?: number | null;
  size?: 'sm' | 'md' | 'lg';
  showEmit?: boolean;
  className?: string;
}

function formatINR(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

export default function PriceDisplay({
  price,
  compareAtPrice,
  size = 'md',
  showEmit = false,
  className = '',
}: PriceDisplayProps) {
  const savings = compareAtPrice && compareAtPrice > price ? compareAtPrice - price : null;
  const discountPercent =
    compareAtPrice && compareAtPrice > price
      ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
      : null;

  const sizeConfig = {
    sm: {
      price: 'text-base sm:text-lg',
      compare: 'text-xs',
      savings: 'text-[11px]',
    },
    md: {
      price: 'text-xl sm:text-2xl',
      compare: 'text-sm',
      savings: 'text-xs',
    },
    lg: {
      price: 'text-2xl sm:text-3xl font-extrabold',
      compare: 'text-base',
      savings: 'text-sm',
    },
  };

  const s = sizeConfig[size];

  return (
    <div
      className={['flex flex-col gap-0.5', className].join(' ')}
      aria-label={`Price: ${formatINR(price)}${
        compareAtPrice && compareAtPrice > price ? `, original price ${formatINR(compareAtPrice)}` : ''
      }`}
    >
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className={`font-black text-[#111827] font-sans tracking-tight ${s.price}`}>
          {formatINR(price)}
        </span>
        {compareAtPrice && compareAtPrice > price && (
          <span className={`line-through text-[#94A3B8] font-medium ${s.compare}`} aria-hidden="true">
            {formatINR(compareAtPrice)}
          </span>
        )}
      </div>

      {savings && (
        <p className={`text-[#15803D] font-semibold ${s.savings}`}>
          Save {formatINR(savings)} ({discountPercent}% off)
        </p>
      )}

      {showEmit && (
        <p className={`text-[#475569] font-medium ${s.savings}`}>
          Or {formatINR(Math.round(price / 12))}/mo No-Cost EMI
        </p>
      )}
    </div>
  );
}
