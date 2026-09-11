'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import CustomerLayout from '../components/CustomerLayout';
import ProductCard from '../components/ProductCard';
import MacLaptopScreen from '../components/ui/mac-laptop-screen';
import AnimatedCounter from '../components/AnimatedCounter';
import { ProductCardSkeleton } from '../components/ui/Skeleton';
import { Product } from '../lib/types';
import { api } from '../lib/api';

/* ── Category icons (Lucide-style SVG, not emoji) ── */

const categories = [
  {
    title: 'Business Laptops',
    slug: 'cat-business',
    desc: 'ThinkPad & Latitude',
    badge: 'Durability',
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    title: 'Apple MacBooks',
    slug: 'cat-apple',
    desc: 'M1, M2 & Pro chips',
    badge: 'All-Day Battery',
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    title: 'Gaming & High-Perf',
    slug: 'cat-gaming',
    desc: 'RTX GPUs & 120Hz',
    badge: 'Powerhouse',
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'Slim Ultrabooks',
    slug: 'cat-ultrabook',
    desc: 'Dell XPS & ZenBooks',
    badge: 'Lightweight',
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
  },
  {
    title: 'Student Budget',
    slug: 'cat-student',
    desc: 'Starting under ₹35,000',
    badge: 'Top Value',
    icon: (
      <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path d="M12 14l9-5-9-5-9 5 9 5z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
      </svg>
    ),
  },
];

/* ── Quality checklist items ── */

const qualityChecks = [
  {
    num: 1,
    title: 'Battery & Power Health > 90%',
    desc: 'We reject any laptop with depleted battery cells. We verify charging circuits, voltage regulators, and endurance cycles to ensure 6 to 14 hours of real battery backup.',
    color: 'var(--info)',
    bgColor: 'rgba(56, 189, 248, 0.1)',
  },
  {
    num: 2,
    title: 'Pristine Screen & Hardware Diagnostics',
    desc: 'RGB sub-pixel inspection ensures zero dead spots, zero white patches, and zero hinge wobble. Keyboard, TrackPoint, webcam, and speakers are 100% verified.',
    color: 'var(--accent)',
    bgColor: 'var(--accent-bg)',
  },
  {
    num: 3,
    title: 'Thermal Repasting & Deep Sanitization',
    desc: 'Fans are ultrasonic cleaned and factory thermal paste is reapplied with Arctic MX-4 compound for maximum heat dissipation, silent performance, and longevity.',
    color: '#C084FC',
    bgColor: 'rgba(168, 85, 247, 0.1)',
  },
];

/* ── Brand logos for social proof ── */

const brandLogos = ['Lenovo', 'Dell', 'HP', 'Apple', 'ASUS', 'Acer'];

/* ══════════════════════════════════════════════
   HOMEPAGE
   ══════════════════════════════════════════════ */

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

  const displayedProducts =
    activeTab === 'featured'
      ? featuredProducts.filter((p) => p.isFeatured)
      : featuredProducts.filter((p) => p.isNewArrival);

  return (
    <CustomerLayout>
      {/* ─── TOP BANNER ─── */}
      <div className="bg-[var(--bg-deep)] border-b border-[var(--border-subtle)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between py-2 px-4 text-xs">
          <span className="hidden sm:inline text-[var(--text-secondary)]">
            India&apos;s Most Trusted Refurbished Laptop Marketplace
          </span>
          <div className="flex items-center gap-4 mx-auto sm:mx-0 text-[var(--text-secondary)]">
            <span className="flex items-center gap-1">
              <span className="text-[var(--accent)]">✓</span> 1-Year Warranty
            </span>
            <span className="hidden md:inline flex items-center gap-1">
              <span className="text-[var(--accent)]">✓</span> 7-Day Replacement
            </span>
            <span className="flex items-center gap-1">
              Code: <strong className="text-[var(--accent)] font-bold">MITRA500</strong> for ₹500 Off
            </span>
          </div>
        </div>
      </div>

      {/* ─── HERO SECTION ─── */}
      <section className="relative overflow-hidden bg-[var(--bg-deep)] pt-12 pb-20 lg:pt-20 lg:pb-28">
        {/* Radial gradient overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 30% 20%, rgba(0, 229, 160, 0.08), transparent 50%)',
          }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Copy */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[var(--radius-full)] bg-[var(--accent-bg)] border border-[var(--accent)]/20 text-[var(--accent)] text-xs font-semibold tracking-wide">
                <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
                India&apos;s Most Trusted Refurbished Laptop Marketplace
              </div>

              {/* Headline — italic emphasis per DESIGN.md */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] font-display">
                Premium Laptops.<br />
                <span className="text-[var(--accent)] italic">Like-New</span> Quality.<br />
                Up to 65% Off Retail.
              </h1>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-[var(--text-secondary)] max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                32-point rigorously inspected corporate lease-returns. Backed by a full{' '}
                <strong className="text-[var(--text-primary)]">1-Year Warranty</strong>,{' '}
                <strong className="text-[var(--text-primary)]">7-Day Hassle-Free Replacement</strong>,
                and free express nationwide delivery.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                <Link
                  href="/products"
                  className="w-full sm:w-auto px-8 py-4 bg-[var(--accent)] text-[var(--bg-deep)] font-bold rounded-[var(--radius-xl)] shadow-glow hover:bg-[var(--accent-dim)] transition-all hover:scale-[1.02] active:scale-[0.98] text-center flex items-center justify-center gap-2"
                >
                  <span>Explore Laptops</span>
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <Link
                  href="/products?category=cat-apple"
                  className="w-full sm:w-auto px-6 py-4 bg-[var(--bg-elevated)] hover:bg-[var(--border-default)] border border-[var(--border-default)] text-[var(--text-primary)] font-semibold rounded-[var(--radius-xl)] transition-all text-center flex items-center justify-center gap-2"
                >
                  Apple MacBooks
                </Link>
              </div>

              {/* Trust stats */}
              <div className="pt-6 border-t border-[var(--border-subtle)] grid grid-cols-3 gap-4 max-w-md mx-auto lg:mx-0">
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)]">
                    <AnimatedCounter target={50} suffix="K+" />
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">Laptops Sold</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-[var(--accent)]">
                    <AnimatedCounter target={49} suffix="★" />
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">Verified Reviews</div>
                </div>
                <div>
                  <div className="text-2xl sm:text-3xl font-bold text-[var(--info)]">
                    1 Year
                  </div>
                  <div className="text-xs text-[var(--text-muted)]">Doorstep Warranty</div>
                </div>
              </div>
            </div>

            {/* Right — Deal Card */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none rounded-[var(--radius-2xl)] p-[2px] bg-gradient-to-tr from-[var(--accent)] via-[var(--info)] to-[var(--accent)] shadow-xl">
                <div className="rounded-[calc(var(--radius-2xl)-2px)] bg-[var(--bg-surface)] p-6 overflow-hidden">
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 rounded-[var(--radius-full)] bg-[var(--accent-bg)] text-[var(--accent)] text-xs font-bold border border-[var(--accent)]/20">
                      DEAL OF THE DAY
                    </span>
                    <span className="text-xs text-[var(--text-muted)] font-mono">STOCK: 8 LEFT</span>
                  </div>

                  {/* Laptop Mockup Frame */}
                  <div className="w-full max-w-full overflow-hidden mb-4 rounded-[var(--radius-lg)]">
                    <MacLaptopScreen
                      width="100%"
                      height="230px"
                      rounded={true}
                      shadow={false}
                      className="w-full"
                    >
                      {/* TODO: replace with real product image from API */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80"
                        alt="Featured Laptop Workspace"
                        className="w-full h-full object-cover"
                      />
                    </MacLaptopScreen>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-[var(--text-primary)]">
                      Apple MacBook Pro 16&quot; (M2 Pro, 16GB, 512GB)
                    </h3>
                    <p className="text-xs text-[var(--text-muted)]">
                      Grade A+ Pristine • 100% Battery Health • Liquid Retina XDR 120Hz
                    </p>
                    <div className="flex items-baseline justify-between pt-3">
                      <div>
                        <div className="text-2xl font-bold text-[var(--text-primary)] font-mono">₹1,54,999</div>
                        <div className="text-xs line-through text-[var(--text-muted)]">₹2,49,900 Retail MRP</div>
                      </div>
                      <Link
                        href="/products"
                        className="px-4 py-2.5 bg-[var(--accent)] text-[var(--bg-deep)] text-xs font-bold rounded-[var(--radius-md)] hover:bg-[var(--accent-dim)] transition-colors"
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

      {/* ─── CATEGORIES ─── */}
      <section className="py-16 bg-[var(--bg-deep)] border-t border-[var(--border-subtle)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10">
            <div>
              <span className="text-xs font-bold text-[var(--accent)] uppercase tracking-widest">
                Curated Collections
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mt-1 font-display">
                Shop Laptops by Category
              </h2>
            </div>
            <Link
              href="/products"
              className="mt-4 md:mt-0 text-sm font-semibold text-[var(--accent)] hover:underline inline-flex items-center gap-1"
            >
              Browse all categories →
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/products?category=${cat.slug}`}
                className="group p-5 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--border-default)] hover:border-[var(--accent)]/40 hover:shadow-card-hover transition-all text-center flex flex-col items-center"
              >
                <span className="text-[var(--accent)] mb-3 group-hover:scale-110 transition-transform">
                  {cat.icon}
                </span>
                <span className="px-2 py-0.5 rounded-[var(--radius-full)] bg-[var(--accent-bg)] text-[var(--accent)] text-[10px] font-semibold mb-2">
                  {cat.badge}
                </span>
                <h4 className="font-semibold text-sm text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                  {cat.title}
                </h4>
                <p className="text-xs text-[var(--text-muted)] mt-1">{cat.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURED / NEW ARRIVALS ─── */}
      <section className="py-16 bg-[var(--bg-surface)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <span className="text-xs font-bold text-[var(--accent)] uppercase tracking-widest">
                Tested &amp; Ready to Ship
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] mt-1 font-display">
                Handpicked Deals
              </h2>
            </div>

            {/* Tab toggle */}
            <div className="inline-flex p-1 rounded-[var(--radius-lg)] bg-[var(--bg-elevated)] text-xs font-bold self-start">
              <button
                onClick={() => setActiveTab('featured')}
                className={`px-4 py-2 rounded-[var(--radius-md)] transition-all ${
                  activeTab === 'featured'
                    ? 'bg-[var(--bg-surface)] text-[var(--accent)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                ⭐ Best Sellers
              </button>
              <button
                onClick={() => setActiveTab('new')}
                className={`px-4 py-2 rounded-[var(--radius-md)] transition-all ${
                  activeTab === 'new'
                    ? 'bg-[var(--bg-surface)] text-[var(--accent)] shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                🔥 New Arrivals
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
              {(displayedProducts.length > 0 ? displayedProducts : featuredProducts).map(
                (product) => (
                  <ProductCard key={product.id} product={product} />
                ),
              )}
            </div>
          )}

          <div className="mt-12 text-center">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-[var(--radius-xl)] bg-[var(--bg-elevated)] hover:bg-[var(--border-default)] text-[var(--text-primary)] text-sm font-bold border border-[var(--border-default)] transition-all hover:scale-[1.02]"
            >
              <span>View All 50+ Verified Laptops</span>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── QUALITY PROMISE ─── */}
      <section className="py-16 bg-[var(--bg-deep)] border-t border-[var(--border-subtle)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold text-[var(--accent)] uppercase tracking-widest">
              LaptopMitra Quality Standard
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold text-[var(--text-primary)] mt-2 font-display">
              Why Our Certified Laptops Feel Brand New
            </h2>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-3">
              Unlike local second-hand markets, every LaptopMitra unit undergoes military-grade testing by certified engineers before shipping.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {qualityChecks.map((check) => (
              <div
                key={check.num}
                className="p-6 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--border-default)]"
              >
                <div
                  className="w-12 h-12 rounded-[var(--radius-lg)] flex items-center justify-center text-xl mb-4 font-bold"
                  style={{ background: check.bgColor, color: check.color }}
                >
                  {check.num}
                </div>
                <h3 className="font-bold text-lg text-[var(--text-primary)] mb-2">
                  {check.title}
                </h3>
                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                  {check.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SOCIAL PROOF — Brand Logos ─── */}
      <section className="py-12 bg-[var(--bg-surface)] border-t border-[var(--border-subtle)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest font-semibold mb-8">
            Laptops sourced from leading brands
          </p>
          <div className="flex items-center justify-center gap-8 sm:gap-12 flex-wrap opacity-40">
            {brandLogos.map((brand) => (
              <span
                key={brand}
                className="text-xl sm:text-2xl font-bold text-[var(--text-primary)] font-display tracking-tight"
              >
                {brand}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── MITRA REFERRAL CTA ─── */}
      <section className="py-16 bg-[var(--bg-deep)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-[var(--radius-2xl)] bg-[var(--accent)]/10 border border-[var(--accent)]/20 p-8 sm:p-12 relative overflow-hidden backdrop-blur-sm">
            <div className="max-w-2xl space-y-4">
              <span className="px-3 py-1 rounded-[var(--radius-full)] bg-[var(--warning)]/20 text-[var(--warning)] border border-[var(--warning)]/30 text-xs font-bold uppercase tracking-wider">
                Mitra Partner Program
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] font-display">
                Earn 10% Cash Commission On Every Referral
              </h2>
              <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                Share your unique Mitra referral code. Your friends receive an instant{' '}
                <strong className="text-[var(--warning)]">₹500 discount</strong> on their laptop
                purchase, and you earn{' '}
                <strong className="text-[var(--text-primary)]">10% direct payout</strong> into your
                bank account!
              </p>
              <div className="pt-2 flex flex-col sm:flex-row gap-4">
                <Link
                  href="/register"
                  className="px-6 py-3 bg-[var(--warning)] hover:bg-[var(--warning)]/90 text-[var(--bg-deep)] font-bold rounded-[var(--radius-xl)] shadow-lg transition-transform hover:scale-[1.02] text-center text-sm"
                >
                  Join Mitra Program Free
                </Link>
                <Link
                  href="/profile"
                  className="px-6 py-3 bg-[var(--bg-elevated)] hover:bg-[var(--border-default)] border border-[var(--border-default)] text-[var(--text-primary)] font-semibold rounded-[var(--radius-xl)] transition-colors text-center text-sm"
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
