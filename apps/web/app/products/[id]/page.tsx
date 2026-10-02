'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CustomerLayout from '../../../components/CustomerLayout';
import ProductCard from '../../../components/ProductCard';
import Badge from '../../../components/ui/Badge';
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
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [added, setAdded] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'specs' | 'inspection' | 'warranty' | 'faq'>('specs');

  useEffect(() => {
    async function loadProduct() {
      try {
        const prod = await api.getProduct(resolvedParams.id);
        setProduct(prod);
        const primary = prod.images?.find((i) => i.isPrimary)?.url || prod.images?.[0]?.url || '';
        setSelectedImage(primary);

        // Load similar products
        try {
          const res = await api.getProducts({
            categoryId: prod.categoryId || undefined,
            limit: 4,
          });
          setSimilarProducts(res.products.filter((p) => p.id !== prod.id).slice(0, 4));
        } catch {
          // Ignore similar products error
        }
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
        <div className="max-w-7xl mx-auto px-4 py-24 text-center">
          <div className="w-12 h-12 border-4 border-[#1D6FF2] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-slate-500">Loading certified laptop specifications...</p>
        </div>
      </CustomerLayout>
    );
  }

  if (!product) {
    return (
      <CustomerLayout>
        <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-4">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
            !
          </div>
          <h2 className="text-2xl font-extrabold text-[#0B1F4B]">Laptop Listing Not Found</h2>
          <p className="text-sm text-slate-600">
            The laptop you are looking for is either out of stock or no longer listed in our inventory.
          </p>
          <Link
            href="/products"
            className="inline-block px-6 py-3 bg-[#1D6FF2] hover:bg-[#1558C0] text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-blue-500/20"
          >
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
  const bulkUnitPrice = Math.round(priceNum * 0.93); // Bulk pricing ~7% off

  const handleAddToCart = () => {
    addItem(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  };

  const handleBuyNow = () => {
    addItem(product, quantity);
    router.push('/checkout');
  };

  return (
    <CustomerLayout>
      <div className="bg-[#F5F7FA] min-h-screen py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs */}
          <nav className="flex items-center space-x-2 text-xs text-slate-500 mb-6 overflow-x-auto whitespace-nowrap py-1">
            <Link href="/" className="hover:text-[#1D6FF2] transition-colors font-medium">Home</Link>
            <span className="text-slate-400">/</span>
            <Link href="/products" className="hover:text-[#1D6FF2] transition-colors font-medium">Certified Laptops</Link>
            {product.category && (
              <>
                <span className="text-slate-400">/</span>
                <Link href={`/products?category=${product.category.id}`} className="hover:text-[#1D6FF2] transition-colors font-medium">
                  {product.category.name}
                </Link>
              </>
            )}
            <span className="text-slate-400">/</span>
            <span className="text-slate-900 font-semibold truncate max-w-xs">{product.name}</span>
          </nav>

          {/* Main Product Details Card */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 lg:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
              
              {/* LEFT COLUMN: Gallery & Certifications */}
              <div className="lg:col-span-6 xl:col-span-7 space-y-5">
                {/* Main Hero Image */}
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-50 border border-slate-200 flex items-center justify-center p-4">
                  {/* Badges Overlay */}
                  <div className="absolute top-3.5 left-3.5 z-10 flex flex-wrap gap-1.5">
                    <Badge variant="refurb">REFURB</Badge>
                    {product.isFeatured && <Badge variant="bestSeller">⭐ Best Seller</Badge>}
                    {product.isNewArrival && !product.isFeatured && <Badge variant="newArrival">⚡ New Arrival</Badge>}
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ✓ Grade A+ Certified
                    </span>
                  </div>

                  {discountPercent > 0 && (
                    <div className="absolute top-3.5 right-3.5 z-10">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-[#EF4444] text-white shadow-sm">
                        {discountPercent}% OFF
                      </span>
                    </div>
                  )}

                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedImage || product.images?.[0]?.url || 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=800&auto=format&fit=crop&q=80'}
                    alt={product.name}
                    className="w-full h-full object-contain max-h-[420px] transition-transform duration-300 hover:scale-105"
                  />
                </div>

                {/* Thumbnails */}
                {product.images && product.images.length > 1 && (
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {product.images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImage(img.url)}
                        className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 bg-slate-50 p-1 shrink-0 transition-all ${
                          selectedImage === img.url
                            ? 'border-[#1D6FF2] ring-2 ring-blue-500/20'
                            : 'border-slate-200 opacity-70 hover:opacity-100'
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.url} alt={`Thumbnail ${idx}`} className="w-full h-full object-contain" />
                      </button>
                    ))}
                  </div>
                )}

                {/* 32-Point Quality Checklist Card */}
                <div className="p-5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">
                        ✓
                      </div>
                      <h4 className="text-sm font-bold text-[#0B1F4B]">
                        LaptopMitra 32-Point Certified Refurbishment
                      </h4>
                    </div>
                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Passed 100%
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200/80">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Battery Health</span>
                      <span className="font-bold text-slate-800">&gt; 90% Tested</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200/80">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Display Grade</span>
                      <span className="font-bold text-slate-800">Zero Bleed / Dead Pixels</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200/80">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Thermals</span>
                      <span className="font-bold text-slate-800">Fresh Arctic MX-4</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-white border border-slate-200/80">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Genuine OS</span>
                      <span className="font-bold text-slate-800">Pre-Activated</span>
                    </div>
                  </div>
                </div>

                {/* Corporate / Bulk Order Banner */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-[#0B1F4B] to-[#162D66] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-[#3B82F6] uppercase tracking-wider block">Enterprise & Bulk Orders</span>
                    <p className="text-sm font-bold text-white">Ordering 5+ Laptops for Your Team?</p>
                    <p className="text-xs text-slate-300">GST Input Credit (18%), custom OS images & volume discount.</p>
                  </div>
                  <Link
                    href="/quote"
                    className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#1D6FF2] hover:bg-blue-600 text-white text-xs font-bold shrink-0 transition-colors shadow"
                  >
                    Request Bulk Quote →
                  </Link>
                </div>
              </div>

              {/* RIGHT COLUMN: Price, Specs & Buying Actions */}
              <div className="lg:col-span-6 xl:col-span-5 space-y-6">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                    <span className="uppercase tracking-wider font-bold text-[#1D6FF2]">
                      {product.category?.name || 'Enterprise Laptop'}
                    </span>
                    <span className="font-mono text-slate-400">SKU: {product.sku}</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F4B] leading-tight">
                    {product.name}
                  </h1>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                    {product.shortDescription || product.description}
                  </p>
                </div>

                {/* Stock & Dispatch Status */}
                <div className="flex items-center gap-2">
                  {product.stock > 0 ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Ready for Dispatch • {product.stock} available
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      Temporarily Out of Stock
                    </span>
                  )}
                  <span className="text-xs text-slate-500">| Standard 2-4 Days Delivery</span>
                </div>

                {/* Pricing Box */}
                <div className="p-5 rounded-2xl bg-[#F0F6FF] border border-blue-100 space-y-3">
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-black text-[#0B1F4B]">
                      ₹{priceNum.toLocaleString('en-IN')}
                    </span>
                    {compareNum && compareNum > priceNum && (
                      <span className="text-base line-through text-slate-400 font-medium">
                        ₹{compareNum.toLocaleString('en-IN')}
                      </span>
                    )}
                    {discountPercent > 0 && (
                      <span className="px-2.5 py-0.5 rounded-md text-xs font-black bg-[#EF4444] text-white">
                        {discountPercent}% OFF
                      </span>
                    )}
                  </div>

                  {savings > 0 && (
                    <div className="text-xs text-emerald-700 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200/80 inline-block">
                      🎉 You save ₹{savings.toLocaleString('en-IN')} compared to original MRP!
                    </div>
                  )}

                  <div className="pt-2 border-t border-blue-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-slate-700">
                    <div>
                      💳 EMI from <strong className="text-[#0B1F4B]">₹{Math.round(priceNum / 12).toLocaleString('en-IN')}/mo</strong>
                    </div>
                    <div className="font-bold text-[#1D6FF2]">
                      Bulk (5+ units): ₹{bulkUnitPrice.toLocaleString('en-IN')}/unit
                    </div>
                  </div>
                </div>

                {/* Quick Specs Highlight Grid */}
                {product.metadata && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Key Hardware Specs
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {product.metadata.processor && (
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                          <span className="text-slate-400 block text-[10px] font-medium">Processor</span>
                          <span className="font-bold text-slate-800 truncate block">{product.metadata.processor}</span>
                        </div>
                      )}
                      {product.metadata.ram && (
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                          <span className="text-slate-400 block text-[10px] font-medium">Memory (RAM)</span>
                          <span className="font-bold text-slate-800 truncate block">{product.metadata.ram}</span>
                        </div>
                      )}
                      {product.metadata.storage && (
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                          <span className="text-slate-400 block text-[10px] font-medium">Fast Storage</span>
                          <span className="font-bold text-slate-800 truncate block">{product.metadata.storage} SSD</span>
                        </div>
                      )}
                      {product.metadata.display && (
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                          <span className="text-slate-400 block text-[10px] font-medium">Display</span>
                          <span className="font-bold text-slate-800 truncate block">{product.metadata.display}</span>
                        </div>
                      )}
                      {product.metadata.graphics && (
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                          <span className="text-slate-400 block text-[10px] font-medium">Graphics</span>
                          <span className="font-bold text-slate-800 truncate block">{product.metadata.graphics}</span>
                        </div>
                      )}
                      {product.metadata.batteryHealth && (
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                          <span className="text-slate-400 block text-[10px] font-medium">Battery Health</span>
                          <span className="font-bold text-emerald-700 truncate block">{product.metadata.batteryHealth}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Quantity Selector */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-bold text-slate-700">Quantity:</span>
                    <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white shadow-sm">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="px-3 py-1.5 text-sm font-bold hover:bg-slate-100 text-slate-700 transition-colors"
                        disabled={product.stock <= 0}
                      >
                        -
                      </button>
                      <span className="px-3 py-1.5 text-sm font-bold min-w-[36px] text-center text-slate-900">
                        {quantity}
                      </span>
                      <button
                        onClick={() => setQuantity(Math.min(product.stock || 1, quantity + 1))}
                        className="px-3 py-1.5 text-sm font-bold hover:bg-slate-100 text-slate-700 transition-colors"
                        disabled={product.stock <= 0 || quantity >= product.stock}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <span className="text-xs text-slate-500">
                    Max order: {product.stock} units
                  </span>
                </div>

                {/* Action CTAs */}
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleAddToCart}
                      disabled={product.stock <= 0}
                      className={`py-3.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                        product.stock <= 0
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : added
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#0B1F4B] hover:bg-[#162D66] text-white shadow-md'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      <span>{added ? 'Added to Cart ✓' : 'Add to Cart'}</span>
                    </button>

                    <button
                      onClick={handleBuyNow}
                      disabled={product.stock <= 0}
                      className={`py-3.5 px-4 rounded-xl text-sm font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${
                        product.stock <= 0
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                          : 'bg-[#1D6FF2] hover:bg-[#1558C0] text-white shadow-blue-500/25 hover:scale-[1.02] active:scale-[0.98]'
                      }`}
                    >
                      <span>⚡ Buy Now</span>
                    </button>
                  </div>

                  <button
                    onClick={() => toggleWishlist(product)}
                    className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center justify-center gap-2 transition-colors"
                  >
                    <svg
                      className={`w-4 h-4 ${isWish ? 'text-rose-600 fill-rose-600' : 'text-slate-400'}`}
                      fill={isWish ? 'currentColor' : 'none'}
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span>{isWish ? 'Saved in Wishlist' : 'Add to Wishlist'}</span>
                  </button>
                </div>

                {/* Trust & Assurance 4-point strip */}
                <div className="pt-5 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-[11px]">
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="block text-lg mb-0.5">🚚</span>
                    <span className="font-bold text-slate-800 block">Free Shipping</span>
                    <span className="text-slate-500">Pan-India Express</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="block text-lg mb-0.5">🛡️</span>
                    <span className="font-bold text-slate-800 block">1-Yr Warranty</span>
                    <span className="text-slate-500">Comprehensive</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="block text-lg mb-0.5">🔄</span>
                    <span className="font-bold text-slate-800 block">7-Day Return</span>
                    <span className="text-slate-500">Instant Replacement</span>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="block text-lg mb-0.5">📑</span>
                    <span className="font-bold text-slate-800 block">GST Invoice</span>
                    <span className="text-slate-500">Save 18% Tax</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TABBED DETAILS SECTION */}
          <div className="mt-8 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 bg-slate-50/70 overflow-x-auto">
              <button
                onClick={() => setActiveTab('specs')}
                className={`px-6 py-4 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === 'specs'
                    ? 'border-[#1D6FF2] text-[#1D6FF2] bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                Detailed Specifications
              </button>
              <button
                onClick={() => setActiveTab('inspection')}
                className={`px-6 py-4 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === 'inspection'
                    ? 'border-[#1D6FF2] text-[#1D6FF2] bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                32-Point Inspection Report
              </button>
              <button
                onClick={() => setActiveTab('warranty')}
                className={`px-6 py-4 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === 'warranty'
                    ? 'border-[#1D6FF2] text-[#1D6FF2] bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                Warranty & Return Policy
              </button>
              <button
                onClick={() => setActiveTab('faq')}
                className={`px-6 py-4 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === 'faq'
                    ? 'border-[#1D6FF2] text-[#1D6FF2] bg-white'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                Refurbished FAQ
              </button>
            </div>

            {/* Tab Content */}
            <div className="p-6 lg:p-8">
              {activeTab === 'specs' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-[#0B1F4B] mb-2">Technical Specifications</h3>
                    <p className="text-xs text-slate-500">Every component is tested, certified, and matched with authentic OEM specifications.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="font-medium text-slate-500">Processor / CPU</span>
                      <span className="font-bold text-slate-800">{product.metadata?.processor || 'Intel Core i5 / i7'}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="font-medium text-slate-500">RAM (Installed Memory)</span>
                      <span className="font-bold text-slate-800">{product.metadata?.ram || '8GB / 16GB DDR4'}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="font-medium text-slate-500">Solid State Storage (SSD)</span>
                      <span className="font-bold text-slate-800">{product.metadata?.storage ? `${product.metadata.storage} High-Speed SSD` : '256GB / 512GB NVMe SSD'}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="font-medium text-slate-500">Display Size & Resolution</span>
                      <span className="font-bold text-slate-800">{product.metadata?.display || '14.0" Full HD IPS Anti-Glare'}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="font-medium text-slate-500">Graphics Controller</span>
                      <span className="font-bold text-slate-800">{product.metadata?.graphics || 'Intel UHD / Iris Xe Graphics'}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="font-medium text-slate-500">Battery Health Guarantee</span>
                      <span className="font-bold text-emerald-700">{product.metadata?.batteryHealth || 'Above 85% Health Guaranteed'}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="font-medium text-slate-500">Operating System</span>
                      <span className="font-bold text-slate-800">Genuine Windows 11 Pro (Pre-Installed & Activated)</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="font-medium text-slate-500">Condition Grade</span>
                      <span className="font-bold text-[#1D6FF2]">Grade A+ Refurbished (Like New)</span>
                    </div>
                  </div>

                  {product.description && (
                    <div className="pt-4 border-t border-slate-200">
                      <h4 className="text-sm font-bold text-[#0B1F4B] mb-2">Overview</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{product.description}</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'inspection' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-[#0B1F4B] mb-2">Our Comprehensive 32-Point Quality Checklist</h3>
                    <p className="text-xs text-slate-500">Every refurbished laptop undergoes meticulous engineering diagnostics before being approved for sale.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    {[
                      'Motherboard & chipset stress test (Passmark 100%)',
                      'Display panel: 0 dead pixels & backlight bleed test',
                      'Battery discharge & cycle count inspection (>90% health)',
                      'Thermal repasting with Arctic MX-4 compound',
                      'Keyboard all-key actuation & backlighting audit',
                      'Precision touchpad multi-touch gesture test',
                      'USB-A, USB-C / Thunderbolt port data transfer check',
                      'HDMI / DisplayPort external video output test',
                      'Dual stereo speaker & microphone acoustic test',
                      'HD webcam image clarity and shutter test',
                      'Wi-Fi 6 & Bluetooth 5.x throughput test',
                      'Deep ultrasonic exterior & interior sanitization',
                    ].map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          ✓
                        </span>
                        <span className="text-slate-700 font-medium leading-tight">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'warranty' && (
                <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
                  <h3 className="text-base font-bold text-[#0B1F4B]">1-Year Comprehensive Warranty & 7-Day Replacement</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 space-y-2">
                      <h4 className="font-bold text-[#1D6FF2] text-sm">🛡️ What is Covered:</h4>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>Motherboard, processor, RAM, and SSD hardware failure.</li>
                        <li>Display failure, lines, and power delivery circuitry.</li>
                        <li>Keyboard, trackpad, and speaker components.</li>
                        <li>Original power adapter and charging cable.</li>
                      </ul>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <h4 className="font-bold text-slate-800 text-sm">🔄 7-Day Replacement Guarantee:</h4>
                      <p>
                        If your laptop has any functional defects or does not meet your expectations upon delivery, we will arrange a doorstep reverse pickup and provide a hassle-free replacement or refund within 7 days.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'faq' && (
                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <strong className="text-slate-900 block font-bold">What is Grade A+ refurbished condition?</strong>
                    <p className="text-slate-600">Grade A+ indicates the laptop is in near-mint cosmetic condition with minimal to no visible signs of previous use. All internal hardware works at 100% factory specifications.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <strong className="text-slate-900 block font-bold">Does it come with an authentic OS and charger?</strong>
                    <p className="text-slate-600">Yes! Every laptop comes pre-activated with genuine Windows 11 Pro, complete with an OEM compatible high-wattage fast charger.</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                    <strong className="text-slate-900 block font-bold">Can I claim 18% GST input credit for business purchases?</strong>
                    <p className="text-slate-600">Yes! Simply enter your company GSTIN during checkout, and a compliant Tax Invoice will be generated automatically for your account.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SIMILAR LAPTOPS SECTION */}
          {similarProducts.length > 0 && (
            <div className="mt-12 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-extrabold text-[#0B1F4B]">Similar Certified Laptops</h3>
                  <p className="text-xs text-slate-500">Explore comparable business-class laptops tested and backed by warranty</p>
                </div>
                <Link
                  href="/products"
                  className="text-xs font-bold text-[#1D6FF2] hover:underline"
                >
                  View all laptops →
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {similarProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </CustomerLayout>
  );
}
