import React from 'react';

const trustItems = [
  {
    icon: (
      <svg className="w-5 h-5 text-[#1D6FF2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: '100% Genuine Products',
    subtitle: 'with Brand Warranty',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-[#1D6FF2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    title: 'Bulk Orders',
    subtitle: '& Special Pricing',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-[#1D6FF2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
    title: 'PAN India Delivery',
    subtitle: '2,500+ Pin Codes',
  },
  {
    icon: (
      <svg className="w-5 h-5 text-[#1D6FF2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    title: 'Dedicated Support',
    subtitle: 'Before & After Purchase',
  },
];

export default function TrustStrip({ className = '' }: { className?: string }) {
  return (
    <div
      className={[
        'bg-white border-y border-[#E4E9F2] shadow-xs py-4 sm:py-5 px-4 sm:px-6 lg:px-8',
        className,
      ].join(' ')}
    >
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
        {trustItems.map((item) => (
          <div key={item.title} className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#EBF2FF] border border-blue-100 flex items-center justify-center shrink-0 shadow-xs">
              {item.icon}
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-[#0B1F4B] leading-tight">
                {item.title}
              </h4>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-tight mt-0.5">
                {item.subtitle}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
