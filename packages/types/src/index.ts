export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parentId?: string | null;
  parent?: Category | null;
  subcategories?: Category[];
  _count?: { products: number };
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  altText?: string | null;
  isPrimary: boolean;
  sortOrder?: number;
  createdAt?: Date | string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  shortDescription?: string | null;
  price: number;
  compareAtPrice?: number | null;
  sku: string;
  barcode?: string | null;
  stock: number;
  allowBackorder?: boolean;
  status: string;
  metadata?: Record<string, any> | null;
  isFeatured: boolean;
  isNewArrival: boolean;
  tags?: string | null;
  categoryId?: string | null;
  category?: Category | null;
  images?: ProductImage[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface ProductListResponse {
  products: Product[];
  total: number;
}

export interface ProductFilterParams {
  categoryId?: string;
  search?: string;
  tags?: string[];
  featured?: boolean;
  newArrival?: boolean;
  minPrice?: number;
  maxPrice?: number;
  stockOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface CartItem {
  id: string;
  cartId?: string;
  productId: string;
  quantity: number;
  priceAtAdd: number;
  product?: Product;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  itemCount: number;
}

export interface WishlistItem {
  id: string;
  wishlistId?: string;
  productId: string;
  product?: Product;
}

export interface User {
  id: string;
  name?: string | null;
  email: string | null;
  role: string;
  status: string;
  isGuest?: boolean;
  imageUrl?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  dob?: string | null;
  referralCode: string;
  referralEarnings?: number;
  referralTier?: string;
  referralLinkClickedCount?: number;
  createdAt?: Date | string;
}

export interface Address {
  id: string;
  userId: string;
  fullName?: string | null;
  phone?: string | null;
  address: string;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  landmark?: string | null;
  label?: 'Home' | 'Work' | 'Other' | string | null;
  gstin?: string | null;
  isDefault: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface CreateAddressDto {
  fullName?: string;
  phone?: string;
  address: string;
  city?: string;
  state?: string;
  pincode?: string;
  landmark?: string;
  label?: string;
  gstin?: string;
  isDefault?: boolean;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: number;
  product?: Product;
  warrantyStatus?: string | null;
  warrantyValidUntil?: string | null;
}

export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'SHIPPING',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
] as const;
export type OrderStatus = typeof ORDER_STATUSES[number];

export const USER_STATUSES = ['ACTIVE', 'SUSPENDED', 'DELETED'] as const;
export type UserStatus = typeof USER_STATUSES[number];

export const USER_ROLES = ['CUSTOMER', 'ADMIN', 'MODERATOR', 'GUEST'] as const;
export type UserRole = typeof USER_ROLES[number];

export const ORDER_TRANSITION_MAP: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPING', 'CANCELLED'],
  SHIPPING: ['DELIVERED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminAnalyticsResponse {
  range: '7d' | '30d' | '90d';
  revenueByDay: Array<{ date: string; amount: number }>;
  ordersByDay: Array<{ date: string; count: number }>;
  ordersByStatus: Array<{ status: string; count: number }>;
  topProducts: Array<{ id: string; name: string; units: number; revenue: number }>;
  newUsersByDay: Array<{ date: string; count: number }>;
  summary: {
    totalRevenue: number;
    totalOrders: number;
    totalNewUsers: number;
  };
  revenue?: {
    daily: Array<{ date: string; amount: number }>;
    total: number;
    growth: number;
  };
  orders?: {
    total: number;
    pending: number;
    completed: number;
    cancelled: number;
    conversionRate: number;
  };
  users?: {
    total: number;
    active: number;
    newThisMonth: number;
    growth: number;
  };
  products?: {
    total: number;
    lowStock: number;
    bestSellers: Array<{ name: string; sales: number }>;
  };
}

export interface AdminDashboardStats {
  totalUsers: number;
  totalProducts: number;
  totalOrders: number;
  pendingOrders: number;
  deliveredOrders: number;
  revenueCompleted: number;
  revenuePending: number;
  lowStockProducts: number;
  ordersToday: number;
  revenue: {
    completed: number;
    pending: number;
  };
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  status: OrderStatus | string;
  paymentStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | string;
  paymentMethod?: string | null;
  paymentId?: string | null;
  subtotal: number;
  discountAmount: number;
  discountType?: string | null;
  referralCode?: string | null;
  referralDiscount?: number;
  finalAmount: number;
  shippingAddress?: Record<string, any> | null;
  phone?: string | null;
  email: string;
  notes?: string | null;
  trackingNumber?: string | null;
  carrier?: string | null;
  returnStatus?: 'NONE' | 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | string;
  returnReason?: string | null;
  items?: OrderItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface OrderListResponse {
  orders: Order[];
  total: number;
}

export interface CreateOrderPayload {
  referralCode?: string;
  discountCode?: string;
  shippingAddress?: any;
  phone?: string;
  notes?: string;
  email?: string;
  paymentMethod?: 'razorpay' | 'cod' | string;
  idempotencyKey?: string;
}

export interface SupportTicketMessage {
  id: string;
  ticketId: string;
  sender: 'USER' | 'SUPPORT' | 'SYSTEM';
  message: string;
  attachments?: string[];
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  orderId?: string | null;
  orderNumber?: string | null;
  subject: string;
  category: 'WARRANTY' | 'ORDER' | 'PAYMENT' | 'GENERAL' | string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  messages: SupportTicketMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface NotificationPreferences {
  emailOrderUpdates: boolean;
  emailPromotions: boolean;
  smsOrderUpdates: boolean;
  smsDeliveryTracking: boolean;
  pushNewArrivals: boolean;
  pushPriceDrops: boolean;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  orderNumber?: string;
  razorpayPaymentId?: string | null;
  razorpayOrderId?: string | null;
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  refundStatus?: 'NONE' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  refundAmount?: number;
  createdAt: string;
}

export interface DiscountCode {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  type: 'percentage' | 'fixed' | 'free_shipping';
  value: number;
  minOrderValue?: number | null;
  maxUses?: number | null;
  uses: number;
  maxUsesPerUser?: number | null;
  isActive: boolean;
  validFrom?: Date | string | null;
  validUntil?: Date | string | null;
}

export interface AdminSettings {
  storeName: string;
  supportEmail: string;
  contactPhone: string;
  storeAddress: string;
  lowStockThreshold: number;
  freeShippingThreshold: number;
  standardDeliveryDays: string;
  expressDeliveryDays: string;
}

export type UpdateAdminSettingsDto = Partial<AdminSettings>;


