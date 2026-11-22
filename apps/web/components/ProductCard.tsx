'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Product, CartItem } from '../lib/types';
import { useCart } from '../lib/cart-context';
import { useWishlist } from '../lib/wishlist-context';
import { useToast } from './ui/Toast';
import { GradeBadge } from './ui/Badge';
import SpecTag from './SpecTag';
import PriceDisplay from './PriceDisplay';
import { NEXT_PUBLIC_WHATSAPP_NUMBER } from '../lib/config';

/* ── Variants ── */
export type ProductCardVariant = 'default' | 'compact' | 'featured';

export interface ProductCardProps {
  product: Product;
  variant?: ProductCardVariant;
  onAddToCart?: (product: Product) => void;
  onToggleWishlist?: (product: Product) => void;
  className?: string;
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

/* ── Bulk Price helper (real DB column) ── */
export function getBulkPrice(product: Product): number | null {
  if (product.bulkSellPrice !== null && product.bulkSellPrice !== undefined) {
    return Number(product.bulkSellPrice);
  }
  return null;
}

/* ── Primary image ── */
export function getPrimaryImage(product: Product): string {
  return (
    product.images?.find((i) => i.isPrimary)?.url ||
    product.images?.[0]?.url ||
    'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=800&q=80'
  );
}

/* ── Battery health helper ── */
export function getBatteryHealth(product: Product): string | null {
  const raw = product.metadata?.batteryHealth || (product.metadata as any)?.battery;
  if (!raw) return null;
  const str = String(raw).trim();
  return str.length > 0 ? str : null;
}

/* ── Fly to Cart animation helper ── */
function triggerFlyToCart(sourceImgEl: HTMLElement | null, imageUrl: string) {
  if (typeof window === 'undefined' || !sourceImgEl) return;
  const cartIcon = document.getElementById('header-cart-icon') || document.querySelector('[data-cart-icon]');
  if (!cartIcon) return;

  const srcRect = sourceImgEl.getBoundingClientRect();
  const destRect = cartIcon.getBoundingClientRect();

  const flyEl = document.createElement('div');
  flyEl.style.position = 'fixed';
  flyEl.style.zIndex = '99999';
  flyEl.style.top = `${srcRect.top}px`;
  flyEl.style.left = `${srcRect.left}px`;
  flyEl.style.width = `${srcRect.width}px`;
  flyEl.style.height = `${srcRect.height}px`;
  flyEl.style.borderRadius = '16px';
  flyEl.style.overflow = 'hidden';
  flyEl.style.boxShadow = '0 20px 30px -5px rgba(37, 99, 235, 0.45), 0 10px 10px -5px rgba(37, 99, 235, 0.2)';
  flyEl.style.border = '2px solid #2563EB';
  flyEl.style.pointerEvents = 'none';
  flyEl.style.transition = 'all 0.65s cubic-bezier(0.16, 1, 0.3, 1)';
  flyEl.style.transformOrigin = 'center center';
  flyEl.style.backgroundColor = '#FFFFFF';

  const img = document.createElement('img');
  img.src = imageUrl;
  img.style.width = '100%';
  img.style.height = '100%';
  img.style.objectFit = 'contain';
  img.style.padding = '4px';
  flyEl.appendChild(img);

  document.body.appendChild(flyEl);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const targetX = destRect.left + destRect.width / 2 - 18;
      const targetY = destRect.top + destRect.height / 2 - 18;
      flyEl.style.top = `${targetY}px`;
      flyEl.style.left = `${targetX}px`;
      flyEl.style.width = '36px';
      flyEl.style.height = '36px';
      flyEl.style.borderRadius = '9999px';
      flyEl.style.opacity = '0.3';
      flyEl.style.transform = 'scale(0.35) rotate(15deg)';
    });
  });

  setTimeout(() => {
    if (flyEl.parentNode) {
      flyEl.parentNode.removeChild(flyEl);
    }
    cartIcon.classList.remove('animate-cart-bounce');
    void cartIcon.offsetWidth;
    cartIcon.classList.add('animate-cart-bounce');
    setTimeout(() => {
      cartIcon.classList.remove('animate-cart-bounce');
    }, 600);
  }, 680);
}

/* ──────────────────────────────────────────────
   DEFAULT PRODUCT CARD (LaptopMitra Light Theme matching Image 1)
   ────────────────────────────────────────────── */

function DefaultCard({ product, onAddToCart, onToggleWishlist, className = '' }: ProductCardProps) {
  const router = useRouter();
  const imgRef = useRef<HTMLImageElement | null>(null);
  const { items, addItem, updateQuantity, removeItem } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { addToast } = useToast();
  const [isHeartPopping, setIsHeartPopping] = useState(false);
  const [isWishlistUpdating, setIsWishlistUpdating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const cartItem = items.find((i) => i.productId === product.id && (i.purchaseMode || 'sell') === 'sell');
  const quantityInCart = cartItem ? cartItem.quantity : 0;

  const isWish = isInWishlist(product.id);
  const grade = getGrade(product);
  const discount = getDiscount(product);
  const img = getPrimaryImage(product);
  const inStock = product.stock > 0;
  const numPrice = Number(product.price);
  const bulkPrice = getBulkPrice(product);
  const batteryHealth = getBatteryHealth(product);

  const handleAdd = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!inStock || isUpdating) return;
    setIsUpdating(true);
    try {
      const ok = await addItem(product, 1);
      if (ok !== false) {
        setJustAdded(true);
        triggerFlyToCart(imgRef.current, img);
        addToast('success', `${product.name} added to cart`);
        onAddToCart?.(product);
        setTimeout(() => setJustAdded(false), 1200);
      } else {
        addToast('error', `Could not add ${product.name} to cart. Try again.`);
      }
    } catch {
      addToast('error', `Could not add ${product.name} to cart. Try again.`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleIncrement = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!cartItem || isUpdating) return;
    if (quantityInCart >= product.stock) return;
    setIsUpdating(true);
    try {
      await updateQuantity(cartItem.id, quantityInCart + 1);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDecrement = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!cartItem || isUpdating) return;
    setIsUpdating(true);
    try {
      if (quantityInCart <= 1) {
        await removeItem(cartItem.id);
      } else {
        await updateQuantity(cartItem.id, quantityInCart - 1);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!inStock || isUpdating) return;

    const buyNowItem: CartItem = {
      id: `buy-now-${product.id}-default-sell`,
      productId: product.id,
      variantId: null,
      variant: null,
      quantity: 1,
      priceAtAdd: Number(product.price),
      purchaseMode: 'sell',
      configuration: 'default',
      hasWarranty: false,
      product,
    };

    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem('lm_buy_now_item', JSON.stringify(buyNowItem));
      } catch (err) {
        console.error('Failed to set buy-now item in sessionStorage', err);
      }
    }
    router.push('/checkout?buyNow=1');
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isWishlistUpdating) return;
    setIsWishlistUpdating(true);
    setIsHeartPopping(true);
    const nextState = !isWish;
    try {
      await toggleWishlist(product);
      onToggleWishlist?.(product);
      if (nextState) {
        addToast('success', `Saved ${product.name} to wishlist`);
      } else {
        addToast('info', `Removed ${product.name} from wishlist`);
      }
    } catch {
      addToast('error', `Could not update wishlist. Try again.`);
    } finally {
      setTimeout(() => setIsHeartPopping(false), 300);
      setIsWishlistUpdating(false);
    }
  };

  const handleWhatsApp = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = `https://wa.me/${NEXT_PUBLIC_WHATSAPP_NUMBER}?text=${encodeURIComponent(
      `Hi LaptopMitra, I am interested in ${product.name} (SKU: ${product.sku}) priced at ₹${numPrice.toLocaleString('en-IN')}. Please share bulk/best quotation.`
    )}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className={[
        'group relative flex flex-col rounded-2xl overflow-hidden h-full',
        'border border-[#E6DFD5] bg-[#FFFDF9] shadow-xs',
        'transition-all duration-300 ease-out',
        'hover:-translate-y-1 hover:border-[#2563EB]/50 hover:shadow-xl hover:shadow-blue-900/10',
        !inStock && 'opacity-75',
        className,
      ].join(' ')}
      role="article"
      aria-label={product.name}
    >
      {/* ── Top Floating Badges ── */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 pointer-events-none">
        {/* Best Seller badge if featured */}
        {product.isFeatured && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#F97316] text-white uppercase tracking-wider shadow-xs">
            ⭐ Best Seller
          </span>
        )}

        {/* New Arrival badge */}
        {!product.isFeatured && product.isNewArrival && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#2563EB] text-white uppercase tracking-wider shadow-xs">
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

        {/* Wishlist Button with Heart Fill Transition & Scale Pop */}
        <button
          onClick={handleWishlist}
          disabled={isWishlistUpdating}
          aria-label={isWish ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          className={[
            'w-9 h-9 rounded-full flex items-center justify-center cursor-pointer group/wish',
            'backdrop-blur-md shadow-xs transition-all duration-200 hover:scale-110 active:scale-90',
            isWish
              ? 'bg-rose-50 text-rose-600 border border-rose-200'
              : 'bg-white/90 text-slate-400 border border-slate-200 hover:text-rose-600 hover:bg-white',
            isHeartPopping && 'scale-125 transition-transform duration-200',
            isWishlistUpdating && 'opacity-60 cursor-wait',
          ].join(' ')}
        >
          <svg
            className="w-4 h-4 transition-transform duration-200 group-hover/wish:scale-110"
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

      {/* ── Product Media Frame with 1.00 to 1.03 Zoom on Hover ── */}
      <Link
        href={`/products/${product.id}`}
        className="block relative aspect-[4/3] overflow-hidden bg-[#FAF6EF] border-b border-[#E6DFD5]/70 cursor-pointer"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={img}
          alt={product.name}
          onLoad={() => setImgLoaded(true)}
          className={`w-full h-full object-cover transition-all duration-500 ease-out group-hover:scale-[1.03] ${imgLoaded ? 'opacity-100 blur-0' : 'opacity-0 blur-xs'}`}
          loading="lazy"
        />

        {/* Grade & Warranty Pills overlay */}
        <div className="absolute bottom-2 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          <GradeBadge grade={grade} size="sm" />
          <span className="px-2 py-0.5 rounded-md bg-white/95 text-slate-800 text-[10px] font-bold backdrop-blur-sm border border-slate-200/80 flex items-center gap-1 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" />
            1-Yr Warranty
          </span>
        </div>
      </Link>

      {/* ── Product Details matching Image 1 ── */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          {/* Category + Stock / Ready for Dispatch bar */}
          <div className="flex items-center justify-between text-[11px] h-5">
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

          {/* Title with uniform 2-line height */}
          <Link
            href={`/products/${product.id}`}
            className="block group-hover:text-[#2563EB] transition-colors cursor-pointer min-h-[2.5rem] flex items-start"
          >
            <h3 className="font-bold text-sm text-[#111827] line-clamp-2 leading-snug">
              {product.name}
            </h3>
          </Link>

          {/* Glanceable Spec Summary Line with uniform height */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5 min-h-[3.25rem] content-start overflow-hidden">
            {product.metadata?.ram && <SpecTag variant="ram" value={product.metadata.ram} />}
            {product.metadata?.storage && <SpecTag variant="storage" value={product.metadata.storage} />}
            {product.metadata?.processor && (
              <SpecTag variant="processor" value={product.metadata.processor.split('(')[0].trim()} />
            )}
            {batteryHealth && <SpecTag variant="battery" value={batteryHealth} />}
          </div>

          {/* Bulk Pricing Line with uniform height */}
          <div className="h-7 flex items-center">
            {bulkPrice ? (
              <div className="w-full text-[11px] text-slate-600 bg-slate-50 border border-slate-200/80 px-2 py-1 rounded-md flex items-center justify-between font-medium">
                <span>Bulk (5+ units):</span>
                <strong className="text-[#0B1F4B] font-bold">₹{bulkPrice.toLocaleString('en-IN')}/pc</strong>
              </div>
            ) : (
              <div className="w-full text-[11px] text-slate-500 bg-slate-50 border border-slate-200/80 px-2 py-1 rounded-md flex items-center justify-between font-medium">
                <span>Bulk (5+ units):</span>
                <span className="text-[#2563EB] font-semibold">Quote on request</span>
              </div>
            )}
          </div>
        </div>

        {/* Price & Action Buttons pinned to bottom with mt-auto */}
        <div className="mt-auto pt-3 border-t border-[#E6DFD5]/80 space-y-2">
          {/* Price & Savings with uniform min-height */}
          <div className="min-h-[44px] flex flex-col justify-end">
            <PriceDisplay
              price={numPrice}
              compareAtPrice={product.compareAtPrice ? Number(product.compareAtPrice) : undefined}
              size="sm"
            />
          </div>

          {/* Action Buttons: Add to Cart / Live Quantity Stepper + Buy Now */}
          <div className="grid grid-cols-2 gap-2 h-9 items-center">
            {!inStock ? (
              <button
                disabled
                className="col-span-2 h-9 px-3 rounded-xl text-xs font-semibold bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed flex items-center justify-center"
              >
                Out of Stock
              </button>
            ) : (
              <>
                {/* Just Added celebratory state OR Loading spinner OR Stepper if in cart, otherwise Add to Cart button */}
                {justAdded ? (
                  <div className="h-9 w-full px-2 rounded-xl text-xs font-bold bg-[#16A34A] text-white flex items-center justify-center gap-1.5 shadow-xs animate-pop-in">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Added!</span>
                  </div>
                ) : isUpdating && quantityInCart === 0 ? (
                  <button
                    disabled
                    className="h-9 w-full px-2 rounded-xl text-xs font-bold border border-[#2563EB]/40 text-[#2563EB] bg-blue-50/50 flex items-center justify-center gap-1.5 cursor-wait"
                  >
                    <svg className="w-3.5 h-3.5 animate-spin-slow" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    <span>Adding...</span>
                  </button>
                ) : quantityInCart > 0 ? (
                  <div className="h-9 w-full rounded-xl border border-[#2563EB] bg-blue-50/90 flex items-center justify-between px-2 shadow-2xs">
                    <button
                      type="button"
                      onClick={handleDecrement}
                      disabled={isUpdating}
                      className="w-6 h-6 rounded-md flex items-center justify-center text-sm font-black text-[#2563EB] hover:bg-blue-200/60 button-press transition-colors cursor-pointer disabled:opacity-50"
                      aria-label="Decrease quantity"
                      title="Decrease quantity"
                    >
                      −
                    </button>
                    <span className="text-xs font-black text-[#0B1F4B] tabular-nums select-none px-1">
                      {quantityInCart}
                    </span>
                    <button
                      type="button"
                      onClick={handleIncrement}
                      disabled={isUpdating || quantityInCart >= product.stock}
                      className="w-6 h-6 rounded-md flex items-center justify-center text-sm font-black text-[#2563EB] hover:bg-blue-200/60 button-press transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                      aria-label="Increase quantity"
                      title="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleAdd}
                    disabled={isUpdating}
                    className="h-9 w-full px-2 rounded-xl text-xs font-bold border border-[#2563EB] text-[#2563EB] bg-white hover:bg-blue-50 button-press transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs active:scale-95"
                    aria-label={`Add ${product.name} to cart`}
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Add to Cart</span>
                  </button>
                )}

                {/* Buy Now Button with Arrow Feedback */}
                <button
                  type="button"
                  onClick={handleBuyNow}
                  disabled={isUpdating}
                  className="group/buy h-9 w-full px-2 rounded-xl text-xs font-bold bg-[#2563EB] hover:bg-[#1D4ED8] text-white button-press transition-all shadow-xs shadow-blue-500/20 cursor-pointer flex items-center justify-center gap-1 active:scale-95"
                  aria-label={`Buy ${product.name} now`}
                >
                  <span>Buy Now</span>
                  <svg
                    className="w-3.5 h-3.5 transition-transform duration-200 group-hover/buy:translate-x-0.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </button>
              </>
            )}
          </div>
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
      className="flex gap-3 p-3 rounded-xl border border-[#E6DFD5] bg-[#FFFDF9] hover:border-[#1D6FF2]/40 hover:shadow-sm transition-all group"
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
  className = '',
}: ProductCardProps) {
  if (variant === 'compact') {
    return <CompactCard product={product} onAddToCart={onAddToCart} onToggleWishlist={onToggleWishlist} />;
  }
  return <DefaultCard product={product} onAddToCart={onAddToCart} onToggleWishlist={onToggleWishlist} className={className} />;
}
