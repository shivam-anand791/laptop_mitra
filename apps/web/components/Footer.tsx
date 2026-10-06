import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="bg-[#0B1F4B] text-slate-300 border-t border-[#132E6B] text-sm mt-auto">
      {/* Trust & Guarantees Strip */}
      <div className="border-b border-[#132E6B]/60 bg-[#071433]/50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="flex flex-col items-center p-3.5 rounded-xl bg-[#0B1F4B]/60 border border-[#132E6B]/50">
            <div className="w-10 h-10 rounded-xl bg-[#1D6FF2]/15 text-[#3B82F6] flex items-center justify-center mb-2.5 text-xl">
              🛡️
            </div>
            <h4 className="text-white font-bold text-xs sm:text-sm mb-0.5">1-Year Warranty</h4>
            <p className="text-[11px] text-slate-400 max-w-[190px]">Comprehensive hardware replacement &amp; doorstep service</p>
          </div>
          <div className="flex flex-col items-center p-3.5 rounded-xl bg-[#0B1F4B]/60 border border-[#132E6B]/50">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-2.5 text-xl">
              🔍
            </div>
            <h4 className="text-white font-bold text-xs sm:text-sm mb-0.5">32-Point Inspected</h4>
            <p className="text-[11px] text-slate-400 max-w-[190px]">Certified Grade A+ diagnostics, battery &amp; thermal testing</p>
          </div>
          <div className="flex flex-col items-center p-3.5 rounded-xl bg-[#0B1F4B]/60 border border-[#132E6B]/50">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center mb-2.5 text-xl">
              🔄
            </div>
            <h4 className="text-white font-bold text-xs sm:text-sm mb-0.5">7-Day Replacement</h4>
            <p className="text-[11px] text-slate-400 max-w-[190px]">Zero-friction replacement guarantee for complete peace of mind</p>
          </div>
          <div className="flex flex-col items-center p-3.5 rounded-xl bg-[#0B1F4B]/60 border border-[#132E6B]/50">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center mb-2.5 text-xl">
              ⚡
            </div>
            <h4 className="text-white font-bold text-xs sm:text-sm mb-0.5">PAN India Delivery</h4>
            <p className="text-[11px] text-slate-400 max-w-[190px]">Free insured express delivery with real-time tracking</p>
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="inline-flex items-center bg-white px-3 py-1.5 rounded-xl shadow-xs transition-opacity hover:opacity-90" aria-label="LaptopMitra Home">
              <Image
                src="/logo.png"
                alt="LaptopMitra"
                width={150}
                height={50}
                className="h-8 sm:h-9 w-auto object-contain"
              />
            </Link>
            <p className="text-xs leading-relaxed text-slate-400 max-w-sm">
              LaptopMitra is India&apos;s leading platform for certified pre-owned and enterprise refurbished laptops. Every device passes a rigorous 32-point engineering inspection with genuine OS licenses.
            </p>

            {/* Sourced Brands (Strictly only Lenovo, HP, Dell) */}
            <div className="pt-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5">
                Brands We Deal In:
              </span>
              <div className="flex items-center gap-3">
                {/* Lenovo Logo */}
                <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white font-black text-xs tracking-wider">
                  Lenovo
                </div>
                {/* HP Logo */}
                <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white font-black text-xs tracking-wider">
                  HP
                </div>
                {/* Dell Logo */}
                <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white font-black text-xs tracking-wider">
                  DELL
                </div>
              </div>
            </div>
          </div>

          {/* Col 1: Shop */}
          <div className="space-y-3">
            <h3 className="text-white font-bold text-sm tracking-wide uppercase text-xs">
              Shop Categories
            </h3>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <Link href="/products?category=cat-business" className="hover:text-white transition-colors">
                  Business Laptops
                </Link>
              </li>
              <li>
                <Link href="/products?category=cat-apple" className="hover:text-white transition-colors">
                  Apple MacBooks
                </Link>
              </li>
              <li>
                <Link href="/products?category=cat-gaming" className="hover:text-white transition-colors">
                  Gaming Laptops
                </Link>
              </li>
              <li>
                <Link href="/products?category=cat-student" className="hover:text-white transition-colors">
                  Student Laptops Under ₹25k
                </Link>
              </li>
              <li>
                <Link href="/products?type=lease" className="hover:text-white transition-colors">
                  Corporate Leasing
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 2: Support & Programs */}
          <div className="space-y-3">
            <h3 className="text-white font-bold text-sm tracking-wide uppercase text-xs">
              Customer Support
            </h3>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <Link href="/products" className="hover:text-white transition-colors">
                  Warranty &amp; Returns Policy
                </Link>
              </li>
              <li>
                <Link href="/profile#orders" className="hover:text-white transition-colors">
                  Track My Order
                </Link>
              </li>
              <li>
                <Link href="/profile#referral" className="hover:text-white transition-colors">
                  Mitra Partner Program (10% Cash)
                </Link>
              </li>
              <li>
                <a href="tel:+919999999999" className="hover:text-white transition-colors">
                  Direct Call: +91 99999 99999
                </a>
              </li>
              <li>
                <a href="https://wa.me/919999999999" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  WhatsApp Support
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Company & Trust */}
          <div className="space-y-3">
            <h3 className="text-white font-bold text-sm tracking-wide uppercase text-xs">
              Company
            </h3>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  About LaptopMitra
                </Link>
              </li>
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  32-Point Quality Process
                </Link>
              </li>
              <li>
                <Link href="/products" className="hover:text-white transition-colors">
                  Enterprise Bulk Quotations
                </Link>
              </li>
              <li>
                <span className="text-slate-500">
                  Mon-Sat: 10:00 AM - 7:00 PM IST
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-[#132E6B]/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} LaptopMitra. All rights reserved. Certified Refurbished Hardware.</p>
          <div className="flex items-center space-x-6">
            <Link href="/" className="hover:text-slate-200 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/" className="hover:text-slate-200 transition-colors">
              Terms of Service
            </Link>
            <Link href="/" className="hover:text-slate-200 transition-colors">
              Security &amp; Warranty
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
