'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import CustomerLayout from '../../components/CustomerLayout';
import ProductCard from '../../components/ProductCard';
import FilterSidebar, {
  FilterState,
  getProductBrand,
  getProductProcessorGroup,
  getProductRamGroup,
  getProductStorageGroup,
  getProductGrade,
} from '../../components/FilterSidebar';
import { ProductCardSkeleton } from '../../components/ui/Skeleton';
import EmptyState from '../../components/EmptyState';
import { Product, Category } from '../../lib/types';
import { api } from '../../lib/api';

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialCategory = searchParams.get('category') || 'all';
  const initialSearch = searchParams.get('search') || '';
  const initialType = (searchParams.get('type') as 'all' | 'buy' | 'lease') || 'all';
  const initialMaxPrice = searchParams.get('maxPrice');

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState<string>('featured');

  const [filters, setFilters] = useState<FilterState>({
    category: initialCategory,
    search: initialSearch,
    listingType: initialType,
    brands: [],
    processors: [],
    rams: [],
    storages: [],
    grades: [],
    priceRange: initialMaxPrice === '25000' ? 'under-25k' : 'all',
    stockOnly: false,
  });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [catRes, prodRes] = await Promise.all([
          api.getCategories(),
          api.getProducts(),
        ]);
        setCategories(catRes);
        setProducts(prodRes.products);
      } catch {
        // Handled by api fallback
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  useEffect(() => {
    const cat = searchParams.get('category');
    const q = searchParams.get('search');
    const type = searchParams.get('type') as 'all' | 'buy' | 'lease' | null;
    const maxP = searchParams.get('maxPrice');

    setFilters((prev) => ({
      ...prev,
      category: cat || prev.category,
      search: q !== null ? q : prev.search,
      listingType: type || prev.listingType,
      priceRange: maxP === '25000' ? 'under-25k' : prev.priceRange,
    }));
  }, [searchParams]);

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Category Filter
        if (filters.category !== 'all') {
          if (p.categoryId !== filters.category && p.category?.slug !== filters.category) return false;
        }

        // Keyword Search Filter
        if (filters.search.trim()) {
          const s = filters.search.toLowerCase();
          const matchName = p.name.toLowerCase().includes(s);
          const matchSku = p.sku.toLowerCase().includes(s);
          const matchDesc = p.description?.toLowerCase().includes(s) || false;
          const matchTags = p.tags?.toLowerCase().includes(s) || false;
          if (!matchName && !matchSku && !matchDesc && !matchTags) return false;
        }

        // Brand Filter
        if (filters.brands.length > 0) {
          const brand = getProductBrand(p);
          if (!filters.brands.includes(brand)) return false;
        }

        // Processor Filter
        if (filters.processors.length > 0) {
          const proc = getProductProcessorGroup(p);
          if (!filters.processors.includes(proc)) return false;
        }

        // RAM Filter
        if (filters.rams.length > 0) {
          const ram = getProductRamGroup(p);
          if (!filters.rams.includes(ram)) return false;
        }

        // Storage Filter
        if (filters.storages.length > 0) {
          const st = getProductStorageGroup(p);
          if (!filters.storages.includes(st)) return false;
        }

        // Condition Grade Filter
        if (filters.grades.length > 0) {
          const grade = getProductGrade(p);
          if (!filters.grades.includes(grade)) return false;
        }

        // Price Bracket Filter
        const price = Number(p.price);
        if (filters.priceRange === 'under-25k' && price > 25000) return false;
        if (filters.priceRange === '25k-50k' && (price < 25000 || price > 50000)) return false;
        if (filters.priceRange === '50k-75k' && (price < 50000 || price > 75000)) return false;
        if (filters.priceRange === 'above-75k' && price < 75000) return false;

        // Stock Filter
        if (filters.stockOnly && p.stock <= 0) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-low') return Number(a.price) - Number(b.price);
        if (sortBy === 'price-high') return Number(b.price) - Number(a.price);
        if (sortBy === 'newest') return (b.isNewArrival ? 1 : 0) - (a.isNewArrival ? 1 : 0);
        if (sortBy === 'discount') {
          const discA = a.compareAtPrice ? (Number(a.compareAtPrice) - Number(a.price)) / Number(a.compareAtPrice) : 0;
          const discB = b.compareAtPrice ? (Number(b.compareAtPrice) - Number(b.price)) / Number(b.compareAtPrice) : 0;
          return discB - discA;
        }
        return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
      });
  }, [products, filters, sortBy]);

  const resetFilters = () => {
    setFilters({
      category: 'all',
      search: '',
      listingType: 'all',
      brands: [],
      processors: [],
      rams: [],
      storages: [],
      grades: [],
      priceRange: 'all',
      stockOnly: false,
    });
    setSortBy('featured');
    if (searchParams.get('category') || searchParams.get('search') || searchParams.get('type') || searchParams.get('maxPrice')) {
      router.push('/products');
    }
  };

  const removeSingleFilter = (key: keyof FilterState, value?: string) => {
    if (Array.isArray(filters[key])) {
      const arr = (filters[key] as string[]).filter((x) => x !== value);
      setFilters((prev) => ({ ...prev, [key]: arr }));
    } else if (typeof filters[key] === 'boolean') {
      setFilters((prev) => ({ ...prev, [key]: false }));
    } else if (key === 'category') {
      setFilters((prev) => ({ ...prev, category: 'all' }));
      router.push('/products');
    } else if (key === 'priceRange') {
      setFilters((prev) => ({ ...prev, priceRange: 'all' }));
    } else if (key === 'search') {
      setFilters((prev) => ({ ...prev, search: '' }));
    } else if (key === 'listingType') {
      setFilters((prev) => ({ ...prev, listingType: 'all' }));
    }
  };

  const activeFilterCount = [
    filters.category !== 'all',
    filters.search.trim().length > 0,
    filters.listingType !== 'all',
    filters.brands.length > 0,
    filters.processors.length > 0,
    filters.rams.length > 0,
    filters.storages.length > 0,
    filters.grades.length > 0,
    filters.priceRange !== 'all',
    filters.stockOnly,
  ].filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="mb-4">
        <ol className="flex items-center gap-2 text-xs text-slate-500">
          <li>
            <a href="/" className="hover:text-[#1D6FF2] transition-colors">Home</a>
          </li>
          <li>/</li>
          <li className="text-[#0B1F4B] font-bold">Certified Refurbished Laptops</li>
          {filters.category !== 'all' && (
            <>
              <li>/</li>
              <li className="text-[#1D6FF2] font-semibold">
                {categories.find((c) => c.id === filters.category || c.slug === filters.category)?.name || filters.category}
              </li>
            </>
          )}
        </ol>
      </nav>

      {/* Page Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3.5xl font-black text-[#0B1F4B] tracking-tight">
              Certified Pre-Owned &amp; Refurbished Laptops
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Showing <strong className="text-[#0B1F4B] font-bold">{filteredProducts.length}</strong> certified laptops tested across our 32-point engineering inspection checklist.
            </p>
          </div>

          {/* Active Filter Chips Summary */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              <span className="text-slate-400 font-medium">Active:</span>

              {filters.category !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-[#1D6FF2] border border-blue-200 text-xs font-semibold">
                  {categories.find((c) => c.id === filters.category || c.slug === filters.category)?.name || filters.category}
                  <button onClick={() => removeSingleFilter('category')} className="hover:text-blue-900 cursor-pointer">✕</button>
                </span>
              )}

              {filters.search && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-800 border border-slate-200 text-xs font-semibold">
                  &ldquo;{filters.search}&rdquo;
                  <button onClick={() => removeSingleFilter('search')} className="hover:text-rose-600 cursor-pointer">✕</button>
                </span>
              )}

              {filters.brands.map((b) => (
                <span key={b} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white text-[#0B1F4B] border border-[#E4E9F2] text-xs font-semibold shadow-sm">
                  {b}
                  <button onClick={() => removeSingleFilter('brands', b)} className="text-slate-400 hover:text-rose-600 cursor-pointer">✕</button>
                </span>
              ))}

              {filters.processors.map((p) => (
                <span key={p} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white text-[#0B1F4B] border border-[#E4E9F2] text-xs font-semibold shadow-sm">
                  {p}
                  <button onClick={() => removeSingleFilter('processors', p)} className="text-slate-400 hover:text-rose-600 cursor-pointer">✕</button>
                </span>
              ))}

              {filters.rams.map((r) => (
                <span key={r} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white text-[#0B1F4B] border border-[#E4E9F2] text-xs font-semibold shadow-sm">
                  {r} RAM
                  <button onClick={() => removeSingleFilter('rams', r)} className="text-slate-400 hover:text-rose-600 cursor-pointer">✕</button>
                </span>
              ))}

              {filters.storages.map((st) => (
                <span key={st} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white text-[#0B1F4B] border border-[#E4E9F2] text-xs font-semibold shadow-sm">
                  {st}
                  <button onClick={() => removeSingleFilter('storages', st)} className="text-slate-400 hover:text-rose-600 cursor-pointer">✕</button>
                </span>
              ))}

              {filters.grades.map((g) => (
                <span key={g} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                  Grade {g}
                  <button onClick={() => removeSingleFilter('grades', g)} className="text-slate-400 hover:text-rose-600 cursor-pointer">✕</button>
                </span>
              ))}

              {filters.priceRange !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                  {filters.priceRange}
                  <button onClick={() => removeSingleFilter('priceRange')} className="text-slate-400 hover:text-rose-600 cursor-pointer">✕</button>
                </span>
              )}

              {filters.stockOnly && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
                  Ready for Dispatch
                  <button onClick={() => removeSingleFilter('stockOnly')} className="text-slate-400 hover:text-rose-600 cursor-pointer">✕</button>
                </span>
              )}

              <button
                onClick={resetFilters}
                className="text-xs font-bold text-[#1D6FF2] hover:underline ml-1 cursor-pointer"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter toggle button */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
          className="w-full py-3 px-4 rounded-xl bg-white border border-[#E4E9F2] text-[#0B1F4B] font-bold text-xs flex items-center justify-between shadow-sm cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[#1D6FF2]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filter Laptops
            {activeFilterCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[#1D6FF2] text-white text-[10px] font-bold font-mono">
                {activeFilterCount}
              </span>
            )}
          </span>
          <svg
            className={`w-4 h-4 text-slate-400 transition-transform ${mobileFiltersOpen ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Mobile Filter Drawer */}
      {mobileFiltersOpen && (
        <div className="lg:hidden mb-6 p-5 rounded-2xl bg-white border border-[#E4E9F2] shadow-xl">
          <FilterSidebar
            products={products}
            categories={categories}
            filters={filters}
            onFilterChange={setFilters}
            onReset={resetFilters}
            onCloseMobile={() => setMobileFiltersOpen(false)}
          />
        </div>
      )}

      {/* Main Grid: Sidebar + Product Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Desktop Sticky Sidebar */}
        <aside className="hidden lg:block lg:col-span-1">
          <div className="sticky top-28 p-5 rounded-2xl bg-white border border-[#E4E9F2] shadow-sm">
            <FilterSidebar
              products={products}
              categories={categories}
              filters={filters}
              onFilterChange={setFilters}
              onReset={resetFilters}
            />
          </div>
        </aside>

        {/* Main Product Area */}
        <div className="lg:col-span-3 space-y-6">
          {/* Top Sort & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-[#E4E9F2] shadow-sm">
            <div className="text-xs text-slate-500 font-medium">
              Showing <strong className="text-[#0B1F4B] font-bold">{filteredProducts.length}</strong> available laptops
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3.5 py-2 rounded-xl bg-[#F8FAFC] border border-[#E4E9F2] text-[#0B1F4B] font-semibold text-xs focus:outline-none focus:border-[#1D6FF2] focus:bg-white cursor-pointer shadow-sm"
              >
                <option value="featured">Featured First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="newest">Newest Arrivals</option>
                <option value="discount">Biggest Savings %</option>
              </select>
            </div>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <ProductCardSkeleton key={n} />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <EmptyState
              variant="no-results"
              onAction={resetFilters}
              actionLabel="Reset All Filters"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <CustomerLayout>
      <Suspense fallback={<div className="p-12 text-center text-sm text-slate-500">Loading certified laptops...</div>}>
        <ProductsContent />
      </Suspense>
    </CustomerLayout>
  );
}

