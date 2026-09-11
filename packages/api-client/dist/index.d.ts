import type { Product, Cart, CartItem, WishlistItem, User, Order, Address, Category } from '../../types/dist/index';
export * from '../../types/dist/index';
export interface ApiClientConfig {
    baseUrl: string;
    getToken?: (() => string | null | Promise<string | null>) | undefined;
}
export declare class LaptopMitraApiClient {
    private baseUrl;
    private getToken?;
    constructor(config: ApiClientConfig);
    private request;
    getProducts(params?: Record<string, any>): Promise<{
        products: Product[];
        total: number;
    }>;
    getProduct(id: string): Promise<Product>;
    login(email: string, pass: string): Promise<{
        accessToken: string;
        refreshToken: string;
        user: User;
    }>;
    register(data: {
        name: string;
        email: string;
        password: string;
        phone?: string;
        referralCode?: string;
    }): Promise<{
        accessToken: string;
        refreshToken: string;
        user: User;
    }>;
    refreshAccessToken(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    getProfile(): Promise<User>;
    updateProfile(data: Partial<User>): Promise<User>;
    logout(refreshToken: string): Promise<{
        message: string;
    }>;
    getCart(): Promise<Cart>;
    addToCart(productId: string, quantity?: number): Promise<{
        cartItem: CartItem;
        message: string;
    }>;
    removeCartItem(itemId: string): Promise<{
        message: string;
    }>;
    updateCartItemQuantity(itemId: string, quantity: number): Promise<{
        cartItem: CartItem;
        message: string;
    }>;
    clearCart(): Promise<{
        message: string;
    }>;
    getWishlist(): Promise<WishlistItem[]>;
    addToWishlist(productId: string): Promise<{
        wishlistItem: WishlistItem;
        message: string;
    }>;
    removeWishlistItem(itemId: string): Promise<{
        message: string;
    }>;
    clearWishlist(): Promise<{
        message: string;
    }>;
    createOrder(payload: {
        referralCode?: string;
        discountCode?: string;
        shippingAddress?: any;
        phone?: string;
        notes?: string;
    }): Promise<Order>;
    getOrders(): Promise<Order[]>;
    validateDiscount(code: string, cartTotal: number): Promise<{
        valid: boolean;
        discountType: 'percentage' | 'fixed' | 'free_shipping' | null;
        discountValue: number;
        discountAmount: number;
        message: string;
    }>;
    getOrder(id: string): Promise<Order>;
    cancelOrder(id: string): Promise<{
        message: string;
    }>;
    getAddresses(): Promise<Address[]>;
    createAddress(data: Partial<Address>): Promise<Address>;
    updateAddress(id: string, data: Partial<Address>): Promise<Address>;
    deleteAddress(id: string): Promise<{
        message: string;
    }>;
    getCategories(params?: {
        parentId?: string;
    }): Promise<Category[]>;
    getCategory(id: string): Promise<Category>;
    getCategoryBySlug(slug: string): Promise<Category>;
    forgotPassword(email: string): Promise<{
        message: string;
    }>;
    resetPassword(token: string, newPassword: string): Promise<{
        message: string;
    }>;
    changePassword(data: {
        currentPassword: string;
        newPassword: string;
    }): Promise<{
        message: string;
    }>;
}
//# sourceMappingURL=index.d.ts.map