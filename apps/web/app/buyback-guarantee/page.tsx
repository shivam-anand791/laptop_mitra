'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import CustomerLayout from '../../components/CustomerLayout';
import CertifiedBench from '../../components/CertifiedBench';
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  TrendingUp,
  Laptop,
  Check,
  RotateCcw,
  Sparkles,
  Info,
} from 'lucide-react';
import { NEXT_PUBLIC_WHATSAPP_NUMBER } from '../../lib/config';
import { BUYBACK_POLICY } from '@laptopmitra/types';

const CONDITIONS = [
  {
    id: 'LIKE_NEW',
    title: 'Like-New (Flawless)',
    multiplier: 1.0,
    desc: 'Zero scratches, 85%+ battery health, all original keys & display perfect.',
  },
  {
    id: 'GOOD',
    title: 'Good (Normal Office Wear)',
    multiplier: 0.95,
    desc: 'Minor faint micro-marks on outer lid, display intact, 80%+ battery capacity.',
  },
  {
    id: 'FAIR',
    title: 'Fair (Visible Handling)',
    multiplier: 0.85,
    desc: 'Noticeable corner scuffs or minor keyboard shine, 100% fully functional hardware.',
  },
];

export default function BuybackGuaranteePage() {
  const { title, subtitle, tiers, note, eligibility, deductions, howToClaim } = BUYBACK_POLICY;

  // Interactive Estimator State
  const [purchasePrice, setPurchasePrice] = useState<number>(30000);
  const [selectedTierIdx, setSelectedTierIdx] = useState<number>(0);
  const [selectedCondition, setSelectedCondition] = useState<'LIKE_NEW' | 'GOOD' | 'FAIR'>('GOOD');
  const [bootsToOs, setBootsToOs] = useState(true);
  const [screenIntact, setScreenIntact] = useState(true);
  const [hasCharger, setHasCharger] = useState(true);

  const activeTier = tiers[selectedTierIdx] || tiers[0];
  const activeCondition = CONDITIONS.find((c) => c.id === selectedCondition) || CONDITIONS[1];

  // Price Calculation according strictly to BUYBACK_POLICY mathematical tiers
  const baseValue = Math.round((purchasePrice * activeTier.percentage) / 100);
  const conditionValue = Math.round(baseValue * activeCondition.multiplier);
  const chargerDeduction = hasCharger ? 0 : 1000;
  const estimatedBuybackValue = Math.max(0, conditionValue - chargerDeduction);

  const isEligible = bootsToOs && screenIntact;

  return (
    <CustomerLayout>
      <div className="bg-[#F7F4EE] min-h-screen py-10 sm:py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          {/* Hero Section */}
          <div className="text-center space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-[#2563EB] border border-blue-200">
              <ShieldCheck className="w-4 h-4" /> Assured Liquidity Program
            </span>
            <h1 className="text-3xl sm:text-5xl font-black text-[#0B1F4B] tracking-tight">
              {title}
            </h1>
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              {subtitle}
            </p>
          </div>

          {/* Interactive Buyback Calculator */}
          <div className="bg-[#FFFDF9] rounded-3xl shadow-xs border border-[#E6DFD5] p-6 sm:p-10 space-y-8">
            <div className="border-b border-[#E6DFD5] pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[#2563EB] font-bold tracking-widest uppercase text-xs">Live Value Estimator</span>
                <h2 className="text-2xl font-black text-[#0B1F4B] mt-1">
                  Calculate Your Guaranteed Liquidity
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Estimate guaranteed repurchase value based on your invoice price and ownership period.
                </p>
              </div>

              <div className="shrink-0 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Instant Bank Payout Upon Inspection</span>
              </div>
            </div>

            {/* Step 1: Laptop Invoice Price Selection */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center justify-between">
                <span>1. Original Purchase Price (₹)</span>
                <span className="font-mono text-[#0B1F4B] text-sm font-black">₹{purchasePrice.toLocaleString('en-IN')}</span>
              </label>

              <div className="flex flex-wrap items-center gap-2">
                {[20000, 25000, 30000, 45000, 60000, 80000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setPurchasePrice(preset)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      purchasePrice === preset
                        ? 'bg-[#2563EB] text-white shadow-xs'
                        : 'bg-[#FAF6EF] border border-[#E6DFD5] text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    ₹{preset.toLocaleString('en-IN')}
                  </button>
                ))}
              </div>
              <input
                type="range"
                min={15000}
                max={150000}
                step={1000}
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(Number(e.target.value))}
                className="w-full accent-[#2563EB] cursor-pointer"
              />
            </div>

            {/* Step 2: Ownership Tenure Selector */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                2. Device Ownership Tenure
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                {tiers.map((tier, idx) => {
                  const isSelected = selectedTierIdx === idx;
                  return (
                    <button
                      key={tier.period}
                      type="button"
                      onClick={() => setSelectedTierIdx(idx)}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#2563EB] bg-blue-50/70 shadow-xs ring-1 ring-[#2563EB]/20'
                          : 'border-[#E6DFD5] bg-[#FAF6EF] hover:border-slate-300'
                      }`}
                    >
                      <span className={`block text-xs font-bold ${isSelected ? 'text-[#0B1F4B]' : 'text-slate-700'}`}>
                        {tier.period}
                      </span>
                      <span className="block text-sm font-black text-[#2563EB] mt-0.5">
                        {tier.percentage}%
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Device Condition & Functional Checklist */}
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                3. Physical Condition Assessment
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {CONDITIONS.map((cond) => {
                  const isSelected = selectedCondition === cond.id;
                  return (
                    <button
                      key={cond.id}
                      type="button"
                      onClick={() => setSelectedCondition(cond.id as any)}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'border-[#2563EB] bg-blue-50/50 shadow-xs ring-1 ring-[#2563EB]/20'
                          : 'border-[#E6DFD5] bg-[#FAF6EF] hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-[#0B1F4B]">{cond.title}</span>
                        <span className={`text-[11px] font-bold ${isSelected ? 'text-[#2563EB]' : 'text-slate-400'}`}>
                          {isSelected ? 'Active' : 'Select'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 leading-relaxed">{cond.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Functional Checklist Verification */}
            <div className="p-4 rounded-2xl bg-[#FAF6EF] border border-[#E6DFD5] space-y-3">
              <span className="text-xs font-bold text-[#0B1F4B] block">Basic Hardware Health Checklist</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <label className="flex items-center gap-2 cursor-pointer bg-[#FFFDF9] p-3 rounded-xl border border-[#E6DFD5]">
                  <input
                    type="checkbox"
                    checked={bootsToOs}
                    onChange={(e) => setBootsToOs(e.target.checked)}
                    className="w-4 h-4 text-[#2563EB] rounded focus:ring-[#2563EB]"
                  />
                  <span className="text-slate-800 font-medium">Boots into OS normally</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-[#FFFDF9] p-3 rounded-xl border border-[#E6DFD5]">
                  <input
                    type="checkbox"
                    checked={screenIntact}
                    onChange={(e) => setScreenIntact(e.target.checked)}
                    className="w-4 h-4 text-[#2563EB] rounded focus:ring-[#2563EB]"
                  />
                  <span className="text-slate-800 font-medium">Screen display intact (no crack)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-[#FFFDF9] p-3 rounded-xl border border-[#E6DFD5]">
                  <input
                    type="checkbox"
                    checked={hasCharger}
                    onChange={(e) => setHasCharger(e.target.checked)}
                    className="w-4 h-4 text-[#2563EB] rounded focus:ring-[#2563EB]"
                  />
                  <span className="text-slate-800 font-medium">Original Charger Included</span>
                </label>
              </div>

              {!isEligible && (
                <p className="text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5">
                  ⚠️ Motherboard booting and display intactness are mandatory for assured buyback.
                </p>
              )}
            </div>

            {/* Live Guaranteed Estimate Reveal Card */}
            <div className="p-6 rounded-3xl bg-gradient-to-br from-[#0B1F4B] to-[#162D66] text-white shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="space-y-1 text-center sm:text-left">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-200 block">
                  Estimated Guaranteed Repurchase Payout
                </span>
                <div className="text-3xl sm:text-4xl font-black text-white tabular-nums tracking-tight">
                  {isEligible ? `₹${estimatedBuybackValue.toLocaleString('en-IN')}` : 'Ineligible Device'}
                </div>
                <p className="text-xs text-slate-300">
                  {isEligible
                    ? `${activeTier.percentage}% policy guarantee on ₹${purchasePrice.toLocaleString('en-IN')} invoice (${activeTier.period})`
                    : 'Critical failure detected. Please contact support for part salvage valuation.'}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full sm:w-auto">
                <Link
                  href="/account/orders"
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs shadow-xs button-press transition-all text-center"
                >
                  Claim Buyback From Orders →
                </Link>
                <a
                  href={`https://wa.me/${NEXT_PUBLIC_WHATSAPP_NUMBER}?text=Hi%20LaptopMitra,%20I%20want%20to%20claim%20Buyback%20estimate%20of%20₹${estimatedBuybackValue}%20for%20my%20laptop`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/20 transition-all text-center"
                >
                  WhatsApp Specialist
                </a>
              </div>
            </div>
          </div>

          {/* Schedule Table */}
          <div className="bg-[#FFFDF9] rounded-3xl shadow-xs border border-[#E6DFD5] overflow-hidden">
            <div className="p-6 sm:p-8 border-b border-[#E6DFD5]">
              <h2 className="text-xl font-bold text-[#0B1F4B] mb-5 flex items-center gap-2">
                <span>📈</span> Complete Assured Buyback Value Schedule
              </h2>
              
              <div className="overflow-x-auto rounded-2xl border border-[#E6DFD5]">
                <table className="w-full text-sm text-left text-slate-600">
                  <thead className="text-xs text-[#0B1F4B] uppercase bg-[#FAF6EF] border-b border-[#E6DFD5]">
                    <tr>
                      <th className="px-5 py-3.5 font-bold">Ownership Period</th>
                      <th className="px-5 py-3.5 font-bold text-[#2563EB]">Buyback Value (%)</th>
                      <th className="px-5 py-3.5 font-bold">Example (Laptop Price ₹30,000)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6DFD5]">
                    {tiers.map((tier, idx) => (
                      <tr key={tier.period} className={idx % 2 === 0 ? 'bg-[#FAF6EF]/40' : 'bg-[#FFFDF9]'}>
                        <td className="px-5 py-3.5 font-semibold text-[#0B1F4B]">{tier.period}</td>
                        <td className="px-5 py-3.5 font-bold text-[#2563EB]">{tier.percentage}%</td>
                        <td className="px-5 py-3.5 font-medium text-slate-600">{tier.example}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-500 mt-3 font-medium">{note}</p>
            </div>

            <div className="p-6 sm:p-8 space-y-8">
              {/* 1. Eligibility Criteria */}
              <section className="space-y-3">
                <h3 className="text-lg font-bold text-[#0B1F4B]">1. Eligibility Criteria</h3>
                <ul className="list-disc list-outside ml-5 space-y-1.5 text-slate-600 text-sm leading-relaxed">
                  {eligibility.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </section>

              {/* 2. Condition & Deductions */}
              <section className="space-y-3">
                <h3 className="text-lg font-bold text-[#0B1F4B]">2. Condition &amp; Deductions</h3>
                <p className="text-sm text-slate-600">
                  The assured price assumes the laptop is in &quot;Good&quot; condition. Deductions may apply for the following:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border border-[#E6DFD5] rounded-2xl p-4 bg-[#FAF6EF]/60">
                    <span className="font-bold text-[#0B1F4B] text-sm block mb-1">Functional Issues</span>
                    <p className="text-xs text-slate-600 leading-relaxed">{deductions.functional}</p>
                  </div>
                  <div className="border border-[#E6DFD5] rounded-2xl p-4 bg-[#FAF6EF]/60">
                    <span className="font-bold text-[#0B1F4B] text-sm block mb-1">Physical Damage</span>
                    <p className="text-xs text-slate-600 leading-relaxed">{deductions.physical}</p>
                  </div>
                  <div className="border border-[#E6DFD5] rounded-2xl p-4 bg-[#FAF6EF]/60">
                    <span className="font-bold text-[#0B1F4B] text-sm block mb-1">Accessories</span>
                    <p className="text-xs text-slate-600 leading-relaxed">{deductions.accessories}</p>
                  </div>
                </div>
              </section>

              {/* 3. How to Claim */}
              <section className="space-y-3">
                <h3 className="text-lg font-bold text-[#0B1F4B]">3. How to Claim</h3>
                <ol className="list-decimal list-outside ml-5 space-y-2 text-slate-600 text-sm leading-relaxed">
                  {howToClaim.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </section>
            </div>
          </div>

          {/* Embedded Certified Bench */}
          <CertifiedBench />

          {/* Call to action */}
          <div className="bg-[#0B1F4B] rounded-3xl p-8 sm:p-10 text-white text-center space-y-4 shadow-xl">
            <h3 className="text-2xl sm:text-3xl font-black">Ready to browse certified laptops?</h3>
            <p className="text-sm text-slate-300 max-w-lg mx-auto">
              Every machine comes with Grade A+ certification, warranty coverage, and guaranteed buyback liquidity up to 36 months.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
              <Link
                href="/products"
                className="px-6 py-3 rounded-xl bg-white text-blue-900 font-bold text-sm shadow hover:bg-blue-50 transition"
              >
                Browse Laptops Now →
              </Link>
              <a
                href={`https://wa.me/${NEXT_PUBLIC_WHATSAPP_NUMBER}?text=Hi%20LaptopMitra,%20I%20have%20questions%20about%20the%20Buyback%20Guarantee`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 rounded-xl bg-blue-800 text-white font-bold text-sm border border-blue-700 hover:bg-blue-700 transition"
              >
                Chat on WhatsApp
              </a>
            </div>
          </div>

        </div>
      </div>
    </CustomerLayout>
  );
}
