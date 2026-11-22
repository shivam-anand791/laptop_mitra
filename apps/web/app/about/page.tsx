'use client';

import React from 'react';
import Link from 'next/link';
import CustomerLayout from '../../components/CustomerLayout';
import CertifiedBench from '../../components/CertifiedBench';
import { Award, ShieldCheck, CheckCircle2, Phone, Mail, ArrowRight } from 'lucide-react';
import { NEXT_PUBLIC_SUPPORT_PHONE_DISPLAY, NEXT_PUBLIC_SUPPORT_EMAIL } from '../../lib/config';
import { ABOUT_CONTENT } from '@laptopmitra/types';

export default function AboutPage() {
  const { hero, mission, coreValues, process } = ABOUT_CONTENT;

  return (
    <CustomerLayout>
      <div className="bg-[#F7F4EE] min-h-screen py-10 sm:py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          {/* Header Section */}
          <div className="text-center space-y-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-[#2563EB] border border-blue-200">
              <Award className="w-4 h-4" /> {hero.badge}
            </span>
            <h1 className="text-3xl sm:text-5xl font-black text-[#0B1F4B] tracking-tight">
              {hero.title}
            </h1>
            <p className="text-base sm:text-lg text-slate-600 max-w-3xl mx-auto leading-relaxed">
              {hero.description}
            </p>
          </div>

          {/* Mission & Stats */}
          <div className="bg-[#FFFDF9] rounded-3xl p-8 sm:p-12 border border-[#E6DFD5] shadow-xs space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#0B1F4B]">
              {mission.title}
            </h2>
            <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
              {mission.paragraphs.map((p, idx) => (
                <p key={idx}>{p}</p>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-6 pt-6 border-t border-[#E6DFD5] max-w-md">
              {mission.stats.map((s, idx) => (
                <div key={idx} className="border-l-4 border-[#2563EB] pl-4">
                  <span className="text-2xl sm:text-3xl font-black text-[#0B1F4B] block">{s.value}</span>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mt-0.5">{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Core Values */}
          <div className="space-y-6">
            <div className="text-center">
              <span className="text-[#2563EB] font-bold tracking-widest uppercase text-xs">Our Core Values</span>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#0B1F4B] mt-1">Why Partner With Us?</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {coreValues.map((value, idx) => (
                <div key={idx} className="bg-[#FFFDF9] p-6 sm:p-8 rounded-2xl border border-[#E6DFD5] shadow-xs space-y-3 interactive-lift">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#2563EB] border border-blue-100 flex items-center justify-center font-bold text-lg">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-[#0B1F4B]">{value.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{value.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Refurbishment Process */}
          <div className="bg-[#FFFDF9] rounded-3xl p-8 sm:p-12 border border-[#E6DFD5] shadow-xs space-y-8">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-[#0B1F4B]">The Refurbishment Process</h2>
              <p className="text-slate-500 text-sm mt-1">How we turn pre-owned corporate hardware into powerful, reliable assets for your team.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {process.map((step) => (
                <div key={step.step} className="p-5 rounded-2xl bg-[#FAF6EF] border border-[#E6DFD5] space-y-3">
                  <div className="w-8 h-8 rounded-full bg-[#2563EB] text-white font-bold text-sm flex items-center justify-center shadow-xs">
                    {step.step}
                  </div>
                  <h4 className="font-bold text-[#0B1F4B] text-sm">{step.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* The Certified Bench & Quality Standards */}
          <div id="quality-process">
            <CertifiedBench />
          </div>

          {/* Contact / Support Footer Card */}
          <div className="bg-[#0B1F4B] text-white rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-xl">
            <h3 className="text-2xl sm:text-3xl font-bold">Need assistance or a corporate fleet quote?</h3>
            <p className="text-sm text-slate-300 max-w-xl mx-auto">
              Our hardware specialists are ready to help your business select, test, and deploy certified IT equipment.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-6 pt-2 text-sm font-semibold">
              <a href={`tel:${NEXT_PUBLIC_SUPPORT_PHONE_DISPLAY.replace(/[^0-9+]/g, '')}`} className="flex items-center gap-2 hover:text-blue-300 transition button-press">
                <Phone className="w-4 h-4 text-emerald-400" /> {NEXT_PUBLIC_SUPPORT_PHONE_DISPLAY}
              </a>
              <a href={`mailto:${NEXT_PUBLIC_SUPPORT_EMAIL}`} className="flex items-center gap-2 hover:text-blue-300 transition button-press">
                <Mail className="w-4 h-4 text-blue-300" /> {NEXT_PUBLIC_SUPPORT_EMAIL}
              </a>
            </div>
          </div>

        </div>
      </div>
    </CustomerLayout>
  );
}
