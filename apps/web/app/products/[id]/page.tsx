'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CustomerLayout from '../../../components/CustomerLayout';
import { Product } from '../../../lib/types';
import { api } from '../../../lib/api';
import { useCart } from '../../../lib/cart-context';
import { useWishlist } from '../../../lib/wishlist-context';

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { addItem } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [added, setAdded] = useState<boolean>(false);

  useEffect(() => {
    async function loadProduct() {
      try {
        const prod = await api.getProduct(resolvedParams.id);
        setProduct(prod);
        const primary = prod.images?.find((i) => i.isPrimary)?.url || prod.images?.[0]?.url || '';
        setSelectedImage(primary);
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }
    loadProduct();
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <CustomerLayout>
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-zinc-500">Inspecting laptop specifications...</p>
        </div>
      </CustomerLayout>
    );
  }

  if (!product) {
    return (
      <CustomerLayout>
        <div className="max-w-7xl mx-auto px-4 py-16 text-center space-y-4">
          <h2 className="text-2xl font-bold">Laptop Not Found</h2>
          <p className="text-sm text-zinc-500">The laptop listing you are searching for does not exist or has been sold.</p>
          <Link href="/products" className="inline-block px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl text-sm">
            Browse All Available Laptops
          </Link>
        </div>
      </CustomerLayout>
    );
  }

  const isWish = isInWishlist(product.id);
  const priceNum = Number(product.price);
  const compareNum = product.compareAtPrice ? Number(product.compareAtPrice) : null;
  const savings = compareNum && compareNum > priceNum ? compareNum - priceNum : 0;
  const discountPercent = compareNum && compareNum > priceNum ? Math.round((savings / compareNum) * 100) : 0;

  const handleAddToCart = () => {
    addItem(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    addItem(product, quantity);
    router.push('/checkout');
  };

  return (
    <CustomerLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumbs */}
        <nav className="flex items-center space-x-2 text-xs text-zinc-500 mb-6">
          <Link href="/" className="hover:text-blue-600">Home</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-blue-600">Laptops</Link>
          <span>/</span>
          {product.category && (
            <>
              <Link href={`/products?category=${product.category.id}`} className="hover:text-blue-600">
                {product.category.name}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-zinc-900 dark:text-zinc-100 font-medium truncate max-w-xs">{product.name}</span>
        </nav>

        {/* Top Product Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* IMAGE GALLERY */}
          <div className="lg:col-span-7 space-y-4">
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-md">
              {/* Top badges */}
              <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-md">
                  ✓ Grade A+ Certified
                </span>
                {discountPercent > 0 && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-600 text-white shadow-md">
                    Save {discountPercent}%
                  </span>
                )}
              </div>

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedImage || product.images?.[0]?.url || ''}
                alt={product.name}
                className="w-full h-full object-cover object-center"
              />
            </div>

            {/* Thumbnails */}
            {product.images && product.images.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {product.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(img.url)}
                    className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                      selectedImage === img.url
                        ? 'border-blue-600 ring-2 ring-blue-500/20'
                        : 'border-zinc-200 dark:border-zinc-800 opacity-70 hover:opacity-100'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* 32-Point Quality Checklist Card */}
            <div className="p-6 rounded-2xl bg-zinc-100 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">
                  ✓
                </span>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  LaptopMitra 32-Point Certification Passed
                </h4>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-zinc-600 dark:text-zinc-400">
                <div className="p-2 rounded-lg bg-white dark:bg-zinc-800/80">
                  <strong className="block text-zinc-900 dark:text-zinc-200">Battery Health</strong>
                  <span>&gt; 92% Tested Capacity</span>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-zinc-800/80">
                  <strong className="block text-zinc-900 dark:text-zinc-200">Display Panel</strong>
                  <span>Zero dead pixels</span>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-zinc-800/80">
                  <strong className="block text-zinc-900 dark:text-zinc-200">Thermals</strong>
                  <span>Repasted Arctic MX-4</span>
                </div>
                <div className="p-2 rounded-lg bg-white dark:bg-zinc-800/80">
                  <strong className="block text-zinc-900 dark:text-zinc-200">Genuine OS</strong>
                  <span>Pre-activated License</span>
                </div>
              </div>
            </div>
          </div>

          {/* PRODUCT INFO & BUYING ACTIONS */}
          <div className="lg:col-span-5 space-y-6">
            <div>
              <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
                <span className="uppercase tracking-wider font-semibold text-blue-600 dark:text-blue-400">
                  {product.category?.name || 'Refurbished'}
                </span>
                <span className="font-mono">SKU: {product.sku}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white leading-tight">
                {product.name}
              </h1>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
                {product.shortDescription || product.description}
              </p>
            </div>

            {/* Price Box */}
            <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 space-y-2">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl font-black text-zinc-900 dark:text-white">
                  ₹{priceNum.toLocaleString('en-IN')}
                </span>
                {compareNum && (
                  <span className="text-base line-through text-zinc-400">
                    ₹{compareNum.toLocaleString('en-IN')}
                  </span>
                )}
                {discountPercent > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-rose-600 text-white">
                    {discountPercent}% OFF
                  </span>
                )}
              </div>

              {savings > 0 && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                  🎉 You save ₹{savings.toLocaleString('en-IN')} compared to buying brand new!
                </p>
              )}

              <div className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5 pt-1">
                <span>💳 EMI starts from <strong>₹{Math.round(priceNum / 12).toLocaleString('en-IN')}/mo</strong></span>
                <span>• No Cost EMI available</span>
              </div>
            </div>

            {/* Quick Specs Highlights */}
            {product.metadata && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                  Technical Specifications
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {product.metadata.processor && (
                    <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80">
                      <span className="text-zinc-400 block text-[10px]">Processor</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">{product.metadata.processor}</span>
                    </div>
                  )}
                  {product.metadata.ram && (
                    <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80">
                      <span className="text-zinc-400 block text-[10px]">Memory (RAM)</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">{product.metadata.ram}</span>
                    </div>
                  )}
                  {product.metadata.storage && (
                    <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80">
                      <span className="text-zinc-400 block text-[10px]">Solid State Storage</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">{product.metadata.storage}</span>
                    </div>
                  )}
                  {product.metadata.display && (
                    <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80">
                      <span className="text-zinc-400 block text-[10px]">Display Panel</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">{product.metadata.display}</span>
                    </div>
                  )}
                  {product.metadata.graphics && (
                    <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80">
                      <span className="text-zinc-400 block text-[10px]">Graphics</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">{product.metadata.graphics}</span>
                    </div>
                  )}
                  {product.metadata.batteryHealth && (
                    <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800/80">
                      <span className="text-zinc-400 block text-[10px]">Battery Health</span>
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">{product.metadata.batteryHealth}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quantity Selector & Stock */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Quantity:</span>
                <div className="flex items-center border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden bg-white dark:bg-zinc-800">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-1 text-sm font-bold hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200"
                  >
                    -
                  </button>
                  <span className="px-3 py-1 text-sm font-bold min-w-[32px] text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-3 py-1 text-sm font-bold hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="text-xs">
                {product.stock > 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    In Stock ({product.stock} units ready)
                  </span>
                ) : (
                  <span className="text-rose-600 font-bold">Temporarily Out of Stock</span>
                )}
              </div>
            </div>

            {/* CTAs */}
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleAddToCart}
                  className={`py-3.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                    added
                      ? 'bg-emerald-600 text-white'
                      : 'bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 shadow-sm'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  <span>{added ? 'Added to Cart ✓' : 'Add to Cart'}</span>
                </button>

                <button
                  onClick={handleBuyNow}
                  className="py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
                >
                  <span>⚡ Buy Now</span>
                </button>
              </div>

              <button
                onClick={() => toggleWishlist(product)}
                className="w-full py-2.5 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center justify-center gap-2 transition-colors"
              >
                <svg
                  className={`w-4 h-4 ${isWish ? 'text-rose-600 fill-rose-600' : 'text-zinc-400'}`}
                  fill={isWish ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span>{isWish ? 'In Wishlist' : 'Add to Wishlist'}</span>
              </button>
            </div>

            {/* Assurance badges strip */}
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-3 gap-2 text-center text-[11px] text-zinc-500">
              <div>
                <span className="block text-base mb-0.5">🚚</span>
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">Free Express</span>
                <span>All-India Delivery</span>
              </div>
              <div>
                <span className="block text-base mb-0.5">🛡️</span>
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">1-Year Warranty</span>
                <span>Doorstep Support</span>
              </div>
              <div>
                <span className="block text-base mb-0.5">🔄</span>
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">7-Day Return</span>
                <span>Hassle-Free Exchange</span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Description */}
        {product.description && (
          <div className="mt-16 pt-8 border-t border-zinc-200 dark:border-zinc-800">
            <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-4">
              Comprehensive Laptop Overview
            </h3>
            <div className="prose dark:prose-invert max-w-none text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <p>{product.description}</p>
            </div>
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
