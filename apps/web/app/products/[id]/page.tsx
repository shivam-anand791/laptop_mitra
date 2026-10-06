'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  const [activeTab, setActiveTab] = useState<'specs' | 'inspection' | 'box' | 'warranty' | 'faq'>('specs');
  const [procurementModel, setProcurementModel] = useState<'buy' | 'lease'>('buy');
  const [pincode, setPincode] = useState<string>('');
  const [pincodeChecked, setPincodeChecked] = useState<boolean>(false);

  useEffect(() => {
    async function loadProduct() {
      try {
        const prod = await api.getProduct(resolvedParams.id);
        setProduct(prod);
        const primary = prod.images?.find((i) => i.isPrimary)?.url || prod.images?.[0]?.url || '';
        setSelectedImage(primary);

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
        // Handled by api fallback
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
          <h2 className="text-2xl font-black text-[#0B1F4B]">Laptop Listing Not Found</h2>
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
  const leaseMonthlyPrice = Math.round(priceNum * 0.08); // Approx 8% monthly lease rate
  const bulkTier1Price = Math.round(priceNum * 0.93); // 5-9 units (7% off)
  const bulkTier2Price = Math.round(priceNum * 0.85); // 10+ units (15% off)

  const handleAddToCart = () => {
    addItem(product, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  };

  const handleBuyNow = () => {
    addItem(product, quantity);
    router.push('/checkout');
  };

  const handlePincodeCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (pincode.trim().length === 6) {
      setPincodeChecked(true);
    }
  };

  const displayImageSrc = selectedImage || product.images?.[0]?.url || '/images/generated/cat-business.webp';

  return (
    <CustomerLayout>
      <div className="bg-[#F8FAFC] min-h-screen py-6 sm:py-8 lg:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="flex items-center space-x-2 text-xs text-slate-500 mb-4 sm:mb-6 overflow-x-auto whitespace-nowrap py-1">
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
            <span className="text-[#0B1F4B] font-bold truncate max-w-xs">{product.name}</span>
          </nav>

          {/* Main PDP Grid */}
          <div className="bg-white rounded-3xl border border-[#E4E9F2] shadow-sm p-5 sm:p-6 lg:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 xl:gap-12">
              
              {/* LEFT COLUMN: Media Gallery & Certifications (7 cols) */}
              <div className="lg:col-span-6 xl:col-span-7 space-y-6">
                {/* Main Hero Image */}
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-[#F8FAFC] border border-[#E4E9F2] flex items-center justify-center p-6 group">
                  {/* Badges Overlay */}
                  <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-2">
                    <Badge variant="refurb">REFURB</Badge>
                    {product.isFeatured && <Badge variant="bestSeller">⭐ Best Seller</Badge>}
                    {product.isNewArrival && !product.isFeatured && <Badge variant="newArrival">⚡ New Arrival</Badge>}
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
                      ✓ Grade A+ Pristine
                    </span>
                  </div>

                  {discountPercent > 0 && (
                    <div className="absolute top-4 right-4 z-10">
                      <span className="px-3 py-1 rounded-xl text-xs font-black bg-[#EF4444] text-white shadow-md">
                        {discountPercent}% OFF
                      </span>
                    </div>
                  )}

                  <div className="relative w-full h-full max-h-[420px]">
                    {displayImageSrc.startsWith('http') ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={displayImageSrc}
                        alt={product.name}
                        className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <Image
                        src={displayImageSrc}
                        alt={product.name}
                        fill
                        className="object-contain transition-transform duration-300 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 50vw"
                        priority
                      />
                    )}
                  </div>
                </div>

                {/* Interactive Thumbnails */}
                {product.images && product.images.length > 1 && (
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {product.images.map((img, idx) => {
                      const isSelected = selectedImage === img.url;
                      return (
                        <button
                          key={idx}
                          onClick={() => setSelectedImage(img.url)}
                          className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 bg-[#F8FAFC] p-1 shrink-0 transition-all cursor-pointer ${
                            isSelected
                              ? 'border-[#1D6FF2] ring-2 ring-blue-500/20 shadow-sm'
                              : 'border-[#E4E9F2] opacity-70 hover:opacity-100'
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={img.url} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-contain" />
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* 32-Point Quality Checklist Card */}
                <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-[#E4E9F2] space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-[#10B981] text-white flex items-center justify-center text-xs font-bold">
                        ✓
                      </div>
                      <h4 className="text-sm font-black text-[#0B1F4B]">
                        32-Point Engineering Certified Quality
                      </h4>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      100% Passed
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="p-3 rounded-xl bg-white border border-[#E4E9F2]">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Battery Health</span>
                      <span className="font-bold text-emerald-700">&gt; 85% Guaranteed</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white border border-[#E4E9F2]">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Display Panel</span>
                      <span className="font-bold text-slate-800">Zero Bleed / Pixels</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white border border-[#E4E9F2]">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Thermals</span>
                      <span className="font-bold text-slate-800">Arctic MX-4 Pasted</span>
                    </div>
                    <div className="p-3 rounded-xl bg-white border border-[#E4E9F2]">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">Operating System</span>
                      <span className="font-bold text-[#1D6FF2]">Genuine Win 11 Pro</span>
                    </div>
                  </div>
                </div>

                {/* What's In The Box Card */}
                <div className="p-5 rounded-2xl bg-white border border-[#E4E9F2] space-y-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    📦 What&apos;s In The Sealed Box
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E4E9F2]">
                      <span className="text-base">💻</span>
                      <span className="font-bold text-slate-800">1x Laptop</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E4E9F2]">
                      <span className="text-base">⚡</span>
                      <span className="font-bold text-slate-800">OEM Adapter</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E4E9F2]">
                      <span className="text-base">📜</span>
                      <span className="font-bold text-slate-800">QC Certificate</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E4E9F2]">
                      <span className="text-base">🛡️</span>
                      <span className="font-bold text-slate-800">1-Yr Warranty</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN: Buy Box, Pricing & Actions (5 cols) */}
              <div className="lg:col-span-6 xl:col-span-5 space-y-6">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                    <span className="uppercase tracking-wider font-bold text-[#1D6FF2]">
                      {product.category?.name || 'Enterprise Certified Laptop'}
                    </span>
                    <span className="font-mono text-slate-400">SKU: {product.sku}</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-[#0B1F4B] leading-tight tracking-tight">
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
                      Ready for Dispatch • {product.stock} units available
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                      Temporarily Out of Stock
                    </span>
                  )}
                  <span className="text-xs text-slate-500">| Express Pan-India Delivery</span>
                </div>

                {/* Procurement Model Selector */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Select Procurement Model
                  </label>
                  <div className="grid grid-cols-2 gap-2 bg-[#F1F5F9] p-1 rounded-2xl border border-[#E4E9F2]">
                    <button
                      type="button"
                      onClick={() => setProcurementModel('buy')}
                      className={`h-10 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                        procurementModel === 'buy'
                          ? 'bg-white text-[#0B1F4B] shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Outright Purchase
                    </button>
                    <button
                      type="button"
                      onClick={() => setProcurementModel('lease')}
                      className={`h-10 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                        procurementModel === 'lease'
                          ? 'bg-white text-[#0B1F4B] shadow-sm'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Corporate Lease
                    </button>
                  </div>
                </div>

                {/* Pricing Box */}
                <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-3">
                  {procurementModel === 'buy' ? (
                    <>
                      <div className="flex flex-wrap items-baseline gap-2 sm:gap-3">
                        <span className="text-2xl sm:text-3xl font-black text-[#0B1F4B] tabular-nums">
                          ₹{priceNum.toLocaleString('en-IN')}
                        </span>
                        {compareNum && compareNum > priceNum && (
                          <span className="text-sm sm:text-base line-through text-slate-400 font-medium tabular-nums">
                            ₹{compareNum.toLocaleString('en-IN')}
                          </span>
                        )}
                        {discountPercent > 0 && (
                          <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-[#EF4444] text-white">
                            Save {discountPercent}%
                          </span>
                        )}
                      </div>

                      {savings > 0 && (
                        <div className="text-xs text-emerald-700 font-bold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 inline-block">
                          🎉 You save ₹{savings.toLocaleString('en-IN')} vs brand-new retail price!
                        </div>
                      )}

                      <div className="pt-2 border-t border-blue-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs text-slate-700">
                        <div>
                          💳 EMI from <strong className="text-[#0B1F4B] tabular-nums">₹{Math.round(priceNum / 12).toLocaleString('en-IN')}/mo</strong>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          GST 18% Input Tax Credit Eligible
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-baseline gap-2 sm:gap-3">
                        <span className="text-2xl sm:text-3xl font-black text-[#0B1F4B] tabular-nums">
                          ₹{leaseMonthlyPrice.toLocaleString('en-IN')}
                        </span>
                        <span className="text-xs font-bold text-slate-500">/ month + GST</span>
                      </div>
                      <p className="text-xs text-slate-600">
                        Zero upfront capital expenditure. Includes quarterly maintenance, free upgrades, and instant swap replacement for corporate teams.
                      </p>
                    </>
                  )}
                </div>

                {/* Bulk Order Pricing Tier Table */}
                <div className="p-4 rounded-2xl bg-white border border-[#E4E9F2] space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-[#0B1F4B]">
                    <span>Tiered Wholesale Pricing</span>
                    <span className="text-[10px] text-[#1D6FF2] font-semibold">Volume Discounts</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E4E9F2]">
                      <span className="text-[10px] text-slate-400 block font-medium">1 - 4 Units</span>
                      <span className="font-bold text-slate-800 block tabular-nums">₹{priceNum.toLocaleString('en-IN')}</span>
                      <span className="text-[9px] text-slate-400">Standard</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-blue-50/50 border border-blue-200">
                      <span className="text-[10px] text-[#1D6FF2] block font-bold">5 - 9 Units</span>
                      <span className="font-bold text-[#0B1F4B] block tabular-nums">₹{bulkTier1Price.toLocaleString('en-IN')}</span>
                      <span className="text-[9px] text-emerald-600 font-bold">7% OFF</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-200">
                      <span className="text-[10px] text-emerald-700 block font-bold">10+ Units</span>
                      <span className="font-bold text-[#0B1F4B] block tabular-nums">₹{bulkTier2Price.toLocaleString('en-IN')}</span>
                      <span className="text-[9px] text-emerald-600 font-bold">15% OFF + GST</span>
                    </div>
                  </div>
                </div>

                {/* Quick Hardware Specs Grid */}
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
                    </div>
                  </div>
                )}

                {/* Pincode Delivery Estimator */}
                <div className="p-3.5 rounded-2xl bg-[#F8FAFC] border border-[#E4E9F2] space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Estimated Delivery Check
                  </span>
                  <form onSubmit={handlePincodeCheck} className="flex gap-2">
                    <input
                      type="text"
                      maxLength={6}
                      value={pincode}
                      onChange={(e) => {
                        setPincode(e.target.value.replace(/\D/g, ''));
                        setPincodeChecked(false);
                      }}
                      placeholder="Enter 6-digit Pincode"
                      className="h-10 w-full px-3 py-2 rounded-xl bg-white border border-[#E4E9F2] text-xs font-mono placeholder:text-slate-400 focus:outline-none focus:border-[#1D6FF2]"
                    />
                    <button
                      type="submit"
                      className="h-10 px-4 rounded-xl bg-[#0B1F4B] text-white text-xs font-bold hover:bg-[#162D66] transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                    >
                      Check
                    </button>
                  </form>
                  {pincodeChecked && (
                    <div className="text-xs text-emerald-700 font-bold flex items-center gap-1.5 pt-1">
                      <span>✓</span>
                      <span>Express BlueDart dispatch in 2-3 business days to {pincode}</span>
                    </div>
                  )}
                </div>

                {/* Quantity Selector */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center space-x-3">
                    <span className="text-xs font-bold text-slate-700">Quantity:</span>
                    <div className="flex items-center border border-[#CBD5E1] rounded-xl overflow-hidden bg-white shadow-sm h-10">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="px-3.5 h-full text-sm font-bold hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer flex items-center justify-center"
                        disabled={product.stock <= 0}
                      >
                        -
                      </button>
                      <span className="px-3.5 h-full flex items-center justify-center text-sm font-bold min-w-[36px] text-center text-[#0B1F4B] tabular-nums">
                        {quantity}
                      </span>
                      <button
                        onClick={() => setQuantity(Math.min(product.stock || 1, quantity + 1))}
                        className="px-3.5 h-full text-sm font-bold hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer flex items-center justify-center"
                        disabled={product.stock <= 0 || quantity >= product.stock}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <span className="text-xs text-slate-500 tabular-nums">
                    Max: {product.stock} units
                  </span>
                </div>

                {/* Action CTAs */}
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleAddToCart}
                      disabled={product.stock <= 0}
                      className={`h-11 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        product.stock <= 0
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : added
                          ? 'bg-emerald-600 text-white shadow-md'
                          : 'bg-[#0B1F4B] hover:bg-[#162D66] text-white shadow-md shadow-slate-900/10 active:scale-95'
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
                      className={`h-11 px-4 rounded-xl text-xs font-bold shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        product.stock <= 0
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                          : 'bg-[#1D6FF2] hover:bg-[#1558C0] text-white shadow-blue-500/25 active:scale-95'
                      }`}
                    >
                      <span>⚡ Buy Now</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <a
                      href={`https://wa.me/919999999999?text=Hi%20LaptopMitra,%20I%20am%20interested%20in%20buying%20${encodeURIComponent(product.name)}%20(SKU:%20${product.sku}).%20Please%20share%20details.`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-10 px-4 rounded-xl bg-[#25D366] hover:bg-[#20BD5A] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981z" />
                      </svg>
                      <span>Inquire via WhatsApp</span>
                    </a>

                    <button
                      onClick={() => toggleWishlist(product)}
                      className="h-10 px-4 rounded-xl border border-[#E4E9F2] hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <svg
                        className={`w-4 h-4 ${isWish ? 'text-rose-600 fill-rose-600' : 'text-slate-400'}`}
                        fill={isWish ? 'currentColor' : 'none'}
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      <span>{isWish ? 'Saved' : 'Wishlist'}</span>
                    </button>
                  </div>
                </div>

                {/* Trust 4-point pill strip */}
                <div className="pt-4 border-t border-[#E4E9F2] grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px]">
                  <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E4E9F2]">
                    <span className="block text-base mb-0.5">🚚</span>
                    <span className="font-bold text-slate-800 block">Free Shipping</span>
                    <span className="text-[10px] text-slate-500">Pan-India Express</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E4E9F2]">
                    <span className="block text-base mb-0.5">🛡️</span>
                    <span className="font-bold text-slate-800 block">1-Yr Warranty</span>
                    <span className="text-[10px] text-slate-500">Pan-India Support</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E4E9F2]">
                    <span className="block text-base mb-0.5">🔄</span>
                    <span className="font-bold text-slate-800 block">7-Day Return</span>
                    <span className="text-[10px] text-slate-500">Easy Replacement</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E4E9F2]">
                    <span className="block text-base mb-0.5">📑</span>
                    <span className="font-bold text-slate-800 block">GST Invoice</span>
                    <span className="text-[10px] text-slate-500">18% Input Credit</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* TABBED DETAILS SECTION */}
          <div className="mt-8 sm:mt-12 bg-white rounded-3xl border border-[#E4E9F2] shadow-sm overflow-hidden">
            {/* Tab Navigation */}
            <div className="flex border-b border-[#E4E9F2] bg-[#F8FAFC] overflow-x-auto">
              {[
                { id: 'specs', label: 'Detailed Specifications' },
                { id: 'inspection', label: '32-Point Quality Report' },
                { id: 'box', label: 'What\'s in the Box' },
                { id: 'warranty', label: 'Warranty & Returns' },
                { id: 'faq', label: 'Refurbished FAQ' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`px-5 sm:px-6 py-3.5 sm:py-4 text-xs font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
                    activeTab === tab.id
                      ? 'border-[#1D6FF2] text-[#1D6FF2] bg-white'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-6 lg:p-8">
              {activeTab === 'specs' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-black text-[#0B1F4B] mb-1">Technical Specifications</h3>
                    <p className="text-xs text-slate-500">Every component is tested, certified, and matched with authentic OEM specifications.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E4E9F2]">
                      <span className="font-medium text-slate-500">Processor / CPU</span>
                      <span className="font-bold text-slate-800">{product.metadata?.processor || 'Intel Core i5 / i7 / Apple Silicon'}</span>
                    </div>
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E4E9F2]">
                      <span className="font-medium text-slate-500">RAM (Installed Memory)</span>
                      <span className="font-bold text-slate-800">{product.metadata?.ram || '8GB / 16GB DDR4'}</span>
                    </div>
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E4E9F2]">
                      <span className="font-medium text-slate-500">Solid State Storage (SSD)</span>
                      <span className="font-bold text-slate-800">{product.metadata?.storage ? `${product.metadata.storage} SSD` : '256GB / 512GB NVMe SSD'}</span>
                    </div>
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E4E9F2]">
                      <span className="font-medium text-slate-500">Display Size & Resolution</span>
                      <span className="font-bold text-slate-800">{product.metadata?.display || '14.0" Full HD IPS Anti-Glare'}</span>
                    </div>
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E4E9F2]">
                      <span className="font-medium text-slate-500">Graphics Controller</span>
                      <span className="font-bold text-slate-800">{product.metadata?.graphics || 'Intel Iris Xe / AMD Radeon'}</span>
                    </div>
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E4E9F2]">
                      <span className="font-medium text-slate-500">Battery Health Guarantee</span>
                      <span className="font-bold text-emerald-700">{product.metadata?.batteryHealth || 'Above 85% Guaranteed'}</span>
                    </div>
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E4E9F2]">
                      <span className="font-medium text-slate-500">Operating System</span>
                      <span className="font-bold text-slate-800">Genuine Windows 11 Pro (Pre-Installed & Activated)</span>
                    </div>
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E4E9F2]">
                      <span className="font-medium text-slate-500">Condition Grade</span>
                      <span className="font-bold text-[#1D6FF2]">Grade A+ Refurbished (Near Mint)</span>
                    </div>
                  </div>

                  {product.description && (
                    <div className="pt-4 border-t border-[#E4E9F2]">
                      <h4 className="text-sm font-black text-[#0B1F4B] mb-2">Overview</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{product.description}</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'inspection' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-black text-[#0B1F4B] mb-1">Our Comprehensive 32-Point Quality Checklist</h3>
                    <p className="text-xs text-slate-500">Every refurbished laptop undergoes meticulous engineering diagnostics before being approved for sale.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    {[
                      'Motherboard & chipset stress test (Passmark 100%)',
                      'Display panel: 0 dead pixels & backlight bleed test',
                      'Battery discharge & cycle count inspection (>85% health)',
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
                      <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-[#F8FAFC] border border-[#E4E9F2]">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                          ✓
                        </span>
                        <span className="text-slate-700 font-medium leading-tight">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'box' && (
                <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
                  <h3 className="text-base font-black text-[#0B1F4B]">Inside Your Sealed Delivery Package</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                    <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E4E9F2] text-center space-y-2">
                      <span className="text-3xl block">💻</span>
                      <strong className="text-slate-900 block font-bold">1x Certified Laptop</strong>
                      <p className="text-slate-500 text-[11px]">Sanitized, tested, and sealed in tamper-proof bubble sleeve.</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E4E9F2] text-center space-y-2">
                      <span className="text-3xl block">⚡</span>
                      <strong className="text-slate-900 block font-bold">Original Fast Charger</strong>
                      <p className="text-slate-500 text-[11px]">OEM high-wattage power adapter and Indian 3-pin power cord.</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E4E9F2] text-center space-y-2">
                      <span className="text-3xl block">📜</span>
                      <strong className="text-slate-900 block font-bold">32-Point QC Certificate</strong>
                      <p className="text-slate-500 text-[11px]">Signed physical inspection sheet showing component battery health.</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E4E9F2] text-center space-y-2">
                      <span className="text-3xl block">🛡️</span>
                      <strong className="text-slate-900 block font-bold">1-Year Warranty Card</strong>
                      <p className="text-slate-500 text-[11px]">Serial registration card for pan-India doorstep warranty claims.</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'warranty' && (
                <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
                  <h3 className="text-base font-black text-[#0B1F4B]">1-Year Comprehensive Warranty &amp; 7-Day Replacement</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-2.5">
                      <h4 className="font-bold text-[#1D6FF2] text-sm">🛡️ What is Covered:</h4>
                      <ul className="list-disc pl-4 space-y-1 text-slate-700">
                        <li>Motherboard, processor, RAM, and SSD hardware failure.</li>
                        <li>Display failure, lines, and power delivery circuitry.</li>
                        <li>Keyboard, trackpad, and speaker components.</li>
                        <li>Original power adapter and charging cable.</li>
                      </ul>
                    </div>
                    <div className="p-5 rounded-2xl bg-[#F8FAFC] border border-[#E4E9F2] space-y-2.5">
                      <h4 className="font-bold text-slate-800 text-sm">🔄 7-Day Replacement Guarantee:</h4>
                      <p className="text-slate-600">
                        If your laptop has any functional defects or does not meet your expectations upon delivery, we will arrange a doorstep reverse pickup and provide a hassle-free replacement or refund within 7 days.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'faq' && (
                <div className="space-y-3 text-xs">
                  <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E4E9F2] space-y-1">
                    <strong className="text-slate-900 block font-bold">What is Grade A+ refurbished condition?</strong>
                    <p className="text-slate-600">Grade A+ indicates the laptop is in near-mint cosmetic condition with minimal to no visible signs of previous use. All internal hardware works at 100% factory specifications.</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E4E9F2] space-y-1">
                    <strong className="text-slate-900 block font-bold">Does it come with an authentic OS and charger?</strong>
                    <p className="text-slate-600">Yes! Every laptop comes pre-activated with genuine Windows 11 Pro, complete with an OEM compatible high-wattage fast charger.</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#F8FAFC] border border-[#E4E9F2] space-y-1">
                    <strong className="text-slate-900 block font-bold">Can I claim 18% GST input credit for business purchases?</strong>
                    <p className="text-slate-600">Yes! Simply enter your company GSTIN during checkout, and a compliant Tax Invoice will be generated automatically for your account.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SIMILAR LAPTOPS SECTION */}
          {similarProducts.length > 0 && (
            <div className="mt-12 sm:mt-16 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-[#0B1F4B] tracking-tight">Similar Certified Laptops</h3>
                  <p className="text-xs text-slate-500">Explore comparable business-class laptops tested and backed by warranty</p>
                </div>
                <Link
                  href="/products"
                  className="text-xs font-bold text-[#1D6FF2] hover:underline"
                >
                  View all laptops →
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
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
