'use client';

import React from 'react';
import Link from 'next/link';
import CustomerLayout from '../../components/CustomerLayout';
import ProductCard from '../../components/ProductCard';
import EmptyState from '../../components/EmptyState';
import { useWishlist } from '../../lib/wishlist-context';

export default function WishlistPage() {
  const { items, count } = useWishlist();

  return (
    <CustomerLayout>
      <div className="bg-[#F8FAFC] min-h-screen py-6 sm:py-8 lg:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between pb-5 border-b border-[#E4E9F2] mb-6 sm:mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#0B1F4B] tracking-tight">
                Saved Wishlist
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                You have <strong className="text-[#0B1F4B] tabular-nums">{count}</strong> {count === 1 ? 'laptop' : 'laptops'} saved in your wishlist
              </p>
            </div>
            <Link
              href="/products"
              className="text-xs font-bold text-[#1D6FF2] hover:underline"
            >
              Continue Shopping →
            </Link>
          </div>

          {count === 0 ? (
            <div className="max-w-md mx-auto">
              <EmptyState
                variant="wishlist"
                actionLabel="Explore Certified Laptops"
                actionHref="/products"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {items.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}
