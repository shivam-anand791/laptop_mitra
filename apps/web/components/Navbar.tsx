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
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-zinc-200 dark:bg-zinc-900/95 dark:border-zinc-800 transition-colors">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-800 text-white text-xs py-2 px-4 text-center font-medium tracking-wide">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="hidden sm:inline">⚡ India&apos;s #1 Certified Pre-Owned &amp; Refurbished Laptop Marketplace</span>
          <div className="flex items-center space-x-4 mx-auto sm:mx-0">
            <span>🛡️ 1-Year Comprehensive Warranty</span>
            <span className="hidden md:inline">🔄 7-Day Replacement</span>
            <span>🎁 Code: <strong className="underline decoration-yellow-400 font-bold">MITRA500</strong> for ₹500 Off</span>
          </div>
        </div>
      </div>

      {/* Main Nav */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-3 shrink-0 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <span className="text-xl font-black tracking-tight text-zinc-900 dark:text-white flex items-center gap-1.5">
                Laptop<span className="text-blue-600">Mitra</span>
              </span>
              <span className="text-[10px] uppercase font-semibold tracking-wider text-emerald-600 dark:text-emerald-400 block -mt-1">
                ✓ Certified Grade A+
              </span>
            </div>
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="hidden md:flex flex-1 max-w-lg relative">
            <div className="relative w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search MacBook, ThinkPad, i7 16GB, RTX Gaming..."
                className="w-full pl-10 pr-24 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-zinc-900 dark:text-zinc-100 placeholder-zinc-400"
              />
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <button
                type="submit"
                className="absolute inset-y-1 right-1 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-semibold transition-colors"
              >
                Search
              </button>
            </div>
          </form>

          {/* Action Links */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Products Link */}
            <Link
              href="/products"
              className="hidden lg:inline-flex items-center text-sm font-semibold text-zinc-700 hover:text-blue-600 dark:text-zinc-300 dark:hover:text-blue-400 transition-colors"
            >
              All Laptops
            </Link>

            {/* Wishlist */}
            <Link
              href="/wishlist"
              className="relative p-2 text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
              title="Wishlist"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart */}
            <Link
              href="/cart"
              className="relative flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium transition-colors border border-blue-200 dark:border-blue-800/60"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="hidden sm:inline font-semibold">Cart</span>
              <span className="bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {itemCount}
              </span>
            </Link>

            {/* User Account */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:text-blue-600 focus:outline-none p-1 rounded-lg"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                    {user.name ? user.name[0] : user.email[0]}
                  </div>
                  <span className="hidden md:inline max-w-[100px] truncate">{user.name || user.email.split('@')[0]}</span>
                  <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-700 py-1.5 z-50">
                    <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-700">
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Signed in as</p>
                      <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate">{user.email}</p>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-amber-600 font-semibold">
                        <span>⭐ Tier: {user.referralTier || 'BASIC'}</span>
                      </div>
                    </div>
                    <Link
                      href="/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="block px-4 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                    >
                      📦 My Orders &amp; Profile
                    </Link>
                    <Link
                      href="/profile#referral"
                      onClick={() => setUserDropdownOpen(false)}
                      className="block px-4 py-2 text-sm text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700/50"
                    >
                      🤝 Mitra Affiliate (Earn 10%)
                    </Link>
                    <Link
                      href="/admin"
                      onClick={() => setUserDropdownOpen(false)}
                      className="block px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 font-medium"
                    >
                      ⚡ Admin Portal
                    </Link>
                    <div className="border-t border-zinc-100 dark:border-zinc-700 my-1" />
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 font-medium"
                    >
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  href="/login"
                  className="px-3.5 py-1.5 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-3.5 py-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-full shadow-sm shadow-blue-500/20 transition-all hover:shadow-md"
                >
                  Join Mitra
                </Link>
              </div>
            )}

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-zinc-600 dark:text-zinc-300 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
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

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 pt-3 pb-6 space-y-4">
          <form onSubmit={handleSearchSubmit}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search laptops..."
              className="w-full px-4 py-2 text-sm bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg"
            />
          </form>

          <div className="grid grid-cols-2 gap-2 text-sm font-medium">
            <Link
              href="/products"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200"
            >
              💻 All Laptops
            </Link>
            <Link
              href="/products?category=cat-apple"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200"
            >
              🍏 MacBooks
            </Link>
            <Link
              href="/products?category=cat-gaming"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200"
            >
              🎮 Gaming Rigs
            </Link>
            <Link
              href="/products?category=cat-business"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200"
            >
              💼 Business Series
            </Link>
            <Link
              href="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200"
            >
              📦 My Orders
            </Link>
            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-semibold"
            >
              ⚡ Admin Panel
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
