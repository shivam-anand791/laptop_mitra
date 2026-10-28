'use client';

import React from 'react';
import CustomerLayout from '../../components/CustomerLayout';
import { FileText } from 'lucide-react';
import { TERMS_CONTENT } from '@laptopmitra/types';

export default function TermsPage() {
  const { lastUpdated, sections } = TERMS_CONTENT;

  return (
    <CustomerLayout>
      <div className="bg-[#F8FAFC] min-h-screen py-10 sm:py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          
          <div className="space-y-3 pb-6 border-b border-slate-200">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-700">
              <FileText className="w-4 h-4" /> Legal &amp; Policies
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Terms of Service
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Last updated: {lastUpdated}
            </p>
          </div>

          <div className="space-y-6">
            {sections.map((section) => (
              <div key={section.title} className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  {section.title}
                </h2>
                <div className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
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
