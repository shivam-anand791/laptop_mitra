'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CartItem } from './types';
import { api } from './api';
import { useAuth } from './auth-context';

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  addItem: (product: Product, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { firebaseUser, isLoading } = useAuth();
  const storageKey = `lm_cart:${firebaseUser?.uid ?? 'guest'}`;
  const [cartState, setCartState] = useState<{ key: string; items: CartItem[] }>({ key: '', items: [] });
  const items = cartState.key === storageKey ? cartState.items : [];

  useEffect(() => {
    if (isLoading) return;
    let isCancelled = false;

    // Load from local storage for instant responsiveness
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed.items)) {
          setCartState({ key: storageKey, items: parsed.items });
        }
      } else {
        setCartState({ key: storageKey, items: [] });
      }
    } catch {
      setCartState({ key: storageKey, items: [] });
    }

    // Synchronize authoritative cart from backend if authenticated
    if (firebaseUser) {
      const syncBackendCart = async () => {
        // Reconcile guest cart into authenticated user cart
        try {
          const guestStored = localStorage.getItem('lm_cart:guest');
          if (guestStored) {
            const parsed = JSON.parse(guestStored);
            if (Array.isArray(parsed?.items) && parsed.items.length > 0) {
              for (const gItem of parsed.items) {
                if (gItem?.productId) {
                  await api.addToCart(gItem.productId, gItem.quantity || 1).catch(() => {});
                }
              }
              localStorage.removeItem('lm_cart:guest');
            }
          }
        } catch {
          // Ignore guest merge parse errors
        }

        try {
          const res: any = await api.getCart();
          if (isCancelled) return;
          const serverCart = res?.cart ?? res;
          const serverItems = Array.isArray(serverCart?.items) ? serverCart.items : [];
          setCartState({ key: storageKey, items: serverItems });
          const subtotal = serverItems.reduce((acc: number, item: any) => acc + Number(item.priceAtAdd) * item.quantity, 0);
          const count = serverItems.reduce((acc: number, item: any) => acc + item.quantity, 0);
          localStorage.setItem(storageKey, JSON.stringify({
            items: serverItems,
            total: subtotal,
            itemCount: count,
          }));
        } catch {
          // Fallback to local cache if network/API temporarily unavailable
        }
      };

      void syncBackendCart();
    }

    return () => {
      isCancelled = true;
    };
  }, [isLoading, storageKey, firebaseUser]);

  const saveCart = (newItems: CartItem[]) => {
    setCartState({ key: storageKey, items: newItems });
    const subtotal = newItems.reduce((acc, item) => acc + Number(item.priceAtAdd) * item.quantity, 0);
    const count = newItems.reduce((acc, item) => acc + item.quantity, 0);
    localStorage.setItem(storageKey, JSON.stringify({
      items: newItems,
      total: subtotal,
      itemCount: count,
    }));
  };

  const addItem = (product: Product, quantity = 1) => {
    const existingIndex = items.findIndex(item => item.productId === product.id);
    let updated: CartItem[];

    if (existingIndex > -1) {
      updated = items.map((item, idx) =>
        idx === existingIndex ? { ...item, quantity: item.quantity + quantity } : item
      );
    } else {
      const newItem: CartItem = {
        id: `ci-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        productId: product.id,
        quantity,
        priceAtAdd: Number(product.price),
        product,
      };
      updated = [...items, newItem];
    }

    saveCart(updated);
    // Asynchronously notify backend API and synchronize server cart state
    if (firebaseUser) {
      api.addToCart(product.id, quantity)
        .then(() => api.getCart())
        .then((res: any) => {
          const serverCart = res?.cart ?? res;
          const serverItems = Array.isArray(serverCart?.items) ? serverCart.items : [];
          if (serverItems.length > 0) {
            setCartState({ key: storageKey, items: serverItems });
          }
        })
        .catch(() => {});
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    const item = items.find(i => i.productId === productId);
    const updated = items.map(item =>
      item.productId === productId ? { ...item, quantity } : item
    );
    saveCart(updated);
    if (firebaseUser) {
      api.updateCartQuantity(item?.id || productId, quantity).catch(() => {});
    }
  };

  const removeItem = (productId: string) => {
    const item = items.find(i => i.productId === productId);
    const updated = items.filter(item => item.productId !== productId);
    saveCart(updated);
    if (firebaseUser) {
      api.removeCartItem(item?.id || productId).catch(() => {});
    }
  };

  const clearCart = () => {
    saveCart([]);
    if (firebaseUser) {
      api.clearCart().catch(() => {});
    }
  };

  const subtotal = items.reduce((acc, item) => acc + Number(item.priceAtAdd) * item.quantity, 0);
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, itemCount, subtotal, addItem, updateQuantity, removeItem, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
