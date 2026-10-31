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

export interface ProductVariantImage {
  id: string;
  variantId: string;
  url: string;
  altText?: string | null;
  isPrimary: boolean;
  sortOrder?: number;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string;
  attributes: Record<string, string | number | boolean>;
  price: number;
  compareAtPrice?: number | null;
  leasePriceMonthly?: number | null;
  stock: number;
  allowBackorder?: boolean;
  isActive: boolean;
  isDefault: boolean;
  images?: ProductVariantImage[];
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
  leasePriceMonthly?: number | null;
  bulkSellPrice?: number | null;
  bulkLeasePrice?: number | null;
  tags?: string | null;
  categoryId?: string | null;
  category?: Category | null;
  images?: ProductImage[];
  variants?: ProductVariant[];
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
  variantId?: string | null;
  variant?: ProductVariant | null;
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
  referralReserved?: number;
  referralWithdrawn?: number;
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
  variantId?: string | null;
  variantSku?: string | null;
  variantName?: string | null;
  variantAttributes?: Record<string, string | number | boolean> | null;
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
  deliveries?: any[];
  items?: OrderItem[];
  createdAt: string;
  updatedAt?: string;
}

export interface OrderListResponse {
  orders: Order[];
  total: number;
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

export interface CorporateInquiry {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  laptopModel?: string | null;
  productId?: string | null;
  mode: 'sell' | 'lease';
  quantity: number;
  city: string;
  expectedTenure?: string | null;
  notes?: string | null;
  status: 'PENDING' | 'CONTACTED' | 'QUOTED' | 'CLOSED';
  source: 'web' | 'mobile';
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateCorporateInquiryDto {
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  laptopModel?: string;
  productId?: string;
  mode?: 'sell' | 'lease';
  quantity?: number;
  city: string;
  expectedTenure?: string;
  notes?: string;
  source?: 'web' | 'mobile';
}

export interface AffiliatePaymentDetails {
  id: string;
  userId: string;
  bankName?: string | null;
  accountHolderName?: string | null;
  accountNumberMasked?: string | null;
  ifscCode?: string | null;
  upiIdMasked?: string | null;
  qrCodeKey?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface WithdrawalRequest {
  id: string;
  userId: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  paymentMethodSnapshot: string;
  adminNotes?: string | null;
  processedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AuditLog {
  id: string;
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, any> | null;
  createdAt: Date | string;
}
