'use client';

import React from 'react';
import Link from 'next/link';
import CustomerLayout from '../../components/CustomerLayout';
import ProductCard from '../../components/ProductCard';
import { useWishlist } from '../../lib/wishlist-context';

export default function WishlistPage() {
  const { items, count } = useWishlist();

  return (
    <CustomerLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between pb-6 border-b border-zinc-200 dark:border-zinc-800 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white">
              My Saved Laptops
            </h1>
            <p className="text-xs text-zinc-500 mt-1">
              You have {count} {count === 1 ? 'laptop' : 'laptops'} saved in your wishlist
            </p>
          </div>
          <Link
            href="/products"
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            Continue Shopping →
          </Link>
        </div>

        {count === 0 ? (
          <div className="p-16 text-center bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 space-y-4 max-w-xl mx-auto">
            <div className="text-5xl">❤️</div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white">
              Your Wishlist is Empty
            </h2>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Found a laptop you like? Click the heart icon on any laptop card to save it for later and track price drops!
            </p>
            <div className="pt-2">
              <Link
                href="/products"
                className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/20"
              >
                Browse Certified Laptops
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
