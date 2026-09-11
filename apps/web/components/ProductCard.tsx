'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Product } from '../lib/types';
import { useCart } from '../lib/cart-context';
import { useWishlist } from '../lib/wishlist-context';
import { GradeBadge } from './ui/Badge';
import SpecTag from './SpecTag';
import PriceDisplay from './PriceDisplay';

/* ── Variants ── */

export type ProductCardVariant = 'default' | 'compact' | 'featured';

export interface ProductCardProps {
  product: Product;
  variant?: ProductCardVariant;
  onAddToCart?: (product: Product) => void;
  onToggleWishlist?: (product: Product) => void;
}

/* ── Grade from metadata ── */

export function getGrade(product: Product): 'A+' | 'A' | 'B' {
  const condition = product.metadata?.condition?.toUpperCase() || '';
  if (condition.includes('A+') || condition.includes('PRISTINE')) return 'A+';
  if (condition.includes('A') || condition.includes('EXCELLENT')) return 'A';
  return 'B';
}

/* ── Discount percentage ── */

export function getDiscount(product: Product): number | null {
  const price = Number(product.price);
  const compare = product.compareAtPrice ? Number(product.compareAtPrice) : null;
  if (!compare || compare <= price) return null;
  return Math.round(((compare - price) / compare) * 100);
}

/* ── Primary image ── */

export function getPrimaryImage(product: Product): string {
  return (
    product.images?.find((i) => i.isPrimary)?.url ||
    product.images?.[0]?.url ||
    'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80'
  );
}

/* ──────────────────────────────────────────────
   ANIMATED PRODUCT CARD (21st.dev SmoothUI / educalvolpz style)
   ────────────────────────────────────────────── */

function DefaultCard({ product, onAddToCart, onToggleWishlist }: ProductCardProps) {
  const { addItem } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [added, setAdded] = useState(false);
  const [isHeartPopping, setIsHeartPopping] = useState(false);

  const isWish = isInWishlist(product.id);
  const grade = getGrade(product);
  const discount = getDiscount(product);
  const img = getPrimaryImage(product);
  const inStock = product.stock > 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!inStock) return;
    addItem(product, 1);
    setAdded(true);
    onAddToCart?.(product);
    setTimeout(() => setAdded(false), 1600);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsHeartPopping(true);
    toggleWishlist(product);
    onToggleWishlist?.(product);
    setTimeout(() => setIsHeartPopping(false), 400);
  };

  return (
    <div
      className={[
        'group relative flex flex-col rounded-[var(--radius-xl)] overflow-hidden',
        'border border-[var(--border-default)] bg-[var(--bg-surface)]',
        'transition-all duration-300 ease-out',
        'hover:-translate-y-1 hover:border-[var(--accent)]/40 hover:shadow-card-hover hover:shadow-lg',
        !inStock && 'opacity-75',
      ].join(' ')}
      role="article"
      aria-label={product.name}
    >
      {/* ── Top Floating Badges ── */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-none">
        {discount && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-[var(--radius-sm)] text-[10px] font-bold bg-[var(--danger)] text-white shadow-sm tracking-wide">
            {discount}% OFF
          </span>
        )}
        {product.isFeatured && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-[var(--radius-sm)] text-[10px] font-bold bg-[var(--warning)] text-[var(--bg-deep)] uppercase tracking-wider shadow-sm">
            Featured
          </span>
        )}
        {!inStock && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-[var(--radius-sm)] text-[10px] font-bold bg-[var(--text-muted)] text-white shadow-sm">
            Out of Stock
          </span>
        )}
      </div>

      {/* ── Top Right Wishlist Action ── */}
      <button
        onClick={handleWishlist}
        aria-label={isWish ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
        className={[
          'absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center cursor-pointer',
          'backdrop-blur-md shadow-sm transition-all duration-200',
          isWish
            ? 'bg-[var(--danger)]/15 text-[var(--danger)] border border-[var(--danger)]/30'
            : 'bg-[var(--bg-deep)]/70 text-[var(--text-muted)] border border-white/10 hover:text-[var(--danger)] hover:bg-[var(--bg-deep)]/90',
          isHeartPopping && 'scale-125',
        ].join(' ')}
      >
        <svg
          className="w-4 h-4 transition-transform duration-200 group-hover:scale-105"
          fill={isWish ? 'currentColor' : 'none'}
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      </button>

      {/* ── Product Media Frame with Zoom on Hover ── */}
      <Link
        href={`/products/${product.id}`}
        className="block relative aspect-[4/3] overflow-hidden bg-[var(--bg-elevated)] cursor-pointer"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-108"
          loading="lazy"
        />

        {/* Gradient vignette on image bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-surface)]/80 via-transparent to-transparent opacity-60 pointer-events-none" />

        {/* Grade & Warranty Pills overlay */}
        <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          <GradeBadge grade={grade} size="sm" />
          <span className="px-2 py-0.5 rounded-[var(--radius-sm)] bg-[var(--bg-deep)]/85 text-[var(--text-primary)] text-[10px] font-medium backdrop-blur-sm border border-white/10 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
            1-Yr Warranty
          </span>
        </div>
      </Link>

      {/* ── Product Details ── */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div className="space-y-2">
          {/* Category + SKU bar */}
          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
            <span className="font-medium truncate max-w-[150px]">
              {product.category?.name || 'Certified Laptop'}
            </span>
            <span className="font-mono text-[10px] tracking-wide">{product.sku}</span>
          </div>

          {/* Title */}
          <Link
            href={`/products/${product.id}`}
            className="block group-hover:text-[var(--accent)] transition-colors cursor-pointer"
          >
            <h3 className="font-semibold text-sm text-[var(--text-primary)] line-clamp-2 leading-snug">
              {product.name}
            </h3>
          </Link>

          {/* Glanceable Spec Summary Line */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {product.metadata?.ram && <SpecTag variant="ram" value={product.metadata.ram} />}
            {product.metadata?.storage && <SpecTag variant="storage" value={product.metadata.storage} />}
            {product.metadata?.processor && (
              <SpecTag variant="processor" value={product.metadata.processor.split('(')[0].trim()} />
            )}
          </div>
        </div>

        {/* Price + Action Button */}
        <div className="pt-3 border-t border-[var(--border-subtle)] flex items-end justify-between gap-2">
          <PriceDisplay
            price={Number(product.price)}
            compareAtPrice={product.compareAtPrice ? Number(product.compareAtPrice) : undefined}
            size="sm"
          />

          <button
            onClick={handleAdd}
            disabled={!inStock}
            className={[
              'shrink-0 px-3.5 py-2 rounded-[var(--radius-md)] text-xs font-bold cursor-pointer',
              'transition-all duration-200 active:scale-95 flex items-center justify-center gap-1.5',
              'focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2',
              added
                ? 'bg-[var(--accent)] text-[var(--bg-deep)] scale-105 shadow-glow'
                : inStock
                  ? 'bg-[var(--accent)] text-[var(--bg-deep)] hover:bg-[var(--accent-dim)] shadow-sm hover:shadow-glow'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] cursor-not-allowed border border-[var(--border-default)]',
            ].join(' ')}
            aria-label={added ? 'Added to cart' : `Add ${product.name} to cart`}
          >
            {added ? (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>Added</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                <span>Add</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   COMPACT VARIANT (for cart items, recommendations)
   ────────────────────────────────────────────── */

function CompactCard({ product }: ProductCardProps) {
  const grade = getGrade(product);
  const img = getPrimaryImage(product);

  return (
    <Link
      href={`/products/${product.id}`}
      className="flex gap-3 p-3 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-surface)] hover:border-[var(--accent)]/30 hover:shadow-sm transition-all group"
    >
      <div className="w-20 h-20 rounded-[var(--radius-md)] overflow-hidden shrink-0 bg-[var(--bg-elevated)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <GradeBadge grade={grade} size="sm" />
            <span className="text-[10px] font-mono text-[var(--text-muted)] truncate">{product.sku}</span>
          </div>
          <h4 className="text-xs font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors">
            {product.name}
          </h4>
        </div>
        <PriceDisplay price={Number(product.price)} size="sm" />
      </div>
    </Link>
  );
}

/* ──────────────────────────────────────────────
   FEATURED VARIANT (for hero / spotlight)
   ────────────────────────────────────────────── */

function FeaturedCard({ product, onAddToCart, onToggleWishlist }: ProductCardProps) {
  return <DefaultCard product={product} onAddToCart={onAddToCart} onToggleWishlist={onToggleWishlist} />;
}

/* ──────────────────────────────────────────────
   EXPORTED PRODUCT CARD COMPONENT
   ────────────────────────────────────────────── */

export default function ProductCard({
  product,
  variant = 'default',
  onAddToCart,
  onToggleWishlist,
}: ProductCardProps) {
  if (variant === 'compact') {
    return <CompactCard product={product} onAddToCart={onAddToCart} onToggleWishlist={onToggleWishlist} />;
  }
  if (variant === 'featured') {
    return <FeaturedCard product={product} onAddToCart={onAddToCart} onToggleWishlist={onToggleWishlist} />;
  }
  return <DefaultCard product={product} onAddToCart={onAddToCart} onToggleWishlist={onToggleWishlist} />;
}
