'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from './types';
import { api } from './api';
import { useAuth } from './auth-context';

interface WishlistContextType {
  items: Product[];
  count: number;
  toggleWishlist: (product: Product) => void;
  isInWishlist: (productId: string) => boolean;
  removeItem: (productId: string) => void;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { firebaseUser, isLoading } = useAuth();
  const storageKey = `lm_wishlist:${firebaseUser?.uid ?? 'guest'}`;
  const [wishlistState, setWishlistState] = useState<{ key: string; items: Product[] }>({ key: '', items: [] });
  const items = wishlistState.key === storageKey ? wishlistState.items : [];

  useEffect(() => {
    if (isLoading) return;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setWishlistState({ key: storageKey, items: parsed });
          return;
        }
      }
    } catch {
      // Ignore parse error
    }
    setWishlistState({ key: storageKey, items: [] });
  }, [isLoading, storageKey]);

  const saveWishlist = (newItems: Product[]) => {
    setWishlistState({ key: storageKey, items: newItems });
    localStorage.setItem(storageKey, JSON.stringify(newItems));
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
