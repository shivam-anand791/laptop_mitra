import type { Product, Cart, CartItem, WishlistItem, User, Order } from '../../types/dist/index';

export * from '../../types/dist/index';

export interface ApiClientConfig {
  baseUrl: string;
  getToken?: (() => string | null | Promise<string | null>) | undefined;
}

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

    const res = await fetch(`${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errorData = (await res.json().catch(() => ({ message: res.statusText }))) as { message?: string };
      throw new Error(errorData.message || `API error ${res.status}`);
    }

    return (await res.json()) as T;
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
  async login(email: string, pass: string): Promise<{ access_token: string; user: User }> {
    return this.request<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: pass }),
    });
  }

  async register(data: { name: string; email: string; password: string; referralCode?: string }): Promise<{ access_token: string; user: User }> {
    return this.request<{ access_token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getProfile(): Promise<User> {
    return this.request<User>('/auth/profile');
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

  async getOrders(): Promise<Order[]> {
    return this.request<Order[]>('/orders');
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

  // Auth — Token Refresh
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    return this.request<{ accessToken: string; refreshToken: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }
}
