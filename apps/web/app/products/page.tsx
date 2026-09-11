'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import CustomerLayout from '../../components/CustomerLayout';
import ProductCard from '../../components/ProductCard';
import { ProductCardSkeleton } from '../../components/ui/Skeleton';
import EmptyState from '../../components/EmptyState';
import { Product, Category } from '../../lib/types';
import { api } from '../../lib/api';

function ProductsContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || 'all';
  const initialSearch = searchParams.get('search') || '';

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [search, setSearch] = useState<string>(initialSearch);
  const [priceRange, setPriceRange] = useState<string>('all');
  const [stockOnly, setStockOnly] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('featured');

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
    if (cat) setSelectedCategory(cat);
    const q = searchParams.get('search');
    if (q !== null) setSearch(q);
  }, [searchParams]);

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        if (selectedCategory !== 'all') {
          if (p.categoryId !== selectedCategory && p.category?.slug !== selectedCategory) return false;
        }
        if (search.trim()) {
          const s = search.toLowerCase();
          const matchName = p.name.toLowerCase().includes(s);
          const matchSku = p.sku.toLowerCase().includes(s);
          const matchDesc = p.description?.toLowerCase().includes(s) || false;
          const matchTags = p.tags?.toLowerCase().includes(s) || false;
          if (!matchName && !matchSku && !matchDesc && !matchTags) return false;
        }
        const price = Number(p.price);
        if (priceRange === 'under-40k' && price > 40000) return false;
        if (priceRange === '40k-70k' && (price < 40000 || price > 70000)) return false;
        if (priceRange === '70k-100k' && (price < 70000 || price > 100000)) return false;
        if (priceRange === 'above-100k' && price < 100000) return false;
        if (stockOnly && p.stock <= 0) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price-low') return Number(a.price) - Number(b.price);
        if (sortBy === 'price-high') return Number(b.price) - Number(a.price);
        if (sortBy === 'newest') return (b.isNewArrival ? 1 : 0) - (a.isNewArrival ? 1 : 0);
        return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
      });
  }, [products, selectedCategory, search, priceRange, stockOnly, sortBy]);

  const resetFilters = () => {
    setSelectedCategory('all');
    setSearch('');
    setPriceRange('all');
    setStockOnly(false);
    setSortBy('featured');
  };

  const activeFilterCount = [
    selectedCategory !== 'all',
    search.trim().length > 0,
    priceRange !== 'all',
    stockOnly,
  ].filter(Boolean).length;

  /* ── Filter Sidebar (shared between desktop and mobile) ── */
  const filterContent = (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border-default)]">
        <h3 className="font-bold text-base text-[var(--text-primary)] font-display">Filters</h3>
        <button
          onClick={resetFilters}
          className="text-xs text-[var(--accent)] font-semibold hover:underline"
        >
          Reset All
        </button>
      </div>

      {/* Search */}
      <div>
        <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">
          Keyword Search
        </label>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="e.g. ThinkPad, M2, RTX..."
          className="input"
        />
      </div>

      {/* Categories */}
      <div>
        <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">
          Category
        </label>
        <div className="space-y-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={[
              'w-full text-left px-3 py-2 rounded-[var(--radius-md)] text-xs font-medium transition-colors',
              selectedCategory === 'all'
                ? 'bg-[var(--accent)] text-[var(--bg-deep)] font-bold'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]',
            ].join(' ')}
          >
            All Categories ({products.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={[
                'w-full text-left px-3 py-2 rounded-[var(--radius-md)] text-xs font-medium transition-colors',
                selectedCategory === cat.id
                  ? 'bg-[var(--accent)] text-[var(--bg-deep)] font-bold'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]',
              ].join(' ')}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">
          Budget / Price
        </label>
        <div className="space-y-2 text-xs font-medium text-[var(--text-secondary)]">
          {[
            { id: 'all', label: 'Any Budget' },
            { id: 'under-40k', label: 'Under ₹40,000' },
            { id: '40k-70k', label: '₹40,000 - ₹70,000' },
            { id: '70k-100k', label: '₹70,000 - ₹1,00,000' },
            { id: 'above-100k', label: 'Above ₹1,00,000' },
          ].map((p) => (
            <label key={p.id} className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="radio"
                name="price"
                checked={priceRange === p.id}
                onChange={() => setPriceRange(p.id)}
                className="accent-[var(--accent)]"
              />
              <span className="group-hover:text-[var(--text-primary)] transition-colors">{p.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Stock */}
      <div className="pt-3 border-t border-[var(--border-default)]">
        <label className="flex items-center gap-2.5 text-xs font-medium text-[var(--text-secondary)] cursor-pointer">
          <input
            type="checkbox"
            checked={stockOnly}
            onChange={(e) => setStockOnly(e.target.checked)}
            className="accent-[var(--accent)]"
          />
          <span>In-Stock Only</span>
        </label>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mb-2">
          <span>Home</span>
          <span>/</span>
          <span className="text-[var(--text-primary)] font-medium">Refurbished Laptops</span>
        </div>
        <h1 className="text-3xl font-bold text-[var(--text-primary)] font-display">
          Browse Certified Laptops
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Showing {filteredProducts.length} verified laptops tested across 32 checkpoints.
        </p>
      </div>

      {/* Mobile filter toggle */}
      <div className="lg:hidden mb-4">
        <button
          onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
          className="btn-secondary w-full justify-between"
        >
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-[var(--accent)] text-[var(--bg-deep)] text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </span>
          <svg className={`w-4 h-4 transition-transform ${mobileFiltersOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Mobile filter drawer */}
      {mobileFiltersOpen && (
        <div className="lg:hidden mb-6 p-5 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--border-default)]">
          {filterContent}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block lg:col-span-1">
          <div className="sticky top-24 p-5 rounded-[var(--radius-xl)] bg-[var(--bg-surface)] border border-[var(--border-default)]">
            {filterContent}
          </div>
        </aside>

        {/* Main grid */}
        <div className="lg:col-span-3 space-y-6">
          {/* Sort bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3 rounded-[var(--radius-lg)] bg-[var(--bg-surface)] border border-[var(--border-default)]">
            <div className="text-xs text-[var(--text-muted)]">
              Showing <strong className="text-[var(--text-primary)]">{filteredProducts.length}</strong> laptops
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[var(--text-muted)]">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1.5 rounded-[var(--radius-md)] bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-primary)] font-medium text-xs focus:outline-none focus:border-[var(--accent)]"
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
            <EmptyState variant="no-results" onAction={resetFilters} actionLabel="Reset All Filters" />
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
      <Suspense fallback={<div className="p-12 text-center text-sm text-[var(--text-muted)]">Loading products...</div>}>
        <ProductsContent />
      </Suspense>
    </CustomerLayout>
  );
}
