'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  const [laptopsDropdownOpen, setLaptopsDropdownOpen] = useState(false);
  const [solutionsDropdownOpen, setSolutionsDropdownOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#E4E9F2]">
      {/* ── Top Header Row: Logo, Search Box, Icon Actions, Quote Button ── */}
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-1 sm:gap-8">
          {/* Logo */}
          <Link href="/" className="flex items-center shrink-0 py-1 transition-opacity hover:opacity-95" aria-label="LaptopMitra Home">
            <Image
              src="/logo.png"
              alt="LaptopMitra"
              width={160}
              height={55}
              priority
              className="h-8 sm:h-9 w-auto object-contain"
            />
          </Link>

          {/* Search Box (Item 3: Light blue-grey box with 8px radius, right search icon) */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-xl mx-2 lg:mx-6">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for laptops, brands, accessories..."
                className="w-full pl-4 pr-10 py-2 text-xs bg-[#F0F4F9] hover:bg-[#EBF1F8] focus:bg-white border border-[#E2E8F0] focus:border-[#1D6FF2] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/15 text-[#0F172A] placeholder-slate-400 transition-colors"
              />
              <button
                type="submit"
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-[#1D6FF2] transition-colors cursor-pointer"
                aria-label="Submit search"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </form>

          {/* Header Right Side (Item 4: User, Heart, Cart icons + Get a Quote) */}
          <div className="flex items-center space-x-1 sm:space-x-3">
            {/* User Icon */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="p-2 text-slate-700 hover:text-[#1D6FF2] hover:bg-slate-50 rounded-full transition-colors cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center"
                  title="My Account"
                  aria-label="My Account"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </button>
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-[#E4E9F2] py-2 z-50 divide-y divide-slate-100">
                    <div className="px-4 py-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Account</p>
                      <p className="text-xs font-bold text-[#0B1F4B] truncate">{user.name || user.email}</p>
                    </div>
                    <div className="py-1 text-xs font-semibold">
                      <Link
                        href="/profile"
                        onClick={() => setUserDropdownOpen(false)}
                        className="block px-4 py-1.5 text-slate-700 hover:bg-[#F8FAFC] hover:text-[#1D6FF2]"
                      >
                        Orders &amp; Profile
                      </Link>
                      <Link
                        href="/profile#referral"
                        onClick={() => setUserDropdownOpen(false)}
                        className="block px-4 py-1.5 text-slate-700 hover:bg-[#F8FAFC] hover:text-[#1D6FF2]"
                      >
                        Mitra Referral
                      </Link>
                    </div>
                    <div className="pt-1">
                      <button
                        onClick={() => {
                          setUserDropdownOpen(false);
                          logout();
                        }}
                        className="w-full text-left px-4 py-1.5 text-xs text-rose-600 hover:bg-rose-50 font-bold cursor-pointer"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="p-2 text-slate-700 hover:text-[#1D6FF2] hover:bg-slate-50 rounded-full transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
                title="Sign In"
                aria-label="Sign In"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </Link>
            )}

            {/* Wishlist Icon */}
            <Link
              href="/wishlist"
              className="relative p-2 text-slate-700 hover:text-[#1D6FF2] hover:bg-slate-50 rounded-full transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
              title="Saved Wishlist"
              aria-label={`Wishlist with ${wishlistCount} items`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {wishlistCount > 0 && (
                <span className="absolute 0 top-1 right-1 bg-rose-500 text-white text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center font-mono">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart Icon (Count badge shown only when itemCount > 0) */}
            <Link
              href="/cart"
              className="relative p-2 text-slate-700 hover:text-[#1D6FF2] hover:bg-slate-50 rounded-full transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center"
              title="Shopping Cart"
              aria-label={`Shopping Cart with ${itemCount} items`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {itemCount > 0 && (
                <span className="absolute top-1 right-1 bg-[#1D6FF2] text-white text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center font-mono">
                  {itemCount}
                </span>
              )}
            </Link>

            {/* Get a Quote Button (small radius ~6px, solid blue, no chevron) */}
            <a
              href="https://wa.me/919999999999?text=Hi%20LaptopMitra,%20I%20would%20like%20to%20request%20a%20quote%20for%20enterprise%20laptops."
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex px-4 py-2 bg-[#1D6FF2] hover:bg-[#1558C0] text-white text-xs font-bold rounded-md shadow-xs transition-all active:scale-95 shrink-0"
            >
              Get a Quote
            </a>

            {/* Mobile Hamburger Trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              aria-label="Toggle Navigation Menu"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      {/* ── Nav Row (Item 5: Plain text items with chevrons on dropdowns, no emojis, no phone) ── */}
      <div className="hidden md:block border-t border-[#E4E9F2] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center space-x-7 py-2.5 text-xs font-semibold text-slate-700">
            {/* Laptops Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setLaptopsDropdownOpen(true)}
              onMouseLeave={() => setLaptopsDropdownOpen(false)}
            >
              <button
                type="button"
                className="flex items-center gap-1 hover:text-[#1D6FF2] transition-colors cursor-pointer py-1"
                aria-expanded={laptopsDropdownOpen}
              >
                <span>Laptops</span>
                <svg className={`w-3 h-3 text-slate-400 transition-transform ${laptopsDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              {laptopsDropdownOpen && (
                <div className="absolute left-0 top-full w-48 bg-white rounded-xl shadow-lg border border-[#E4E9F2] py-2 z-50">
                  <Link href="/products" className="block px-4 py-1.5 text-xs text-slate-700 hover:bg-[#F8FAFC] hover:text-[#1D6FF2]">
                    All Certified Laptops
                  </Link>
                  <Link href="/products?category=cat-business" className="block px-4 py-1.5 text-xs text-slate-700 hover:bg-[#F8FAFC] hover:text-[#1D6FF2]">
                    Business Series
                  </Link>
                  <Link href="/products?category=cat-apple" className="block px-4 py-1.5 text-xs text-slate-700 hover:bg-[#F8FAFC] hover:text-[#1D6FF2]">
                    Apple MacBooks
                  </Link>
                  <Link href="/products?category=cat-gaming" className="block px-4 py-1.5 text-xs text-slate-700 hover:bg-[#F8FAFC] hover:text-[#1D6FF2]">
                    Gaming Rigs
                  </Link>
                  <Link href="/products?category=cat-student" className="block px-4 py-1.5 text-xs text-slate-700 hover:bg-[#F8FAFC] hover:text-[#1D6FF2]">
                    Student &amp; Budget
                  </Link>
                  <Link href="/products?category=cat-ultrabook" className="block px-4 py-1.5 text-xs text-slate-700 hover:bg-[#F8FAFC] hover:text-[#1D6FF2]">
                    Premium Ultrabooks
                  </Link>
                </div>
              )}
            </div>

            {/* Solutions Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setSolutionsDropdownOpen(true)}
              onMouseLeave={() => setSolutionsDropdownOpen(false)}
            >
              <button
                type="button"
                className="flex items-center gap-1 hover:text-[#1D6FF2] transition-colors cursor-pointer py-1"
                aria-expanded={solutionsDropdownOpen}
              >
                <span>Solutions</span>
                <svg className={`w-3 h-3 text-slate-400 transition-transform ${solutionsDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              {solutionsDropdownOpen && (
                <div className="absolute left-0 top-full w-48 bg-white rounded-xl shadow-lg border border-[#E4E9F2] py-2 z-50">
                  <Link href="/products?type=buy" className="block px-4 py-1.5 text-xs text-slate-700 hover:bg-[#F8FAFC] hover:text-[#1D6FF2]">
                    Outright Purchase
                  </Link>
                  <Link href="/products?type=lease" className="block px-4 py-1.5 text-xs text-slate-700 hover:bg-[#F8FAFC] hover:text-[#1D6FF2]">
                    Corporate Leasing
                  </Link>
                  <a
                    href="https://wa.me/919999999999?text=Hi%20LaptopMitra,%20I%20want%20to%20inquire%20about%20bulk%20procurement."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block px-4 py-1.5 text-xs text-slate-700 hover:bg-[#F8FAFC] hover:text-[#1D6FF2]"
                  >
                    Bulk Procurement
                  </a>
                </div>
              )}
            </div>

            <Link href="/profile#referral" className="hover:text-[#1D6FF2] transition-colors">
              Partner Program
            </Link>

            <a
              href="https://wa.me/919999999999?text=Hi%20LaptopMitra%20Support,%20I%20need%20assistance."
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#1D6FF2] transition-colors"
            >
              Support
            </a>
          </nav>
        </div>
      </div>

      {/* ── Mobile Drawer ── */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-[#E4E9F2] px-4 pt-3 pb-6 space-y-3 shadow-lg">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search laptops..."
              className="w-full pl-3.5 pr-10 py-2 text-xs bg-[#F0F4F9] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#1D6FF2]"
            />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </form>

          <div className="flex flex-col space-y-1 pt-1 text-xs font-semibold text-slate-700">
            <Link href="/products" onClick={() => setMobileMenuOpen(false)} className="py-2 px-3 rounded-lg hover:bg-slate-50 hover:text-[#1D6FF2]">
              All Laptops
            </Link>
            <Link href="/products?category=cat-business" onClick={() => setMobileMenuOpen(false)} className="py-2 px-3 rounded-lg hover:bg-slate-50 hover:text-[#1D6FF2]">
              Business Series
            </Link>
            <Link href="/products?category=cat-apple" onClick={() => setMobileMenuOpen(false)} className="py-2 px-3 rounded-lg hover:bg-slate-50 hover:text-[#1D6FF2]">
              Apple MacBooks
            </Link>
            <Link href="/products?type=lease" onClick={() => setMobileMenuOpen(false)} className="py-2 px-3 rounded-lg hover:bg-slate-50 hover:text-[#1D6FF2]">
              Corporate Leasing
            </Link>
            <Link href="/profile#referral" onClick={() => setMobileMenuOpen(false)} className="py-2 px-3 rounded-lg hover:bg-slate-50 hover:text-[#1D6FF2]">
              Partner Program
            </Link>
            <a
              href="https://wa.me/919999999999?text=Hi%20LaptopMitra%20Support"
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-3 rounded-lg hover:bg-slate-50 hover:text-[#1D6FF2]"
            >
              Support
            </a>
            <div className="pt-2">
              <a
                href="https://wa.me/919999999999?text=Hi%20LaptopMitra,%20I%20would%20like%20to%20request%20a%20quote%20for%20enterprise%20laptops."
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 bg-[#1D6FF2] hover:bg-[#1558C0] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5"
              >
                Request Enterprise Quote
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
