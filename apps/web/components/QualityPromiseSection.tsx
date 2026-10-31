'use client';

import React from 'react';
import Link from 'next/link';
import {
  CalendarCheck,
  ShieldCheck,
  Lock,
  Award,
  Laptop,
  Gauge,
  ArrowRight,
} from 'lucide-react';
import { Product } from '../lib/types';

export interface QualityPromiseSectionProps {
  product?: Product | null;
  className?: string;
  showBuybackLink?: boolean;
}

export default function QualityPromiseSection({
  product,
  className = '',
  showBuybackLink = true,
}: QualityPromiseSectionProps) {
  const promises = [
    {
      id: 'return-buyback',
      icon: CalendarCheck,
      iconColor: 'text-[#15803D]',
      iconBg: 'bg-emerald-50 border-emerald-200',
      title: '14 Days Return & Buyback Assurance',
      link: showBuybackLink ? '/buyback-guarantee' : undefined,
    },
    {
      id: 'price-value',
      icon: ShieldCheck,
      iconColor: 'text-[#2563EB]',
      iconBg: 'bg-blue-50 border-blue-200',
      title: 'Price Value Guarantee',
    },
    {
      id: 'data-security',
      icon: Lock,
      iconColor: 'text-[#0284C7]',
      iconBg: 'bg-sky-50 border-sky-200',
      title: 'Data Security',
    },
    {
      id: 'warranty',
      icon: Award,
      iconColor: 'text-[#2563EB]',
      iconBg: 'bg-blue-50 border-blue-200',
      title: '1 Year Warranty',
    },
    {
      id: 'like-new',
      icon: Laptop,
      iconColor: 'text-[#0D9488]',
      iconBg: 'bg-teal-50 border-teal-200',
      title: 'Like New Assured',
    },
    {
      id: 'performance',
      icon: Gauge,
      iconColor: 'text-[#059669]',
      iconBg: 'bg-emerald-50 border-emerald-200',
      title: 'Performance Guarantee',
    },
  ];

  return (
    <section
      aria-labelledby="quality-promise-heading"
      className={`relative rounded-3xl border border-[#D0E2FF] bg-gradient-to-b from-white via-white to-[#E8F4FD]/60 p-6 sm:p-8 lg:p-10 shadow-sm overflow-hidden ${className}`}
    >
      {/* Header matching user's exact screenshot */}
      <div className="text-center max-w-2xl mx-auto mb-8 sm:mb-9">
        <h2
          id="quality-promise-heading"
          className="text-2xl sm:text-3xl font-extrabold text-[#0B57D0] tracking-tight"
        >
          LaptopMitra.com –
        </h2>
        <p className="mt-1 text-lg sm:text-xl font-bold text-[#1E293B] tracking-tight">
          The Gold Standard in Refurbished IT Assets
        </p>
      </div>

      {/* 6 Clean Cards: 3 columns x 2 rows (2-cols on mobile for compact balanced scanning) */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
        {promises.map((item) => {
          const Icon = item.icon;
          const CardContent = (
            <div className="w-full h-full min-h-[120px] sm:min-h-[140px] flex flex-col items-center justify-center text-center p-3.5 sm:p-5 rounded-2xl bg-white border border-[#D0E2FF] shadow-[0_2px_8px_rgba(37,99,235,0.06)] hover:border-[#3B82F6] hover:shadow-[0_8px_20px_rgba(37,99,235,0.12)] hover:-translate-y-0.5 transition-all duration-200 group cursor-pointer">
              {/* Illustration-like Icon Badge */}
              <div
                className={`w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center border shadow-xs mb-2 sm:mb-3.5 transition-transform duration-200 group-hover:scale-110 ${item.iconBg}`}
              >
                <Icon className={`w-5 h-5 sm:w-7 sm:h-7 ${item.iconColor}`} strokeWidth={2.2} />
              </div>

              {/* Title */}
              <h3 className="text-xs sm:text-sm lg:text-base font-extrabold text-[#0F172A] leading-snug group-hover:text-[#2563EB] transition-colors max-w-[180px]">
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
