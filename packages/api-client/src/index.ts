import type {
  Product,
  ProductFilterFacets,
  Cart,
  CartItem,
  WishlistItem,
  User,
  Order,
  OrderListResponse,
  Address,
  Category,
  PaymentRecord,
  SupportTicket,
  TicketMessage,
  TicketAttachment,
  CreateTicketDto,
  AddTicketMessageDto,
  UpdateTicketDto,
  ReturnRequest,
  CreateReturnRequestDto,
  ProcessReturnDto,
  HelpCategory,
  HelpArticle,
  SavedReply,
  SupportSettings,
  NotificationPreferences,
  CorporateInquiry,
  CreateCorporateInquiryDto,
} from '@laptopmitra/types';


export * from '@laptopmitra/types';

export interface ApiClientConfig {
  baseUrl: string;
  getToken?: (() => string | null | Promise<string | null>) | undefined;
  onUnauthorized?: (() => void | Promise<void>) | undefined;
}

declare const process: any;

export class LaptopMitraApiClient {
  private baseUrl: string;
  private getToken?: (() => string | null | Promise<string | null>) | undefined;
  private onUnauthorized?: (() => void | Promise<void>) | undefined;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.getToken = config.getToken;
    this.onUnauthorized = config.onUnauthorized;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken ? await this.getToken() : null;
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers: Record<string, string> = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options.headers as Record<string, string>) || {}),
    };
    if (isFormData && headers['Content-Type']) {
      delete headers['Content-Type'];
    }

    const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';

    if (isDev) {
      console.log(`[API Request] ${options.method || 'GET'} ${endpoint}`);
    }

    const res = await fetch(`${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`, {
      ...options,
      headers,
    });

    if (isDev) {
      console.log(`[API Response] ${res.status} ${endpoint}`);
    }

    if (!res.ok) {
      const errorData = (await res.json().catch(() => ({ message: res.statusText }))) as { message?: string };
      if (res.status === 401) {
        await this.onUnauthorized?.();
      }
      throw new Error(errorData.message || `API error ${res.status}`);
    }

    return (await res.json()) as T;
  }

  // Health
  async getHealth(): Promise<{ status: string; timestamp: string; version: string }> {
    return this.request<{ status: string; timestamp: string; version: string }>('/health');
  }

  // Products
  async getProducts(params?: Record<string, any>): Promise<{ products: Product[]; total: number }> {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request<{ products: Product[]; total: number }>(`/products${query}`);
  }

  async getProduct(id: string): Promise<Product> {
    return this.request<Product>(`/products/${id}`);
  }

  async getProductFilters(): Promise<ProductFilterFacets> {
    return this.request<ProductFilterFacets>('/products/filters');
  }


  // Auth
  async syncUser(data?: { name?: string; phone?: string; referralCode?: string }): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/sync', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
  }

  async getProfile(): Promise<User> {
    return this.request<User>('/auth/profile');
  }

  async updateProfile(data: Partial<User>): Promise<User> {
    return this.request<User>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async signoutEverywhere(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/signout-everywhere', {
      method: 'POST',
    });
  }

  async deleteAccount(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/account', {
      method: 'DELETE',
    });
  }

  // Cart
  async getCart(): Promise<Cart> {
    return this.request<Cart>('/cart');
  }

  async addToCart(
    productId: string,
    quantity = 1,
    purchaseMode: 'sell' | 'lease' = 'sell',
    configuration: string = 'default',
    hasWarranty: boolean = false,
  ): Promise<{ cartItem: CartItem; message: string }> {
    return this.request<{ cartItem: CartItem; message: string }>('/cart/items', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity, purchaseMode, configuration, hasWarranty }),
    });
  }

  async removeCartItem(itemId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/cart/items/${itemId}`, { method: 'DELETE' });
  }

  async updateCartItem(
    itemId: string,
    data: { quantity?: number; hasWarranty?: boolean },
  ): Promise<{ cartItem: CartItem; message: string }> {
    return this.request<{ cartItem: CartItem; message: string }>(`/cart/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async updateCartItemQuantity(itemId: string, quantity: number): Promise<{ cartItem: CartItem; message: string }> {
    return this.updateCartItem(itemId, { quantity });
  }

  async clearCart(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/cart', { method: 'DELETE' });
  }

  // Wishlist
  async getWishlist(): Promise<WishlistItem[]> {
    const res = await this.request<any>('/wishlist');
    return Array.isArray(res) ? res : (res?.items ?? res?.wishlist?.items ?? []);
  }

  async addToWishlist(productId: string): Promise<{ wishlistItem: WishlistItem; message: string }> {
    return this.request<{ wishlistItem: WishlistItem; message: string }>('/wishlist/items', {
      method: 'POST',
      body: JSON.stringify({ productId }),
    });
  }

  async removeWishlistItem(itemId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/wishlist/items/${itemId}`, { method: 'DELETE' });
  }

  async clearWishlist(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/wishlist', { method: 'DELETE' });
  }

  // Orders
  async createOrder(payload: {
    referralCode?: string;
    discountCode?: string;
    shippingAddress?: any;
    phone?: string;
    notes?: string;
    email?: string;
    paymentMethod?: 'razorpay' | 'cod';
    idempotencyKey?: string;
  }): Promise<Order> {
    const headers: Record<string, string> = {};
    if (payload.idempotencyKey) {
      headers['Idempotency-Key'] = payload.idempotencyKey;
    }
    return this.request<Order>('/orders', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  }

  async getOrders(params?: { status?: string; page?: number; limit?: number }): Promise<Order[] | OrderListResponse> {
    const query = params ? `?${new URLSearchParams(params as any).toString()}` : '';
    return this.request<Order[] | OrderListResponse>(`/orders${query}`);
  }

  async getOrder(id: string): Promise<Order> {
    return this.request<Order>(`/orders/${id}`);
  }

  async cancelOrder(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/orders/${id}/cancel`, { method: 'PATCH' });
  }

  async requestOrderReturn(id: string, reason: string): Promise<{ message: string; returnStatus: string }> {
    return this.request<{ message: string; returnStatus: string }>(`/orders/${id}/return`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async reorder(id: string): Promise<{ message: string; itemsAdded: number }> {
    return this.request<{ message: string; itemsAdded: number }>(`/orders/${id}/reorder`, {
      method: 'POST',
    });
  }

  async getOrderInvoice(id: string): Promise<{
    order: Order;
    invoiceNumber: string;
    issuedAt: string;
    seller?: {
      name: string;
      gstin: string;
      address: string;
      phone: string;
      email: string;
    };
    taxBreakdown?: {
      taxableAmount: number;
      cgst: number;
      sgst: number;
      totalTax: number;
      grandTotal: number;
    };
  }> {
    return this.request<any>(`/orders/${id}/invoice`);
  }

  async trackOrder(id: string): Promise<{
    orderId?: string;
    orderNumber?: string;
    status: string;
    carrier?: string;
    trackingNumber?: string;
    estimatedDelivery?: string;
    timeline: Array<{ status: string; time: string; note: string }>;
  }> {
    return this.request<any>(`/orders/${id}/track`);
  }

  // Payments
  async getPaymentHistory(): Promise<PaymentRecord[]> {
    return this.request<PaymentRecord[]>('/payments/history');
  }

  async createRazorpayOrder(orderId: string): Promise<any> {
    return this.request<any>('/payments/razorpay/order', {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    });
  }

  async verifyRazorpayPayment(payload: {
    orderId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }): Promise<{ success: boolean; message: string }> {
    return this.request<{ success: boolean; message: string }>('/payments/razorpay/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Support, Tickets & Warranty
  async getTickets(params?: { status?: string; category?: string; page?: number; limit?: number }): Promise<SupportTicket[]> {
    const qs = params ? `?${new URLSearchParams(params as any).toString()}` : '';
    return this.request<SupportTicket[]>(`/support/tickets${qs}`);
  }

  async getTicket(id: string): Promise<SupportTicket> {
    return this.request<SupportTicket>(`/support/tickets/${id}`);
  }

  async createTicket(data: CreateTicketDto): Promise<SupportTicket> {
    return this.request<SupportTicket>('/support/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async addTicketMessage(ticketId: string, data: AddTicketMessageDto | string): Promise<TicketMessage> {
    const payload = typeof data === 'string' ? { message: data } : {
      message: (data as any).message || (data as any).content || data.body || '',
      attachments: (data as any).attachments || data.attachmentIds,
      isInternal: data.isInternal,
    };
    return this.request<TicketMessage>(`/support/tickets/${ticketId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateTicket(ticketId: string, data: UpdateTicketDto): Promise<SupportTicket> {
    return this.request<SupportTicket>(`/support/tickets/${ticketId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async createTicketAttachmentUploadUrl(
    ticketId: string,
    data: { fileName: string; fileSize: number; mimeType: string },
  ): Promise<{ uploadUrl: string; storageKey: string; attachmentId: string }> {
    return this.request<{ uploadUrl: string; storageKey: string; attachmentId: string }>(
      `/support/tickets/${ticketId}/attachments/upload-url`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    );
  }

  async confirmTicketAttachment(ticketId: string, attachmentId: string): Promise<TicketAttachment> {
    return this.request<TicketAttachment>(`/support/tickets/${ticketId}/attachments/${attachmentId}/confirm`, {
      method: 'POST',
    });
  }

  async getWarrantyStatus(orderItemId: string): Promise<{ warrantyStatus: string; validUntil: string; terms: string }> {
    return this.request<{ warrantyStatus: string; validUntil: string; terms: string }>(`/support/warranty/${orderItemId}`);
  }

  async reopenTicket(ticketId: string): Promise<SupportTicket> {
    return this.request<SupportTicket>(`/support/tickets/${ticketId}/reopen`, {
      method: 'POST',
    });
  }

  async rateTicket(ticketId: string, score: number, comment?: string): Promise<SupportTicket> {
    return this.request<SupportTicket>(`/support/tickets/${ticketId}/rate`, {
      method: 'POST',
      body: JSON.stringify({ score, comment }),
    });
  }

  // Returns & Refunds
  async getReturns(params?: { status?: string; page?: number; limit?: number }): Promise<ReturnRequest[]> {
    const qs = params ? `?${new URLSearchParams(params as any).toString()}` : '';
    return this.request<ReturnRequest[]>(`/support/returns${qs}`);
  }

  async getReturn(id: string): Promise<ReturnRequest> {
    return this.request<ReturnRequest>(`/support/returns/${id}`);
  }

  async getReturnRequest(id: string): Promise<ReturnRequest> {
    return this.getReturn(id);
  }

  async createReturn(data: CreateReturnRequestDto): Promise<ReturnRequest> {
    return this.request<ReturnRequest>('/support/returns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async createReturnRequest(data: CreateReturnRequestDto): Promise<ReturnRequest> {
    return this.createReturn(data);
  }

  async updateRefundDetails(id: string, data: any): Promise<ReturnRequest> {
    return this.request<ReturnRequest>(`/support/returns/${id}/refund-details`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async processReturn(id: string, data: ProcessReturnDto): Promise<ReturnRequest> {
    return this.request<ReturnRequest>(`/admin/returns/${id}/process`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Help Center
  async getSupportConfig(): Promise<any> {
    return this.request<any>('/support/config');
  }

  async getHelpCategories(): Promise<HelpCategory[]> {
    return this.request<HelpCategory[]>('/support/help/categories');
  }

  async getHelpArticles(params?: { categoryId?: string; search?: string; q?: string; category?: string }): Promise<HelpArticle[]> {
    const searchParams = new URLSearchParams();
    if (params?.categoryId) searchParams.set('categoryId', params.categoryId);
    if (params?.category) searchParams.set('category', params.category);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.q) searchParams.set('q', params.q);
    const qs = searchParams.toString();
    return this.request<HelpArticle[]>(`/support/help/articles${qs ? `?${qs}` : ''}`);
  }

  async getHelpArticle(slug: string): Promise<HelpArticle> {
    return this.request<HelpArticle>(`/support/help/articles/${slug}`);
  }

  async voteHelpArticle(id: string, helpful: boolean): Promise<{ success: boolean; helpfulCount: number; notHelpfulCount: number }> {
    return this.request<any>(`/support/help/articles/${id}/vote`, {
      method: 'POST',
      body: JSON.stringify({ helpful }),
    });
  }

  // Support Settings
  async getSupportSettings(): Promise<SupportSettings> {
    return this.request<SupportSettings>('/support/settings');
  }

  async updateSupportSettings(data: Partial<SupportSettings>): Promise<SupportSettings> {
    return this.request<SupportSettings>('/admin/support/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Saved Replies (Support / Admin)
  async getSavedReplies(): Promise<SavedReply[]> {
    return this.request<SavedReply[]>('/support/saved-replies');
  }

  // Referral / Affiliate
  async getReferralStats(): Promise<{
    referralCode: string;
    referralTier: string;
    referralEarnings: number;
    referralReserved: number;
    referralWithdrawn: number;
    availableBalance: number;
    referredUsersCount: number;
    referralLinkClickedCount: number;
    payoutHistory: Array<{
      id: string;
      amount: number;
      date: string;
      status: string;
      adminNotes?: string;
      processedAt?: string;
    }>;
  }> {
    return this.request<any>('/discount/referral/stats');
  }

  // Notifications
  async getNotificationPreferences(): Promise<NotificationPreferences> {
    return this.request<NotificationPreferences>('/notifications/preferences');
  }

  async updateNotificationPreferences(preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    return this.request<NotificationPreferences>('/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(preferences),
    });
  }

  async registerDeviceToken(token: string, platform?: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/notifications/register', {
      method: 'POST',
      body: JSON.stringify({ token, platform }),
    });
  }

  // Addresses
  async getAddresses(): Promise<Address[]> {
    return this.request<Address[]>('/addresses');
  }

  async createAddress(data: Partial<Address>): Promise<Address> {
    return this.request<Address>('/addresses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAddress(id: string, data: Partial<Address>): Promise<Address> {
    return this.request<Address>(`/addresses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAddress(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/addresses/${id}`, {
      method: 'DELETE',
    });
  }

  // Categories
  async getCategories(params?: { parentId?: string }): Promise<Category[]> {
    const query = params?.parentId ? `?parentId=${encodeURIComponent(params.parentId)}` : '';
    return this.request<Category[]>(`/categories${query}`);
  }

  async getCategory(id: string): Promise<Category> {
    return this.request<Category>(`/categories/${id}`);
  }

  async getCategoryBySlug(slug: string): Promise<Category> {
    return this.request<Category>(`/categories/slug/${slug}`);
  }

  async validateDiscount(code: string, cartTotal: number): Promise<{
    valid: boolean;
    discountType: 'percentage' | 'fixed' | 'free_shipping' | null;
    discountValue: number;
    discountAmount: number;
    message: string;
  }> {
    return this.request<{
      valid: boolean;
      discountType: 'percentage' | 'fixed' | 'free_shipping' | null;
      discountValue: number;
      discountAmount: number;
      message: string;
    }>('/discount/validate', {
      method: 'POST',
      body: JSON.stringify({ code, cartTotal }),
    });
  }

  // Admin Endpoints
  async getAdminDashboard(): Promise<{
    totalUsers: number;
    totalProducts: number;
    totalOrders: number;
    pendingOrders: number;
    deliveredOrders: number;
    revenueCompleted: number;
    revenuePending: number;
    revenue: { completed: number; pending: number };
  }> {
    return this.request<any>('/admin/dashboard');
  }

  async getAdminAnalytics(): Promise<{
    revenue: { daily: { date: string; amount: number }[]; total: number; growth: number };
    orders: { total: number; pending: number; completed: number; cancelled: number; conversionRate: number };
    users: { total: number; active: number; newThisMonth: number; growth: number };
    products: { total: number; lowStock: number; bestSellers: { name: string; sales: number }[] };
  }> {
    return this.request<any>('/admin/analytics');
  }

  async getAdminUsers(): Promise<User[]> {
    return this.request<User[]>('/admin/users');
  }

  async updateAdminUserStatus(userId: string, status: string): Promise<any> {
    return this.request<any>(`/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  }

  async getAdminProducts(): Promise<Product[]> {
    return this.request<Product[]>('/admin/products');
  }

  async createAdminProduct(data: any): Promise<Product> {
    return this.request<Product>('/admin/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAdminProduct(productId: string, data: any): Promise<Product> {
    return this.request<Product>(`/admin/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAdminProduct(productId: string): Promise<{ success?: boolean }> {
    return this.request<any>(`/admin/products/${productId}`, {
      method: 'DELETE',
    });
  }

  async getAdminOrders(): Promise<Order[]> {
    return this.request<Order[]>('/admin/orders');
  }

  async getAdminOrder(orderId: string): Promise<Order> {
    return this.request<Order>(`/admin/orders/${orderId}`);
  }

  async updateAdminOrderStatus(
    orderId: string,
    status: string,
    trackingInfo?: { courierName?: string; trackingNumber?: string },
  ): Promise<Order> {
    return this.request<Order>(`/admin/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({
        status,
        ...(trackingInfo?.courierName ? { courierName: trackingInfo.courierName } : {}),
        ...(trackingInfo?.trackingNumber ? { trackingNumber: trackingInfo.trackingNumber } : {}),
      }),
    });
  }


  // Support / Corporate Inquiries
  async createCorporateInquiry(data: CreateCorporateInquiryDto): Promise<CorporateInquiry> {
    return this.request<CorporateInquiry>('/support/corporate-inquiry', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getAdminInquiries(params?: {
    status?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ items: CorporateInquiry[]; total: number; page: number; pageSize: number }> {
    const searchParams = new URLSearchParams();
    if (params?.status && params.status !== 'all') searchParams.set('status', params.status);
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
    const qs = searchParams.toString();
    return this.request<{ items: CorporateInquiry[]; total: number; page: number; pageSize: number }>(
      `/admin/inquiries${qs ? `?${qs}` : ''}`
    );
  }

  async updateAdminInquiryStatus(
    id: string,
    status: string,
    adminNotes?: string
  ): Promise<CorporateInquiry> {
    return this.request<CorporateInquiry>(`/admin/inquiries/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, adminNotes }),
    });
  }

  // Affiliate & Payout Endpoints
  async getPayoutDetails(): Promise<any> {
    return this.request<any>('/discounts/payout-details');
  }

  async savePayoutDetails(data: any): Promise<any> {
    return this.request<any>('/discounts/payout-details', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async requestWithdrawal(amount: number): Promise<{
    id: string;
    amount: number;
    status: string;
    createdAt: string;
  }> {
    return this.request<any>('/discounts/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  async uploadPayoutQr(formData: FormData): Promise<{ success: boolean; hasQrCode: boolean }> {
    return this.request<{ success: boolean; hasQrCode: boolean }>('/discounts/payout-details/qr', {
      method: 'POST',
      body: formData,
    });
  }

  async getAdminAffiliates(params?: {
    page?: number;
    pageSize?: number;
    search?: string;
  }): Promise<{ items: any[]; total: number; page: number; pageSize: number }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
    if (params?.search && params.search.trim()) searchParams.set('search', params.search.trim());
    const qs = searchParams.toString();
    return this.request<any>(`/admin/affiliates${qs ? `?${qs}` : ''}`);
  }

  async getAdminAffiliateDetail(id: string): Promise<any> {
    return this.request<any>(`/admin/affiliates/${id}`);
  }

  async getAdminWithdrawalPaymentDetails(id: string): Promise<any> {
    return this.request<any>(`/admin/withdrawals/${id}/payment-details`);
  }

  async updateAdminWithdrawalStatus(
    id: string,
    status: 'APPROVED' | 'REJECTED',
    adminNotes?: string,
  ): Promise<any> {
    return this.request<any>(`/admin/withdrawals/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, adminNotes }),
    });
  }
}

