'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Product } from '../lib/types';
import { useCart } from '../lib/cart-context';
import { useWishlist } from '../lib/wishlist-context';

export default function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const [added, setAdded] = useState(false);

  const isWish = isInWishlist(product.id);
  const primaryImg = product.images?.find(i => i.isPrimary)?.url || product.images?.[0]?.url || 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80';

  const priceNum = Number(product.price);
  const compareNum = product.compareAtPrice ? Number(product.compareAtPrice) : null;
  const discountPercent = compareNum && compareNum > priceNum
    ? Math.round(((compareNum - priceNum) / compareNum) * 100)
    : null;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
  };

  return (
    <div className="group relative bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm hover:shadow-xl hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all duration-300 flex flex-col">
      {/* Top badges */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-none">
        {discountPercent && (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-600 text-white shadow-sm">
            {discountPercent}% OFF
          </span>
        )}
        {product.isFeatured && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-zinc-950 uppercase tracking-wider shadow-sm">
            Featured
          </span>
        )}
      </div>

      {/* Wishlist toggle button */}
      <button
        onClick={handleToggleWishlist}
        aria-label={isWish ? 'Remove from wishlist' : 'Add to wishlist'}
        className={`absolute top-3 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
          isWish
            ? 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-400'
            : 'bg-white/80 dark:bg-zinc-800/80 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400'
        } backdrop-blur-sm shadow-sm`}
      >
        <svg
          className="w-4 h-4"
          fill={isWish ? 'currentColor' : 'none'}
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </button>

      {/* Product Image Link */}
      <Link href={`/products/${product.id}`} className="block relative aspect-[4/3] overflow-hidden bg-zinc-100 dark:bg-zinc-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={primaryImg}
          alt={product.name}
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
          <span className="px-2 py-0.5 rounded bg-zinc-900/80 text-white text-[10px] font-medium backdrop-blur-xs">
            Grade A+ Certified
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-700/80 text-white text-[10px] font-medium backdrop-blur-xs">
            1-Yr Warranty
          </span>
        </div>
      </Link>

      {/* Product Details */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          {/* Category / SKU */}
          <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400 mb-1">
            <span>{product.category?.name || 'Refurbished Laptop'}</span>
            <span className="font-mono text-[10px]">{product.sku}</span>
          </div>

          {/* Title */}
          <Link href={`/products/${product.id}`} className="block group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-snug mb-2">
              {product.name}
            </h3>
          </Link>

          {/* Specs tags */}
          <div className="flex flex-wrap gap-1 mb-3">
            {product.metadata?.ram && (
              <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[10px] font-medium">
                {product.metadata.ram.split(' ')[0]} {product.metadata.ram.includes('GB') ? 'RAM' : ''}
              </span>
            )}
            {product.metadata?.storage && (
              <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[10px] font-medium">
                {product.metadata.storage.split(' ')[0]} SSD
              </span>
            )}
            {product.metadata?.processor && (
              <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[10px] font-medium truncate max-w-[130px]">
                {product.metadata.processor.split('(')[0].trim()}
              </span>
            )}
          </div>
        </div>

        {/* Pricing & CTA */}
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-2">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-black text-zinc-900 dark:text-white">
                ₹{priceNum.toLocaleString('en-IN')}
              </span>
              {compareNum && (
                <span className="text-xs line-through text-zinc-400">
                  ₹{compareNum.toLocaleString('en-IN')}
                </span>
              )}
            </div>
            {compareNum && (
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                Save ₹{(compareNum - priceNum).toLocaleString('en-IN')}
              </p>
            )}
          </div>

          <button
            onClick={handleAddToCart}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
              added
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 active:scale-95'
            }`}
          >
            {added ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
                <span>Added</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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
