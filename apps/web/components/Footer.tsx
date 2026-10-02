import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-[#0B1F4B] text-slate-300 border-t border-[#132E6B] text-sm mt-auto">
      {/* Newsletter Banner Strip */}
      <div className="border-b border-[#132E6B] bg-[#071433]/70 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="text-center lg:text-left max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#1D6FF2]/20 text-[#3B82F6] border border-[#1D6FF2]/30 mb-2">
              <span>⚡</span> Weekly Stock Drops
            </span>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Get Notified for Flash Deals &amp; Corporate Stock
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Be the first to know when certified ThinkPads, MacBooks, and high-spec workstations arrive in inventory.
            </p>
          </div>

          <form onSubmit={(e) => e.preventDefault()} className="w-full lg:w-auto flex-1 max-w-md">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                placeholder="Enter your work or personal email..."
                className="w-full px-4 py-3 text-sm bg-[#0B1F4B] border border-[#1E3A75] rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1D6FF2] focus:border-transparent transition-all"
                required
              />
              <button
                type="submit"
                className="px-6 py-3 bg-[#1D6FF2] hover:bg-[#1558C0] text-white rounded-xl text-sm font-bold tracking-wide transition-all shadow-md shadow-blue-500/20 shrink-0 cursor-pointer"
              >
                Subscribe
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 text-center lg:text-left">
              🔒 No spam ever. Unsubscribe anytime with 1-click.
            </p>
          </form>
        </div>
      </div>

      {/* Trust & Guarantees Strip */}
      <div className="border-b border-[#132E6B]/60 bg-[#0B1F4B] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="flex flex-col items-center p-3 rounded-xl bg-[#071433]/40 border border-[#132E6B]/40">
            <div className="w-11 h-11 rounded-xl bg-[#1D6FF2]/15 text-[#3B82F6] flex items-center justify-center mb-2.5 text-xl">
              🛡️
            </div>
            <h4 className="text-white font-bold text-sm mb-1">1-Year Warranty</h4>
            <p className="text-[11px] text-slate-400 max-w-[190px]">Doorstep pickup and comprehensive hardware replacement coverage</p>
          </div>
          <div className="flex flex-col items-center p-3 rounded-xl bg-[#071433]/40 border border-[#132E6B]/40">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-2.5 text-xl">
              🔍
            </div>
            <h4 className="text-white font-bold text-sm mb-1">32-Point Inspected</h4>
            <p className="text-[11px] text-slate-400 max-w-[190px]">Certified Grade A+, 90%+ battery life, thermal repasting &amp; stress test</p>
          </div>
          <div className="flex flex-col items-center p-3 rounded-xl bg-[#071433]/40 border border-[#132E6B]/40">
            <div className="w-11 h-11 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center mb-2.5 text-xl">
              🔄
            </div>
            <h4 className="text-white font-bold text-sm mb-1">7-Day Easy Return</h4>
            <p className="text-[11px] text-slate-400 max-w-[190px]">Zero-friction replacement guarantee if you aren&apos;t 100% delighted</p>
          </div>
          <div className="flex flex-col items-center p-3 rounded-xl bg-[#071433]/40 border border-[#132E6B]/40">
            <div className="w-11 h-11 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center mb-2.5 text-xl">
              ⚡
            </div>
            <h4 className="text-white font-bold text-sm mb-1">Pan-India Express</h4>
            <p className="text-[11px] text-slate-400 max-w-[190px]">Insured air express delivery with real-time SMS &amp; tracking alerts</p>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Col (2 cols on large screens) */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1D6FF2] flex items-center justify-center text-white font-black text-lg shadow-md shadow-blue-500/20">
                LM
              </div>
              <span className="text-2xl font-black text-white tracking-tight">
                Laptop<span className="text-[#1D6FF2]">Mitra</span>
              </span>
            </Link>
            <p className="text-xs leading-relaxed text-slate-400 max-w-sm">
              LaptopMitra is India&apos;s leading platform for certified pre-owned and enterprise refurbished laptops. Every device passes a rigorous 32-point engineering inspection with genuine Windows OS licenses.
            </p>

            {/* Sourced Brands list (Strictly only real ones: Lenovo, HP, Dell) */}
            <div className="pt-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Certified OEM Models Available:
              </span>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded bg-[#071433] border border-[#132E6B] text-xs font-semibold text-slate-200">
                  Lenovo ThinkPad
                </span>
                <span className="px-2.5 py-1 rounded bg-[#071433] border border-[#132E6B] text-xs font-semibold text-slate-200">
                  HP EliteBook
                </span>
                <span className="px-2.5 py-1 rounded bg-[#071433] border border-[#132E6B] text-xs font-semibold text-slate-200">
                  Dell Latitude
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#071433] border border-[#132E6B] text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Secure Razorpay Payments
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#071433] border border-[#132E6B] text-blue-400 font-semibold">
                ⭐ 4.8/5 Verified Reviews
              </span>
            </div>
          </div>

          {/* Quick Categories */}
          <div>
            <h5 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Categories</h5>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li><Link href="/products?category=cat-business" className="hover:text-white transition-colors">Business Laptops</Link></li>
              <li><Link href="/products?category=cat-apple" className="hover:text-white transition-colors">Apple MacBooks</Link></li>
              <li><Link href="/products?category=cat-gaming" className="hover:text-white transition-colors">Gaming Rigs &amp; RTX</Link></li>
              <li><Link href="/products?category=cat-ultrabook" className="hover:text-white transition-colors">Slim Ultrabooks</Link></li>
              <li><Link href="/products?maxPrice=25000" className="hover:text-white transition-colors">Budget Deals Under ₹25k</Link></li>
              <li><Link href="/products" className="hover:text-white transition-colors">All Laptop Deals</Link></li>
            </ul>
          </div>

          {/* Mitra Solutions */}
          <div>
            <h5 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Mitra Solutions</h5>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li><Link href="/products" className="hover:text-white transition-colors">Flexible Laptop Leasing</Link></li>
              <li><Link href="/products" className="hover:text-white transition-colors">Bulk Enterprise Orders</Link></li>
              <li><Link href="/profile#referral" className="hover:text-white transition-colors">Mitra Partner Affiliate (10%)</Link></li>
              <li><Link href="/products" className="hover:text-white transition-colors">Laptop Buyback &amp; Trade-In</Link></li>
              <li><Link href="/admin" className="hover:text-[#1D6FF2] font-semibold transition-colors">⚡ Store Admin Portal</Link></li>
            </ul>
          </div>

          {/* Customer Care & Help */}
          <div>
            <h5 className="text-white font-bold text-xs uppercase tracking-wider mb-4">Customer Care</h5>
            <ul className="space-y-2.5 text-xs text-slate-300">
              <li><span className="text-slate-400 block text-[11px]">Email Support:</span> care@laptopmitra.com</li>
              <li><span className="text-slate-400 block text-[11px]">National Helpline:</span> +91 (800) 527-8676</li>
              <li><span className="text-slate-400 block text-[11px]">Working Hours:</span> 10:00 AM – 8:00 PM IST</li>
              <li className="pt-2">
                <span className="text-[11px] text-slate-400 block mb-1">Accepted Payment Modes:</span>
                <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-300 font-semibold">
                  <span className="bg-[#071433] px-2 py-0.5 rounded border border-[#132E6B]">UPI</span>
                  <span className="bg-[#071433] px-2 py-0.5 rounded border border-[#132E6B]">Cards</span>
                  <span className="bg-[#071433] px-2 py-0.5 rounded border border-[#132E6B]">NetBanking</span>
                  <span className="bg-[#071433] px-2 py-0.5 rounded border border-[#132E6B]">EMI</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[#132E6B] mt-12 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-4">
          <p>© {new Date().getFullYear()} LaptopMitra Inc. All rights reserved. India.</p>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-slate-400">
            <Link href="/products" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/products" className="hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/products" className="hover:text-white transition-colors">Warranty Policy</Link>
            <Link href="/products" className="hover:text-white transition-colors">Buyback Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

