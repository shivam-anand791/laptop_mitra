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

/* ── Discount percentage from real MRP vs price ── */
export function getDiscount(product: Product): number | null {
  const price = Number(product.price);
  const compare = product.compareAtPrice ? Number(product.compareAtPrice) : null;
  if (!compare || compare <= price) return null;
  return Math.round(((compare - price) / compare) * 100);
}

/* ── Bulk Price estimate ── */
export function getBulkPrice(price: number): number {
  return Math.round(price * 0.93);
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
   DEFAULT PRODUCT CARD (LaptopMitra Light Theme)
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
  const numPrice = Number(product.price);
  const bulkPrice = getBulkPrice(numPrice);

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
        'group relative flex flex-col rounded-2xl overflow-hidden',
        'border border-[#E4E9F2] bg-white shadow-sm',
        'transition-all duration-300 ease-out',
        'hover:-translate-y-1 hover:border-[#1D6FF2]/40 hover:shadow-xl hover:shadow-blue-900/5',
        !inStock && 'opacity-75',
      ].join(' ')}
      role="article"
      aria-label={product.name}
    >
      {/* ── Top Floating Badges ── */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-none">
        {/* Always show REFURB badge */}
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-[#0B1F4B] text-white shadow-sm tracking-wider uppercase">
          REFURB
        </span>

        {/* Best Seller badge if featured */}
        {product.isFeatured && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#F97316] text-white uppercase tracking-wider shadow-sm">
            ⭐ Best Seller
          </span>
        )}

        {/* New Arrival badge (NOT Popular) */}
        {!product.isFeatured && product.isNewArrival && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#1D6FF2] text-white uppercase tracking-wider shadow-sm">
            ⚡ New Arrival
          </span>
        )}

        {/* Real Discount % Badge if MRP exists */}
        {discount && discount > 5 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-600 text-white shadow-sm tracking-wide">
            {discount}% OFF
          </span>
        )}

        {!inStock && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-600 text-white shadow-sm">
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
            ? 'bg-rose-50 text-rose-600 border border-rose-200'
            : 'bg-white/80 text-slate-400 border border-slate-200 hover:text-rose-600 hover:bg-white',
          isHeartPopping && 'scale-125',
        ].join(' ')}
      >
        <svg
          className="w-4 h-4 transition-transform duration-200 group-hover:scale-110"
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
        className="block relative aspect-[4/3] overflow-hidden bg-[#F8FAFC] border-b border-[#E4E9F2]/60 cursor-pointer"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          loading="lazy"
        />

        {/* Grade & Warranty Pills overlay */}
        <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          <GradeBadge grade={grade} size="sm" />
          <span className="px-2 py-0.5 rounded-md bg-white/90 text-slate-800 text-[10px] font-bold backdrop-blur-sm border border-slate-200/80 flex items-center gap-1 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1D6FF2]" />
            1-Yr Warranty
          </span>
        </div>
      </Link>

      {/* ── Product Details ── */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div className="space-y-2">
          {/* Category + Stock / Ready for Dispatch bar */}
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-500 truncate max-w-[130px]">
              {product.category?.name || 'Refurbished Laptop'}
            </span>
            {inStock ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold text-[10px] border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Ready for Dispatch • {product.stock} left
              </span>
            ) : (
              <span className="text-slate-400 font-medium text-[10px]">Out of stock</span>
            )}
          </div>

          {/* Title */}
          <Link
            href={`/products/${product.id}`}
            className="block group-hover:text-[#1D6FF2] transition-colors cursor-pointer"
          >
            <h3 className="font-bold text-sm text-[#0B1F4B] line-clamp-2 leading-snug">
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

          {/* Bulk Pricing Line (Required) */}
          <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200/80 px-2 py-1 rounded-md flex items-center justify-between font-medium">
            <span>Bulk (5+ units):</span>
            <strong className="text-[#0B1F4B] font-bold">₹{bulkPrice.toLocaleString('en-IN')}/pc</strong>
          </div>
        </div>

        {/* Price + Action Button */}
        <div className="pt-3 border-t border-[#E4E9F2] flex items-end justify-between gap-2">
          <PriceDisplay
            price={numPrice}
            compareAtPrice={product.compareAtPrice ? Number(product.compareAtPrice) : undefined}
            size="sm"
          />

          <button
            onClick={handleAdd}
            disabled={!inStock}
            className={[
              'shrink-0 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer shadow-sm',
              'transition-all duration-200 active:scale-95 flex items-center justify-center gap-1.5',
              added
                ? 'bg-emerald-600 text-white scale-105'
                : inStock
                  ? 'bg-[#1D6FF2] text-white hover:bg-[#1558C0] shadow-blue-500/20'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200',
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
                <span>Add to Cart</span>
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
      className="flex gap-3 p-3 rounded-xl border border-[#E4E9F2] bg-white hover:border-[#1D6FF2]/40 hover:shadow-md transition-all group"
    >
      <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-slate-50 border border-slate-100">
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
            <span className="text-[10px] font-mono text-slate-500 truncate">{product.sku}</span>
          </div>
          <h4 className="text-xs font-bold text-[#0B1F4B] truncate group-hover:text-[#1D6FF2] transition-colors">
            {product.name}
          </h4>
        </div>
        <PriceDisplay price={Number(product.price)} size="sm" />
      </div>
    </Link>
  );
}

/* ──────────────────────────────────────────────
   FEATURED VARIANT
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

