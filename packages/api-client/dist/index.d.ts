import type { Product, Cart, CartItem, WishlistItem, User, Order } from '../../types/dist/index';
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
        access_token: string;
        user: User;
    }>;
    register(data: {
        name: string;
        email: string;
        password: string;
        referralCode?: string;
    }): Promise<{
        access_token: string;
        user: User;
    }>;
    getProfile(): Promise<User>;
    getCart(): Promise<Cart>;
    addToCart(productId: string, quantity?: number): Promise<{
        cartItem: CartItem;
        message: string;
    }>;
    removeCartItem(itemId: string): Promise<{
        message: string;
    }>;
    getWishlist(): Promise<WishlistItem[]>;
    addToWishlist(productId: string): Promise<{
        wishlistItem: WishlistItem;
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
    forgotPassword(email: string): Promise<{
        message: string;
    }>;
    resetPassword(token: string, newPassword: string): Promise<{
        message: string;
    }>;
    refreshAccessToken(refreshToken: string): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
}
//# sourceMappingURL=index.d.ts.map