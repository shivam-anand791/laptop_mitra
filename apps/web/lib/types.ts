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
  productId?: string;
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
  metadata?: {
    brand?: string;
    processor?: string;
    ram?: string;
    storage?: string;
    display?: string;
    graphics?: string;
    condition?: string;
    warranty?: string;
    batteryHealth?: string;
    os?: string;
    [key: string]: any;
  } | null;
  isFeatured: boolean;
  isNewArrival: boolean;
  leasePriceMonthly?: number | null;
  bulkSellPrice?: number | null;
  bulkLeasePrice?: number | null;
  tags?: string | null;
  categoryId?: string | null;
  category?: Category | null;
  images?: ProductImage[];
  dealEndsAt?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface ProductListResponse {
  products: Product[];
  total: number;
}

export interface ProductFilterFacets {
  brands: string[];
  processors: string[];
  ramOptions: string[];
  storageOptions: string[];
  grades: string[];
  categories: Array<{ id: string; name: string; slug: string; count: number }>;
  priceRange: { min: number; max: number };
  counts: {
    brands: Record<string, number>;
    processors: Record<string, number>;
    ram: Record<string, number>;
    storage: Record<string, number>;
    grades: Record<string, number>;
  };
  totalCount: number;
}


export interface CartItem {
  id: string;
  cartId?: string;
  productId: string;
  quantity: number;
  priceAtAdd: number;
  purchaseMode?: 'sell' | 'lease';
  configuration?: 'default' | 'ram-16gb' | string;
  hasWarranty?: boolean;
  warrantyPrice?: number;
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
  purchaseMode?: 'sell' | 'lease';
  configuration?: 'default' | 'ram-16gb' | string;
  hasWarranty?: boolean;
  warrantyPrice?: number;
  product?: Product;
  warrantyStatus?: string | null;
  warrantyValidUntil?: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED' | string;
  paymentStatus: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | string;
  paymentMethod?: string | null;
  paymentId?: string | null;
  subtotal: number;
  totalAmount?: number;
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


export interface NotificationPreferences {
  emailOrderUpdates: boolean;
  emailPromotions: boolean;
  emailPriceAlerts?: boolean;
  smsOrderUpdates: boolean;
  smsPromotions?: boolean;
  smsDeliveryTracking?: boolean;
  pushOrderUpdates?: boolean;
  pushPromotions?: boolean;
  pushPriceAlerts?: boolean;
  pushNewArrivals?: boolean;
  pushPriceDrops?: boolean;
}

export interface PaymentRecord {
  id: string;
  orderId?: string;
  orderNumber?: string;
  method?: string | null;
  transactionId?: string | null;
  razorpayPaymentId?: string | null;
  razorpayOrderId?: string | null;
  amount: number;
  currency?: string;
  status: 'PENDING' | 'COMPLETED' | 'PAID' | 'CAPTURED' | 'FAILED' | 'REFUNDED' | 'REFUND_PENDING' | string;
  refundStatus?: 'NONE' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | string;
  refundAmount?: number;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Admin Domain Types & Prisma String-Literal Unions
// ---------------------------------------------------------------------------

export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED';
export type UserRole = 'CUSTOMER' | 'ADMIN' | 'MODERATOR' | 'SUPPORT' | 'GUEST';
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';

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
  revenue?: {
    completed: number;
    pending: number;
  };
}

export interface AdminUser {
  id: string;
  name: string | null;
  email: string | null;
  role: UserRole | string;
  status: UserStatus | string;
  createdAt: string | Date;
  updatedAt: string | Date;
  referralCode?: string | null;
  referralEarnings?: string | number;
  referralTier?: string | null;
}

export interface AdminOrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: string | number;
  product?: AdminProduct | Product | null;
  createdAt?: string | Date;
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  userId: string;
  status: OrderStatus | string;
  paymentStatus: PaymentStatus | string;
  paymentMethod: string | null;
  paymentId: string | null;
  razorpayOrderId: string | null;
  inventoryStatus?: string;
  subtotal: string | number;
  discountAmount: string | number;
  discountType: string | null;
  finalAmount: string | number;
  shippingAddress?: Record<string, unknown> | ShippingAddressData | string | null;
  phone: string | null;
  email: string;
  notes: string | null;
  referralCode: string | null;
  referralDiscount: string | number;
  carrier?: string | null;
  trackingNumber?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;

  user?: {
    id: string;
    name: string | null;
    email: string | null;
    phone?: string | null;
    role?: string | null;
    status?: string | null;
  } | null;
  items?: AdminOrderItem[];
  deliveries?: DeliveryRecord[];
  payments?: PaymentTransactionRecord[];
}

export interface ShippingAddressData {
  fullName?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  landmark?: string;
}

export interface DeliveryRecord {
  id?: string;
  orderId?: string;
  status?: string;
  carrier?: string;
  trackingNumber?: string;
  shippedAt?: string | Date;
  deliveredAt?: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface PaymentTransactionRecord {
  id?: string;
  orderId?: string;
  amount?: string | number;
  status?: string;
  method?: string;
  transactionId?: string;
  createdAt?: string | Date;
}

export function parseShippingAddress(address: unknown): ShippingAddressData {
  if (!address) return {};
  if (typeof address === 'string') {
    try {
      return JSON.parse(address);
    } catch {
      return { address };
    }
  }
  if (typeof address === 'object') {
    return address as ShippingAddressData;
  }
  return {};
}

export interface AdminProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  shortDescription: string | null;
  price: string | number;
  compareAtPrice: string | number | null;
  sku: string;
  barcode: string | null;
  stock: number;
  allowBackorder?: boolean;
  status: ProductStatus | string;
  metadata?: Record<string, unknown> | null;
  isFeatured: boolean;
  isNewArrival: boolean;
  tags: string | null;
  categoryId: string | null;
  category?: Category | null;
  images?: ProductImage[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface CreateProductDto {
  name: string;
  price: string | number;
  sku: string;
  stock?: number;
  description?: string;
  shortDescription?: string;
  categoryId?: string;
  status?: ProductStatus | string;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  imageUrl?: string;
  metadata?: Record<string, unknown>;
}

export { toNumber } from './format';
export {
  ORDER_TRANSITION_MAP,
  ORDER_STATUSES,
  USER_ROLES,
  USER_STATUSES,
  type AdminAnalyticsResponse,
  type AdminSettings,
  type UpdateAdminSettingsDto,
  type CorporateInquiry,
  type CreateCorporateInquiryDto,
  type SupportTicket,
  type TicketMessage,
  type SupportTicketMessage,
  type TicketAttachment,
  type TicketEvent,
  type CreateTicketDto,
  type AddTicketMessageDto,
  type UpdateTicketDto,
  type ReturnRequest,
  type ReturnItem,
  type CreateReturnRequestDto,
  type ProcessReturnDto,
  type HelpCategory,
  type HelpArticle,
  type SavedReply,
  type SupportSettings,
} from '@laptopmitra/types';


