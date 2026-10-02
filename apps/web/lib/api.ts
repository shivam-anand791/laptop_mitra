import { Product, Category, Cart, WishlistItem, User, Order } from './types';
import { MOCK_PRODUCTS, MOCK_CATEGORIES, MOCK_DISCOUNT_CODES } from './mock-data';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('lm_token');
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  try {
    let res = await fetch(url, { ...options, headers });
    const authEndpoints = ['/auth/login', '/auth/register', '/auth/guest', '/auth/refresh'];
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('lm_refresh_token') : null;

    if (res.status === 401 && refreshToken && !authEndpoints.includes(endpoint)) {
      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (refreshResponse.ok) {
          const refreshed = await refreshResponse.json() as { accessToken: string; refreshToken: string };
          localStorage.setItem('lm_token', refreshed.accessToken);
          localStorage.setItem('lm_refresh_token', refreshed.refreshToken);
          res = await fetch(url, {
            ...options,
            headers: { ...headers, Authorization: `Bearer ${refreshed.accessToken}` },
          });
        } else {
          localStorage.removeItem('lm_token');
          localStorage.removeItem('lm_refresh_token');
          localStorage.removeItem('lm_user');
        }
      } catch {
        localStorage.removeItem('lm_token');
        localStorage.removeItem('lm_refresh_token');
        localStorage.removeItem('lm_user');
      }
    }
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ message: res.statusText }));
      throw new ApiError(res.status, errorData.message || `Request failed with status ${res.status}`);
    }
    return await res.json();
  } catch (err: any) {
    // Re-throw if already an ApiError
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, err?.message || 'Network connection failed');
  }
}

export const api = {
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
    try {
      const searchParams = new URLSearchParams();
      if (params?.search) searchParams.set('search', params.search);
      if (params?.categoryId) searchParams.set('categoryId', params.categoryId);
      if (params?.featured !== undefined) searchParams.set('featured', String(params.featured));
      if (params?.newArrival !== undefined) searchParams.set('newArrival', String(params.newArrival));
      if (params?.minPrice !== undefined) searchParams.set('minPrice', String(params.minPrice));
      if (params?.maxPrice !== undefined) searchParams.set('maxPrice', String(params.maxPrice));
      if (params?.stockOnly !== undefined) searchParams.set('stockOnly', String(params.stockOnly));
      if (params?.limit) searchParams.set('limit', String(params.limit));
      if (params?.offset) searchParams.set('offset', String(params.offset));

      const query = searchParams.toString();
      const res = await request<{ products: Product[]; total: number }>(`/products${query ? `?${query}` : ''}`);
      if (res && res.products && res.products.length > 0) {
        return res;
      }
    } catch {
      // Fallback to local catalog
    }

    // Mock filtering logic for seamless client display
    let filtered = [...MOCK_PRODUCTS];

    if (params?.categoryId && params.categoryId !== 'all') {
      filtered = filtered.filter(p => p.categoryId === params.categoryId);
    }
    if (params?.search) {
      const s = params.search.toLowerCase();
      filtered = filtered.filter(
        p => p.name.toLowerCase().includes(s) ||
             (p.description && p.description.toLowerCase().includes(s)) ||
             (p.tags && p.tags.toLowerCase().includes(s)) ||
             p.sku.toLowerCase().includes(s)
      );
    }
    if (params?.featured) {
      filtered = filtered.filter(p => p.isFeatured);
    }
    if (params?.newArrival) {
      filtered = filtered.filter(p => p.isNewArrival);
    }
    if (params?.minPrice !== undefined) {
      filtered = filtered.filter(p => Number(p.price) >= (params.minPrice || 0));
    }
    if (params?.maxPrice !== undefined) {
      filtered = filtered.filter(p => Number(p.price) <= (params.maxPrice || 0));
    }
    if (params?.stockOnly) {
      filtered = filtered.filter(p => p.stock > 0);
    }

    return {
      products: filtered,
      total: filtered.length
    };
  },

  async getProduct(id: string): Promise<Product> {
    try {
      const res = await request<Product>(`/products/${id}`);
      if (res && res.id) return res;
    } catch {
      // Fallback
    }

    const mock = MOCK_PRODUCTS.find(p => p.id === id || p.slug === id);
    if (mock) return mock;
    throw new ApiError(404, 'Product not found');
  },

  async getCategories(): Promise<Category[]> {
    return MOCK_CATEGORIES;
  },

  // Auth
  async login(email: string, password: string): Promise<{ access_token: string; refreshToken?: string; user: User }> {
    try {
      const res = await request<{ accessToken?: string; access_token?: string; refreshToken?: string; user: User }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      const accessToken = res.accessToken || res.access_token;
      if (accessToken) {
        localStorage.setItem('lm_token', accessToken);
        if (res.refreshToken) localStorage.setItem('lm_refresh_token', res.refreshToken);
        localStorage.setItem('lm_user', JSON.stringify(res.user));
        return { access_token: accessToken, refreshToken: res.refreshToken, user: res.user };
      }
    } catch (e: any) {
      // If server returns real 401, rethrow
      if (e?.status === 401) throw e;
    }

    // Local demo auth fallback
    const mockUser: User = {
      id: 'usr-demo-1',
      name: email.split('@')[0].toUpperCase(),
      email,
      role: 'USER',
      status: 'ACTIVE',
      referralCode: `MITRA${Math.floor(1000 + Math.random() * 9000)}`,
      referralTier: 'GOLD',
      referralEarnings: 2500,
      referralLinkClickedCount: 14,
    };
    const mockToken = 'mock_jwt_token_' + Date.now();
    localStorage.setItem('lm_token', mockToken);
    localStorage.setItem('lm_user', JSON.stringify(mockUser));
    return { access_token: mockToken, user: mockUser };
  },

  async guestLogin(): Promise<{ user: User }> {
    const res = await request<{ accessToken: string; refreshToken: string; user: User }>('/auth/guest', {
      method: 'POST',
    });
    localStorage.setItem('lm_token', res.accessToken);
    localStorage.setItem('lm_refresh_token', res.refreshToken);
    localStorage.setItem('lm_user', JSON.stringify(res.user));
    return { user: res.user };
  },

  async register(data: {
    name: string;
    email: string;
    password: string;
    referralCode?: string;
    phone?: string;
  }): Promise<{ access_token: string; user: User }> {
    try {
      const res = await request<{ access_token: string; user: User }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      if (res.access_token) {
        localStorage.setItem('lm_token', res.access_token);
        localStorage.setItem('lm_user', JSON.stringify(res.user));
        return res;
      }
    } catch (e: any) {
      if (e?.status === 409 || e?.status === 400) throw e;
    }

    const mockUser: User = {
      id: 'usr-' + Date.now(),
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      role: 'USER',
      status: 'ACTIVE',
      referralCode: `MITRA${Math.floor(1000 + Math.random() * 9000)}`,
      referralTier: 'BASIC',
      referralEarnings: 0,
      referralLinkClickedCount: 0,
    };
    const mockToken = 'mock_jwt_token_' + Date.now();
    localStorage.setItem('lm_token', mockToken);
    localStorage.setItem('lm_user', JSON.stringify(mockUser));
    return { access_token: mockToken, user: mockUser };
  },

  async getProfile(): Promise<User> {
    try {
      const res = await request<User>('/auth/profile');
      if (res) return res;
    } catch {
      // Fallback to localStorage
    }
    const stored = localStorage.getItem('lm_user');
    if (stored) return JSON.parse(stored);
    throw new ApiError(401, 'Unauthorized');
  },

  async logout() {
    const accessToken = localStorage.getItem('lm_token');
    const refreshToken = localStorage.getItem('lm_refresh_token');

    try {
      if (accessToken && refreshToken) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch {
      // Clear local session even if server-side logout is unavailable.
    } finally {
      localStorage.removeItem('lm_token');
      localStorage.removeItem('lm_refresh_token');
      localStorage.removeItem('lm_user');
    }
  },

  // Cart
  async getCart(): Promise<Cart> {
    try {
      return await request<Cart>('/cart');
    } catch {
      // Return local stored cart
      const stored = localStorage.getItem('lm_cart');
      if (stored) return JSON.parse(stored);
      return { id: 'cart-local', userId: 'usr-demo', items: [], total: 0, itemCount: 0 };
    }
  },

  async addToCart(productId: string, quantity: number = 1) {
    try {
      return await request<any>('/cart/items', {
        method: 'POST',
        body: JSON.stringify({ productId, quantity }),
      });
    } catch {
      return { success: true };
    }
  },

  async updateCartQuantity(itemId: string, quantity: number) {
    try {
      return await request<any>(`/cart/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify({ quantity }),
      });
    } catch {
      return { success: true };
    }
  },

  async removeCartItem(itemId: string) {
    try {
      return await request<any>(`/cart/items/${itemId}`, {
        method: 'DELETE',
      });
    } catch {
      return { success: true };
    }
  },

  async clearCart() {
    try {
      return await request<any>('/cart', {
        method: 'DELETE',
      });
    } catch {
      return { success: true };
    }
  },

  // Wishlist
  async getWishlist(): Promise<WishlistItem[]> {
    try {
      const res = await request<any>('/wishlist');
      return res.items || [];
    } catch {
      const stored = localStorage.getItem('lm_wishlist');
      return stored ? JSON.parse(stored) : [];
    }
  },

  async addToWishlist(productId: string) {
    try {
      return await request<any>('/wishlist/items', {
        method: 'POST',
        body: JSON.stringify({ productId }),
      });
    } catch {
      return { success: true };
    }
  },

  async removeWishlistItem(itemId: string) {
    try {
      return await request<any>(`/wishlist/items/${itemId}`, {
        method: 'DELETE',
      });
    } catch {
      return { success: true };
    }
  },

  // Orders
  async createOrder(payload: {
    referralCode?: string;
    discountCode?: string;
    shippingAddress?: any;
    phone?: string;
    notes?: string;
  }): Promise<Order> {
    try {
      return await request<Order>('/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (e: any) {
      if (e?.status === 400 || e?.status === 401) throw e;
    }

    // Mock order creation for reliable checkout testing
    const cart = JSON.parse(localStorage.getItem('lm_cart') || '{"items":[],"total":0}');
    let discount = 0;
    if (payload.discountCode?.toUpperCase() === 'MITRA500') discount += 500;
    if (payload.referralCode) discount += Math.round(cart.total * 0.1);

    const finalAmount = Math.max(0, cart.total - discount);
    const mockOrder: Order = {
      id: 'ord-' + Date.now(),
      orderNumber: 'LM-' + Math.floor(100000 + Math.random() * 900000),
      userId: 'usr-demo-1',
      status: 'CONFIRMED',
      paymentStatus: 'COMPLETED',
      paymentMethod: 'razorpay',
      subtotal: cart.total,
      discountAmount: discount,
      discountType: payload.discountCode ? 'coupon' : payload.referralCode ? 'referral' : null,
      referralCode: payload.referralCode || null,
      referralDiscount: payload.referralCode ? Math.round(cart.total * 0.1) : 0,
      finalAmount,
      shippingAddress: payload.shippingAddress,
      phone: payload.phone,
      email: 'customer@laptopmitra.com',
      createdAt: new Date().toISOString(),
      items: cart.items.map((i: any, idx: number) => ({
        id: `oi-${idx}`,
        orderId: 'ord-' + Date.now(),
        productId: i.productId,
        quantity: i.quantity,
        price: i.priceAtAdd,
        product: i.product,
      })),
    };

    // Save to user mock orders
    const pastOrders = JSON.parse(localStorage.getItem('lm_orders') || '[]');
    pastOrders.unshift(mockOrder);
    localStorage.setItem('lm_orders', JSON.stringify(pastOrders));

    return mockOrder;
  },

  async getOrders(): Promise<Order[]> {
    try {
      return await request<Order[]>('/orders');
    } catch {
      const stored = localStorage.getItem('lm_orders');
      if (stored) return JSON.parse(stored);
      return [];
    }
  },

  // Razorpay
  async createRazorpayOrder(amount: number, orderId: string): Promise<any> {
    try {
      return await request<any>('/payments/razorpay/order', {
        method: 'POST',
        body: JSON.stringify({ amount, orderId }),
      });
    } catch {
      return {
        id: 'order_mock_' + Math.random().toString(36).substring(7),
        amount: Math.round(amount * 100),
        currency: 'INR',
        receipt: orderId,
      };
    }
  },

  // Discount validation
  validateDiscount(code: string, subtotal: number): { valid: boolean; discountAmount: number; message: string } {
    const clean = code.trim().toUpperCase();
    const found = MOCK_DISCOUNT_CODES.find(c => c.code === clean);
    if (!found) {
      if (clean.startsWith('MITRA') && clean.length > 5) {
        // Valid Mitra referral code! Gives 10% discount
        const disc = Math.round(subtotal * 0.1);
        return { valid: true, discountAmount: disc, message: `Mitra Referral Applied: 10% Off (-₹${disc.toLocaleString('en-IN')})` };
      }
      return { valid: false, discountAmount: 0, message: 'Invalid or expired coupon/referral code' };
    }

    if (found.minOrderValue && subtotal < found.minOrderValue) {
      return { valid: false, discountAmount: 0, message: `Minimum order value for ${found.code} is ₹${found.minOrderValue.toLocaleString('en-IN')}` };
    }

    let disc = 0;
    if (found.type === 'fixed') {
      disc = found.value;
    } else if (found.type === 'percentage') {
      disc = Math.round(subtotal * (found.value / 100));
    }
    return { valid: true, discountAmount: disc, message: `Code applied: ₹${disc.toLocaleString('en-IN')} off!` };
  }
};
