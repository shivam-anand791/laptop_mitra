'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from './types';
import { api } from './api';

interface WishlistContextType {
  items: Product[];
  count: number;
  toggleWishlist: (product: Product) => void;
  isInWishlist: (productId: string) => boolean;
  removeItem: (productId: string) => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('lm_wishlist');
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch {
      // Ignore parse error
    }
  }, []);

  const saveWishlist = (newItems: Product[]) => {
    setItems(newItems);
    localStorage.setItem('lm_wishlist', JSON.stringify(newItems));
  };

  const isInWishlist = (productId: string) => {
    return items.some(i => i.id === productId);
  };

  const toggleWishlist = (product: Product) => {
    if (isInWishlist(product.id)) {
      removeItem(product.id);
    } else {
      const updated = [...items, product];
      saveWishlist(updated);
      api.addToWishlist(product.id).catch(() => {});
    }
  };

  const removeItem = (productId: string) => {
    const updated = items.filter(i => i.id !== productId);
    saveWishlist(updated);
    api.removeWishlistItem(productId).catch(() => {});
  };

  return (
    <WishlistContext.Provider value={{ items, count: items.length, toggleWishlist, isInWishlist, removeItem }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within a WishlistProvider');
  return ctx;
}
