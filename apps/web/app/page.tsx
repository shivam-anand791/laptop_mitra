'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import CustomerLayout from '../components/CustomerLayout';
import ProductCard from '../components/ProductCard';
import { Product } from '../lib/types';
import { api } from '../lib/api';

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<'featured' | 'new'>('featured');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await api.getProducts({ limit: 8 });
        setFeaturedProducts(res.products);
      } catch {
        // Handled by api fallback
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  const displayedProducts = activeTab === 'featured'
    ? featuredProducts.filter(p => p.isFeatured)
    : featuredProducts.filter(p => p.isNewArrival);

  return (
    <CustomerLayout>
      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-950 via-zinc-950 to-zinc-950 text-white pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-zinc-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(37,99,235,0.18),transparent_50%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold tracking-wide">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
                India&apos;s Most Trusted Refurbished Laptop Marketplace
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.15]">
                Premium Laptops.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-sky-300">
                  Like-New Quality.
                </span><br />
                Up to 65% Off Retail.
              </h1>

              <p className="text-base sm:text-lg text-zinc-300 max-w-2xl mx-auto lg:mx-0 font-normal leading-relaxed">
                32-point rigorously inspected corporate lease-returns. Backed by a full <strong className="text-white">1-Year Warranty</strong>, <strong className="text-white">7-Day Hassle-Free Replacement</strong>, and free express nationwide delivery.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  href="/products"
                  className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all hover:scale-105 active:scale-95 text-center flex items-center justify-center gap-2"
                >
                  <span>Explore Laptops</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <Link
                  href="/products?category=cat-apple"
                  className="w-full sm:w-auto px-6 py-4 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-700 text-white font-semibold rounded-xl transition-all text-center flex items-center justify-center gap-2"
                >
                  <span>🍏 Apple MacBooks</span>
                </Link>
              </div>

              {/* Trust metrics bar */}
              <div className="pt-6 border-t border-zinc-800/80 grid grid-cols-3 gap-4 max-w-md mx-auto lg:mx-0">
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-white">50K+</div>
                  <div className="text-xs text-zinc-400">Laptops Sold</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-emerald-400">4.9★</div>
                  <div className="text-xs text-zinc-400">Verified Reviews</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-black text-blue-400">1 Year</div>
                  <div className="text-xs text-zinc-400">Doorstep Warranty</div>
                </div>
              </div>
            </div>

            {/* Right Card / Visual */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none rounded-3xl p-1 bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-500 shadow-2xl shadow-blue-500/20">
                <div className="rounded-[22px] bg-zinc-900 p-6 overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                      DEAL OF THE DAY
                    </span>
                    <span className="text-xs text-zinc-400 font-mono">STOCK: 8 UNITS LEFT</span>
                  </div>

                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1000&q=80"
                    alt="MacBook Pro Special Deal"
                    className="w-full h-52 object-cover rounded-xl mb-4"
                  />

                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white">
                      Apple MacBook Pro 16&quot; (M2 Pro, 16GB, 512GB)
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Grade A+ Pristine • 100% Battery Health • Liquid Retina XDR 120Hz
                    </p>

                    <div className="flex items-baseline justify-between pt-3">
                      <div>
                        <div className="text-2xl font-black text-white">₹1,54,999</div>
                        <div className="text-xs line-through text-zinc-500">₹2,49,900 Retail MRP</div>
                      </div>
                      <Link
                        href="/products/prod-macbook-pro-16"
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors"
                      >
                        Claim Offer →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES SECTION */}
      <section className="py-16 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
            <div>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Curated Collections
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white mt-1">
                Shop Laptops by Category
              </h2>
            </div>
            <Link
              href="/products"
              className="mt-4 md:mt-0 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
            >
              Browse all categories →
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { title: 'Business Laptops', slug: 'cat-business', icon: '💼', desc: 'ThinkPad & Latitude', badge: 'Durability' },
              { title: 'Apple MacBooks', slug: 'cat-apple', icon: '🍏', desc: 'M1, M2 & Pro chips', badge: 'All-Day Battery' },
              { title: 'Gaming & High-Perf', slug: 'cat-gaming', icon: '🎮', desc: 'RTX GPUs & 120Hz', badge: 'Powerhouse' },
              { title: 'Slim Ultrabooks', slug: 'cat-ultrabook', icon: '✨', desc: 'Dell XPS & ZenBooks', badge: 'Lightweight' },
              { title: 'Student Budget', slug: 'cat-student', icon: '🎓', desc: 'Starting under ₹35,000', badge: 'Top Value' },
            ].map((cat, idx) => (
              <Link
                key={idx}
                href={`/products?category=${cat.slug}`}
                className="group p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700/60 hover:border-blue-500 hover:shadow-lg transition-all text-center flex flex-col items-center"
              >
                <span className="text-3xl mb-3 group-hover:scale-110 transition-transform">{cat.icon}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 mb-2">
                  {cat.badge}
                </span>
                <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 transition-colors">
                  {cat.title}
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{cat.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED / NEW ARRIVALS TABS */}
      <section className="py-16 bg-zinc-50 dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Tested &amp; Ready to Ship
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white mt-1">
                Handpicked Deals
              </h2>
            </div>

            {/* Filter Tabs */}
            <div className="inline-flex p-1 rounded-xl bg-zinc-200 dark:bg-zinc-800 text-xs font-bold self-start">
              <button
                onClick={() => setActiveTab('featured')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  activeTab === 'featured'
                    ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
              >
                ⭐ Best Sellers
              </button>
              <button
                onClick={() => setActiveTab('new')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  activeTab === 'new'
                    ? 'bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
                }`}
              >
                🔥 New Arrivals
              </button>
            </div>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(n => (
                <div key={n} className="h-96 rounded-2xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {(displayedProducts.length > 0 ? displayedProducts : featuredProducts).map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}

          <div className="mt-12 text-center">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 text-sm font-bold shadow-md transition-all hover:scale-105"
            >
              <span>View All 50+ Verified Laptops</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* 32-POINT CHECKLIST QUALITY SPOTLIGHT */}
      <section className="py-16 bg-white dark:bg-zinc-900 border-t border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
              LaptopMitra Quality Standard
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-zinc-900 dark:text-white mt-2">
              Why Our Certified Laptops Feel Brand New
            </h2>
            <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 mt-3">
              Unlike local second-hand markets, every LaptopMitra unit undergoes military-grade testing by certified engineers before shipping.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
              <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-2xl mb-4 font-black">
                1
              </div>
              <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 mb-2">
                Battery &amp; Power Health &gt; 90%
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                We reject any laptop with depleted battery cells. We verify charging circuits, voltage regulators, and endurance cycles to ensure 6 to 14 hours of real battery backup.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl mb-4 font-black">
                2
              </div>
              <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 mb-2">
                Pristine Screen &amp; Hardware Diagnostics
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                RGB sub-pixel inspection ensures zero dead spots, zero white patches, and zero hinge wobble. Keyboard, TrackPoint, webcam, and speakers are 100% verified.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
              <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center text-2xl mb-4 font-black">
                3
              </div>
              <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 mb-2">
                Thermal Repasting &amp; Deep Sanitization
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Fans are ultrasonic cleaned and factory thermal paste is reapplied with Arctic MX-4 compound for maximum heat dissipation, silent performance, and longevity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* MITRA REFERRAL / AFFILIATE PROMO */}
      <section className="py-16 bg-gradient-to-r from-blue-900 via-indigo-900 to-zinc-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-blue-600/20 border border-blue-400/30 p-8 sm:p-12 relative overflow-hidden backdrop-blur-md">
            <div className="max-w-2xl space-y-4">
              <span className="px-3 py-1 rounded-full bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 text-xs font-bold uppercase tracking-wider">
                Mitra Partner Program
              </span>
              <h2 className="text-3xl sm:text-4xl font-black">
                Earn 10% Cash Commission On Every Referral
              </h2>
              <p className="text-sm sm:text-base text-zinc-200 leading-relaxed">
                Share your unique Mitra referral code. Your friends receive an instant <strong className="text-yellow-300">₹500 discount</strong> on their laptop purchase, and you earn <strong className="text-white">10% direct payout</strong> into your bank account!
              </p>
              <div className="pt-2 flex flex-col sm:flex-row gap-4">
                <Link
                  href="/register"
                  className="px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-zinc-950 font-bold rounded-xl shadow-lg transition-transform hover:scale-105 text-center text-sm"
                >
                  Join Mitra Program Free
                </Link>
                <Link
                  href="/profile"
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold rounded-xl transition-colors text-center text-sm"
                >
                  View My Referral Code
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </CustomerLayout>
  );
}