'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product } from './types';
import { api } from './api';
import { useAuth } from './auth-context';

interface WishlistContextType {
  items: Product[];
  count: number;
  toggleWishlist: (product: Product) => Promise<boolean>;
  isInWishlist: (productId: string) => boolean;
  removeItem: (productId: string) => Promise<boolean>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { firebaseUser, isLoading } = useAuth();
  const storageKey = `lm_wishlist:${firebaseUser?.uid ?? 'guest'}`;
  const [wishlistState, setWishlistState] = useState<{ key: string; items: Product[] }>({ key: '', items: [] });
  const items = wishlistState.key === storageKey ? wishlistState.items : [];

  useEffect(() => {
    if (isLoading) return;
    let isCancelled = false;

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setWishlistState({ key: storageKey, items: parsed });
        }
      } else {
        setWishlistState({ key: storageKey, items: [] });
      }
    } catch {
      setWishlistState({ key: storageKey, items: [] });
    }

    if (firebaseUser) {
      api.getWishlist().then((serverItems: any[]) => {
        if (isCancelled) return;
        const products: Product[] = (Array.isArray(serverItems) ? serverItems : [])
          .map((item: any) => item.product || item)
          .filter(Boolean);
        setWishlistState({ key: storageKey, items: products });
        try {
          localStorage.setItem(storageKey, JSON.stringify(products));
        } catch {
          // Ignore
        }
      }).catch(() => {
        // Fallback
      });
    }

    return () => {
      isCancelled = true;
    };
  }, [isLoading, storageKey, firebaseUser]);

  const saveWishlist = (newItems: Product[]) => {
    setWishlistState({ key: storageKey, items: newItems });
    localStorage.setItem(storageKey, JSON.stringify(newItems));
  };

  const isInWishlist = (productId: string) => {
    return items.some(i => i.id === productId);
  };

  const toggleWishlist = async (product: Product): Promise<boolean> => {
    try {
      if (isInWishlist(product.id)) {
        await removeItem(product.id);
        return false;
      } else {
        const updated = [...items, product];
        saveWishlist(updated);
        if (firebaseUser) {
          await api.addToWishlist(product.id).catch(() => {});
        }
        return true;
      }
    } catch {
      return false;
    }
  };

  const removeItem = async (productId: string): Promise<boolean> => {
    try {
      const updated = items.filter((i) => i.id !== productId);
      saveWishlist(updated);
      if (firebaseUser) {
        await api.removeWishlistItem(productId).catch(() => {});
      }
      return true;
    } catch {
      return false;
    }
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
