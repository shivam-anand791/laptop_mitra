import {
  Product,
  ProductFilterFacets,
  Category,
  User,
  Cart,
  WishlistItem,
  Order,
  Address,
  CreateAddressDto,
  PaymentRecord,
  SupportTicket,
  SupportTicketMessage,
  NotificationPreferences,
  AdminAnalyticsResponse,
  CorporateInquiry,
  CreateCorporateInquiryDto,
} from './types';

import { NEXT_PUBLIC_API_URL } from './config';
import { auth, signOut } from './firebase';
import { MOCK_PRODUCTS, MOCK_CATEGORIES } from './mock-data';

const API_BASE_URL = NEXT_PUBLIC_API_URL;

function mockProductsFallback(reason: 'request failed' | 'no products') {
  if (process.env.NODE_ENV === 'development') {
    console.warn(`[dev] Product API ${reason}; using mock products.`);
    return { products: MOCK_PRODUCTS, total: MOCK_PRODUCTS.length, isMockFallback: true };
  }
  return { products: MOCK_PRODUCTS, total: MOCK_PRODUCTS.length };
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public data?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
): Promise<T> {
  let token: string | null = null;
  const url = new URL(endpoint.startsWith('/') ? endpoint : `/${endpoint}`, `${API_BASE_URL}/`);
  if (url.origin === new URL(API_BASE_URL).origin && auth.currentUser) {
    try {
      token = await auth.currentUser.getIdToken();
    } catch {
      token = null;
    }
  }

  const headers: Record<string, string> = { ...((options.headers as Record<string, string>) || {}) };
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
    delete headers['content-type'];
  } else {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }
  if (token && url.origin === new URL(API_BASE_URL).origin) {
    headers.Authorization = `Bearer ${token}`;
  } else {
    delete headers.Authorization;
    delete headers.authorization;
  }

  try {
    const res = await fetch(url.toString(), {
      ...options,
      headers,
    });

    if (!res.ok) {
      // 1. On 401: attempt token refresh once, then retry
      if (res.status === 401 && !isRetry && auth.currentUser) {
        try {
          const freshToken = await auth.currentUser.getIdToken(true);
          const retryHeaders = {
            ...headers,
            Authorization: `Bearer ${freshToken}`,
          };
          return await request<T>(endpoint, { ...options, headers: retryHeaders }, true);
        } catch {
          // Token refresh failed; proceed to signout and redirect
        }
      }

      const errData = await res.json().catch(() => ({ message: res.statusText }));
      const message =
        errData?.message ||
        (res.status === 401
          ? 'Session expired or unauthenticated. Please sign in again.'
          : res.status === 403
            ? 'Access forbidden.'
            : res.status === 500
              ? 'Backend service error. Please try again later.'
              : `Request failed with status ${res.status}`);

      // Global 403 handling: inform AdminGuard to render 403 screen
      if (res.status === 403 && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('admin:forbidden'));
      }

      // Global 401 handling on admin routes / endpoints: redirect to login
      if (res.status === 401) {
        const isAdminContext =
          endpoint.startsWith('/admin') ||
          (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin'));

        if (isAdminContext && typeof window !== 'undefined') {
          window.location.href = '/login?next=/admin';
        }

        if (auth.currentUser) {
          await signOut(auth).catch(() => undefined);
        }
      }

      throw new ApiError(res.status, message, errData);
    }

    if (res.headers.get('content-type')?.includes('text/csv')) {
      return (await res.text()) as T;
    }
    return await res.json();
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    const isNetwork = typeof window !== 'undefined' && !navigator.onLine;
    throw new ApiError(
      0,
      isNetwork
        ? 'Cannot reach backend server. Please check your internet connection.'
        : err?.message || 'Network connection failed'
    );
  }
}

export const api = {
  // Health
  async getHealth(): Promise<{ status: string; timestamp: string; version: string }> {
    return await request('/health');
  },

  // Products
  async getProducts(params?: {
    search?: string;
    categoryId?: string;
    featured?: boolean;
    newArrival?: boolean;
    minPrice?: number;
    maxPrice?: number;
    stockOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ products: Product[]; total: number; isMockFallback?: boolean }> {
    try {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.set('search', params.search);
      if (params?.categoryId && params.categoryId !== 'all') searchParams.set('categoryId', params.categoryId);
      if (params?.featured !== undefined) searchParams.set('featured', String(params.featured));
      if (params?.newArrival !== undefined) searchParams.set('newArrival', String(params.newArrival));
      if (params?.minPrice !== undefined) searchParams.set('minPrice', String(params.minPrice));
      if (params?.maxPrice !== undefined) searchParams.set('maxPrice', String(params.maxPrice));
      if (params?.stockOnly !== undefined) searchParams.set('stockOnly', String(params.stockOnly));
      if (params?.limit) searchParams.set('limit', String(params.limit));
      if (params?.offset) searchParams.set('offset', String(params.offset));

      const query = searchParams.toString();
      const res = await request<{ products: Product[]; total: number }>(`/products${query ? `?${query}` : ''}`);
      if (res?.products && res.products.length > 0) {
        return res;
      }
      return mockProductsFallback('no products');
    } catch {
      return mockProductsFallback('request failed');
    }
  },

  async getProduct(id: string): Promise<Product> {
    try {
      return await request<Product>(`/products/${id}`);
    } catch {
      const found = MOCK_PRODUCTS.find((p) => p.id === id || p.slug === id);
      if (found) return found;
      throw new ApiError(404, 'Product not found');
    }
  },

  async getProductFilters(): Promise<ProductFilterFacets> {
    return await request<ProductFilterFacets>('/products/filters');
  },

  async getCategories(): Promise<Category[]> {
    try {
      const res = await request<Category[]>('/categories');
      if (Array.isArray(res) && res.length > 0) return res;
      return MOCK_CATEGORIES;
    } catch {
      return MOCK_CATEGORIES;
    }
  },

  // Auth
  async syncUser(data?: { name?: string; phone?: string; referralCode?: string }): Promise<{ user: User }> {
    const res = await request<any>('/auth/sync', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
    const user: User = (res?.user || res) as User;
    return { user };
  },

  async getProfile(): Promise<User> {
    const res = await request<User>('/auth/profile');
    return res;
  },

  async updateProfile(data: { name?: string; phone?: string; dob?: string }): Promise<User> {
    const res = await request<User>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return res;
  },

  async signoutEverywhere(): Promise<{ message: string }> {
    return await request('/auth/signout-everywhere', { method: 'POST' });
  },

  async deleteAccount(): Promise<{ message: string }> {
    const res = await request<{ message: string }>('/auth/account', { method: 'DELETE' });
    return res;
  },

  // Cart
  async getCart(): Promise<Cart> {
    return await request<Cart>('/cart');
  },

  async addToCart(
    productId: string,
    quantity: number = 1,
    purchaseMode: 'sell' | 'lease' = 'sell',
    configuration: string = 'default',
    hasWarranty: boolean = false,
    variantId?: string,
  ) {
    return await request<any>('/cart/items', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity, purchaseMode, configuration, hasWarranty, ...(variantId ? { variantId } : {}) }),
    });
  },

  async updateCartItem(itemId: string, data: { quantity?: number; hasWarranty?: boolean }) {
    return await request<any>(`/cart/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async updateCartQuantity(itemId: string, quantity: number) {
    return await this.updateCartItem(itemId, { quantity });
  },

  async removeCartItem(itemId: string) {
    return await request<any>(`/cart/items/${itemId}`, {
      method: 'DELETE',
    });
  },

  async clearCart() {
    return await request<any>('/cart', {
      method: 'DELETE',
    });
  },

  // Wishlist
  async getWishlist(): Promise<WishlistItem[]> {
    const res = await request<any>('/wishlist');
    return Array.isArray(res) ? res : (res?.items ?? res?.wishlist?.items ?? []);
  },

  async addToWishlist(productId: string) {
    return await request<any>('/wishlist/items', {
      method: 'POST',
      body: JSON.stringify({ productId }),
    });
  },

  async removeWishlistItem(itemId: string) {
    return await request<any>(`/wishlist/items/${itemId}`, {
      method: 'DELETE',
    });
  },

  // Addresses
  async getAddresses(): Promise<Address[]> {
    return await request<Address[]>('/addresses');
  },

  async createAddress(data: CreateAddressDto): Promise<Address> {
    return await request<Address>('/addresses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateAddress(id: string, data: Partial<CreateAddressDto>): Promise<Address> {
    return await request<Address>(`/addresses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteAddress(id: string): Promise<{ message: string }> {
    return await request<{ message: string }>(`/addresses/${id}`, {
      method: 'DELETE',
    });
  },

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
    return await request<Order>('/orders', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  },

  async getOrders(status?: string): Promise<Order[]> {
    const query = status && status !== 'ALL' ? `?status=${encodeURIComponent(status)}` : '';
    return await request<Order[]>(`/orders${query}`);
  },

  async getOrder(id: string): Promise<Order> {
    return await request<Order>(`/orders/${id}`);
  },

  async cancelOrder(id: string): Promise<Order> {
    return await request<Order>(`/orders/${id}/cancel`, {
      method: 'PATCH',
    });
  },

  async requestOrderReturn(id: string, reason: string): Promise<{ message: string; returnStatus: string }> {
    return await request<{ message: string; returnStatus: string }>(`/orders/${id}/return`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  async reorder(id: string): Promise<{ message: string; itemsAdded: number }> {
    return await request<{ message: string; itemsAdded: number }>(`/orders/${id}/reorder`, {
      method: 'POST',
    });
  },

  async getOrderInvoice(id: string): Promise<{ order: Order; invoiceNumber: string; issuedAt: string; seller: any; taxBreakdown: any }> {
    return await request<any>(`/orders/${id}/invoice`);
  },

  async trackOrder(id: string): Promise<{ orderId: string; orderNumber: string; status: string; carrier: string; trackingNumber: string; estimatedDelivery: string; timeline: any[] }> {
    return await request<any>(`/orders/${id}/track`);
  },

  // Payments
  async getPaymentHistory(): Promise<PaymentRecord[]> {
    return await request<PaymentRecord[]>('/payments/history');
  },

  async createRazorpayOrder(orderId: string): Promise<any> {
    return await request<any>('/payments/razorpay/order', {
      method: 'POST',
      body: JSON.stringify({ orderId }),
    });
  },

  async verifyRazorpayPayment(payload: {
    orderId: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }): Promise<{ success: boolean; message: string }> {
    return request('/payments/razorpay/verify', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

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
    payoutHistory: Array<{ id: string; amount: number; date: string; status: string; adminNotes?: string; processedAt?: string }>;
  }> {
    return await request<any>('/discount/referral/stats');
  },

  // Notification preferences
  async getNotificationPreferences(): Promise<NotificationPreferences> {
    return await request<NotificationPreferences>('/notifications/preferences');
  },

  async updateNotificationPreferences(prefs: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    return await request<NotificationPreferences>('/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(prefs),
    });
  },

  // Discount validation
  async validateDiscount(code: string, cartTotal: number): Promise<{ valid: boolean; discountType: string; discountValue: number; discountAmount: number; message: string }> {
    return await request<any>('/discount/validate', {
      method: 'POST',
      body: JSON.stringify({ code, cartTotal }),
    });
  },

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
    return await request<any>('/admin/dashboard');
  },

  async getAdminAnalytics(range?: '7d' | '30d' | '90d' | string): Promise<AdminAnalyticsResponse> {
    const qs = range ? `?range=${range}` : '';
    return await request<AdminAnalyticsResponse>(`/admin/analytics${qs}`);
  },

  async getAdminUsers(params?: {
    page?: number;
    pageSize?: number;
    status?: string;
    role?: string;
    search?: string;
  }): Promise<{ items: any[]; total: number; page: number; pageSize: number }> {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.set('page', String(params.page));
    if (params?.pageSize) searchParams.set('pageSize', String(params.pageSize));
    if (params?.status && params.status !== 'all') searchParams.set('status', params.status);
    if (params?.role && params.role !== 'all') searchParams.set('role', params.role);
    if (params?.search && params.search.trim()) searchParams.set('search', params.search.trim());
    const qs = searchParams.toString();
    return await request<{ items: any[]; total: number; page: number; pageSize: number }>(`/admin/users${qs ? `?${qs}` : ''}`);
  },

  async updateAdminUserStatus(userId: string, status: string): Promise<any> {
    return await request<any>(`/admin/users/${userId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  async getAdminProducts(): Promise<Product[]> {
    return await request<Product[]>('/admin/products');
  },

  async createAdminProduct(data: any): Promise<Product> {
    return await request<Product>('/admin/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async updateAdminProduct(productId: string, data: any): Promise<Product> {
    return await request<Product>(`/admin/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async deleteAdminProduct(productId: string): Promise<{ success?: boolean }> {
    return await request<any>(`/admin/products/${productId}`, {
      method: 'DELETE',
    });
  },

  async getAdminOrders(): Promise<Order[]> {
    return await request<Order[]>('/admin/orders');
  },

  async getAdminOrder(orderId: string): Promise<Order> {
    return await request<Order>(`/admin/orders/${orderId}`);
  },

  async updateAdminOrderStatus(orderId: string, status: string): Promise<Order> {
    return await request<Order>(`/admin/orders/${orderId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
  },

  async createCorporateInquiry(data: CreateCorporateInquiryDto): Promise<CorporateInquiry> {
    return await request<CorporateInquiry>('/support/corporate-inquiry', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

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
    return await request<{ items: CorporateInquiry[]; total: number; page: number; pageSize: number }>(
      `/admin/inquiries${qs ? `?${qs}` : ''}`
    );
  },

  async updateAdminInquiryStatus(
    id: string,
    status: string,
    adminNotes?: string
  ): Promise<CorporateInquiry> {
    return await request<CorporateInquiry>(`/admin/inquiries/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, adminNotes }),
    });
  },

  async getPayoutDetails(): Promise<any> {
    return await request<any>('/discounts/payout-details');
  },

  async savePayoutDetails(data: any): Promise<any> {
    return await request<any>('/discounts/payout-details', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async uploadPayoutQr(file: File): Promise<{ success: boolean; hasQrCode: boolean }> {
    const formData = new FormData();
    formData.append('file', file);
    return await request<{ success: boolean; hasQrCode: boolean }>('/discounts/payout-details/qr', {
      method: 'POST',
      body: formData,
    });
  },

  async requestWithdrawal(amount: number): Promise<{
    id: string;
    amount: number;
    status: string;
    createdAt: string;
  }> {
    return await request<any>('/discounts/withdraw', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  },

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
    return await request<any>(`/admin/affiliates${qs ? `?${qs}` : ''}`);
  },

  async getAdminAffiliateDetail(id: string): Promise<any> {
    return await request<any>(`/admin/affiliates/${id}`);
  },

  async getAdminWithdrawalPaymentDetails(id: string): Promise<any> {
    return await request<any>(`/admin/withdrawals/${id}/payment-details`);
  },

  async updateAdminWithdrawalStatus(
    id: string,
    status: 'APPROVED' | 'REJECTED',
    adminNotes?: string,
  ): Promise<any> {
    return await request<any>(`/admin/withdrawals/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, adminNotes }),
    });
  },

  // ---------------------------------------------------------------------------
  // Help Center & Knowledge Base
  // ---------------------------------------------------------------------------
  async getSupportConfig(): Promise<any> {
    return await request<any>('/support/config');
  },

  async getHelpCategories(): Promise<any[]> {
    return await request<any[]>('/support/help/categories');
  },

  async getHelpArticles(params?: { q?: string; category?: string }): Promise<any[]> {
    const searchParams = new URLSearchParams();
    if (params?.q) searchParams.set('q', params.q);
    if (params?.category) searchParams.set('category', params.category);
    const qs = searchParams.toString();
    return await request<any[]>(`/support/help/articles${qs ? `?${qs}` : ''}`);
  },

  async getHelpArticle(slug: string): Promise<any> {
    return await request<any>(`/support/help/articles/${slug}`);
  },

  async voteHelpArticle(id: string, helpful: boolean): Promise<{ success: boolean; helpfulCount: number; notHelpfulCount: number }> {
    return await request<any>(`/support/help/articles/${id}/vote`, {
      method: 'POST',
      body: JSON.stringify({ helpful }),
    });
  },

  // ---------------------------------------------------------------------------
  // Customer Tickets
  // ---------------------------------------------------------------------------
  async getTickets(): Promise<any[]> {
    return await request<any[]>('/support/tickets');
  },

  async getTicket(id: string): Promise<any> {
    return await request<any>(`/support/tickets/${id}`);
  },

  async createTicket(data: {
    subject: string;
    category: string;
    issueType?: string;
    type?: string;
    priority?: string;
    orderId?: string;
    orderItemId?: string;
    message: string;
    callbackPhone?: string;
    callbackSlot?: string;
    attachments?: string[];
  }): Promise<any> {
    return await request<any>('/support/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async addTicketMessage(ticketId: string, message: string, attachments?: string[]): Promise<any> {
    return await request<any>(`/support/tickets/${ticketId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message, attachments }),
    });
  },

  async reopenTicket(ticketId: string): Promise<any> {
    return await request<any>(`/support/tickets/${ticketId}/reopen`, {
      method: 'POST',
    });
  },

  async rateTicket(ticketId: string, score: number, comment?: string): Promise<any> {
    return await request<any>(`/support/tickets/${ticketId}/rate`, {
      method: 'POST',
      body: JSON.stringify({ score, comment }),
    });
  },

  // ---------------------------------------------------------------------------
  // Returns & Refunds
  // ---------------------------------------------------------------------------
  async createReturnRequest(data: {
    orderId: string;
    ticketId?: string;
    type?: 'REFUND' | 'REPLACEMENT';
    reason: string;
    items: Array<{ orderItemId: string; quantity?: number; reason?: string }>;
    attachments?: string[];
    refundMethod?: 'SOURCE' | 'BANK' | 'UPI';
    refundDetails?: {
      accountNumber?: string;
      confirmAccountNumber?: string;
      ifscCode?: string;
      accountHolderName?: string;
      upiId?: string;
    };
  }): Promise<any> {
    return await request<any>('/support/returns', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getReturnRequest(id: string): Promise<any> {
    return await request<any>(`/support/returns/${id}`);
  },

  async updateRefundDetails(id: string, data: {
    accountNumber?: string;
    confirmAccountNumber?: string;
    ifscCode?: string;
    accountHolderName?: string;
    upiId?: string;
  }): Promise<any> {
    return await request<any>(`/support/returns/${id}/refund-details`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async getWarrantyStatus(orderItemId: string): Promise<any> {
    return await request<any>(`/support/warranty/${orderItemId}`);
  },
};
