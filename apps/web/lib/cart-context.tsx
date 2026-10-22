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
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed.items)) {
          setCartState({ key: storageKey, items: parsed.items });
          return;
        }
      }
    } catch {
      // Ignore parse error
    }
    setCartState({ key: storageKey, items: [] });
  }, [isLoading, storageKey]);

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
    // Asynchronously notify backend API
    api.addToCart(product.id, quantity).catch(() => {});
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    const updated = items.map(item =>
      item.productId === productId ? { ...item, quantity } : item
    );
    saveCart(updated);
  };

  const removeItem = (productId: string) => {
    const item = items.find(i => i.productId === productId);
    const updated = items.filter(item => item.productId !== productId);
    saveCart(updated);
    if (item) {
      api.removeCartItem(item.id).catch(() => {});
    }
  };

  const clearCart = () => {
    saveCart([]);
    api.clearCart().catch(() => {});
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
