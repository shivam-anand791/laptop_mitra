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
      <div className="bg-[#F5F7FA] min-h-screen py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between pb-5 border-b border-slate-200 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F4B]">
                Saved Laptops
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                You have {count} {count === 1 ? 'laptop' : 'laptops'} saved in your wishlist
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
            <div className="p-16 text-center bg-white rounded-3xl border border-slate-200/90 shadow-sm space-y-4 max-w-lg mx-auto">
              <div className="text-4xl">❤️</div>
              <h2 className="text-xl font-bold text-[#0B1F4B]">
                Your Wishlist is Empty
              </h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                Found a refurbished laptop you like? Click the heart icon on any product card to save it for easy access and price alerts!
              </p>
              <div className="pt-2">
                <Link
                  href="/products"
                  className="inline-block px-6 py-3 bg-[#1D6FF2] hover:bg-[#1558C0] text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20"
                >
                  Browse Certified Laptops
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
