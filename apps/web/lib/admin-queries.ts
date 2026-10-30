import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from './admin-api';
import {
  AdminDashboardStats,
  AdminOrder,
  AdminUser,
  AdminProduct,
  CreateProductDto,
  OrderStatus,
  UserStatus,
  AdminAnalyticsResponse,
  AdminSettings,
  UpdateAdminSettingsDto,
  CorporateInquiry,
} from './types';

/**
 * Hierarchical query keys for admin data operations
 */
export const adminQueryKeys = {
  all: ['admin'] as const,
  stats: () => [...adminQueryKeys.all, 'stats'] as const,
  orders: () => [...adminQueryKeys.all, 'orders'] as const,
  order: (id: string) => [...adminQueryKeys.orders(), id] as const,
  users: () => [...adminQueryKeys.all, 'users'] as const,
  user: (id: string) => [...adminQueryKeys.users(), id] as const,
  userSupportHistory: (id: string) => [...adminQueryKeys.user(id), 'support-history'] as const,
  products: () => [...adminQueryKeys.all, 'products'] as const,
  product: (id: string) => [...adminQueryKeys.products(), id] as const,
  analytics: () => [...adminQueryKeys.all, 'analytics'] as const,
  settings: () => [...adminQueryKeys.all, 'settings'] as const,
  inquiries: () => [...adminQueryKeys.all, 'inquiries'] as const,
};

// ---------------------------------------------------------------------------
// Query Hooks
// ---------------------------------------------------------------------------

export function useAdminStats(options?: { refetchInterval?: number | false }) {
  return useQuery<AdminDashboardStats, Error>({
    queryKey: adminQueryKeys.stats(),
    queryFn: () => adminApi.getDashboardStats(),
    ...options,
  });
}

export function useAdminOrders(params?: {
  page?: number;
  pageSize?: number;
  status?: string;
  paymentStatus?: string;
  from?: string;
  to?: string;
  search?: string;
}) {
  return useQuery<{ items: AdminOrder[]; total: number; page: number; pageSize: number } | AdminOrder[], Error>({
    queryKey: [...adminQueryKeys.orders(), params],
    queryFn: () => adminApi.getOrders(params),
    placeholderData: keepPreviousData,
  });
}

export function useAdminRecentOrders(pageSize: number = 5) {
  return useQuery<{ items: AdminOrder[]; total: number; page: number; pageSize: number } | AdminOrder[], Error>({
    queryKey: [...adminQueryKeys.orders(), { pageSize }],
    queryFn: () => adminApi.getOrders({ pageSize }),
  });
}

export function useAdminOrder(id: string) {
  return useQuery<AdminOrder, Error>({
    queryKey: adminQueryKeys.order(id),
    queryFn: () => adminApi.getOrder(id),
    enabled: !!id,
  });
}

export function useAdminUsers(params?: {
  page?: number;
  pageSize?: number;
  status?: string;
  role?: string;
  search?: string;
}) {
  return useQuery<{ items: AdminUser[]; total: number; page: number; pageSize: number }, Error>({
    queryKey: [...adminQueryKeys.users(), params],
    queryFn: () => adminApi.getUsers(params),
    placeholderData: keepPreviousData,
  });
}

export function useAdminUserSupportHistory(userId: string | null) {
  return useQuery({
    queryKey: adminQueryKeys.userSupportHistory(userId || ''),
    queryFn: () => adminApi.getUserSupportHistory(userId!),
    enabled: !!userId,
  });
}

export function useAdminAnalytics(params?: { range?: '7d' | '30d' | '90d' | string }) {
  return useQuery<AdminAnalyticsResponse, Error>({
    queryKey: [...adminQueryKeys.analytics(), params],
    queryFn: () => adminApi.getAnalytics(params),
    placeholderData: keepPreviousData,
  });
}

export function useAdminProducts() {
  return useQuery<AdminProduct[], Error>({
    queryKey: adminQueryKeys.products(),
    queryFn: () => adminApi.getProducts(),
  });
}

export function useAdminSettings() {
  return useQuery<AdminSettings, Error>({
    queryKey: adminQueryKeys.settings(),
    queryFn: () => adminApi.getSettings(),
  });
}

// ---------------------------------------------------------------------------
// Mutation Hooks (with automatic cache invalidation)
// ---------------------------------------------------------------------------

export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
      courierName,
      trackingNumber,
    }: {
      id: string;
      status: OrderStatus | string;
      courierName?: string;
      trackingNumber?: string;
    }) =>
      adminApi.updateOrderStatus(id, status, { courierName, trackingNumber }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.orders() });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.order(variables.id) });
      }
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.stats() });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.products() });
    },
  });
}


export function useUpdateUserStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: UserStatus | string }) =>
      adminApi.updateUserStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.users() });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.stats() });
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProductDto) => adminApi.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.products() });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.stats() });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateProductDto> }) =>
      adminApi.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.products() });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.stats() });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => adminApi.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.products() });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.stats() });
    },
  });
}

export function useUpdateAdminSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateAdminSettingsDto) => adminApi.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.settings() });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.stats() });
    },
  });
}

export function useAdminInquiries(params?: {
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery<{ items: CorporateInquiry[]; total: number; page: number; pageSize: number }, Error>({
    queryKey: [...adminQueryKeys.inquiries(), params],
    queryFn: () => adminApi.getCorporateInquiries(params),
    placeholderData: keepPreviousData,
  });
}

export function useUpdateInquiryStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
      adminNotes,
    }: {
      id: string;
      status: string;
      adminNotes?: string;
    }) => adminApi.updateCorporateInquiryStatus(id, status, adminNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.inquiries() });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.stats() });
    },
  });
}
