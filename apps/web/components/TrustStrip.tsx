import React from 'react';

const badges = [
  {
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
    label: 'Free Express Delivery',
  },
  {
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    label: '1-Year Warranty',
  },
  {
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    label: '7-Day Replacement',
  },
  {
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    label: 'Secure Payment',
  },
];

export default function TrustStrip({ className = '' }: { className?: string }) {
  return (
    <div
      className={[
        'flex items-center justify-center gap-6 py-4 px-6',
        'bg-[var(--bg-surface)] border-y border-[var(--border-default)]',
        'overflow-x-auto',
        className,
      ].join(' ')}
    >
      {badges.map((badge, i) => (
        <React.Fragment key={badge.label}>
          <div className="flex items-center gap-2 text-[var(--text-secondary)] whitespace-nowrap">
            <span className="text-[var(--accent)]">{badge.icon}</span>
            <span className="text-xs font-medium">{badge.label}</span>
          </div>
          {i < badges.length - 1 && (
            <div className="w-px h-4 bg-[var(--border-default)] shrink-0" aria-hidden="true" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
