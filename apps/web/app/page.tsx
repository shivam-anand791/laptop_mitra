'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import CustomerLayout from '../components/CustomerLayout';
import ProductCard from '../components/ProductCard';
import AnimatedCounter from '../components/AnimatedCounter';
import { ProductCardSkeleton } from '../components/ui/Skeleton';
import { Product } from '../lib/types';
import { api } from '../lib/api';

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

/* ── OEM Brands (Strictly Lenovo, HP, Dell only) ──
 * Tuned optical sizing:
 * - HP: Circular emblem rendered at 44px height on desktop (36px on mobile) for bold optical prominence.
 * - Dell: Circular emblem rendered at 44px height on desktop (36px on mobile) matching HP optical balance.
 * - Lenovo: Wide rectangular wordmark rendered at 28px height on desktop (22px on mobile) with width 140px (110px mobile) to balance the visual optical mass of the circular emblems without overpowering the strip.
 */
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
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<'featured' | 'new'>('featured');
  const [loading, setLoading] = useState(true);

  // Real countdown timer state
  const [timeLeft, setTimeLeft] = useState<{ hours: number; minutes: number; seconds: number } | null>(null);

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

  const dealProduct = products[0];
  const dealPrice = dealProduct ? Number(dealProduct.price) : 29990;
  const dealCompare = dealProduct?.compareAtPrice ? Number(dealProduct.compareAtPrice) : 68000;
  const dealSavings = dealCompare - dealPrice;
  const dealDiscount = Math.round((dealSavings / dealCompare) * 100);

  // Countdown timer calculation from real dealEndsAt field
  useEffect(() => {
    if (!dealProduct?.dealEndsAt) {
      setTimeLeft(null);
      return;
    }

    const targetTime = new Date(dealProduct.dealEndsAt).getTime();
    if (isNaN(targetTime)) {
      setTimeLeft(null);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const diff = targetTime - now;

      if (diff <= 0) {
        setTimeLeft(null);
        return;
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
      {/* ─── 1. HERO SECTION (Items 6–11 matching Target Image B) ─── */}
      <section className="relative overflow-hidden bg-[#071433] text-white">
        {/* Photographic Scene Background */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/generated/hero-enterprise-laptop.webp"
            alt="Premium unbranded enterprise laptop on office desk overlooking twilight city skyline"
            fill
            priority
            sizes="100vw"
            className="object-cover object-right lg:object-[right_center]"
          />
          {/* Single Precision Multi-Stop Navy Overlay Gradient */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                'linear-gradient(90deg, rgba(7,20,51,0.96) 0%, rgba(7,20,51,0.85) 30%, rgba(7,20,51,0.12) 48%, rgba(7,20,51,0.0) 65%, rgba(7,20,51,0.0) 100%)',
            }}
          />
          {/* Subtle Bottom Gradient behind Trust Strip */}
          <div
            className="absolute inset-x-0 bottom-0 h-36 pointer-events-none"
            style={{
              background: 'linear-gradient(0deg, rgba(7,20,51,0.75) 0%, rgba(7,20,51,0) 100%)',
            }}
          />
        </div>

        {/* Hero Content Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 pt-16 pb-14 lg:pt-20 lg:pb-16 min-h-[460px] lg:min-h-[500px] flex flex-col justify-center">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column (Items 9, 10, 11) */}
            <div className="lg:col-span-8 space-y-5 text-left">
              {/* Eyebrow (Item 9: Sampled Cyan #00A3FF) */}
              <div className="text-xs font-bold tracking-widest text-[#00A3FF] uppercase">
                ENTERPRISE HARDWARE PARTNER
              </div>

              {/* Main Headline (Item 9: Heading Accent #00A3FF) */}
              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-black tracking-tight leading-[1.12] text-white">
                Certified Laptops<br />
                for Your <span className="text-[#00A3FF]">Business.</span>
              </h1>

              {/* Subcopy Paragraph (Item 10: 3-Line Wrap Width) */}
              <p className="text-xs sm:text-sm text-slate-300/90 leading-relaxed font-normal max-w-[460px]">
                Genuine products. Trusted brands. Bulk pricing.<br />
                LaptopMitra helps businesses get the right devices,<br />
                with the right support.
              </p>

              {/* CTA Buttons (Item 11: 6px radius rounded-md, no glow) */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/products"
                  className="px-6 py-2.5 sm:py-3 bg-[#1D6FF2] hover:bg-[#1558C0] text-white text-xs sm:text-sm font-bold rounded-md shadow-none transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <span>Explore Laptops</span>
                  <span>→</span>
                </Link>

                <a
                  href="https://wa.me/919999999999?text=Hi%20LaptopMitra,%20I%20would%20like%20to%20request%20a%20quote%20for%20enterprise%20laptops."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-2.5 sm:py-3 border border-white/30 bg-transparent hover:bg-white/10 text-white text-xs sm:text-sm font-bold rounded-md transition-all active:scale-95"
                >
                  Get a Quote
                </a>
              </div>
            </div>

            {/* Right Column: Rotated Script Tagline (Item 8) */}
            <div className="lg:col-span-4 relative flex justify-end items-start h-full">
              <div className="hidden lg:block absolute top-2 right-4 text-right select-none pointer-events-none -rotate-[9deg] transform origin-top-right">
                <div className="font-[family-name:var(--font-caveat)] text-2xl lg:text-3xl text-white font-semibold leading-tight drop-shadow-md">
                  Powering<br />
                  Businesses<br />
                  Since Day 1
                </div>
                {/* Curved Cyan Swoosh Underline */}
                <svg className="w-28 h-3.5 text-[#00A3FF] ml-auto mt-0.5" viewBox="0 0 110 14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M4 7 Q 55 13 106 4" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* ─── 4-COLUMN TRUST DOCK (Docked Inside Hero Bottom matching Image B) ─── */}
        <div className="relative z-10 border-t border-white/10 bg-[#071433]/40 backdrop-blur-[2px]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 divide-y md:divide-y-0 md:divide-x divide-white/10">
              {/* Feature 1: 100% Genuine Products */}
              <div className="flex items-center gap-3.5 pt-2 md:pt-0">
                <div className="text-[#38BDF8] shrink-0">
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
              <div className="flex items-center gap-3.5 pt-2 md:pt-0 md:pl-6">
                <div className="text-[#38BDF8] shrink-0">
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
              <div className="flex items-center gap-3.5 pt-2 md:pt-0 md:pl-6">
                <div className="text-[#38BDF8] shrink-0">
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
              <div className="flex items-center gap-3.5 pt-2 md:pt-0 md:pl-6">
                <div className="text-[#38BDF8] shrink-0">
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

      {/* ─── 2. SHOP BY CATEGORY (5 Verified Cards) ─── */}
      <section id="categories" className="py-12 sm:py-16 lg:py-20 bg-[#F8FAFC] scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 lg:mb-8 gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#1D6FF2] block mb-2">
                Certified Catalog
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#0B1F4B] tracking-tight">
                Shop by Purpose &amp; Category
              </h2>
            </div>
            <Link
              href="/products"
              className="text-xs font-bold text-[#1D6FF2] hover:text-[#1558C0] flex items-center gap-1 group"
            >
              <span>Explore All Models</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/products?category=${cat.slug}`}
                className="group relative rounded-2xl overflow-hidden bg-white border border-[#E4E9F2] hover:border-[#1D6FF2] shadow-sm hover:shadow-md transition-all p-3.5 sm:p-4 flex flex-col justify-between"
              >
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-[#F1F5F9] mb-3">
                  <Image
                    src={cat.image}
                    alt={cat.title}
                    fill
                    sizes="(max-width: 768px) 50vw, 20vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-[#0B1F4B]/80 backdrop-blur-xs text-[10px] font-bold text-white">
                    {cat.tagline}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-black text-[#0B1F4B] group-hover:text-[#1D6FF2] transition-colors leading-tight">
                    {cat.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-1">
                    {cat.desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 3. DEAL OF THE DAY (Image 2 Elevated + Real Countdown) ─── */}
      <section className="py-12 sm:py-16 lg:py-20 bg-white border-y border-[#E4E9F2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0B1F4B] via-[#0F296B] to-[#1D6FF2] text-white p-6 sm:p-8 lg:p-12 shadow-xl">
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Left text & countdown */}
              <div className="lg:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-400/40 text-rose-300 text-xs font-bold uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                  <span>🔥 Deal of the Day</span>
                </div>

                <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                  ThinkPad Executive Ultrabook
                </h2>

                <p className="text-xs sm:text-sm text-blue-100/90 max-w-lg leading-relaxed">
                  Enterprise-grade durability with 32-point inspection certification. Save up to ₹38,000 on tested business inventory today.
                </p>

                {/* Flip-style countdown timer */}
                {timeLeft ? (
                  <div className="flex items-center gap-3 pt-2">
                    <span className="text-xs text-blue-200 font-semibold uppercase tracking-wider">Ends In:</span>
                    <div className="flex items-center gap-1.5 font-mono">
                      <div className="px-3 py-2 rounded-xl bg-black/40 border border-white/20 text-center min-w-[48px]">
                        <span className="text-lg font-black text-white tabular-nums block">
                          {String(timeLeft.hours).padStart(2, '0')}
                        </span>
                        <span className="text-[9px] text-slate-300 uppercase">HRS</span>
                      </div>
                      <span className="text-lg font-bold text-white/60">:</span>
                      <div className="px-3 py-2 rounded-xl bg-black/40 border border-white/20 text-center min-w-[48px]">
                        <span className="text-lg font-black text-white tabular-nums block">
                          {String(timeLeft.minutes).padStart(2, '0')}
                        </span>
                        <span className="text-[9px] text-slate-300 uppercase">MINS</span>
                      </div>
                      <span className="text-lg font-bold text-white/60">:</span>
                      <div className="px-3 py-2 rounded-xl bg-black/40 border border-white/20 text-center min-w-[48px]">
                        <span className="text-lg font-black text-white tabular-nums block">
                          {String(timeLeft.seconds).padStart(2, '0')}
                        </span>
                        <span className="text-[9px] text-slate-300 uppercase">SECS</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="pt-1">
                    <span className="px-3 py-1.5 rounded-lg bg-white/10 text-xs font-bold text-blue-200 border border-white/20 inline-block">
                      ⚡ Daily Special Price While Stock Lasts
                    </span>
                  </div>
                )}

                <div className="flex flex-wrap items-baseline gap-3 sm:gap-4 pt-2">
                  <span className="text-3xl sm:text-4xl font-black text-white tabular-nums">
                    ₹{dealPrice.toLocaleString('en-IN')}
                  </span>
                  <span className="text-base sm:text-lg line-through text-blue-200/60 font-medium tabular-nums">
                    ₹{dealCompare.toLocaleString('en-IN')}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-[#EF4444] text-white text-xs font-black">
                    Save {dealDiscount}%
                  </span>
                </div>

                <div className="pt-3 flex flex-wrap items-center gap-3">
                  <Link
                    href={`/products/${dealProduct?.id || 'prod-thinkpad-t480'}`}
                    className="h-11 px-6 bg-white hover:bg-slate-100 text-[#0B1F4B] font-black text-xs sm:text-sm rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center"
                  >
                    Claim Flash Deal →
                  </Link>
                  <a
                    href="https://wa.me/919999999999?text=Hi%20LaptopMitra,%20I%20want%20to%20order%20the%20Deal%20of%20the%20Day%20laptop."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-11 px-5 bg-[#25D366] hover:bg-[#20BD5A] text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95"
                  >
                    <span>WhatsApp</span>
                  </a>
                </div>
              </div>

              {/* Right Hero Image Card */}
              <div className="lg:col-span-5 relative">
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-white/10 p-4 backdrop-blur-xs">
                  <Image
                    src="/images/generated/cat-business.jpg"
                    alt="ThinkPad Daily Deal Laptop"
                    fill
                    sizes="(max-width: 1024px) 100vw, 450px"
                    className="object-contain p-2 sm:p-4"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4. CANONICAL STATS STRIP (Image 3 Elevated) ─── */}
      <section className="py-12 sm:py-16 lg:py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-center">
            <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E4E9F2] shadow-sm space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-[#1D6FF2]">
                <AnimatedCounter target={1500} suffix="+" />
              </div>
              <p className="text-xs font-bold text-slate-700">Devices Sold &amp; Certified</p>
              <p className="text-[11px] text-slate-400">Inspected across 32 checkpoints</p>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E4E9F2] shadow-sm space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-[#1D6FF2]">
                <AnimatedCounter target={27} suffix="+" />
              </div>
              <p className="text-xs font-bold text-slate-700">Corporate Clients</p>
              <p className="text-[11px] text-slate-400">Equipped with bulk IT fleets</p>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E4E9F2] shadow-sm space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-[#1D6FF2]">
                <AnimatedCounter target={95} suffix="%" />
              </div>
              <p className="text-xs font-bold text-slate-700">Satisfaction Rate</p>
              <p className="text-[11px] text-slate-400">Backed by 7-day returns</p>
            </div>

            <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E4E9F2] shadow-sm space-y-1">
              <div className="text-3xl sm:text-4xl font-black text-[#1D6FF2]">
                <AnimatedCounter target={2} suffix="+ Yrs" />
              </div>
              <p className="text-xs font-bold text-slate-700">Industry Experience</p>
              <p className="text-[11px] text-slate-400">Dedicated engineer team</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 5. ENTERPRISE BRANDS LOGO MARQUEE (HP, Dell, Lenovo) ─── */}
      <section className="py-8 sm:py-10 bg-white border-y border-[#E4E9F2] overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header (32px margin bottom) */}
          <div className="mb-8 text-center sm:text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Enterprise Brands We Service &amp; Supply
            </span>
          </div>

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

          {/* Trademark Disclaimer (24px space from logo row) */}
          <p className="text-[11px] text-slate-400 text-center mt-6 pt-4 border-t border-slate-100">
            Brand names and logos are trademarks of their respective owners. LaptopMitra is not affiliated with or endorsed by them.
          </p>
        </div>
      </section>

      {/* ─── 6. TRENDING INVENTORY LIST ─── */}
      <section className="py-12 sm:py-16 lg:py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 lg:mb-8 gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#1D6FF2] block mb-2">
                Quality Verified Laptops
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#0B1F4B] tracking-tight">
                Trending Inventory
              </h2>
            </div>

            <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-[#E4E9F2]">
              <button
                onClick={() => setActiveTab('featured')}
                className={`h-9 px-4 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center ${activeTab === 'featured' ? 'bg-[#1D6FF2] text-white' : 'text-slate-600 hover:text-[#0B1F4B]'
                  }`}
              >
                Featured Models
              </button>
              <button
                onClick={() => setActiveTab('new')}
                className={`h-9 px-4 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center ${activeTab === 'new' ? 'bg-[#1D6FF2] text-white' : 'text-slate-600 hover:text-[#0B1F4B]'
                  }`}
              >
                New Arrivals
              </button>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {[1, 2, 3, 4].map((n) => (
                <ProductCardSkeleton key={n} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {displayedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ─── 7. MORE THAN A PURCHASE BANNER ─── */}
      <section className="py-12 sm:py-16 lg:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                  Every laptop delivered by LaptopMitra is covered under our 1-Year Comprehensive Warranty with doorstep pickup and 7-day replacement guarantee.
                </p>
                <div className="pt-3 flex flex-wrap gap-4">
                  <Link
                    href="/products"
                    className="h-11 px-6 bg-[#1D6FF2] hover:bg-[#1558C0] text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center"
                  >
                    View All Certified Laptops
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-5 relative">
                <div className="relative aspect-[16/10] rounded-2xl overflow-hidden bg-white/10">
                  <Image
                    src="/images/generated/more-than-purchase-banner.jpg"
                    alt="Certified laptop engineering inspection"
                    fill
                    sizes="(max-width: 1024px) 100vw, 450px"
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 8. TESTIMONIALS ─── */}
      <section className="py-12 sm:py-16 lg:py-20 bg-[#F8FAFC] border-t border-[#E4E9F2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-6 lg:mb-8 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1D6FF2] block mb-2">
              Verified Feedback
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#0B1F4B] tracking-tight">
              Trusted by IT Leaders &amp; Creators
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {testimonials.map((t, idx) => (
              <div key={idx} className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E4E9F2] shadow-sm space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="text-amber-400 text-sm">★★★★★</div>
                  <p className="text-xs text-slate-600 italic leading-relaxed">
                    &ldquo;{t.text}&rdquo;
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-[#0B1F4B]">{t.name}</h4>
                  <p className="text-[11px] text-slate-400">{t.role}</p>
                  <span className="inline-block mt-1 text-[10px] font-bold text-[#1D6FF2] bg-blue-50 px-2 py-0.5 rounded">
                    Purchased {t.product}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </CustomerLayout>
  );
}
