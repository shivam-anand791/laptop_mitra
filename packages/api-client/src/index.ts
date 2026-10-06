import type {
  Product,
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
  SupportTicketMessage,
  NotificationPreferences,
} from '../../types/dist/index';

export * from '../../types/dist/index';

export interface ApiClientConfig {
  baseUrl: string;
  getToken?: (() => string | null | Promise<string | null>) | undefined;
}

declare const process: any;

export class LaptopMitraApiClient {
  private baseUrl: string;
  private getToken?: (() => string | null | Promise<string | null>) | undefined;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.getToken = config.getToken;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken ? await this.getToken() : null;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options.headers as Record<string, string>) || {}),
    };

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

  // Auth
  async login(email: string, pass: string): Promise<{ accessToken: string; refreshToken: string; user: User }> {
    return this.request<{ accessToken: string; refreshToken: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: pass }),
    });
  }

  async guestLogin(): Promise<{ accessToken: string; refreshToken: string; user: User }> {
    return this.request<{ accessToken: string; refreshToken: string; user: User }>('/auth/guest', {
      method: 'POST',
    });
  }

  async register(data: { name: string; email: string; password: string; phone?: string; referralCode?: string }): Promise<{ accessToken: string; refreshToken: string; user: User }> {
    return this.request<{ accessToken: string; refreshToken: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    return this.request<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

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

  async logout(refreshToken: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
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

  async linkGuestAccount(data: { email: string; password?: string; name?: string }): Promise<{ accessToken: string; refreshToken: string; user: User }> {
    return this.request<{ accessToken: string; refreshToken: string; user: User }>('/auth/link-guest', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Cart
  async getCart(): Promise<Cart> {
    return this.request<Cart>('/cart');
  }

  async addToCart(productId: string, quantity = 1): Promise<{ cartItem: CartItem; message: string }> {
    return this.request<{ cartItem: CartItem; message: string }>('/cart/items', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity }),
    });
  }

  async removeCartItem(itemId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/cart/items/${itemId}`, { method: 'DELETE' });
  }

  async updateCartItemQuantity(itemId: string, quantity: number): Promise<{ cartItem: CartItem; message: string }> {
    return this.request<{ cartItem: CartItem; message: string }>(`/cart/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    });
  }

  async clearCart(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/cart', { method: 'DELETE' });
  }

  // Wishlist
  async getWishlist(): Promise<WishlistItem[]> {
    return this.request<WishlistItem[]>('/wishlist');
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
  }): Promise<Order> {
    return this.request<Order>('/orders', {
      method: 'POST',
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

  async getOrderInvoice(id: string): Promise<{ order: Order; invoiceNumber: string; issuedAt: string }> {
    return this.request<{ order: Order; invoiceNumber: string; issuedAt: string }>(`/orders/${id}/invoice`);
  }

  async trackOrder(id: string): Promise<{ status: string; carrier?: string; trackingNumber?: string; timeline: Array<{ status: string; time: string; note: string }> }> {
    return this.request<{ status: string; carrier?: string; trackingNumber?: string; timeline: Array<{ status: string; time: string; note: string }> }>(`/orders/${id}/track`);
  }

  // Payments
  async getPaymentHistory(): Promise<PaymentRecord[]> {
    return this.request<PaymentRecord[]>('/payments/history');
  }

  async createRazorpayOrder(amount: number, orderId: string): Promise<any> {
    return this.request<any>('/payments/razorpay/order', {
      method: 'POST',
      body: JSON.stringify({ amount, orderId }),
    });
  }

  // Support & Warranty
  async getTickets(): Promise<SupportTicket[]> {
    return this.request<SupportTicket[]>('/support/tickets');
  }

  async createTicket(data: { subject: string; orderId?: string; message: string; category?: string }): Promise<SupportTicket> {
    return this.request<SupportTicket>('/support/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async addTicketMessage(ticketId: string, message: string): Promise<SupportTicketMessage> {
    return this.request<SupportTicketMessage>(`/support/tickets/${ticketId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async getWarrantyStatus(orderItemId: string): Promise<{ warrantyStatus: string; validUntil: string; terms: string }> {
    return this.request<{ warrantyStatus: string; validUntil: string; terms: string }>(`/support/warranty/${orderItemId}`);
  }

  // Referral / Affiliate
  async getReferralStats(): Promise<{
    referralCode: string;
    referralTier: string;
    referralEarnings: number;
    referredUsersCount: number;
    referralLinkClickedCount: number;
    payoutHistory: Array<{ id: string; amount: number; date: string; status: string }>;
  }> {
    return this.request<{
      referralCode: string;
      referralTier: string;
      referralEarnings: number;
      referredUsersCount: number;
      referralLinkClickedCount: number;
      payoutHistory: Array<{ id: string; amount: number; date: string; status: string }>;
    }>('/discount/referral/stats');
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

  // Auth — Password Reset
  async forgotPassword(email: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  }

  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

