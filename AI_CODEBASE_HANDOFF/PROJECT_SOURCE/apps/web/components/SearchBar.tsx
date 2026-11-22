'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Product } from '../lib/types';
import { api } from '../lib/api';

interface SearchBarProps {
  className?: string;
  mobile?: boolean;
}

export default function SearchBar({ className = '', mobile = false }: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  /* ── Debounced search ── */
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((value: string) => {
    setQuery(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (value.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await api.getProducts({ search: value.trim(), limit: 5 });
        setResults(res.products || []);
        setIsOpen(true);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);
  }, []);

  /* ── Submit (full search page) ── */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/products?search=${encodeURIComponent(query.trim())}`);
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  /* ── Close on outside click ── */
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  /* ── Keyboard shortcut: / to focus ── */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div ref={containerRef} className={['relative', className].join(' ')}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => results.length > 0 && setIsOpen(true)}
            placeholder="Search MacBook, ThinkPad, i7 16GB, RTX Gaming..."
            className={[
              'w-full pl-10 pr-24 py-2.5 text-sm rounded-[var(--radius-full)]',
              'bg-[var(--bg-elevated)] border border-[var(--border-default)]',
              'text-[var(--text-primary)] placeholder-[var(--text-muted)]',
              'transition-all duration-[var(--duration-normal)]',
              'focus:outline-none focus:border-[var(--accent)] focus:shadow-glow',
            ].join(' ')}
            aria-label="Search laptops"
            aria-expanded={isOpen}
            aria-controls="search-results"
            role="combobox"
            aria-autocomplete="list"
          />
          {/* Search icon */}
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-muted)]">
            {isLoading ? (
              <svg className="w-4 h-4 animate-spin-slow" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </div>
          {/* Submit button */}
          <button
            type="submit"
            className={[
              'absolute inset-y-1.5 right-1.5 px-4',
              'bg-[var(--accent)] text-[var(--bg-deep)]',
              'rounded-[var(--radius-full)] text-xs font-bold',
              'hover:bg-[var(--accent-dim)] transition-colors',
              mobile ? 'hidden' : '',
            ].join(' ')}
          >
            Search
          </button>
          {/* Keyboard hint (desktop only) */}
          {!mobile && !query && (
            <div className="absolute inset-y-0 right-14 flex items-center pointer-events-none">
              <kbd className="px-1.5 py-0.5 text-[10px] text-[var(--text-muted)] bg-[var(--bg-deep)] border border-[var(--border-default)] rounded font-mono">
                /
              </kbd>
            </div>
          )}
        </div>
      </form>

      {/* Results dropdown */}
      {isOpen && results.length > 0 && (
        <div
          id="search-results"
          role="listbox"
          className={[
            'absolute top-full left-0 right-0 mt-2 z-50',
            'bg-[var(--bg-surface)] border border-[var(--border-default)]',
            'rounded-[var(--radius-lg)] shadow-xl overflow-hidden',
          ].join(' ')}
        >
          {results.map((product) => (
            <button
              key={product.id}
              onClick={() => {
                router.push(`/products/${product.id}`);
                setIsOpen(false);
                setQuery('');
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[var(--bg-elevated)] transition-colors"
              role="option"
            >
              <div className="w-10 h-10 rounded-[var(--radius-sm)] bg-[var(--bg-elevated)] overflow-hidden shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={product.images?.[0]?.url || 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=100&q=60'}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">{product.name}</p>
                <p className="text-xs text-[var(--text-muted)]">
                  ₹{Number(product.price).toLocaleString('en-IN')}
                  {product.category?.name && ` • ${product.category.name}`}
                </p>
              </div>
            </button>
          ))}
          <button
            onClick={() => {
              router.push(`/products?search=${encodeURIComponent(query.trim())}`);
              setIsOpen(false);
            }}
            className="w-full px-4 py-3 text-sm text-[var(--accent)] text-center hover:bg-[var(--bg-elevated)] transition-colors font-medium border-t border-[var(--border-subtle)]"
          >
            View all results for &ldquo;{query}&rdquo;
          </button>
        </div>
      )}

      {/* No results */}
      {isOpen && results.length === 0 && !isLoading && query.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-[var(--bg-surface)] border border-[var(--border-default)] rounded-[var(--radius-lg)] shadow-xl p-4 text-center">
          <p className="text-sm text-[var(--text-muted)]">No results for &ldquo;{query}&rdquo;</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Try different keywords or browse all laptops</p>
        </div>
      )}
    </div>
  );
}
