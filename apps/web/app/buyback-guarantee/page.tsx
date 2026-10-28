'use client';

import React from 'react';
import Link from 'next/link';
import CustomerLayout from '../../components/CustomerLayout';
import { ShieldCheck, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { NEXT_PUBLIC_WHATSAPP_NUMBER } from '../../lib/config';
import { BUYBACK_POLICY } from '@laptopmitra/types';

export default function BuybackGuaranteePage() {
  const { title, subtitle, tiers, note, eligibility, deductions, howToClaim } = BUYBACK_POLICY;

  return (
    <CustomerLayout>
      <div className="bg-[#F8FAFC] min-h-screen py-10 sm:py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          {/* Hero Section */}
          <div className="text-center space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-700">
              <ShieldCheck className="w-4 h-4" /> Assured Value Program
            </span>
            <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
              {title}
            </h1>
            <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto">
              {subtitle}
            </p>
          </div>

          {/* Value Table / Cards */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 sm:p-8 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                📈 Assured Buyback Value Schedule
              </h2>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-600 rounded-lg overflow-hidden border border-slate-200">
                  <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3.5 font-bold">Ownership Period</th>
                      <th className="px-5 py-3.5 font-bold text-sky-700">Buyback Value (%)</th>
                      <th className="px-5 py-3.5 font-bold">Example (Laptop Price ₹30,000)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tiers.map((tier, idx) => (
                      <tr key={tier.period} className={idx % 2 === 0 ? 'bg-sky-50/40' : 'bg-white'}>
                        <td className="px-5 py-3.5 font-medium text-slate-900">{tier.period}</td>
                        <td className="px-5 py-3.5 font-bold text-sky-700">{tier.percentage}%</td>
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
                <h3 className="text-lg font-bold text-slate-900">1. Eligibility Criteria</h3>
                <ul className="list-disc list-outside ml-5 space-y-1.5 text-slate-600 text-sm leading-relaxed">
                  {eligibility.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </section>

              {/* 2. Condition & Deductions */}
              <section className="space-y-3">
                <h3 className="text-lg font-bold text-slate-900">2. Condition &amp; Deductions</h3>
                <p className="text-sm text-slate-600">
                  The assured price assumes the laptop is in &quot;Good&quot; condition. Deductions may apply for the following:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                    <span className="font-bold text-slate-800 text-sm block mb-1">Functional Issues</span>
                    <p className="text-xs text-slate-500 leading-relaxed">{deductions.functional}</p>
                  </div>
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                    <span className="font-bold text-slate-800 text-sm block mb-1">Physical Damage</span>
                    <p className="text-xs text-slate-500 leading-relaxed">{deductions.physical}</p>
                  </div>
                  <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                    <span className="font-bold text-slate-800 text-sm block mb-1">Accessories</span>
                    <p className="text-xs text-slate-500 leading-relaxed">{deductions.accessories}</p>
                  </div>
                </div>
              </section>

              {/* 3. How to Claim */}
              <section className="space-y-3">
                <h3 className="text-lg font-bold text-slate-900">3. How to Claim</h3>
                <ol className="list-decimal list-outside ml-5 space-y-2 text-slate-600 text-sm leading-relaxed">
                  {howToClaim.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </section>
            </div>
          </div>

          {/* Call to action */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-3xl p-8 sm:p-10 text-white text-center space-y-4">
            <h3 className="text-2xl sm:text-3xl font-extrabold">Ready to browse certified laptops?</h3>
            <p className="text-sm text-blue-100 max-w-lg mx-auto">
              Every machine comes with Grade A+ certification, 1-Year Warranty, and guaranteed buyback liquidity up to 36 months.
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
