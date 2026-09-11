import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../providers/AuthProvider';

// Auth hooks
export function useLogin() {
  return useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const { LaptopMitraApiClient } = await import('@laptopmitra/api-client');
      const { API_BASE_URL } = await import('../config');
      const client = new LaptopMitraApiClient({ baseUrl: API_BASE_URL });
      return client.login(data.email, data.password);
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: async (data: { name: string; email: string; password: string; phone?: string }) => {
      const { LaptopMitraApiClient } = await import('@laptopmitra/api-client');
      const { API_BASE_URL } = await import('../config');
      const client = new LaptopMitraApiClient({ baseUrl: API_BASE_URL });
      return client.register(data);
    },
  });
}

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

// Cart hooks
export function useCart() {
  const { getClient, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['cart'],
    queryFn: () => getClient().getCart(),
    enabled: isAuthenticated,
  });
}

export function useAddToCart() {
  const queryClient = useQueryClient();
  const { getClient } = useAuth();
  return useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity?: number }) =>
      getClient().addToCart(productId, quantity),
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
        if (!old?.items) return old;
        return {
          ...old,
          items: old.items.map((item: any) =>
            item.id === itemId ? { ...item, quantity } : item,
          ),
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
    queryFn: () => getClient().getWishlist(),
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
  });
}

export function useOrder(id: string) {
  const { getClient, isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['order', id],
    queryFn: () => getClient().getOrder(id),
    enabled: isAuthenticated && !!id,
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
    }) => getClient().createOrder(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
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

// Password reset hooks (stub — backend endpoints not yet implemented)
export function useForgotPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { LaptopMitraApiClient } = await import('@laptopmitra/api-client');
      const { API_BASE_URL } = await import('../config');
      const client = new LaptopMitraApiClient({ baseUrl: API_BASE_URL });
      return client.forgotPassword(email);
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async ({ token, newPassword }: { token: string; newPassword: string }) => {
      const { LaptopMitraApiClient } = await import('@laptopmitra/api-client');
      const { API_BASE_URL } = await import('../config');
      const client = new LaptopMitraApiClient({ baseUrl: API_BASE_URL });
      return client.resetPassword(token, newPassword);
    },
  });
}

export function useChangePassword() {
  const { getClient } = useAuth();
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      getClient().changePassword(data),
  });
}
