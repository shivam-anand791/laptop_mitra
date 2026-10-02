"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LaptopMitraApiClient = void 0;
__exportStar(require("../../types/dist/index"), exports);
class LaptopMitraApiClient {
    baseUrl;
    getToken;
    constructor(config) {
        this.baseUrl = config.baseUrl.replace(/\/$/, '');
        this.getToken = config.getToken;
    }
    async request(endpoint, options = {}) {
        const token = this.getToken ? await this.getToken() : null;
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        };
        const res = await fetch(`${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`, {
            ...options,
            headers,
        });
        if (!res.ok) {
            const errorData = (await res.json().catch(() => ({ message: res.statusText })));
            throw new Error(errorData.message || `API error ${res.status}`);
        }
        return (await res.json());
    }
    // Products
    async getProducts(params) {
        const query = params ? `?${new URLSearchParams(params).toString()}` : '';
        return this.request(`/products${query}`);
    }
    async getProduct(id) {
        return this.request(`/products/${id}`);
    }
    // Auth
    async login(email, pass) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password: pass }),
        });
    }
    async guestLogin() {
        return this.request('/auth/guest', {
            method: 'POST',
        });
    }
    async register(data) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
    async refreshAccessToken(refreshToken) {
        return this.request('/auth/refresh', {
            method: 'POST',
            body: JSON.stringify({ refreshToken }),
        });
    }
    async getProfile() {
        return this.request('/auth/profile');
    }
    async updateProfile(data) {
        return this.request('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }
    async logout(refreshToken) {
        return this.request('/auth/logout', {
            method: 'POST',
            body: JSON.stringify({ refreshToken }),
        });
    }
    // Cart
    async getCart() {
        return this.request('/cart');
    }
    async addToCart(productId, quantity = 1) {
        return this.request('/cart/items', {
            method: 'POST',
            body: JSON.stringify({ productId, quantity }),
        });
    }
    async removeCartItem(itemId) {
        return this.request(`/cart/items/${itemId}`, { method: 'DELETE' });
    }
    async updateCartItemQuantity(itemId, quantity) {
        return this.request(`/cart/items/${itemId}`, {
            method: 'PUT',
            body: JSON.stringify({ quantity }),
        });
    }
    async clearCart() {
        return this.request('/cart', { method: 'DELETE' });
    }
    // Wishlist
    async getWishlist() {
        return this.request('/wishlist');
    }
    async addToWishlist(productId) {
        return this.request('/wishlist/items', {
            method: 'POST',
            body: JSON.stringify({ productId }),
        });
    }
    async removeWishlistItem(itemId) {
        return this.request(`/wishlist/items/${itemId}`, { method: 'DELETE' });
    }
    async clearWishlist() {
        return this.request('/wishlist', { method: 'DELETE' });
    }
    // Orders
    async createOrder(payload) {
        return this.request('/orders', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    }
    async getOrders() {
        return this.request('/orders');
    }
    async validateDiscount(code, cartTotal) {
        return this.request('/discount/validate', {
            method: 'POST',
            body: JSON.stringify({ code, cartTotal }),
        });
    }
    async getOrder(id) {
        return this.request(`/orders/${id}`);
    }
    async cancelOrder(id) {
        return this.request(`/orders/${id}/cancel`, { method: 'PATCH' });
    }
    // Addresses
    async getAddresses() {
        return this.request('/addresses');
    }
    async createAddress(data) {
        return this.request('/addresses', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
    async updateAddress(id, data) {
        return this.request(`/addresses/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }
    async deleteAddress(id) {
        return this.request(`/addresses/${id}`, {
            method: 'DELETE',
        });
    }
    // Categories
    async getCategories(params) {
        const query = params?.parentId ? `?parentId=${encodeURIComponent(params.parentId)}` : '';
        return this.request(`/categories${query}`);
    }
    async getCategory(id) {
        return this.request(`/categories/${id}`);
    }
    async getCategoryBySlug(slug) {
        return this.request(`/categories/slug/${slug}`);
    }
    // Auth — Password Reset (not yet implemented on backend — stub)
    async forgotPassword(email) {
        return this.request('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email }),
        });
    }
    async resetPassword(token, newPassword) {
        return this.request('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token, newPassword }),
        });
    }
    // Password Change (authenticated)
    async changePassword(data) {
        return this.request('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }
}
exports.LaptopMitraApiClient = LaptopMitraApiClient;
//# sourceMappingURL=index.js.map