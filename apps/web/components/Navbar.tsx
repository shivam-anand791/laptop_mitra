'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '../lib/auth-context';
import { useCart } from '../lib/cart-context';
import { useWishlist } from '../lib/wishlist-context';
import {
  NEXT_PUBLIC_SUPPORT_PHONE,
  NEXT_PUBLIC_SUPPORT_PHONE_DISPLAY,
  NEXT_PUBLIC_WHATSAPP_NUMBER,
} from '../lib/config';
import CorporateQuoteModal from './CorporateQuoteModal';

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
  const [corporateModalOpen, setCorporateModalOpen] = useState(false);
  const [corporateModalPrefill, setCorporateModalPrefill] = useState<
    { mode?: 'sell' | 'lease'; laptopModel?: string } | undefined
  >(undefined);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#E2E8F0] shadow-xs">
      {/* ── Top Header Row: Logo, Search Box, Icon Actions, Quote Button ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3 sm:gap-8">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center shrink-0 py-1 transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded-md"
            aria-label="LaptopMitra Home"
          >
            <Image
              src="/logo.png"
              alt="LaptopMitra"
              width={160}
              height={55}
              priority
              className="h-8 sm:h-9 w-auto object-contain"
            />
          </Link>

          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-xl mx-2 lg:mx-6">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search certified laptops (e.g. ThinkPad, MacBook, Dell Latitude)..."
                className="w-full pl-4 pr-10 py-2.5 text-xs bg-[#F8FAFC] hover:bg-slate-100/70 focus:bg-white border border-[#E2E8F0] focus:border-[#2563EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15 text-[#111827] placeholder-slate-400 transition-colors"
              />
              <button
                type="submit"
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-[#2563EB] transition-colors cursor-pointer"
                aria-label="Submit search"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
          </form>

          {/* Header Right Side: User, Wishlist, Cart icons + Get a Quote */}
          <div className="flex items-center space-x-1 sm:space-x-3">
            {/* User Icon */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="p-2 text-slate-700 hover:text-[#2563EB] hover:bg-slate-50 rounded-full transition-colors cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                  title="My Account"
                  aria-label="My Account"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </button>
                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-[#E2E8F0] py-2 z-50 divide-y divide-slate-100">
                    <div className="px-4 py-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Account</p>
                      <p className="text-xs font-bold text-[#111827] truncate">{user.name || user.email}</p>
                    </div>
                    <div className="py-1 text-xs font-semibold">
                      <Link
                        href="/profile"
                        onClick={() => setUserDropdownOpen(false)}
                        className="block px-4 py-1.5 text-slate-700 hover:bg-[#F8FAFC] hover:text-[#2563EB]"
                      >
                        Orders &amp; Profile
                      </Link>
                      <Link
                        href="/profile#referral"
                        onClick={() => setUserDropdownOpen(false)}
                        className="block px-4 py-1.5 text-slate-700 hover:bg-[#F8FAFC] hover:text-[#2563EB]"
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
                className="p-2 text-slate-700 hover:text-[#2563EB] hover:bg-slate-50 rounded-full transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
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
              className="relative p-2 text-slate-700 hover:text-[#2563EB] hover:bg-slate-50 rounded-full transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
              title="Saved Wishlist"
              aria-label={`Wishlist with ${wishlistCount} items`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {wishlistCount > 0 && (
                <span className="absolute top-1 right-1 bg-rose-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center font-mono">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart Icon */}
            <Link
              href="/cart"
              className="relative p-2 text-slate-700 hover:text-[#2563EB] hover:bg-slate-50 rounded-full transition-colors min-w-[40px] min-h-[40px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
              title="Shopping Cart"
              aria-label={`Shopping Cart with ${itemCount} items`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {itemCount > 0 && (
                <span className="absolute top-1 right-1 bg-[#2563EB] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center font-mono">
                  {itemCount}
                </span>
              )}
            </Link>

            {/* Support Call Link */}
            <a
              href={`tel:${NEXT_PUBLIC_SUPPORT_PHONE}`}
              className="hidden xl:flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-slate-700 hover:text-[#2563EB] hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
              title="Customer Support"
            >
              <div className="w-8 h-8 rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-[10px] uppercase font-bold text-slate-400 leading-none">Support</p>
                <p className="text-xs font-black text-slate-800 leading-tight mt-0.5">{NEXT_PUBLIC_SUPPORT_PHONE_DISPLAY}</p>
              </div>
            </a>

            {/* Get a Quote Button */}
            <button
              type="button"
              onClick={() => {
                setCorporateModalPrefill(undefined);
                setCorporateModalOpen(true);
              }}
              className="hidden sm:inline-flex px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold rounded-lg shadow-xs transition-all active:scale-95 shrink-0 cursor-pointer"
            >
              Get a Quote
            </button>

            {/* Mobile Hamburger Trigger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
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

      {/* ── Desktop Secondary Nav Row ── */}
      <div className="hidden md:block border-t border-[#E2E8F0] bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center space-x-7 py-2 text-xs font-semibold text-slate-700">
            {/* Laptops Dropdown */}
            <div
              className="relative"
              onMouseEnter={() => setLaptopsDropdownOpen(true)}
              onMouseLeave={() => setLaptopsDropdownOpen(false)}
            >
              <button
                type="button"
                className="flex items-center gap-1 hover:text-[#2563EB] transition-colors cursor-pointer py-1"
                aria-expanded={laptopsDropdownOpen}
              >
                <span>Certified Laptops</span>
                <svg className={`w-3 h-3 text-slate-400 transition-transform ${laptopsDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              {laptopsDropdownOpen && (
                <div className="absolute left-0 top-full w-52 bg-white rounded-xl shadow-lg border border-[#E2E8F0] py-2 z-50">
                  <Link href="/products" className="block px-4 py-1.5 text-xs text-slate-700 hover:bg-[#F8FAFC] hover:text-[#2563EB]">
                    All Certified Laptops
                  </Link>
                  <Link href="/products?category=cat-business" className="block px-4 py-1.5 text-xs text-slate-700 hover:bg-[#F8FAFC] hover:text-[#2563EB]">
                    Business Series (ThinkPad/Dell)
                  </Link>
                  <Link href="/products?category=cat-apple" className="block px-4 py-1.5 text-xs text-slate-700 hover:bg-[#F8FAFC] hover:text-[#2563EB]">
                    Apple MacBooks
                  </Link>
                  <Link href="/products?category=cat-gaming" className="block px-4 py-1.5 text-xs text-slate-700 hover:bg-[#F8FAFC] hover:text-[#2563EB]">
                    Gaming Series
                  </Link>
                  <Link href="/products?category=cat-student" className="block px-4 py-1.5 text-xs text-slate-700 hover:bg-[#F8FAFC] hover:text-[#2563EB]">
                    Student &amp; Coding Under ₹25k
                  </Link>
                  <Link href="/products?category=cat-ultrabook" className="block px-4 py-1.5 text-xs text-slate-700 hover:bg-[#F8FAFC] hover:text-[#2563EB]">
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
                className="flex items-center gap-1 hover:text-[#2563EB] transition-colors cursor-pointer py-1"
                aria-expanded={solutionsDropdownOpen}
              >
                <span>Solutions</span>
                <svg className={`w-3 h-3 text-slate-400 transition-transform ${solutionsDropdownOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>

              {solutionsDropdownOpen && (
                <div className="absolute left-0 top-full w-48 bg-white rounded-xl shadow-lg border border-[#E2E8F0] py-2 z-50">
                  <Link href="/products?type=buy" className="block px-4 py-1.5 text-xs text-slate-700 hover:bg-[#F8FAFC] hover:text-[#2563EB]">
                    Outright Purchase
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setSolutionsDropdownOpen(false);
                      setCorporateModalPrefill({ mode: 'lease' });
                      setCorporateModalOpen(true);
                    }}
                    className="w-full text-left px-4 py-1.5 text-xs text-slate-700 hover:bg-[#F8FAFC] hover:text-[#2563EB] cursor-pointer"
                  >
                    Corporate Leasing (Quote)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSolutionsDropdownOpen(false);
                      setCorporateModalPrefill({ mode: 'sell' });
                      setCorporateModalOpen(true);
                    }}
                    className="w-full text-left px-4 py-1.5 text-xs text-slate-700 hover:bg-[#F8FAFC] hover:text-[#2563EB] cursor-pointer"
                  >
                    Bulk Procurement (Quote)
                  </button>
                </div>
              )}
            </div>

            <Link href="/profile#referral" className="hover:text-[#2563EB] transition-colors">
              Partner Referral Program
            </Link>

            <a
              href={`https://wa.me/${NEXT_PUBLIC_WHATSAPP_NUMBER}?text=Hi%20LaptopMitra%20Support,%20I%20need%20assistance.`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#2563EB] transition-colors"
            >
              Warranty &amp; Support
            </a>
          </nav>
        </div>
      </div>

      {/* ── Mobile Drawer ── */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-[#E2E8F0] px-4 pt-3 pb-6 space-y-3 shadow-lg">
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search certified laptops..."
              className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#2563EB]"
            />
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label="Search">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </form>

          <div className="flex flex-col space-y-1 pt-1 text-xs font-semibold text-slate-700">
            <Link href="/products" onClick={() => setMobileMenuOpen(false)} className="py-2 px-3 rounded-lg hover:bg-slate-50 hover:text-[#2563EB]">
              All Certified Laptops
            </Link>
            <Link href="/products?category=cat-business" onClick={() => setMobileMenuOpen(false)} className="py-2 px-3 rounded-lg hover:bg-slate-50 hover:text-[#2563EB]">
              Business Series
            </Link>
            <Link href="/products?category=cat-apple" onClick={() => setMobileMenuOpen(false)} className="py-2 px-3 rounded-lg hover:bg-slate-50 hover:text-[#2563EB]">
              Apple MacBooks
            </Link>
            <Link href="/products?type=lease" onClick={() => setMobileMenuOpen(false)} className="py-2 px-3 rounded-lg hover:bg-slate-50 hover:text-[#2563EB]">
              Corporate Leasing
            </Link>
            <Link href="/profile#referral" onClick={() => setMobileMenuOpen(false)} className="py-2 px-3 rounded-lg hover:bg-slate-50 hover:text-[#2563EB]">
              Partner Referral Program
            </Link>
            <a
              href={`https://wa.me/${NEXT_PUBLIC_WHATSAPP_NUMBER}?text=Hi%20LaptopMitra%20Support`}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-3 rounded-lg hover:bg-slate-50 hover:text-[#2563EB]"
            >
              Warranty &amp; Support
            </a>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setCorporateModalPrefill(undefined);
                  setCorporateModalOpen(true);
                }}
                className="w-full py-2.5 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
              >
                Request Enterprise Quote
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Corporate Procurement / Leasing Quote Dialog */}
      <CorporateQuoteModal
        open={corporateModalOpen}
        onClose={() => setCorporateModalOpen(false)}
        prefill={corporateModalPrefill}
      />
    </header>
  );
}
