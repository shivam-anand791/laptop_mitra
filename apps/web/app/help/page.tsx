'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useSupportConfig } from '@/lib/support-config';
import { HelpBreadcrumbs, protectedSupportHref } from '@/components/help/HelpSubnav';
import {
  Search,
  HelpCircle,
  ShieldCheck,
  RotateCcw,
  Truck,
  Coins,
  CreditCard,
  Briefcase,
  Phone,
  MessageCircle,
  ArrowRight,
  BookOpen,
  ChevronRight,
  LifeBuoy,
} from 'lucide-react';
import { NEXT_PUBLIC_SUPPORT_PHONE_DISPLAY, NEXT_PUBLIC_WHATSAPP_NUMBER } from '@/lib/config';

interface CategoryItem {
  id: string;
  slug: string;
  title: string;
  icon?: string;
  articleCount?: number;
}

interface ArticleItem {
  id: string;
  slug: string;
  title: string;
  summary?: string;
  category?: { slug: string; title: string };
  helpfulCount?: number;
}

const CATEGORY_ICON_MAP: Record<string, React.ElementType> = {
  RotateCcw,
  ShieldCheck,
  Coins,
  Truck,
  Briefcase,
  CreditCard,
};

export default function HelpCenterPage() {
  const { isAuthenticated, isGuest } = useAuth();
  const { data: supportConfig } = useSupportConfig();
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [popularArticles, setPopularArticles] = useState<ArticleItem[]>([]);
  const [searchResults, setSearchResults] = useState<ArticleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [catsRes, artsRes] = await Promise.all([
          api.getHelpCategories().catch(() => []),
          api.getHelpArticles().catch(() => []),
        ]);
        setCategories(catsRes || []);
        setPopularArticles((artsRes || []).slice(0, 6));
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await api.getHelpArticles({ q: searchQuery.trim() });
      setSearchResults(results || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const searchPopularTopic = async (topic: string) => {
    setSearchQuery(topic);
    setSearching(true);
    try {
      const results = await api.getHelpArticles({ q: topic });
      setSearchResults(results || []);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  const authenticated = isAuthenticated && !isGuest;
  const guidedFlowUrl = protectedSupportHref('/help/guided-flow', authenticated);
  const ticketsUrl = protectedSupportHref('/account/tickets', authenticated);
  const ordersUrl = protectedSupportHref('/account/orders', authenticated);
  const returnsUrl = protectedSupportHref('/account/returns', authenticated);
  const warrantyUrl = protectedSupportHref('/account/warranty-support', authenticated);
  const callbackUrl = protectedSupportHref('/help/guided-flow?contact=callback', authenticated);
  const warrantyMonths = supportConfig?.standardWarrantyDays
    ? Math.max(1, Math.round(supportConfig.standardWarrantyDays / 30))
    : null;

  return (
    <div className="bg-[#F8FAFC] text-slate-900 pb-16">
      <HelpBreadcrumbs />
      {/* ── Hero Search Banner ── */}
      <section className="relative bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white py-16 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />
        <div className="relative max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-200 text-xs font-semibold uppercase tracking-wider mb-4">
            <LifeBuoy className="w-3.5 h-3.5" />
            LaptopMitra Help &amp; Support
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-4">
            How can we assist you today?
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto mb-8">
            Get help with orders, return eligibility, warranty coverage{warrantyMonths ? ` of up to ${warrantyMonths} months` : ''}, and buyback.
          </p>

          {/* Search Input Box */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto relative">
            <div className="relative flex items-center shadow-2xl rounded-2xl overflow-hidden bg-white">
              <Search className="w-5 h-5 text-slate-400 ml-4 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search help articles (e.g. return window, warranty claim, COD refund)..."
                className="w-full py-4 pl-3 pr-28 text-slate-900 text-sm focus:outline-none placeholder:text-slate-400"
              />
              <button
                type="submit"
                className="absolute right-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition shadow-md"
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </div>
          </form>

          {/* Popular Search Shortcuts */}
          <div className="mt-4 flex flex-wrap justify-center items-center gap-2 text-xs text-slate-300">
            <span className="text-slate-400">Popular:</span>
            {['Returns & Replacements', 'Warranty Claim', 'Bank Refund', 'Buyback'].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => {
                  void searchPopularTopic(tag);
                }}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Main Content Container ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-10">
        {/* Search Results Display (if active query) */}
        {searchQuery.trim() && (
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Search Results for &quot;{searchQuery}&quot;
                </h2>
                <p className="text-xs text-slate-500">
                  Found {searchResults.length} {searchResults.length === 1 ? 'article' : 'articles'}
                </p>
              </div>
              <button
                onClick={clearSearch}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                Clear Search
              </button>
            </div>

            {searchResults.length === 0 && !searching ? (
              <div className="text-center py-10">
                <HelpCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-700">No matching help articles found</p>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Try adjusting your search terms or use our interactive Guided Support Flow to raise a ticket with our support specialists.
                </p>
                <Link
                  href={guidedFlowUrl}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                >
                  Start Guided Support Flow <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {searchResults.map((art) => (
                  <Link
                    key={art.id}
                    href={`/help/${art.category?.slug || 'general'}/${art.slug}`}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition group flex items-start gap-3"
                  >
                    <BookOpen className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition">
                        {art.title}
                      </h3>
                      {art.summary && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                          {art.summary}
                        </p>
                      )}
                      <span className="inline-block mt-2 text-[11px] font-semibold text-slate-400">
                        {art.category?.title || 'Help Article'} →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Guided Flow Promotion Banner (Flipkart/Myntra Pattern) ── */}
        <section className="bg-[#0B1F4B] text-white rounded-2xl p-6 sm:p-8 shadow-xl">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-blue-100 text-xs font-bold tracking-wide uppercase mb-3">
              Guided help
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-2">
              Have an issue with a recent order or hardware?
            </h2>
            <p className="text-xs sm:text-sm text-blue-100 mb-6 leading-relaxed">
              Select an order and issue to review relevant support options or send a request to our team.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={guidedFlowUrl}
                className="inline-flex items-center gap-2 px-5 py-3 bg-white hover:bg-blue-50 text-[#0B1F4B] font-bold text-sm rounded-2xl shadow-lg transition transform hover:-translate-y-0.5"
              >
                Start Guided Flow
                <ArrowRight className="w-4 h-4 text-blue-600" />
              </Link>
              <Link
                href={ticketsUrl}
                className="inline-flex items-center gap-2 px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm rounded-2xl border border-white/20 transition"
              >
                View My Tickets
              </Link>
            </div>
          </div>
        </section>

        {/* ── Help Categories Grid ── */}
        <section id="topics" className="scroll-mt-36">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              Browse by Category
            </h2>
            <p className="text-xs text-slate-500">
              Select a help topic to view detailed policies, walkthroughs, and solutions.
            </p>
          </div>

          {loading ? (
            <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">Loading help topics…</p>
          ) : categories.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
              Help topics are temporarily unavailable. Please try again or contact our support team.
            </p>
          ) : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {categories.map((cat) => {
              const IconComp = (cat.icon && CATEGORY_ICON_MAP[cat.icon]) || BookOpen;
              return (
                <div
                  key={cat.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-blue-500/50 hover:shadow-md transition group flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition">
                      <IconComp className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-base mb-1 group-hover:text-blue-700 transition">
                      {cat.title}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {cat.articleCount ? `${cat.articleCount} Articles available` : 'Articles & Guides'}
                    </p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <Link
                      href={`/help/guided-flow?category=${cat.slug}`}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      Browse Topic <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>}
        </section>

        {/* ── Popular Articles Section ── */}
        <section className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              Frequently Asked Help Articles
            </h2>
            <p className="text-xs text-slate-500">
              Top questions answered by our certified technicians and support specialists.
            </p>
          </div>

          {loading ? (
            <p className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">Loading articles…</p>
          ) : popularArticles.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
              Articles are temporarily unavailable. Browse topics or contact our support team.
            </p>
          ) : <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {popularArticles.map((art) => (
              <Link
                key={art.id}
                href={`/help/${art.category?.slug || 'general'}/${art.slug}`}
                className="p-4 rounded-2xl bg-slate-50/70 hover:bg-blue-50/50 border border-slate-100 hover:border-blue-200 transition group flex items-start gap-3.5"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition">
                    {art.title}
                  </h3>
                  {art.summary && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {art.summary}
                    </p>
                  )}
                  <span className="inline-block mt-2 text-[11px] font-semibold text-blue-600 group-hover:underline">
                    Read Full Policy →
                  </span>
                </div>
              </Link>
            ))}
          </div>}
        </section>

        <section aria-label="Quick support links" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: ordersUrl, label: 'My Orders' },
            { href: ticketsUrl, label: 'My Tickets' },
            { href: returnsUrl, label: 'Returns & Replacements' },
            { href: ordersUrl, label: 'Track an Order' },
            { href: warrantyUrl, label: 'Warranty Support' },
            { href: '/buyback-guarantee', label: 'Buyback' },
          ].map((item) => (
            <Link key={item.label} href={item.href} className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-800 hover:border-blue-300 hover:text-blue-700">
              {item.label} <ArrowRight className="inline h-4 w-4" />
            </Link>
          ))}
        </section>

        {/* ── Direct Support Contact (Call & WhatsApp for Public Visitors) ── */}
        <section id="contact" className="scroll-mt-36 bg-[#0B1F4B] text-white rounded-2xl p-6 sm:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold mb-2">
                Need Immediate Assistance?
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
                {supportConfig?.supportHoursText || 'Reach our support team by phone, WhatsApp, or a callback request.'}
              </p>
              <div className="text-xs text-slate-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Support for orders, returns, and warranty claims</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href={`tel:${NEXT_PUBLIC_SUPPORT_PHONE_DISPLAY || '+919876543210'}`}
                className="flex-1 flex items-center justify-center gap-3 px-5 py-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-bold text-sm transition"
              >
                <Phone className="w-4 h-4 text-blue-300" />
                Call Hotline
              </a>
              <a
                href={`https://wa.me/${NEXT_PUBLIC_WHATSAPP_NUMBER || '919876543210'}?text=${encodeURIComponent('Hi LaptopMitra Support, I need assistance with my laptop.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-3 px-5 py-4 bg-emerald-600 hover:bg-emerald-700 rounded-xl text-white font-bold text-sm transition"
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp Chat
              </a>
              <Link
                href={callbackUrl}
                className="flex-1 flex items-center justify-center gap-3 px-5 py-4 bg-blue-600 hover:bg-blue-700 rounded-xl text-white font-bold text-sm transition"
              >
                Request a Callback
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
