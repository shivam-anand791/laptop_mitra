'use client';

import React, { useState, useMemo } from 'react';
import { Category, Product } from '../lib/types';

export interface FilterState {
  category: string;
  search: string;
  listingType: 'all' | 'buy' | 'lease';
  brands: string[];
  processors: string[];
  rams: string[];
  storages: string[];
  grades: string[];
  priceRange: string;
  stockOnly: boolean;
}

interface FilterSidebarProps {
  products: Product[];
  categories: Category[];
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onReset: () => void;
  onCloseMobile?: () => void;
}

export const BRANDS = ['Lenovo', 'Apple', 'Dell', 'HP', 'ASUS', 'Acer'];
export const PROCESSORS = ['Apple M-Series', 'Intel Core i7', 'Intel Core i5', 'AMD Ryzen'];
export const RAMS = ['8GB', '16GB', '32GB', '64GB'];
export const STORAGES = ['256GB SSD', '512GB SSD', '1TB SSD', '2TB SSD'];
export const GRADES = [
  { id: 'A+', label: 'Grade A+ (Pristine)' },
  { id: 'A', label: 'Grade A (Excellent)' },
  { id: 'B', label: 'Grade B (Value)' },
];
export const PRICE_RANGES = [
  { id: 'all', label: 'Any Budget' },
  { id: 'under-25k', label: 'Under ₹25,000' },
  { id: '25k-50k', label: '₹25,000 - ₹50,000' },
  { id: '50k-75k', label: '₹50,000 - ₹75,000' },
  { id: 'above-75k', label: 'Above ₹75,000' },
];

export function getProductBrand(product: Product): string {
  const name = product.name.toLowerCase();
  const tags = (product.tags || '').toLowerCase();
  for (const b of BRANDS) {
    if (name.includes(b.toLowerCase()) || tags.includes(b.toLowerCase())) {
      return b;
    }
  }
  return 'Other';
}

export function getProductProcessorGroup(product: Product): string {
  const proc = (product.metadata?.processor || product.name).toLowerCase();
  if (proc.includes('m1') || proc.includes('m2') || proc.includes('m3') || proc.includes('apple')) {
    return 'Apple M-Series';
  }
  if (proc.includes('i7') || proc.includes('core i7')) {
    return 'Intel Core i7';
  }
  if (proc.includes('i5') || proc.includes('core i5')) {
    return 'Intel Core i5';
  }
  if (proc.includes('ryzen') || proc.includes('amd')) {
    return 'AMD Ryzen';
  }
  return 'Other';
}

export function getProductRamGroup(product: Product): string {
  const ram = (product.metadata?.ram || product.name).toUpperCase();
  if (ram.includes('64GB')) return '64GB';
  if (ram.includes('32GB')) return '32GB';
  if (ram.includes('16GB')) return '16GB';
  if (ram.includes('8GB')) return '8GB';
  return 'Other';
}

export function getProductStorageGroup(product: Product): string {
  const storage = (product.metadata?.storage || product.name || '').toUpperCase().trim();
  if (storage.includes('2TB')) return '2TB SSD';
  if (storage.includes('1TB')) return '1TB SSD';
  if (storage.includes('512') || storage.includes('500GB')) return '512GB SSD';
  if (storage.includes('256')) return '256GB SSD';
  if (storage.includes('128')) return '128GB SSD';
  return storage || 'Other';
}

export function getProductGrade(product: Product): 'A+' | 'A' | 'B' {
  const condition = (product.metadata?.condition || '').toUpperCase();
  if (condition.includes('A+') || condition.includes('PRISTINE')) return 'A+';
  if (condition.includes('A') || condition.includes('EXCELLENT')) return 'A';
  return 'B';
}

export default function FilterSidebar({
  products,
  categories,
  filters,
  onFilterChange,
  onReset,
  onCloseMobile,
}: FilterSidebarProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    categories: true,
    brand: true,
    processor: true,
    ram: true,
    storage: true,
    price: true,
    grade: true,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Helper matcher function for faceted count computation
  const matchesFilter = (
    p: Product,
    override: Partial<FilterState> = {}
  ): boolean => {
    const f = { ...filters, ...override };

    // Search
    if (f.search.trim()) {
      const s = f.search.toLowerCase();
      const matchName = p.name.toLowerCase().includes(s);
      const matchSku = p.sku.toLowerCase().includes(s);
      const matchDesc = p.description?.toLowerCase().includes(s) || false;
      const matchTags = p.tags?.toLowerCase().includes(s) || false;
      if (!matchName && !matchSku && !matchDesc && !matchTags) return false;
    }

    // Category
    if (f.category !== 'all') {
      if (p.categoryId !== f.category && p.category?.slug !== f.category) return false;
    }

    // Brand
    if (f.brands.length > 0) {
      const brand = getProductBrand(p);
      if (!f.brands.includes(brand)) return false;
    }

    // Processor
    if (f.processors.length > 0) {
      const proc = getProductProcessorGroup(p);
      if (!f.processors.includes(proc)) return false;
    }

    // RAM
    if (f.rams.length > 0) {
      const ram = getProductRamGroup(p);
      if (!f.rams.includes(ram)) return false;
    }

    // Storage
    if (f.storages.length > 0) {
      const st = getProductStorageGroup(p);
      if (!f.storages.includes(st)) return false;
    }

    // Grade
    if (f.grades.length > 0) {
      const grade = getProductGrade(p);
      if (!f.grades.includes(grade)) return false;
    }

    // Price
    const price = Number(p.price);
    if (f.priceRange === 'under-25k' && price > 25000) return false;
    if (f.priceRange === '25k-50k' && (price < 25000 || price > 50000)) return false;
    if (f.priceRange === '50k-75k' && (price < 50000 || price > 75000)) return false;
    if (f.priceRange === 'above-75k' && price < 75000) return false;

    // Stock
    if (f.stockOnly && p.stock <= 0) return false;

    return true;
  };

  // TODO: move counts to API if catalog grows
  // Computes counts for each option after applying ALL OTHER active filters
  const counts = useMemo(() => {
    // Brand counts (ignore active brands filter)
    const brandCounts: Record<string, number> = {};
    BRANDS.forEach((b) => {
      brandCounts[b] = products.filter((p) => {
        if (getProductBrand(p) !== b) return false;
        return matchesFilter(p, { brands: [] });
      }).length;
    });

    // Processor counts (ignore active processor filter)
    const procCounts: Record<string, number> = {};
    PROCESSORS.forEach((proc) => {
      procCounts[proc] = products.filter((p) => {
        if (getProductProcessorGroup(p) !== proc) return false;
        return matchesFilter(p, { processors: [] });
      }).length;
    });

    // RAM counts (ignore active RAM filter)
    const ramCounts: Record<string, number> = {};
    RAMS.forEach((ram) => {
      ramCounts[ram] = products.filter((p) => {
        if (getProductRamGroup(p) !== ram) return false;
        return matchesFilter(p, { rams: [] });
      }).length;
    });

    // Storage counts (ignore active storage filter)
    const storageCounts: Record<string, number> = {};
    STORAGES.forEach((st) => {
      storageCounts[st] = products.filter((p) => {
        if (getProductStorageGroup(p) !== st) return false;
        return matchesFilter(p, { storages: [] });
      }).length;
    });

    // Grade counts
    const gradeCounts: Record<string, number> = {};
    GRADES.forEach((g) => {
      gradeCounts[g.id] = products.filter((p) => {
        if (getProductGrade(p) !== g.id) return false;
        return matchesFilter(p, { grades: [] });
      }).length;
    });

    // Category counts
    const catCounts: Record<string, number> = {};
    categories.forEach((cat) => {
      catCounts[cat.id] = products.filter((p) => {
        if (p.categoryId !== cat.id && p.category?.slug !== cat.slug) return false;
        return matchesFilter(p, { category: 'all' });
      }).length;
    });

    // Price range counts
    const priceCounts: Record<string, number> = {
      all: products.filter((p) => matchesFilter(p, { priceRange: 'all' })).length,
      'under-25k': products.filter((p) => matchesFilter(p, { priceRange: 'under-25k' })).length,
      '25k-50k': products.filter((p) => matchesFilter(p, { priceRange: '25k-50k' })).length,
      '50k-75k': products.filter((p) => matchesFilter(p, { priceRange: '50k-75k' })).length,
      'above-75k': products.filter((p) => matchesFilter(p, { priceRange: 'above-75k' })).length,
    };

    return { brandCounts, procCounts, ramCounts, storageCounts, gradeCounts, catCounts, priceCounts };
  }, [products, filters, categories]);

  const activeCount = useMemo(() => {
    let count = 0;
    if (filters.category !== 'all') count++;
    if (filters.search.trim()) count++;
    if (filters.listingType !== 'all') count++;
    if (filters.priceRange !== 'all') count++;
    if (filters.stockOnly) count++;
    count += filters.brands.length;
    count += filters.processors.length;
    count += filters.rams.length;
    count += filters.storages.length;
    count += filters.grades.length;
    return count;
  }, [filters]);

  const toggleArrayItem = (field: 'brands' | 'processors' | 'rams' | 'storages' | 'grades', item: string) => {
    const list = filters[field];
    const next = list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
    onFilterChange({ ...filters, [field]: next });
  };

  return (
    <div className="flex flex-col gap-5 text-sm">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E4E9F2]">
        <div className="flex items-center gap-2">
          <h3 className="font-black text-base text-[#0B1F4B] tracking-tight">
            Filters
          </h3>
          {activeCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[#1D6FF2] text-white text-xs font-bold font-mono">
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button
            onClick={onReset}
            className="text-xs text-[#1D6FF2] hover:text-[#1558C0] font-bold hover:underline cursor-pointer"
          >
            Reset All
          </button>
        )}
      </div>

      {/* Buy / Lease Model Toggle */}
      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
          Purchase Model
        </label>
        <div className="grid grid-cols-3 gap-1 bg-[#F1F5F9] p-1 rounded-xl border border-[#E4E9F2]">
          {(['all', 'buy', 'lease'] as const).map((type) => {
            const isSelected = filters.listingType === type;
            const label = type === 'all' ? 'All' : type === 'buy' ? 'Outright Buy' : 'Lease';
            return (
              <button
                key={type}
                type="button"
                onClick={() => onFilterChange({ ...filters, listingType: type })}
                className={`py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white text-[#0B1F4B] shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search Input */}
      <div>
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
          Search Within Laptops
        </label>
        <div className="relative">
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            placeholder="e.g. ThinkPad, M2, RTX..."
            className="w-full px-3 py-2 pl-8 rounded-xl bg-[#F8FAFC] border border-[#E4E9F2] text-[#0F172A] text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#1D6FF2] focus:bg-white transition-colors"
          />
          <svg
            className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          {filters.search && (
            <button
              onClick={() => onFilterChange({ ...filters, search: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Categories Group */}
      <div className="border-t border-[#E4E9F2] pt-4">
        <button
          onClick={() => toggleSection('categories')}
          className="w-full flex items-center justify-between text-xs font-bold text-[#0B1F4B] hover:text-[#1D6FF2] transition-colors pb-2 cursor-pointer uppercase tracking-wider"
        >
          <span>Category</span>
          <svg
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
              openSections.categories ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {openSections.categories && (
          <div className="space-y-1 pt-1">
            <button
              onClick={() => onFilterChange({ ...filters, category: 'all' })}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                filters.category === 'all'
                  ? 'bg-[#1D6FF2] text-white font-bold shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-[#0B1F4B]'
              }`}
            >
              <span>All Categories</span>
              <span className="text-[10px] opacity-80 font-mono">{products.length}</span>
            </button>
            {categories.map((cat) => {
              const count = counts.catCounts[cat.id] || counts.catCounts[cat.slug] || 0;
              const isSelected = filters.category === cat.id || filters.category === cat.slug;
              const isDimmed = count === 0 && !isSelected;
              return (
                <button
                  key={cat.id}
                  onClick={() => onFilterChange({ ...filters, category: cat.id })}
                  disabled={isDimmed}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#1D6FF2] text-white font-bold shadow-sm'
                      : isDimmed
                        ? 'opacity-40 cursor-not-allowed text-slate-400'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-[#0B1F4B]'
                  }`}
                >
                  <span className="truncate text-left">{cat.name}</span>
                  <span className="text-[10px] opacity-80 font-mono shrink-0 ml-1">{count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 1. BRAND Group (Collapsible Checkboxes) */}
      <div className="border-t border-[#E4E9F2] pt-4">
        <button
          onClick={() => toggleSection('brand')}
          className="w-full flex items-center justify-between text-xs font-bold text-[#0B1F4B] hover:text-[#1D6FF2] transition-colors pb-2 cursor-pointer uppercase tracking-wider"
        >
          <div className="flex items-center gap-1.5">
            <span>Brand</span>
            {filters.brands.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-[#1D6FF2] font-bold font-mono">
                {filters.brands.length}
              </span>
            )}
          </div>
          <svg
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
              openSections.brand ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {openSections.brand && (
          <div className="space-y-1.5 pt-1">
            {BRANDS.map((b) => {
              const count = counts.brandCounts[b] || 0;
              const isChecked = filters.brands.includes(b);
              const isDimmed = count === 0 && !isChecked;
              return (
                <label
                  key={b}
                  className={`flex items-center justify-between text-xs py-1 px-1.5 rounded-lg transition-colors cursor-pointer group ${
                    isDimmed ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isDimmed}
                      onChange={() => toggleArrayItem('brands', b)}
                      className="w-4 h-4 rounded border-[#CBD5E1] text-[#1D6FF2] focus:ring-[#1D6FF2] cursor-pointer"
                    />
                    <span className={isChecked ? 'font-bold text-[#0B1F4B]' : 'text-slate-700'}>{b}</span>
                  </div>
                  <span className="text-[10px] font-mono font-medium text-slate-400 group-hover:text-slate-600">
                    ({count})
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. PROCESSOR Group (Collapsible Checkboxes) */}
      <div className="border-t border-[#E4E9F2] pt-4">
        <button
          onClick={() => toggleSection('processor')}
          className="w-full flex items-center justify-between text-xs font-bold text-[#0B1F4B] hover:text-[#1D6FF2] transition-colors pb-2 cursor-pointer uppercase tracking-wider"
        >
          <div className="flex items-center gap-1.5">
            <span>Processor</span>
            {filters.processors.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-[#1D6FF2] font-bold font-mono">
                {filters.processors.length}
              </span>
            )}
          </div>
          <svg
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
              openSections.processor ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {openSections.processor && (
          <div className="space-y-1.5 pt-1">
            {PROCESSORS.map((proc) => {
              const count = counts.procCounts[proc] || 0;
              const isChecked = filters.processors.includes(proc);
              const isDimmed = count === 0 && !isChecked;
              return (
                <label
                  key={proc}
                  className={`flex items-center justify-between text-xs py-1 px-1.5 rounded-lg transition-colors cursor-pointer group ${
                    isDimmed ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isDimmed}
                      onChange={() => toggleArrayItem('processors', proc)}
                      className="w-4 h-4 rounded border-[#CBD5E1] text-[#1D6FF2] focus:ring-[#1D6FF2] cursor-pointer"
                    />
                    <span className={isChecked ? 'font-bold text-[#0B1F4B]' : 'text-slate-700'}>{proc}</span>
                  </div>
                  <span className="text-[10px] font-mono font-medium text-slate-400 group-hover:text-slate-600">
                    ({count})
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. RAM Group (Collapsible Checkboxes) */}
      <div className="border-t border-[#E4E9F2] pt-4">
        <button
          onClick={() => toggleSection('ram')}
          className="w-full flex items-center justify-between text-xs font-bold text-[#0B1F4B] hover:text-[#1D6FF2] transition-colors pb-2 cursor-pointer uppercase tracking-wider"
        >
          <div className="flex items-center gap-1.5">
            <span>RAM</span>
            {filters.rams.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-[#1D6FF2] font-bold font-mono">
                {filters.rams.length}
              </span>
            )}
          </div>
          <svg
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
              openSections.ram ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {openSections.ram && (
          <div className="space-y-1.5 pt-1">
            {RAMS.map((ram) => {
              const count = counts.ramCounts[ram] || 0;
              const isChecked = filters.rams.includes(ram);
              const isDimmed = count === 0 && !isChecked;
              return (
                <label
                  key={ram}
                  className={`flex items-center justify-between text-xs py-1 px-1.5 rounded-lg transition-colors cursor-pointer group ${
                    isDimmed ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isDimmed}
                      onChange={() => toggleArrayItem('rams', ram)}
                      className="w-4 h-4 rounded border-[#CBD5E1] text-[#1D6FF2] focus:ring-[#1D6FF2] cursor-pointer"
                    />
                    <span className={isChecked ? 'font-bold text-[#0B1F4B]' : 'text-slate-700'}>{ram}</span>
                  </div>
                  <span className="text-[10px] font-mono font-medium text-slate-400 group-hover:text-slate-600">
                    ({count})
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. STORAGE Group (Collapsible Checkboxes) */}
      <div className="border-t border-[#E4E9F2] pt-4">
        <button
          onClick={() => toggleSection('storage')}
          className="w-full flex items-center justify-between text-xs font-bold text-[#0B1F4B] hover:text-[#1D6FF2] transition-colors pb-2 cursor-pointer uppercase tracking-wider"
        >
          <div className="flex items-center gap-1.5">
            <span>Storage (SSD)</span>
            {filters.storages.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-[#1D6FF2] font-bold font-mono">
                {filters.storages.length}
              </span>
            )}
          </div>
          <svg
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
              openSections.storage ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {openSections.storage && (
          <div className="space-y-1.5 pt-1">
            {STORAGES.map((st) => {
              const count = counts.storageCounts[st] || 0;
              const isChecked = filters.storages.includes(st);
              const isDimmed = count === 0 && !isChecked;
              return (
                <label
                  key={st}
                  className={`flex items-center justify-between text-xs py-1 px-1.5 rounded-lg transition-colors cursor-pointer group ${
                    isDimmed ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isDimmed}
                      onChange={() => toggleArrayItem('storages', st)}
                      className="w-4 h-4 rounded border-[#CBD5E1] text-[#1D6FF2] focus:ring-[#1D6FF2] cursor-pointer"
                    />
                    <span className={isChecked ? 'font-bold text-[#0B1F4B]' : 'text-slate-700'}>{st}</span>
                  </div>
                  <span className="text-[10px] font-mono font-medium text-slate-400 group-hover:text-slate-600">
                    ({count})
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Condition Grade Filter */}
      <div className="border-t border-[#E4E9F2] pt-4">
        <button
          onClick={() => toggleSection('grade')}
          className="w-full flex items-center justify-between text-xs font-bold text-[#0B1F4B] hover:text-[#1D6FF2] transition-colors pb-2 cursor-pointer uppercase tracking-wider"
        >
          <div className="flex items-center gap-1.5">
            <span>Condition Grade</span>
            {filters.grades.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-[#1D6FF2] font-bold font-mono">
                {filters.grades.length}
              </span>
            )}
          </div>
          <svg
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
              openSections.grade ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {openSections.grade && (
          <div className="space-y-1.5 pt-1">
            {GRADES.map((g) => {
              const count = counts.gradeCounts[g.id] || 0;
              const isChecked = filters.grades.includes(g.id);
              const isDimmed = count === 0 && !isChecked;
              return (
                <label
                  key={g.id}
                  className={`flex items-center justify-between text-xs py-1 px-1.5 rounded-lg transition-colors cursor-pointer group ${
                    isDimmed ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={isDimmed}
                      onChange={() => toggleArrayItem('grades', g.id)}
                      className="w-4 h-4 rounded border-[#CBD5E1] text-[#1D6FF2] focus:ring-[#1D6FF2] cursor-pointer"
                    />
                    <span className={isChecked ? 'font-bold text-[#0B1F4B]' : 'text-slate-700'}>{g.label}</span>
                  </div>
                  <span className="text-[10px] font-mono font-medium text-slate-400 group-hover:text-slate-600">
                    ({count})
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Price Range Filter */}
      <div className="border-t border-[#E4E9F2] pt-4">
        <button
          onClick={() => toggleSection('price')}
          className="w-full flex items-center justify-between text-xs font-bold text-[#0B1F4B] hover:text-[#1D6FF2] transition-colors pb-2 cursor-pointer uppercase tracking-wider"
        >
          <span>Price Bracket</span>
          <svg
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
              openSections.price ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {openSections.price && (
          <div className="space-y-1.5 pt-1">
            {PRICE_RANGES.map((pr) => {
              const count = counts.priceCounts[pr.id] || 0;
              const isSelected = filters.priceRange === pr.id;
              const isDimmed = count === 0 && !isSelected;
              return (
                <label
                  key={pr.id}
                  className={`flex items-center justify-between text-xs py-1 px-1.5 rounded-lg transition-colors cursor-pointer group ${
                    isDimmed ? 'opacity-40 cursor-not-allowed' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="filter-price-range"
                      checked={isSelected}
                      disabled={isDimmed}
                      onChange={() => onFilterChange({ ...filters, priceRange: pr.id })}
                      className="text-[#1D6FF2] focus:ring-[#1D6FF2] cursor-pointer"
                    />
                    <span className={isSelected ? 'font-bold text-[#0B1F4B]' : 'text-slate-700'}>{pr.label}</span>
                  </div>
                  <span className="text-[10px] font-mono font-medium text-slate-400 group-hover:text-slate-600">
                    ({count})
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* In-Stock Only (Ready for Dispatch) */}
      <div className="border-t border-[#E4E9F2] pt-4">
        <label className="flex items-center justify-between text-xs font-semibold text-slate-700 cursor-pointer group py-1 px-1.5 rounded-lg hover:bg-slate-50">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.stockOnly}
              onChange={(e) => onFilterChange({ ...filters, stockOnly: e.target.checked })}
              className="w-4 h-4 rounded border-[#CBD5E1] text-[#1D6FF2] focus:ring-[#1D6FF2] cursor-pointer"
            />
            <span className="group-hover:text-[#0B1F4B] transition-colors">In-Stock Only</span>
          </div>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Ready for Dispatch
          </span>
        </label>
      </div>

      {/* Mobile drawer apply button */}
      {onCloseMobile && (
        <div className="pt-4 border-t border-[#E4E9F2] mt-2">
          <button
            onClick={onCloseMobile}
            className="w-full py-3 rounded-xl bg-[#1D6FF2] hover:bg-[#1558C0] text-white font-bold text-xs shadow-md shadow-blue-500/20 active:scale-95 transition-all text-center cursor-pointer"
          >
            Apply Filters
          </button>
        </div>
      )}
    </div>
  );
}

