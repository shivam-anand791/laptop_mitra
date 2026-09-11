'use client';

import React, { useState, useMemo } from 'react';
import { Category, Product } from '../lib/types';

export interface FilterState {
  category: string;
  search: string;
  brands: string[];
  processors: string[];
  rams: string[];
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

const BRANDS = ['Apple', 'Lenovo', 'Dell', 'HP', 'ASUS', 'Acer'];
const PROCESSORS = ['Apple M-Series', 'Intel Core i7', 'Intel Core i5', 'AMD Ryzen'];
const RAMS = ['8GB', '16GB', '32GB'];
const GRADES = [
  { id: 'A+', label: 'Grade A+ (Pristine)' },
  { id: 'A', label: 'Grade A (Excellent)' },
  { id: 'B', label: 'Grade B (Value)' },
];
const PRICE_RANGES = [
  { id: 'all', label: 'Any Budget' },
  { id: 'under-40k', label: 'Under ₹40,000' },
  { id: '40k-70k', label: '₹40,000 - ₹70,000' },
  { id: '70k-100k', label: '₹70,000 - ₹1,00,000' },
  { id: 'above-100k', label: 'Above ₹1,00,000' },
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
  if (ram.includes('32GB') || ram.includes('64GB')) return '32GB';
  if (ram.includes('16GB')) return '16GB';
  if (ram.includes('8GB')) return '8GB';
  return 'Other';
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
  // Accordion open/collapse states
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    categories: true,
    brand: true,
    price: true,
    processor: true,
    ram: true,
    grade: true,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Compute counts for each facet based on base products
  const counts = useMemo(() => {
    const brandCounts: Record<string, number> = {};
    const procCounts: Record<string, number> = {};
    const ramCounts: Record<string, number> = {};
    const gradeCounts: Record<string, number> = {};
    const catCounts: Record<string, number> = {};
    const priceCounts: Record<string, number> = {
      all: products.length,
      'under-40k': 0,
      '40k-70k': 0,
      '70k-100k': 0,
      'above-100k': 0,
    };

    products.forEach((p) => {
      // Brand
      const b = getProductBrand(p);
      brandCounts[b] = (brandCounts[b] || 0) + 1;

      // Processor
      const proc = getProductProcessorGroup(p);
      procCounts[proc] = (procCounts[proc] || 0) + 1;

      // RAM
      const ram = getProductRamGroup(p);
      ramCounts[ram] = (ramCounts[ram] || 0) + 1;

      // Grade
      const g = getProductGrade(p);
      gradeCounts[g] = (gradeCounts[g] || 0) + 1;

      // Category
      if (p.categoryId) {
        catCounts[p.categoryId] = (catCounts[p.categoryId] || 0) + 1;
      }
      if (p.category?.slug) {
        catCounts[p.category.slug] = (catCounts[p.category.slug] || 0) + 1;
      }

      // Price
      const price = Number(p.price);
      if (price < 40000) priceCounts['under-40k']++;
      else if (price <= 70000) priceCounts['40k-70k']++;
      else if (price <= 100000) priceCounts['70k-100k']++;
      else priceCounts['above-100k']++;
    });

    return { brandCounts, procCounts, ramCounts, gradeCounts, catCounts, priceCounts };
  }, [products]);

  // Active filter count
  const activeCount = useMemo(() => {
    let count = 0;
    if (filters.category !== 'all') count++;
    if (filters.search.trim()) count++;
    if (filters.priceRange !== 'all') count++;
    if (filters.stockOnly) count++;
    count += filters.brands.length;
    count += filters.processors.length;
    count += filters.rams.length;
    count += filters.grades.length;
    return count;
  }, [filters]);

  const toggleArrayItem = (field: 'brands' | 'processors' | 'rams' | 'grades', item: string) => {
    const list = filters[field];
    const next = list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
    onFilterChange({ ...filters, [field]: next });
  };

  return (
    <div className="flex flex-col gap-5 text-sm">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border-default)]">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-base text-[var(--text-primary)] font-display tracking-tight">
            Filters
          </h3>
          {activeCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-[var(--accent)] text-[var(--bg-deep)] text-xs font-bold font-mono">
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button
            onClick={onReset}
            className="text-xs text-[var(--accent)] font-semibold hover:underline transition-all cursor-pointer"
          >
            Reset All
          </button>
        )}
      </div>

      {/* Keyword Search */}
      <div>
        <label className="block text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1.5">
          Search Within Laptops
        </label>
        <div className="relative">
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            placeholder="e.g. ThinkPad, M2, RTX..."
            className="w-full px-3 py-2 pl-8 rounded-[var(--radius-md)] bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-primary)] text-xs placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
          <svg
            className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
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
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Category Accordion */}
      <div className="border-t border-[var(--border-subtle)] pt-4">
        <button
          onClick={() => toggleSection('categories')}
          className="w-full flex items-center justify-between text-xs font-bold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors pb-2 cursor-pointer uppercase tracking-wider"
        >
          <span>Category</span>
          <svg
            className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform duration-200 ${
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
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[var(--radius-md)] text-xs transition-colors cursor-pointer ${
                filters.category === 'all'
                  ? 'bg-[var(--accent)] text-[var(--bg-deep)] font-bold'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span>All Categories</span>
              <span className="text-[10px] opacity-75 font-mono">{products.length}</span>
            </button>
            {categories.map((cat) => {
              const count = counts.catCounts[cat.id] || counts.catCounts[cat.slug] || 0;
              const isSelected = filters.category === cat.id || filters.category === cat.slug;
              return (
                <button
                  key={cat.id}
                  onClick={() => onFilterChange({ ...filters, category: cat.id })}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[var(--radius-md)] text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[var(--accent)] text-[var(--bg-deep)] font-bold'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  <span className="truncate text-left">{cat.name}</span>
                  <span className="text-[10px] opacity-75 font-mono shrink-0 ml-1">{count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Brand Filter */}
      <div className="border-t border-[var(--border-subtle)] pt-4">
        <button
          onClick={() => toggleSection('brand')}
          className="w-full flex items-center justify-between text-xs font-bold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors pb-2 cursor-pointer uppercase tracking-wider"
        >
          <div className="flex items-center gap-1.5">
            <span>Brand</span>
            {filters.brands.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--accent-bg)] text-[var(--accent)] font-bold font-mono">
                {filters.brands.length}
              </span>
            )}
          </div>
          <svg
            className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform duration-200 ${
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
              return (
                <label
                  key={b}
                  className="flex items-center justify-between text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer group py-0.5"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleArrayItem('brands', b)}
                      className="w-3.5 h-3.5 rounded-[4px] border-[var(--border-default)] accent-[var(--accent)] bg-[var(--bg-elevated)] cursor-pointer"
                    />
                    <span className={isChecked ? 'font-semibold text-[var(--text-primary)]' : ''}>{b}</span>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]">
                    {count}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Processor Filter */}
      <div className="border-t border-[var(--border-subtle)] pt-4">
        <button
          onClick={() => toggleSection('processor')}
          className="w-full flex items-center justify-between text-xs font-bold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors pb-2 cursor-pointer uppercase tracking-wider"
        >
          <div className="flex items-center gap-1.5">
            <span>Processor</span>
            {filters.processors.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--accent-bg)] text-[var(--accent)] font-bold font-mono">
                {filters.processors.length}
              </span>
            )}
          </div>
          <svg
            className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform duration-200 ${
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
              return (
                <label
                  key={proc}
                  className="flex items-center justify-between text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer group py-0.5"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleArrayItem('processors', proc)}
                      className="w-3.5 h-3.5 rounded-[4px] border-[var(--border-default)] accent-[var(--accent)] bg-[var(--bg-elevated)] cursor-pointer"
                    />
                    <span className={isChecked ? 'font-semibold text-[var(--text-primary)]' : ''}>{proc}</span>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]">
                    {count}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* RAM Filter */}
      <div className="border-t border-[var(--border-subtle)] pt-4">
        <button
          onClick={() => toggleSection('ram')}
          className="w-full flex items-center justify-between text-xs font-bold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors pb-2 cursor-pointer uppercase tracking-wider"
        >
          <div className="flex items-center gap-1.5">
            <span>RAM</span>
            {filters.rams.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--accent-bg)] text-[var(--accent)] font-bold font-mono">
                {filters.rams.length}
              </span>
            )}
          </div>
          <svg
            className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform duration-200 ${
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
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            {RAMS.map((ram) => {
              const count = counts.ramCounts[ram] || 0;
              const isChecked = filters.rams.includes(ram);
              return (
                <button
                  key={ram}
                  type="button"
                  onClick={() => toggleArrayItem('rams', ram)}
                  className={`flex flex-col items-center justify-center p-2 rounded-[var(--radius-md)] border text-xs cursor-pointer transition-all ${
                    isChecked
                      ? 'border-[var(--accent)] bg-[var(--accent-bg)] text-[var(--accent)] font-bold shadow-sm'
                      : 'border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--text-muted)]'
                  }`}
                >
                  <span>{ram}</span>
                  <span className="text-[10px] opacity-70 font-mono mt-0.5">{count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Condition Grade Filter */}
      <div className="border-t border-[var(--border-subtle)] pt-4">
        <button
          onClick={() => toggleSection('grade')}
          className="w-full flex items-center justify-between text-xs font-bold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors pb-2 cursor-pointer uppercase tracking-wider"
        >
          <div className="flex items-center gap-1.5">
            <span>Condition Grade</span>
            {filters.grades.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[var(--accent-bg)] text-[var(--accent)] font-bold font-mono">
                {filters.grades.length}
              </span>
            )}
          </div>
          <svg
            className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform duration-200 ${
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
              return (
                <label
                  key={g.id}
                  className="flex items-center justify-between text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer group py-0.5"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleArrayItem('grades', g.id)}
                      className="w-3.5 h-3.5 rounded-[4px] border-[var(--border-default)] accent-[var(--accent)] bg-[var(--bg-elevated)] cursor-pointer"
                    />
                    <span className={isChecked ? 'font-semibold text-[var(--text-primary)]' : ''}>{g.label}</span>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]">
                    {count}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* Price Range Filter */}
      <div className="border-t border-[var(--border-subtle)] pt-4">
        <button
          onClick={() => toggleSection('price')}
          className="w-full flex items-center justify-between text-xs font-bold text-[var(--text-primary)] hover:text-[var(--accent)] transition-colors pb-2 cursor-pointer uppercase tracking-wider"
        >
          <span>Budget / Price</span>
          <svg
            className={`w-3.5 h-3.5 text-[var(--text-muted)] transition-transform duration-200 ${
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
              return (
                <label
                  key={pr.id}
                  className="flex items-center justify-between text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer group py-0.5"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="filter-price-range"
                      checked={isSelected}
                      onChange={() => onFilterChange({ ...filters, priceRange: pr.id })}
                      className="accent-[var(--accent)] cursor-pointer"
                    />
                    <span className={isSelected ? 'font-semibold text-[var(--text-primary)]' : ''}>{pr.label}</span>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]">
                    {count}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* In-Stock Toggle */}
      <div className="border-t border-[var(--border-subtle)] pt-4">
        <label className="flex items-center justify-between text-xs font-medium text-[var(--text-secondary)] cursor-pointer group">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filters.stockOnly}
              onChange={(e) => onFilterChange({ ...filters, stockOnly: e.target.checked })}
              className="w-3.5 h-3.5 rounded-[4px] border-[var(--border-default)] accent-[var(--accent)] cursor-pointer"
            />
            <span className="group-hover:text-[var(--text-primary)] transition-colors">In-Stock Only</span>
          </div>
          <span className="text-[10px] font-mono text-[var(--accent)]">Ready to Ship</span>
        </label>
      </div>

      {/* Mobile drawer apply button */}
      {onCloseMobile && (
        <div className="pt-4 border-t border-[var(--border-default)] mt-2">
          <button
            onClick={onCloseMobile}
            className="w-full py-2.5 rounded-[var(--radius-md)] bg-[var(--accent)] text-[var(--bg-deep)] font-bold text-xs shadow-md active:scale-95 transition-all text-center"
          >
            Apply Filters
          </button>
        </div>
      )}
    </div>
  );
}
