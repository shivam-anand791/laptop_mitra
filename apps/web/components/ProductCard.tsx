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

type ProductCardVariant = 'default' | 'compact' | 'featured';

interface ProductCardProps {
  product: Product;
  variant?: ProductCardVariant;
  onAddToCart?: (product: Product) => void;
  onToggleWishlist?: (product: Product) => void;
}

/* ── Grade from metadata ── */

function getGrade(product: Product): 'A+' | 'A' | 'B' {
  const condition = product.metadata?.condition?.toUpperCase() || '';
  if (condition.includes('A+') || condition.includes('PRISTINE')) return 'A+';
  if (condition.includes('A') || condition.includes('EXCELLENT')) return 'A';
  return 'B';
}

/* ── Discount percentage ── */

function getDiscount(product: Product): number | null {
  const price = Number(product.price);
  const compare = product.compareAtPrice ? Number(product.compareAtPrice) : null;
  if (!compare || compare <= price) return null;
  return Math.round(((compare - price) / compare) * 100);
}

/* ── Primary image ── */

function getPrimaryImage(product: Product): string {
  return (
    product.images?.find((i) => i.isPrimary)?.url ||
    product.images?.[0]?.url ||
    'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80'
  );
}

/* ──────────────────────────────────────────────
   DEFAULT VARIANT
   ────────────────────────────────────────────── */

function DefaultCard({ product, onAddToCart, onToggleWishlist }: ProductCardProps) {
  const { addItem } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [added, setAdded] = useState(false);

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
    setTimeout(() => setAdded(false), 1500);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
    onToggleWishlist?.(product);
  };

  return (
    <div
      className={[
        'group relative flex flex-col rounded-[var(--radius-xl)] overflow-hidden',
        'border border-[var(--border-default)] bg-[var(--bg-surface)]',
        'transition-all duration-[var(--duration-normal)] ease-[var(--ease-default)]',
        'hover:border-[var(--accent)]/40 hover:shadow-card-hover',
        !inStock && 'opacity-70',
      ].join(' ')}
      role="article"
      aria-label={product.name}
    >
      {/* Badges */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-none">
        {discount && (
          <span className="px-2 py-0.5 rounded-[var(--radius-sm)] text-[10px] font-bold bg-[var(--danger)] text-white shadow-sm">
            {discount}% OFF
          </span>
        )}
        {product.isFeatured && (
          <span className="px-2 py-0.5 rounded-[var(--radius-sm)] text-[10px] font-bold bg-[var(--warning)] text-[var(--bg-deep)] uppercase tracking-wider shadow-sm">
            Featured
          </span>
        )}
        {!inStock && (
          <span className="px-2 py-0.5 rounded-[var(--radius-sm)] text-[10px] font-bold bg-[var(--text-muted)] text-white shadow-sm">
            Out of Stock
          </span>
        )}
      </div>

      {/* Wishlist */}
      <button
        onClick={handleWishlist}
        aria-label={isWish ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
        className={[
          'absolute top-3 right-3 z-10 w-9 h-9 rounded-full flex items-center justify-center',
          'backdrop-blur-sm shadow-sm transition-all duration-[var(--duration-fast)]',
          isWish
            ? 'bg-[var(--danger)]/15 text-[var(--danger)]'
            : 'bg-[var(--bg-deep)]/60 text-[var(--text-muted)] hover:text-[var(--danger)]',
        ].join(' ')}
      >
        <svg
          className="w-4 h-4"
          fill={isWish ? 'currentColor' : 'none'}
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </button>

      {/* Image */}
      <Link href={`/products/${product.id}`} className="block relative aspect-[4/3] overflow-hidden bg-[var(--bg-elevated)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        {/* Grade + warranty overlay */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
          <GradeBadge grade={grade} size="sm" />
          <span className="px-2 py-0.5 rounded-[var(--radius-sm)] bg-[var(--bg-deep)]/80 text-white text-[10px] font-medium backdrop-blur-xs">
            1-Yr Warranty
          </span>
        </div>
      </Link>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div className="space-y-2">
          {/* Category + SKU */}
          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)]">
            <span>{product.category?.name || 'Refurbished Laptop'}</span>
            <span className="font-mono text-[10px]">{product.sku}</span>
          </div>

          {/* Title */}
          <Link href={`/products/${product.id}`} className="block group-hover:text-[var(--accent)] transition-colors">
            <h3 className="font-semibold text-sm text-[var(--text-primary)] line-clamp-2 leading-snug">
              {product.name}
            </h3>
          </Link>

          {/* Spec tags */}
          <div className="flex flex-wrap gap-1">
            {product.metadata?.ram && (
              <SpecTag variant="ram" value={product.metadata.ram} />
            )}
            {product.metadata?.storage && (
              <SpecTag variant="storage" value={product.metadata.storage} />
            )}
            {product.metadata?.processor && (
              <SpecTag variant="processor" value={product.metadata.processor.split('(')[0].trim()} />
            )}
          </div>
        </div>

        {/* Price + CTA */}
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
              'shrink-0 px-3.5 py-2 rounded-[var(--radius-md)] text-xs font-bold',
              'transition-all duration-[var(--duration-fast)] active:scale-95',
              'focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2',
              added
                ? 'bg-[var(--accent)] text-[var(--bg-deep)]'
                : inStock
                  ? 'bg-[var(--accent)] text-[var(--bg-deep)] hover:bg-[var(--accent-dim)] shadow-sm'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] cursor-not-allowed',
            ].join(' ')}
            aria-label={added ? 'Added to cart' : `Add ${product.name} to cart`}
          >
            {added ? (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Added
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add
              </span>
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
      className="flex gap-3 p-3 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-surface)] hover:border-[var(--accent)]/30 transition-all group"
    >
      <div className="w-16 h-16 rounded-[var(--radius-md)] overflow-hidden bg-[var(--bg-elevated)] shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img} alt={product.name} className="w-full h-full object-cover" loading="lazy" />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <h4 className="text-sm font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--accent)] transition-colors">
          {product.name}
        </h4>
        <div className="flex items-center gap-2">
          <GradeBadge grade={grade} size="sm" />
          <span className="text-xs text-[var(--text-muted)]">{product.sku}</span>
        </div>
        <PriceDisplay price={Number(product.price)} size="sm" />
      </div>
    </Link>
  );
}

/* ──────────────────────────────────────────────
   FEATURED VARIANT (homepage hero section)
   ────────────────────────────────────────────── */

function FeaturedCard({ product }: ProductCardProps) {
  const grade = getGrade(product);
  const discount = getDiscount(product);
  const img = getPrimaryImage(product);

  return (
    <Link
      href={`/products/${product.id}`}
      className="group block rounded-[var(--radius-2xl)] p-[2px] bg-gradient-to-tr from-[var(--accent)] via-[var(--info)] to-[var(--accent)] shadow-xl hover:shadow-glow transition-shadow"
    >
      <div className="rounded-[calc(var(--radius-2xl)-2px)] bg-[var(--bg-surface)] p-5 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <GradeBadge grade={grade} />
          {discount && (
            <span className="text-xs text-[var(--danger)] font-bold">{discount}% OFF</span>
          )}
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img}
          alt={product.name}
          className="w-full h-52 object-cover rounded-[var(--radius-lg)] mb-4 group-hover:scale-[1.02] transition-transform duration-500"
          loading="lazy"
        />

        <div className="space-y-2">
          <h3 className="text-lg font-bold text-[var(--text-primary)]">{product.name}</h3>
          <p className="text-xs text-[var(--text-muted)]">
            {product.metadata?.ram} • {product.metadata?.storage} • {product.metadata?.processor?.split('(')[0].trim()}
          </p>
          <div className="flex items-end justify-between pt-2">
            <PriceDisplay
              price={Number(product.price)}
              compareAtPrice={product.compareAtPrice ? Number(product.compareAtPrice) : undefined}
              size="md"
            />
            <span className="px-4 py-2 bg-[var(--accent)] text-[var(--bg-deep)] text-xs font-bold rounded-[var(--radius-md)] group-hover:bg-[var(--accent-dim)] transition-colors">
              Claim Offer →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ──────────────────────────────────────────────
   MAIN EXPORT
   ────────────────────────────────────────────── */

export default function ProductCard({ variant = 'default', ...props }: ProductCardProps) {
  switch (variant) {
    case 'compact':
      return <CompactCard {...props} />;
    case 'featured':
      return <FeaturedCard {...props} />;
    default:
      return <DefaultCard {...props} />;
  }
}
