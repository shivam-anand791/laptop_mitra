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
  isSyncing: boolean;
  syncError: string | null;
  addItem: (
    product: Product,
    quantity?: number,
    options?: {
      purchaseMode?: 'sell' | 'lease';
      configuration?: 'default' | 'ram-16gb' | string;
      hasWarranty?: boolean;
      variantId?: string;
      tenureMonths?: 1 | 3 | 6 | 12 | 24;
    }
  ) => void;
  updateQuantity: (itemIdOrProductId: string, quantity: number) => void;
  updateWarranty: (itemIdOrProductId: string, hasWarranty: boolean) => void;
  removeItem: (itemIdOrProductId: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { firebaseUser, isLoading } = useAuth();
  const storageKey = `lm_cart:${firebaseUser?.uid ?? 'guest'}`;
  const [cartState, setCartState] = useState<{ key: string; items: CartItem[] }>({ key: '', items: [] });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const items = cartState.key === storageKey ? cartState.items : [];

  useEffect(() => {
    if (isLoading) return;
    let isCancelled = false;
    let cachedItems: CartItem[] = [];

    // Load from local storage for instant responsiveness
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed.items)) {
          cachedItems = parsed.items;
          setCartState({ key: storageKey, items: cachedItems });
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
        setIsSyncing(true);
        setSyncError(null);
        try {
          const initial: any = await api.getCart();
          let serverCart = initial?.cart ?? initial;
          let serverItems: CartItem[] = Array.isArray(serverCart?.items) ? serverCart.items : [];
          const guestStored = localStorage.getItem('lm_cart:guest');
          const guestItems = guestStored ? JSON.parse(guestStored)?.items : null;
          const itemsToRestore = Array.isArray(guestItems) && guestItems.length ? guestItems : cachedItems;
          if (new Set(itemsToRestore.map((item: CartItem) => item.purchaseMode === 'lease' ? 'lease' : 'sell')).size > 1) {
            throw new Error('Buy and rent items cannot be combined. Remove one mode from your saved cart before syncing.');
          }
          if (serverItems.length === 0 && itemsToRestore.length) {
            for (const item of itemsToRestore) {
              if (!item?.productId) continue;
              await api.addToCart(
                item.productId,
                item.quantity || 1,
                item.purchaseMode || 'sell',
                item.configuration || 'default',
                !!item.hasWarranty,
                item.variantId || undefined,
                item.tenureMonths || undefined,
              );
            }
            const refreshed: any = await api.getCart();
            serverCart = refreshed?.cart ?? refreshed;
            serverItems = Array.isArray(serverCart?.items) ? serverCart.items : [];
            if (serverItems.length === 0) throw new Error('Your cart could not be synchronized. Please refresh and try again.');
            if (Array.isArray(guestItems) && guestItems.length) localStorage.removeItem('lm_cart:guest');
          }
          if (isCancelled) return;
          setCartState({ key: storageKey, items: serverItems });
          const count = serverItems.reduce((acc: number, item: any) => acc + item.quantity, 0);
          localStorage.setItem(storageKey, JSON.stringify({
            items: serverItems,
            itemCount: count,
          }));
        } catch (error) {
          if (!isCancelled) setSyncError(error instanceof Error ? error.message : 'Cart synchronization failed. Please retry.');
        } finally {
          if (!isCancelled) setIsSyncing(false);
        }
      };

      void syncBackendCart();
    } else {
      setIsSyncing(false);
      setSyncError(null);
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
      tenureMonths?: 1 | 3 | 6 | 12 | 24;
    }
  ) => {
    const mode = options?.purchaseMode === 'lease' ? 'lease' : 'sell';
    if (items.some((item) => (item.purchaseMode === 'lease' ? 'lease' : 'sell') !== mode)) {
      throw new Error('Buy and rent items must be kept in separate carts. Your current cart was not changed.');
    }
    const defaultVariant = product.variants?.find((item) => item.isActive && item.isDefault)
      || product.variants?.find((item) => item.isActive);
    const variantId = options?.variantId || defaultVariant?.id;
    const variant = variantId ? product.variants?.find((item) => item.id === variantId && item.isActive) : undefined;
    if (variantId && !variant) throw new Error('Selected product variant is unavailable.');
    const config = 'default';
    const warranty = (options?.hasWarranty && mode === 'sell') ? true : false;
    const warrantyPrice = warranty ? 1999 : 0;
    const tenureMonths = options?.tenureMonths;
    const rentalPlans = variant?.rentalPlans ?? product.rentalPlans ?? [];
    const rentalPlan = mode === 'lease' ? rentalPlans.find((plan) => plan.tenureMonths === tenureMonths) : undefined;
    if (mode === 'lease' && !rentalPlan) {
      throw new Error('This product has no approved rental price for the selected tenure.');
    }
    const unitPrice = mode === 'lease' ? rentalPlan!.monthlyPrice : Number(variant?.price ?? product.price);

    const existingIndex = items.findIndex(
      item => item.productId === product.id &&
              (item.variantId || null) === (variantId || null) &&
              (item.purchaseMode || 'sell') === mode &&
              (item.tenureMonths || null) === (mode === 'lease' ? tenureMonths : null) &&
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
        ...(mode === 'lease' ? { tenureMonths } : {}),
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
      api.addToCart(product.id, quantity, mode, config, warranty, variantId, tenureMonths)
        .then(() => api.getCart())
        .then((res: any) => {
          const serverCart = res?.cart ?? res;
          const serverItems = Array.isArray(serverCart?.items) ? serverCart.items : [];
          if (serverItems.length > 0) {
            setCartState({ key: storageKey, items: serverItems });
          }
        })
        .catch((error: unknown) => {
          setSyncError(error instanceof Error ? error.message : 'Cart update failed. Please refresh and try again.');
        });
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
      isSyncing,
      syncError,
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
