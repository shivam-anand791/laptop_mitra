'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Product, CartItem } from './types';
import { api } from './api';
import { useAuth } from './auth-context';

export const CART_UPDATE_ERROR_MESSAGE = "We couldn't update your cart. Try again.";

type PendingCartOp =
  | { type: 'sync' }
  | { type: 'clear' }
  | {
      type: 'add';
      lineKey: string;
      productId: string;
      quantity: number;
      purchaseMode: 'sell' | 'lease';
      configuration: string;
      hasWarranty: boolean;
      variantId?: string;
      tenureMonths?: number;
    }
  | {
      type: 'update';
      itemId: string;
      data: { quantity?: number; hasWarranty?: boolean };
    }
  | {
      type: 'remove';
      itemId: string;
    };

function buildLineKey(
  productId: string,
  purchaseMode: 'sell' | 'lease',
  configuration: string,
  variantId?: string | null,
  tenureMonths?: number | null,
): string {
  return `${productId}:${variantId || ''}:${purchaseMode}:${purchaseMode === 'lease' ? tenureMonths || '' : ''}:${configuration}`;
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  oneTimeTotal: number;
  monthlyTotal: number;
  isSyncing: boolean;
  syncError: string | null;
  hasPendingSync: boolean;
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
  ) => Promise<boolean>;
  updateQuantity: (itemIdOrProductId: string, quantity: number) => Promise<boolean>;
  updateWarranty: (itemIdOrProductId: string, hasWarranty: boolean) => Promise<boolean>;
  removeItem: (itemIdOrProductId: string) => Promise<boolean>;
  clearCart: () => Promise<boolean>;
  retrySync: () => Promise<boolean>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { firebaseUser, isLoading } = useAuth();
  const storageKey = `lm_cart:${firebaseUser?.uid ?? 'guest'}`;
  const [cartState, setCartState] = useState<{ key: string; items: CartItem[] }>({ key: '', items: [] });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [hasPendingSync, setHasPendingSync] = useState(false);
  const pendingOpsRef = useRef<PendingCartOp[]>([]);
  const items = cartState.key === storageKey ? cartState.items : [];
  const itemsRef = useRef<CartItem[]>(items);
  itemsRef.current = items;

  const saveCart = useCallback(
    (newItems: CartItem[]) => {
      setCartState({ key: storageKey, items: newItems });
      const count = newItems.reduce((acc, item) => acc + item.quantity, 0);
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          items: newItems,
          itemCount: count,
        }),
      );
    },
    [storageKey],
  );

  const enqueuePendingOp = useCallback((op: PendingCartOp) => {
    if (op.type === 'clear') {
      pendingOpsRef.current = [op];
    } else if (op.type === 'sync') {
      if (!pendingOpsRef.current.some((existing) => existing.type === 'sync')) {
        pendingOpsRef.current.push(op);
      }
    } else {
      pendingOpsRef.current.push(op);
    }
    setHasPendingSync(true);
    setSyncError(CART_UPDATE_ERROR_MESSAGE);
  }, []);

  const syncWithServer = useCallback(
    async (cachedLocalItems?: CartItem[], cancelledRef?: { current: boolean }): Promise<boolean> => {
      if (!firebaseUser) {
        pendingOpsRef.current = [];
        setHasPendingSync(false);
        setSyncError(null);
        return true;
      }

      setIsSyncing(true);
      try {
        // Replay any pending offline/failed operations first
        if (pendingOpsRef.current.length > 0) {
          const ops = [...pendingOpsRef.current];
          for (let i = 0; i < ops.length; i += 1) {
            const op = ops[i];
            if (op.type === 'clear') {
              await api.clearCart();
            } else if (op.type === 'add') {
              await api.addToCart(
                op.productId,
                op.quantity,
                op.purchaseMode,
                op.configuration,
                op.hasWarranty,
                op.variantId,
                op.tenureMonths,
              );
            } else if (op.type === 'update') {
              await api.updateCartItem(op.itemId, op.data);
            } else if (op.type === 'remove') {
              await api.removeCartItem(op.itemId);
            }
          }
        }

        const initial: any = await api.getCart();
        let serverCart = initial?.cart ?? initial;
        let serverItems: CartItem[] = Array.isArray(serverCart?.items) ? serverCart.items : [];

        const guestStored = localStorage.getItem('lm_cart:guest');
        const guestItems = guestStored ? JSON.parse(guestStored)?.items : null;
        const localFallbackItems =
          Array.isArray(guestItems) && guestItems.length
            ? guestItems
            : (cachedLocalItems ?? itemsRef.current);

        if (
          new Set(
            localFallbackItems.map((item: CartItem) =>
              item.purchaseMode === 'lease' ? 'lease' : 'sell',
            ),
          ).size > 1
        ) {
          throw new Error(
            'Buy and rent items cannot be combined. Remove one mode from your saved cart before syncing.',
          );
        }

        const hadExplicitClear = pendingOpsRef.current.some((op) => op.type === 'clear');
        if (!hadExplicitClear && serverItems.length === 0 && localFallbackItems.length > 0) {
          for (const item of localFallbackItems) {
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
          if (serverItems.length === 0) {
            throw new Error(CART_UPDATE_ERROR_MESSAGE);
          }
          if (Array.isArray(guestItems) && guestItems.length) {
            localStorage.removeItem('lm_cart:guest');
          }
        }

        if (cancelledRef?.current) return true;
        pendingOpsRef.current = [];
        setHasPendingSync(false);
        setSyncError(null);
        saveCart(serverItems);
        return true;
      } catch (error) {
        if (!cancelledRef?.current) {
          if (!pendingOpsRef.current.length) {
            pendingOpsRef.current = [{ type: 'sync' }];
          }
          setHasPendingSync(true);
          if (error instanceof Error && error.message.includes('cannot be combined')) {
            setSyncError(error.message);
          } else {
            setSyncError(CART_UPDATE_ERROR_MESSAGE);
          }
        }
        return false;
      } finally {
        if (!cancelledRef?.current) setIsSyncing(false);
      }
    },
    [firebaseUser, saveCart],
  );

  useEffect(() => {
    if (isLoading) return;
    const cancelledRef = { current: false };
    let cachedItems: CartItem[] = [];

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

    pendingOpsRef.current = [];
    setHasPendingSync(false);

    if (firebaseUser) {
      void syncWithServer(cachedItems, cancelledRef);
    } else {
      setIsSyncing(false);
      setSyncError(null);
    }

    return () => {
      cancelledRef.current = true;
    };
  }, [isLoading, storageKey, firebaseUser, syncWithServer]);

  const addItem = async (
    product: Product,
    quantity = 1,
    options?: {
      purchaseMode?: 'sell' | 'lease';
      configuration?: 'default' | 'ram-16gb' | string;
      hasWarranty?: boolean;
      variantId?: string;
      tenureMonths?: 1 | 3 | 6 | 12 | 24;
    },
  ): Promise<boolean> => {
    const mode = options?.purchaseMode === 'lease' ? 'lease' : 'sell';
    if (items.some((item) => (item.purchaseMode === 'lease' ? 'lease' : 'sell') !== mode)) {
      throw new Error('Buy and rent items must be kept in separate carts. Your current cart was not changed.');
    }
    const defaultVariant =
      product.variants?.find((item) => item.isActive && item.isDefault) ||
      product.variants?.find((item) => item.isActive);
    const variantId = options?.variantId || defaultVariant?.id;
    const variant = variantId
      ? product.variants?.find((item) => item.id === variantId && item.isActive)
      : undefined;
    if (variantId && !variant) throw new Error('Selected product variant is unavailable.');
    const config = options?.configuration || 'default';
    const warranty = Boolean(options?.hasWarranty && mode === 'sell');
    const warrantyPrice = warranty ? 1999 : 0;
    const tenureMonths = options?.tenureMonths;
    const rentalPlans = variant?.rentalPlans ?? product.rentalPlans ?? [];
    const rentalPlan =
      mode === 'lease' ? rentalPlans.find((plan) => plan.tenureMonths === tenureMonths) : undefined;
    if (mode === 'lease' && !rentalPlan) {
      throw new Error('This product has no approved rental price for the selected tenure.');
    }
    const unitPrice = mode === 'lease' ? rentalPlan!.monthlyPrice : Number(variant?.price ?? product.price);

    const existingIndex = items.findIndex(
      (item) =>
        item.productId === product.id &&
        (item.variantId || null) === (variantId || null) &&
        (item.purchaseMode || 'sell') === mode &&
        (item.tenureMonths || null) === (mode === 'lease' ? tenureMonths : null) &&
        (item.configuration || 'default') === config,
    );

    let updated: CartItem[];

    if (existingIndex > -1) {
      updated = items.map((item, idx) =>
        idx === existingIndex
          ? {
              ...item,
              quantity: item.quantity + quantity,
              hasWarranty: warranty || item.hasWarranty,
              warrantyPrice: warranty ? 1999 : item.warrantyPrice || 0,
            }
          : item,
      );
    } else {
      const newItem: CartItem = {
        id: `ci-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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

    // Always keep the local cart item even if backend sync fails
    saveCart(updated);

    if (!firebaseUser) {
      setSyncError(null);
      return true;
    }

    try {
      await api.addToCart(product.id, quantity, mode, config, warranty, variantId, tenureMonths);
      if (pendingOpsRef.current.length > 0) {
        return await syncWithServer(updated);
      }
      const res: any = await api.getCart();
      const serverCart = res?.cart ?? res;
      const serverItems = Array.isArray(serverCart?.items) ? serverCart.items : [];
      saveCart(serverItems);
      setSyncError(null);
      setHasPendingSync(false);
      return true;
    } catch {
      const lineKey = buildLineKey(product.id, mode, config, variantId, tenureMonths);
      const existingOp = pendingOpsRef.current.find(
        (op): op is Extract<PendingCartOp, { type: 'add' }> => op.type === 'add' && op.lineKey === lineKey,
      );
      if (existingOp) {
        existingOp.quantity += quantity;
        existingOp.hasWarranty = existingOp.hasWarranty || warranty;
      } else {
        enqueuePendingOp({
          type: 'add',
          lineKey,
          productId: product.id,
          quantity,
          purchaseMode: mode,
          configuration: config,
          hasWarranty: warranty,
          variantId,
          tenureMonths,
        });
      }
      return false;
    }
  };

  const updateQuantity = async (itemIdOrProductId: string, quantity: number): Promise<boolean> => {
    if (quantity <= 0) {
      return await removeItem(itemIdOrProductId);
    }
    const item = items.find((i) => i.id === itemIdOrProductId || i.productId === itemIdOrProductId);
    const updated = items.map((i) =>
      i.id === itemIdOrProductId || i.productId === itemIdOrProductId ? { ...i, quantity } : i,
    );
    saveCart(updated);
    if (!firebaseUser || !item) return true;

    if (item.id.startsWith('ci-')) {
      const lineKey = buildLineKey(
        item.productId,
        item.purchaseMode === 'lease' ? 'lease' : 'sell',
        item.configuration || 'default',
        item.variantId,
        item.tenureMonths,
      );
      const pendingAdd = pendingOpsRef.current.find(
        (op): op is Extract<PendingCartOp, { type: 'add' }> => op.type === 'add' && op.lineKey === lineKey,
      );
      if (pendingAdd) {
        pendingAdd.quantity = quantity;
        setSyncError(CART_UPDATE_ERROR_MESSAGE);
        return false;
      }
      return await syncWithServer(updated);
    }

    try {
      await api.updateCartQuantity(item.id, quantity);
      const res: any = await api.getCart();
      const serverCart = res?.cart ?? res;
      const serverItems = Array.isArray(serverCart?.items) ? serverCart.items : [];
      saveCart(serverItems);
      if (pendingOpsRef.current.length === 0) {
        setSyncError(null);
      }
      return true;
    } catch {
      enqueuePendingOp({ type: 'update', itemId: item.id, data: { quantity } });
      return false;
    }
  };

  const updateWarranty = async (itemIdOrProductId: string, hasWarranty: boolean): Promise<boolean> => {
    const item = items.find((i) => i.id === itemIdOrProductId || i.productId === itemIdOrProductId);
    if (!item || item.purchaseMode === 'lease') return true;

    const updated = items.map((i) => {
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
    if (!firebaseUser) return true;

    if (item.id.startsWith('ci-')) {
      const lineKey = buildLineKey(
        item.productId,
        'sell',
        item.configuration || 'default',
        item.variantId,
        item.tenureMonths,
      );
      const pendingAdd = pendingOpsRef.current.find(
        (op): op is Extract<PendingCartOp, { type: 'add' }> => op.type === 'add' && op.lineKey === lineKey,
      );
      if (pendingAdd) {
        pendingAdd.hasWarranty = hasWarranty;
        setSyncError(CART_UPDATE_ERROR_MESSAGE);
        return false;
      }
      return await syncWithServer(updated);
    }

    try {
      await api.updateCartItem(item.id, { hasWarranty });
      const res: any = await api.getCart();
      const serverCart = res?.cart ?? res;
      const serverItems = Array.isArray(serverCart?.items) ? serverCart.items : [];
      saveCart(serverItems);
      if (pendingOpsRef.current.length === 0) {
        setSyncError(null);
      }
      return true;
    } catch {
      enqueuePendingOp({ type: 'update', itemId: item.id, data: { hasWarranty } });
      return false;
    }
  };

  const removeItem = async (itemIdOrProductId: string): Promise<boolean> => {
    const item = items.find((i) => i.id === itemIdOrProductId || i.productId === itemIdOrProductId);
    const updated = items.filter((i) => !(i.id === itemIdOrProductId || i.productId === itemIdOrProductId));
    saveCart(updated);
    if (!firebaseUser || !item) return true;

    if (item.id.startsWith('ci-')) {
      const lineKey = buildLineKey(
        item.productId,
        item.purchaseMode === 'lease' ? 'lease' : 'sell',
        item.configuration || 'default',
        item.variantId,
        item.tenureMonths,
      );
      pendingOpsRef.current = pendingOpsRef.current.filter(
        (op) => !(op.type === 'add' && op.lineKey === lineKey),
      );
      if (pendingOpsRef.current.length === 0) {
        setHasPendingSync(false);
        setSyncError(null);
      }
      return true;
    }

    try {
      await api.removeCartItem(item.id);
      const res: any = await api.getCart();
      const serverCart = res?.cart ?? res;
      const serverItems = Array.isArray(serverCart?.items) ? serverCart.items : [];
      saveCart(serverItems);
      if (pendingOpsRef.current.length === 0) {
        setSyncError(null);
      }
      return true;
    } catch {
      enqueuePendingOp({ type: 'remove', itemId: item.id });
      return false;
    }
  };

  const clearCart = async (): Promise<boolean> => {
    saveCart([]);
    if (!firebaseUser) {
      pendingOpsRef.current = [];
      setHasPendingSync(false);
      setSyncError(null);
      return true;
    }

    try {
      await api.clearCart();
      pendingOpsRef.current = [];
      setHasPendingSync(false);
      setSyncError(null);
      return true;
    } catch {
      enqueuePendingOp({ type: 'clear' });
      return false;
    }
  };

  const retrySync = async (): Promise<boolean> => {
    return await syncWithServer(itemsRef.current);
  };

  const oneTimeTotal = items
    .filter((i) => (i.purchaseMode || 'sell') === 'sell')
    .reduce(
      (acc, item) =>
        acc + (Number(item.priceAtAdd) + (item.hasWarranty ? item.warrantyPrice || 1999 : 0)) * item.quantity,
      0,
    );

  const monthlyTotal = items
    .filter((i) => i.purchaseMode === 'lease')
    .reduce((acc, item) => acc + Number(item.priceAtAdd) * item.quantity, 0);

  const subtotal = oneTimeTotal + monthlyTotal;
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        itemCount,
        subtotal,
        oneTimeTotal,
        monthlyTotal,
        isSyncing,
        syncError,
        hasPendingSync,
        addItem,
        updateQuantity,
        updateWarranty,
        removeItem,
        clearCart,
        retrySync,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
