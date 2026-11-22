import React from 'react';

export type RangeOption = '7d' | '30d' | '90d';

export interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  rangeSelector?: {
    value: RangeOption;
    onChange: (range: RangeOption) => void;
    options?: { label: string; value: RangeOption }[];
  };
  className?: string;
}

const defaultRangeOptions: { label: string; value: RangeOption }[] = [
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: '90D', value: '90d' },
];

export function PageHeader({
  title,
  description,
  badge,
  actions,
  rangeSelector,
  className = '',
}: PageHeaderProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 ${className}`}
    >
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold leading-8 text-gray-900 tracking-tight">{title}</h1>
          {badge}
        </div>
        {description && (
          <p className="text-sm leading-5 text-gray-500 mt-1">{description}</p>
        )}
      </div>

      <div className="flex items-center flex-wrap gap-2.5">
        {rangeSelector && (
          <div
            className="inline-flex items-center bg-gray-100 p-1 rounded-md border border-gray-200"
            role="group"
            aria-label="Time range selector"
          >
            {(rangeSelector.options || defaultRangeOptions).map((opt) => {
              const isSelected = rangeSelector.value === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => rangeSelector.onChange(opt.value)}
                  className={`px-3 py-1 text-xs rounded transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-primary text-white font-semibold shadow-xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60 font-medium'
                  }`}
                  aria-pressed={isSelected}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}

        {actions}
      </div>
    </div>
  );
}

export default PageHeader;
