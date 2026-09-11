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

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [sortBy, setSortBy] = useState<string>('featured');

  const [filters, setFilters] = useState<FilterState>({
    category: initialCategory,
    search: initialSearch,
    brands: [],
    processors: [],
    rams: [],
    grades: [],
    priceRange: 'all',
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
    setFilters((prev) => ({
      ...prev,
      category: cat || prev.category,
      search: q !== null ? q : prev.search,
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

        // Condition Grade Filter
        if (filters.grades.length > 0) {
          const grade = getProductGrade(p);
          if (!filters.grades.includes(grade)) return false;
        }

        // Price Bracket Filter
        const price = Number(p.price);
        if (filters.priceRange === 'under-40k' && price > 40000) return false;
        if (filters.priceRange === '40k-70k' && (price < 40000 || price > 70000)) return false;
        if (filters.priceRange === '70k-100k' && (price < 70000 || price > 100000)) return false;
        if (filters.priceRange === 'above-100k' && price < 100000) return false;

        // Stock Filter
        if (filters.stockOnly && p.stock <= 0) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-low') return Number(a.price) - Number(b.price);
        if (sortBy === 'price-high') return Number(b.price) - Number(a.price);
        if (sortBy === 'newest') return (b.isNewArrival ? 1 : 0) - (a.isNewArrival ? 1 : 0);
        return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
      });
  }, [products, filters, sortBy]);

  const resetFilters = () => {
    setFilters({
      category: 'all',
      search: '',
      brands: [],
      processors: [],
      rams: [],
      grades: [],
      priceRange: 'all',
      stockOnly: false,
    });
    setSortBy('featured');
    // Clear URL query param if present
    if (searchParams.get('category') || searchParams.get('search')) {
      router.push('/products');
    }
  };

  const activeFilterCount = [
    filters.category !== 'all',
    filters.search.trim().length > 0,
    filters.brands.length > 0,
    filters.processors.length > 0,
    filters.rams.length > 0,
    filters.grades.length > 0,
    filters.priceRange !== 'all',
    filters.stockOnly,
  ].filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb & Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-2">
          <span>Home</span>
          <span>/</span>
          <span className="text-[var(--text-primary)] font-medium">Refurbished Laptops</span>
          {filters.category !== 'all' && (
            <>
              <span>/</span>
              <span className="text-[var(--accent)] font-semibold">
                {categories.find((c) => c.id === filters.category || c.slug === filters.category)?.name || filters.category}
              </span>
            </>
          )}
        </div>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-[var(--text-primary)] font-display tracking-tight">
              Browse Certified Laptops
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Showing {filteredProducts.length} verified laptops tested across our 32-point checklist.
            </p>
          </div>
          {/* Active filter pills summary */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <span className="text-[var(--text-muted)]">Active:</span>
              {filters.category !== 'all' && (
                <span className="px-2 py-0.5 rounded-full bg-[var(--accent-bg)] text-[var(--accent)] border border-[var(--accent)]/30 font-medium">
                  {categories.find((c) => c.id === filters.category)?.name || filters.category}
                </span>
              )}
              {filters.brands.map((b) => (
                <span key={b} className="px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-default)]">
                  {b}
                </span>
              ))}
              {filters.processors.map((p) => (
                <span key={p} className="px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-default)]">
                  {p}
                </span>
              ))}
              {filters.rams.map((r) => (
                <span key={r} className="px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-default)]">
                  {r} RAM
                </span>
              ))}
              {filters.grades.map((g) => (
                <span key={g} className="px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-default)]">
                  Grade {g}
                </span>
              ))}
              {filters.stockOnly && (
                <span className="px-2 py-0.5 rounded-full bg-[var(--accent-bg)] text-[var(--accent)] border border-[var(--accent)]/30">
                  In Stock
                </span>
              )}
              <button
                onClick={resetFilters}
                className="text-[var(--accent)] hover:underline font-semibold ml-1 cursor-pointer"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile filter button */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
          className="w-full py-2.5 px-4 rounded-[var(--radius-lg)] bg-[var(--bg-surface)] border border-[var(--border-default)] text-[var(--text-primary)] font-medium text-xs flex items-center justify-between shadow-sm cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[var(--accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filter Laptops
            {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-[var(--accent)] text-[var(--bg-deep)] text-[10px] font-bold font-mono">
                {activeFilterCount}
              </span>
            )}
          </span>
          <svg
            className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${mobileFiltersOpen ? 'rotate-180' : ''}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Mobile Collapsible Filter Panel */}
      {mobileFiltersOpen && (
        <div className="lg:hidden mb-6 p-5 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-xl">
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Desktop Sticky Sidebar Filter Panel */}
        <aside className="hidden lg:block lg:col-span-1">
          <div className="sticky top-24 p-5 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm">
            <FilterSidebar
              products={products}
              categories={categories}
              filters={filters}
              onFilterChange={setFilters}
              onReset={resetFilters}
            />
          </div>
        </aside>

        {/* Main Products Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Sort bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3.5 rounded-[var(--radius-lg)] bg-[var(--bg-surface)] border border-[var(--border-default)] shadow-sm">
            <div className="text-xs text-[var(--text-muted)]">
              Showing <strong className="text-[var(--text-primary)] font-mono">{filteredProducts.length}</strong> laptops
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[var(--text-muted)]">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-primary)] font-medium text-xs focus:outline-none focus:border-[var(--accent)] cursor-pointer"
              >
                <option value="featured">Featured First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
                <option value="newest">New Arrivals</option>
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
      <Suspense fallback={<div className="p-12 text-center text-sm text-[var(--text-muted)]">Loading laptops catalog...</div>}>
        <ProductsContent />
      </Suspense>
    </CustomerLayout>
  );
}
