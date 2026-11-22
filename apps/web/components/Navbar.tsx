'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import {
  Search,
  Bell,
  Laptop,
  Building2,
  Apple,
  Gamepad2,
  GraduationCap,
  Sparkles,
  Handshake,
  Users,
  Briefcase,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  X,
  Menu,
  Heart,
  ShoppingCart,
  User as UserIcon,
  Phone,
  HelpCircle,
  FileCheck2,
  RotateCcw,
} from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { useCart } from '../lib/cart-context';
import { useWishlist } from '../lib/wishlist-context';
import {
  NEXT_PUBLIC_SUPPORT_PHONE,
  NEXT_PUBLIC_SUPPORT_PHONE_DISPLAY,
} from '../lib/config';
import CorporateQuoteModal from './CorporateQuoteModal';
import { api } from '../lib/api';

const QUICK_SEARCH_CHIPS = ['ThinkPad', 'MacBook Air', 'Dell Latitude', 'Under ₹25k', 'Gaming RTX'];

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname() || '/';
  const isPDP = /^\/products\/[^/]+$/.test(pathname);
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const { count: wishlistCount } = useWishlist();

  // Scroll state for sticky header elevation & background
  const [isScrolled, setIsScrolled] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Dropdown states (Desktop)
  const [laptopsDropdownOpen, setLaptopsDropdownOpen] = useState(false);
  const [solutionsDropdownOpen, setSolutionsDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Mobile Drawer & Accordion states
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileLaptopsExpanded, setMobileLaptopsExpanded] = useState(true);
  const [mobileSolutionsExpanded, setMobileSolutionsExpanded] = useState(false);

  // Modal states
  const [corporateModalOpen, setCorporateModalOpen] = useState(false);
  const [corporateModalPrefill, setCorporateModalPrefill] = useState<
    { mode?: 'sell' | 'lease'; laptopModel?: string } | undefined
  >(undefined);
  const [hasUnreadTickets, setHasUnreadTickets] = useState(false);

  // Refs for click outside handling
  const laptopsDropdownRef = useRef<HTMLDivElement>(null);
  const solutionsDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Sticky header scroll listener
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 12);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch ticket status for notifications
  useEffect(() => {
    let active = true;
    if (!user || user.isGuest) {
      setHasUnreadTickets(false);
      return;
    }

    api.getTickets()
      .then((tickets) => {
        if (active && Array.isArray(tickets)) {
          setHasUnreadTickets(tickets.some((ticket: { hasUnread?: boolean }) => ticket.hasUnread));
        }
      })
      .catch(() => {
        if (active) setHasUnreadTickets(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  // Accessibility: Escape key listener to close dropdowns & drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLaptopsDropdownOpen(false);
        setSolutionsDropdownOpen(false);
        setUserDropdownOpen(false);
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Accessibility: Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      if (laptopsDropdownRef.current && !laptopsDropdownRef.current.contains(target)) {
        setLaptopsDropdownOpen(false);
      }
      if (solutionsDropdownRef.current && !solutionsDropdownRef.current.contains(target)) {
        setSolutionsDropdownOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(target)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setLaptopsDropdownOpen(false);
    setSolutionsDropdownOpen(false);
    setUserDropdownOpen(false);
  }, [pathname]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    }
  };

  const handleChipClick = (term: string) => {
    setSearchQuery(term);
    router.push(`/products?search=${encodeURIComponent(term)}`);
    setMobileMenuOpen(false);
  };

  // Certified Laptops Dropdown Items
  const laptopCategories = [
    {
      name: 'All Certified Laptops',
      sub: 'Complete 32-point tested catalog',
      href: '/products',
      icon: Laptop,
      badge: 'All',
    },
    {
      name: 'Business Series',
      sub: 'ThinkPad, Latitude & EliteBook',
      href: '/products?category=cat-business',
      icon: Building2,
      badge: 'Popular',
    },
    {
      name: 'Apple MacBooks',
      sub: 'MacBook Air & Pro with Retina',
      href: '/products?category=cat-apple',
      icon: Apple,
      badge: 'Apple Silicon',
    },
    {
      name: 'Gaming Series',
      sub: 'Dedicated RTX graphics & high refresh',
      href: '/products?category=cat-gaming',
      icon: Gamepad2,
      badge: 'Dedicated GPU',
    },
    {
      name: 'Student & Coding Under ₹25K',
      sub: 'High-value laptops for studies & code',
      href: '/products?category=cat-student',
      icon: GraduationCap,
      badge: 'Best Value',
    },
    {
      name: 'Premium Ultrabooks',
      sub: 'Ultra-slim, light & all-day battery',
      href: '/products?category=cat-ultrabook',
      icon: Sparkles,
      badge: 'Slim & Fast',
    },
  ];

  // Solutions Dropdown Items
  const solutionCommercialItems = [
    {
      name: 'Outright Purchase',
      sub: 'Direct ownership with GST invoice & 1-year warranty',
      href: '/products?type=buy',
      icon: Laptop,
      badge: 'Tax Benefit',
    },
    {
      name: 'Corporate Leasing',
      sub: '12, 24 & 36 month flexible monthly rental plans',
      action: () => {
        setSolutionsDropdownOpen(false);
        setCorporateModalPrefill({ mode: 'lease' });
        setCorporateModalOpen(true);
      },
      icon: Briefcase,
      badge: 'Low OPEX',
    },
    {
      name: 'Bulk Fleet Procurement',
      sub: '5+ units for startups, corporate teams & schools',
      action: () => {
        setSolutionsDropdownOpen(false);
        setCorporateModalPrefill({ mode: 'sell' });
        setCorporateModalOpen(true);
      },
      icon: Building2,
      badge: 'Custom Bulk',
    },
  ];

  const solutionPartnerItems = [
    {
      name: 'Mitra Partner Program',
      sub: 'Grow together as an authorized distribution partner',
      href: '/account/referral',
      icon: Handshake,
      badge: 'Partner',
    },
    {
      name: 'Affiliate Program',
      sub: 'Earn cash commissions on every business referral',
      href: '/account/referral',
      icon: Users,
      badge: 'Commission',
    },
    {
      name: '36-Month Assurance',
      sub: 'Guaranteed buyback value schedule with hassle-free upgrade',
      href: '/buyback-guarantee',
      icon: ShieldCheck,
      badge: 'Buyback',
    },
  ];

  return (
    <header
      className={`sticky top-0 z-50 transition-[background-color,border-color,box-shadow] duration-220 ease-out ${
        isPDP ? 'hidden md:block' : ''
      } ${
        isScrolled
          ? 'bg-[#FFFDF9]/98 backdrop-blur-md border-b border-[#E6DFD5] shadow-xs'
          : 'bg-[#FFFDF9]/95 backdrop-blur-sm border-b border-[#E6DFD5]/80'
      }`}
    >
      {/* ── Top Header Row: Logo, Search Box, Actions, Quote Button ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`flex items-center justify-between gap-3 sm:gap-6 transition-[height] duration-220 ease-out ${
            isScrolled ? 'h-14 sm:h-15' : 'h-15 sm:h-16'
          }`}
        >
          {/* Brand Logo & Certified Store Tag */}
          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              href="/"
              className="flex items-center gap-2.5 shrink-0 py-1 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] rounded-lg"
              aria-label="LaptopMitra Home"
            >
              <Image
                src="/logo.png"
                alt="LaptopMitra"
                width={152}
                height={48}
                priority
                className="h-7 sm:h-8 w-auto object-contain transition-transform duration-220"
              />
              <span className="hidden xs:inline-flex sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50/90 text-emerald-800 border border-emerald-200 text-[10px] font-bold tracking-tight shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Certified Store
              </span>
            </Link>
          </div>

          {/* Search Box (Desktop) */}
          <form
            onSubmit={handleSearchSubmit}
            role="search"
            className="hidden md:flex flex-1 max-w-xl mx-2 lg:mx-6"
          >
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search size={15} strokeWidth={2} />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search certified laptops (e.g. ThinkPad, MacBook, Dell, Under ₹25k)..."
                className="w-full pl-9 pr-10 py-2 text-xs bg-[#FAF6EF] hover:bg-[#F2ECE2]/80 focus:bg-[#FFFDF9] border border-[#E6DFD5] focus:border-[#2563EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/15 text-[#111827] placeholder-slate-400 transition-colors duration-180"
              />
              <button
                type="submit"
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-[#2563EB] transition-colors duration-180 cursor-pointer"
                aria-label="Submit search"
              >
                <ArrowRight size={14} strokeWidth={2.2} />
              </button>
            </div>
          </form>

          {/* Header Right Actions: Support, User, Wishlist, Cart, Quote */}
          <div className="flex items-center space-x-1 sm:space-x-2.5">
            {/* Support Call Link (XL Desktop) */}
            <a
              href={`tel:${NEXT_PUBLIC_SUPPORT_PHONE}`}
              className="hidden xl:flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-slate-700 hover:text-[#2563EB] hover:bg-[#FAF6EF] transition-colors duration-180 border border-transparent hover:border-[#E6DFD5]"
              title="Customer Support"
            >
              <div className="w-7 h-7 rounded-full bg-[#EFF6FF] text-[#2563EB] flex items-center justify-center shrink-0 border border-[#BFDBFE]/60">
                <Phone size={13} strokeWidth={2.2} />
              </div>
              <div className="text-left">
                <p className="text-[9px] uppercase font-bold text-slate-400 leading-none">Support</p>
                <p className="text-xs font-black text-[#0B1F4B] leading-tight mt-0.5 font-mono">
                  {NEXT_PUBLIC_SUPPORT_PHONE_DISPLAY}
                </p>
              </div>
            </a>

            {/* Notification / Support Bell */}
            <Link
              href={user && !user.isGuest ? "/account/tickets" : "/help"}
              className="relative p-2 text-slate-700 hover:text-[#2563EB] hover:bg-[#FAF6EF] rounded-full transition-colors duration-180 min-w-[40px] min-h-[40px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
              title="Notifications & Support"
              aria-label="Notifications & Support"
            >
              <Bell size={18} strokeWidth={2} />
              {hasUnreadTickets && (
                <span
                  className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-600 ring-2 ring-[#FFFDF9]"
                  aria-label="Unread updates"
                />
              )}
            </Link>

            {/* User Account Button & Dropdown */}
            <div className="relative" ref={userDropdownRef}>
              {user ? (
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className={`p-2 rounded-full transition-colors duration-180 min-w-[40px] min-h-[40px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] cursor-pointer ${
                    userDropdownOpen
                      ? 'text-[#2563EB] bg-[#EFF6FF]'
                      : 'text-slate-700 hover:text-[#2563EB] hover:bg-[#FAF6EF]'
                  }`}
                  aria-expanded={userDropdownOpen}
                  aria-haspopup="true"
                  title="My Account"
                  aria-label="My Account"
                >
                  <UserIcon size={18} strokeWidth={2} />
                </button>
              ) : (
                <Link
                  href="/login"
                  className="p-2 text-slate-700 hover:text-[#2563EB] hover:bg-[#FAF6EF] rounded-full transition-colors duration-180 min-w-[40px] min-h-[40px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                  title="Sign In"
                  aria-label="Sign In"
                >
                  <UserIcon size={18} strokeWidth={2} />
                </Link>
              )}

              {/* User Dropdown Menu */}
              {userDropdownOpen && user && (
                <div
                  role="menu"
                  className="absolute right-0 top-full mt-2 w-56 bg-[#FFFDF9] rounded-xl shadow-lg border border-[#E6DFD5] py-2 z-50 divide-y divide-[#E6DFD5]/60 animate-dropdown-in"
                >
                  <div className="px-4 py-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Signed in as</p>
                    <p className="text-xs font-bold text-[#111827] truncate mt-0.5">{user.name || user.email}</p>
                  </div>
                  <div className="py-1 text-xs font-semibold">
                    <Link
                      href="/account/orders"
                      onClick={() => setUserDropdownOpen(false)}
                      className="block px-4 py-2 text-slate-700 hover:bg-[#EFF6FF] hover:text-[#2563EB] transition-colors duration-120"
                    >
                      My Account &amp; Orders
                    </Link>
                    <Link
                      href="/account/referral"
                      onClick={() => setUserDropdownOpen(false)}
                      className="block px-4 py-2 text-slate-700 hover:bg-[#EFF6FF] hover:text-[#2563EB] transition-colors duration-120"
                    >
                      Mitra Affiliate Program
                    </Link>
                  </div>
                  <div className="py-1 text-xs font-semibold">
                    <p className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Help &amp; Protection
                    </p>
                    <Link
                      href="/help"
                      onClick={() => setUserDropdownOpen(false)}
                      className="block px-4 py-2 text-slate-700 hover:bg-[#EFF6FF] hover:text-[#2563EB] transition-colors duration-120"
                    >
                      Help Center &amp; FAQs
                    </Link>
                    <Link
                      href="/account/tickets"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center justify-between px-4 py-2 text-slate-700 hover:bg-[#EFF6FF] hover:text-[#2563EB] transition-colors duration-120"
                    >
                      <span>Support Tickets</span>
                      {hasUnreadTickets && (
                        <span className="h-2 w-2 rounded-full bg-rose-600" aria-label="Unread updates" />
                      )}
                    </Link>
                    <Link
                      href="/account/returns"
                      onClick={() => setUserDropdownOpen(false)}
                      className="block px-4 py-2 text-slate-700 hover:bg-[#EFF6FF] hover:text-[#2563EB] transition-colors duration-120"
                    >
                      Returns &amp; Replacements
                    </Link>
                    <Link
                      href="/buyback-guarantee"
                      onClick={() => setUserDropdownOpen(false)}
                      className="block px-4 py-2 text-slate-700 hover:bg-[#EFF6FF] hover:text-[#2563EB] transition-colors duration-120"
                    >
                      36-Month Buyback Schedule
                    </Link>
                  </div>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 font-bold cursor-pointer transition-colors duration-120"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Wishlist Icon */}
            <Link
              href="/wishlist"
              className="relative p-2 text-slate-700 hover:text-[#2563EB] hover:bg-[#FAF6EF] rounded-full transition-colors duration-180 min-w-[40px] min-h-[40px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
              title="Saved Wishlist"
              aria-label={`Wishlist with ${wishlistCount} items`}
            >
              <Heart size={18} strokeWidth={2} />
              {wishlistCount > 0 && (
                <span className="absolute top-1.5 right-1.5 bg-rose-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center font-mono shadow-xs animate-scale-in">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart Icon */}
            <Link
              id="header-cart-icon"
              data-cart-icon="true"
              href="/cart"
              className="relative p-2 text-slate-700 hover:text-[#2563EB] hover:bg-[#FAF6EF] rounded-full transition-colors duration-180 min-w-[40px] min-h-[40px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
              title="Shopping Cart"
              aria-label={`Shopping Cart with ${itemCount} items`}
            >
              <ShoppingCart size={18} strokeWidth={2} />
              {itemCount > 0 && (
                <span className="absolute top-1.5 right-1.5 bg-[#2563EB] text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center font-mono shadow-xs animate-scale-in">
                  {itemCount}
                </span>
              )}
            </Link>

            {/* Get a Quote Button (Desktop) */}
            <button
              type="button"
              onClick={() => {
                setCorporateModalPrefill(undefined);
                setCorporateModalOpen(true);
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white text-xs font-bold rounded-lg shadow-xs hover-scale-subtle transition-all duration-180 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
            >
              <FileCheck2 size={14} strokeWidth={2.2} />
              <span>Get a Quote</span>
            </button>

            {/* Mobile Hamburger Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-700 hover:text-[#2563EB] hover:bg-[#FAF6EF] rounded-lg transition-colors duration-180 cursor-pointer min-w-[40px] min-h-[40px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
              aria-label={mobileMenuOpen ? 'Close navigation drawer' : 'Open navigation drawer'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={21} strokeWidth={2} /> : <Menu size={21} strokeWidth={2} />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Desktop Secondary Nav Row: Certified Laptops, Solutions, Programs, Support ── */}
      <div className="hidden md:block border-t border-[#E6DFD5]/80 bg-[#FAF6EF]/75">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center space-x-7 py-2 text-xs font-semibold text-slate-700" aria-label="Main Navigation">
            {/* ── 1. Certified Laptops Independent Dropdown ── */}
            <div
              className="relative"
              ref={laptopsDropdownRef}
              onMouseEnter={() => setLaptopsDropdownOpen(true)}
              onMouseLeave={() => setLaptopsDropdownOpen(false)}
            >
              <button
                type="button"
                onClick={() => setLaptopsDropdownOpen(!laptopsDropdownOpen)}
                className={`flex items-center gap-1.5 py-1 px-2 rounded-md transition-colors duration-180 cursor-pointer font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                  laptopsDropdownOpen || pathname.startsWith('/products')
                    ? 'text-[#2563EB] bg-[#EFF6FF]'
                    : 'text-slate-700 hover:text-[#2563EB] hover:bg-[#F2ECE2]'
                }`}
                aria-expanded={laptopsDropdownOpen}
                aria-haspopup="true"
              >
                <span>Certified Laptops</span>
                <ChevronDown
                  size={13}
                  strokeWidth={2.5}
                  className={`transition-transform duration-220 ease-out ${
                    laptopsDropdownOpen ? 'rotate-180 text-[#2563EB]' : 'text-slate-400'
                  }`}
                />
              </button>

              {/* Certified Laptops Mega Menu Container */}
              {laptopsDropdownOpen && (
                <div className="absolute left-0 top-full pt-2 z-50">
                  <div
                    role="menu"
                    className="w-[960px] max-w-[90vw] bg-[#FFFDF9] rounded-2xl shadow-lg border border-[#E6DFD5] p-5 divide-x divide-[#E6DFD5]/70 grid grid-cols-12 gap-5 animate-dropdown-in"
                  >
                    {/* Col 1: Six Hardware Categories as required */}
                    <div className="col-span-5 pr-2 space-y-1">
                      <div className="flex items-center justify-between px-2.5 pb-2 border-b border-[#E6DFD5]/60 mb-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          Hardware Categories
                        </span>
                        <span className="text-[10px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-full border border-[#BFDBFE]/60">
                          32-Pt Tested
                        </span>
                      </div>

                      {laptopCategories.map((item) => {
                        const Icon = item.icon;
                        const isCurrent = pathname === item.href;
                        return (
                          <Link
                            key={item.name}
                            href={item.href}
                            onClick={() => setLaptopsDropdownOpen(false)}
                            className={`group flex items-center justify-between px-2.5 py-2 rounded-xl transition-all duration-180 ${
                              isCurrent
                                ? 'bg-[#EFF6FF] text-[#2563EB] border border-[#BFDBFE]'
                                : 'text-slate-700 hover:text-[#2563EB] hover:bg-[#FAF6EF]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-180 border ${
                                  isCurrent
                                    ? 'bg-[#2563EB] text-white border-[#2563EB]'
                                    : 'bg-[#FAF6EF] group-hover:bg-[#EFF6FF] text-slate-600 group-hover:text-[#2563EB] border-[#E6DFD5]/70 group-hover:border-[#BFDBFE]'
                                }`}
                              >
                                <Icon size={16} strokeWidth={2} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-[#0B1F4B] group-hover:text-[#2563EB] leading-tight truncate">
                                  {item.name}
                                </p>
                                <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                                  {item.sub}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              {item.badge && (
                                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-sm bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  {item.badge}
                                </span>
                              )}
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#2563EB] group-hover:translate-x-0.5 transition-transform duration-180" />
                            </div>
                          </Link>
                        );
                      })}
                    </div>

                    {/* Col 2: Four Quality Guarantees */}
                    <div className="col-span-3 pl-3 pr-1 space-y-2">
                      <div className="px-2.5 pb-2 border-b border-[#E6DFD5]/60 mb-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          LaptopMitra Quality Standard
                        </span>
                      </div>

                      {[
                        {
                          title: '32-Pt Engineering Diagnostics',
                          desc: 'Motherboard, thermals, battery & screen certified.',
                          icon: CheckCircle2,
                        },
                        {
                          title: '1-Year Comprehensive Warranty',
                          desc: 'Zero-deductible doorstep hardware repairs.',
                          icon: ShieldCheck,
                        },
                        {
                          title: '7-Day Hassle-Free Replacement',
                          desc: 'Instant replacement if any hardware fault arises.',
                          icon: RotateCcw,
                        },
                        {
                          title: 'GST Business ITC Claim',
                          desc: 'Save 18% with legitimate B2B tax invoice.',
                          icon: FileCheck2,
                        },
                      ].map((feature, idx) => {
                        const Icon = feature.icon;
                        return (
                          <div
                            key={idx}
                            className="p-2.5 rounded-xl bg-[#FAF6EF]/70 border border-[#E6DFD5]/60 flex items-start gap-2.5"
                          >
                            <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-200">
                              <Icon size={13} strokeWidth={2.4} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold text-[#0B1F4B] leading-tight">
                                {feature.title}
                              </p>
                              <p className="text-[9.5px] text-slate-500 font-medium leading-relaxed mt-0.5">
                                {feature.desc}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Col 3: Editorial Spotlight Promo Banner */}
                    <div className="col-span-4 pl-3 flex flex-col justify-between">
                      <div className="h-full rounded-2xl bg-gradient-to-br from-[#EFF6FF] via-[#FAF6EF] to-[#FFFDF9] border border-[#BFDBFE]/80 p-4.5 flex flex-col justify-between relative overflow-hidden group shadow-2xs">
                        <div>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#2563EB]/10 text-[#2563EB] text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-pulse" />
                            Enterprise Verified
                          </span>
                          <h4 className="text-base font-extrabold text-[#0B1F4B] mt-2.5 leading-tight">
                            Business Laptop Solutions
                          </h4>
                          <p className="text-[11px] text-slate-600 font-medium mt-1.5 leading-relaxed">
                            Save up to 60% on certified enterprise laptops with dedicated account support.
                          </p>
                        </div>

                        <div className="relative w-full h-24 my-2 flex items-center justify-center">
                          <Image
                            src="/images/generated/hero-enterprise-laptop.webp"
                            alt="Business Laptops"
                            fill
                            className="object-contain group-hover:scale-105 transition-transform duration-220 drop-shadow-md"
                          />
                        </div>

                        <Link
                          href="/products?category=cat-business"
                          onClick={() => setLaptopsDropdownOpen(false)}
                          className="w-full py-2 px-3 bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-2xs transition-all duration-180"
                        >
                          <span>Explore Business Deals</span>
                          <ArrowRight size={13} strokeWidth={2.2} />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ── 2. Solutions Separate Independent Dropdown ── */}
            <div
              className="relative"
              ref={solutionsDropdownRef}
              onMouseEnter={() => setSolutionsDropdownOpen(true)}
              onMouseLeave={() => setSolutionsDropdownOpen(false)}
            >
              <button
                type="button"
                onClick={() => setSolutionsDropdownOpen(!solutionsDropdownOpen)}
                className={`flex items-center gap-1.5 py-1 px-2 rounded-md transition-colors duration-180 cursor-pointer font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] ${
                  solutionsDropdownOpen
                    ? 'text-[#2563EB] bg-[#EFF6FF]'
                    : 'text-slate-700 hover:text-[#2563EB] hover:bg-[#F2ECE2]'
                }`}
                aria-expanded={solutionsDropdownOpen}
                aria-haspopup="true"
              >
                <span>Solutions</span>
                <ChevronDown
                  size={13}
                  strokeWidth={2.5}
                  className={`transition-transform duration-220 ease-out ${
                    solutionsDropdownOpen ? 'rotate-180 text-[#2563EB]' : 'text-slate-400'
                  }`}
                />
              </button>

              {/* Solutions Dropdown Menu */}
              {solutionsDropdownOpen && (
                <div className="absolute left-0 top-full pt-2 z-50">
                  <div
                    role="menu"
                    className="w-[820px] max-w-[90vw] bg-[#FFFDF9] rounded-2xl shadow-lg border border-[#E6DFD5] p-5 divide-x divide-[#E6DFD5]/70 grid grid-cols-12 gap-5 animate-dropdown-in"
                  >
                    {/* Col 1: Commercial Procurement Models */}
                    <div className="col-span-6 pr-2 space-y-1">
                      <div className="px-2.5 pb-2 border-b border-[#E6DFD5]/60 mb-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          Procurement &amp; Commercial Models
                        </span>
                      </div>

                      {solutionCommercialItems.map((item, idx) => {
                        const Icon = item.icon;
                        return item.href ? (
                          <Link
                            key={idx}
                            href={item.href}
                            onClick={() => setSolutionsDropdownOpen(false)}
                            className="group flex items-center justify-between px-2.5 py-2.5 rounded-xl text-slate-700 hover:text-[#2563EB] hover:bg-[#FAF6EF] transition-all duration-180"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-[#FAF6EF] group-hover:bg-[#EFF6FF] text-slate-600 group-hover:text-[#2563EB] flex items-center justify-center shrink-0 transition-colors duration-180 border border-[#E6DFD5]/70 group-hover:border-[#BFDBFE]">
                                <Icon size={16} strokeWidth={2} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-[#0B1F4B] group-hover:text-[#2563EB] leading-tight truncate">
                                  {item.name}
                                </p>
                                <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                                  {item.sub}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              {item.badge && (
                                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-sm bg-blue-50 text-[#2563EB] border border-[#BFDBFE]">
                                  {item.badge}
                                </span>
                              )}
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#2563EB] group-hover:translate-x-0.5 transition-transform duration-180" />
                            </div>
                          </Link>
                        ) : (
                          <button
                            key={idx}
                            type="button"
                            onClick={item.action}
                            className="w-full text-left group flex items-center justify-between px-2.5 py-2.5 rounded-xl text-slate-700 hover:text-[#2563EB] hover:bg-[#FAF6EF] transition-all duration-180 cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-[#FAF6EF] group-hover:bg-[#EFF6FF] text-slate-600 group-hover:text-[#2563EB] flex items-center justify-center shrink-0 transition-colors duration-180 border border-[#E6DFD5]/70 group-hover:border-[#BFDBFE]">
                                <Icon size={16} strokeWidth={2} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-[#0B1F4B] group-hover:text-[#2563EB] leading-tight truncate">
                                  {item.name}
                                </p>
                                <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                                  {item.sub}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              {item.badge && (
                                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-sm bg-blue-50 text-[#2563EB] border border-[#BFDBFE]">
                                  {item.badge}
                                </span>
                              )}
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#2563EB] group-hover:translate-x-0.5 transition-transform duration-180" />
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Col 2: Partner & Asset Assurance */}
                    <div className="col-span-6 pl-3 space-y-1">
                      <div className="px-2.5 pb-2 border-b border-[#E6DFD5]/60 mb-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                          Partner &amp; Asset Programs
                        </span>
                      </div>

                      {solutionPartnerItems.map((item, idx) => {
                        const Icon = item.icon;
                        return (
                          <Link
                            key={idx}
                            href={item.href}
                            onClick={() => setSolutionsDropdownOpen(false)}
                            className="group flex items-center justify-between px-2.5 py-2.5 rounded-xl text-slate-700 hover:text-[#2563EB] hover:bg-[#FAF6EF] transition-all duration-180"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-[#FAF6EF] group-hover:bg-[#EFF6FF] text-slate-600 group-hover:text-[#2563EB] flex items-center justify-center shrink-0 transition-colors duration-180 border border-[#E6DFD5]/70 group-hover:border-[#BFDBFE]">
                                <Icon size={16} strokeWidth={2} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-[#0B1F4B] group-hover:text-[#2563EB] leading-tight truncate">
                                  {item.name}
                                </p>
                                <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                                  {item.sub}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              {item.badge && (
                                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-sm bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  {item.badge}
                                </span>
                              )}
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#2563EB] group-hover:translate-x-0.5 transition-transform duration-180" />
                            </div>
                          </Link>
                        );
                      })}

                      {/* Quick Fleet Quote Banner */}
                      <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-[#0B1F4B] to-[#132E6B] text-white flex items-center justify-between gap-3 shadow-2xs">
                        <div className="min-w-0">
                          <p className="text-xs font-bold leading-tight">Need a customized proposal?</p>
                          <p className="text-[10px] text-blue-200 truncate mt-0.5">Response within 2 hours</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSolutionsDropdownOpen(false);
                            setCorporateModalPrefill(undefined);
                            setCorporateModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-white text-[#0B1F4B] text-[11px] font-bold rounded-lg hover:bg-[#FAF6EF] shrink-0 cursor-pointer shadow-xs transition-colors duration-180"
                        >
                          Request Quote
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Direct Links */}
            <Link
              href="/account/referral"
              className={`py-1 px-2 rounded-md transition-colors duration-180 ${
                pathname === '/account/referral'
                  ? 'text-[#2563EB] bg-[#EFF6FF]'
                  : 'hover:text-[#2563EB] hover:bg-[#F2ECE2]'
              }`}
            >
              Mitra Affiliate Program
            </Link>

            <Link
              href="/buyback-guarantee"
              className={`py-1 px-2 rounded-md transition-colors duration-180 ${
                pathname === '/buyback-guarantee'
                  ? 'text-[#2563EB] bg-[#EFF6FF]'
                  : 'hover:text-[#2563EB] hover:bg-[#F2ECE2]'
              }`}
            >
              36-Month Buyback
            </Link>

            <Link
              href="/help"
              className={`py-1 px-2 rounded-md transition-colors duration-180 ${
                pathname === '/help'
                  ? 'text-[#2563EB] bg-[#EFF6FF]'
                  : 'hover:text-[#2563EB] hover:bg-[#F2ECE2]'
              }`}
            >
              Warranty &amp; Support
            </Link>
          </nav>
        </div>
      </div>

      {/* ── Mobile Navigation Drawer ── */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true" aria-label="Mobile Navigation">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/45 backdrop-blur-xs transition-opacity duration-250 animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-over Panel from right */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-[#FFFDF9] border-l border-[#E6DFD5] shadow-xl flex flex-col justify-between overflow-y-auto animate-drawer-in">
              <div>
                {/* Drawer Header */}
                <div className="p-4 border-b border-[#E6DFD5] flex items-center justify-between bg-[#FAF6EF]">
                  <Link
                    href="/"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2"
                  >
                    <Image
                      src="/logo.png"
                      alt="LaptopMitra"
                      width={130}
                      height={40}
                      className="h-6 w-auto object-contain"
                    />
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                      Certified
                    </span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-[#F2ECE2] cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                    aria-label="Close menu"
                  >
                    <X size={20} strokeWidth={2} />
                  </button>
                </div>

                {/* Mobile Search Box */}
                <div className="p-4 border-b border-[#E6DFD5]/70">
                  <form onSubmit={handleSearchSubmit} className="relative w-full">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search certified laptops..."
                      className="w-full pl-9 pr-10 py-2.5 text-xs bg-[#FAF6EF] border border-[#E6DFD5] rounded-xl focus:outline-none focus:border-[#2563EB] text-[#111827]"
                    />
                    <Search
                      size={15}
                      strokeWidth={2}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <button
                      type="submit"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-[#2563EB]"
                      aria-label="Search"
                    >
                      <ArrowRight size={14} strokeWidth={2.2} />
                    </button>
                  </form>

                  {/* Quick Chips */}
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {QUICK_SEARCH_CHIPS.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => handleChipClick(chip)}
                        className="px-2.5 py-1 text-[10px] font-semibold rounded-full bg-[#FAF6EF] hover:bg-[#EFF6FF] text-slate-600 hover:text-[#2563EB] border border-[#E6DFD5] transition-colors"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mobile Navigation List with Expandable Accordions */}
                <div className="p-4 space-y-3">
                  {/* Accordion 1: Certified Laptops */}
                  <div className="rounded-xl border border-[#E6DFD5] overflow-hidden bg-[#FAF6EF]/40">
                    <button
                      type="button"
                      onClick={() => setMobileLaptopsExpanded(!mobileLaptopsExpanded)}
                      className="w-full px-3.5 py-3 flex items-center justify-between text-xs font-bold text-[#0B1F4B] hover:bg-[#FAF6EF] transition-colors cursor-pointer"
                      aria-expanded={mobileLaptopsExpanded}
                    >
                      <div className="flex items-center gap-2">
                        <Laptop size={15} className="text-[#2563EB]" />
                        <span>Certified Laptops</span>
                      </div>
                      <ChevronDown
                        size={15}
                        className={`text-slate-400 transition-transform duration-220 ${
                          mobileLaptopsExpanded ? 'rotate-180 text-[#2563EB]' : ''
                        }`}
                      />
                    </button>

                    {mobileLaptopsExpanded && (
                      <div className="px-3 pb-3 pt-1 space-y-1 border-t border-[#E6DFD5]/60 bg-[#FFFDF9] animate-dropdown-in">
                        {laptopCategories.map((item) => {
                          const Icon = item.icon;
                          const isActive = pathname === item.href;
                          return (
                            <Link
                              key={item.name}
                              href={item.href}
                              onClick={() => setMobileMenuOpen(false)}
                              className={`flex items-center justify-between p-2 rounded-lg text-xs font-semibold transition-colors ${
                                isActive
                                  ? 'bg-[#EFF6FF] text-[#2563EB] font-bold'
                                  : 'text-slate-700 hover:bg-[#FAF6EF] hover:text-[#2563EB]'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Icon size={14} className="text-slate-500 shrink-0" />
                                <span className="truncate">{item.name}</span>
                              </div>
                              {item.badge && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  {item.badge}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Accordion 2: Solutions */}
                  <div className="rounded-xl border border-[#E6DFD5] overflow-hidden bg-[#FAF6EF]/40">
                    <button
                      type="button"
                      onClick={() => setMobileSolutionsExpanded(!mobileSolutionsExpanded)}
                      className="w-full px-3.5 py-3 flex items-center justify-between text-xs font-bold text-[#0B1F4B] hover:bg-[#FAF6EF] transition-colors cursor-pointer"
                      aria-expanded={mobileSolutionsExpanded}
                    >
                      <div className="flex items-center gap-2">
                        <Briefcase size={15} className="text-[#2563EB]" />
                        <span>Solutions &amp; Fleet</span>
                      </div>
                      <ChevronDown
                        size={15}
                        className={`text-slate-400 transition-transform duration-220 ${
                          mobileSolutionsExpanded ? 'rotate-180 text-[#2563EB]' : ''
                        }`}
                      />
                    </button>

                    {mobileSolutionsExpanded && (
                      <div className="px-3 pb-3 pt-1 space-y-1 border-t border-[#E6DFD5]/60 bg-[#FFFDF9] animate-dropdown-in">
                        <Link
                          href="/products?type=buy"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center justify-between p-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-[#FAF6EF] hover:text-[#2563EB]"
                        >
                          <span>Outright Purchase</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-blue-50 text-[#2563EB] border border-[#BFDBFE]">
                            Tax Benefit
                          </span>
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            setCorporateModalPrefill({ mode: 'lease' });
                            setCorporateModalOpen(true);
                          }}
                          className="w-full text-left flex items-center justify-between p-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-[#FAF6EF] hover:text-[#2563EB] cursor-pointer"
                        >
                          <span>Corporate Leasing</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-blue-50 text-[#2563EB] border border-[#BFDBFE]">
                            Quote
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            setCorporateModalPrefill({ mode: 'sell' });
                            setCorporateModalOpen(true);
                          }}
                          className="w-full text-left flex items-center justify-between p-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-[#FAF6EF] hover:text-[#2563EB] cursor-pointer"
                        >
                          <span>Bulk Fleet Procurement</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-blue-50 text-[#2563EB] border border-[#BFDBFE]">
                            5+ Units
                          </span>
                        </button>
                        <Link
                          href="/buyback-guarantee"
                          onClick={() => setMobileMenuOpen(false)}
                          className="flex items-center justify-between p-2 rounded-lg text-xs font-semibold text-slate-700 hover:bg-[#FAF6EF] hover:text-[#2563EB]"
                        >
                          <span>36-Month Buyback Schedule</span>
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Standard Secondary Navigation Items */}
                  <div className="space-y-1 pt-1">
                    <Link
                      href="/account/referral"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-[#FAF6EF] hover:text-[#2563EB]"
                    >
                      <Handshake size={15} className="text-[#2563EB]" />
                      <span>Mitra Affiliate Program</span>
                    </Link>

                    <Link
                      href="/help"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-[#FAF6EF] hover:text-[#2563EB]"
                    >
                      <HelpCircle size={15} className="text-[#2563EB]" />
                      <span>Warranty &amp; Support</span>
                    </Link>

                    <Link
                      href="/wishlist"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between p-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-[#FAF6EF] hover:text-[#2563EB]"
                    >
                      <div className="flex items-center gap-2">
                        <Heart size={15} className="text-rose-500" />
                        <span>Saved Wishlist</span>
                      </div>
                      {wishlistCount > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                          {wishlistCount}
                        </span>
                      )}
                    </Link>

                    <Link
                      href="/cart"
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between p-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-[#FAF6EF] hover:text-[#2563EB]"
                    >
                      <div className="flex items-center gap-2">
                        <ShoppingCart size={15} className="text-[#2563EB]" />
                        <span>Cart</span>
                      </div>
                      {itemCount > 0 && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-[#2563EB] border border-[#BFDBFE]">
                          {itemCount}
                        </span>
                      )}
                    </Link>
                  </div>
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="p-4 border-t border-[#E6DFD5] bg-[#FAF6EF] space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setCorporateModalPrefill(undefined);
                    setCorporateModalOpen(true);
                  }}
                  className="w-full py-2.5 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                >
                  <FileCheck2 size={15} strokeWidth={2.2} />
                  <span>Request Enterprise Quote</span>
                </button>

                {user ? (
                  <Link
                    href="/account/orders"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-2.5 px-4 bg-[#FFFDF9] hover:bg-[#F2ECE2] border border-[#E6DFD5] text-[#0B1F4B] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <UserIcon size={15} />
                    <span>My Account &amp; Orders</span>
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-2.5 px-4 bg-[#FFFDF9] hover:bg-[#F2ECE2] border border-[#E6DFD5] text-[#0B1F4B] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <UserIcon size={15} />
                    <span>Sign In to Account</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Corporate Procurement & Leasing Quote Modal */}
      <CorporateQuoteModal
        open={corporateModalOpen}
        onClose={() => setCorporateModalOpen(false)}
        prefill={corporateModalPrefill}
      />
    </header>
  );
}
