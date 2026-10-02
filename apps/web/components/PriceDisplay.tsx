import React from 'react';

interface PriceDisplayProps {
  price: number;
  compareAtPrice?: number;
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
  const discountPercent = compareAtPrice && compareAtPrice > price
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
    <div className={['flex flex-col gap-0.5', className].join(' ')}>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className={`font-black text-[#0B1F4B] font-sans tracking-tight ${s.price}`}>
          {formatINR(price)}
        </span>
        {compareAtPrice && compareAtPrice > price && (
          <span className={`line-through text-slate-400 font-medium ${s.compare}`}>
            {formatINR(compareAtPrice)}
          </span>
        )}
      </div>

      {savings && (
        <p className={`text-emerald-700 font-semibold ${s.savings}`}>
          Save {formatINR(savings)} ({discountPercent}% off)
        </p>
      )}

      {showEmit && (
        <p className={`text-slate-500 font-medium ${s.savings}`}>
          Or {formatINR(Math.round(price / 12))}/mo No-Cost EMI
        </p>
      )}
    </div>
  );
}

