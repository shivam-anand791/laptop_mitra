'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import CustomerLayout from '../components/CustomerLayout';
import ProductCard, { getPrimaryImage } from '../components/ProductCard';
import AnimatedCounter from '../components/AnimatedCounter';
import RevealOnScroll from '../components/RevealOnScroll';
import { useReducedMotion } from '../lib/hooks/useReducedMotion';
import { ProductCardSkeleton } from '../components/ui/Skeleton';
import { Product } from '../lib/types';
import { api } from '../lib/api';
import { NEXT_PUBLIC_WHATSAPP_NUMBER } from '../lib/config';
import CorporateQuoteModal from '../components/CorporateQuoteModal';
import CertifiedBench from '../components/CertifiedBench';
import { useSupportConfig } from '../lib/support-config';
import { MOCK_PRODUCTS } from '../lib/mock-data';
import {
  ShieldCheck,
  CheckCircle2,
  Cpu,
  BatteryCharging,
  Search,
  Sparkles,
  ArrowRight,
  Award,
  Zap,
  ChevronRight,
  X,
  Laptop,
} from 'lucide-react';

/* ── 5 Verified Categories matching data & Image 1 ── */
const categories = [
  {
    title: 'Business Laptops',
    slug: 'cat-business',
    tagline: 'Work Smarter',
    desc: 'ThinkPad, Latitude & EliteBook',
    image: '/images/generated/cat-business.jpg',
  },
  {
    title: 'Student Laptops',
    slug: 'cat-student',
    tagline: 'Learn Better',
    desc: 'Budget & Coding Laptops Under ₹25k',
    image: '/images/generated/cat-student.jpg',
  },
  {
    title: 'Gaming Laptops',
    slug: 'cat-gaming',
    tagline: 'Play Harder',
    desc: 'NVIDIA RTX & 120Hz+ Displays',
    image: '/images/generated/cat-gaming.jpg',
  },
  {
    title: 'Premium Series',
    slug: 'cat-ultrabook',
    tagline: 'For Creators',
    desc: 'Ultra-slim Aluminum Portables',
    image: '/images/generated/cat-ultrabook.jpg',
  },
  {
    title: 'Apple MacBooks',
    slug: 'cat-apple',
    tagline: 'Apple Silicon',
    desc: 'M1, M2 & Pro Silicon Chips',
    image: '/images/generated/cat-apple.jpg',
  },
];

/* ── Testimonials from verified buyers ── */
const testimonials = [
  {
    name: 'Rajesh Sharma',
    role: 'IT Consultant, Bengaluru',
    product: 'ThinkPad T480 (i7, 16GB, 512GB)',
    text: 'Received in pristine condition with 94% battery health. Saved more than ₹45,000 compared to new. LaptopMitra’s 1-year warranty gave my firm complete peace of mind.',
    rating: 5,
  },
  {
    name: 'Pooja Iyer',
    role: 'Product Designer, Pune',
    product: 'Apple MacBook Pro 14" M1 Pro',
    text: 'Zero scratches, perfect Retina display, and the battery lasts a full day of Figma work. The door-to-door delivery was prompt with tamper-proof packaging.',
    rating: 5,
  },
  {
    name: 'Vikram Mehta',
    role: 'Startup Founder, Gurugram',
    product: 'Dell Latitude 7490 (Batch of 6)',
    text: 'Equipped our engineering team through LaptopMitra’s bulk program. Saved 60% on our IT hardware budget with prompt doorstep warranty support.',
    rating: 5,
  },
];

/* ── OEM Brands (Strictly Lenovo, HP, Dell only) ── */
const partnerBrands = [
  {
    name: 'HP',
    src: '/brands/hp.svg',
    width: 44,
    height: 44,
    className: 'h-9 sm:h-11 w-auto',
  },
  {
    name: 'Dell',
    src: '/brands/dell.svg',
    width: 44,
    height: 44,
    className: 'h-9 sm:h-11 w-auto',
  },
  {
    name: 'Lenovo',
    src: '/brands/lenovo.svg',
    width: 140,
    height: 28,
    className: 'h-[22px] sm:h-7 w-auto',
  },
];

// Repeat 6 times per group (18 items = ~3,100px width), guaranteeing each group >= 100vw on 2560px screens.
const brandRepeats = Array.from({ length: 6 }).flatMap(() => partnerBrands);

export default function HomePage() {
  const router = useRouter();
  const { data: supportConfig } = useSupportConfig();
  const prefersReducedMotion = useReducedMotion();
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<'featured' | 'new'>('featured');
  const [loading, setLoading] = useState(true);
  const [scrollY, setScrollY] = useState(0);

  // Hero interactive spotlight states
  const [selectedSpotlightIndex, setSelectedSpotlightIndex] = useState(0);
  const [heroSearchQuery, setHeroSearchQuery] = useState('');
  const [isAutoSwitchEnabled, setIsAutoSwitchEnabled] = useState(true);

  // Auto-switch spotlight product every 4 seconds (unconditionally active; toggleable via pause button)
  const AUTO_SWITCH_INTERVAL_MS = 4000;
  useEffect(() => {
    if (!isAutoSwitchEnabled) return;

    const timer = setInterval(() => {
      setSelectedSpotlightIndex((prev) => (prev + 1) % 4);
    }, AUTO_SWITCH_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [isAutoSwitchEnabled, selectedSpotlightIndex]);

  // Real countdown timer state
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);
  const [corporateModalOpen, setCorporateModalOpen] = useState(false);

  // Passive scroll listener for subtle restrained hero parallax
  useEffect(() => {
    if (prefersReducedMotion) return;
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrollY(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [prefersReducedMotion]);

  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await api.getProducts({ limit: 12 });
        setProducts(res.products);
      } catch {
        // Handled by API fallback
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  // Canonical hero spotlight laptops (using API products with fallback to MOCK_PRODUCTS)
  const spotlightLaptops = useMemo(() => {
    const source = products.length > 0 ? products : MOCK_PRODUCTS;

    const findMatch = (brandKeyword: string, fallbackIdx: number) => {
      const match = source.find(
        (p) =>
          p.name.toLowerCase().includes(brandKeyword.toLowerCase()) ||
          p.slug.toLowerCase().includes(brandKeyword.toLowerCase()) ||
          p.tags?.toLowerCase().includes(brandKeyword.toLowerCase())
      );
      return match || source[fallbackIdx] || source[0];
    };

    const macbook = findMatch('macbook', 0);
    const thinkpad = findMatch('thinkpad', 1);
    const dell = findMatch('dell', 2);
    const hp = findMatch('elitebook', 3);

    return [
      {
        product: macbook,
        brand: 'Apple',
        shortName: 'MacBook Pro 16"',
        tagline: 'M2 Pro Apple Silicon',
        highlightColor: '#38BDF8',
      },
      {
        product: thinkpad,
        brand: 'Lenovo',
        shortName: 'ThinkPad T480',
        tagline: 'Enterprise Workhorse',
        highlightColor: '#EF4444',
      },
      {
        product: dell,
        brand: 'Dell',
        shortName: 'XPS 15 9520',
        tagline: 'Creator Powerhouse',
        highlightColor: '#60A5FA',
      },
      {
        product: hp,
        brand: 'HP',
        shortName: 'EliteBook 840',
        tagline: 'Executive Ultrabook',
        highlightColor: '#10B981',
      },
    ];
  }, [products]);

  // Active spotlight item
  const activeSpotlight = spotlightLaptops[selectedSpotlightIndex] || spotlightLaptops[0];
  const activeProduct = activeSpotlight.product;
  const activeImage = getPrimaryImage(activeProduct);
  const activePrice = Number(activeProduct.price) || 29990;
  const activeCompareAt = activeProduct.compareAtPrice ? Number(activeProduct.compareAtPrice) : activePrice * 1.6;
  const activeSavings = Math.max(0, activeCompareAt - activePrice);
  const activeDiscount = Math.round((activeSavings / activeCompareAt) * 100);

  const activeMetadata = (activeProduct.metadata as Record<string, any>) || {};
  const activeProcessor = activeMetadata.processor || 'High-Performance Multi-Core';
  const activeRam = activeMetadata.ram || '16GB RAM';
  const activeBattery = activeMetadata.batteryHealth || '94% Original Capacity';
  const activeCondition = activeMetadata.condition || 'Grade A+ Pristine (Certified Like-New)';

  // Keyboard navigation for spotlight switcher
  const handleSpotlightKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setSelectedSpotlightIndex((prev) => (prev + 1) % spotlightLaptops.length);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setSelectedSpotlightIndex((prev) => (prev - 1 + spotlightLaptops.length) % spotlightLaptops.length);
      }
    },
    [spotlightLaptops.length]
  );

  // Search handler
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = heroSearchQuery.trim();
    if (query) {
      router.push(`/products?search=${encodeURIComponent(query)}`);
    } else {
      router.push('/products');
    }
  };

  const dealProduct = products[0];
  const dealImage = dealProduct
    ? getPrimaryImage(dealProduct)
    : 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1000&q=80';
  const dealPrice = dealProduct ? Number(dealProduct.price) : 29990;
  const dealCompare = dealProduct?.compareAtPrice ? Number(dealProduct.compareAtPrice) : 68000;
  const dealSavings = dealCompare - dealPrice;
  const dealDiscount = Math.round((dealSavings / dealCompare) * 100);

  // Countdown timer calculation (real dealEndsAt or rolling daily countdown to midnight)
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      let diff = 0;
      if (dealProduct?.dealEndsAt) {
        const target = new Date(dealProduct.dealEndsAt).getTime();
        if (!isNaN(target)) diff = target - now.getTime();
      }
      if (diff <= 0) {
        const midnight = new Date(now);
        midnight.setHours(23, 59, 59, 999);
        diff = midnight.getTime() - now.getTime();
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [dealProduct?.dealEndsAt]);

  const featuredList = products.filter((p) => p.isFeatured);
  const newList = products.filter((p) => p.isNewArrival);
  const displayedProducts =
    activeTab === 'featured'
      ? featuredList.length > 0 ? featuredList : products.slice(0, 8)
      : newList.length > 0 ? newList : products.slice(0, 8);

  return (
    <CustomerLayout>
      {/* ─── 1. HERO SECTION ─── */}
      <section className="relative overflow-hidden bg-[#071433] text-white">
        {/* Photographic Scene Background with subtle restrained parallax & entrance */}
        <div
          className="absolute inset-0 z-0 animate-fade-in"
          style={{
            animationDuration: '800ms',
            animationDelay: '180ms',
            transform: prefersReducedMotion ? 'none' : `translate3d(0, ${Math.min(scrollY * 0.05, 24)}px, 0)`,
            transition: prefersReducedMotion ? 'none' : 'transform 100ms linear',
            willChange: prefersReducedMotion ? 'auto' : 'transform',
          }}
        >
          <Image
            src="/images/generated/hero-enterprise-laptop.webp"
            alt="Premium enterprise certified laptop on workstation"
            fill
            priority
            sizes="100vw"
            className="object-cover object-right lg:object-[right_center] scale-[1.02] transition-transform duration-700 ease-out"
          />
          {/* Single Precision Multi-Stop Navy Overlay Gradient */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(90deg, rgba(7,20,51,0.98) 0%, rgba(7,20,51,0.92) 35%, rgba(7,20,51,0.65) 60%, rgba(7,20,51,0.85) 100%)',
            }}
          />
          {/* Subtle Bottom Gradient behind Trust Strip */}
          <div
            className="absolute inset-x-0 bottom-0 h-36 pointer-events-none"
            style={{
              background: 'linear-gradient(0deg, rgba(7,20,51,0.85) 0%, rgba(7,20,51,0) 100%)',
            }}
          />
        </div>

        {/* Hero Content Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-4 pb-5 sm:pt-6 sm:pb-6 lg:pt-6 lg:pb-6 flex flex-col justify-center">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left Column: Value Proposition & Discovery (7 cols on desktop) */}
            <div className="lg:col-span-7 space-y-4 sm:space-y-5 text-left">
              {/* Eyebrow */}
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/25 text-[#38BDF8] text-[11px] font-extrabold uppercase tracking-widest backdrop-blur-xs animate-fade-in"
                style={{ animationDuration: '400ms', animationDelay: '50ms' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-pulse" />
                <span>Enterprise Certified Hardware</span>
              </div>

              {/* Main Headline - Line-by-line reveal */}
              <h1 className="text-3xl sm:text-5xl lg:text-[3.25rem] font-black tracking-tight leading-[1.12] text-white overflow-hidden">
                <span
                  className="block animate-hero-entrance"
                  style={{
                    animationDuration: '750ms',
                    animationDelay: '120ms',
                    animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  Certified Laptops
                </span>
                <span
                  className="block animate-hero-entrance"
                  style={{
                    animationDuration: '750ms',
                    animationDelay: '240ms',
                    animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  for Your <span className="text-[#38BDF8]">Business.</span>
                </span>
              </h1>

              {/* Subcopy Paragraph */}
              <p
                className="text-xs sm:text-sm text-slate-300/90 leading-relaxed font-normal max-w-[520px] animate-fade-up"
                style={{
                  animationDuration: '500ms',
                  animationDelay: '380ms',
                  animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                Genuine products. Tested brands. Transparent bulk pricing.<br />
                LaptopMitra helps businesses equip high-performance devices<br />
                backed by 32-point inspection and doorstep warranty.
              </p>

              {/* CTA Buttons Row */}
              <div
                className="flex flex-wrap items-center gap-3 pt-1 animate-fade-up"
                style={{
                  animationDuration: '400ms',
                  animationDelay: '480ms',
                  animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <Link
                  href="/products"
                  className="px-5 sm:px-6 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-blue-900/40 transition-all flex items-center gap-2 active:scale-95 hover:-translate-y-0.5 hover-scale-subtle"
                >
                  <span>Explore Certified Laptops</span>
                  <span>→</span>
                </Link>

                <a
                  href="#quality-bench"
                  className="px-5 sm:px-6 py-3 border border-white/20 bg-white/5 hover:bg-white/10 text-white text-xs sm:text-sm font-bold rounded-xl backdrop-blur-xs transition-all active:scale-95 hover:-translate-y-0.5 cursor-pointer flex items-center gap-1.5 hover-scale-subtle"
                >
                  <ShieldCheck className="w-4 h-4 text-[#38BDF8]" />
                  <span>Explore Our Quality Process</span>
                </a>

                <button
                  type="button"
                  onClick={() => setCorporateModalOpen(true)}
                  className="px-4 py-3 text-slate-300 hover:text-white text-xs font-semibold rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Request Fleet Quote
                </button>
              </div>

              {/* Discoverable Instant Search Bar */}
              <div
                className="pt-2 animate-fade-up"
                style={{
                  animationDuration: '450ms',
                  animationDelay: '520ms',
                  animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                <form
                  onSubmit={handleSearchSubmit}
                  className="relative flex items-center max-w-xl rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 p-1.5 shadow-lg focus-within:border-[#38BDF8] focus-within:ring-2 focus-within:ring-[#38BDF8]/20 transition-all"
                >
                  <Search className="w-4 h-4 text-[#38BDF8] ml-2.5 shrink-0" />
                  <input
                    type="text"
                    value={heroSearchQuery}
                    onChange={(e) => setHeroSearchQuery(e.target.value)}
                    placeholder="Search by model, brand, or spec (e.g. ThinkPad, 16GB, MacBook, i7)..."
                    className="w-full bg-transparent px-3 py-1.5 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none"
                    aria-label="Search laptops"
                  />
                  {heroSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setHeroSearchQuery('')}
                      className="p-1 text-slate-400 hover:text-white mr-1 cursor-pointer"
                      aria-label="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold rounded-xl transition-all shrink-0 active:scale-95 cursor-pointer"
                  >
                    Search
                  </button>
                </form>

                {/* Instant Category Shortcuts */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2.5 text-[11px]">
                  <span className="text-slate-400 font-medium mr-1">Popular:</span>
                  <Link
                    href="/products?category=cat-business"
                    className="px-2.5 py-0.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-slate-200 transition-colors"
                  >
                    Business Series
                  </Link>
                  <Link
                    href="/products?category=cat-apple"
                    className="px-2.5 py-0.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-slate-200 transition-colors"
                  >
                    Apple MacBooks
                  </Link>
                  <Link
                    href="/products?category=cat-gaming"
                    className="px-2.5 py-0.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-slate-200 transition-colors"
                  >
                    Gaming Series
                  </Link>
                  <Link
                    href="/products?category=cat-student"
                    className="px-2.5 py-0.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-slate-200 transition-colors"
                  >
                    Student &amp; Coding
                  </Link>
                  <Link
                    href="/products?category=cat-ultrabook"
                    className="px-2.5 py-0.5 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 text-slate-200 transition-colors hidden sm:inline-block"
                  >
                    Premium Ultrabooks
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Column: Interactive Product Spotlight Showcase (5 cols on desktop) */}
            <div
              className="lg:col-span-5 relative animate-fade-in"
              style={{ animationDuration: '650ms', animationDelay: '250ms' }}
            >
              {/* Spotlight Podium Stage */}
              <div className="relative rounded-3xl bg-gradient-to-b from-[#0F224D]/90 via-[#0A1838] to-[#061026] border border-white/15 p-4 sm:p-5 shadow-2xl backdrop-blur-md overflow-hidden">
                {/* Subtle Radial Blue Glow */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.22)_0%,transparent_70%)] pointer-events-none" />

                {/* Top Spotlight Bar: Grade & Pricing */}
                <div className="relative z-10 flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-bold tracking-wide flex items-center gap-1">
                      <Award className="w-3 h-3" />
                      <span>{activeCondition}</span>
                    </span>
                  </div>

                  <div className="text-right">
                    <div className="flex items-baseline gap-2 justify-end">
                      <span className="text-lg sm:text-xl font-black text-white tabular-nums">
                        ₹{activePrice.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs line-through text-slate-400 font-medium tabular-nums">
                        ₹{activeCompareAt.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-[#38BDF8]">
                      Save {activeDiscount}% (₹{activeSavings.toLocaleString('en-IN')} off)
                    </span>
                  </div>
                </div>

                {/* Product Centerpiece Visual Stage */}
                <div className="relative z-10 my-3 group">
                  <Link
                    href={`/products/${activeProduct.id}`}
                    className="block relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-gradient-to-b from-white/5 to-white/0 p-3 sm:p-4 transition-all duration-300 hover:scale-[1.02]"
                    title={`View ${activeProduct.name}`}
                  >
                    {/* Floating Spec Badge 1 (Top-Left): 32-Point Inspected */}
                    <div className="absolute top-2 left-2 z-20 px-2 py-0.5 rounded-md bg-[#071433]/85 backdrop-blur-md border border-[#38BDF8]/40 text-[9px] font-bold text-[#38BDF8] shadow-xs flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5 text-[#38BDF8]" />
                      <span>32-Point Diagnostics Passed</span>
                    </div>

                    {/* Floating Spec Badge 2 (Top-Right): Doorstep Warranty */}
                    <div className="absolute top-2 right-2 z-20 px-2 py-0.5 rounded-md bg-[#071433]/85 backdrop-blur-md border border-white/20 text-[9px] font-bold text-white shadow-xs flex items-center gap-1">
                      <ShieldCheck className="w-2.5 h-2.5 text-emerald-400" />
                      <span>1-Year Doorstep Warranty</span>
                    </div>

                    {/* Laptop Centerpiece Image with 300ms transition */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      key={activeProduct.id}
                      src={activeImage}
                      alt={activeProduct.name}
                      className="w-full h-full object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,0.7)] transition-all duration-300 ease-out group-hover:scale-105"
                      loading="eager"
                    />

                    {/* Floating Spec Badge 3 (Bottom-Left): Battery Health */}
                    <div className="absolute bottom-2 left-2 z-20 px-2 py-0.5 rounded-md bg-[#071433]/85 backdrop-blur-md border border-white/20 text-[9px] font-bold text-slate-200 shadow-xs flex items-center gap-1">
                      <BatteryCharging className="w-2.5 h-2.5 text-emerald-400" />
                      <span>{activeBattery}</span>
                    </div>

                    {/* Floating Spec Badge 4 (Bottom-Right): Processor */}
                    <div className="absolute bottom-2 right-2 z-20 px-2 py-0.5 rounded-md bg-[#071433]/85 backdrop-blur-md border border-white/20 text-[9px] font-bold text-slate-200 shadow-xs flex items-center gap-1">
                      <Cpu className="w-2.5 h-2.5 text-blue-400" />
                      <span>{activeProcessor.split('(')[0].trim()}</span>
                    </div>
                  </Link>

                  {/* Active Product Headline & Direct PDP Link */}
                  <div className="mt-2 text-center">
                    <h3 className="text-sm sm:text-base font-extrabold text-white truncate px-2">
                      {activeProduct.name}
                    </h3>
                    <div className="flex items-center justify-center gap-3 mt-1 text-xs">
                      <Link
                        href={`/products/${activeProduct.id}`}
                        className="font-bold text-[#38BDF8] hover:text-[#60A5FA] flex items-center gap-1 transition-colors group/link"
                      >
                        <span>View Verified Machine Details</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover/link:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Interactive Product Switcher Dock (Thumbnails / Selector Tabs) */}
                <div
                  className="relative z-10 pt-3 border-t border-white/10"
                  role="region"
                  aria-label="Featured Laptop Switcher"
                  tabIndex={0}
                  onKeyDown={handleSpotlightKeyDown}
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold mb-2 px-1">
                    <span className="flex items-center gap-1.5 text-slate-300">
                      <Sparkles className="w-3 h-3 text-[#38BDF8]" />
                      <span>Switch Spotlight Laptop:</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-[#38BDF8]/90 font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8] animate-pulse" />
                        <span>{isAutoSwitchEnabled ? 'Auto-switching every 4s' : 'Auto-switch paused'}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsAutoSwitchEnabled((prev) => !prev)}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-slate-300 transition-colors cursor-pointer"
                        title={isAutoSwitchEnabled ? 'Pause auto-switching' : 'Resume auto-switching'}
                      >
                        {isAutoSwitchEnabled ? '⏸' : '▶'}
                      </button>
                    </div>
                  </div>

                  {/* 4 Switcher Capsule Buttons */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                    {spotlightLaptops.map((item, idx) => {
                      const isSelected = idx === selectedSpotlightIndex;
                      const itemPrice = Number(item.product.price) || 29990;
                      return (
                        <button
                          key={item.product.id || idx}
                          type="button"
                          onClick={() => setSelectedSpotlightIndex(idx)}
                          className={`p-2 rounded-xl text-left transition-all duration-200 cursor-pointer relative overflow-hidden ${
                            isSelected
                              ? 'bg-blue-600/25 border-2 border-[#38BDF8] shadow-md shadow-blue-900/30 ring-1 ring-[#38BDF8]/40 scale-[1.02]'
                              : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 opacity-80 hover:opacity-100'
                          }`}
                          aria-pressed={isSelected}
                          aria-label={`Select ${item.shortName}`}
                        >
                          {isSelected && (
                            <>
                              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#38BDF8] ring-2 ring-[#071433] animate-pulse" />
                              {isAutoSwitchEnabled && (
                                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-white/10 overflow-hidden pointer-events-none">
                                  <div
                                    key={`bar-${selectedSpotlightIndex}`}
                                    className="h-full bg-gradient-to-r from-[#38BDF8] to-[#2563EB] animate-spotlight-progress"
                                  />
                                </div>
                              )}
                            </>
                          )}
                          <span className="block text-[9px] font-extrabold uppercase tracking-wider text-[#38BDF8]">
                            {item.brand}
                          </span>
                          <span className="block text-[11px] font-bold text-white truncate leading-tight mt-0.5">
                            {item.shortName}
                          </span>
                          <span className="block text-[10px] font-extrabold text-slate-300 tabular-nums mt-1">
                            ₹{itemPrice.toLocaleString('en-IN')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── 4-COLUMN TRUST DOCK (Docked Inside Hero Bottom matching Image B) ─── */}
        <div
          className="relative z-10 border-t border-white/10 bg-[#071433]/40 backdrop-blur-[2px] animate-fade-up"
          style={{
            animationDuration: '500ms',
            animationDelay: '550ms',
            animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 divide-y md:divide-y-0 md:divide-x divide-white/10">
              {/* Feature 1: 100% Genuine Products */}
              <div className="flex items-center gap-3.5 pt-2 md:pt-0 group cursor-default">
                <div className="text-[#38BDF8] shrink-0 group-hover:scale-110 transition-transform duration-200">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs sm:text-[13px] font-bold text-white leading-tight">100% Genuine Products</h4>
                  <p className="text-[11px] text-white/60 font-normal">with Brand Warranty</p>
                </div>
              </div>

              {/* Feature 2: Bulk Orders */}
              <div className="flex items-center gap-3.5 pt-2 md:pt-0 md:pl-6 group cursor-default">
                <div className="text-[#38BDF8] shrink-0 group-hover:scale-110 transition-transform duration-200">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                  </svg>
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs sm:text-[13px] font-bold text-white leading-tight">Bulk Orders</h4>
                  <p className="text-[11px] text-white/60 font-normal">&amp; Special Pricing</p>
                </div>
              </div>

              {/* Feature 3: PAN India Delivery */}
              <div className="flex items-center gap-3.5 pt-2 md:pt-0 md:pl-6 group cursor-default">
                <div className="text-[#38BDF8] shrink-0 group-hover:scale-110 transition-transform duration-200">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs sm:text-[13px] font-bold text-white leading-tight">PAN India Delivery</h4>
                  <p className="text-[11px] text-white/60 font-normal">All Major Locations</p>
                </div>
              </div>

              {/* Feature 4: Dedicated Support */}
              <div className="flex items-center gap-3.5 pt-2 md:pt-0 md:pl-6 group cursor-default">
                <div className="text-[#38BDF8] shrink-0 group-hover:scale-110 transition-transform duration-200">
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-xs sm:text-[13px] font-bold text-white leading-tight">Dedicated Support</h4>
                  <p className="text-[11px] text-white/60 font-normal">Before &amp; After Purchase</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 2. SHOP BY CATEGORY ─── */}
      <section id="categories" className="py-6 sm:py-16 lg:py-20 bg-[#F7F4EE] scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll delayMs={0} durationMs={500}>
            <div className="flex items-center justify-between mb-4 sm:mb-8">
              <div>
                <span className="hidden sm:block text-[11px] font-bold uppercase tracking-wider text-[#2563EB] mb-1">
                  Certified Catalog
                </span>
                <h2 className="text-lg sm:text-3xl font-bold text-[#0B1F4B] tracking-tight">
                  Shop by Category
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Explore tested devices by segment
                </p>
              </div>
              <Link
                href="/products"
                className="text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] flex items-center gap-1 group"
              >
                <span>View All</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>
          </RevealOnScroll>

          {/* Categories Responsive Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-6">
            {categories.map((cat, idx) => (
              <RevealOnScroll key={cat.slug} delayMs={idx * 60} durationMs={500} className="h-full">
                <Link
                  href={`/products?category=${cat.slug}`}
                  className="group relative h-full rounded-2xl overflow-hidden bg-[#FFFDF9] border border-[#E6DFD5] hover:border-[#2563EB] shadow-xs hover:shadow-xl hover:shadow-blue-900/5 hover-elevation transition-all duration-300 p-4 flex flex-col justify-between"
                >
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-[#FAF6EF] mb-3.5">
                    <Image
                      src={cat.image}
                      alt={cat.title}
                      fill
                      sizes="(max-width: 768px) 50vw, 20vw"
                      className="object-cover group-hover:scale-108 transition-transform duration-500 ease-out"
                    />
                    <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-md bg-[#0B1F4B]/85 backdrop-blur-xs text-[10px] font-bold text-white shadow-xs">
                      {cat.tagline}
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-sm font-extrabold text-[#0B1F4B] group-hover:text-[#2563EB] transition-colors leading-tight">
                        {cat.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-1 font-medium">
                        {cat.desc}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-[#E6DFD5]/60 flex items-center justify-between text-[11px] font-bold text-[#2563EB]">
                      <span>Explore Devices</span>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </div>
                  </div>
                </Link>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 3. DEAL OF THE DAY ─── */}
      <section className="py-6 sm:py-10 bg-[#FAF6EF] border-y border-[#E6DFD5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll delayMs={60} durationMs={600}>
            <div className="relative overflow-hidden rounded-2xl bg-[#081530] text-white p-5 sm:p-7 lg:p-8 shadow-xl border border-white/5">
              {/* Top row: Badge on left, Discount on right */}
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#132349] border border-[#233A72] text-[#60A5FA] text-[11px] font-bold tracking-wider uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#60A5FA] animate-pulse" />
                  <span>Featured Daily Deal</span>
                </div>
                <div className="px-2.5 py-1 rounded-md bg-[#16A34A] text-white text-xs font-black shadow-xs">
                  {dealDiscount || 45}% OFF
                </div>
              </div>

              {/* Grid: Details on Left, High-Res Product Image on Right */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
                {/* Left Column: Details & Pricing (7 cols on desktop) */}
                <div className="lg:col-span-7 flex flex-col justify-between">
                  {/* Title & Subtitle */}
                  <div>
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">
                      {dealProduct?.name || 'ThinkPad Executive Ultrabook'}
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
                      {dealProduct?.shortDescription || 'Intel Core i7 • 16GB RAM • 512GB SSD • Grade A+ Pristine'}
                    </p>
                  </div>

                  {/* Mobile-Only Product Image */}
                  <div className="lg:hidden my-3.5">
                    <Link
                      href={`/products/${dealProduct?.id || 'prod-macbook-pro-16'}`}
                      className="group relative w-full aspect-[16/10] rounded-xl overflow-hidden bg-gradient-to-b from-[#0F224D]/80 to-[#0A1838] border border-white/10 p-4 flex items-center justify-center shadow-lg block"
                    >
                      <div className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[9px] font-bold text-white shadow-2xs">
                        Grade A+ Certified Like-New
                      </div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={dealImage}
                        alt={dealProduct?.name || 'Featured Deal Laptop'}
                        className="w-full h-full object-contain drop-shadow-2xl group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </Link>
                  </div>

                  {/* Specs Pills Row */}
                  <div className="flex flex-wrap items-center gap-2 mt-3.5">
                    <div className="px-2.5 py-1 rounded-lg bg-[#142347] border border-[#23396D] text-[11px] font-semibold text-slate-200 flex items-center gap-1.5 shadow-2xs hover:bg-[#1D3263] transition-colors">
                      <span>⚡</span>
                      <span>{(dealProduct?.metadata as any)?.processor || 'Intel Core i7'}</span>
                    </div>
                    <div className="px-2.5 py-1 rounded-lg bg-[#142347] border border-[#23396D] text-[11px] font-semibold text-slate-200 flex items-center gap-1.5 shadow-2xs hover:bg-[#1D3263] transition-colors">
                      <span>💾</span>
                      <span>{(dealProduct?.metadata as any)?.ram || '16GB Dual RAM'}</span>
                    </div>
                    <div className="px-2.5 py-1 rounded-lg bg-[#142347] border border-[#23396D] text-[11px] font-semibold text-slate-200 flex items-center gap-1.5 shadow-2xs hover:bg-[#1D3263] transition-colors">
                      <span>🚀</span>
                      <span>{(dealProduct?.metadata as any)?.storage || '512GB SSD'}</span>
                    </div>
                    <div className="px-2.5 py-1 rounded-lg bg-[#142347] border border-[#23396D] text-[11px] font-semibold text-slate-200 flex items-center gap-1.5 shadow-2xs hover:bg-[#1D3263] transition-colors">
                      <span>🔋</span>
                      <span>{(dealProduct?.metadata as any)?.batteryHealth || '94% Battery'}</span>
                    </div>
                  </div>

                  {/* Progress Claim Row */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="font-bold text-[#F97316] flex items-center gap-1">
                        <span>🔥</span>
                        <span>84% Claimed Today</span>
                      </span>
                      <span className="text-slate-400 font-medium text-[11px]">
                        Only 3 units left
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#18284E] overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#F59E0B] to-[#F97316] w-[84%]" />
                    </div>
                  </div>

                  {/* Countdown Row */}
                  <div className="mt-4 flex items-center gap-2.5">
                    <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                      Ends In:
                    </span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <div className="px-2.5 py-1 rounded-md bg-[#142347] border border-[#23396D] text-center min-w-[38px]">
                        <span className="text-sm font-black text-white tabular-nums block leading-tight">
                          {String(timeLeft?.hours ?? 14).padStart(2, '0')}
                        </span>
                        <span className="text-[8px] text-slate-400 font-bold uppercase block leading-tight">HRS</span>
                      </div>
                      <span className="text-sm font-bold text-slate-500">:</span>
                      <div className="px-2.5 py-1 rounded-md bg-[#142347] border border-[#23396D] text-center min-w-[38px]">
                        <span className="text-sm font-black text-white tabular-nums block leading-tight">
                          {String(timeLeft?.minutes ?? 28).padStart(2, '0')}
                        </span>
                        <span className="text-[8px] text-slate-400 font-bold uppercase block leading-tight">MINS</span>
                      </div>
                      <span className="text-sm font-bold text-slate-500">:</span>
                      <div className="px-2.5 py-1 rounded-md bg-[#142347] border border-[#23396D] text-center min-w-[38px]">
                        <span className="text-sm font-black text-white tabular-nums block leading-tight">
                          {String(timeLeft?.seconds ?? 37).padStart(2, '0')}
                        </span>
                        <span className="text-[8px] text-slate-400 font-bold uppercase block leading-tight">SECS</span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Row: Price on left, Explore Deal CTA on right */}
                  <div className="mt-5 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-baseline gap-3">
                      <span className="text-2xl sm:text-3xl font-black text-white tabular-nums">
                        ₹{dealPrice.toLocaleString('en-IN')}
                      </span>
                      <span className="text-sm sm:text-base line-through text-slate-400 font-medium tabular-nums">
                        ₹{dealCompare.toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <Link
                        href={`/products/${dealProduct?.id || 'prod-macbook-pro-16'}`}
                        className="h-10 px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md active:scale-95 hover-scale-subtle flex items-center justify-center gap-1.5 button-press cursor-pointer"
                      >
                        <span>Explore Deal</span>
                        <span>→</span>
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Right Column: Desktop High-Res Product Image Showcase */}
                <div className="hidden lg:flex lg:col-span-5 items-center justify-center">
                  <Link
                    href={`/products/${dealProduct?.id || 'prod-macbook-pro-16'}`}
                    className="group relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-gradient-to-b from-[#0F224D]/80 to-[#0A1838] border border-white/10 p-5 flex items-center justify-center hover:border-[#38BDF8]/50 transition-all duration-300 shadow-2xl block cursor-pointer"
                    title={`View details for ${dealProduct?.name || 'Deal of the Day'}`}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />

                    <div className="absolute top-3 left-3 z-10 px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[10px] font-bold text-white shadow-xs">
                      Grade A+ Certified Like-New
                    </div>

                    <div className="absolute top-3 right-3 z-10 px-2.5 py-0.5 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-400/30 text-[10px] font-bold text-emerald-300 shadow-xs">
                      🛡️ 1-Yr Warranty
                    </div>

                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={dealImage}
                      alt={dealProduct?.name || 'Deal of the Day Laptop'}
                      className="w-full h-full object-contain rounded-xl drop-shadow-2xl group-hover:scale-105 transition-transform duration-500 ease-out"
                      loading="lazy"
                    />
                  </Link>
                </div>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ─── 4. CANONICAL STATS STRIP ─── */}
      <section className="py-12 sm:py-16 lg:py-20 bg-[#F7F4EE]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-center">
            <RevealOnScroll delayMs={0} durationMs={500} className="h-full">
              <div className="p-5 sm:p-6 rounded-2xl bg-[#FFFDF9] border border-[#E6DFD5] shadow-xs space-y-1 hover-elevation h-full">
                <div className="text-3xl sm:text-4xl font-black text-[#2563EB]">
                  <AnimatedCounter target={1500} suffix="+" />
                </div>
                <p className="text-xs font-bold text-[#111827]">Devices Sold &amp; Certified</p>
                <p className="text-[11px] text-[#475569]">Inspected across 32 checkpoints</p>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delayMs={60} durationMs={500} className="h-full">
              <div className="p-5 sm:p-6 rounded-2xl bg-[#FFFDF9] border border-[#E6DFD5] shadow-xs space-y-1 hover-elevation h-full">
                <div className="text-3xl sm:text-4xl font-black text-[#2563EB]">
                  <AnimatedCounter target={27} suffix="+" />
                </div>
                <p className="text-xs font-bold text-[#111827]">Corporate Clients</p>
                <p className="text-[11px] text-[#475569]">Equipped with bulk IT fleets</p>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delayMs={120} durationMs={500} className="h-full">
              <div className="p-5 sm:p-6 rounded-2xl bg-[#FFFDF9] border border-[#E6DFD5] shadow-xs space-y-1 hover-elevation h-full">
                <div className="text-3xl sm:text-4xl font-black text-[#2563EB]">
                  <AnimatedCounter target={95} suffix="%" />
                </div>
                <p className="text-xs font-bold text-[#111827]">Satisfaction Rate</p>
                <p className="text-[11px] text-[#475569]">
                  {supportConfig?.returnWindowDays
                    ? `Backed by ${supportConfig.returnWindowDays}-day returns`
                    : 'Return policy support'}
                </p>
              </div>
            </RevealOnScroll>

            <RevealOnScroll delayMs={180} durationMs={500} className="h-full">
              <div className="p-5 sm:p-6 rounded-2xl bg-[#FFFDF9] border border-[#E6DFD5] shadow-xs space-y-1 hover-elevation h-full">
                <div className="text-3xl sm:text-4xl font-black text-[#2563EB]">
                  <AnimatedCounter target={2} suffix="+ Yrs" />
                </div>
                <p className="text-xs font-bold text-[#111827]">Industry Experience</p>
                <p className="text-[11px] text-[#475569]">Dedicated engineer team</p>
              </div>
            </RevealOnScroll>
          </div>

          {/* Bulk Procurement & Enterprise Leasing Banner */}
          <RevealOnScroll delayMs={100} durationMs={600}>
            <div className="mt-8 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#0B1F4B] via-[#0F2A66] to-[#1E40AF] text-white flex flex-col md:flex-row items-center justify-between gap-5 shadow-xl border border-white/10">
              <div>
                <span className="text-[10px] uppercase font-extrabold tracking-widest text-[#38BDF8] bg-white/10 px-2.5 py-1 rounded-md border border-[#38BDF8]/30">
                  B2B &amp; Fleet Solutions
                </span>
                <h3 className="text-xl sm:text-2xl font-black mt-2.5 tracking-tight text-white">
                  Equipping 5+ Laptops for Your Growing Team?
                </h3>
                <p className="text-xs sm:text-sm text-blue-100/90 max-w-xl mt-1.5 leading-relaxed">
                  Unlock tiered wholesale pricing up to 25% OFF, customized OS imaging, GST invoices, and flexible zero-CapEx monthly leasing.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCorporateModalOpen(true)}
                className="px-6 py-3.5 bg-white text-[#0B1F4B] hover:bg-[#FAF6EF] font-extrabold text-xs sm:text-sm rounded-xl transition-all shadow-md shrink-0 cursor-pointer active:scale-95 hover:-translate-y-0.5 hover-scale-subtle"
              >
                Request Corporate Quote →
              </button>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ─── 4.5 THE CERTIFIED BENCH (Quality Process & 32-Point Diagnostics) ─── */}
      <section id="quality-bench" className="scroll-mt-16 bg-[#FAF6EF] border-y border-[#E6DFD5] py-4">
        <CertifiedBench />
      </section>

      {/* ─── 5. ENTERPRISE BRANDS LOGO MARQUEE ─── */}
      <section className="py-8 sm:py-10 bg-[#FAF6EF] border-b border-[#E6DFD5] overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll delayMs={0} durationMs={500}>
            <div className="mb-8 text-center sm:text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Enterprise Brands We Service &amp; Supply
              </span>
            </div>
          </RevealOnScroll>

          {/* Marquee Track with Edge Gradient Mask */}
          <div className="overflow-hidden relative w-full max-w-full brand-mask-edges">
            <div className="flex items-center w-max animate-marquee motion-reduce:animate-none">
              {/* Group 1 (Primary Accessible Group: 18 items >= 100vw on 2560px) */}
              <div className="flex items-center shrink-0">
                {brandRepeats.map((b, idx) => (
                  <div
                    key={`${b.name}-g1-${idx}`}
                    className="flex items-center justify-center shrink-0 pr-14 sm:pr-20 lg:pr-24"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={b.src}
                      alt={b.name}
                      width={b.width}
                      height={b.height}
                      className={`${b.className} object-contain opacity-85 hover:opacity-100 hover:scale-105 transition-all duration-200 select-none motion-reduce:hover:scale-100`}
                    />
                  </div>
                ))}
              </div>

              {/* Group 2 (Duplicate Group for Seamless Loop: aria-hidden) */}
              <div className="flex items-center shrink-0" aria-hidden="true">
                {brandRepeats.map((b, idx) => (
                  <div
                    key={`${b.name}-g2-${idx}`}
                    className="flex items-center justify-center shrink-0 pr-14 sm:pr-20 lg:pr-24"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={b.src}
                      alt=""
                      width={b.width}
                      height={b.height}
                      className={`${b.className} object-contain opacity-85 hover:opacity-100 hover:scale-105 transition-all duration-200 select-none motion-reduce:hover:scale-100`}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 text-center mt-6 pt-4 border-t border-slate-100">
            Brand names and logos are trademarks of their respective owners. LaptopMitra is not affiliated with or endorsed by them.
          </p>
        </div>
      </section>

      {/* ─── 6. TRENDING INVENTORY LIST ─── */}
      <section className="py-12 sm:py-16 lg:py-20 bg-[#F7F4EE]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll delayMs={0} durationMs={500}>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#2563EB] bg-[#EFF6FF] px-2.5 py-0.5 rounded-full border border-[#BFDBFE] inline-block mb-2">
                  Certified Inventory
                </span>
                <h2 className="text-2xl sm:text-3xl font-black text-[#0B1F4B] tracking-tight">
                  Trending Laptops
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Handpicked enterprise, creator, and productivity machines
                </p>
              </div>

              <div className="flex items-center gap-1.5 bg-[#FAF6EF] p-1.5 rounded-full border border-[#E6DFD5] shadow-2xs">
                <button
                  onClick={() => setActiveTab('featured')}
                  className={`h-9 px-5 text-xs font-extrabold rounded-full transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    activeTab === 'featured'
                      ? 'bg-[#2563EB] text-white shadow-sm'
                      : 'text-slate-600 hover:text-[#0B1F4B] hover:bg-[#FFFDF9]'
                  }`}
                >
                  <span>Featured Models</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === 'featured' ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-700'}`}>
                    {featuredList.length || 8}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('new')}
                  className={`h-9 px-5 text-xs font-extrabold rounded-full transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    activeTab === 'new'
                      ? 'bg-[#2563EB] text-white shadow-sm'
                      : 'text-slate-600 hover:text-[#0B1F4B] hover:bg-[#FFFDF9]'
                  }`}
                >
                  <span>New Arrivals</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === 'new' ? 'bg-white/20 text-white' : 'bg-slate-200/80 text-slate-700'}`}>
                    {newList.length || 8}
                  </span>
                </button>
              </div>
            </div>
          </RevealOnScroll>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {[1, 2, 3, 4].map((n) => (
                <ProductCardSkeleton key={n} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 items-stretch">
              {displayedProducts.map((p, idx) => (
                <RevealOnScroll key={p.id} delayMs={(idx % 4) * 60} durationMs={500} className="h-full">
                  <div className="flex flex-col h-full hover-elevation rounded-2xl">
                    <ProductCard product={p} className="h-full" />
                  </div>
                </RevealOnScroll>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── 7. MORE THAN A PURCHASE BANNER ─── */}
      <section className="py-12 sm:py-16 lg:py-20 bg-[#FAF6EF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll delayMs={80} durationMs={600}>
            <div className="relative overflow-hidden rounded-3xl bg-[#0B1F4B] text-white p-6 sm:p-8 lg:p-12 shadow-xl">
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7 space-y-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#38BDF8] block mb-2">
                    LaptopMitra Certified Standard
                  </span>
                  <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                    More than a purchase.<br />
                    A long-term hardware partnership.
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                    {supportConfig
                      ? `Every laptop delivered by LaptopMitra is covered under our ${Math.max(1, Math.round(supportConfig.standardWarrantyDays / 30))}-month comprehensive warranty with doorstep pickup and ${supportConfig.returnWindowDays}-day replacement policy.`
                      : 'Every laptop comes with warranty coverage and access to our return and replacement support.'}
                  </p>
                  <div className="pt-3 flex flex-wrap gap-4">
                    <Link
                      href="/products"
                      className="h-11 px-6 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 hover-scale-subtle flex items-center justify-center gap-1.5"
                    >
                      <span>View All Certified Laptops</span>
                      <span>→</span>
                    </Link>
                    <Link
                      href="/buyback-guarantee"
                      className="h-11 px-6 border border-white/20 bg-white/5 hover:bg-white/10 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 hover-scale-subtle"
                    >
                      <span>Guaranteed Buyback Policy</span>
                    </Link>
                  </div>
                </div>

                <div className="lg:col-span-5 relative">
                  <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-white/10 shadow-lg border border-white/10 group">
                    <Image
                      src="/images/generated/more-than-purchase-banner.jpg"
                      alt="Certified laptop engineering inspection"
                      fill
                      sizes="(max-width: 1024px) 100vw, 450px"
                      className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                    />
                  </div>
                </div>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ─── 8. TESTIMONIALS ─── */}
      <section className="py-12 sm:py-16 lg:py-20 bg-[#F7F4EE] border-t border-[#E6DFD5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll delayMs={0} durationMs={500}>
            <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#2563EB] bg-[#EFF6FF] px-2.5 py-0.5 rounded-full border border-[#BFDBFE] inline-block mb-2">
                Verified Feedback
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#0B1F4B] tracking-tight">
                Trusted by IT Leaders &amp; Creators
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Real stories from growing enterprises, studios, and independent professionals
              </p>
            </div>
          </RevealOnScroll>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, idx) => (
              <RevealOnScroll key={idx} delayMs={idx * 80} durationMs={500} className="h-full">
                <div className="p-6 rounded-2xl bg-[#FFFDF9] border border-[#E6DFD5] shadow-xs hover:shadow-lg hover:border-[#2563EB]/40 hover-elevation transition-all duration-300 space-y-4 flex flex-col justify-between h-full">
                  <div className="space-y-3">
                    <div className="flex items-center gap-1 text-amber-400 text-sm">
                      <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
                    </div>
                    <p className="text-xs text-slate-600 italic leading-relaxed">
                      &ldquo;{t.text}&rdquo;
                    </p>
                  </div>
                  <div className="pt-3.5 border-t border-[#E6DFD5]/60">
                    <h4 className="text-xs font-bold text-[#0B1F4B]">{t.name}</h4>
                    <p className="text-[11px] text-slate-400 font-medium">{t.role}</p>
                    <span className="inline-block mt-1.5 text-[10px] font-bold text-[#2563EB] bg-[#EFF6FF] border border-[#BFDBFE] px-2 py-0.5 rounded-md">
                      Purchased {t.product}
                    </span>
                  </div>
                </div>
              </RevealOnScroll>
            ))}
          </div>

          {/* Final Conversion CTA Strip */}
          <RevealOnScroll delayMs={100} durationMs={600}>
            <div className="mt-14 p-8 sm:p-10 rounded-3xl bg-gradient-to-br from-[#071433] to-[#0B1F4B] text-white text-center shadow-xl border border-white/10 relative overflow-hidden">
              <div className="relative z-10 max-w-2xl mx-auto space-y-3">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/25 text-[#38BDF8] text-[11px] font-extrabold uppercase tracking-widest">
                  <Sparkles className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span>Start Your Equipment Upgrade</span>
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Ready to equip your next machine?
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Join 1,500+ satisfied businesses and professionals who get enterprise-tier performance for half the price with zero compromise.
                </p>
                <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
                  <Link
                    href="/products"
                    className="px-6 py-3.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-blue-900/40 transition-all flex items-center gap-2 active:scale-95 hover:-translate-y-0.5"
                  >
                    <span>Browse All Certified Models</span>
                    <span>→</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setCorporateModalOpen(true)}
                    className="px-6 py-3.5 border border-white/25 bg-white/5 hover:bg-white/10 text-white text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Contact Fleet Specialist
                  </button>
                </div>
              </div>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* Corporate Procurement Modal */}
      <CorporateQuoteModal
        open={corporateModalOpen}
        onClose={() => setCorporateModalOpen(false)}
      />
    </CustomerLayout>
  );
}
