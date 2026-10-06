'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { WishlistItem } from '@/lib/types';
import {
  Heart,
  ShoppingCart,
  Trash2,
  ShieldCheck,
  Package,
  ArrowRight,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const loadWishlist = async () => {
    setLoading(true);
    try {
      const data = await api.getWishlist();
      setItems(data);
    } catch {
      // handled
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWishlist();
  }, []);

  const handleRemove = async (itemId: string) => {
    try {
      await api.removeWishlistItem(itemId);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
      setToast('Item removed from wishlist');
      setTimeout(() => setToast(null), 3000);
    } catch (err: any) {
      alert(err?.message || 'Failed to remove item');
    }
  };

  const handleMoveToCart = async (item: WishlistItem) => {
    setAddingId(item.id);
    try {
      await api.addToCart(item.productId, 1);
      await api.removeWishlistItem(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setToast('Item moved to cart successfully!');
      setTimeout(() => setToast(null), 3000);
    } catch (err: any) {
      alert(err?.message || 'Failed to add item to cart');
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">My Saved Wishlist</h2>
          <p className="text-xs text-slate-500 mt-1">
            Save laptops to monitor price drops, inventory availability, and exclusive discounts.
          </p>
        </div>
        <span className="text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl self-start sm:self-auto">
          {items.length} {items.length === 1 ? 'Item' : 'Items'} Saved
        </span>
      </div>

      {toast && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold p-4 rounded-2xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          {toast}
        </div>
      )}

      {loading ? (
        <div className="py-16 flex items-center justify-center text-slate-400 text-sm">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading wishlist...
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <Heart className="w-10 h-10 text-rose-400 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-800">Your wishlist is currently empty</p>
          <p className="text-xs text-slate-500 mt-1">Explore our certified laptops and tap the heart icon to save.</p>
          <Link
            href="/products"
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition"
          >
            Browse Laptops
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {items.map((item) => {
            const prod = item.product;
            if (!prod) return null;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:border-slate-300 transition flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-[4/3] bg-slate-50 p-4 border-b border-slate-100">
                    <img
                      src={prod.images?.[0]?.url || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400'}
                      alt={prod.name}
                      className="w-full h-full object-contain"
                    />
                    <button
                      onClick={() => handleRemove(item.id)}
                      className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm border border-slate-200 text-slate-400 hover:text-rose-600 flex items-center justify-center shadow-sm transition"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="p-4 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">
                      {prod.category?.name || 'Refurbished Laptop'}
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 line-clamp-2">{prod.name}</h4>
                    <p className="text-xs text-slate-500 line-clamp-1">{prod.shortDescription}</p>

                    <div className="pt-2 flex items-baseline gap-2">
                      <span className="text-base font-black text-slate-900">
                        ₹{Number(prod.price).toLocaleString('en-IN')}
                      </span>
                      {prod.compareAtPrice && (
                        <span className="text-xs text-slate-400 line-through">
                          ₹{Number(prod.compareAtPrice).toLocaleString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <button
                    onClick={() => handleMoveToCart(item)}
                    disabled={addingId === item.id}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
                  >
                    {addingId === item.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ShoppingCart className="w-4 h-4" />
                    )}
                    {addingId === item.id ? 'Moving...' : 'Move to Cart'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
