'use client';

import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import FloatingContactButtons from './FloatingContactButtons';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#F5F7FA] text-[#0F172A] selection:bg-blue-100 selection:text-blue-900 relative">
      <Navbar />
      <main className="flex-1 pb-20 md:pb-0">
        {children}
      </main>
      <Footer />
      <FloatingContactButtons />
    </div>
  );
}
