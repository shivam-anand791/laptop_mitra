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
   DEFAULT PRODUCT CARD (LaptopMitra Light Theme matching Image 1)
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

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `https://wa.me/919999999999?text=${encodeURIComponent(
      `Hi LaptopMitra, I am interested in ${product.name} (SKU: ${product.sku}) priced at ₹${numPrice.toLocaleString('en-IN')}. Please share bulk/best quotation.`
    )}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className={[
        'group relative flex flex-col rounded-2xl overflow-hidden',
        'border border-[#E4E9F2] bg-white shadow-xs',
        'transition-all duration-300 ease-out',
        'hover:-translate-y-1 hover:border-[#1D6FF2]/40 hover:shadow-lg hover:shadow-blue-900/5',
        !inStock && 'opacity-75',
      ].join(' ')}
      role="article"
      aria-label={product.name}
    >
      {/* ── Top Floating Badges ── */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-none">
        {/* REFURB badge */}
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black bg-[#0B1F4B] text-white shadow-xs tracking-wider uppercase">
          REFURB
        </span>

        {/* Best Seller badge if featured */}
        {product.isFeatured && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#F97316] text-white uppercase tracking-wider shadow-xs">
            ⭐ Best Seller
          </span>
        )}

        {/* New Arrival badge */}
        {!product.isFeatured && product.isNewArrival && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#1D6FF2] text-white uppercase tracking-wider shadow-xs">
            ⚡ New Arrival
          </span>
        )}

        {/* Real Discount % Badge */}
        {discount && discount > 5 && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-600 text-white shadow-xs tracking-wide">
            {discount}% OFF
          </span>
        )}
      </div>

      {/* ── Top Right Quick Actions (WhatsApp + Wishlist) ── */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
        {/* Round WhatsApp Action Button */}
        <button
          onClick={handleWhatsApp}
          aria-label={`Get WhatsApp quote for ${product.name}`}
          title="Get WhatsApp Quote"
          className="w-9 h-9 rounded-full bg-[#25D366] hover:bg-[#20BD5A] text-white flex items-center justify-center shadow-xs transition-all duration-200 hover:scale-110 active:scale-95 cursor-pointer"
        >
          <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
          </svg>
        </button>

        {/* Wishlist Button */}
        <button
          onClick={handleWishlist}
          aria-label={isWish ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          className={[
            'w-9 h-9 rounded-full flex items-center justify-center cursor-pointer',
            'backdrop-blur-md shadow-xs transition-all duration-200',
            isWish
              ? 'bg-rose-50 text-rose-600 border border-rose-200'
              : 'bg-white/90 text-slate-400 border border-slate-200 hover:text-rose-600 hover:bg-white',
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
      </div>

      {/* ── Product Media Frame with Zoom on Hover ── */}
      <Link
        href={`/products/${product.id}`}
        className="block relative aspect-[4/3] overflow-hidden bg-[#F8FAFC] border-b border-[#E4E9F2]/70 cursor-pointer"
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
          <span className="px-2 py-0.5 rounded-md bg-white/95 text-slate-800 text-[10px] font-bold backdrop-blur-sm border border-slate-200/80 flex items-center gap-1 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#1D6FF2]" />
            1-Yr Warranty
          </span>
        </div>
      </Link>

      {/* ── Product Details matching Image 1 ── */}
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

          {/* Bulk Pricing Line */}
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
              'shrink-0 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer shadow-xs',
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
   COMPACT VARIANT
   ────────────────────────────────────────────── */

function CompactCard({ product }: ProductCardProps) {
  const grade = getGrade(product);
  const img = getPrimaryImage(product);

  return (
    <Link
      href={`/products/${product.id}`}
      className="flex gap-3 p-3 rounded-xl border border-[#E4E9F2] bg-white hover:border-[#1D6FF2]/40 hover:shadow-sm transition-all group"
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
  return <DefaultCard product={product} onAddToCart={onAddToCart} onToggleWishlist={onToggleWishlist} />;
}
