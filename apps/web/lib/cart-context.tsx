'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CartItem } from './types';
import { api } from './api';
import { useAuth } from './auth-context';

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  oneTimeTotal: number;
  monthlyTotal: number;
  addItem: (
    product: Product,
    quantity?: number,
    options?: {
      purchaseMode?: 'sell' | 'lease';
      configuration?: 'default' | 'ram-16gb' | string;
      hasWarranty?: boolean;
      variantId?: string;
    }
  ) => void;
  updateQuantity: (itemIdOrProductId: string, quantity: number) => void;
  updateWarranty: (itemIdOrProductId: string, hasWarranty: boolean) => void;
  removeItem: (itemIdOrProductId: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function resolveUnitPrice(product: Product, mode: 'sell' | 'lease'): number {
  let basePrice: number;
  if (mode === 'lease') {
    if (product.leasePriceMonthly !== null && product.leasePriceMonthly !== undefined) {
      basePrice = Number(product.leasePriceMonthly);
    } else {
      throw new Error('This product does not have a fixed monthly lease price. Please request a quote.');
    }
  } else {
    basePrice = Number(product.price);
  }

  return basePrice;
}

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
                  await api.addToCart(
                    gItem.productId,
                    gItem.quantity || 1,
                    gItem.purchaseMode || 'sell',
                    gItem.configuration || 'default',
                    gItem.hasWarranty || false,
                    gItem.variantId || undefined
                  ).catch(() => {});
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
          const count = serverItems.reduce((acc: number, item: any) => acc + item.quantity, 0);
          localStorage.setItem(storageKey, JSON.stringify({
            items: serverItems,
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
    const count = newItems.reduce((acc, item) => acc + item.quantity, 0);
    localStorage.setItem(storageKey, JSON.stringify({
      items: newItems,
      itemCount: count,
    }));
  };

  const addItem = (
    product: Product,
    quantity = 1,
    options?: {
      purchaseMode?: 'sell' | 'lease';
      configuration?: 'default' | 'ram-16gb' | string;
      hasWarranty?: boolean;
      variantId?: string;
    }
  ) => {
    const mode = options?.purchaseMode === 'lease' ? 'lease' : 'sell';
    const defaultVariant = product.variants?.find((item) => item.isActive && item.isDefault)
      || product.variants?.find((item) => item.isActive);
    const variantId = options?.variantId || defaultVariant?.id;
    const variant = variantId ? product.variants?.find((item) => item.id === variantId && item.isActive) : undefined;
    if (variantId && !variant) throw new Error('Selected product variant is unavailable.');
    const config = 'default';
    const warranty = (options?.hasWarranty && mode === 'sell') ? true : false;
    const warrantyPrice = warranty ? 1999 : 0;
    const unitPrice = variant
      ? Number(mode === 'lease' ? variant.leasePriceMonthly : variant.price)
      : resolveUnitPrice(product, mode);
    if (variant && mode === 'lease' && variant.leasePriceMonthly == null) {
      throw new Error('This variant does not have a fixed monthly lease price. Please request a quote.');
    }

    const existingIndex = items.findIndex(
      item => item.productId === product.id &&
              (item.variantId || null) === (variantId || null) &&
              (item.purchaseMode || 'sell') === mode &&
              (item.configuration || 'default') === config
    );

    let updated: CartItem[];

    if (existingIndex > -1) {
      updated = items.map((item, idx) =>
        idx === existingIndex
          ? {
              ...item,
              quantity: item.quantity + quantity,
              hasWarranty: warranty || item.hasWarranty,
              warrantyPrice: warranty ? 1999 : (item.warrantyPrice || 0),
            }
          : item
      );
    } else {
      const newItem: CartItem = {
        id: `ci-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        productId: product.id,
        ...(variantId ? { variantId, variant } : {}),
        quantity,
        priceAtAdd: unitPrice,
        purchaseMode: mode,
        configuration: config,
        hasWarranty: warranty,
        warrantyPrice,
        product,
      };
      updated = [...items, newItem];
    }

    saveCart(updated);

    // Asynchronously notify backend API and synchronize server cart state
    if (firebaseUser) {
      api.addToCart(product.id, quantity, mode, config, warranty, variantId)
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

  const updateQuantity = (itemIdOrProductId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemIdOrProductId);
      return;
    }
    const item = items.find(i => i.id === itemIdOrProductId || i.productId === itemIdOrProductId);
    const updated = items.map(i =>
      (i.id === itemIdOrProductId || i.productId === itemIdOrProductId) ? { ...i, quantity } : i
    );
    saveCart(updated);
    if (firebaseUser && item) {
      api.updateCartQuantity(item.id, quantity).catch(() => {});
    }
  };

  const updateWarranty = (itemIdOrProductId: string, hasWarranty: boolean) => {
    const item = items.find(i => i.id === itemIdOrProductId || i.productId === itemIdOrProductId);
    if (!item || item.purchaseMode === 'lease') return; // Warranty is sell-only

    const updated = items.map(i => {
      if (i.id === itemIdOrProductId || i.productId === itemIdOrProductId) {
        return {
          ...i,
          hasWarranty,
          warrantyPrice: hasWarranty ? 1999 : 0,
        };
      }
      return i;
    });

    saveCart(updated);
    if (firebaseUser && item) {
      api.updateCartItem(item.id, { hasWarranty }).catch(() => {});
    }
  };

  const removeItem = (itemIdOrProductId: string) => {
    const item = items.find(i => i.id === itemIdOrProductId || i.productId === itemIdOrProductId);
    const updated = items.filter(i => !(i.id === itemIdOrProductId || i.productId === itemIdOrProductId));
    saveCart(updated);
    if (firebaseUser && item) {
      api.removeCartItem(item.id).catch(() => {});
    }
  };

  const clearCart = () => {
    saveCart([]);
    if (firebaseUser) {
      api.clearCart().catch(() => {});
    }
  };

  const oneTimeTotal = items
    .filter(i => (i.purchaseMode || 'sell') === 'sell')
    .reduce((acc, item) => acc + (Number(item.priceAtAdd) + (item.hasWarranty ? (item.warrantyPrice || 1999) : 0)) * item.quantity, 0);

  const monthlyTotal = items
    .filter(i => i.purchaseMode === 'lease')
    .reduce((acc, item) => acc + Number(item.priceAtAdd) * item.quantity, 0);

  // Month 1 Advance (Option A): All one-time purchases + Month 1 advance on all lease items
  const subtotal = oneTimeTotal + monthlyTotal;
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider value={{
      items,
      itemCount,
      subtotal,
      oneTimeTotal,
      monthlyTotal,
      addItem,
      updateQuantity,
      updateWarranty,
      removeItem,
      clearCart,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
