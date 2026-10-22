import {
  Product,
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
} from './types';
import { NEXT_PUBLIC_API_URL } from './config';
import { auth, signOut } from './firebase';

const API_BASE_URL = NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  constructor(public status: number, message: string, public data?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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
  headers['Content-Type'] = headers['Content-Type'] || 'application/json';
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
      if (res.status === 401 && auth.currentUser) {
        await signOut(auth).catch(() => undefined);
      }
      throw new ApiError(res.status, message, errData);
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
  }): Promise<{ products: Product[]; total: number }> {
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
    return await request<{ products: Product[]; total: number }>(`/products${query ? `?${query}` : ''}`);
  },

  async getProduct(id: string): Promise<Product> {
    return await request<Product>(`/products/${id}`);
  },

  async getCategories(): Promise<Category[]> {
    return await request<Category[]>('/categories');
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

  async addToCart(productId: string, quantity: number = 1) {
    return await request<any>('/cart/items', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity }),
    });
  },

  async updateCartQuantity(itemId: string, quantity: number) {
    return await request<any>(`/cart/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    });
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
    return res.items || [];
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
  }): Promise<Order> {
    return await request<Order>('/orders', {
      method: 'POST',
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

  // Support & Warranty
  async getTickets(): Promise<SupportTicket[]> {
    return await request<SupportTicket[]>('/support/tickets');
  },

  async getTicket(id: string): Promise<SupportTicket> {
    return await request<SupportTicket>(`/support/tickets/${id}`);
  },

  async createTicket(data: { subject: string; orderId?: string; message: string; category?: string }): Promise<SupportTicket> {
    return await request<SupportTicket>('/support/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async addTicketMessage(ticketId: string, message: string): Promise<SupportTicketMessage> {
    return await request<SupportTicketMessage>(`/support/tickets/${ticketId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },

  async getWarrantyStatus(orderItemId: string): Promise<{ orderItemId: string; warrantyStatus: string; coverageType: string; validUntil: string; terms: string; claimEligible: boolean }> {
    return await request<any>(`/support/warranty/${orderItemId}`);
  },

  // Referral / Affiliate
  async getReferralStats(): Promise<{
    referralCode: string;
    referralTier: string;
    referralEarnings: number;
    referredUsersCount: number;
    referralLinkClickedCount: number;
    payoutHistory: Array<{ id: string; amount: number; date: string; status: string }>;
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
};
