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
  CheckCircle2,
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
  // Derive product-aware details gracefully
  const warrantyLabel = product?.metadata?.warranty || '1-Year Comprehensive Warranty';
  const conditionLabel = product?.metadata?.condition || 'Grade A+ Certified Refurbished';

  const promises = [
    {
      id: 'return-buyback',
      icon: CalendarCheck,
      iconColor: 'text-[#1D6FF2]',
      iconBg: 'bg-blue-50 border-blue-100',
      badge: '7-Day Return • 36-Mo Buyback',
      badgeColor: 'bg-blue-50 text-[#1D6FF2] border-blue-200',
      title: '7-Day Return & Assured Buyback',
      description:
        'Hassle-free doorstep replacement or full refund within 7 days for any functional defect. Plus, sell back anytime within 36 months for up to 70% assured valuation.',
      link: showBuybackLink ? '/buyback-guarantee' : undefined,
      linkLabel: 'View Buyback Terms',
    },
    {
      id: 'value-assurance',
      icon: ShieldCheck,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50 border-emerald-100',
      badge: 'Transparent Pricing • 18% GST',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      title: 'Direct Enterprise Value',
      description:
        'Direct procurement from corporate IT refreshes removes middleman markups. Every order includes a verified B2B GST tax invoice with 18% input credit eligible.',
    },
    {
      id: 'data-security',
      icon: Lock,
      iconColor: 'text-indigo-600',
      iconBg: 'bg-indigo-50 border-indigo-100',
      badge: 'NIST 800-88 Sanitization',
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      title: 'Certified Data Sanitization',
      description:
        'Storage drives undergo deep multi-pass sector wiping followed by fresh factory OS installation, guaranteeing 100% data privacy with zero prior corporate or user residue.',
    },
    {
      id: 'warranty-protection',
      icon: Award,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-50 border-amber-100',
      badge: warrantyLabel,
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      title: 'Doorstep Warranty Protection',
      description:
        'Comprehensive hardware protection for motherboard, display circuitry, power delivery, and OEM charger. Backed by pan-India doorstep pick-up and repair.',
    },
    {
      id: 'like-new-quality',
      icon: Laptop,
      iconColor: 'text-sky-600',
      iconBg: 'bg-sky-50 border-sky-100',
      badge: conditionLabel,
      badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
      title: '32-Point Quality Inspection',
      description:
        'Hardware engineers inspect keyboards, zero-bleed screens, ports, and audio. Thermals repasted with Arctic MX-4 and sealed in tamper-evident protective bubble sleeves.',
    },
    {
      id: 'performance-assurance',
      icon: Gauge,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-50 border-emerald-100',
      badge: '> 85% Battery Health',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      title: 'Stress-Tested Performance',
      description:
        'Full PassMark benchmark stress tests verify authentic processor clock speeds, dual-channel RAM throughput, and battery discharge retention under real-world loads.',
    },
  ];

  return (
    <section
      aria-labelledby="quality-promise-heading"
      className={`bg-white rounded-3xl border border-[#E4E9F2] shadow-sm p-6 sm:p-8 lg:p-10 ${className}`}
    >
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10 space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-blue-50 text-[#1D6FF2] border border-blue-200 shadow-2xs">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>The Laptop Mitra Standard</span>
        </div>

        <h2
          id="quality-promise-heading"
          className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#0B1F4B] tracking-tight leading-tight"
        >
          LaptopMitra.com — The Gold Standard in Refurbished IT Assets
        </h2>

        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-2xl mx-auto">
          Every certified device is backed by rigorous multi-stage engineering audits, verifiable
          warranty, transparent commercial terms, and assured lifetime buyback.
        </p>
      </div>

      {/* 6-Card Responsive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
        {promises.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className="group relative p-5 sm:p-6 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] hover:border-blue-300 hover:bg-white hover:shadow-md transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                {/* Top Row: Icon + Badge */}
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div
                    className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center border shrink-0 transition-transform duration-200 group-hover:scale-105 ${item.iconBg}`}
                  >
                    <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${item.iconColor}`} />
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border truncate max-w-[200px] shadow-2xs ${item.badgeColor}`}
                  >
                    {item.badge}
                  </span>
                </div>

                {/* Card Title */}
                <h3 className="text-sm sm:text-base font-bold text-[#0B1F4B] group-hover:text-[#1D6FF2] transition-colors mb-2">
                  {item.title}
                </h3>

                {/* Card Description */}
                <p className="text-xs text-slate-600 leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Optional Footer Link */}
              {item.link && (
                <div className="pt-3 mt-3 border-t border-slate-200/60">
                  <Link
                    href={item.link}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#1D6FF2] hover:text-[#1558C0] transition-colors"
                  >
                    <span>{item.linkLabel}</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Trust Micro-Strip */}
      <div className="mt-8 pt-6 border-t border-[#E4E9F2] flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
        <span className="font-medium">
          🛡️ All refurbishments are performed in certified static-controlled facilities.
        </span>
        <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-600">
          <span>• Pan-India Logistics</span>
          <span>• Doorstep Verification</span>
          <span>• Genuine OEM Adapters</span>
        </div>
      </div>
    </section>
  );
}
