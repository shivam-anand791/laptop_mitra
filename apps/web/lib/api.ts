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

const API_BASE_URL = NEXT_PUBLIC_API_URL;

export class ApiError extends Error {
  constructor(public status: number, message: string, public data?: any) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('lm_token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ message: res.statusText }));
      throw new ApiError(res.status, errData.message || `Request failed with status ${res.status}`, errData);
    }

    return await res.json();
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, err?.message || 'Network connection failed');
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
  async login(email: string, password?: string): Promise<{ accessToken: string; refreshToken: string; user: User }> {
    const res = await request<{ accessToken?: string; access_token?: string; refreshToken: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    const token = res.accessToken || res.access_token || '';
    if (token && typeof window !== 'undefined') {
      localStorage.setItem('lm_token', token);
      localStorage.setItem('lm_refresh_token', res.refreshToken);
      localStorage.setItem('lm_user', JSON.stringify(res.user));
    }
    return {
      accessToken: token,
      refreshToken: res.refreshToken,
      user: res.user,
    };
  },

  async guestLogin(): Promise<{ accessToken: string; refreshToken: string; user: User }> {
    const res = await request<{ accessToken?: string; access_token?: string; refreshToken: string; user: User }>('/auth/guest', {
      method: 'POST',
    });
    const token = res.accessToken || res.access_token || '';
    if (token && typeof window !== 'undefined') {
      localStorage.setItem('lm_token', token);
      localStorage.setItem('lm_refresh_token', res.refreshToken);
      localStorage.setItem('lm_user', JSON.stringify(res.user));
    }
    return {
      accessToken: token,
      refreshToken: res.refreshToken,
      user: res.user,
    };
  },

  async register(data: { name?: string; email: string; password?: string; referralCode?: string; phone?: string }): Promise<{ accessToken: string; refreshToken: string; user: User }> {
    const res = await request<{ accessToken?: string; access_token?: string; refreshToken: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const token = res.accessToken || res.access_token || '';
    if (token && typeof window !== 'undefined') {
      localStorage.setItem('lm_token', token);
      localStorage.setItem('lm_refresh_token', res.refreshToken);
      localStorage.setItem('lm_user', JSON.stringify(res.user));
    }
    return {
      accessToken: token,
      refreshToken: res.refreshToken,
      user: res.user,
    };
  },

  async linkGuestAccount(data: { email: string; password?: string; name?: string }): Promise<{ accessToken: string; refreshToken: string; user: User }> {
    const res = await request<{ accessToken?: string; access_token?: string; refreshToken: string; user: User }>('/auth/link-guest', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const token = res.accessToken || res.access_token || '';
    if (token && typeof window !== 'undefined') {
      localStorage.setItem('lm_token', token);
      localStorage.setItem('lm_refresh_token', res.refreshToken);
      localStorage.setItem('lm_user', JSON.stringify(res.user));
    }
    return {
      accessToken: token,
      refreshToken: res.refreshToken,
      user: res.user,
    };
  },

  async syncUser(data?: { name?: string; phone?: string; referralCode?: string }): Promise<{ user: User }> {
    const res = await request<{ user: User }>('/auth/sync', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    });
    if (res?.user && typeof window !== 'undefined') {
      localStorage.setItem('lm_user', JSON.stringify(res.user));
    }
    return res;
  },

  async getProfile(): Promise<User> {
    const res = await request<User>('/auth/profile');
    if (res && typeof window !== 'undefined') {
      localStorage.setItem('lm_user', JSON.stringify(res));
    }
    return res;
  },

  async updateProfile(data: { name?: string; phone?: string; dob?: string }): Promise<User> {
    const res = await request<User>('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (res && typeof window !== 'undefined') {
      localStorage.setItem('lm_user', JSON.stringify(res));
    }
    return res;
  },

  async signoutEverywhere(): Promise<{ message: string }> {
    return await request('/auth/signout-everywhere', { method: 'POST' });
  },

  async deleteAccount(): Promise<{ message: string }> {
    const res = await request<{ message: string }>('/auth/account', { method: 'DELETE' });
    if (typeof window !== 'undefined') {
      localStorage.removeItem('lm_token');
      localStorage.removeItem('lm_refresh_token');
      localStorage.removeItem('lm_user');
    }
    return res;
  },

  async logout() {
    try {
      await request('/auth/logout', { method: 'POST' });
    } catch {
      // Best-effort logout
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('lm_token');
        localStorage.removeItem('lm_refresh_token');
        localStorage.removeItem('lm_user');
      }
    }
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

  async createRazorpayOrder(amount: number, orderId: string): Promise<any> {
    return await request<any>('/payments/razorpay/order', {
      method: 'POST',
      body: JSON.stringify({ amount, orderId }),
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
