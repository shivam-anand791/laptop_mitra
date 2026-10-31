'use client';

import React from 'react';
import Link from 'next/link';

export interface QualityPromiseSectionProps {
  product?: any;
  className?: string;
  showBuybackLink?: boolean;
}

export default function QualityPromiseSection({
  className = '',
  showBuybackLink = true,
}: QualityPromiseSectionProps) {
  const promises = [
    {
      id: 'return-buyback',
      title: '14 Days Return &\nBuyback Assurance',
      link: showBuybackLink ? '/buyback-guarantee' : undefined,
      icon: (
        <svg className="w-12 h-12 sm:w-14 sm:h-14" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Calendar Body */}
          <rect x="8" y="12" width="34" height="34" rx="7" fill="#EBF8FF" stroke="#38BDF8" strokeWidth="2.2" />
          <path d="M8 22H42" stroke="#38BDF8" strokeWidth="2.2" />
          {/* Calendar Rings */}
          <rect x="15" y="8" width="4" height="6" rx="2" fill="#0284C7" />
          <rect x="31" y="8" width="4" height="6" rx="2" fill="#0284C7" />
          {/* Calendar Grid Dots */}
          <circle cx="16" cy="29" r="1.8" fill="#38BDF8" />
          <circle cx="25" cy="29" r="1.8" fill="#38BDF8" />
          <circle cx="16" cy="37" r="1.8" fill="#38BDF8" />
          <circle cx="25" cy="37" r="1.8" fill="#38BDF8" />
          {/* Checkmark Badge */}
          <circle cx="39" cy="39" r="9" fill="#10B981" stroke="#FFFFFF" strokeWidth="2.2" />
          <path d="M35 39L37.8 41.8L43.5 36.2" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      id: 'price-value',
      title: 'Price Value\nGuarantee',
      icon: (
        <svg className="w-12 h-12 sm:w-14 sm:h-14" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Shield */}
          <path
            d="M28 8L12 14.5V26.5C12 37.5 18.8 45.8 28 48.5C37.2 45.8 44 37.5 44 26.5V14.5L28 8Z"
            fill="#EFF6FF"
            stroke="#2563EB"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          {/* Shield Inner Checkmark */}
          <path d="M20 26L25.5 31.5L36 21" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Gold Coin / Value Badge */}
          <circle cx="38" cy="38" r="8.5" fill="#F59E0B" stroke="#FFFFFF" strokeWidth="2" />
          <text x="38" y="42" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="900" fontFamily="system-ui, sans-serif">₹</text>
        </svg>
      ),
    },
    {
      id: 'data-security',
      title: 'Data Security',
      icon: (
        <svg className="w-12 h-12 sm:w-14 sm:h-14" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Padlock Body */}
          <rect x="13" y="21" width="28" height="23" rx="6" fill="#0284C7" />
          {/* Padlock Shackle */}
          <path d="M19 21V15C19 10.6 22.6 7 27 7C31.4 7 35 10.6 35 15V21" stroke="#0284C7" strokeWidth="3" strokeLinecap="round" />
          <circle cx="27" cy="31" r="2.5" fill="#FFFFFF" />
          <path d="M27 33.5V37" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
          {/* Green Shield Protection Badge */}
          <path
            d="M40 31L34 33.5V38.5C34 43 36.8 46.5 40 48C43.2 46.5 46 43 46 38.5V33.5L40 31Z"
            fill="#10B981"
            stroke="#FFFFFF"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M37.5 39L39.2 40.7L42.5 37.5" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      id: 'warranty',
      title: '1 Year Warranty',
      icon: (
        <svg className="w-12 h-12 sm:w-14 sm:h-14" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Rosette Ribbon Badge */}
          <path
            d="M28 8L31.5 11.2L36.2 10.4L38.2 14.6L42.8 15.6L43.1 20.4L47 22.8L45.4 27.2L47.7 31.4L44.5 34.9L44.9 39.7L40.4 41.3L38.9 45.8L34.3 45.5L31.3 49.1L28 47L24.7 49.1L21.7 45.5L17.1 45.8L15.6 41.3L11.1 39.7L11.5 34.9L8.3 31.4L10.6 27.2L9 22.8L12.9 20.4L13.2 15.6L17.8 14.6L19.8 10.4L24.5 11.2L28 8Z"
            fill="#EFF6FF"
            stroke="#0284C7"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          {/* Inner Ribbon Tails */}
          <path d="M21 44L17 52L23 49L26 52L25 45" fill="#0284C7" />
          <path d="M35 44L39 52L33 49L30 52L31 45" fill="#0284C7" />
          {/* Checkmark in Center */}
          <circle cx="28" cy="28" r="10" fill="#0284C7" />
          <path d="M23.5 28L26.5 31L32.5 25" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      id: 'like-new',
      title: 'Like New\nAssured',
      icon: (
        <svg className="w-12 h-12 sm:w-14 sm:h-14" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Laptop Screen */}
          <rect x="13" y="14" width="30" height="20" rx="3.5" fill="#F0FDF4" stroke="#0D9488" strokeWidth="2.2" />
          {/* Screen Display Area */}
          <rect x="16" y="17" width="24" height="14" rx="2" fill="#CCFBF1" />
          {/* Laptop Base */}
          <path d="M8 38H48L44 42H12L8 38Z" fill="#0D9488" />
          {/* Star Badge on Screen */}
          <circle cx="37" cy="18" r="8" fill="#14B8A6" stroke="#FFFFFF" strokeWidth="2" />
          <path
            d="M37 13.5L38.3 16.2L41.3 16.6L39.1 18.7L39.6 21.6L37 20.2L34.4 21.6L34.9 18.7L32.7 16.6L35.7 16.2L37 13.5Z"
            fill="#FFFFFF"
          />
        </svg>
      ),
    },
    {
      id: 'performance',
      title: 'Performance\nGuarantee',
      icon: (
        <svg className="w-12 h-12 sm:w-14 sm:h-14" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Speedometer Arc Gauge */}
          <path
            d="M13 36C13 25.5 20.5 16 30 16C39.5 16 47 25.5 47 36"
            stroke="#059669"
            strokeWidth="4"
            strokeLinecap="round"
          />
          {/* Speed Indicator Tick Marks */}
          <path d="M19 32L21.5 30" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
          <path d="M30 20V23" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
          <path d="M41 32L38.5 30" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
          {/* Center Hub */}
          <circle cx="30" cy="36" r="4.5" fill="#059669" />
          {/* Gauge Needle pointing high performance */}
          <path d="M30 36L40 23" stroke="#059669" strokeWidth="2.8" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  return (
    <section
      aria-labelledby="quality-promise-heading"
      className={`relative rounded-2xl sm:rounded-3xl border border-[#C5DCFA] bg-gradient-to-b from-[#F6FAFF] via-white to-[#F0F7FF] p-5 sm:p-7 lg:p-8 shadow-xs overflow-hidden ${className}`}
    >
      {/* Centered Heading exactly matching reference image */}
      <div className="text-center max-w-2xl mx-auto mb-6 sm:mb-8">
        <h2
          id="quality-promise-heading"
          className="text-2xl sm:text-3xl lg:text-[32px] font-black tracking-tight text-[#0066CC] leading-tight"
        >
          LaptopMitra.com –
        </h2>
        <p className="mt-1 text-lg sm:text-xl lg:text-[22px] font-extrabold text-[#0F172A] tracking-tight">
          The Gold Standard in Refurbished IT Assets
        </p>
      </div>

      {/* 6 Cards: Balanced 3 columns x 2 rows on Desktop / Tablet (2 columns on mobile) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-5 max-w-4xl mx-auto">
        {promises.map((item) => {
          const CardContent = (
            <div className="w-full h-full min-h-[125px] sm:min-h-[140px] flex flex-col items-center justify-center text-center p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-[#BFDBFE] shadow-[0_2px_6px_rgba(2,132,199,0.06)] hover:border-[#2563EB] hover:shadow-[0_8px_18px_rgba(37,99,235,0.12)] hover:-translate-y-0.5 transition-all duration-200 group cursor-pointer">
              {/* Illustration Icon */}
              <div className="mb-2 sm:mb-2.5 transition-transform duration-200 group-hover:scale-108 shrink-0">
                {item.icon}
              </div>

              {/* Title with preserved whitespace for 2 neat centered lines */}
              <h3 className="text-xs sm:text-sm lg:text-base font-extrabold text-[#0F172A] leading-snug group-hover:text-[#0066CC] transition-colors whitespace-pre-line max-w-[190px]">
                {item.title}
              </h3>
            </div>
          );

          return item.link ? (
            <Link key={item.id} href={item.link} className="block h-full">
              {CardContent}
            </Link>
          ) : (
            <div key={item.id} className="h-full">
              {CardContent}
            </div>
          );
        })}
      </div>
    </section>
  );
}
