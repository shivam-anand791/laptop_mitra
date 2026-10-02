'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import { useCart } from '../lib/cart-context';
import { useWishlist } from '../lib/wishlist-context';

export default function Navbar() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white shadow-[0_2px_12px_rgba(11,31,75,0.06)] border-b border-[#E4E9F2]">
      {/* Top Banner - Deep Navy */}
      <div className="bg-[#0B1F4B] text-white text-xs py-2 px-4 font-medium tracking-wide">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-[#1D6FF2] text-white uppercase tracking-wider">
              Mitra Trust
            </span>
            <span className="hidden sm:inline text-slate-200">
              India&apos;s #1 Certified Pre-Owned &amp; Refurbished Laptop Marketplace
            </span>
          </div>
          <div className="flex items-center space-x-4 sm:space-x-6 text-slate-300 text-xs">
            <span className="hidden md:inline-flex items-center gap-1">
              <span>🛡️</span> 1-Year Comprehensive Warranty
            </span>
            <span className="hidden lg:inline-flex items-center gap-1">
              <span>🔄</span> 7-Day Replacement
            </span>
            <span className="text-amber-300 font-semibold flex items-center gap-1">
              <span>🎁</span> Use code <span className="bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold tracking-wider">MITRA500</span> for ₹500 OFF
            </span>
          </div>
        </div>
      </div>

      {/* Main Nav Tier 1 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18 gap-4 sm:gap-6 py-2">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 shrink-0 group">
            <div className="w-10 h-10 rounded-xl bg-[#1D6FF2] flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div className="text-2xl font-black tracking-tight text-[#0B1F4B] flex items-center leading-none">
                Laptop<span className="text-[#1D6FF2]">Mitra</span>
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                Certified Refurbished
              </div>
            </div>
          </Link>

          {/* Search Bar - Center Pill */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-xl relative">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search MacBook, ThinkPad, i7 16GB, RTX Gaming..."
                className="w-full pl-11 pr-24 py-2.5 text-sm bg-[#F1F5F9] hover:bg-[#EBF2FF]/60 focus:bg-white border border-[#E4E9F2] focus:border-[#1D6FF2] rounded-full focus:outline-none focus:ring-4 focus:ring-blue-500/15 text-[#0F172A] placeholder-slate-400 transition-all shadow-inner"
              />
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <button
                type="submit"
                className="absolute inset-y-1 right-1.5 px-4 bg-[#1D6FF2] hover:bg-[#1558C0] text-white rounded-full text-xs font-semibold tracking-wide transition-colors shadow-sm cursor-pointer"
              >
                Search
              </button>
            </div>
          </form>

          {/* Action Links & CTAs */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Wishlist */}
            <Link
              href="/wishlist"
              className="relative p-2.5 text-slate-600 hover:text-[#1D6FF2] hover:bg-slate-100 rounded-full transition-colors"
              title="Wishlist"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart */}
            <Link
              href="/cart"
              className="relative flex items-center gap-2 px-3.5 py-2 bg-[#EBF2FF] hover:bg-blue-100 text-[#1D6FF2] rounded-full text-sm font-semibold transition-colors border border-blue-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="hidden sm:inline font-bold">Cart</span>
              <span className="bg-[#1D6FF2] text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center shadow-sm">
                {itemCount}
              </span>
            </Link>

            {/* User Account or Auth CTA */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 text-sm font-semibold text-slate-800 hover:text-[#1D6FF2] focus:outline-none p-1.5 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-[#0B1F4B] text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                    {user.name ? user.name[0] : user.email[0]}
                  </div>
                  <span className="hidden md:inline max-w-[100px] truncate text-slate-900">{user.name || user.email.split('@')[0]}</span>
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl border border-[#E4E9F2] py-2 z-50 divide-y divide-slate-100">
                    <div className="px-4 py-2.5">
                      <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">Signed in as</p>
                      <p className="text-sm font-bold text-[#0B1F4B] truncate">{user.email}</p>
                      <div className="mt-1 flex items-center gap-1.5 text-xs text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-md w-fit">
                        <span>⭐ Tier: {user.referralTier || 'BASIC'}</span>
                      </div>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/profile"
                        onClick={() => setUserDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-slate-700 hover:bg-[#F5F7FA] hover:text-[#1D6FF2] font-medium"
                      >
                        📦 My Orders &amp; Profile
                      </Link>
                      <Link
                        href="/profile#referral"
                        onClick={() => setUserDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-slate-700 hover:bg-[#F5F7FA] hover:text-[#1D6FF2] font-medium"
                      >
                        🤝 Mitra Partner (Earn 10%)
                      </Link>
                      <Link
                        href="/admin"
                        onClick={() => setUserDropdownOpen(false)}
                        className="block px-4 py-2 text-sm text-[#1D6FF2] hover:bg-blue-50 font-semibold"
                      >
                        ⚡ Store Admin Portal
                      </Link>
                    </div>
                    <div className="pt-1">
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          logout();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-rose-600 hover:bg-rose-50 font-semibold"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/login"
                  className="hidden sm:inline-block px-3.5 py-2 text-sm font-semibold text-slate-700 hover:text-[#1D6FF2] transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/products"
                  className="px-4 py-2 text-sm font-bold text-white bg-[#1D6FF2] hover:bg-[#1558C0] rounded-full shadow-md shadow-blue-500/25 transition-all hover:shadow-lg hover:-translate-y-0.5 flex items-center gap-1.5"
                >
                  <span>Get a Quote</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 rounded-lg hover:bg-slate-100"
              aria-label="Toggle Navigation Menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Nav Tier 2 - Category Bar (Desktop) */}
      <div className="hidden md:block bg-[#F8FAFC] border-t border-[#E4E9F2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 py-2.5">
            <nav className="flex items-center space-x-6 lg:space-x-8">
              <Link
                href="/products"
                className="flex items-center gap-1 text-[#1D6FF2] hover:text-[#1558C0] font-bold"
              >
                <span>💻 All Laptops</span>
              </Link>
              <Link
                href="/products?category=cat-business"
                className="hover:text-[#1D6FF2] transition-colors"
              >
                Business Series
              </Link>
              <Link
                href="/products?category=cat-apple"
                className="hover:text-[#1D6FF2] transition-colors"
              >
                Apple MacBooks
              </Link>
              <Link
                href="/products?category=cat-gaming"
                className="hover:text-[#1D6FF2] transition-colors"
              >
                Gaming Rigs
              </Link>
              <Link
                href="/products?category=cat-ultrabook"
                className="hover:text-[#1D6FF2] transition-colors"
              >
                Slim Ultrabooks
              </Link>
              <Link
                href="/products?maxPrice=25000"
                className="hover:text-[#1D6FF2] transition-colors"
              >
                Deals Under ₹25k
              </Link>
              <Link
                href="/products"
                className="hover:text-[#1D6FF2] transition-colors"
              >
                Flexible Leasing
              </Link>
              <Link
                href="/products"
                className="hover:text-[#1D6FF2] transition-colors"
              >
                Sell / Buyback
              </Link>
            </nav>

            <div className="hidden lg:flex items-center gap-4 text-slate-500 font-medium text-[11px]">
              <span className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Pan-India Express Delivery
              </span>
              <span className="text-slate-600">
                Helpline: <strong className="text-[#0B1F4B]">+91 800 527 8676</strong>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E4E9F2] bg-white px-4 pt-3 pb-6 space-y-4 shadow-xl">
          <form onSubmit={handleSearchSubmit}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search MacBook, ThinkPad..."
              className="w-full px-4 py-2.5 text-sm bg-[#F1F5F9] border border-[#E4E9F2] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1D6FF2]"
            />
          </form>

          <div className="grid grid-cols-2 gap-2 text-sm font-semibold">
            <Link
              href="/products"
              onClick={() => setMobileMenuOpen(false)}
              className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E4E9F2] text-[#0B1F4B] hover:bg-blue-50 hover:border-blue-200"
            >
              💻 All Laptops
            </Link>
            <Link
              href="/products?category=cat-apple"
              onClick={() => setMobileMenuOpen(false)}
              className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E4E9F2] text-[#0B1F4B] hover:bg-blue-50 hover:border-blue-200"
            >
              🍏 MacBooks
            </Link>
            <Link
              href="/products?category=cat-gaming"
              onClick={() => setMobileMenuOpen(false)}
              className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E4E9F2] text-[#0B1F4B] hover:bg-blue-50 hover:border-blue-200"
            >
              🎮 Gaming Rigs
            </Link>
            <Link
              href="/products?category=cat-business"
              onClick={() => setMobileMenuOpen(false)}
              className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E4E9F2] text-[#0B1F4B] hover:bg-blue-50 hover:border-blue-200"
            >
              💼 Business Series
            </Link>
            <Link
              href="/products?maxPrice=25000"
              onClick={() => setMobileMenuOpen(false)}
              className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E4E9F2] text-[#0B1F4B] hover:bg-blue-50 hover:border-blue-200"
            >
              🔥 Deals &lt; ₹25k
            </Link>
            <Link
              href="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E4E9F2] text-[#0B1F4B] hover:bg-blue-50 hover:border-blue-200"
            >
              📦 My Orders
            </Link>
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="col-span-2 p-3 rounded-xl bg-blue-50 border border-blue-200 text-[#1D6FF2] font-bold text-center"
            >
              ⚡ Store Admin Portal
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
