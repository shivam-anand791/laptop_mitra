'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import CustomerLayout from '../components/CustomerLayout';
import ProductCard from '../components/ProductCard';
import AnimatedCounter from '../components/AnimatedCounter';
import { ProductCardSkeleton } from '../components/ui/Skeleton';
import { Product } from '../lib/types';
import { api } from '../lib/api';

/* ── Category Data ── */
const categories = [
  {
    title: 'Business Laptops',
    slug: 'cat-business',
    desc: 'ThinkPad, Latitude & EliteBook',
    badge: 'Military-Grade Durability',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    title: 'Apple MacBooks',
    slug: 'cat-apple',
    desc: 'M1, M2 & Pro Silicon Chips',
    badge: '18h+ Battery Life',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: 'Gaming Rigs & RTX',
    slug: 'cat-gaming',
    desc: 'NVIDIA RTX & 144Hz Displays',
    badge: 'High Performance',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'Slim Ultrabooks',
    slug: 'cat-ultrabook',
    desc: 'Dell XPS, Yoga & ZenBooks',
    badge: 'Under 1.3kg Lightweight',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
  },
  {
    title: 'Deals Under ₹25k',
    slug: 'cat-student',
    desc: 'Top Value for Students & Coding',
    badge: 'Budget Friendly',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <path d="M12 14l9-5-9-5-9 5 9 5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
      </svg>
    ),
  },
];

/* ── Quality checklist items ── */
const qualityChecks = [
  {
    num: 1,
    title: 'Battery & Power Health > 90%',
    desc: 'We reject any laptop with degraded cells. Every battery undergoes voltage regulator, load cycle, and drain testing to ensure 5 to 12 hours of real productivity backup.',
    badge: 'Verified Health',
    color: '#1D6FF2',
    bg: '#EBF2FF',
  },
  {
    num: 2,
    title: 'Pristine Display & Hardware Diagnostics',
    desc: 'Sub-pixel optical inspection guarantees zero dead spots, zero white bleeding, and crisp hinges. Webcams, TrackPoints, keyboards, and speaker chambers are 100% functional.',
    badge: 'Zero Defects',
    color: '#16A34A',
    bg: '#DCFCE7',
  },
  {
    num: 3,
    title: 'Thermal Repasting & Genuine OS License',
    desc: 'Fans are ultrasonic cleaned and factory thermal paste is reapplied with premium compound for silent cooling. Shipped with authenticated Windows / macOS licenses.',
    badge: 'Thermal Repasted',
    color: '#9333EA',
    bg: '#FAF5FF',
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
    text: 'Equipped our engineering interns through LaptopMitra’s bulk program. Saved 60% on our IT hardware budget with prompt doorstep warranty support.',
    rating: 5,
  },
];

/* ── Real OEM Brands ── */
const brandLogos = ['Lenovo ThinkPad', 'Dell Latitude', 'HP EliteBook', 'Apple MacBook'];

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<'featured' | 'new'>('featured');
  const [loading, setLoading] = useState(true);

  // Countdown timer for Deal of the Day
  const [timeLeft, setTimeLeft] = useState({ hours: 7, minutes: 24, seconds: 45 });

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

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: 59, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return { hours: 12, minutes: 0, seconds: 0 };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const featuredList = products.filter((p) => p.isFeatured);
  const newList = products.filter((p) => p.isNewArrival);
  const displayedProducts =
    activeTab === 'featured'
      ? (featuredList.length > 0 ? featuredList : products.slice(0, 6))
      : (newList.length > 0 ? newList : products.slice(0, 6));

  const dealProduct = products[0];
  const dealPrice = dealProduct ? Number(dealProduct.price) : 29990;
  const dealCompare = dealProduct?.compareAtPrice ? Number(dealProduct.compareAtPrice) : 68000;
  const dealSavings = dealCompare - dealPrice;
  const dealDiscount = Math.round((dealSavings / dealCompare) * 100);

  return (
    <CustomerLayout>
      {/* ─── HERO SECTION ─── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#EBF2FF]/60 via-[#F5F7FA] to-[#F5F7FA] pt-8 pb-16 lg:pt-14 lg:pb-24 border-b border-[#E4E9F2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* Left Column Copy */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              {/* Trust Tag */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EBF2FF] border border-blue-200 text-[#1D6FF2] text-xs font-bold tracking-wide shadow-sm">
                <span className="w-2 h-2 rounded-full bg-[#1D6FF2] animate-pulse" />
                <span>India&apos;s #1 Certified Pre-Owned Laptop Marketplace</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-3xl sm:text-5xl lg:text-5.5xl font-black tracking-tight leading-[1.15] text-[#0B1F4B]">
                Enterprise Laptops.<br />
                <span className="text-[#1D6FF2]">Like-New</span> Condition.<br />
                Up to 65% Off Retail.
              </h1>

              {/* Subtitle */}
              <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                32-point rigorously inspected corporate lease-returns. Backed by a full{' '}
                <strong className="text-[#0B1F4B] font-bold">1-Year Comprehensive Warranty</strong>,{' '}
                <strong className="text-[#0B1F4B] font-bold">7-Day Replacement Guarantee</strong>,
                and free express nationwide delivery.
              </p>

              {/* Benefit Pills */}
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 pt-1 text-xs font-semibold text-slate-700">
                <span className="px-3 py-1 rounded-lg bg-white border border-[#E4E9F2] shadow-sm flex items-center gap-1.5">
                  <span className="text-emerald-600 font-bold">✓</span> 1-Year Doorstep Warranty
                </span>
                <span className="px-3 py-1 rounded-lg bg-white border border-[#E4E9F2] shadow-sm flex items-center gap-1.5">
                  <span className="text-[#1D6FF2] font-bold">✓</span> 32-Point Inspected
                </span>
                <span className="px-3 py-1 rounded-lg bg-white border border-[#E4E9F2] shadow-sm flex items-center gap-1.5">
                  <span className="text-purple-600 font-bold">✓</span> 7-Day Replacement
                </span>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-3">
                <Link
                  href="/products"
                  className="w-full sm:w-auto px-7 py-3.5 bg-[#1D6FF2] hover:bg-[#1558C0] text-white font-bold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:-translate-y-0.5 transition-all text-center flex items-center justify-center gap-2"
                >
                  <span>Explore All Laptops</span>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>
                <Link
                  href="/products?category=cat-apple"
                  className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-50 border border-[#E4E9F2] text-[#0B1F4B] font-bold rounded-xl shadow-sm hover:shadow transition-all text-center flex items-center justify-center gap-2"
                >
                  🍏 Apple MacBooks
                </Link>
                <Link
                  href="/products?type=lease"
                  className="w-full sm:w-auto px-5 py-3.5 text-[#1D6FF2] hover:text-[#1558C0] font-semibold text-sm text-center"
                >
                  Corporate Leasing &rarr;
                </Link>
              </div>

              {/* Trust Counter Strip */}
              <div className="pt-6 border-t border-[#E4E9F2] grid grid-cols-3 gap-4 max-w-md mx-auto lg:mx-0">
                <div className="text-center lg:text-left">
                  <div className="text-2xl sm:text-3xl font-black text-[#0B1F4B]">
                    <AnimatedCounter target={50} suffix="K+" />
                  </div>
                  <div className="text-xs text-slate-500 font-medium">Laptops Delivered</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-2xl sm:text-3xl font-black text-[#1D6FF2]">
                    32-Pt
                  </div>
                  <div className="text-xs text-slate-500 font-medium">Inspected Grade A+</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-2xl sm:text-3xl font-black text-emerald-600">
                    1 Year
                  </div>
                  <div className="text-xs text-slate-500 font-medium">Warranty Support</div>
                </div>
              </div>
            </div>

            {/* Right Column: Deal of the Day Showcase */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none rounded-3xl bg-white border border-[#E4E9F2] p-5 shadow-xl shadow-blue-900/5">
                {/* Header Strip with Live Countdown */}
                <div className="flex items-center justify-between pb-3.5 border-b border-[#E4E9F2]">
                  <div className="flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs font-black tracking-wider uppercase flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
                      Deal of the Day
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                    <span className="text-slate-400 text-[10px]">ENDS:</span>
                    <span>{String(timeLeft.hours).padStart(2, '0')}h</span>
                    <span>:</span>
                    <span>{String(timeLeft.minutes).padStart(2, '0')}m</span>
                    <span>:</span>
                    <span className="text-[#1D6FF2]">{String(timeLeft.seconds).padStart(2, '0')}s</span>
                  </div>
                </div>

                {/* Laptop Photograph */}
                <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 my-4 border border-slate-200/80">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={dealProduct?.images?.[0]?.url || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80'}
                    alt="Featured Deal Laptop"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 flex gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-[#0B1F4B] text-white text-[10px] font-extrabold uppercase">
                      REFURB
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-extrabold">
                      {dealDiscount}% OFF
                    </span>
                  </div>
                  <div className="absolute bottom-3 left-3">
                    <span className="px-2.5 py-1 rounded-md bg-white/95 text-[#0B1F4B] text-[11px] font-bold shadow-md border border-slate-200 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Ready for Dispatch • {dealProduct?.stock || 4} available
                    </span>
                  </div>
                </div>

                {/* Deal Details */}
                <div className="space-y-3">
                  <div>
                    <h3 className="text-base font-black text-[#0B1F4B] line-clamp-1">
                      {dealProduct?.name || 'Dell Latitude 7490 Core i7 16GB 512GB SSD'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Grade A+ Pristine • 1-Year Comprehensive Warranty • Doorstep Delivery
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-[#F8FAFC] border border-[#E4E9F2]">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-[#0B1F4B] font-sans">
                          ₹{dealPrice.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs line-through text-slate-400 font-medium">
                          ₹{dealCompare.toLocaleString('en-IN')} MRP
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-emerald-700">
                        You save ₹{dealSavings.toLocaleString('en-IN')} instantly
                      </span>
                    </div>

                    <Link
                      href={dealProduct ? `/products/${dealProduct.id}` : '/products'}
                      className="px-5 py-2.5 bg-[#1D6FF2] hover:bg-[#1558C0] text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/25 transition-all"
                    >
                      Claim Offer &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CATEGORY TILES ─── */}
      <section className="py-14 bg-white border-b border-[#E4E9F2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <span className="text-xs font-bold text-[#1D6FF2] uppercase tracking-widest block mb-1">
                Curated Hardware Collections
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#0B1F4B] tracking-tight">
                Shop Laptops by Category
              </h2>
            </div>
            <Link
              href="/products"
              className="text-xs font-bold text-[#1D6FF2] hover:text-[#1558C0] inline-flex items-center gap-1.5"
            >
              <span>Explore All Catalog</span>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/products?category=${cat.slug}`}
                className="group p-5 rounded-2xl bg-[#F8FAFC] border border-[#E4E9F2] hover:border-[#1D6FF2]/50 hover:bg-white hover:shadow-xl hover:shadow-blue-900/5 hover:-translate-y-1 transition-all text-center flex flex-col items-center justify-between"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#1D6FF2] flex items-center justify-center mb-3 group-hover:scale-110 transition-transform shadow-sm">
                  {cat.icon}
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100/60 text-[#1D6FF2] mb-2">
                  {cat.badge}
                </span>
                <h3 className="font-bold text-sm text-[#0B1F4B] group-hover:text-[#1D6FF2] transition-colors line-clamp-1">
                  {cat.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-1">{cat.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURED DEALS & NEW ARRIVALS GRID ─── */}
      <section className="py-16 bg-[#F5F7FA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <span className="text-xs font-bold text-[#1D6FF2] uppercase tracking-widest block mb-1">
                Verified Inventory
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#0B1F4B] tracking-tight">
                Top Refurbished Laptops
              </h2>
            </div>

            {/* Tab Toggle */}
            <div className="inline-flex p-1 rounded-xl bg-white border border-[#E4E9F2] text-xs font-bold shadow-sm">
              <button
                onClick={() => setActiveTab('featured')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  activeTab === 'featured'
                    ? 'bg-[#1D6FF2] text-white shadow-sm'
                    : 'text-slate-600 hover:text-[#0B1F4B]'
                }`}
              >
                ⭐ Best Sellers
              </button>
              <button
                onClick={() => setActiveTab('new')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  activeTab === 'new'
                    ? 'bg-[#1D6FF2] text-white shadow-sm'
                    : 'text-slate-600 hover:text-[#0B1F4B]'
                }`}
              >
                ⚡ New Arrivals
              </button>
            </div>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <ProductCardSkeleton key={n} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          <div className="mt-12 text-center">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-[#0B1F4B] text-sm font-bold border border-[#E4E9F2] shadow-sm hover:shadow transition-all hover:scale-[1.01]"
            >
              <span>View All 50+ Certified Laptops</span>
              <svg className="w-4 h-4 text-[#1D6FF2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── 32-POINT QUALITY PROMISE ─── */}
      <section className="py-16 bg-white border-y border-[#E4E9F2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold text-[#1D6FF2] uppercase tracking-widest block mb-1">
              LaptopMitra Quality Standard
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-[#0B1F4B] tracking-tight">
              Why Our Certified Laptops Feel Brand New
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-2">
              Unlike unverified local second-hand markets, every LaptopMitra unit undergoes military-grade hardware diagnostic testing by senior engineers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {qualityChecks.map((check) => (
              <div
                key={check.num}
                className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#E4E9F2] hover:border-[#1D6FF2]/40 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black"
                      style={{ background: check.bg, color: check.color }}
                    >
                      {check.num}
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: check.bg, color: check.color }}>
                      {check.badge}
                    </span>
                  </div>
                  <h3 className="font-bold text-base text-[#0B1F4B] mb-2">
                    {check.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {check.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FLEXIBLE LEASING & EXCHANGE SECTIONS ─── */}
      <section className="py-16 bg-[#F5F7FA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Flexible Leasing Box */}
          <div className="p-8 rounded-3xl bg-white border border-[#E4E9F2] shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-[#1D6FF2] border border-blue-200">
                🏢 Enterprise &amp; Remote Teams
              </span>
              <h3 className="text-2xl font-black text-[#0B1F4B] tracking-tight">
                Flexible Laptop Leasing Program
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Empower your growing team without large upfront capital expenditure. Enjoy 100% tax-deductible monthly rentals, free maintenance swaps, and upgrade options every 12 months.
              </p>
              <ul className="space-y-1.5 text-xs text-slate-700 pt-2 font-medium">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span> Zero security deposit for verified businesses
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span> 48-hour hardware replacement guarantee
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span> Custom RAM &amp; SSD configurations per employee role
                </li>
              </ul>
            </div>
            <div>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0B1F4B] hover:bg-[#071433] text-white text-xs font-bold transition-all shadow-md"
              >
                <span>Request Leasing Quote</span>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Sell / Exchange Box */}
          <div className="p-8 rounded-3xl bg-white border border-[#E4E9F2] shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                🔄 Instant Trade-In
              </span>
              <h3 className="text-2xl font-black text-[#0B1F4B] tracking-tight">
                Sell or Exchange for Instant Cash
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Upgrade your old laptop or liquidate excess company hardware at the highest market valuation with free doorstep pickup and instant UPI bank transfer.
              </p>
              <ul className="space-y-1.5 text-xs text-slate-700 pt-2 font-medium">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span> Instant algorithmic price estimate in 60 seconds
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span> Free doorstep device pickup across 100+ cities
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span> Secure DoD 5220.22-M military-grade data wipe certificate
                </li>
              </ul>
            </div>
            <div>
              <Link
                href="/profile#referral"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20"
              >
                <span>Check Buyback Value</span>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─── VERIFIED TESTIMONIALS ─── */}
      <section className="py-16 bg-white border-b border-[#E4E9F2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold text-[#1D6FF2] uppercase tracking-widest block mb-1">
              Customer Experiences
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#0B1F4B] tracking-tight">
              Trusted by 50,000+ Professionals &amp; Teams
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-[#F8FAFC] border border-[#E4E9F2] shadow-sm flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-1 text-amber-400 text-sm">
                    {'★'.repeat(t.rating)}
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed italic">
                    &ldquo;{t.text}&rdquo;
                  </p>
                </div>
                <div className="pt-3 border-t border-[#E4E9F2]">
                  <h4 className="text-xs font-bold text-[#0B1F4B]">{t.name}</h4>
                  <p className="text-[11px] text-slate-500">{t.role}</p>
                  <span className="inline-block text-[10px] text-[#1D6FF2] font-semibold mt-1">
                    Verified Purchase: {t.product}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── BRAND LOGO STRIP ─── */}
      <section className="py-10 bg-[#F5F7FA] border-b border-[#E4E9F2]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-[11px] text-slate-500 uppercase tracking-widest font-bold mb-6">
            Certified Pre-Owned Units From Leading Global OEMs
          </p>
          <div className="flex items-center justify-center gap-4 sm:gap-8 flex-wrap">
            {brandLogos.map((brand) => (
              <span
                key={brand}
                className="px-4 py-2 rounded-xl bg-white border border-[#E4E9F2] text-xs font-bold text-slate-700 shadow-sm"
              >
                {brand}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── MITRA AFFILIATE BANNER ─── */}
      <section className="py-14 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-r from-[#0B1F4B] to-[#132E6B] p-8 sm:p-12 text-white shadow-xl relative overflow-hidden">
            <div className="max-w-2xl space-y-4">
              <span className="px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-extrabold uppercase tracking-wider">
                Mitra Partner Program
              </span>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
                Earn 10% Cash Payout on Every Referral
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Recommend LaptopMitra to friends or coworkers. They receive an instant{' '}
                <strong className="text-amber-300 font-bold">₹500 discount</strong> on checkout using your Mitra code, and you get{' '}
                <strong className="text-white font-bold">10% direct cash commission</strong> straight to your bank account.
              </p>
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/register"
                  className="px-6 py-3 bg-[#1D6FF2] hover:bg-[#1558C0] text-white font-bold rounded-xl shadow-lg transition-all text-center text-xs"
                >
                  Join Mitra Partner Free
                </Link>
                <Link
                  href="/profile#referral"
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold rounded-xl transition-colors text-center text-xs"
                >
                  View My Partner Code
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </CustomerLayout>
  );
}

