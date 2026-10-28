import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Cart, CartItem } from '@laptopmitra/types';
import { useAuth } from '../providers/AuthProvider';

// Products hooks
export function useProducts(params?: Record<string, any>) {
  const { getClient } = useAuth();
  return useQuery({
    queryKey: ['products', params],
    queryFn: () => getClient().getProducts(params),
  });
}

export function useProduct(id: string) {
  const { getClient } = useAuth();
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => getClient().getProduct(id),
    enabled: !!id,
  });
}

export function useProductFilters() {
  const { getClient } = useAuth();
  return useQuery({
    queryKey: ['productFilters'],
    queryFn: () => getClient().getProductFilters(),
  });
}

// Cart hooks

export function useCart() {
  const { getClient, isAuthenticated } = useAuth();
  return useQuery<Cart & { total: number; itemCount: number }>({
    queryKey: ['cart'],
    queryFn: async () => {
      const res = await getClient().getCart();
      const cartObj = (res as any)?.cart ?? res;
      const items: CartItem[] = cartObj?.items ?? [];
      const total =
        (res as any)?.total ??
        items.reduce((sum: number, item: CartItem) => {
          const price = typeof item.priceAtAdd === 'string' ? parseFloat(item.priceAtAdd) : item.priceAtAdd;
          return sum + (price || 0) * (item.quantity || 1);
        }, 0);
      const itemCount =
        (res as any)?.itemCount ?? items.reduce((sum: number, item: CartItem) => sum + (item.quantity || 1), 0);

      return {
        ...cartObj,
        items,
        total,
        itemCount,
      };
    },
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  const { getClient } = useAuth();
  return useMutation({
    mutationFn: ({
      productId,
      quantity,
      purchaseMode,
      configuration,
      hasWarranty,
    }: {
      productId: string;
      quantity?: number;
      purchaseMode?: 'sell' | 'lease';
      configuration?: string;
      hasWarranty?: boolean;
    }) => getClient().addToCart(productId, quantity, purchaseMode, configuration, hasWarranty),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

export function useUpdateCartItem() {
  const queryClient = useQueryClient();
  const { getClient } = useAuth();
  return useMutation({
    mutationFn: ({
      itemId,
      quantity,
      hasWarranty,
    }: {
      itemId: string;
      quantity?: number;
      hasWarranty?: boolean;
    }) => {
      const payload: { quantity?: number; hasWarranty?: boolean } = {};
      if (quantity !== undefined) payload.quantity = quantity;
      if (hasWarranty !== undefined) payload.hasWarranty = hasWarranty;
      return getClient().updateCartItem(itemId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

export function useRemoveCartItem() {
  const queryClient = useQueryClient();
  const { getClient } = useAuth();
  return useMutation({
    mutationFn: (itemId: string) => getClient().removeCartItem(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

export function useUpdateCartItemQuantity() {
  const queryClient = useQueryClient();
  const { getClient } = useAuth();
  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) =>
      getClient().updateCartItemQuantity(itemId, quantity),
    onMutate: async ({ itemId, quantity }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ['cart'] });
      const previous = queryClient.getQueryData(['cart']);
      queryClient.setQueryData(['cart'], (old: any) => {
        if (!old) return old;
        const currentItems = old.items ?? old.cart?.items ?? [];
        const updatedItems = currentItems.map((item: any) =>
          item.id === itemId ? { ...item, quantity } : item,
        );
        const newTotal = updatedItems.reduce((sum: number, item: any) => {
          const price = typeof item.priceAtAdd === 'string' ? parseFloat(item.priceAtAdd) : item.priceAtAdd;
          return sum + (price || 0) * (item.quantity || 1);
        }, 0);
        const newItemCount = updatedItems.reduce((sum: number, item: any) => sum + (item.quantity || 1), 0);

        return {
          ...old,
          items: updatedItems,
          total: newTotal,
          itemCount: newItemCount,
          ...(old.cart ? { cart: { ...old.cart, items: updatedItems } } : {}),
        };
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(['cart'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

export function useClearCart() {
  const queryClient = useQueryClient();
  const { getClient } = useAuth();
  return useMutation({
    mutationFn: () => getClient().clearCart(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

// Wishlist hooks
export function useWishlist() {
  const { getClient, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['wishlist'],
    queryFn: async () => {
      const res = await getClient().getWishlist();
      return Array.isArray(res) ? res : ((res as any)?.items ?? (res as any)?.wishlist?.items ?? []);
    },
    enabled: isAuthenticated,
  });
}

export function useAddToWishlist() {
  const queryClient = useQueryClient();
  const { getClient } = useAuth();
  return useMutation({
    mutationFn: (productId: string) => getClient().addToWishlist(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });
}

export function useRemoveWishlistItem() {
  const queryClient = useQueryClient();
  const { getClient } = useAuth();
  return useMutation({
    mutationFn: (itemId: string) => getClient().removeWishlistItem(itemId),
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: ['wishlist'] });
      const previous = queryClient.getQueryData(['wishlist']);
      queryClient.setQueryData(['wishlist'], (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.filter((item: any) => item.id !== itemId);
      });
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['wishlist'], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });
}

export function useClearWishlist() {
  const queryClient = useQueryClient();
  const { getClient } = useAuth();
  return useMutation({
    mutationFn: () => getClient().clearWishlist(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });
}

// Orders hooks
export function useOrders() {
  const { getClient, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['orders'],
    queryFn: () => getClient().getOrders(),
    enabled: isAuthenticated,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useOrder(id: string) {
  const { getClient, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => getClient().getOrder(id),
    enabled: isAuthenticated && !!id,
    staleTime: 5_000,
    refetchOnMount: 'always',
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  const { getClient } = useAuth();
  return useMutation({
    mutationFn: (payload: {
      referralCode?: string;
      discountCode?: string;
      shippingAddress?: any;
      phone?: string;
      notes?: string;
      paymentMethod?: 'razorpay' | 'cod';
      idempotencyKey?: string;
    }) => getClient().createOrder(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  const { getClient } = useAuth();
  return useMutation({
    mutationFn: (orderId: string) => getClient().cancelOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

// Profile hooks
export function useProfile() {
  const { getClient, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => getClient().getProfile(),
    enabled: isAuthenticated,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { getClient } = useAuth();

  return useMutation({
    mutationFn: (data: Record<string, any>) => getClient().updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useAddresses() {
  const { getClient, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['addresses'],
    queryFn: () => getClient().getAddresses(),
    enabled: isAuthenticated,
  });
}

export function useCreateAddress() {
  const queryClient = useQueryClient();
  const { getClient } = useAuth();

  return useMutation({
    mutationFn: (data: Record<string, any>) => getClient().createAddress(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
  });
}

export function useUpdateAddress() {
  const queryClient = useQueryClient();
  const { getClient } = useAuth();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, any> }) =>
      getClient().updateAddress(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
  });
}

export function useDeleteAddress() {
  const queryClient = useQueryClient();
  const { getClient } = useAuth();

  return useMutation({
    mutationFn: (id: string) => getClient().deleteAddress(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
  });
}

export function useValidateDiscount() {
  const { getClient } = useAuth();

  return useMutation({
    mutationFn: ({ code, cartTotal }: { code: string; cartTotal: number }) =>
      getClient().validateDiscount(code, cartTotal),
  });
}

// Categories hooks
export function useCategories(params?: { parentId?: string }) {
  const { getClient } = useAuth();
  return useQuery({
    queryKey: ['categories', params],
    queryFn: () => getClient().getCategories(params),
  });
}

export function useCategory(id: string) {
  const { getClient } = useAuth();
  return useQuery({
    queryKey: ['category', id],
    queryFn: () => getClient().getCategory(id),
    enabled: !!id,
  });
}

export function useCategoryBySlug(slug: string) {
  const { getClient } = useAuth();
  return useQuery({
    queryKey: ['category', 'slug', slug],
    queryFn: () => getClient().getCategoryBySlug(slug),
    enabled: !!slug,
  });
}

// Order return and reorder hooks
export function useReturnOrder() {
  const queryClient = useQueryClient();
  const { getClient } = useAuth();
  return useMutation({
    mutationFn: ({ orderId, reason }: { orderId: string; reason: string }) =>
      getClient().requestOrderReturn(orderId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useReorder() {
  const queryClient = useQueryClient();
  const { getClient } = useAuth();
  return useMutation({
    mutationFn: (orderId: string) => getClient().reorder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}

export function useOrderInvoice(orderId: string) {
  const { getClient, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['order-invoice', orderId],
    queryFn: () => getClient().getOrderInvoice(orderId),
    enabled: isAuthenticated && !!orderId,
  });
}

export function useOrderTracking(orderId: string) {
  const { getClient, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['order-tracking', orderId],
    queryFn: () => getClient().trackOrder(orderId),
    enabled: isAuthenticated && !!orderId,
  });
}

// Payments hook
export function usePaymentHistory() {
  const { getClient, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['payment-history'],
    queryFn: () => getClient().getPaymentHistory(),
    enabled: isAuthenticated,
  });
}



// Referral / Affiliate hook
export function useReferralStats() {
  const { getClient, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['referral-stats'],
    queryFn: () => getClient().getReferralStats(),
    enabled: isAuthenticated,
  });
}

// Notifications hooks
export function useNotificationPreferences() {
  const { getClient, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => getClient().getNotificationPreferences(),
    enabled: isAuthenticated,
  });
}

export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  const { getClient } = useAuth();
  return useMutation({
    mutationFn: (prefs: Record<string, any>) => getClient().updateNotificationPreferences(prefs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });
}

// Security & Account actions
export function useSignoutEverywhere() {
  const { getClient } = useAuth();
  return useMutation({
    mutationFn: () => getClient().signoutEverywhere(),
  });
}

export function useDeleteAccount() {
  const { getClient } = useAuth();
  return useMutation({
    mutationFn: () => getClient().deleteAccount(),
  });
}

// Support & Help Center hooks
export function useSupportConfig() {
  const { getClient } = useAuth();
  return useQuery({
    queryKey: ['support-config'],
    queryFn: () => getClient().getSupportConfig(),
    staleTime: 1000 * 60 * 30, // 30 minutes
  });
}

export function useHelpCategories() {
  const { getClient } = useAuth();
  return useQuery({
    queryKey: ['help-categories'],
    queryFn: () => getClient().getHelpCategories(),
    staleTime: 1000 * 60 * 10,
  });
}

export function useHelpArticles(params?: { category?: string; search?: string; q?: string }) {
  const { getClient } = useAuth();
  return useQuery({
    queryKey: ['help-articles', params],
    queryFn: () => getClient().getHelpArticles(params),
  });
}

export function useHelpArticle(slug: string) {
  const { getClient } = useAuth();
  return useQuery({
    queryKey: ['help-article', slug],
    queryFn: () => getClient().getHelpArticle(slug),
    enabled: !!slug,
  });
}

export function useVoteHelpArticle() {
  const queryClient = useQueryClient();
  const { getClient } = useAuth();
  return useMutation({
    mutationFn: ({ id, helpful }: { id: string; helpful: boolean }) =>
      getClient().voteHelpArticle(id, helpful),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['help-article'] });
    },
  });
}

export function useTickets(params?: { status?: string }) {
  const { getClient, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['tickets', params],
    queryFn: () => getClient().getTickets(params),
    enabled: isAuthenticated,
    refetchInterval: 15000, // poll every 15s for live updates
  });
}

export function useTicket(id: string) {
  const { getClient, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['ticket', id],
    queryFn: () => getClient().getTicket(id),
    enabled: isAuthenticated && !!id,
    refetchInterval: 10000,
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  const { getClient } = useAuth();
  return useMutation({
    mutationFn: (data: any) => getClient().createTicket(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

export function useAddTicketMessage() {
  const queryClient = useQueryClient();
  const { getClient } = useAuth();
  return useMutation({
    mutationFn: ({
      ticketId,
      content,
      message,
      attachmentIds,
    }: {
      ticketId: string;
      content?: string;
      message?: string;
      attachmentIds?: string[];
    }) => {
      const payload: any = { body: content || message || '' };
      if (attachmentIds && attachmentIds.length > 0) {
        payload.attachmentIds = attachmentIds;
      }
      return getClient().addTicketMessage(ticketId, payload);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

export function useReopenTicket() {
  const queryClient = useQueryClient();
  const { getClient } = useAuth();
  return useMutation({
    mutationFn: (ticketId: string) => getClient().reopenTicket(ticketId),
    onSuccess: (_data, ticketId) => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

export function useRateTicket() {
  const queryClient = useQueryClient();
  const { getClient } = useAuth();
  return useMutation({
    mutationFn: ({ ticketId, score, comment }: { ticketId: string; score: number; comment?: string }) =>
      getClient().rateTicket(ticketId, score, comment),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket', variables.ticketId] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });
}

export function useReturnRequest(id: string) {
  const { getClient, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['return-request', id],
    queryFn: () => getClient().getReturnRequest(id),
    enabled: isAuthenticated && !!id,
    refetchInterval: 15000,
  });
}

export function useCreateReturnRequest() {
  const queryClient = useQueryClient();
  const { getClient } = useAuth();
  return useMutation({
    mutationFn: (data: any) => getClient().createReturnRequest(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['return-request'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useUpdateRefundDetails() {
  const queryClient = useQueryClient();
  const { getClient } = useAuth();
  return useMutation({
    mutationFn: ({ returnId, data }: { returnId: string; data: any }) =>
      getClient().updateRefundDetails(returnId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['return-request', variables.returnId] });
    },
  });
}

export function useWarrantyStatus(orderItemId: string) {
  const { getClient, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['warranty-status', orderItemId],
    queryFn: () => getClient().getWarrantyStatus(orderItemId),
    enabled: isAuthenticated && !!orderItemId,
  });
}



