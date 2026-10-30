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
  CorporateInquiry,
} from './types';

async function downloadCsv(endpoint: string, filename: string) {
  const csv = await request<string>(endpoint);
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

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
  async updateOrderStatus(
    id: string,
    status: OrderStatus | string,
    trackingInfo?: { courierName?: string; trackingNumber?: string },
  ): Promise<AdminOrder> {
    return await request<AdminOrder>(`/admin/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({
        status,
        ...(trackingInfo?.courierName ? { courierName: trackingInfo.courierName } : {}),
        ...(trackingInfo?.trackingNumber ? { trackingNumber: trackingInfo.trackingNumber } : {}),
      }),
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

  /**
   * GET /admin/inquiries
   * Retrieves corporate procurement inquiries with status filtering and pagination.
   */
  async getCorporateInquiries(params?: {
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: CorporateInquiry[]; total: number; page: number; pageSize: number }> {
    const searchParams = new URLSearchParams();
    if (params?.status && params.status !== 'all') searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
    const qs = searchParams.toString();
    return await request<{ items: CorporateInquiry[]; total: number; page: number; pageSize: number }>(
      `/admin/inquiries${qs ? `?${qs}` : ''}`,
    );
  },

  /**
   * PUT /admin/inquiries/:id/status
   * Updates the workflow status of a corporate procurement inquiry.
   */
  async updateCorporateInquiryStatus(
    id: string,
    status: 'PENDING' | 'CONTACTED' | 'QUOTED' | 'CLOSED' | string,
    adminNotes?: string,
  ): Promise<CorporateInquiry> {
    return await request<CorporateInquiry>(`/admin/inquiries/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, adminNotes }),
    });
  },

  // ---------------------------------------------------------------------------
  // Support & Ticketing Workspace (Phase S5)
  // ---------------------------------------------------------------------------

  async getAdminTickets(params?: {
    status?: string;
    category?: string;
    priority?: string;
    assigneeId?: string;
    slaBreached?: boolean;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: any[]; total: number; page: number; pageSize: number; openCount: number; breachedCount: number }> {
    const searchParams = new URLSearchParams();
    if (params?.status && params.status !== 'all') searchParams.set('status', params.status);
    if (params?.category && params.category !== 'all') searchParams.set('category', params.category);
    if (params?.priority && params.priority !== 'all') searchParams.set('priority', params.priority);
    if (params?.assigneeId && params.assigneeId !== 'all') searchParams.set('assigneeId', params.assigneeId);
    if (params?.slaBreached) searchParams.set('slaBreached', 'true');
    if (params?.search && params.search.trim()) searchParams.set('search', params.search.trim());
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
    const qs = searchParams.toString();
    return await request<any>(`/support/admin/tickets${qs ? `?${qs}` : ''}`);
  },

  async getAdminTicket(id: string): Promise<any> {
    return await request<any>(`/support/admin/tickets/${id}`);
  },

  async updateAdminTicket(id: string, data: {
    status?: string;
    priority?: string;
    assigneeId?: string | null;
    category?: string;
    adminNotes?: string;
  }): Promise<any> {
    return await request<any>(`/support/admin/tickets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async addTicketInternalNote(ticketId: string, note: string): Promise<any> {
    return await request<any>(`/support/admin/tickets/${ticketId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  },

  async mergeTickets(sourceTicketId: string, targetTicketId: string): Promise<any> {
    return await request<any>(`/support/admin/tickets/${sourceTicketId}/merge`, {
      method: 'POST',
      body: JSON.stringify({ targetTicketId }),
    });
  },

  async getStaffUsers(): Promise<Array<{ id: string; name: string; email: string; role: string }>> {
    return await request<any[]>('/support/admin/staff');
  },

  async getUserSupportHistory(userId: string): Promise<{
    user: { id: string; name: string | null; email: string | null };
    ticketCount: number;
    returnCount: number;
    categoryCounts: Record<string, number>;
    tickets: Array<{
      id: string;
      ticketNumber: string;
      subject: string;
      category: string;
      status: string;
      createdAt: string;
      resolvedAt: string | null;
      csatScore: number | null;
      csatComment: string | null;
    }>;
    returns: Array<{
      id: string;
      returnNumber: string;
      type: string;
      status: string;
      reason: string;
      createdAt: string;
      order: { orderNumber: string };
      ticket: { ticketNumber: string } | null;
    }>;
  }> {
    return await request(`/admin/users/${encodeURIComponent(userId)}/support-history`);
  },

  async downloadSupportTicketsCsv() {
    return downloadCsv('/support/admin/exports/tickets.csv', 'support-tickets.csv');
  },

  async downloadSupportReturnsCsv() {
    return downloadCsv('/support/admin/exports/returns.csv', 'support-returns.csv');
  },

  // ---------------------------------------------------------------------------
  // Returns & Refunds Workspace (Phase S5)
  // ---------------------------------------------------------------------------

  async getAdminReturns(params?: {
    status?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: any[]; total: number; page: number; pageSize: number; requestedCount: number }> {
    const searchParams = new URLSearchParams();
    if (params?.status && params.status !== 'all') searchParams.set('status', params.status);
    if (params?.search && params.search.trim()) searchParams.set('search', params.search.trim());
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
    const qs = searchParams.toString();
    return await request<any>(`/support/admin/returns${qs ? `?${qs}` : ''}`);
  },

  async getAdminReturn(id: string): Promise<any> {
    return await request<any>(`/support/admin/returns/${id}`);
  },

  async processAdminReturn(id: string, data: {
    status: string;
    adminNotes?: string;
    rejectionReason?: string;
    pickupCourier?: string;
    pickupTrackingNumber?: string;
    inspectionNotes?: string;
    inspectionPassed?: boolean;
  }): Promise<any> {
    return await request<any>(`/support/admin/returns/${id}/process`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async processAdminRefund(id: string, data: {
    refundAmount?: number;
    manualRefundReference?: string;
  }): Promise<any> {
    return await request<any>(`/support/admin/returns/${id}/refund`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async decryptRefundDetails(id: string): Promise<{ success: boolean; details: any }> {
    return await request<{ success: boolean; details: any }>(`/support/admin/returns/${id}/refund-details/decrypt`);
  },

  // ---------------------------------------------------------------------------
  // Saved Replies CRUD
  // ---------------------------------------------------------------------------

  async getSavedReplies(category?: string): Promise<any[]> {
    const qs = category && category !== 'all' ? `?category=${encodeURIComponent(category)}` : '';
    return await request<any[]>(`/support/admin/saved-replies${qs}`);
  },

  async createSavedReply(data: { shortcut: string; title: string; content: string; category?: string }): Promise<any> {
    return await request<any>('/support/admin/saved-replies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateSavedReply(id: string, data: Partial<{ shortcut: string; title: string; content: string; category?: string }>): Promise<any> {
    return await request<any>(`/support/admin/saved-replies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteSavedReply(id: string): Promise<{ success: boolean }> {
    return await request<any>(`/support/admin/saved-replies/${id}`, {
      method: 'DELETE',
    });
  },

  // ---------------------------------------------------------------------------
  // Help Center Categories & Articles
  // ---------------------------------------------------------------------------

  async getAdminHelpCategories(): Promise<any[]> {
    return await request<any[]>('/support/admin/help/categories');
  },

  async createAdminHelpCategory(data: { title: string; slug: string; icon?: string; order?: number }): Promise<any> {
    return await request<any>('/support/admin/help/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateAdminHelpCategory(id: string, data: any): Promise<any> {
    return await request<any>(`/support/admin/help/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async archiveAdminHelpCategory(id: string): Promise<{ success: boolean }> {
    return await request<any>(`/support/admin/help/categories/${id}/archive`, {
      method: 'PUT',
    });
  },

  async getAdminHelpArticles(): Promise<any[]> {
    return await request<any[]>('/support/admin/help/articles');
  },

  async createAdminHelpArticle(data: { categoryId: string; title: string; slug: string; content: string; summary?: string; isPublished?: boolean; order?: number }): Promise<any> {
    return await request<any>('/support/admin/help/articles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateAdminHelpArticle(id: string, data: any): Promise<any> {
    return await request<any>(`/support/admin/help/articles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async archiveAdminHelpArticle(id: string): Promise<{ success: boolean }> {
    return await request<any>(`/support/admin/help/articles/${id}/archive`, {
      method: 'PUT',
    });
  },

  // ---------------------------------------------------------------------------
  // Support Settings & Reports
  // ---------------------------------------------------------------------------

  async getSupportSettings(): Promise<any> {
    return await request<any>('/support/admin/settings');
  },

  async updateSupportSettings(data: any): Promise<any> {
    return await request<any>('/support/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async getSupportReports(): Promise<any> {
    return await request<any>('/support/admin/reports');
  },
};
