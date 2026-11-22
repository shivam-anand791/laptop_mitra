'use client';

import React from 'react';
import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import EmptyState from '@/components/EmptyState';
import { useWishlist } from '@/lib/wishlist-context';
import { Heart, Sparkles } from 'lucide-react';

interface WishlistViewProps {
  embeddedInAccount?: boolean;
}

export function WishlistView({ embeddedInAccount = false }: WishlistViewProps) {
  const { items, count } = useWishlist();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-[#FFFDF9] rounded-3xl border border-[#E6DFD5] p-6 sm:p-7 shadow-xs space-y-4 animate-fade-in-up">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0B1F4B] tracking-tight flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-500 fill-rose-500 animate-heart-beat" />
              Saved Laptops &amp; Wishlist
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Keep track of price drops, inventory availability, and compare your favorite certified laptops.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center">
            <span className="text-xs font-semibold text-slate-700 bg-[#FAF6EF] border border-[#E6DFD5] px-3.5 py-1.5 rounded-xl shadow-2xs">
              <strong className="text-[#0B1F4B] tabular-nums">{count}</strong>{' '}
              {count === 1 ? 'Laptop' : 'Laptops'} Saved
            </span>
            <Link
              href="/products"
              className="text-xs font-semibold text-[#1D6FF2] hover:underline"
            >
              Continue Shopping →
            </Link>
          </div>
        </div>
      </div>

      {/* Grid or Empty State */}
      {count === 0 ? (
        <div className="bg-[#FFFDF9] rounded-3xl border border-[#E6DFD5] p-6 sm:p-8 shadow-xs">
          <div className="max-w-md mx-auto">
            <EmptyState
              variant="wishlist"
              actionLabel="Explore Certified Laptops"
              actionHref="/products"
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {items.map((product, idx) => (
            <div
              key={product.id}
              className={`animate-fade-in-up stagger-${(idx % 6) + 1}`}
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

