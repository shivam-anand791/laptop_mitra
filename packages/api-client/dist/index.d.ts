import type { Product, Cart, CartItem, WishlistItem, User, Order, OrderListResponse, Address, Category, PaymentRecord, SupportTicket, SupportTicketMessage, NotificationPreferences } from '../../types/dist/index';
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
    getHealth(): Promise<{
        status: string;
        timestamp: string;
        version: string;
    }>;
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
    guestLogin(): Promise<{
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
    syncUser(data?: {
        name?: string;
        phone?: string;
        referralCode?: string;
    }): Promise<{
        user: User;
    }>;
    getProfile(): Promise<User>;
    updateProfile(data: Partial<User>): Promise<User>;
    logout(refreshToken: string): Promise<{
        message: string;
    }>;
    signoutEverywhere(): Promise<{
        message: string;
    }>;
    deleteAccount(): Promise<{
        message: string;
    }>;
    linkGuestAccount(data: {
        email: string;
        password?: string;
        name?: string;
    }): Promise<{
        accessToken: string;
        refreshToken: string;
        user: User;
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
    getOrders(params?: {
        status?: string;
        page?: number;
        limit?: number;
    }): Promise<Order[] | OrderListResponse>;
    getOrder(id: string): Promise<Order>;
    cancelOrder(id: string): Promise<{
        message: string;
    }>;
    requestOrderReturn(id: string, reason: string): Promise<{
        message: string;
        returnStatus: string;
    }>;
    reorder(id: string): Promise<{
        message: string;
        itemsAdded: number;
    }>;
    getOrderInvoice(id: string): Promise<{
        order: Order;
        invoiceNumber: string;
        issuedAt: string;
    }>;
    trackOrder(id: string): Promise<{
        status: string;
        carrier?: string;
        trackingNumber?: string;
        timeline: Array<{
            status: string;
            time: string;
            note: string;
        }>;
    }>;
    getPaymentHistory(): Promise<PaymentRecord[]>;
    createRazorpayOrder(amount: number, orderId: string): Promise<any>;
    getTickets(): Promise<SupportTicket[]>;
    createTicket(data: {
        subject: string;
        orderId?: string;
        message: string;
        category?: string;
    }): Promise<SupportTicket>;
    addTicketMessage(ticketId: string, message: string): Promise<SupportTicketMessage>;
    getWarrantyStatus(orderItemId: string): Promise<{
        warrantyStatus: string;
        validUntil: string;
        terms: string;
    }>;
    getReferralStats(): Promise<{
        referralCode: string;
        referralTier: string;
        referralEarnings: number;
        referredUsersCount: number;
        referralLinkClickedCount: number;
        payoutHistory: Array<{
            id: string;
            amount: number;
            date: string;
            status: string;
        }>;
    }>;
    getNotificationPreferences(): Promise<NotificationPreferences>;
    updateNotificationPreferences(preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences>;
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
    validateDiscount(code: string, cartTotal: number): Promise<{
        valid: boolean;
        discountType: 'percentage' | 'fixed' | 'free_shipping' | null;
        discountValue: number;
        discountAmount: number;
        message: string;
    }>;
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