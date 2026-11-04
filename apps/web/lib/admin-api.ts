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

export interface AdminRentalPrice {
  id: string;
  productId: string;
  variantId: string | null;
  tenureMonths: number;
  monthlyPrice: number | string;
  securityDeposit: number | string;
  deliveryCharge: number | string;
  status: string;
  sourceType: 'MANUAL' | 'ILLUSTRATIVE';
  estimateLabel: string | null;
  changeReason: string | null;
  createdAt: string;
  auditHistory?: Array<{ action: string }>;
  product: { id: string; name: string; sku: string };
  variant?: { id: string; name: string; sku: string } | null;
}

export interface AdminRentalPricingCatalogItem {
  id: string;
  name: string;
  sku: string;
  price: number | string;
  variants: Array<{
    id: string;
    name: string;
    sku: string;
    price: number | string;
    attributes: unknown;
  }>;
}

export interface AdminRentalPriceAudit {
  id: string;
  action: string;
  previousMonthlyPrice: number | string | null;
  newMonthlyPrice: number | string | null;
  previousDeposit: number | string | null;
  newDeposit: number | string | null;
  previousDeliveryCharge: number | string | null;
  newDeliveryCharge: number | string | null;
  reason: string;
  createdAt: string;
  admin: { id: string; name: string | null; email: string };
}

export interface SaveRentalPriceDraft {
  productId: string;
  variantId?: string;
  tenureMonths: number;
  monthlyPrice: number;
  securityDeposit: number;
  deliveryCharge: number;
  reason: string;
}

export interface UpdateRentalPriceDraft {
  monthlyPrice: number;
  securityDeposit: number;
  deliveryCharge: number;
  reason: string;
}

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
  async getRentalPrices(): Promise<AdminRentalPrice[]> {
    return request('/admin/rental-prices');
  },

  async getRentalPricingCatalog(): Promise<AdminRentalPricingCatalogItem[]> {
    return request('/admin/rental-prices/catalog');
  },

  async getRentalPriceHistory(id: string): Promise<AdminRentalPriceAudit[]> {
    return request(`/admin/rental-prices/${id}/history`);
  },

  async createRentalPriceDraft(data: SaveRentalPriceDraft): Promise<AdminRentalPrice> {
    return request('/admin/rental-prices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateRentalPriceDraft(
    id: string,
    data: UpdateRentalPriceDraft,
  ): Promise<AdminRentalPrice> {
    return request(`/admin/rental-prices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async approveRentalPrice(id: string): Promise<{ id: string; status: string }> {
    return request(`/admin/rental-prices/${id}/approve`, { method: 'POST' });
  },

  async getRentalTerminationRequests(): Promise<
    Array<{
      id: string;
      orderId: string;
      tenureMonths: number;
      monthlyAmount: number | string;
      status: string;
      terminationRequestedAt: string | null;
      user: { id: string; name: string | null; email: string; phone: string | null };
      order: { id: string; orderNumber: string };
    }>
  > {
    return request('/payments/admin/rentals/termination-requests');
  },

  async approveRentalTermination(subscriptionId: string): Promise<{ status: string }> {
    return request(`/payments/admin/rentals/${subscriptionId}/approve-termination`, {
      method: 'POST',
    });
  },

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
  }): Promise<
    { items: AdminOrder[]; total: number; page: number; pageSize: number } | AdminOrder[]
  > {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
    if (params?.status && params.status !== 'all') searchParams.set('status', params.status);
    if (params?.paymentStatus && params.paymentStatus !== 'all')
      searchParams.set('paymentStatus', params.paymentStatus);
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
    trackingInfo?: {
      courierName?: string;
      trackingNumber?: string;
      serialAssignments?: Array<{ orderItemId: string; unitIndex: number; serialNumber: string }>;
      overrideReason?: string;
    },
  ): Promise<AdminOrder> {
    return await request<AdminOrder>(`/admin/orders/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({
        status,
        ...(trackingInfo?.courierName ? { courierName: trackingInfo.courierName } : {}),
        ...(trackingInfo?.trackingNumber ? { trackingNumber: trackingInfo.trackingNumber } : {}),
        ...(trackingInfo?.serialAssignments ? { serialAssignments: trackingInfo.serialAssignments } : {}),
        ...(trackingInfo?.overrideReason ? { overrideReason: trackingInfo.overrideReason } : {}),
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
  async updateProduct(id: string, data: any): Promise<AdminProduct> {
    return await request<AdminProduct>(`/admin/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * DELETE /admin/products/:id
   * Authoritative admin route for deleting or soft-archiving products.
   */
  async deleteProduct(id: string): Promise<{ message: string; archived?: boolean }> {
    return await request<{ message: string; archived?: boolean }>(`/admin/products/${id}`, {
      method: 'DELETE',
    });
  },

  async getProductReferences(id: string): Promise<{
    product: { id: string; name: string; status: string };
    totalOrders: number;
    activeOrders: number;
    totalLeases: number;
    activeLeases: number;
    canHardDelete: boolean;
  }> {
    return await request(`/admin/products/${id}/references`);
  },

  async getProductPriceHistory(id: string): Promise<{
    product: { id: string; name: string; sku: string; price: any; compareAtPrice: any };
    priceAudits: any[];
    rentalPrices: any[];
  }> {
    return await request(`/admin/products/${id}/price-history`);
  },

  async saveProductRentalPricing(
    id: string,
    data: {
      enabled: boolean;
      publishImmediately?: boolean;
      prices?: { tenureMonths: number; monthlyPrice: number }[];
      reason?: string;
    },
  ): Promise<{ success: boolean; message: string; leasePriceMonthly?: number | null }> {
    return await request(`/admin/products/${id}/rental-pricing`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async previewBulkPricing(data: {
    productIds: string[];
    type: 'PERCENTAGE' | 'FIXED';
    value: number;
    applyToCompareAtPrice?: boolean;
  }): Promise<{ preview: boolean; count: number; items: any[] }> {
    return await request('/admin/products/bulk-pricing/preview', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async applyBulkPricing(data: {
    productIds: string[];
    type: 'PERCENTAGE' | 'FIXED';
    value: number;
    applyToCompareAtPrice?: boolean;
    reason?: string;
  }): Promise<{ success: boolean; count: number; items: any[] }> {
    return await request('/admin/products/bulk-pricing/apply', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async importProductsCsv(
    csvText: string,
    dryRun = true,
  ): Promise<{
    dryRun: boolean;
    totalRows: number;
    toCreate?: number;
    toUpdate?: number;
    createdCount?: number;
    updatedCount?: number;
    errors: { row: number; sku: string; error: string }[];
    previewRows?: any[];
  }> {
    return await request('/admin/products/import/csv', {
      method: 'POST',
      body: JSON.stringify({ csvText, dryRun }),
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
    return await request<{
      items: CorporateInquiry[];
      total: number;
      page: number;
      pageSize: number;
    }>(`/admin/inquiries${qs ? `?${qs}` : ''}`);
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
  }): Promise<{
    items: any[];
    total: number;
    page: number;
    pageSize: number;
    openCount: number;
    breachedCount: number;
  }> {
    const searchParams = new URLSearchParams();
    if (params?.status && params.status !== 'all') searchParams.set('status', params.status);
    if (params?.category && params.category !== 'all')
      searchParams.set('category', params.category);
    if (params?.priority && params.priority !== 'all')
      searchParams.set('priority', params.priority);
    if (params?.assigneeId && params.assigneeId !== 'all')
      searchParams.set('assigneeId', params.assigneeId);
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

  async updateAdminTicket(
    id: string,
    data: {
      status?: string;
      priority?: string;
      assigneeId?: string | null;
      category?: string;
      adminNotes?: string;
    },
  ): Promise<any> {
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
  }): Promise<{
    items: any[];
    total: number;
    page: number;
    pageSize: number;
    requestedCount: number;
  }> {
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

  async processAdminReturn(
    id: string,
    data: {
      status: string;
      adminNotes?: string;
      rejectionReason?: string;
      pickupCourier?: string;
      pickupTrackingNumber?: string;
      inspectionNotes?: string;
      inspectionPassed?: boolean;
    },
  ): Promise<any> {
    return await request<any>(`/support/admin/returns/${id}/process`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async processAdminRefund(
    id: string,
    data: {
      refundAmount?: number;
      manualRefundReference?: string;
    },
  ): Promise<any> {
    return await request<any>(`/support/admin/returns/${id}/refund`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async decryptRefundDetails(id: string): Promise<{ success: boolean; details: any }> {
    return await request<{ success: boolean; details: any }>(
      `/support/admin/returns/${id}/refund-details/decrypt`,
    );
  },

  // ---------------------------------------------------------------------------
  // Saved Replies CRUD
  // ---------------------------------------------------------------------------

  async getSavedReplies(category?: string): Promise<any[]> {
    const qs = category && category !== 'all' ? `?category=${encodeURIComponent(category)}` : '';
    return await request<any[]>(`/support/admin/saved-replies${qs}`);
  },

  async createSavedReply(data: {
    shortcut: string;
    title: string;
    content: string;
    category?: string;
  }): Promise<any> {
    return await request<any>('/support/admin/saved-replies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateSavedReply(
    id: string,
    data: Partial<{ shortcut: string; title: string; content: string; category?: string }>,
  ): Promise<any> {
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

  async createAdminHelpCategory(data: {
    title: string;
    slug: string;
    icon?: string;
    order?: number;
  }): Promise<any> {
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

  async createAdminHelpArticle(data: {
    categoryId: string;
    title: string;
    slug: string;
    content: string;
    summary?: string;
    isPublished?: boolean;
    order?: number;
  }): Promise<any> {
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

  // Order Change Requests
  async getAdminChangeRequests(params?: { status?: string; type?: string; page?: number; limit?: number }): Promise<any> {
    const sp = new URLSearchParams();
    if (params?.status) sp.set('status', params.status);
    if (params?.type) sp.set('type', params.type);
    if (params?.page) sp.set('page', String(params.page));
    if (params?.limit) sp.set('limit', String(params.limit));
    const qs = sp.toString();
    return await request<any>(`/support/admin/change-requests${qs ? `?${qs}` : ''}`);
  },

  async reviewChangeRequest(id: string, action: 'APPROVED' | 'REJECTED', adminNotes?: string): Promise<any> {
    return await request<any>(`/support/admin/change-requests/${id}/review`, {
      method: 'PUT',
      body: JSON.stringify({ action, adminNotes }),
    });
  },

  async applyChangeRequest(id: string): Promise<any> {
    return await request<any>(`/support/admin/change-requests/${id}/apply`, {
      method: 'POST',
    });
  },

  // Buyback Management
  async getAdminBuybacks(params?: { status?: string; search?: string; page?: number; limit?: number }): Promise<any> {
    const sp = new URLSearchParams();
    if (params?.status) sp.set('status', params.status);
    if (params?.search) sp.set('search', params.search);
    if (params?.page) sp.set('page', String(params.page));
    if (params?.limit) sp.set('limit', String(params.limit));
    const qs = sp.toString();
    return await request<any>(`/support/admin/buyback${qs ? `?${qs}` : ''}`);
  },

  async getAdminBuybackById(id: string): Promise<any> {
    return await request<any>(`/support/admin/buyback/${id}`);
  },

  async updateAdminBuybackStatus(id: string, status: string, notes?: string): Promise<any> {
    return await request<any>(`/support/admin/buyback/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, notes }),
    });
  },

  async submitBuybackInspection(id: string, data: any): Promise<any> {
    return await request<any>(`/support/admin/buyback/${id}/inspect`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async dispatchBuybackReturn(id: string, data: { courierName: string; trackingNumber: string }): Promise<any> {
    return await request<any>(`/support/admin/buyback/${id}/return-shipment`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async processBuybackPayout(id: string, data: { payoutUtr: string; finalAmount?: number }): Promise<any> {
    return await request<any>(`/support/admin/buyback/${id}/payout`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async decryptBuybackPayout(id: string): Promise<any> {
    return await request<any>(`/support/admin/buyback/${id}/payout/decrypt`);
  },

  async getAdminBuybackSettings(): Promise<{ settings: any; tiers: any[] }> {
    return await request<{ settings: any; tiers: any[] }>('/support/admin/buyback-settings');
  },

  async updateAdminBuybackSettings(data: { quoteValidityDays?: number; convenienceCharge?: number; batteryMinPercent?: number }): Promise<any> {
    return await request<any>('/support/admin/buyback-settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async updateAdminBuybackTiers(tiers: any[]): Promise<any> {
    return await request<any>('/support/admin/buyback-tiers', {
      method: 'PUT',
      body: JSON.stringify(tiers),
    });
  },

  async getUser360(userId: string): Promise<any> {
    return await request<any>(`/admin/users/${userId}/360`);
  },

  // Corporate Profile & Notes
  async getBusinessProfile(userId: string): Promise<any> {
    return await request<any>(`/support/admin/users/${userId}/business-profile`);
  },

  async upsertBusinessProfile(userId: string, data: any): Promise<any> {
    return await request<any>(`/support/admin/users/${userId}/business-profile`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async getClientNotes(userId: string): Promise<any[]> {
    return await request<any[]>(`/support/admin/users/${userId}/notes`);
  },

  async createClientNote(userId: string, note: string): Promise<any> {
    return await request<any>(`/support/admin/users/${userId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  },

  // Item-level Cancellation
  async adminCancelOrderItem(orderId: string, itemId: string, reason: string): Promise<any> {
    return await request<any>(`/admin/orders/${orderId}/items/${itemId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  // Lease Contracts Management
  async getAdminLeaseContracts(params?: { status?: string; search?: string }): Promise<any[]> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.search) query.set('search', params.search);
    const qStr = query.toString();
    return await request<any[]>(`/admin/lease/contracts${qStr ? `?${qStr}` : ''}`);
  },

  async getAdminLeaseContractById(id: string): Promise<any> {
    return await request<any>(`/admin/lease/contracts/${id}`);
  },

  async setAdminLeaseBuyoutQuote(id: string, data: { quoteAmount: number; expiresAt?: string; notes?: string }): Promise<any> {
    return await request<any>(`/admin/lease/contracts/${id}/buyout-quote`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async completeAdminLeaseBuyout(id: string, notes?: string): Promise<any> {
    return await request<any>(`/admin/lease/contracts/${id}/buyout-complete`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  },

  async terminateAdminLease(id: string, reason: string): Promise<any> {
    return await request<any>(`/admin/lease/contracts/${id}/terminate`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async getWarrantyRegister(params?: { page?: number; pageSize?: number; status?: string; source?: string; brand?: string; search?: string }): Promise<{ items: any[]; total: number; page: number; pageSize: number }> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.pageSize) query.set('pageSize', String(params.pageSize));
    if (params?.status) query.set('status', params.status);
    if (params?.source) query.set('source', params.source);
    if (params?.brand) query.set('brand', params.brand);
    if (params?.search) query.set('search', params.search);
    const qStr = query.toString();
    return await request(`/admin/service/warranty${qStr ? `?${qStr}` : ''}`);
  },

  async getSoldUnits(params?: { page?: number; pageSize?: number; status?: string; brand?: string; search?: string }): Promise<{ items: any[]; total: number; page: number; pageSize: number }> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.pageSize) query.set('pageSize', String(params.pageSize));
    if (params?.status) query.set('status', params.status);
    if (params?.brand) query.set('brand', params.brand);
    if (params?.search) query.set('search', params.search);
    const qStr = query.toString();
    return await request(`/admin/service/units${qStr ? `?${qStr}` : ''}`);
  },

  async getUnitBySerial(serial: string): Promise<any> {
    return await request(`/admin/service/units/${encodeURIComponent(serial)}`);
  },

  async updateUnitSerial(id: string, data: { serialNumber: string; reason: string }): Promise<any> {
    return await request(`/admin/service/units/${id}/serial`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
