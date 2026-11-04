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
import type { SaveRentalPriceDraft, UpdateRentalPriceDraft } from './admin-api';

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
  rentalPrices: () => [...adminQueryKeys.all, 'rental-prices'] as const,
  rentalPricingCatalog: () => [...adminQueryKeys.all, 'rental-pricing-catalog'] as const,
  rentalPriceHistory: (id: string) => [...adminQueryKeys.all, 'rental-price-history', id] as const,
  rentalTerminationRequests: () => [...adminQueryKeys.all, 'rental-termination-requests'] as const,
  warrantyRegister: () => [...adminQueryKeys.all, 'warranty-register'] as const,
  soldUnits: () => [...adminQueryKeys.all, 'sold-units'] as const,
  soldUnit: (serial: string) => [...adminQueryKeys.soldUnits(), serial] as const,
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
  return useQuery<
    { items: AdminOrder[]; total: number; page: number; pageSize: number } | AdminOrder[],
    Error
  >({
    queryKey: [...adminQueryKeys.orders(), params],
    queryFn: () => adminApi.getOrders(params),
    placeholderData: keepPreviousData,
  });
}

export function useAdminRecentOrders(pageSize: number = 5) {
  return useQuery<
    { items: AdminOrder[]; total: number; page: number; pageSize: number } | AdminOrder[],
    Error
  >({
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
      serialAssignments,
      overrideReason,
    }: {
      id: string;
      status: OrderStatus | string;
      courierName?: string;
      trackingNumber?: string;
      serialAssignments?: Array<{ orderItemId: string; unitIndex: number; serialNumber: string }>;
      overrideReason?: string;
    }) =>
      adminApi.updateOrderStatus(id, status, {
        courierName,
        trackingNumber,
        serialAssignments,
        overrideReason,
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.orders() });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.order(variables.id) });
      }
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.stats() });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.products() });
      queryClient.invalidateQueries({ queryKey: ['admin', 'service'] });
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

export function useAdminRentalPrices() {
  return useQuery({
    queryKey: adminQueryKeys.rentalPrices(),
    queryFn: () => adminApi.getRentalPrices(),
  });
}

export function useAdminRentalPricingCatalog() {
  return useQuery({
    queryKey: adminQueryKeys.rentalPricingCatalog(),
    queryFn: () => adminApi.getRentalPricingCatalog(),
  });
}

export function useAdminRentalPriceHistory(id: string | null) {
  return useQuery({
    queryKey: adminQueryKeys.rentalPriceHistory(id ?? ''),
    queryFn: () => adminApi.getRentalPriceHistory(id!),
    enabled: Boolean(id),
  });
}

export function useCreateRentalPriceDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: SaveRentalPriceDraft) => adminApi.createRentalPriceDraft(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.rentalPrices() });
    },
  });
}

export function useUpdateRentalPriceDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRentalPriceDraft }) =>
      adminApi.updateRentalPriceDraft(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.rentalPrices() });
    },
  });
}

export function useApproveRentalPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminApi.approveRentalPrice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.rentalPrices() });
    },
  });
}

export function useAdminRentalTerminationRequests() {
  return useQuery({
    queryKey: adminQueryKeys.rentalTerminationRequests(),
    queryFn: () => adminApi.getRentalTerminationRequests(),
  });
}

export function useApproveRentalTermination() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (subscriptionId: string) => adminApi.approveRentalTermination(subscriptionId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.rentalTerminationRequests() }),
  });
}

export function useAdminInquiries(params?: { status?: string; page?: number; pageSize?: number }) {
  return useQuery<
    { items: CorporateInquiry[]; total: number; page: number; pageSize: number },
    Error
  >({
    queryKey: [...adminQueryKeys.inquiries(), params],
    queryFn: () => adminApi.getCorporateInquiries(params),
    placeholderData: keepPreviousData,
  });
}

export function useUpdateInquiryStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status, adminNotes }: { id: string; status: string; adminNotes?: string }) =>
      adminApi.updateCorporateInquiryStatus(id, status, adminNotes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.inquiries() });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.stats() });
    },
  });
}

export function useWarrantyRegister(params?: {
  page?: number;
  pageSize?: number;
  status?: string;
  source?: string;
  brand?: string;
  search?: string;
}) {
  return useQuery<{ items: any[]; total: number; page: number; pageSize: number }, Error>({
    queryKey: [...adminQueryKeys.warrantyRegister(), params],
    queryFn: () => adminApi.getWarrantyRegister(params),
    placeholderData: keepPreviousData,
  });
}

export function useSoldUnits(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: string;
}) {
  return useQuery<{ items: any[]; total: number; page: number; pageSize: number }, Error>({
    queryKey: [...adminQueryKeys.soldUnits(), params],
    queryFn: () => adminApi.getSoldUnits(params),
    placeholderData: keepPreviousData,
  });
}

export function useSoldUnitBySerial(serial: string) {
  return useQuery<{ unit: any; serialHistory: any[] }, Error>({
    queryKey: adminQueryKeys.soldUnit(serial),
    queryFn: () => adminApi.getUnitBySerial(serial),
    enabled: !!serial,
  });
}

export function useUpdateUnitSerial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, serialNumber, reason }: { id: string; serialNumber: string; reason: string }) =>
      adminApi.updateUnitSerial(id, { serialNumber, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.soldUnits() });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.warrantyRegister() });
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.orders() });
    },
  });
}

