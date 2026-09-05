'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import CustomerLayout from '../../components/CustomerLayout';
import ProductCard from '../../components/ProductCard';
import { Product, Category } from '../../lib/types';
import { api } from '../../lib/api';

function ProductsContent() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || 'all';
  const initialSearch = searchParams.get('search') || '';

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
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

  // Synchronize when URL search parameters change
  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) setSelectedCategory(cat);
    const q = searchParams.get('search');
    if (q !== null) setSearch(q);
  }, [searchParams]);

  // Filtered & sorted products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Category filter
        if (selectedCategory !== 'all') {
          if (p.categoryId !== selectedCategory && p.category?.slug !== selectedCategory) {
            return false;
          }
        }

        // Search query filter
        if (search.trim()) {
          const s = search.toLowerCase();
          const matchName = p.name.toLowerCase().includes(s);
          const matchSku = p.sku.toLowerCase().includes(s);
          const matchDesc = p.description?.toLowerCase().includes(s) || false;
          const matchTags = p.tags?.toLowerCase().includes(s) || false;
          if (!matchName && !matchSku && !matchDesc && !matchTags) return false;
        }

        // Price range
        const price = Number(p.price);
        if (priceRange === 'under-40k' && price > 40000) return false;
        if (priceRange === '40k-70k' && (price < 40000 || price > 70000)) return false;
        if (priceRange === '70k-100k' && (price < 70000 || price > 100000)) return false;
        if (priceRange === 'above-100k' && price < 100000) return false;

        // Stock filter
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Breadcrumbs & Title */}
      <div className="mb-6">
        <div className="flex items-center space-x-2 text-xs text-zinc-500 mb-2">
          <span>Home</span>
          <span>/</span>
          <span className="text-zinc-800 dark:text-zinc-200 font-medium">Refurbished Laptops</span>
        </div>
        <h1 className="text-3xl font-extrabold text-zinc-900 dark:text-white">
          Browse Certified Laptops
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Showing {filteredProducts.length} verified laptops tested across 32 checkpoints.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* SIDEBAR FILTERS */}
        <aside className="lg:col-span-1 space-y-6 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 h-fit">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
            <h3 className="font-bold text-base text-zinc-900 dark:text-white">Filters</h3>
            <button
              onClick={resetFilters}
              className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
            >
              Reset All
            </button>
          </div>

          {/* Search box inside filter */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
              Keyword Search
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="e.g. ThinkPad, M2, RTX..."
              className="w-full px-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
          </div>

          {/* Categories */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
              Category
            </label>
            <div className="space-y-1.5">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white font-bold'
                    : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                All Categories ({products.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedCategory === cat.id
                      ? 'bg-blue-600 text-white font-bold'
                      : 'text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
              Budget / Price
            </label>
            <div className="space-y-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-300">
              {[
                { id: 'all', label: 'Any Budget' },
                { id: 'under-40k', label: 'Under ₹40,000' },
                { id: '40k-70k', label: '₹40,000 - ₹70,000' },
                { id: '70k-100k', label: '₹70,000 - ₹1,00,000' },
                { id: 'above-100k', label: 'Above ₹1,00,000' },
              ].map((p) => (
                <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="price"
                    checked={priceRange === p.id}
                    onChange={() => setPriceRange(p.id)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>{p.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Stock Filter */}
          <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={stockOnly}
                onChange={(e) => setStockOnly(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span>In-Stock Only</span>
            </label>
          </div>
        </aside>

        {/* MAIN PRODUCT GRID */}
        <div className="lg:col-span-3 space-y-6">
          {/* Top Sorting Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div className="text-xs text-zinc-500">
              Showing <strong className="text-zinc-800 dark:text-zinc-200">{filteredProducts.length}</strong> items
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-500">Sort by:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-medium focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="featured">⭐ Featured First</option>
                <option value="price-low">₹ Price: Low to High</option>
                <option value="price-high">₹ Price: High to Low</option>
                <option value="newest">🔥 New Arrivals</option>
              </select>
            </div>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="h-80 rounded-2xl bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4">
              <div className="text-4xl">🔍</div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">No Laptops Found</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                No laptops match your current filter criteria. Try broadening your search or resetting filters.
              </p>
              <button
                onClick={resetFilters}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold"
              >
                Reset All Filters
              </button>
            </div>
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
      <Suspense fallback={<div className="p-12 text-center text-sm">Loading products...</div>}>
        <ProductsContent />
      </Suspense>
    </CustomerLayout>
  );
}
