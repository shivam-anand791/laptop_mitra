import { request } from './api';
import {
  AdminDashboardStats,
  AdminUser,
  AdminOrder,
  AdminProduct,
  CreateProductDto,
  UserStatus,
  OrderStatus,
  AdminAnalyticsResponse,
  AdminSettings,
  UpdateAdminSettingsDto,
} from './types';

/**
 * LaptopMitra Admin API Client
 * Maps 1:1 to real NestJS backend endpoints in AdminController and ProductController.
 */
export const adminApi = {
  /**
   * GET /admin/dashboard/stats
   * Aggregated dashboard counts and revenue totals.
   */
  async getDashboardStats(): Promise<AdminDashboardStats> {
    return await request<AdminDashboardStats>('/admin/dashboard/stats');
  },

  /**
   * GET /admin/users
   * Lists users with pagination, search, and filters.
   */
  async getUsers(params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    role?: string;
    search?: string;
  }): Promise<{ items: AdminUser[]; total: number; page: number; pageSize: number }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
    if (params?.status && params.status !== 'all') searchParams.set('status', params.status);
    if (params?.role && params.role !== 'all') searchParams.set('role', params.role);
    if (params?.search && params.search.trim()) searchParams.set('search', params.search.trim());
    const qs = searchParams.toString();
    return await request<{ items: AdminUser[]; total: number; page: number; pageSize: number }>(
      `/admin/users${qs ? `?${qs}` : ''}`,
    );
  },

  /**
   * PUT /admin/users/:id/status
   * Updates user account status (ACTIVE, SUSPENDED, DELETED).
   */
  async updateUserStatus(
    id: string,
    status: UserStatus | string,
  ): Promise<Pick<AdminUser, 'id' | 'name' | 'email' | 'role' | 'status' | 'updatedAt'>> {
    return await request(`/admin/users/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  /**
   * GET /admin/orders
   * Retrieves orders with pagination, search, and filters.
   */
  async getOrders(params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    paymentStatus?: string;
    from?: string;
    to?: string;
    search?: string;
  }): Promise<{ items: AdminOrder[]; total: number; page: number; pageSize: number } | AdminOrder[]> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
    if (params?.status && params.status !== 'all') searchParams.set('status', params.status);
    if (params?.paymentStatus && params.paymentStatus !== 'all') searchParams.set('paymentStatus', params.paymentStatus);
    if (params?.from) searchParams.set('from', params.from);
    if (params?.to) searchParams.set('to', params.to);
    if (params?.search && params.search.trim()) searchParams.set('search', params.search.trim());
    const qs = searchParams.toString();
    return await request<any>(`/admin/orders${qs ? `?${qs}` : ''}`);
  },

  /**
   * PUT /admin/orders/:id/status
   * Updates an order status (PENDING, CONFIRMED, SHIPPING, DELIVERED, CANCELLED, REFUNDED).
   */
  async updateOrderStatus(id: string, status: OrderStatus | string): Promise<AdminOrder> {
    return await request<AdminOrder>(`/admin/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  /**
   * GET /admin/products
   * Retrieves all catalog products with relations (category, images).
   */
  async getProducts(): Promise<AdminProduct[]> {
    return await request<AdminProduct[]>('/admin/products');
  },

  /**
   * POST /products
   * Authoritative admin route for creating products.
   */
  async createProduct(data: CreateProductDto): Promise<AdminProduct> {
    return await request<AdminProduct>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * PUT /products/:id
   * Authoritative admin route for updating products.
   */
  async updateProduct(id: string, data: Partial<CreateProductDto>): Promise<AdminProduct> {
    return await request<AdminProduct>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * DELETE /products/:id
   * Authoritative admin route for deleting or discontinuing products.
   */
  async deleteProduct(id: string): Promise<{ message: string }> {
    return await request<{ message: string }>(`/products/${id}`, {
      method: 'DELETE',
    });
  },

  // ---------------------------------------------------------------------------
  // Stubs for future phases (Not called by any page in Phase 1)
  // ---------------------------------------------------------------------------

  /**
   * GET /admin/orders/:id
   * Retrieves full order detail including items, products, deliveries, and payments.
   */
  async getOrder(id: string): Promise<AdminOrder> {
    return await request<AdminOrder>(`/admin/orders/${id}`);
  },

  /**
   * GET /admin/analytics?range=7d|30d|90d
   * Retrieves aggregated business analytics and sales metrics.
   */
  async getAnalytics(params?: {
    range?: '7d' | '30d' | '90d' | string;
  }): Promise<AdminAnalyticsResponse> {
    const searchParams = new URLSearchParams();
    if (params?.range && params.range !== '7d') {
      searchParams.set('range', params.range);
    }
    const qs = searchParams.toString();
    return await request<AdminAnalyticsResponse>(`/admin/analytics${qs ? `?${qs}` : ''}`);
  },

  /**
   * GET /admin/settings
   * Retrieves persisted platform and store settings.
   */
  async getSettings(): Promise<AdminSettings> {
    return await request<AdminSettings>('/admin/settings');
  },

  /**
   * PUT /admin/settings
   * Updates persisted platform and store settings.
   */
  async updateSettings(data: UpdateAdminSettingsDto): Promise<AdminSettings> {
    return await request<AdminSettings>('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};
