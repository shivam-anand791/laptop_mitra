import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-zinc-950 text-zinc-400 border-t border-zinc-800 text-sm mt-auto">
      {/* Trust Badges Strip */}
      <div className="border-b border-zinc-800/80 bg-zinc-900/60 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3 text-2xl">
              🛡️
            </div>
            <h4 className="text-white font-semibold text-base mb-1">1-Year Warranty</h4>
            <p className="text-xs text-zinc-400 max-w-[200px]">Complete doorstep pickup and repair/replacement coverage</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3 text-2xl">
              🔍
            </div>
            <h4 className="text-white font-semibold text-base mb-1">32-Point Inspected</h4>
            <p className="text-xs text-zinc-400 max-w-[200px]">Strictly certified hardware, battery health &gt; 90%, flawless screen</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-3 text-2xl">
              🔄
            </div>
            <h4 className="text-white font-semibold text-base mb-1">7-Day Replacement</h4>
            <p className="text-xs text-zinc-400 max-w-[200px]">Zero-hassle exchange if anything doesn&apos;t meet expectations</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3 text-2xl">
              🤝
            </div>
            <h4 className="text-white font-semibold text-base mb-1">Mitra Affiliate</h4>
            <p className="text-xs text-zinc-400 max-w-[200px]">Earn up to 10% cash commission on every friend referral</p>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">
                LM
              </div>
              <span className="text-xl font-bold text-white tracking-tight">
                Laptop<span className="text-blue-500">Mitra</span>
              </span>
            </Link>
            <p className="text-xs leading-relaxed text-zinc-400 max-w-sm">
              LaptopMitra is India&apos;s most reliable ecosystem for certified pre-owned and refurbished laptops. Every device goes through rigorous military-grade diagnostics, thermal repasting, and genuine OS licensing.
            </p>
            <div className="flex items-center space-x-3 text-xs text-zinc-300">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Secure Razorpay Checkout
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-blue-400 font-medium">
                ⚡ Pan-India Delivery
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h5 className="text-white font-semibold text-sm mb-3 uppercase tracking-wider">Categories</h5>
            <ul className="space-y-2 text-xs">
              <li><Link href="/products?category=cat-business" className="hover:text-white transition-colors">Business Laptops</Link></li>
              <li><Link href="/products?category=cat-apple" className="hover:text-white transition-colors">Apple MacBooks</Link></li>
              <li><Link href="/products?category=cat-gaming" className="hover:text-white transition-colors">Gaming Laptops</Link></li>
              <li><Link href="/products?category=cat-ultrabook" className="hover:text-white transition-colors">Slim Ultrabooks</Link></li>
              <li><Link href="/products?category=cat-student" className="hover:text-white transition-colors">Student Friendly</Link></li>
            </ul>
          </div>

          {/* Customer Support */}
          <div>
            <h5 className="text-white font-semibold text-sm mb-3 uppercase tracking-wider">Mitra Program</h5>
            <ul className="space-y-2 text-xs">
              <li><Link href="/profile#referral" className="hover:text-white transition-colors">Become a Mitra Partner</Link></li>
              <li><Link href="/profile#referral" className="hover:text-white transition-colors">Referral Dashboard</Link></li>
              <li><Link href="/products" className="hover:text-white transition-colors">Buyback Assessment</Link></li>
              <li><Link href="/admin" className="hover:text-white transition-colors">Store Admin Portal</Link></li>
              <li><Link href="/cart" className="hover:text-white transition-colors">Cart &amp; Checkout</Link></li>
            </ul>
          </div>

          {/* Trust & Guarantees */}
          <div>
            <h5 className="text-white font-semibold text-sm mb-3 uppercase tracking-wider">Help &amp; Trust</h5>
            <ul className="space-y-2 text-xs">
              <li><span className="text-zinc-500">Support:</span> care@laptopmitra.com</li>
              <li><span className="text-zinc-500">Helpline:</span> +91 (800) 527-8676</li>
              <li><span className="text-zinc-500">Hours:</span> 10 AM - 8 PM IST</li>
              <li className="pt-2">
                <span className="text-[11px] text-zinc-500 block">Verified Payments by</span>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-300 font-semibold">
                  <span>Razorpay</span> • <span>UPI</span> • <span>Cards</span> • <span>NetBanking</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-zinc-800/80 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-500 gap-4">
          <p>© {new Date().getFullYear()} LaptopMitra Inc. All rights reserved.</p>
          <div className="flex space-x-6">
            <span className="hover:text-zinc-400 cursor-pointer">Privacy Policy</span>
            <span className="hover:text-zinc-400 cursor-pointer">Terms of Service</span>
            <span className="hover:text-zinc-400 cursor-pointer">Warranty Policy</span>
            <span className="hover:text-zinc-400 cursor-pointer">Buyback Terms</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
