'use client';

import React from 'react';
import CustomerLayout from '../../components/CustomerLayout';
import { FileText } from 'lucide-react';
import { TERMS_CONTENT } from '@laptopmitra/types';

export default function TermsPage() {
  const { lastUpdated, sections } = TERMS_CONTENT;

  return (
    <CustomerLayout>
      <div className="bg-[#F7F4EE] min-h-screen py-10 sm:py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          
          <div className="space-y-3 pb-6 border-b border-[#E6DFD5]">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-50 text-[#2563EB] border border-blue-200/60">
              <FileText className="w-3.5 h-3.5" /> Legal &amp; Policies
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0B1F4B] tracking-tight">
              Terms of Service
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Last updated: {lastUpdated}
            </p>
          </div>

          <div className="space-y-5">
            {sections.map((section) => (
              <div key={section.title} className="bg-[#FFFDF9] p-6 sm:p-8 rounded-2xl border border-[#E6DFD5] shadow-xs space-y-3">
                <h2 className="text-base sm:text-lg font-bold text-[#0B1F4B]">
                  {section.title}
                </h2>
                <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {section.content}
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </CustomerLayout>
  );
}
